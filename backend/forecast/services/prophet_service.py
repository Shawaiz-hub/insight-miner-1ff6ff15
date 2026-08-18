"""Facebook Prophet forecasting (official prophet library)."""
from __future__ import annotations

import logging
import warnings

import numpy as np
import pandas as pd

from .preprocessing import period_to_timestamp

LABEL = "Facebook Prophet"

logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)

PANDAS_FREQ = {"daily": "D", "weekly": "W-MON", "monthly": "MS", "quarterly": "QS", "yearly": "YS"}


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    from prophet import Prophet

    y = np.asarray(y, dtype=float)
    if dates:
        stamps = [period_to_timestamp(d, frequency) for d in dates[: len(y)]]
    else:
        stamps = list(pd.date_range("2000-01-01", periods=len(y), freq="MS"))

    df = pd.DataFrame({"ds": stamps, "y": y})
    freq = PANDAS_FREQ.get(str(frequency).lower(), "MS")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = Prophet(
            interval_width=float(confidence) / 100.0,
            yearly_seasonality=season > 1 and len(y) >= 2 * season,
            weekly_seasonality=str(frequency).lower() == "daily",
            daily_seasonality=False,
        )
        model.fit(df)
        future = model.make_future_dataframe(periods=steps, freq=freq)
        out = model.predict(future)

    fitted = out["yhat"].to_numpy(dtype=float)[: len(y)]
    tail = out.tail(steps)
    return {
        "label": LABEL,
        "fitted": fitted.tolist(),
        "pred": tail["yhat"].to_numpy(dtype=float).tolist(),
        "lower": tail["yhat_lower"].to_numpy(dtype=float).tolist(),
        "upper": tail["yhat_upper"].to_numpy(dtype=float).tolist(),
    }
