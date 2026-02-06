import { useEffect, useCallback } from "react";
import { offlineDB } from "@/lib/offlineDB";

/**
 * Hook to sync data between online source and offline cache
 * Automatically caches data when fetched and restores from cache when offline
 */
export function useOfflineCache() {
  const cacheHistory = useCallback(async (items: any[]) => {
    try {
      await offlineDB.saveHistory(items);
    } catch (err) {
      console.warn("Failed to cache history:", err);
    }
  }, []);

  const cacheSavedRules = useCallback(async (items: any[]) => {
    try {
      await offlineDB.saveSavedRules(items);
    } catch (err) {
      console.warn("Failed to cache saved rules:", err);
    }
  }, []);

  const getCachedHistory = useCallback(async () => {
    try {
      return await offlineDB.getHistory();
    } catch (err) {
      console.warn("Failed to retrieve cached history:", err);
      return [];
    }
  }, []);

  const getCachedSavedRules = useCallback(async () => {
    try {
      return await offlineDB.getSavedRules();
    } catch (err) {
      console.warn("Failed to retrieve cached saved rules:", err);
      return [];
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await offlineDB.clearAll();
    } catch (err) {
      console.warn("Failed to clear cache:", err);
    }
  }, []);

  return {
    cacheHistory,
    cacheSavedRules,
    getCachedHistory,
    getCachedSavedRules,
    clearCache,
  };
}
