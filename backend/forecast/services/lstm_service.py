"""LSTM neural network forecasting (TensorFlow/Keras)."""
from __future__ import annotations

from ._rnn import run_rnn

LABEL = "LSTM Neural Network"


def run(y, steps: int, season: int, confidence: float, dates=None, frequency: str = "monthly") -> dict:
    return run_rnn("lstm", y, steps, season, confidence)
