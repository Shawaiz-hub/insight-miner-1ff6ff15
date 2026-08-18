# Real Python Forecasting Microservice

Replace the in-browser forecasting approximations with a genuine FastAPI + Python ML service. The Forecasting UI, routes, styling, and charts stay exactly as they are.

## What changes for you

- Every model (Linear, Polynomial, ARIMA, SARIMA, Holt-Winters, Prophet, Random Forest, XGBoost, LSTM, GRU) is trained independently in Python with real libraries.
- Metrics (RMSE, MAE, MAPE, R2, training/prediction time, prediction count) are computed from a real hold-out window per model — no shared or synthetic numbers.
- Best model is selected by lowest hold-out RMSE, and the comparison table shows each model's own scores.
- If the service is unreachable, the page shows a clear error instead of falling back to fake results.
- Forecast runs are saved both to your Cloud history table (unchanged history page) and on the service disk for reopening.

## Backend (new, separate service)

New FastAPI app under `backend/forecast/`, run on port 8000. The existing Flask mining app (`backend/app.py`, port 5000) is left untouched.

```text
backend/forecast/
  app.py                  FastAPI entry, CORS, /health
  requirements.txt
  Dockerfile
  api/forecast.py         routes
  services/
    preprocessing.py      parse, clean, aggregate, outliers, smoothing
    metrics.py            RMSE/MAE/MAPE/R2 + timing
    registry.py           model id -> service dispatch
    linear_service.py     sklearn LinearRegression
    polynomial_service.py sklearn PolynomialFeatures + LinearRegression
    arima_service.py      statsmodels ARIMA (order search)
    sarima_service.py     statsmodels SARIMAX seasonal
    holt_service.py       statsmodels ExponentialSmoothing
    prophet_service.py    prophet
    randomforest_service.py sklearn RandomForestRegressor (lag features)
    xgboost_service.py    xgboost XGBRegressor (lag features)
    lstm_service.py       tensorflow.keras LSTM
    gru_service.py        tensorflow.keras GRU
  store.py                run persistence (JSON + joblib)
  uploads/ temp/ models/ runs/
```

Libraries: fastapi, uvicorn, pandas, numpy, scikit-learn, statsmodels, prophet, tensorflow-cpu, xgboost, openpyxl, python-multipart, joblib, scipy.

### Endpoints

- `GET /health` — service + model availability.
- `POST /forecast/upload` — CSV / XLSX / JSON multipart; returns detected columns with data types, first 10 preview rows, row count, and an `uploadId`.
- `POST /forecast/train` — body: date/target/category/region columns and filter values, `models` (list), horizon, frequency, confidence, cleaning options, and either `uploadId` or inline series. Returns: preprocessing stats, per-model `scores[]` (rmse, mae, mape, r2, accuracy, trainingTime, predictionTime, predictions), chosen `bestModel`, history rows, forecast rows with lower/upper bounds, residuals, trend, seasonality decomposition, and a `runId`.
- `GET /forecast/runs` and `GET /forecast/runs/{runId}` — persisted runs for reopening.

Each model runs in isolation: fit on train split, score on hold-out, refit on full series, then forecast the horizon. Confidence bands come from model intervals where available (ARIMA/SARIMA/Prophet/Holt) and from residual quantiles otherwise. Failures for a single model are reported per-model without failing the whole request.

Cleaning support: remove missing, fill missing (interpolate), remove duplicates, normalize, outlier detection (IQR), smoothing (rolling), each reflected in returned preprocessing statistics.

## Frontend integration (no redesign)

- `src/lib/forecastEngine.ts`: delete the approximation math (`runForecast` and per-model estimators). Keep the shared types, `FORECAST_MODELS`, `HORIZON_PRESETS`, frequency/date helpers, and local parsing/series building used for previews and mapping.
- New `src/lib/forecastApi.ts`: typed client for `/forecast/upload`, `/forecast/train`, and run retrieval; maps the API response into the existing `ForecastResult` shape so `ForecastResults.tsx` renders unchanged.
- `src/config/api.ts`: add `FORECAST_API_BASE` from `VITE_FORECAST_API_URL`, defaulting to `http://localhost:8000` in dev and the Railway URL in production, plus the forecast endpoint map.
- `src/pages/Forecasting.tsx`: `handleTrain` calls the API, keeps the existing staged progress indicator while awaiting, and on failure shows the existing error alert (no silent fallback). Saving to the Cloud `forecasts` table stays as-is, with `runId` stored in `parameters`.
- `ForecastConfig.tsx` / `ForecastResults.tsx` / `ForecastUpload.tsx` / `ForecastHistory.tsx`: no visual changes; only remove the "approximated" badge wiring if the field disappears, and add residual/trend/seasonality data now sourced from the API.

## Docker

- `docker-compose.yml`: add a `forecast` service built from `backend/forecast/Dockerfile`, exposing `8000:8000`, with named volumes for `uploads`, `models`, and `runs`, a `/health` healthcheck, and the frontend depending on it. Existing frontend and Flask backend services remain.
- Frontend build gets `VITE_FORECAST_API_URL` pointing at the compose service.

## Deployment note

The service is Railway-ready (Dockerfile + `$PORT` binding). After you deploy it, set `VITE_FORECAST_API_URL` on Vercel to the Railway URL. Prophet and TensorFlow make the image large (~3 GB) and first cold start slower — that is expected with all models included.
