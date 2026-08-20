// API Configuration for SmartMine
// Centralizes API endpoint configuration for every environment.

/** Production backend (Databricks App) used when no env var is provided. */
const PRODUCTION_API_URL = "https://datamining-backend-7474658865580035.aws.databricksapps.com";

/** Strip trailing slashes so `${BASE}/api/health` never doubles up. */
const normalize = (url: string) => url.trim().replace(/\/+$/, "");

const envApiBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

/**
 * Base URL for the backend API.
 * - Env var wins (VITE_API_BASE_URL, or VITE_API_URL as an alias)
 * - Production falls back to the Databricks App URL
 * - Development falls back to a local Flask server
 */
export const API_BASE = normalize(
  envApiBase || (import.meta.env.PROD ? PRODUCTION_API_URL : "http://localhost:5000"),
);

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Health & Status
  health: `${API_BASE}/api/health`,

  // Dataset Management
  upload: `${API_BASE}/api/upload`,
  preprocess: `${API_BASE}/api/preprocess`,
  datasetInfo: `${API_BASE}/api/dataset/info`,
  datasetPreview: `${API_BASE}/api/dataset/preview`,

  // Algorithm Recommendation
  recommend: `${API_BASE}/api/recommend`,
  algorithms: `${API_BASE}/api/algorithms`,

  // Mining Operations
  mine: `${API_BASE}/api/mine`,
  classify: `${API_BASE}/api/classify`,
  cluster: `${API_BASE}/api/cluster`,
  elbow: `${API_BASE}/api/elbow`,

  // Prediction
  predict: `${API_BASE}/api/predict`,
} as const;

/**
 * Base URL for the Python FastAPI forecasting service.
 * In production this is the same Databricks App as the mining backend.
 */
export const FORECAST_API_BASE = normalize(
  import.meta.env.VITE_FORECAST_API_URL ||
    envApiBase ||
    (import.meta.env.PROD ? PRODUCTION_API_URL : "http://localhost:8000"),
);

export const FORECAST_ENDPOINTS = {
  health: `${FORECAST_API_BASE}/api/health`,
  models: `${FORECAST_API_BASE}/forecast/models`,
  upload: `${FORECAST_API_BASE}/forecast/upload`,
  train: `${FORECAST_API_BASE}/forecast/train`,
  runs: `${FORECAST_API_BASE}/forecast/runs`,
  run: (runId: string) => `${FORECAST_API_BASE}/forecast/runs/${runId}`,
  jobs: `${FORECAST_API_BASE}/forecast/jobs`,
  job: (jobId: string) => `${FORECAST_API_BASE}/forecast/jobs/${jobId}`,
} as const;

export type BackendStatus = "checking" | "connected" | "disconnected";

/**
 * Health probe. Returns `connected` only when the request succeeds; any
 * network/CORS failure is logged (in dev) and surfaced as `disconnected`.
 */
export async function checkBackendHealth(
  baseUrl: string = API_BASE,
): Promise<{ status: BackendStatus; error?: string }> {
  const url = `${normalize(baseUrl)}/api/health`;
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return { status: "disconnected", error: `HTTP ${res.status} from ${url}` };
    }
    const body = await res.json().catch(() => null);
    if (body && typeof body === "object" && "status" in body && (body as { status: string }).status !== "ok") {
      return { status: "disconnected", error: `Unexpected health payload: ${JSON.stringify(body)}` };
    }
    return { status: "connected" };
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (import.meta.env.DEV) {
      console.error(`[backend health] GET ${url} failed —`, message, err);
    }
    return { status: "disconnected", error: message };
  }
}

/**
 * Helper function to make API calls with error handling
 */
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status}`);
  }

  return response.json();
}
