"""ARIMA forecasting (statsmodels) with a small order search by AIC."""
from __future__ import annotations

import warnings

import numpy as np
from statsmodels.tsa.arima.model import ARIMA

LABEL = "ARIMA"

ORDERS = [(1, 1, 1), (2, 1, 1), (1, 1, 0), (0, 1, 1), (2, 1, 2), (1, 0, 0)]


def _best_order(y: np.ndarray):
    best, best_aic = (1, 1, 0), float("inf")
    for order in ORDERS:
        if len(y) <= sum(order) + 3:
            continue
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                res = ARIMA(y, order=order).fit()
            if np.isfinite(res.aic) and res.aic < best_aic:
                best, best_aic = order, res.aic
        except Exception:
            continue
    return best


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    y = np.asarray(y, dtype=float)
    order = _best_order(y)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        res = ARIMA(y, order=order).fit()
    fitted = np.asarray(res.fittedvalues, dtype=float)
    if len(fitted) < len(y):
        fitted = np.concatenate([y[: len(y) - len(fitted)], fitted])
    fc = res.get_forecast(steps=steps)
    pred = np.asarray(fc.predicted_mean, dtype=float)
    ci = fc.conf_int(alpha=1 - float(confidence) / 100.0)
    ci = np.asarray(ci, dtype=float)
    return {
        "label": f"{LABEL}{order}",
        "fitted": fitted.tolist(),
        "pred": pred.tolist(),
        "lower": ci[:, 0].tolist(),
        "upper": ci[:, 1].tolist(),
    }
