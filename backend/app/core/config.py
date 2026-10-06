import os
import json
import logging
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("tracex.config")

def normalize_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_url:
        default_sqlite = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "tracex.db"))
        return f"sqlite:///{default_sqlite}"
    # Standardize postgresql dialect for SQLAlchemy 2.0 with psycopg2
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    if raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
        return raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return raw_url

def parse_cors_origins() -> List[str]:
    raw = os.getenv("BACKEND_CORS_ORIGINS")
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    if not raw:
        return default_origins
    try:
        raw_clean = raw.strip()
        if raw_clean.startswith("["):
            return json.loads(raw_clean)
        return [item.strip() for item in raw_clean.split(",") if item.strip()]
    except Exception:
        return default_origins

class Settings(BaseSettings):
    PROJECT_NAME: str = "TraceX Forensic Platform"
    TAGLINE: str = "From Digital Evidence to Investigation Story"
    VERSION: str = "5.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    SECRET_KEY: str = os.getenv("JWT_SECRET", "tracex-forensic-secret-key-3901928490123")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database - PostgreSQL by default, with automatic fallback for SQLite in local test environments
    DATABASE_URL: str = normalize_database_url()
    
    # Safe Evidence Storage (strictly inert, non-executable storage)
    UPLOAD_DIR: str = os.getenv(
        "UPLOAD_DIR", 
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    )
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", 50 * 1024 * 1024))  # 50MB default
    
    # CORS Authorized Origins
    BACKEND_CORS_ORIGINS: List[str] = parse_cors_origins()

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

# Check secret key in production
if settings.ENVIRONMENT.lower() == "production" and settings.SECRET_KEY == "tracex-forensic-secret-key-3901928490123":
    logging.warning("[SECURITY AUDIT] JWT_SECRET is currently set to the default placeholder. Set JWT_SECRET in environment for production deployments.")

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
