"""Shared TensorFlow/Keras recurrent trainer for LSTM and GRU services."""
from __future__ import annotations

import os

import numpy as np

from .common import pad_fitted, pick_lags, residual_bounds

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")


def run_rnn(kind: str, y, steps: int, season: int, confidence: float) -> dict:
    import tensorflow as tf
    from tensorflow.keras.layers import Dense, GRU, LSTM
    from tensorflow.keras.models import Sequential

    tf.keras.utils.set_random_seed(42)
    tf.config.threading.set_intra_op_parallelism_threads(2)

    y = np.asarray(y, dtype=float)
    lags = pick_lags(len(y), season)
    if len(y) <= lags + 3:
        raise ValueError(f"Not enough history for {kind.upper()} (need more periods).")

    vmin, vmax = float(np.min(y)), float(np.max(y))
    scale = (vmax - vmin) or 1.0
    scaled = (y - vmin) / scale

    X = np.asarray([scaled[i - lags:i] for i in range(lags, len(scaled))], dtype=float)
    t = np.asarray(scaled[lags:], dtype=float)
    X = X.reshape((X.shape[0], lags, 1))

    layer = LSTM if kind == "lstm" else GRU
    model = Sequential([layer(48, activation="tanh", input_shape=(lags, 1)), Dense(1)])
    model.compile(optimizer="adam", loss="mse")
    model.fit(X, t, epochs=200, batch_size=max(1, min(16, len(X))), verbose=0, shuffle=False)

    fitted_scaled = model.predict(X, verbose=0).reshape(-1)
    fitted = pad_fitted(y, fitted_scaled * scale + vmin, lags)

    history = list(scaled)
    preds = []
    for _ in range(steps):
        window = np.asarray(history[-lags:], dtype=float).reshape((1, lags, 1))
        value = float(model.predict(window, verbose=0)[0][0])
        preds.append(value)
        history.append(value)
    pred = np.asarray(preds, dtype=float) * scale + vmin

    lower, upper = residual_bounds(y, fitted, pred, confidence)
    return {
        "label": "LSTM Neural Network" if kind == "lstm" else "GRU Neural Network",
        "fitted": fitted.tolist(),
        "pred": pred.tolist(),
        "lower": lower,
        "upper": upper,
    }
