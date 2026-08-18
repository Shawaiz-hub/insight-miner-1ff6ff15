"""Polynomial Regression forecasting (scikit-learn PolynomialFeatures)."""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures

from .common import residual_bounds

LABEL = "Polynomial Regression"


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    y = np.asarray(y, dtype=float)
    degree = 2 if len(y) >= 6 else 1
    X = np.arange(len(y), dtype=float).reshape(-1, 1)
    model = make_pipeline(PolynomialFeatures(degree=degree, include_bias=True), LinearRegression()).fit(X, y)
    fitted = model.predict(X)
    future = np.arange(len(y), len(y) + steps, dtype=float).reshape(-1, 1)
    pred = model.predict(future)
    lower, upper = residual_bounds(y, fitted, pred, confidence)
    return {"label": LABEL, "fitted": fitted.tolist(), "pred": pred.tolist(), "lower": lower, "upper": upper}
