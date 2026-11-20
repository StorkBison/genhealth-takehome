import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.config import get_settings
from app.database import Base, engine
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


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
