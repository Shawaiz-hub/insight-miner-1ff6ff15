"""Real evaluation metrics for forecasting models."""
from __future__ import annotations

import numpy as np

Z_SCORES = {80: 1.2816, 90: 1.6449, 95: 1.9600, 99: 2.5758}


def z_for(confidence: float) -> float:
    return Z_SCORES.get(int(round(confidence)), 1.96)


def _clean(actual, predicted):
    a = np.asarray(actual, dtype=float)
    p = np.asarray(predicted, dtype=float)
    n = min(len(a), len(p))
    a, p = a[:n], p[:n]
    mask = np.isfinite(a) & np.isfinite(p)
    return a[mask], p[mask]


def rmse(actual, predicted) -> float:
    a, p = _clean(actual, predicted)
    if a.size == 0:
        return float("nan")
    return float(np.sqrt(np.mean((a - p) ** 2)))


def mae(actual, predicted) -> float:
    a, p = _clean(actual, predicted)
    if a.size == 0:
        return float("nan")
    return float(np.mean(np.abs(a - p)))


def mape(actual, predicted) -> float:
    a, p = _clean(actual, predicted)
    mask = np.abs(a) > 1e-9
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((a[mask] - p[mask]) / a[mask])) * 100.0)


def r2(actual, predicted) -> float:
    a, p = _clean(actual, predicted)
    if a.size < 2:
        return float("nan")
    ss_res = float(np.sum((a - p) ** 2))
    ss_tot = float(np.sum((a - np.mean(a)) ** 2))
    if ss_tot <= 1e-12:
        return float("nan")
    return float(1.0 - ss_res / ss_tot)


def smape(actual, predicted) -> float:
    a, p = _clean(actual, predicted)
    denom = (np.abs(a) + np.abs(p)) / 2.0
    mask = denom > 1e-9
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs(a[mask] - p[mask]) / denom[mask]) * 100.0)


def wape(actual, predicted) -> float:
    a, p = _clean(actual, predicted)
    total = float(np.sum(np.abs(a)))
    if total <= 1e-9:
        return float("nan")
    return float(np.sum(np.abs(a - p)) / total * 100.0)


def evaluate(actual, predicted) -> dict:
    m = mape(actual, predicted)
    accuracy = float(max(0.0, min(100.0, 100.0 - m))) if np.isfinite(m) else float("nan")
    return {
        "rmse": rmse(actual, predicted),
        "mae": mae(actual, predicted),
        "mape": m,
        "smape": smape(actual, predicted),
        "wape": wape(actual, predicted),
        "r2": r2(actual, predicted),
        "accuracy": accuracy,
    }


def sanitize(value):
    """JSON-safe number (NaN/Inf -> None)."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f if np.isfinite(f) else None
