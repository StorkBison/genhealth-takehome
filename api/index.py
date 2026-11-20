# Vercel entrypoint: every request is routed here (see vercel.json) and served by the FastAPI app.
from app.main import app  # noqa: F401
