/**
 * SmartMine Forecasting — shared types and dataset helpers
 * -------------------------------------------------------
 * File parsing, column detection, period helpers and local series building used
 * for previews and mapping only. All forecasting (Linear, Polynomial, ARIMA,
 * SARIMA, Holt-Winters, Prophet, Random Forest, XGBoost, LSTM, GRU) is executed
 * by the Python FastAPI microservice in backend/forecast.
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

/* ------------------------------------------------------------------ runner */
// Model training, metrics and confidence intervals are produced exclusively by the
// Python FastAPI forecasting microservice — see src/lib/forecastApi.ts.

