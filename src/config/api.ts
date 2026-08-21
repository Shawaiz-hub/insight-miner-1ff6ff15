// API Configuration for SmartMine
// Centralizes API endpoint configuration for every environment.
//
// Resolution order for the base URLs:
//   1. Admin override saved in the database (mirrored to localStorage for a
//      synchronous boot — see src/lib/backendConfig.ts)
//   2. Build-time env vars (VITE_API_BASE_URL / VITE_API_URL,
//      VITE_FORECAST_API_URL)
//   3. Production Databricks App URL (prod) or localhost (dev)

/** Production backend (Databricks App) used when nothing else is provided. */
export const PRODUCTION_API_URL =
  "https://datamining-backend-7474658865580035.aws.databricksapps.com";

/** Strip trailing slashes so `${BASE}/api/health` never doubles up. */
export const normalize = (url: string) => (url || "").trim().replace(/\/+$/, "");

export const ENV_API_BASE = normalize(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "",
);

export const ENV_FORECAST_API_BASE = normalize(
  import.meta.env.VITE_FORECAST_API_URL || "",
);

const FALLBACK_API_BASE = import.meta.env.PROD ? PRODUCTION_API_URL : "http://localhost:5000";
const FALLBACK_FORECAST_BASE = import.meta.env.PROD ? PRODUCTION_API_URL : "http://localhost:8000";

export const OVERRIDE_STORAGE_KEY = "smartmine.backendConfig";

type Overrides = { apiBaseUrl?: string; forecastApiUrl?: string };

function readStoredOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

let overrides: Overrides = typeof window !== "undefined" ? readStoredOverrides() : {};

/** Replace the runtime overrides (called by backendConfig after DB load). */
export function setBackendOverrides(next: Overrides) {
  overrides = {
    apiBaseUrl: normalize(next.apiBaseUrl || ""),
    forecastApiUrl: normalize(next.forecastApiUrl || ""),
  };
  try {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // storage unavailable — in-memory override still applies
  }
}

export function getBackendOverrides(): Overrides {
  return { ...overrides };
}

/** Effective base URL for the mining/data backend. */
export function getApiBase(): string {
  return normalize(overrides.apiBaseUrl || ENV_API_BASE || FALLBACK_API_BASE);
}

/** Effective base URL for the Python forecasting service. */
export function getForecastApiBase(): string {
  return normalize(
    overrides.forecastApiUrl || ENV_FORECAST_API_BASE || overrides.apiBaseUrl || ENV_API_BASE || FALLBACK_FORECAST_BASE,
  );
}

/**
 * Legacy-compatible constants. These are live getters so an admin override
 * takes effect without a rebuild — `API_BASE` reads the current value each
 * time it is interpolated into a template string.
 */
export const API_BASE = {
  toString: getApiBase,
  valueOf: getApiBase,
} as unknown as string;

export const FORECAST_API_BASE = {
  toString: getForecastApiBase,
  valueOf: getForecastApiBase,
} as unknown as string;

/** API Endpoints (evaluated lazily against the resolved base URL). */
export const API_ENDPOINTS = {
  get health() { return `${getApiBase()}/api/health`; },
  get upload() { return `${getApiBase()}/api/upload`; },
  get preprocess() { return `${getApiBase()}/api/preprocess`; },
  get datasetInfo() { return `${getApiBase()}/api/dataset/info`; },
  get datasetPreview() { return `${getApiBase()}/api/dataset/preview`; },
  get recommend() { return `${getApiBase()}/api/recommend`; },
  get algorithms() { return `${getApiBase()}/api/algorithms`; },
  get mine() { return `${getApiBase()}/api/mine`; },
  get classify() { return `${getApiBase()}/api/classify`; },
  get cluster() { return `${getApiBase()}/api/cluster`; },
  get elbow() { return `${getApiBase()}/api/elbow`; },
  get predict() { return `${getApiBase()}/api/predict`; },
};

export const FORECAST_ENDPOINTS = {
  get health() { return `${getForecastApiBase()}/api/health`; },
  get models() { return `${getForecastApiBase()}/forecast/models`; },
  get upload() { return `${getForecastApiBase()}/forecast/upload`; },
  get train() { return `${getForecastApiBase()}/forecast/train`; },
  get runs() { return `${getForecastApiBase()}/forecast/runs`; },
  run: (runId: string) => `${getForecastApiBase()}/forecast/runs/${runId}`,
  get jobs() { return `${getForecastApiBase()}/forecast/jobs`; },
  job: (jobId: string) => `${getForecastApiBase()}/forecast/jobs/${jobId}`,
};

export type BackendStatus = "checking" | "connected" | "disconnected";

export interface HealthResult {
  status: BackendStatus;
  error?: string;
  /** true when the failure looks like a CORS / opaque network rejection */
  corsSuspected?: boolean;
  payload?: Record<string, unknown> | null;
}

/**
 * Single health probe. Returns `connected` only when the request succeeds; any
 * network/CORS failure is logged (in dev) and surfaced as `disconnected`.
 */
export async function checkBackendHealth(baseUrl?: string): Promise<HealthResult> {
  const url = `${normalize(baseUrl || getApiBase())}/api/health`;
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return { status: "disconnected", error: `HTTP ${res.status} from ${url}` };
    }
    const body = await res.json().catch(() => null);
    if (body && typeof body === "object" && "status" in body && (body as { status: string }).status !== "ok") {
      return { status: "disconnected", error: `Unexpected health payload: ${JSON.stringify(body)}` };
    }
    return { status: "connected", payload: body as Record<string, unknown> | null };
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const corsSuspected = err instanceof TypeError || /Failed to fetch|NetworkError|load failed/i.test(message);
    if (import.meta.env.DEV) {
      console.warn(`[backend health] GET ${url} unreachable —`, message);
    }
    return { status: "disconnected", error: message, corsSuspected };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Health probe with exponential backoff. The status only resolves to
 * `disconnected` after every attempt fails.
 */
export async function checkBackendHealthWithRetry(
  baseUrl?: string,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    onAttempt?: (attempt: number, total: number, result: HealthResult) => void;
  } = {},
): Promise<HealthResult & { attempts: number }> {
  const total = options.attempts ?? 4;
  const baseDelay = options.baseDelayMs ?? 1000;
  let last: HealthResult = { status: "disconnected", error: "not attempted" };

  for (let attempt = 1; attempt <= total; attempt++) {
    last = await checkBackendHealth(baseUrl);
    options.onAttempt?.(attempt, total, last);
    if (last.status === "connected") return { ...last, attempts: attempt };
    if (attempt < total) {
      const delay = baseDelay * 2 ** (attempt - 1);
      await sleep(delay + Math.random() * 250);
    }
  }
  return { ...last, attempts: total };
}

/**
 * Helper function to make API calls with error handling
 */
export async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || `API Error: ${response.status}`);
  }

  return response.json();
}
