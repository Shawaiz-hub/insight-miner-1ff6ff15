# SmartMine Forecasting Microservice (FastAPI)

Real Python forecasting engine used by the React Forecasting page. Every selected model
is trained independently with actual libraries — no approximations, no shared metrics.

## Models

| id | Implementation |
| --- | --- |
| `linear` | scikit-learn `LinearRegression` |
| `polynomial` | scikit-learn `PolynomialFeatures` + `LinearRegression` |
| `arima` | statsmodels `ARIMA` (AIC order search) |
| `sarima` | statsmodels `SARIMAX` (seasonal) |
| `holt_winters` | statsmodels `ExponentialSmoothing` |
| `prophet` | `prophet` (Facebook Prophet) |
| `random_forest` | scikit-learn `RandomForestRegressor` on lag features |
| `xgboost` | `XGBRegressor` on lag features |
| `lstm` | TensorFlow/Keras LSTM |
| `gru` | TensorFlow/Keras GRU |

## Endpoints

- `GET /health` — status and per-model import availability
- `GET /forecast/models` — registry
- `POST /forecast/upload` — multipart CSV / XLSX / JSON → columns, types, 10-row preview, `uploadId`
- `POST /forecast/train` — train + score + forecast (see below)
- `GET /forecast/runs` / `GET /forecast/runs/{runId}` — persisted runs for reopening

### Train request

```json
{
  "dateColumn": "Date",
  "targetColumn": "Units Sold",
  "categoryColumn": "Category",
  "category": "Dairy",
  "regionColumn": "Region",
  "region": "Lahore",
  "models": ["prophet", "arima", "xgboost"],
  "horizon": 180,
  "frequency": "monthly",
  "confidence": 95,
  "cleaning": { "fillMissing": true, "removeDuplicates": true, "detectOutliers": true },
  "rows": [{ "Date": "2024-01-01", "Units Sold": 120 }]
}
```

Either `rows` (inline records) or `uploadId` (from `/forecast/upload`) must be provided.

### Evaluation

The series is aggregated to the requested frequency, then split: the last
`max(2, min(12, 20%))` periods form the hold-out window. Each model trains on the
remaining history, is scored on the hold-out (RMSE, MAE, MAPE, R², accuracy = 100 − MAPE),
then refits on the full history to produce the forecast. Best model = lowest hold-out RMSE.
Confidence bands come from the model's own intervals (ARIMA, SARIMA, Prophet) or from
residual spread widening with the horizon.

## Run locally

```bash
cd backend/forecast
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Or with Docker Compose from the repo root: `docker compose up forecast`.

## Deploy (Railway)

Create a new service pointing at `backend/forecast` (Dockerfile build). The container binds
`$PORT`. Then set `VITE_FORECAST_API_URL` in the frontend environment to the service URL.
Set `CORS_ORIGINS` to your frontend origins for a tighter policy.
