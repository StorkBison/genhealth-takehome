from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.database import Base, engine
from app.routers import auth, orders


@asynccontextmanager
async def lifespan(_: FastAPI):
    # MVP: create tables on boot. A real deployment would run Alembic migrations instead.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Order Intake Service", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(orders.router)


@app.get("/health")
def health():
    return {"status": "ok"}
