from pydantic_settings import BaseSettings
from pydantic import Field
import os
from pathlib import Path

# The dev fallbacks below are committed to this repo, so anyone can read them and
# mint a valid admin token. They exist only so a fresh clone runs without a
# .env; `_assert_production_secrets` below refuses to boot with them in
# production, where a missing .env would otherwise fail open and silently.
DEV_JWT_SECRET = "rijita-local-dev-secret-do-not-use-in-prod"
DEV_JWT_REFRESH_SECRET = "rijita-local-dev-refresh-do-not-use-in-prod"


class Settings(BaseSettings):
    NODE_ENV: str = "development"
    PORT: int = 5001
    MONGODB_URI: str = "mongodb://localhost:27017/rijita"
    JWT_SECRET: str = DEV_JWT_SECRET
    JWT_REFRESH_SECRET: str = DEV_JWT_REFRESH_SECRET
    JWT_EXPIRES_IN: str = "7d"
    JWT_REFRESH_EXPIRES_IN: str = "30d"
    CLIENT_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = ""
    WHATSAPP_NUMBER: str = "919904459998"
    ADMIN_PHONE: str = "919904459998"
    OPENWA_API_URL: str = "http://localhost:2785"
    WHATSAPP_SESSION_ID: str = "rijita-bot"
    OPENWA_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    ADMIN_EMAIL: str = "admin@rijita.com"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 5242880
    LOG_LEVEL: str = "debug"
    LOG_DIR: str = "logs"

    # ─── Shiprocket ─────────────────────────────────────────────────────
    SHIPROCKET_BASE_URL: str = "https://apiv2.shiprocket.in/v1/external"
    SHIPROCKET_EMAIL: str = ""
    SHIPROCKET_PASSWORD: str = ""
    SHIPROCKET_CHANNEL_ID: str = ""
    SHIPROCKET_PICKUP_LOCATION: str = "Primary"
    SHIPROCKET_PICKUP_PINCODE: str = ""
    SHIPROCKET_WEBHOOK_TOKEN: str = ""
    # Push each paid order to Shiprocket automatically instead of waiting for admin
    SHIPROCKET_AUTO_CREATE: bool = False
    SHIPROCKET_PACKAGE_LENGTH: float = 20.0
    SHIPROCKET_PACKAGE_BREADTH: float = 15.0
    SHIPROCKET_PACKAGE_HEIGHT: float = 10.0
    SHIPROCKET_PACKAGING_WEIGHT: float = 0.1
    SHIPROCKET_TRACKING_SYNC_MINUTES: int = 30

    class Config:
        env_file = os.path.join(Path(__file__).parent.parent, ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()


def _assert_production_secrets(cfg: "Settings") -> None:
    """Fail fast if production is running on the committed dev secrets.

    A forgotten or unreadable .env leaves every value at its default, and the
    two JWT defaults are in version control — so the API would keep serving
    happily while accepting tokens anyone could sign. Better to refuse to start.
    """
    if cfg.NODE_ENV != "production":
        return
    weak = [
        name
        for name, value, dev_default in (
            ("JWT_SECRET", cfg.JWT_SECRET, DEV_JWT_SECRET),
            ("JWT_REFRESH_SECRET", cfg.JWT_REFRESH_SECRET, DEV_JWT_REFRESH_SECRET),
        )
        if not value or value == dev_default
    ]
    if weak:
        raise RuntimeError(
            "Refusing to start in production with insecure "
            + " and ".join(weak)
            + ". Set a strong random value in the server .env "
            "(e.g. `python -c \"import secrets; print(secrets.token_hex(32))\"`)."
        )


_assert_production_secrets(settings)
