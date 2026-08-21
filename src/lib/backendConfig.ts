import { supabase } from "@/integrations/supabase/client";
import {
  setBackendOverrides,
  getApiBase,
  getForecastApiBase,
  normalize,
} from "@/config/api";

export interface BackendConfig {
  apiBaseUrl: string;
  forecastApiUrl: string;
}

export const BACKEND_CONFIG_KEY = "backend_config";

let loaded: Promise<BackendConfig> | null = null;

/** Load the admin-defined backend endpoints and apply them app-wide. */
export function loadBackendConfig(force = false): Promise<BackendConfig> {
  if (!loaded || force) {
    loaded = supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", BACKEND_CONFIG_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const value = (data?.setting_value as unknown as Partial<BackendConfig>) || {};
        const config: BackendConfig = {
          apiBaseUrl: normalize(value.apiBaseUrl || ""),
          forecastApiUrl: normalize(value.forecastApiUrl || ""),
        };
        setBackendOverrides(config);
        return config;
      })
      .catch(() => ({ apiBaseUrl: "", forecastApiUrl: "" }));
  }
  return loaded;
}

/** Persist new endpoints (admin only) and apply them immediately. */
export async function saveBackendConfig(config: BackendConfig) {
  const clean: BackendConfig = {
    apiBaseUrl: normalize(config.apiBaseUrl),
    forecastApiUrl: normalize(config.forecastApiUrl),
  };
  const { error } = await supabase.from("site_settings").upsert(
    {
      setting_key: BACKEND_CONFIG_KEY,
      setting_value: clean as unknown as Record<string, string>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );
  if (error) throw error;
  setBackendOverrides(clean);
  loaded = Promise.resolve(clean);
  return clean;
}

export function resolvedEndpoints() {
  return { apiBase: getApiBase(), forecastBase: getForecastApiBase() };
}
