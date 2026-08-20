# Deploying the Forecasting Service to Databricks Apps

The React frontend stays on Vercel. Only this FastAPI service is deployed.

## 1. Files that matter

```
backend/forecast/
    app.py            # exposes `app = FastAPI(...)`
    app.yaml          # Databricks Apps entrypoint + env vars
    requirements.txt  # pinned for Python 3.11
    api/, services/, store.py
```

`app.yaml` starts the service with:

```
uvicorn app:app --host 0.0.0.0 --port $DATABRICKS_APP_PORT
```

## 2. Secrets

Create a secret scope and add the values referenced by `valueFrom` in `app.yaml`:

```bash
databricks secrets create-scope smartmine
databricks secrets put-secret smartmine supabase-url
databricks secrets put-secret smartmine supabase-anon-key
databricks secrets put-secret smartmine backend-api-key
```

Never inline secrets in `app.yaml`.

## 3. Deploy

```bash
databricks apps create datamining-backend
databricks sync ./backend/forecast /Workspace/Users/<you>/datamining-backend
databricks apps deploy datamining-backend \
  --source-code-path /Workspace/Users/<you>/datamining-backend
```

## 4. CORS

Set `FRONTEND_URL` to the exact frontend origin (no trailing slash):

```
FRONTEND_URL=https://advance-data-mining.vercel.app
CORS_ORIGINS=https://advance-data-mining.lovable.app
```

Both are read at startup and logged, so the app log shows the effective
allow-list. A browser "blocked by CORS policy" error means this value does not
match the requesting origin.

## 5. Verify

```bash
curl https://<app-url>/api/health
# {"status":"ok","message":"SmartMine backend is running", ...}
```

`/health`, `/api/health`, `/forecast/health` and `/api/forecast/health` all
return the same payload. Forecast routes are served under both `/forecast/...`
and `/api/forecast/...`.

## 6. Frontend

Set on Vercel:

```
VITE_API_BASE_URL=https://datamining-backend-7474658865580035.aws.databricksapps.com
VITE_FORECAST_API_URL=https://datamining-backend-7474658865580035.aws.databricksapps.com
```

Trailing slashes are stripped in `src/config/api.ts`.

## 7. Long trainings

LSTM/GRU can outlast a browser request. Use the background job endpoints:

```
POST /forecast/jobs   -> { jobId, status: "queued" }
GET  /forecast/jobs/{jobId} -> { status: queued|running|completed|failed, result? }
```

`POST /forecast/train` remains synchronous and unchanged.
