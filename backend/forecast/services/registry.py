"""Model registry — maps frontend model ids to independent service implementations."""
from __future__ import annotations

from importlib import import_module

MODEL_REGISTRY: dict[str, dict[str, str]] = {
    "linear": {"module": "services.linear_service", "label": "Linear Regression"},
    "polynomial": {"module": "services.polynomial_service", "label": "Polynomial Regression"},
    "arima": {"module": "services.arima_service", "label": "ARIMA"},
    "sarima": {"module": "services.sarima_service", "label": "SARIMA"},
    "holt_winters": {"module": "services.holt_service", "label": "Holt-Winters Exponential Smoothing"},
    "prophet": {"module": "services.prophet_service", "label": "Facebook Prophet"},
    "random_forest": {"module": "services.randomforest_service", "label": "Random Forest Regressor"},
    "xgboost": {"module": "services.xgboost_service", "label": "XGBoost Regressor"},
    "lstm": {"module": "services.lstm_service", "label": "LSTM Neural Network"},
    "gru": {"module": "services.gru_service", "label": "GRU Neural Network"},
}


def label_for(model_id: str) -> str:
    return MODEL_REGISTRY.get(model_id, {}).get("label", model_id)


def resolve(model_id: str):
    entry = MODEL_REGISTRY.get(model_id)
    if not entry:
        raise ValueError(f"Unknown model '{model_id}'")
    module = import_module(entry["module"])
    return module.run


def availability() -> dict[str, bool]:
    out: dict[str, bool] = {}
    for model_id, entry in MODEL_REGISTRY.items():
        try:
            import_module(entry["module"])
            out[model_id] = True
        except Exception:
            out[model_id] = False
    return out
