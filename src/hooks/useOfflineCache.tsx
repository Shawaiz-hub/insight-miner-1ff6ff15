import { useCallback } from "react";
import { offlineDB, STORES } from "@/lib/offlineDB";
import type { PendingSyncItem } from "@/lib/offlineDB";
import { supabase } from "@/integrations/supabase/client";
import { useOnline } from "./useOnline";

/**
 * Hybrid cache hook — mirrors cloud data locally and syncs offline mutations
 */
export function useOfflineCache() {
  const isOnline = useOnline();

  // History
  const cacheHistory = useCallback(async (items: any[]) => {
    try { await offlineDB.saveHistory(items); } catch (e) { console.warn("Cache history failed:", e); }
  }, []);
  const getCachedHistory = useCallback(async () => {
    try { return await offlineDB.getHistory(); } catch { return []; }
  }, []);

  // Saved Rules
  const cacheSavedRules = useCallback(async (items: any[]) => {
    try { await offlineDB.saveSavedRules(items); } catch (e) { console.warn("Cache rules failed:", e); }
  }, []);
  const getCachedSavedRules = useCallback(async () => {
    try { return await offlineDB.getSavedRules(); } catch { return []; }
  }, []);

  // Mining Results
  const cacheMiningResults = useCallback(async (items: any[]) => {
    try { await offlineDB.saveMiningResults(items); } catch (e) { console.warn("Cache results failed:", e); }
  }, []);
  const getCachedMiningResults = useCallback(async () => {
    try { return await offlineDB.getMiningResults(); } catch { return []; }
  }, []);

  // Profile
  const cacheProfile = useCallback(async (profile: any) => {
    try { await offlineDB.saveProfile(profile); } catch (e) { console.warn("Cache profile failed:", e); }
  }, []);
  const getCachedProfile = useCallback(async () => {
    try { return await offlineDB.getProfile(); } catch { return null; }
  }, []);

  // Offline mutation queue
  const queueOfflineMutation = useCallback(async (
    table: string,
    operation: "insert" | "update" | "delete",
    data: any
  ) => {
    const syncItem: PendingSyncItem = {
      id: crypto.randomUUID(),
      table,
      operation,
      data,
      created_at: new Date().toISOString(),
    };
    await offlineDB.addPendingSync(syncItem);

    // Also apply locally
    if (operation === "delete") {
      if (table === "mining_history") await offlineDB.removeHistory(data.id);
      if (table === "saved_rules") await offlineDB.removeSavedRule(data.id);
    } else if (operation === "insert") {
      if (table === "mining_history") await offlineDB.putHistory(data);
      if (table === "saved_rules") await offlineDB.putSavedRule(data);
      if (table === "mining_results") await offlineDB.putMiningResult(data);
    }
  }, []);

  // Sync pending mutations when back online
  const syncPendingMutations = useCallback(async () => {
    if (!isOnline) return;

    const pending = await offlineDB.getPendingSync();
    if (pending.length === 0) return;

    for (const item of pending) {
      try {
        const table = item.table as "mining_history" | "saved_rules" | "mining_results";
        if (item.operation === "insert") {
          await supabase.from(table).insert(item.data);
        } else if (item.operation === "delete") {
          await supabase.from(table).delete().eq("id", item.data.id);
        } else if (item.operation === "update") {
          const { id, ...updateData } = item.data;
          await supabase.from(table).update(updateData).eq("id", id);
        }
        await offlineDB.removePendingSync(item.id);
      } catch (err) {
        console.warn("Sync failed for item:", item.id, err);
      }
    }
  }, [isOnline]);

  const clearCache = useCallback(async () => {
    try { await offlineDB.clearAll(); } catch (e) { console.warn("Clear cache failed:", e); }
  }, []);

  return {
    cacheHistory,
    getCachedHistory,
    cacheSavedRules,
    getCachedSavedRules,
    cacheMiningResults,
    getCachedMiningResults,
    cacheProfile,
    getCachedProfile,
    queueOfflineMutation,
    syncPendingMutations,
    clearCache,
  };
}
