from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./orders.db"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    anthropic_api_key: str | None = None
    extraction_model: str = "claude-opus-5-5"
    extraction_effort: str = "medium"

    max_upload_mb: int = 20
    max_pdf_pages: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()
