import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, orders

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

DEFAULT_SECRET = "change-me-in-production"


@asynccontextmanager
async def lifespan(_: FastAPI):
    s = get_settings()
    if s.environment == "production" and (s.jwt_secret == DEFAULT_SECRET or len(s.jwt_secret) < 32):
        raise RuntimeError("JWT_SECRET must be set to a strong value in production")
    # MVP: create tables on boot. A real deployment would run Alembic migrations instead.
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        orders.mark_interrupted_extractions(db)
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
if FRONTEND_DIR.is_dir():
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/app/" if FRONTEND_DIR.is_dir() else "/docs")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
