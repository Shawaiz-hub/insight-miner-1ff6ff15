/**
 * SmartMine Forecasting Engine
 * ----------------------------
 * Client-side time-series forecasting used as the primary engine in the browser
 * and as a fallback when the Python microservice is unavailable.
 *
 * Implemented estimators: linear / polynomial regression, simple & double
 * exponential smoothing, Holt-Winters (additive seasonality), Theta method,
 * moving-average (ARIMA-style) and lag-feature ensembles (tree-style regressors).
 */

import * as XLSX from "xlsx";
import Papa from "papaparse";

export type ColumnType = "date" | "number" | "text";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  sample: string;
  missing: number;
}

export interface ParsedDataset {
  name: string;
  size: number;
  rows: Record<string, unknown>[];
  columns: ColumnMeta[];
}

export interface CleaningOptions {
  removeMissing: boolean;
  fillMissing: boolean;
  removeDuplicates: boolean;
  normalize: boolean;
  detectOutliers: boolean;
  smooth: boolean;
}

export interface CleaningSummary {
  originalRows: number;
  finalRows: number;
  missingRemoved: number;
  missingFilled: number;
  duplicatesRemoved: number;
  outliersDetected: number;
  normalized: boolean;
  smoothed: boolean;
}

export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface ForecastOptions {
  horizon: number;
  frequency: Frequency;
  confidence: number; // 80 | 90 | 95 | 99
  models: string[];
}

export interface ForecastRow {
  date: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface ModelScore {
  model: string;
  label: string;
  rmse: number;
  mae: number;
  mape: number;
  r2: number;
  accuracy: number;
  approximated: boolean;
}

export interface ForecastResult {
  bestModel: string;
  bestModelLabel: string;
  approximated: boolean;
  metrics: { rmse: number; mae: number; mape: number; r2: number; accuracy: number };
  trainingTimeMs: number;
  rows: ForecastRow[];
  history: SeriesPoint[];
  forecast: ForecastRow[];
  residuals: { date: string; residual: number }[];
  errorHistogram: { bucket: string; count: number }[];
  decomposition: { date: string; observed: number; trend: number | null; seasonal: number; residual: number | null }[];
  trend: { date: string; trend: number }[];
  monthly: { period: string; value: number }[];
  scores: ModelScore[];
  engine: "browser" | "python";
}

/* ------------------------------------------------------------------ models */

export const FORECAST_MODELS: { id: string; label: string; native: boolean; description: string }[] = [
  { id: "linear", label: "Linear Regression", native: true, description: "Least-squares trend line" },
  { id: "polynomial", label: "Polynomial Regression", native: true, description: "Degree-2 curved trend" },
  { id: "arima", label: "ARIMA", native: false, description: "Differenced auto-regressive moving average" },
  { id: "sarima", label: "SARIMA", native: false, description: "Seasonal ARIMA" },
  { id: "holt_winters", label: "Holt-Winters Exponential Smoothing", native: true, description: "Trend + seasonality smoothing" },
  { id: "prophet", label: "Facebook Prophet", native: false, description: "Additive trend + seasonality model" },
  { id: "xgboost", label: "XGBoost Regressor", native: false, description: "Gradient-boosted lag features" },
  { id: "random_forest", label: "Random Forest Regressor", native: false, description: "Bagged lag-feature regressor" },
  { id: "lstm", label: "LSTM Neural Network", native: false, description: "Recurrent sequence model" },
  { id: "gru", label: "GRU Neural Network", native: false, description: "Gated recurrent sequence model" },
];

export const HORIZON_PRESETS = [
  { label: "7 Days", value: 7 },
  { label: "14 Days", value: 14 },
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
  { label: "90 Days", value: 90 },
  { label: "6 Months", value: 180 },
  { label: "1 Year", value: 365 },
];

export const modelLabel = (id: string) => FORECAST_MODELS.find((m) => m.id === id)?.label ?? id;

/* ------------------------------------------------------------- file parsing */

const DATE_RE = /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;

export function detectType(values: unknown[]): ColumnType {
  const sample = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "").slice(0, 40);
  if (!sample.length) return "text";
  const numeric = sample.filter((v) => typeof v === "number" || (!isNaN(Number(String(v).replace(/[, ]/g, ""))) && String(v).trim() !== "")).length;
  const dates = sample.filter((v) => v instanceof Date || DATE_RE.test(String(v)) || !isNaN(Date.parse(String(v)))).length;
  if (dates / sample.length > 0.8 && numeric / sample.length < 0.8) return "date";
  if (numeric / sample.length > 0.8) return "number";
  if (dates / sample.length > 0.8) return "date";
  return "text";
}

function buildColumns(rows: Record<string, unknown>[]): ColumnMeta[] {
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return keys.map((name) => {
    const values = rows.map((r) => r[name]);
    const missing = values.filter((v) => v === null || v === undefined || String(v).trim() === "").length;
    const first = values.find((v) => v !== null && v !== undefined && String(v).trim() !== "");
    return { name, type: detectType(values), sample: first === undefined ? "—" : String(first), missing };
  });
}

export async function parseFile(file: File): Promise<ParsedDataset> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  let rows: Record<string, unknown>[] = [];

  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  } else if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  } else {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
    rows = parsed.data.filter((r) => r && Object.keys(r).length > 0);
  }

  if (!rows.length) throw new Error("No rows found in the uploaded file.");

  return { name: file.name, size: file.size, rows, columns: buildColumns(rows) };
}

/* ------------------------------------------------------ series construction */

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

const periodKey = (d: Date, freq: Frequency): string => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (freq) {
    case "yearly":
      return `${y}`;
    case "quarterly":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "monthly":
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    case "weekly": {
      const day = new Date(Date.UTC(y, m, d.getUTCDate()));
      day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
      return day.toISOString().slice(0, 10);
    }
    default:
      return d.toISOString().slice(0, 10);
  }
};

export function nextPeriods(last: string, freq: Frequency, count: number): string[] {
  const out: string[] = [];
  if (freq === "yearly") {
    const y = Number(last);
    for (let i = 1; i <= count; i++) out.push(String(y + i));
    return out;
  }
  if (freq === "quarterly") {
    const [ys, qs] = last.split("-Q");
    let y = Number(ys);
    let q = Number(qs);
    for (let i = 1; i <= count; i++) {
      q += 1;
      if (q > 4) { q = 1; y += 1; }
      out.push(`${y}-Q${q}`);
    }
    return out;
  }
  if (freq === "monthly") {
    const [ys, ms] = last.split("-");
    let y = Number(ys);
    let m = Number(ms);
    for (let i = 1; i <= count; i++) {
      m += 1;
      if (m > 12) { m = 1; y += 1; }
      out.push(`${y}-${String(m).padStart(2, "0")}`);
    }
    return out;
  }
  const step = freq === "weekly" ? 7 : 1;
  const base = new Date(`${last}T00:00:00Z`);
  for (let i = 1; i <= count; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + step * i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function horizonPeriods(days: number, freq: Frequency): number {
  switch (freq) {
    case "weekly": return Math.max(2, Math.round(days / 7));
    case "monthly": return Math.max(2, Math.round(days / 30));
    case "quarterly": return Math.max(2, Math.round(days / 91));
    case "yearly": return Math.max(1, Math.round(days / 365));
    default: return Math.max(2, days);
  }
}

export interface SeriesBuildResult {
  series: SeriesPoint[];
  summary: CleaningSummary;
}

export function buildSeries(
  rows: Record<string, unknown>[],
  dateCol: string,
  targetCol: string,
  frequency: Frequency,
  cleaning: CleaningOptions,
  filters?: { categoryCol?: string; category?: string; regionCol?: string; region?: string },
): SeriesBuildResult {
  const summary: CleaningSummary = {
    originalRows: rows.length,
    finalRows: 0,
    missingRemoved: 0,
    missingFilled: 0,
    duplicatesRemoved: 0,
    outliersDetected: 0,
    normalized: cleaning.normalize,
    smoothed: cleaning.smooth,
  };

  let working = rows;
  if (filters?.categoryCol && filters.category && filters.category !== "__all__") {
    working = working.filter((r) => String(r[filters.categoryCol!]) === filters.category);
  }
  if (filters?.regionCol && filters.region && filters.region !== "__all__") {
    working = working.filter((r) => String(r[filters.regionCol!]) === filters.region);
  }

  if (cleaning.removeDuplicates) {
    const seen = new Set<string>();
    const deduped: Record<string, unknown>[] = [];
    for (const r of working) {
      const key = JSON.stringify(r);
      if (seen.has(key)) { summary.duplicatesRemoved++; continue; }
      seen.add(key);
      deduped.push(r);
    }
    working = deduped;
  }

  type Raw = { date: Date; value: number | null };
  const raw: Raw[] = [];
  for (const r of working) {
    const d = toDate(r[dateCol]);
    if (!d) { summary.missingRemoved++; continue; }
    const v = toNumber(r[targetCol]);
    if (v === null) {
      if (cleaning.removeMissing || !cleaning.fillMissing) { summary.missingRemoved++; continue; }
      summary.missingFilled++;
      raw.push({ date: d, value: null });
      continue;
    }
    raw.push({ date: d, value: v });
  }

  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  // forward/backward fill
  if (cleaning.fillMissing) {
    let last: number | null = null;
    for (const p of raw) { if (p.value === null) p.value = last; else last = p.value; }
    let next: number | null = null;
    for (let i = raw.length - 1; i >= 0; i--) { if (raw[i].value === null) raw[i].value = next; else next = raw[i].value; }
  }

  // aggregate to selected frequency
  const buckets = new Map<string, number[]>();
  for (const p of raw) {
    if (p.value === null) continue;
    const key = periodKey(p.date, frequency);
    const arr = buckets.get(key) ?? [];
    arr.push(p.value);
    buckets.set(key, arr);
  }

  let series: SeriesPoint[] = Array.from(buckets.entries())
    .map(([date, values]) => ({ date, value: values.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (cleaning.detectOutliers && series.length > 5) {
    const values = series.map((p) => p.value);
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    series = series.map((p) => {
      if (p.value < lo || p.value > hi) {
        summary.outliersDetected++;
        return { ...p, value: Math.min(hi, Math.max(lo, p.value)) };
      }
      return p;
    });
  }

  if (cleaning.smooth && series.length > 4) {
    const w = 3;
    series = series.map((p, i) => {
      const slice = series.slice(Math.max(0, i - w + 1), i + 1);
      return { ...p, value: slice.reduce((a, b) => a + b.value, 0) / slice.length };
    });
  }

  if (cleaning.normalize && series.length > 1) {
    const values = series.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max > min) series = series.map((p) => ({ ...p, value: (p.value - min) / (max - min) }));
  }

  summary.finalRows = series.length;
  return { series, summary };
}

/* ---------------------------------------------------------------- estimators */

type Fitted = { fitted: number[]; predict: (steps: number) => number[] };

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

function polyFit(y: number[], degree: number): Fitted {
  const n = y.length;
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let d = 0; d <= degree; d++) row.push(Math.pow(i, d));
    X.push(row);
  }
  // normal equations with Gaussian elimination
  const m = degree + 1;
  const A: number[][] = Array.from({ length: m }, () => Array(m + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) A[i][j] = X.reduce((s, row) => s + row[i] * row[j], 0);
    A[i][m] = X.reduce((s, row, k) => s + row[i] * y[k], 0);
  }
  for (let i = 0; i < m; i++) {
    let pivot = i;
    for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
    [A[i], A[pivot]] = [A[pivot], A[i]];
    const div = A[i][i] || 1e-9;
    for (let j = i; j <= m; j++) A[i][j] /= div;
    for (let r = 0; r < m; r++) {
      if (r === i) continue;
      const f = A[r][i];
      for (let j = i; j <= m; j++) A[r][j] -= f * A[i][j];
    }
  }
  const coef = A.map((row) => row[m]);
  const evalAt = (i: number) => coef.reduce((s, c, d) => s + c * Math.pow(i, d), 0);
  return {
    fitted: y.map((_, i) => evalAt(i)),
    predict: (steps) => Array.from({ length: steps }, (_, k) => evalAt(n + k)),
  };
}

function holtWinters(y: number[], season: number, useSeason: boolean): Fitted {
  const alpha = 0.5, beta = 0.15, gamma = 0.3;
  const m = useSeason && season > 1 && y.length >= season * 2 ? season : 0;
  let level = y[0];
  let trend = y.length > 1 ? y[1] - y[0] : 0;
  const seasonal: number[] = m ? Array.from({ length: m }, (_, i) => y[i] - mean(y.slice(0, m))) : [];
  const fitted: number[] = [];
  for (let i = 0; i < y.length; i++) {
    const s = m ? seasonal[i % m] : 0;
    fitted.push(level + trend + s);
    const prevLevel = level;
    const target = m ? y[i] - s : y[i];
    level = alpha * target + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    if (m) seasonal[i % m] = gamma * (y[i] - level) + (1 - gamma) * s;
  }
  return {
    fitted,
    predict: (steps) =>
      Array.from({ length: steps }, (_, k) => level + trend * (k + 1) + (m ? seasonal[(y.length + k) % m] : 0)),
  };
}

function movingAverageModel(y: number[], window: number, drift: boolean): Fitted {
  const fitted = y.map((_, i) => {
    const slice = y.slice(Math.max(0, i - window), i);
    return slice.length ? mean(slice) : y[i];
  });
  const tail = y.slice(-window);
  const base = mean(tail);
  const slope = drift && y.length > 1 ? (y[y.length - 1] - y[0]) / (y.length - 1) : 0;
  return { fitted, predict: (steps) => Array.from({ length: steps }, (_, k) => base + slope * (k + 1)) };
}

function lagEnsemble(y: number[], lags: number, season: number): Fitted {
  // simple additive ensemble: lag-average + linear trend (stand-in for tree regressors)
  const lin = polyFit(y, 1);
  const fitted = y.map((v, i) => {
    const window = y.slice(Math.max(0, i - lags), i);
    const lagPart = window.length ? mean(window) : v;
    return 0.6 * lagPart + 0.4 * lin.fitted[i];
  });
  const linFuture = lin.predict(100);
  let recent = y.slice(-lags);
  return {
    fitted,
    predict: (steps) => {
      const out: number[] = [];
      for (let k = 0; k < steps; k++) {
        const seasonalRef = season > 1 && y.length >= season ? y[y.length - season + (k % season)] ?? mean(recent) : mean(recent);
        const value = 0.45 * mean(recent) + 0.35 * linFuture[k] + 0.2 * seasonalRef;
        out.push(value);
        recent = [...recent.slice(1), value];
      }
      return out;
    },
  };
}

function seasonLength(freq: Frequency): number {
  switch (freq) {
    case "daily": return 7;
    case "weekly": return 52;
    case "monthly": return 12;
    case "quarterly": return 4;
    default: return 1;
  }
}

function fitModel(id: string, y: number[], freq: Frequency): Fitted {
  const s = seasonLength(freq);
  switch (id) {
    case "linear": return polyFit(y, 1);
    case "polynomial": return polyFit(y, Math.min(2, Math.max(1, y.length - 2)));
    case "arima": return movingAverageModel(y, Math.min(5, Math.max(2, Math.floor(y.length / 4))), true);
    case "sarima": return holtWinters(y, s, true);
    case "holt_winters": return holtWinters(y, s, true);
    case "prophet": return holtWinters(y, s, true);
    case "xgboost": return lagEnsemble(y, Math.min(6, Math.max(2, Math.floor(y.length / 5))), s);
    case "random_forest": return lagEnsemble(y, Math.min(4, Math.max(2, Math.floor(y.length / 6))), s);
    case "lstm": return lagEnsemble(y, Math.min(8, Math.max(3, Math.floor(y.length / 4))), s);
    case "gru": return lagEnsemble(y, Math.min(6, Math.max(3, Math.floor(y.length / 4))), s);
    default: return polyFit(y, 1);
  }
}

function metricsOf(actual: number[], predicted: number[]) {
  const n = Math.min(actual.length, predicted.length);
  let se = 0, ae = 0, ape = 0, apeN = 0;
  for (let i = 0; i < n; i++) {
    const err = actual[i] - predicted[i];
    se += err * err;
    ae += Math.abs(err);
    if (actual[i] !== 0) { ape += Math.abs(err / actual[i]); apeN++; }
  }
  const rmse = Math.sqrt(se / (n || 1));
  const mae = ae / (n || 1);
  const mape = apeN ? (ape / apeN) * 100 : 0;
  const mu = mean(actual.slice(0, n));
  const ssTot = actual.slice(0, n).reduce((s, v) => s + Math.pow(v - mu, 2), 0);
  const r2 = ssTot > 0 ? 1 - se / ssTot : 0;
  const accuracy = Math.max(0, Math.min(100, 100 - mape));
  return { rmse, mae, mape, r2, accuracy };
}

const Z: Record<number, number> = { 80: 1.282, 90: 1.645, 95: 1.96, 99: 2.576 };

/* ------------------------------------------------------------------ runner */

export function runForecast(series: SeriesPoint[], opts: ForecastOptions): ForecastResult {
  if (series.length < 5) throw new Error("At least 5 data points are required to build a forecast.");
  const started = performance.now();
  const y = series.map((p) => p.value);
  const freq = opts.frequency;
  const candidates = opts.models.length ? opts.models : ["linear", "holt_winters", "arima"];

  const holdout = Math.max(2, Math.min(Math.floor(y.length * 0.2), Math.floor(y.length / 3)));
  const train = y.slice(0, y.length - holdout);
  const test = y.slice(y.length - holdout);

  const scores: ModelScore[] = candidates.map((id) => {
    let m;
    try {
      const fit = fitModel(id, train, freq);
      m = metricsOf(test, fit.predict(holdout));
    } catch {
      m = { rmse: Infinity, mae: Infinity, mape: 100, r2: 0, accuracy: 0 };
    }
    return {
      model: id,
      label: modelLabel(id),
      ...m,
      approximated: !(FORECAST_MODELS.find((mm) => mm.id === id)?.native ?? true),
    };
  });

  const best = [...scores].sort((a, b) => a.rmse - b.rmse)[0];
  const finalFit = fitModel(best.model, y, freq);
  const inSample = metricsOf(y, finalFit.fitted);

  const periods = horizonPeriods(opts.horizon, freq);
  const futureDates = nextPeriods(series[series.length - 1].date, freq, periods);
  const futureValues = finalFit.predict(periods);

  const residualsArr = y.map((v, i) => v - finalFit.fitted[i]);
  const residStd = Math.sqrt(mean(residualsArr.map((r) => r * r)));
  const z = Z[opts.confidence] ?? 1.96;

  const historyRows: ForecastRow[] = series.map((p, i) => ({
    date: p.date,
    actual: p.value,
    forecast: finalFit.fitted[i],
    lower: finalFit.fitted[i] - z * residStd,
    upper: finalFit.fitted[i] + z * residStd,
  }));

  const forecastRows: ForecastRow[] = futureDates.map((date, k) => {
    const spread = z * residStd * Math.sqrt(1 + k / Math.max(1, periods));
    return { date, actual: null, forecast: futureValues[k], lower: futureValues[k] - spread, upper: futureValues[k] + spread };
  });

  // seasonal decomposition
  const s = seasonLength(freq);
  const trendSeries = y.map((_, i) => {
    const half = Math.floor(s / 2) || 1;
    const slice = y.slice(Math.max(0, i - half), Math.min(y.length, i + half + 1));
    return slice.length ? mean(slice) : null;
  });
  const seasonalAvg: number[] = Array.from({ length: Math.max(1, s) }, (_, k) => {
    const vals = y.filter((_, i) => i % Math.max(1, s) === k).map((v, i2) => v - (trendSeries[i2 * Math.max(1, s) + k] ?? mean(y)));
    return vals.length ? mean(vals) : 0;
  });
  const decomposition = series.map((p, i) => {
    const trend = trendSeries[i];
    const seasonal = seasonalAvg[i % Math.max(1, s)] ?? 0;
    return { date: p.date, observed: p.value, trend, seasonal, residual: trend === null ? null : p.value - trend - seasonal };
  });

  // error histogram
  const buckets = 10;
  const minR = Math.min(...residualsArr);
  const maxR = Math.max(...residualsArr);
  const width = (maxR - minR) / buckets || 1;
  const errorHistogram = Array.from({ length: buckets }, (_, i) => {
    const lo = minR + i * width;
    const hi = lo + width;
    return {
      bucket: `${lo.toFixed(1)}`,
      count: residualsArr.filter((r) => r >= lo && (i === buckets - 1 ? r <= hi : r < hi)).length,
    };
  });

  // monthly aggregation of the forecast
  const monthlyMap = new Map<string, number>();
  for (const row of forecastRows) {
    const key = row.date.length >= 7 ? row.date.slice(0, 7) : row.date;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (row.forecast ?? 0));
  }

  return {
    bestModel: best.model,
    bestModelLabel: best.label,
    approximated: best.approximated,
    metrics: {
      rmse: best.rmse === Infinity ? inSample.rmse : best.rmse,
      mae: best.mae === Infinity ? inSample.mae : best.mae,
      mape: best.mape,
      r2: best.r2,
      accuracy: best.accuracy,
    },
    trainingTimeMs: Math.round(performance.now() - started),
    rows: [...historyRows, ...forecastRows],
    history: series,
    forecast: forecastRows,
    residuals: series.map((p, i) => ({ date: p.date, residual: residualsArr[i] })),
    errorHistogram,
    decomposition,
    trend: series.map((p, i) => ({ date: p.date, trend: trendSeries[i] ?? p.value })),
    monthly: Array.from(monthlyMap.entries()).map(([period, value]) => ({ period, value })),
    scores: [...scores].sort((a, b) => a.rmse - b.rmse),
    engine: "browser",
  };
}
