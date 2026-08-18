/**
 * Client for the Python FastAPI forecasting microservice.
 * All model training, metrics and confidence intervals come from the backend —
 * there is no in-browser fallback.
 */

import { FORECAST_ENDPOINTS } from "@/config/api";
import type {
  CleaningOptions,
  CleaningSummary,
  ForecastResult,
  ForecastRow,
  Frequency,
  ModelScore,
  SeriesPoint,
} from "@/lib/forecastEngine";

export interface TrainPayload {
  rows: Record<string, unknown>[];
  dateColumn: string;
  targetColumn: string;
  categoryColumn?: string;
  category?: string;
  regionColumn?: string;
  region?: string;
  models: string[];
  horizon: number;
  frequency: Frequency;
  confidence: number;
  cleaning: CleaningOptions;
  datasetName?: string;
  user?: string;
}

export interface TrainResponse {
  engine: "python";
  runId: string;
  bestModel: string;
  bestModelLabel: string;
  metrics: { rmse: number | null; mae: number | null; mape: number | null; r2: number | null; accuracy: number | null };
  trainingTimeMs: number;
  predictionTimeMs: number;
  holdoutSize: number;
  predictions: number;
  preprocessing: CleaningSummary;
  history: SeriesPoint[];
  rows: ForecastRow[];
  forecast: ForecastRow[];
  residuals: { date: string; residual: number }[];
  errorHistogram: { bucket: string; count: number }[];
  decomposition: ForecastResult["decomposition"];
  trend: { date: string; trend: number }[];
  monthly: { period: string; value: number }[];
  scores: (ModelScore & { trainingTimeMs: number; predictionTimeMs: number })[];
  failures: { model: string; label: string; error: string }[];
}

const OFFLINE_MESSAGE =
  "Forecasting service is unavailable. Start the Python service (docker compose up forecast, or uvicorn app:app --port 8000) and try again.";

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error(OFFLINE_MESSAGE);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = (body as { detail?: unknown } | null)?.detail;
    throw new Error(
      typeof detail === "string" ? detail : `Forecasting service error (HTTP ${response.status}).`,
    );
  }
  return response.json() as Promise<T>;
}

export async function checkForecastHealth(): Promise<boolean> {
  try {
    const res = await fetch(FORECAST_ENDPOINTS.health, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send the raw dataset rows + options to FastAPI and receive real model results. */
export async function trainForecast(payload: TrainPayload): Promise<TrainResponse> {
  return request<TrainResponse>(FORECAST_ENDPOINTS.train, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadForecastDataset(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{
    uploadId: string;
    name: string;
    size: number;
    rowCount: number;
    columns: { name: string; type: string; sample: string; missing: number }[];
    preview: Record<string, unknown>[];
  }>(FORECAST_ENDPOINTS.upload, { method: "POST", body: form });
}

export async function fetchForecastRun(runId: string): Promise<TrainResponse> {
  return request<TrainResponse>(FORECAST_ENDPOINTS.run(runId), { method: "GET" });
}

const numberOr = (v: number | null | undefined, fallback = NaN) =>
  v === null || v === undefined ? fallback : v;

/** Map the API response into the shape the existing charts/tables already consume. */
export function toForecastResult(res: TrainResponse): ForecastResult {
  return {
    bestModel: res.bestModel,
    bestModelLabel: res.bestModelLabel,
    approximated: false,
    metrics: {
      rmse: numberOr(res.metrics.rmse),
      mae: numberOr(res.metrics.mae),
      mape: numberOr(res.metrics.mape),
      r2: numberOr(res.metrics.r2),
      accuracy: numberOr(res.metrics.accuracy),
    },
    trainingTimeMs: Math.round(res.trainingTimeMs ?? 0),
    rows: res.rows ?? [],
    history: res.history ?? [],
    forecast: res.forecast ?? [],
    residuals: res.residuals ?? [],
    errorHistogram: res.errorHistogram ?? [],
    decomposition: res.decomposition ?? [],
    trend: res.trend ?? [],
    monthly: res.monthly ?? [],
    scores: (res.scores ?? []).map((s) => ({
      model: s.model,
      label: s.label,
      rmse: numberOr(s.rmse),
      mae: numberOr(s.mae),
      mape: numberOr(s.mape),
      r2: numberOr(s.r2),
      accuracy: numberOr(s.accuracy),
      approximated: false,
    })),
    engine: "python",
  };
}
