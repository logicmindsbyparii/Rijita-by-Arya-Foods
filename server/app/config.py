from pydantic_settings import BaseSettings
from pydantic import Field
import os
from pathlib import Path

class Settings(BaseSettings):
    NODE_ENV: str = "development"
    PORT: int = 5001
    MONGODB_URI: str = "mongodb://localhost:27017/rijita"
    JWT_SECRET: str = "rijita-local-dev-secret-do-not-use-in-prod"
    JWT_REFRESH_SECRET: str = "rijita-local-dev-refresh-do-not-use-in-prod"
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

    class Config:
        env_file = os.path.join(Path(__file__).parent.parent, ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
