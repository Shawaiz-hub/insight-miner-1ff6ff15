"""Shared helpers for the model services."""
from __future__ import annotations

import numpy as np

from .metrics import z_for


def residual_bounds(y: np.ndarray, fitted: np.ndarray, pred: np.ndarray, confidence: float):
    """Confidence bounds derived from in-sample residual spread (widening with horizon)."""
    y = np.asarray(y, dtype=float)
    fitted = np.asarray(fitted, dtype=float)
    n = min(len(y), len(fitted))
    resid = y[:n] - fitted[:n]
    resid = resid[np.isfinite(resid)]
    sigma = float(np.std(resid)) if resid.size > 1 else float(np.std(y) * 0.1 + 1e-6)
    z = z_for(confidence)
    steps = np.arange(1, len(pred) + 1, dtype=float)
    spread = z * sigma * np.sqrt(steps)
    return (np.asarray(pred, float) - spread).tolist(), (np.asarray(pred, float) + spread).tolist()


def supervised(y: np.ndarray, lags: int):
    """Build lag-feature matrix X, target vector t (aligned to y[lags:])."""
    y = np.asarray(y, dtype=float)
    rows, targets = [], []
    for i in range(lags, len(y)):
        rows.append(np.concatenate([y[i - lags:i], [i]]))
        targets.append(y[i])
    return np.asarray(rows, dtype=float), np.asarray(targets, dtype=float)


def recursive_forecast(predict_one, y: np.ndarray, lags: int, steps: int) -> np.ndarray:
    """Roll a lag-based model forward, feeding predictions back in."""
    history = list(np.asarray(y, dtype=float))
    out = []
    for k in range(steps):
        features = np.concatenate([np.asarray(history[-lags:], float), [len(history)]]).reshape(1, -1)
        value = float(predict_one(features))
        out.append(value)
        history.append(value)
    return np.asarray(out, dtype=float)


def pick_lags(n: int, season: int) -> int:
    candidate = season if season > 1 else 3
    return int(max(2, min(candidate, max(2, n // 3))))


def pad_fitted(y: np.ndarray, partial: np.ndarray, offset: int) -> np.ndarray:
    """Prepend actuals for the first `offset` points that a lag model cannot fit."""
    y = np.asarray(y, dtype=float)
    fitted = np.empty(len(y), dtype=float)
    fitted[:offset] = y[:offset]
    fitted[offset:offset + len(partial)] = partial
    return fitted
