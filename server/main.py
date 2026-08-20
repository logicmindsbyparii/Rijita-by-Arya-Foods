import uvicorn
import os
from app.config import settings

if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.PORT))

    # is_production, not NODE_ENV: that flag defaults to "development" and was
    # unset on Render, so production ran the WatchFiles auto-reloader — visible
    # in the deploy log as "Started reloader process ... using WatchFiles". The
    # reloader watches the source tree on an interval for no benefit on an
    # immutable deploy, and it makes the parent process the thing bound to the
    # port while a child serves.
    reload = not settings.is_production

    # WEB_CONCURRENCY is what the platform tells us it can afford — Render sets
    # it from the instance's CPU allowance ("Setting WEB_CONCURRENCY=1 by
    # default"). Honour it before falling back, because a hardcoded 4 workers
    # each load FastAPI, motor and the scheduler, which is a memory-exhaustion
    # risk on a small instance rather than a throughput win.
    default_workers = 4 if settings.is_production else 1
    workers = int(os.environ.get("WEB_CONCURRENCY", default_workers))

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        # uvicorn rejects workers > 1 together with reload, and ignores it anyway.
        workers=1 if reload else workers,
    )
