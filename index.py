# Vercel entrypoint: Vercel's FastAPI support looks for an `app` object in a root-level index.py.
from app.main import app  # noqa: F401
