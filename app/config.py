from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "sqlite:///./orders.db"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    # Which LLM reads the PDFs: "gemini" (default) or "anthropic"
    extraction_provider: str = "gemini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.5-flash"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"
    anthropic_effort: str = "medium"

    max_upload_mb: int = 20
    max_pdf_pages: int = 100

    # Serverless hosts (Vercel) may freeze the process once the response is sent, so background work
    # isn't reliable there. When true, extraction runs inside the upload request instead.
    extraction_inline: bool = False


def _vercel_defaults() -> dict:
    """Sensible defaults when running on Vercel (it sets VERCEL=1). Explicit env vars still win."""
    import os

    if not os.environ.get("VERCEL"):
        return {}
    defaults = {"extraction_inline": True}
    if not os.environ.get("DATABASE_URL"):
        # Only /tmp is writable on Vercel; this is per-instance and temporary. Set DATABASE_URL to Postgres.
        defaults["database_url"] = "sqlite:////tmp/orders.db"
    return defaults


@lru_cache
def get_settings() -> Settings:
    import os

    defaults = {k: v for k, v in _vercel_defaults().items() if k.upper() not in os.environ}
    return Settings(**defaults)
