"""
SmartMine Forecasting Microservice (FastAPI)
===========================================
Real time-series forecasting with pandas, NumPy, statsmodels, Prophet,
scikit-learn, XGBoost and TensorFlow.

Run locally:  uvicorn app:app --host 0.0.0.0 --port 8000
Databricks:   uvicorn app:app --host 0.0.0.0 --port $DATABRICKS_APP_PORT
Docs:         http://localhost:8000/docs
"""
from __future__ import annotations

import logging
import os
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.forecast import router as forecast_router
from services.registry import availability

# --------------------------------------------------------------------- logging
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("forecast")

app = FastAPI(title="SmartMine Forecasting Service", version="1.0.0")

# ------------------------------------------------------------------------ CORS
# FRONTEND_URL is the primary knob (Databricks Apps env var); CORS_ORIGINS may
# hold a comma-separated list for extra preview/staging origins.
_raw_origins = ",".join(
    v for v in (os.environ.get("FRONTEND_URL"), os.environ.get("CORS_ORIGINS")) if v
)
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _raw_origins.split(",") if o.strip()] or ["*"]
logger.info("CORS allowed origins: %s", ALLOWED_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX") or None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Forecast routes are exposed twice: the historical `/forecast/...` prefix and
# an `/api/forecast/...` alias so a single Databricks App can serve both.
app.include_router(forecast_router)
app.include_router(forecast_router, prefix="/api")


# ----------------------------------------------------------------- diagnostics
def _health_payload() -> dict:
    return {
        "status": "ok",
        "message": "SmartMine backend is running",
        "service": "forecasting",
        "version": app.version,
        "models": availability(),
    }


@app.get("/health")
@app.get("/api/health")
@app.get("/forecast/health")
@app.get("/api/forecast/health")
def health():
    return _health_payload()


# ------------------------------------------------------------- error handling
def _error(status: int, code: str, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "status": "error",
            "error_code": code,
            "detail": message,
            "requestId": request_id,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    request_id = uuid.uuid4().hex[:12]
    code = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        413: "PAYLOAD_TOO_LARGE",
        422: "MODEL_TRAINING_FAILED",
        429: "RATE_LIMITED",
    }.get(exc.status_code, "HTTP_ERROR")
    logger.warning("[%s] %s %s -> %s %s", request_id, request.method, request.url.path, exc.status_code, exc.detail)
    return _error(exc.status_code, code, str(exc.detail), request_id)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    request_id = uuid.uuid4().hex[:12]
    logger.warning("[%s] validation error on %s: %s", request_id, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "error_code": "VALIDATION_ERROR",
            "detail": "Request payload is invalid.",
            "errors": exc.errors()[:20],
            "requestId": request_id,
        },
    )


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    request_id = uuid.uuid4().hex[:12]
    logger.exception("[%s] unhandled error on %s", request_id, request.url.path)
    return _error(500, "INTERNAL_ERROR", "Unexpected server error.", request_id)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("DATABRICKS_APP_PORT") or os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)
