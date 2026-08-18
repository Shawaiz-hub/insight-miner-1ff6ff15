"""Forecasting REST API — upload, train, and stored runs."""
from __future__ import annotations

import time
import warnings
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

import store
from services import preprocessing as prep
from services.metrics import evaluate, sanitize
from services.registry import MODEL_REGISTRY, availability, label_for, resolve

router = APIRouter(prefix="/forecast", tags=["forecast"])


# ------------------------------------------------------------------- schemas
class CleaningOptions(BaseModel):
    removeMissing: bool = False
    fillMissing: bool = True
    removeDuplicates: bool = True
    normalize: bool = False
    detectOutliers: bool = True
    smooth: bool = False


class TrainRequest(BaseModel):
    dateColumn: str = Field(min_length=1)
    targetColumn: str = Field(min_length=1)
    categoryColumn: str | None = None
    category: str | None = None
    regionColumn: str | None = None
    region: str | None = None
    models: list[str] = Field(default_factory=lambda: ["linear"], min_length=1)
    horizon: int = Field(default=12, ge=1, le=2000)
    frequency: str = "monthly"
    confidence: float = Field(default=95, ge=50, le=99.9)
    cleaning: CleaningOptions = CleaningOptions()
    rows: list[dict[str, Any]] | None = None
    uploadId: str | None = None
    datasetName: str | None = None
    user: str | None = None


# --------------------------------------------------------------------- upload
@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    try:
        df = prep.read_dataframe(file.filename or "data.csv", content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}") from exc
    if df.empty:
        raise HTTPException(status_code=400, detail="No rows found in the uploaded file.")

    upload_id = store.save_upload(file.filename or "data.csv", content)
    return {
        "uploadId": upload_id,
        "name": file.filename,
        "size": len(content),
        "rowCount": int(len(df)),
        "columns": prep.describe_columns(df),
        "preview": prep.preview_rows(df, 10),
    }


# ---------------------------------------------------------------------- train
def _load_frame(req: TrainRequest) -> pd.DataFrame:
    if req.rows:
        return pd.DataFrame(req.rows)
    if req.uploadId:
        path = store.find_upload(req.uploadId)
        if not path:
            raise HTTPException(status_code=404, detail="Upload not found — please re-upload the dataset.")
        with open(path, "rb") as fh:
            return prep.read_dataframe(path, fh.read())
    raise HTTPException(status_code=400, detail="Provide either 'rows' or 'uploadId'.")


def _holdout_size(n: int) -> int:
    return int(max(2, min(12, round(n * 0.2))))


def _run_model(model_id: str, y: np.ndarray, dates: list[str], season: int, req: TrainRequest,
               holdout: int, steps: int) -> dict[str, Any]:
    """Train one model independently: hold-out score, then refit on full history."""
    run = resolve(model_id)
    train_y, test_y = y[:-holdout], y[-holdout:]
    train_dates = dates[:-holdout]

    t0 = time.perf_counter()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        holdout_out = run(train_y, holdout, season, req.confidence, train_dates, req.frequency)
        train_ms = (time.perf_counter() - t0) * 1000.0

        t1 = time.perf_counter()
        full_out = run(y, steps, season, req.confidence, dates, req.frequency)
        predict_ms = (time.perf_counter() - t1) * 1000.0

    scores = evaluate(test_y, holdout_out["pred"])
    return {
        "model": model_id,
        "label": full_out.get("label") or label_for(model_id),
        "registryLabel": label_for(model_id),
        "scores": scores,
        "trainingTimeMs": round(train_ms, 1),
        "predictionTimeMs": round(predict_ms, 1),
        "holdoutPred": list(holdout_out["pred"]),
        "fitted": list(full_out["fitted"]),
        "pred": list(full_out["pred"]),
        "lower": list(full_out["lower"]),
        "upper": list(full_out["upper"]),
    }


def _histogram(residuals: np.ndarray, buckets: int = 12) -> list[dict[str, Any]]:
    residuals = residuals[np.isfinite(residuals)]
    if residuals.size == 0:
        return []
    counts, edges = np.histogram(residuals, bins=min(buckets, max(3, residuals.size // 2)))
    return [
        {"bucket": f"{edges[i]:.1f}…{edges[i + 1]:.1f}", "count": int(counts[i])}
        for i in range(len(counts))
    ]


def _decompose(dates: list[str], y: np.ndarray, season: int) -> tuple[list[dict], list[dict]]:
    trend_vals: np.ndarray
    seasonal_vals: np.ndarray
    resid_vals: np.ndarray
    if season > 1 and len(y) >= 2 * season:
        from statsmodels.tsa.seasonal import seasonal_decompose

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            dec = seasonal_decompose(pd.Series(y), model="additive", period=season, extrapolate_trend="freq")
        trend_vals = np.asarray(dec.trend, dtype=float)
        seasonal_vals = np.asarray(dec.seasonal, dtype=float)
        resid_vals = np.asarray(dec.resid, dtype=float)
    else:
        window = max(2, min(5, len(y) // 2 or 2))
        trend_vals = pd.Series(y).rolling(window, min_periods=1, center=True).mean().to_numpy(dtype=float)
        seasonal_vals = y - trend_vals
        resid_vals = np.zeros_like(y)

    decomposition = [
        {
            "date": dates[i],
            "observed": sanitize(y[i]),
            "trend": sanitize(trend_vals[i]),
            "seasonal": sanitize(seasonal_vals[i]),
            "residual": sanitize(resid_vals[i]),
        }
        for i in range(len(y))
    ]
    trend = [{"date": dates[i], "trend": sanitize(trend_vals[i])} for i in range(len(y))]
    return decomposition, trend


@router.post("/train")
def train(req: TrainRequest):
    df = _load_frame(req)
    try:
        points, stats = prep.build_series(
            df,
            req.dateColumn,
            req.targetColumn,
            req.frequency,
            req.cleaning.model_dump(),
            req.categoryColumn,
            req.category,
            req.regionColumn,
            req.region,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if len(points) < 6:
        raise HTTPException(
            status_code=400,
            detail=f"Only {len(points)} periods after aggregation — need at least 6 to train and validate.",
        )

    dates = [p["date"] for p in points]
    y = np.asarray([p["value"] for p in points], dtype=float)
    season = prep.season_length(req.frequency)
    steps = prep.horizon_periods(req.horizon, req.frequency)
    holdout = _holdout_size(len(y))

    requested = [m for m in req.models if m in MODEL_REGISTRY]
    unknown = [m for m in req.models if m not in MODEL_REGISTRY]
    if not requested:
        raise HTTPException(status_code=400, detail="No supported models selected.")

    results, failures = [], []
    for model_id in requested:
        try:
            results.append(_run_model(model_id, y, dates, season, req, holdout, steps))
        except Exception as exc:  # per-model isolation
            failures.append({"model": model_id, "label": label_for(model_id), "error": str(exc)[:300]})

    if not results:
        raise HTTPException(
            status_code=422,
            detail="All selected models failed: " + "; ".join(f"{f['label']}: {f['error']}" for f in failures),
        )

    def rmse_key(r):
        value = r["scores"]["rmse"]
        return value if value is not None and np.isfinite(value) else float("inf")

    results.sort(key=rmse_key)
    best = results[0]

    fitted = np.asarray(best["fitted"], dtype=float)
    residuals_arr = y - fitted[: len(y)]
    future_dates = prep.next_periods(dates[-1], req.frequency, steps)

    history = [{"date": dates[i], "value": sanitize(y[i])} for i in range(len(y))]
    history_rows = [
        {
            "date": dates[i],
            "actual": sanitize(y[i]),
            "forecast": sanitize(fitted[i]),
            "lower": None,
            "upper": None,
        }
        for i in range(len(y))
    ]
    forecast_rows = [
        {
            "date": future_dates[i],
            "actual": None,
            "forecast": sanitize(best["pred"][i]),
            "lower": sanitize(best["lower"][i]) if i < len(best["lower"]) else None,
            "upper": sanitize(best["upper"][i]) if i < len(best["upper"]) else None,
        }
        for i in range(len(best["pred"]))
    ]

    decomposition, trend = _decompose(dates, y, season)

    payload = {
        "engine": "python",
        "bestModel": best["model"],
        "bestModelLabel": best["label"],
        "metrics": {k: sanitize(v) for k, v in best["scores"].items()},
        "trainingTimeMs": best["trainingTimeMs"],
        "predictionTimeMs": best["predictionTimeMs"],
        "holdoutSize": holdout,
        "predictions": len(forecast_rows),
        "preprocessing": stats,
        "history": history,
        "rows": history_rows + forecast_rows,
        "forecast": forecast_rows,
        "residuals": [
            {"date": dates[i], "residual": sanitize(residuals_arr[i])} for i in range(len(residuals_arr))
        ],
        "errorHistogram": _histogram(residuals_arr),
        "decomposition": decomposition,
        "trend": trend,
        "monthly": [{"period": r["date"], "value": r["forecast"]} for r in forecast_rows],
        "scores": [
            {
                "model": r["model"],
                "label": r["label"],
                "rmse": sanitize(r["scores"]["rmse"]),
                "mae": sanitize(r["scores"]["mae"]),
                "mape": sanitize(r["scores"]["mape"]),
                "r2": sanitize(r["scores"]["r2"]),
                "accuracy": sanitize(r["scores"]["accuracy"]),
                "trainingTimeMs": r["trainingTimeMs"],
                "predictionTimeMs": r["predictionTimeMs"],
                "approximated": False,
            }
            for r in results
        ],
        "failures": failures + [{"model": m, "label": m, "error": "Unknown model id"} for m in unknown],
        "datasetName": req.datasetName,
        "user": req.user,
        "parameters": {
            "dateColumn": req.dateColumn,
            "targetColumn": req.targetColumn,
            "categoryColumn": req.categoryColumn,
            "category": req.category,
            "regionColumn": req.regionColumn,
            "region": req.region,
            "models": requested,
            "horizon": req.horizon,
            "frequency": req.frequency,
            "confidence": req.confidence,
            "cleaning": req.cleaning.model_dump(),
        },
    }

    payload["runId"] = store.save_run(dict(payload))
    return payload


# ----------------------------------------------------------------------- runs
@router.get("/models")
def models():
    return {"models": [{"id": k, "label": v["label"]} for k, v in MODEL_REGISTRY.items()],
            "available": availability()}


@router.get("/runs")
def runs(limit: int = 50):
    return {"runs": store.list_runs(limit)}


@router.get("/runs/{run_id}")
def run_detail(run_id: str):
    run = store.load_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return run
