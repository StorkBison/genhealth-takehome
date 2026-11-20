from fastapi import FastAPI

app = FastAPI(title="Order Intake Service")


@app.get("/health")
def health():
    return {"status": "ok"}
