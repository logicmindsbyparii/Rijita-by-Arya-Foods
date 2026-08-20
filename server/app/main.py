from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
import os
import time

from app.config import settings
from app.db import connect_db, close_db
from app.utils.cron import init_cron_jobs, shutdown_cron_jobs
from app.utils.logger import logger

from app.routers import (
    auth, categories, products, orders, analytics, shipping,
    blogs, collections, contacts, coupons, recipes, reviews, settings as settings_router, subscribers, users
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting RIJITA Python/FastAPI server...")
    await connect_db()
    init_cron_jobs()
    
    # Ensure uploads directory exists
    uploads_dir = Path(__file__).parent.parent / settings.UPLOAD_DIR
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Shutdown
    logger.info("Shutting down RIJITA Python/FastAPI server...")
    shutdown_cron_jobs()
    await close_db()

app = FastAPI(
    title="RIJITA by Arya Foods API",
    version="2.0.0",
    description="Python/FastAPI High-Performance Backend",
    lifespan=lifespan
)

# CORS Middleware
origins = [
    settings.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:5173"
]

if settings.CORS_ORIGINS:
    extra_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    origins.extend(extra_origins)

# Only localhost dev servers and ngrok tunnel hosts — never a blanket "any
# https origin" regex. With allow_credentials=True a wildcard would let any
# website make credentialed requests to this API and read the responses
# (stored XSS/CSRF surface); every legitimate caller is either same-origin
# (through the Next.js /api rewrite) or on the explicit list.
#
# The regex is dev-only: `[a-z0-9-]+.ngrok...` matches *anybody's* tunnel, not
# just ours, so in production it would hand a credentialed cross-origin channel
# to any attacker who can run `ngrok`. Production gets the explicit CLIENT_URL /
# CORS_ORIGINS list and nothing else.
dev_origin_regex = (
    None
    if settings.NODE_ENV == "production"
    else r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-z0-9-]+\.ngrok(-free)?\.(io|app|dev)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_origin_regex=dev_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing & Security Headers Middleware
@app.middleware("http")
async def add_security_and_timing_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

from starlette.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

class FallbackStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
            if response.status_code == 404 and self.directory is not None:
                placeholder = Path(self.directory) / "placeholder.png"
                if placeholder.exists():
                    return FileResponse(str(placeholder), media_type="image/png")
            return response
        except StarletteHTTPException as ex:
            if ex.status_code == 404 and self.directory is not None:
                placeholder = Path(self.directory) / "placeholder.png"
                if placeholder.exists():
                    return FileResponse(str(placeholder), media_type="image/png")
            raise ex

# Static files for uploaded images (/uploads) with graceful fallback
uploads_path = Path(__file__).parent.parent / settings.UPLOAD_DIR
app.mount("/uploads", FallbackStaticFiles(directory=str(uploads_path)), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(shipping.router)
app.include_router(analytics.router)
app.include_router(blogs.router)
app.include_router(collections.router)
app.include_router(contacts.router)
app.include_router(coupons.router)
app.include_router(recipes.router)
app.include_router(reviews.router)
app.include_router(settings_router.router)
app.include_router(subscribers.router)
app.include_router(users.router)

# Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": str(exc) if settings.NODE_ENV == "development" else "Internal server error"}
    )

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "rijita-fastapi-backend",
        "timestamp": time.time(),
        "environment": settings.NODE_ENV
    }

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "RIJITA by Arya Foods Python FastAPI Server Running",
        "docs": "/docs"
    }
