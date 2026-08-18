"""SARIMA (seasonal ARIMA) forecasting via statsmodels SARIMAX."""
from __future__ import annotations

import warnings

import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX

LABEL = "SARIMA"


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    y = np.asarray(y, dtype=float)
    m = int(season) if season and season > 1 else 1
    if m > 1 and len(y) < 2 * m + 4:
        m = 1
    seasonal_order = (1, 1, 1, m) if m > 1 else (0, 0, 0, 0)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        res = SARIMAX(
            y,
            order=(1, 1, 1),
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False,
        ).fit(disp=False)
    fitted = np.asarray(res.fittedvalues, dtype=float)
    if len(fitted) < len(y):
        fitted = np.concatenate([y[: len(y) - len(fitted)], fitted])
    fc = res.get_forecast(steps=steps)
    pred = np.asarray(fc.predicted_mean, dtype=float)
    ci = np.asarray(fc.conf_int(alpha=1 - float(confidence) / 100.0), dtype=float)
    return {
        "label": f"{LABEL}(1,1,1)x(1,1,1,{m})" if m > 1 else "SARIMA (non-seasonal fallback)",
        "fitted": fitted.tolist(),
        "pred": pred.tolist(),
        "lower": ci[:, 0].tolist(),
        "upper": ci[:, 1].tolist(),
    }
