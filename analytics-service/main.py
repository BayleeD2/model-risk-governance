from fastapi import FastAPI
from routers.drift import router as drift_router

app = FastAPI(title="Model Risk Analytics Service", version="0.2.0")

app.include_router(drift_router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
