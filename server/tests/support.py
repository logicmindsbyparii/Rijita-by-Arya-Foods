"""Run a probe against app config/state in a fresh interpreter.

`app.config.settings` is built at import time from the process environment, so
environment-dependent behaviour is only observable in a new process. Every
helper here therefore shells out to `venv/bin/python` (falling back to the
current interpreter) with a controlled environment.
"""

import json
import os
import subprocess
import sys
import textwrap

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_VENV_PYTHON = os.path.join(SERVER_DIR, "venv", "bin", "python")
PYTHON = _VENV_PYTHON if os.path.exists(_VENV_PYTHON) else sys.executable

# Long enough to cover interpreter start plus the FastAPI import, short enough
# that a hang fails the suite instead of parking CI forever.
PROBE_TIMEOUT_S = 60

STRONG_SECRET = "f" * 64

# A developer's real server/.env would otherwise leak into every assertion, so
# the probe rebuilds Settings with no env_file and reads only the environment
# this helper passes in.
_PREAMBLE = """
import json, os
import app.config as cfg

class _Settings(cfg.Settings):
    model_config = {**cfg.Settings.model_config, "env_file": None}

cfg.settings = _Settings()
settings = cfg.settings
cfg._assert_production_secrets(settings)
"""


def run_probe(body: str, env=None):
    """Execute `body` with `settings` bound, in a fresh interpreter.

    `body` should print a single JSON object as its last line. Returns
    (completed_process, parsed_json_or_None).
    """
    child_env = {
        # PATH keeps the interpreter able to find its own shared libraries.
        "PATH": os.environ.get("PATH", ""),
        "PYTHONPATH": SERVER_DIR,
        # Stops a stray local .env from being discovered via the CWD, and keeps
        # pydantic-settings from picking up the developer's shell.
        "PYTHONDONTWRITEBYTECODE": "1",
    }
    child_env.update(env or {})

    proc = subprocess.run(
        [PYTHON, "-c", textwrap.dedent(_PREAMBLE) + textwrap.dedent(body)],
        cwd=SERVER_DIR,
        env=child_env,
        capture_output=True,
        text=True,
        timeout=PROBE_TIMEOUT_S,
    )
    parsed = None
    if proc.returncode == 0 and proc.stdout.strip():
        try:
            parsed = json.loads(proc.stdout.strip().splitlines()[-1])
        except (ValueError, IndexError):
            parsed = None
    return proc, parsed


def strong_secrets(**extra):
    """Env with valid JWT secrets, so the boot guard is not what fails."""
    env = {"JWT_SECRET": STRONG_SECRET, "JWT_REFRESH_SECRET": STRONG_SECRET}
    env.update(extra)
    return env
