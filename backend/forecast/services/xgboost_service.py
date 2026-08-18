"""XGBoost regression on lag features."""
from __future__ import annotations

import numpy as np
from xgboost import XGBRegressor

from .common import pad_fitted, pick_lags, recursive_forecast, residual_bounds, supervised

LABEL = "XGBoost Regressor"


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    y = np.asarray(y, dtype=float)
    lags = pick_lags(len(y), season)
    X, t = supervised(y, lags)
    if len(X) < 3:
        raise ValueError("Not enough history for XGBoost (need more periods).")
    model = XGBRegressor(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=3,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=2,
        verbosity=0,
    ).fit(X, t)
    fitted = pad_fitted(y, model.predict(X), lags)
    pred = recursive_forecast(lambda f: model.predict(f)[0], y, lags, steps)
    lower, upper = residual_bounds(y, fitted, pred, confidence)
    return {"label": LABEL, "fitted": fitted.tolist(), "pred": pred.tolist(), "lower": lower, "upper": upper}
