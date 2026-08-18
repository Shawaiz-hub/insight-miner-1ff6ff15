"""Holt-Winters exponential smoothing (statsmodels ExponentialSmoothing)."""
from __future__ import annotations

import warnings

import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from .common import residual_bounds

LABEL = "Holt-Winters Exponential Smoothing"


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    y = np.asarray(y, dtype=float)
    m = int(season) if season and season > 1 else 1
    use_season = m > 1 and len(y) >= 2 * m
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = ExponentialSmoothing(
            y,
            trend="add",
            seasonal="add" if use_season else None,
            seasonal_periods=m if use_season else None,
            initialization_method="estimated",
        )
        res = model.fit(optimized=True)
    fitted = np.asarray(res.fittedvalues, dtype=float)
    pred = np.asarray(res.forecast(steps), dtype=float)
    lower, upper = residual_bounds(y, fitted, pred, confidence)
    return {
        "label": LABEL if use_season else "Holt Linear Trend (no seasonality)",
        "fitted": fitted.tolist(),
        "pred": pred.tolist(),
        "lower": lower,
        "upper": upper,
    }
