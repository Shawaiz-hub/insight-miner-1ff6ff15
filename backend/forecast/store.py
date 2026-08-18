"""Disk persistence for forecast runs (so previous forecasts can be reopened)."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUNS_DIR = os.path.join(BASE_DIR, "runs")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
MODELS_DIR = os.path.join(BASE_DIR, "models")

for path in (RUNS_DIR, UPLOADS_DIR, TEMP_DIR, MODELS_DIR):
    os.makedirs(path, exist_ok=True)


def new_id(prefix: str = "run") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def save_run(payload: dict) -> str:
    run_id = payload.get("runId") or new_id()
    payload["runId"] = run_id
    payload["createdAt"] = datetime.now(timezone.utc).isoformat()
    with open(os.path.join(RUNS_DIR, f"{run_id}.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh)
    return run_id


def load_run(run_id: str) -> dict | None:
    path = os.path.join(RUNS_DIR, f"{os.path.basename(run_id)}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def list_runs(limit: int = 50) -> list[dict]:
    items = []
    for name in os.listdir(RUNS_DIR):
        if not name.endswith(".json"):
            continue
        run = load_run(name[:-5])
        if not run:
            continue
        items.append(
            {
                "runId": run.get("runId"),
                "createdAt": run.get("createdAt"),
                "datasetName": run.get("datasetName"),
                "user": run.get("user"),
                "bestModel": run.get("bestModel"),
                "bestModelLabel": run.get("bestModelLabel"),
                "metrics": run.get("metrics"),
            }
        )
    items.sort(key=lambda r: r.get("createdAt") or "", reverse=True)
    return items[:limit]


def save_upload(filename: str, content: bytes) -> str:
    upload_id = new_id("upload")
    ext = os.path.splitext(filename or "")[1] or ".csv"
    with open(os.path.join(UPLOADS_DIR, f"{upload_id}{ext}"), "wb") as fh:
        fh.write(content)
    return upload_id


def find_upload(upload_id: str) -> str | None:
    safe = os.path.basename(upload_id)
    for name in os.listdir(UPLOADS_DIR):
        if name.startswith(safe):
            return os.path.join(UPLOADS_DIR, name)
    return None
