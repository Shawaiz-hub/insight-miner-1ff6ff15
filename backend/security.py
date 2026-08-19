"""
Authentication, per-user session isolation and rate limiting for the Flask
data-mining backend.

Every API request (except health) must carry a Supabase access token:

    Authorization: Bearer <supabase access token>

The token is verified against the Supabase Auth API (`/auth/v1/user`) and the
resulting user id becomes the key for that request's isolated workspace, so
one user can never read or overwrite another user's dataset.

Optional service-to-service access is possible with a shared secret in
`BACKEND_API_KEY` (header `X-API-Key`), which maps to its own workspace.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request

from flask import g, jsonify, request

logger = logging.getLogger("smartmine.security")

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or ""
BACKEND_API_KEY = os.environ.get("BACKEND_API_KEY") or ""
# Only for local development: allows anonymous access to the API.
ALLOW_ANONYMOUS = os.environ.get("ALLOW_ANONYMOUS", "").lower() in ("1", "true", "yes")

PUBLIC_PATHS = {"/api/health", "/health", "/api/algorithms"}

# --------------------------------------------------------------- token cache
_TOKEN_TTL = 300  # seconds
_token_cache: dict[str, tuple[float, str]] = {}
_cache_lock = threading.Lock()


def _cache_key(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _verify_supabase_token(token: str) -> str | None:
    """Return the Supabase user id for a valid token, else None."""
    if not (SUPABASE_URL and SUPABASE_ANON_KEY):
        return None

    key = _cache_key(token)
    now = time.time()
    with _cache_lock:
        hit = _token_cache.get(key)
        if hit and hit[0] > now:
            return hit[1]

    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        logger.info("Token rejected by auth provider (HTTP %s)", exc.code)
        return None
    except Exception as exc:  # network/timeout — never log the token
        logger.warning("Auth verification unavailable: %s", type(exc).__name__)
        return None

    user_id = payload.get("id")
    if not user_id:
        return None
    with _cache_lock:
        _token_cache[key] = (now + _TOKEN_TTL, user_id)
    return user_id


# ------------------------------------------------------------- rate limiting
_RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "60"))
_hits: dict[str, list[float]] = {}
_hits_lock = threading.Lock()


def _rate_limited(identity: str) -> bool:
    if _RATE_LIMIT <= 0:
        return False
    now = time.time()
    with _hits_lock:
        bucket = [t for t in _hits.get(identity, []) if now - t < 60]
        if len(bucket) >= _RATE_LIMIT:
            _hits[identity] = bucket
            return True
        bucket.append(now)
        _hits[identity] = bucket
    return False


# ---------------------------------------------------------------- workspaces
def workspace_id() -> str:
    """Isolated workspace key for the current request."""
    return getattr(g, "workspace_id", "anonymous")


def session_dir(base_dir: str) -> str:
    """Per-user directory inside `base_dir`, created on demand."""
    safe = hashlib.sha256(workspace_id().encode("utf-8")).hexdigest()[:24]
    path = os.path.join(base_dir, safe)
    os.makedirs(path, exist_ok=True)
    return path


def install(app, *, public_paths: set[str] | None = None) -> None:
    """Attach the auth + rate-limit guard to a Flask app."""
    allowed = PUBLIC_PATHS | (public_paths or set())

    @app.before_request
    def _guard():  # noqa: ANN202
        if request.method == "OPTIONS":
            return None
        path = request.path.rstrip("/") or "/"
        if path in allowed or path == "/":
            g.workspace_id = "public"
            return None

        api_key = request.headers.get("X-API-Key", "")
        if BACKEND_API_KEY and api_key and api_key == BACKEND_API_KEY:
            g.workspace_id = "service"
        else:
            auth = request.headers.get("Authorization", "")
            token = auth[7:].strip() if auth[:7].lower() == "bearer " else ""
            user_id = _verify_supabase_token(token) if token else None
            if user_id:
                g.workspace_id = f"user:{user_id}"
            elif ALLOW_ANONYMOUS:
                g.workspace_id = "local-dev"
            else:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Authentication required. Sign in and send your access token as 'Authorization: Bearer <token>'.",
                            "code": "UNAUTHENTICATED",
                        }
                    ),
                    401,
                )

        identity = g.workspace_id if g.workspace_id != "local-dev" else (request.remote_addr or "local")
        if _rate_limited(identity):
            return (
                jsonify({"success": False, "error": "Rate limit exceeded. Try again shortly.", "code": "RATE_LIMITED"}),
                429,
            )
        return None
