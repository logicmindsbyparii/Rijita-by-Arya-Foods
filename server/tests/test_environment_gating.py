"""Protections that must not depend on remembering to set NODE_ENV.

NODE_ENV defaults to "development", and the Render deployment ran with it
unset. Four separate protections keyed off it were therefore all disabled in
production simultaneously: the refresh cookie's Secure flag, the CORS
dev-origin regex, the raw-exception response body, and the weak-secret boot
guard. Each was individually correct; the shared assumption was the defect.

These tests pin the replacement contract — `Settings.is_production` treats
Render's own RENDER variable as production, so deployment is opted out of
rather than into — and equally pin that local development is unaffected, since
a guard that breaks a fresh clone would just get reverted.
"""

import unittest

from support import run_probe, strong_secrets


class ProductionDetectionTest(unittest.TestCase):
    def _is_production(self, env):
        _, out = run_probe('print(json.dumps({"prod": settings.is_production}))', env)
        self.assertIsNotNone(out, "probe did not return JSON")
        return out["prod"]

    def test_render_env_var_alone_means_production(self):
        """The regression: RENDER is set, NODE_ENV is not."""
        self.assertTrue(self._is_production(strong_secrets(RENDER="true")))

    def test_render_service_id_alone_means_production(self):
        self.assertTrue(self._is_production(strong_secrets(RENDER_SERVICE_ID="srv-abc123")))

    def test_explicit_node_env_still_wins(self):
        self.assertTrue(self._is_production(strong_secrets(NODE_ENV="production")))

    def test_node_env_is_case_and_space_insensitive(self):
        self.assertTrue(self._is_production(strong_secrets(NODE_ENV="  Production  ")))

    def test_bare_local_environment_is_not_production(self):
        """A laptop must not be mistaken for a deployment."""
        self.assertFalse(self._is_production(strong_secrets()))

    def test_development_is_not_production(self):
        self.assertFalse(self._is_production(strong_secrets(NODE_ENV="development")))


class RefreshCookieTest(unittest.TestCase):
    """The refresh token is httpOnly, 30-day, and was shipping without Secure."""

    PROBE = """
        from starlette.responses import Response
        from app.routers.auth import set_refresh_cookie, clear_refresh_cookie
        set_response = Response()
        set_refresh_cookie(set_response, "tok")
        set_header = set_response.headers.get("set-cookie", "")
        clear_response = Response()
        clear_refresh_cookie(clear_response)
        print(json.dumps({
            "set": set_header,
            "clear": clear_response.headers.get("set-cookie", ""),
        }))
    """

    def _cookies(self, env):
        proc, out = run_probe(self.PROBE, env)
        self.assertIsNotNone(out, f"probe failed: {proc.stderr[-400:]}")
        return out

    def test_secure_flag_set_on_render_without_node_env(self):
        self.assertIn("Secure", self._cookies(strong_secrets(RENDER="true"))["set"])

    def test_no_secure_flag_locally(self):
        """Local dev is plain HTTP; a Secure cookie would never be stored."""
        self.assertNotIn("Secure", self._cookies(strong_secrets())["set"])

    def test_cookie_keeps_httponly_and_lax(self):
        header = self._cookies(strong_secrets(RENDER="true"))["set"]
        self.assertIn("HttpOnly", header)
        self.assertIn("lax", header.lower())

    def test_clear_cookie_attributes_match_set_cookie(self):
        """A delete whose attributes differ leaves the original cookie in place,
        so logout silently fails. These two must move together."""
        both = self._cookies(strong_secrets(RENDER="true"))
        for attribute in ("Secure", "HttpOnly", "Path=/api/auth"):
            self.assertIn(attribute, both["set"], f"{attribute} missing from set")
            self.assertIn(attribute, both["clear"], f"{attribute} missing from clear")


class CorsOriginRegexTest(unittest.TestCase):
    """The dev regex matches *any* ngrok subdomain with allow_credentials=True."""

    PROBE = 'import app.main as m; print(json.dumps({"regex": m.dev_origin_regex}))'

    def _regex(self, env):
        proc, out = run_probe(self.PROBE, env)
        self.assertIsNotNone(out, f"probe failed: {proc.stderr[-400:]}")
        return out["regex"]

    def test_dev_regex_disabled_on_render(self):
        self.assertIsNone(self._regex(strong_secrets(RENDER="true")))

    def test_dev_regex_available_locally(self):
        regex = self._regex(strong_secrets())
        self.assertIsNotNone(regex)
        self.assertIn("ngrok", regex)


class ErrorDetailLeakTest(unittest.TestCase):
    """A failed Atlas connection answered public callers with shard hostnames."""

    PROBE = """
        import asyncio
        import app.main as m
        response = asyncio.get_event_loop().run_until_complete(
            m.global_exception_handler(None, Exception("shard-00-02.hzqweqb.mongodb.net"))
        )
        print(json.dumps({"body": response.body.decode()}))
    """

    def _body(self, env):
        proc, out = run_probe(self.PROBE, env)
        self.assertIsNotNone(out, f"probe failed: {proc.stderr[-400:]}")
        return out["body"]

    def test_internal_detail_hidden_on_render(self):
        body = self._body(strong_secrets(RENDER="true"))
        self.assertNotIn("mongodb.net", body)
        self.assertIn("Internal server error", body)

    def test_detail_shown_locally(self):
        self.assertIn("mongodb.net", self._body(strong_secrets()))


class WeakSecretBootGuardTest(unittest.TestCase):
    """The committed dev JWT secrets are in version control, so anyone can read
    them and mint an admin token. Production must refuse to boot on them."""

    PROBE = 'print(json.dumps({"booted": True}))'

    def test_refuses_to_boot_on_render_with_committed_secrets(self):
        proc, _ = run_probe(self.PROBE, {"RENDER": "true"})
        self.assertNotEqual(proc.returncode, 0, "booted with committed dev secrets")
        self.assertIn("Refusing to start", proc.stderr)

    def test_refuses_when_only_one_secret_is_strong(self):
        proc, _ = run_probe(self.PROBE, {"RENDER": "true", "JWT_SECRET": "f" * 64})
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("JWT_REFRESH_SECRET", proc.stderr)

    def test_refuses_on_empty_secret(self):
        proc, _ = run_probe(
            self.PROBE, {"RENDER": "true", "JWT_SECRET": "", "JWT_REFRESH_SECRET": "f" * 64}
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("JWT_SECRET", proc.stderr)

    def test_boots_on_render_with_strong_secrets(self):
        proc, out = run_probe(self.PROBE, strong_secrets(RENDER="true"))
        self.assertEqual(proc.returncode, 0, proc.stderr[-400:])
        self.assertTrue(out["booted"])

    def test_fresh_clone_still_boots_locally(self):
        """No .env, committed dev secrets, no env vars — onboarding must work."""
        proc, out = run_probe(self.PROBE, {})
        self.assertEqual(proc.returncode, 0, proc.stderr[-400:])
        self.assertTrue(out["booted"])


class LogLevelTest(unittest.TestCase):
    """LOG_LEVEL defaults to "debug"; that default must not reach production,
    but an explicit value must always win."""

    PROBE = """
        import logging
        from app.utils.logger import logger
        print(json.dumps({
            "effective": settings.effective_log_level,
            "level_name": logging.getLevelName(logger.level),
        }))
    """

    def _levels(self, env):
        proc, out = run_probe(self.PROBE, env)
        self.assertIsNotNone(out, f"probe failed: {proc.stderr[-400:]}")
        return out

    def test_production_default_is_info_not_debug(self):
        self.assertEqual(self._levels(strong_secrets(RENDER="true"))["level_name"], "INFO")

    def test_explicit_debug_is_honoured_in_production(self):
        levels = self._levels(strong_secrets(RENDER="true", LOG_LEVEL="debug"))
        self.assertEqual(levels["level_name"], "DEBUG")

    def test_local_default_stays_debug(self):
        self.assertEqual(self._levels(strong_secrets())["level_name"], "DEBUG")

    def test_quieter_levels_are_not_collapsed_into_info(self):
        """The old mapping turned everything that was not "debug" into INFO, so
        asking for warnings only gave you the full INFO stream."""
        self.assertEqual(
            self._levels(strong_secrets(LOG_LEVEL="warning"))["level_name"], "WARNING"
        )
        self.assertEqual(
            self._levels(strong_secrets(LOG_LEVEL="error"))["level_name"], "ERROR"
        )

    def test_unrecognised_level_falls_back_to_info(self):
        self.assertEqual(
            self._levels(strong_secrets(LOG_LEVEL="raiseExceptions"))["level_name"], "INFO"
        )


if __name__ == "__main__":
    unittest.main()
