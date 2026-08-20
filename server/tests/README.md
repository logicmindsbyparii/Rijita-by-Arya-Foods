# server/tests

Run from the `server/` directory:

```bash
venv/bin/python -m unittest discover -s tests -v
```

or `npm run test` (see `server/package.json`).

## Why stdlib `unittest` and not pytest

`requirements.txt` is what Render installs to run the API, so adding pytest and
httpx there would ship test tooling to production. These tests use only the
standard library plus what the app already depends on, so they run in the same
virtualenv the server uses with nothing extra to install.

If a future test genuinely needs an HTTP client (`fastapi.testclient` requires
httpx), add a separate `requirements-dev.txt` rather than growing the
production set.

## Why subprocesses

`app.config` reads the environment at *import* time and `settings` is a module
level singleton, so environment-dependent behaviour cannot be re-tested by
mutating `os.environ` inside one process. Each case therefore runs a small
probe in a fresh interpreter. That is slower, but it is the only way to
exercise the real import-time code path — including
`_assert_production_secrets`, whose entire job is to abort the import.

Each probe runs with `env_file=None`, so a developer's local `server/.env`
cannot influence the result. Without that, these tests would pass or fail
depending on whose machine they ran on.
