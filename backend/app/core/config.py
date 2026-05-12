from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import json
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # ── Environment ─────────────────────────────────────────────────────
    ENV: str = "development"  # "development" | "production" | "testing"
    API_TITLE: str = "OpenBench API"
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Secrets / Tokens ────────────────────────────────────────────────
    HF_TOKEN: str = ""
    WOLFRAM_APP_ID: str = ""
    WOLFRAM_CLOUD_KEY: str = ""

    # ── Database ────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./openbench.db",
        validation_alias="OPENBENCH_DATABASE_URL",
    )

    # ── CORS ────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:3001"]'

    # ── Cache ───────────────────────────────────────────────────────────
    CACHE_TTL_SECONDS: int = 3600

    # ── Rate Limiting ───────────────────────────────────────────────────
    RATE_LIMIT_DEFAULT: str = "30/minute"
    RATE_LIMIT_ANALYZE: str = "15/minute"

    # ── Request Size ────────────────────────────────────────────────────
    MAX_REQUEST_BODY_MB: int = 3  # protects /analyze/local

    # ── External ────────────────────────────────────────────────────────
    HF_LEADERBOARD_DATASET: str = "open-llm-leaderboard/results"

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = json.loads(self.CORS_ORIGINS)
        if self.is_production and "*" in origins:
            logger.warning("CORS wildcard '*' detected in production — restricting to FRONTEND_URL")
            return [self.FRONTEND_URL]
        return origins

    @property
    def hf_headers(self) -> dict:
        h = {"Accept": "application/json"}
        if self.HF_TOKEN:
            h["Authorization"] = f"Bearer {self.HF_TOKEN}"
        return h

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Fail-fast warnings on startup
if not settings.HF_TOKEN:
    logger.warning("HF_TOKEN not set — HuggingFace API calls will be rate-limited")
if settings.is_production and settings.CORS_ORIGINS == '["http://localhost:3000","http://localhost:3001"]':
    logger.warning("Production detected with default CORS_ORIGINS — set CORS_ORIGINS to your real domain")
