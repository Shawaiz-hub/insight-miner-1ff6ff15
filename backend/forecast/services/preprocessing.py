"""Dataset parsing, cleaning and time-series aggregation."""
from __future__ import annotations

import io
import json
from typing import Any

import numpy as np
import pandas as pd

FREQ_SEASON = {"daily": 7, "weekly": 52, "monthly": 12, "quarterly": 4, "yearly": 1}


def season_length(frequency: str) -> int:
    return FREQ_SEASON.get(str(frequency).lower(), 1)


# ----------------------------------------------------------------- file input
def read_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    name = (filename or "").lower()
    if name.endswith(".json"):
        payload = json.loads(content.decode("utf-8"))
        if isinstance(payload, dict):
            payload = payload.get("data", [])
        return pd.DataFrame(payload)
    if name.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    return pd.read_csv(io.BytesIO(content))


def detect_type(series: pd.Series) -> str:
    sample = series.dropna()
    if sample.empty:
        return "text"
    if pd.api.types.is_numeric_dtype(sample):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(sample):
        return "date"
    head = sample.astype(str).head(40)
    numeric = pd.to_numeric(head.str.replace(r"[,$%\s]", "", regex=True), errors="coerce").notna().mean()
    if numeric > 0.8:
        return "number"
    dates = pd.to_datetime(head, errors="coerce", format="mixed").notna().mean()
    if dates > 0.8:
        return "date"
    return "text"


def describe_columns(df: pd.DataFrame) -> list[dict[str, Any]]:
    out = []
    for col in df.columns:
        s = df[col]
        first = s.dropna()
        out.append(
            {
                "name": str(col),
                "type": detect_type(s),
                "sample": "—" if first.empty else str(first.iloc[0]),
                "missing": int(s.isna().sum()),
            }
        )
    return out


def preview_rows(df: pd.DataFrame, limit: int = 10) -> list[dict[str, Any]]:
    head = df.head(limit).copy()
    for col in head.columns:
        if pd.api.types.is_datetime64_any_dtype(head[col]):
            head[col] = head[col].dt.strftime("%Y-%m-%d")
    return json.loads(head.to_json(orient="records", date_format="iso"))


# ------------------------------------------------------------------- cleaning
def period_key(ts: pd.Timestamp, frequency: str) -> str:
    freq = str(frequency).lower()
    if freq == "yearly":
        return f"{ts.year}"
    if freq == "quarterly":
        return f"{ts.year}-Q{(ts.month - 1) // 3 + 1}"
    if freq == "monthly":
        return f"{ts.year}-{ts.month:02d}"
    if freq == "weekly":
        return (ts - pd.Timedelta(days=int(ts.weekday()))).strftime("%Y-%m-%d")
    return ts.strftime("%Y-%m-%d")


def next_periods(last: str, frequency: str, count: int) -> list[str]:
    freq = str(frequency).lower()
    out: list[str] = []
    if freq == "yearly":
        year = int(last)
        return [str(year + i) for i in range(1, count + 1)]
    if freq == "quarterly":
        y, q = last.split("-Q")
        y, q = int(y), int(q)
        for _ in range(count):
            q += 1
            if q > 4:
                q, y = 1, y + 1
            out.append(f"{y}-Q{q}")
        return out
    if freq == "monthly":
        y, m = last.split("-")
        y, m = int(y), int(m)
        for _ in range(count):
            m += 1
            if m > 12:
                m, y = 1, y + 1
            out.append(f"{y}-{m:02d}")
        return out
    step = 7 if freq == "weekly" else 1
    base = pd.Timestamp(last)
    for i in range(1, count + 1):
        out.append((base + pd.Timedelta(days=step * i)).strftime("%Y-%m-%d"))
    return out


def period_to_timestamp(period: str, frequency: str) -> pd.Timestamp:
    freq = str(frequency).lower()
    if freq == "yearly":
        return pd.Timestamp(year=int(period), month=1, day=1)
    if freq == "quarterly":
        y, q = period.split("-Q")
        return pd.Timestamp(year=int(y), month=(int(q) - 1) * 3 + 1, day=1)
    if freq == "monthly":
        y, m = period.split("-")
        return pd.Timestamp(year=int(y), month=int(m), day=1)
    return pd.Timestamp(period)


def build_series(
    df: pd.DataFrame,
    date_column: str,
    target_column: str,
    frequency: str,
    cleaning: dict[str, bool] | None = None,
    category_column: str | None = None,
    category: str | None = None,
    region_column: str | None = None,
    region: str | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    cleaning = cleaning or {}
    stats = {
        "originalRows": int(len(df)),
        "finalRows": 0,
        "missingRemoved": 0,
        "missingFilled": 0,
        "duplicatesRemoved": 0,
        "outliersDetected": 0,
        "normalized": bool(cleaning.get("normalize")),
        "smoothed": bool(cleaning.get("smooth")),
    }

    work = df.copy()
    if date_column not in work.columns or target_column not in work.columns:
        raise ValueError("Date column and target column must exist in the dataset.")

    def _filter(col: str | None, value: str | None):
        nonlocal work
        if col and value and value not in ("__all__", "") and col in work.columns:
            work = work[work[col].astype(str) == str(value)]

    _filter(category_column, category)
    _filter(region_column, region)

    if cleaning.get("removeDuplicates"):
        before = len(work)
        work = work.drop_duplicates()
        stats["duplicatesRemoved"] = int(before - len(work))

    dates = pd.to_datetime(work[date_column], errors="coerce", format="mixed")
    values = pd.to_numeric(
        work[target_column].astype(str).str.replace(r"[,$%\s]", "", regex=True), errors="coerce"
    )
    frame = pd.DataFrame({"date": dates, "value": values}).sort_values("date")

    bad_dates = int(frame["date"].isna().sum())
    frame = frame[frame["date"].notna()]
    stats["missingRemoved"] += bad_dates

    missing = int(frame["value"].isna().sum())
    if cleaning.get("removeMissing") or not cleaning.get("fillMissing"):
        frame = frame[frame["value"].notna()]
        stats["missingRemoved"] += missing
    else:
        frame["value"] = frame["value"].ffill().bfill()
        frame = frame[frame["value"].notna()]
        stats["missingFilled"] += missing

    if frame.empty:
        raise ValueError("No usable rows after cleaning — check the selected columns.")

    frame["period"] = frame["date"].apply(lambda d: period_key(d, frequency))
    grouped = frame.groupby("period", as_index=False)["value"].sum().sort_values("period")
    series = grouped.reset_index(drop=True)

    if cleaning.get("detectOutliers") and len(series) > 5:
        q1, q3 = series["value"].quantile([0.25, 0.75])
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outliers = int(((series["value"] < lo) | (series["value"] > hi)).sum())
        stats["outliersDetected"] = outliers
        series["value"] = series["value"].clip(lower=lo, upper=hi)

    if cleaning.get("smooth") and len(series) > 4:
        series["value"] = series["value"].rolling(window=3, min_periods=1).mean()

    if cleaning.get("normalize") and len(series) > 1:
        vmin, vmax = float(series["value"].min()), float(series["value"].max())
        if vmax > vmin:
            series["value"] = (series["value"] - vmin) / (vmax - vmin)

    stats["finalRows"] = int(len(series))
    points = [
        {"date": str(r.period), "value": float(r.value)}
        for r in series.itertuples()
        if np.isfinite(r.value)
    ]
    return points, stats


def horizon_periods(days: int, frequency: str) -> int:
    freq = str(frequency).lower()
    if freq == "weekly":
        return max(2, round(days / 7))
    if freq == "monthly":
        return max(2, round(days / 30))
    if freq == "quarterly":
        return max(2, round(days / 91))
    if freq == "yearly":
        return max(1, round(days / 365))
    return max(2, int(days))
