"""The uvicorn entrypoint must not run the dev reloader in production.

server/main.py was the fifth place gated on NODE_ENV, and the only one outside
app/. With the flag unset on Render it started the WatchFiles auto-reloader in
production — confirmed in the deploy log as "Started reloader process [61]
using WatchFiles".
"""

import unittest

from support import run_probe, strong_secrets

# main.py only calls uvicorn.run() under __main__, so exercise it by stubbing
# uvicorn and running the module as a script.
PROBE = """
import json, runpy, sys, types

captured = {}
stub = types.ModuleType("uvicorn")
stub.run = lambda app, **kw: captured.update(kw)
sys.modules["uvicorn"] = stub

runpy.run_module("main", run_name="__main__")
print(json.dumps({
    "reload": captured.get("reload"),
    "workers": captured.get("workers"),
    "port": captured.get("port"),
}))
"""


class EntrypointTest(unittest.TestCase):
    def _run(self, env):
        proc, out = run_probe(PROBE, env)
        self.assertIsNotNone(out, f"probe failed: {proc.stderr[-400:]}")
        return out

    def test_no_reloader_on_render(self):
        """The regression: RENDER set, NODE_ENV absent."""
        self.assertFalse(self._run(strong_secrets(RENDER="true"))["reload"])

    def test_reloader_still_on_locally(self):
        self.assertTrue(self._run(strong_secrets())["reload"])

    def test_web_concurrency_is_honoured(self):
        """Render sets this from the instance's CPU allowance; a hardcoded 4
        workers would risk exhausting memory on a small instance."""
        out = self._run(strong_secrets(RENDER="true", WEB_CONCURRENCY="2"))
        self.assertEqual(out["workers"], 2)

    def test_single_worker_when_reloading(self):
        """uvicorn rejects workers > 1 alongside reload."""
        out = self._run(strong_secrets(WEB_CONCURRENCY="4"))
        self.assertTrue(out["reload"])
        self.assertEqual(out["workers"], 1)

    def test_port_env_var_wins(self):
        """Render injects PORT and scans for it; ignoring it means the service
        never binds and the deploy is marked failed."""
        self.assertEqual(self._run(strong_secrets(RENDER="true", PORT="10000"))["port"], 10000)


if __name__ == "__main__":
    unittest.main()
