import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, orders

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

DEFAULT_SECRET = "change-me-in-production"


def add_missing_columns() -> None:
    """Tiny forward-only migration for nullable columns added after a database was created.

    create_all() makes new tables but never alters existing ones. A real deployment would use Alembic.
    """
    inspector = inspect(engine)
    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name not in existing and column.nullable:
                ddl = column.type.compile(dialect=engine.dialect)
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {column.name} {ddl}'))
                logging.getLogger(__name__).info("Added column %s.%s", table.name, column.name)


_initialized = False


def init_app() -> None:
    """Check config and prepare the database. Safe to call more than once."""
    global _initialized
    if _initialized:
        return
    s = get_settings()
    if s.environment == "production" and (s.jwt_secret == DEFAULT_SECRET or len(s.jwt_secret) < 32):
        raise RuntimeError("JWT_SECRET must be set to a strong value in production")
    # MVP: create tables on boot. A real deployment would run Alembic migrations instead.
    Base.metadata.create_all(bind=engine)
    add_missing_columns()
    if not s.extraction_inline:
        # Background extractions die with the process; surface them instead of leaving orders stuck.
        # (Not done for inline extraction: another serverless instance may be mid-request.)
        with SessionLocal() as db:
            orders.mark_interrupted_extractions(db)
    _initialized = True


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_app()
    yield


app = FastAPI(
    title="Order Intake Service",
    description=(
        "Create DME orders manually or from an uploaded PDF. "
        "Register at `/auth/register`, then click **Authorize** and log in with your email and password."
    ),
    lifespan=lifespan,
)
app.include_router(auth.router)
app.include_router(orders.router)

# Browser UI (plain JS), served from the same origin so it can call the API without CORS.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
class FrontendFiles(StaticFiles):
    """Static files that browsers must revalidate, so a deploy never shows a stale mix of old and new assets."""

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache"
        return response


if FRONTEND_DIR.is_dir():
    app.mount("/app", FrontendFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if os.environ.get("VERCEL"):
    # Serverless runtimes don't guarantee ASGI lifespan events, so initialize at import time.
    init_app()


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/app/" if FRONTEND_DIR.is_dir() else "/docs")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
