import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkBackendHealthWithRetry,
  type BackendStatus,
  type HealthResult,
} from "@/config/api";

interface UseBackendHealthOptions {
  /** Base URL to probe. Defaults to the resolved API base. */
  baseUrl?: string;
  /** Total attempts before flipping to disconnected. */
  attempts?: number;
  /** Auto-probe on mount / when the URL changes. */
  auto?: boolean;
}

/**
 * Backend health with exponential-backoff retries: the status stays "checking"
 * while retries are in flight and only becomes "disconnected" once every
 * attempt has failed.
 */
export function useBackendHealth({ baseUrl, attempts = 4, auto = true }: UseBackendHealthOptions = {}) {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [corsSuspected, setCorsSuspected] = useState(false);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const runId = useRef(0);

  const retry = useCallback(async () => {
    const id = ++runId.current;
    setStatus("checking");
    setAttempt(0);
    setLastError(null);
    setCorsSuspected(false);

    const result = await checkBackendHealthWithRetry(baseUrl, {
      attempts,
      onAttempt: (n: number, _total: number, r: HealthResult) => {
        if (id !== runId.current) return;
        setAttempt(n);
        if (r.status === "disconnected") setLastError(r.error ?? null);
      },
    });

    if (id !== runId.current) return result;
    setStatus(result.status);
    setLastError(result.status === "connected" ? null : result.error ?? null);
    setCorsSuspected(Boolean(result.corsSuspected) && result.status !== "connected");
    setPayload(result.payload ?? null);
    return result;
  }, [attempts, baseUrl]);

  useEffect(() => {
    if (auto) void retry();
  }, [auto, retry]);

  return { status, attempt, attempts, lastError, corsSuspected, payload, retry };
}
