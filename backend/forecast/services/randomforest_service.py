"""Random Forest regression on lag features (scikit-learn)."""
from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestRegressor

from .common import pad_fitted, pick_lags, recursive_forecast, residual_bounds, supervised

LABEL = "Random Forest Regressor"


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    y = np.asarray(y, dtype=float)
    lags = pick_lags(len(y), season)
    X, t = supervised(y, lags)
    if len(X) < 3:
        raise ValueError("Not enough history for Random Forest (need more periods).")
    model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1).fit(X, t)
    fitted = pad_fitted(y, model.predict(X), lags)
    pred = recursive_forecast(lambda f: model.predict(f)[0], y, lags, steps)
    lower, upper = residual_bounds(y, fitted, pred, confidence)
    return {"label": LABEL, "fitted": fitted.tolist(), "pred": pred.tolist(), "lower": lower, "upper": upper}
