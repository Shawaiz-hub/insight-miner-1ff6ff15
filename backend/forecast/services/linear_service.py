"""Linear Regression forecasting (scikit-learn)."""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LinearRegression

from .common import residual_bounds

LABEL = "Linear Regression"


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    y = np.asarray(y, dtype=float)
    X = np.arange(len(y), dtype=float).reshape(-1, 1)
    model = LinearRegression().fit(X, y)
    fitted = model.predict(X)
    future = np.arange(len(y), len(y) + steps, dtype=float).reshape(-1, 1)
    pred = model.predict(future)
    lower, upper = residual_bounds(y, fitted, pred, confidence)
    return {"label": LABEL, "fitted": fitted.tolist(), "pred": pred.tolist(), "lower": lower, "upper": upper}
