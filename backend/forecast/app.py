"""
SmartMine Forecasting Microservice (FastAPI)
===========================================
Real time-series forecasting with pandas, NumPy, statsmodels, Prophet,
scikit-learn, XGBoost and TensorFlow.

Run locally:  uvicorn app:app --host 0.0.0.0 --port 8000
Docs:         http://localhost:8000/docs
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.forecast import router as forecast_router
from services.registry import availability

app = FastAPI(title="SmartMine Forecasting Service", version="1.0.0")

origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)


@app.get("/health")
@app.get("/forecast/health")
def health():
    return {"status": "ok", "service": "forecasting", "models": availability()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
