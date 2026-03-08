/**
 * IndexedDB Hybrid Database for offline + cloud sync
 * Mirrors all Supabase tables locally for full offline support
 */

const DB_NAME = "smartmine_hybrid";
const DB_VERSION = 2;
const STORES = {
  HISTORY: "mining_history",
  SAVED_RULES: "saved_rules",
  MINING_RESULTS: "mining_results",
  PROFILES: "profiles",
  PENDING_SYNC: "pending_sync",
};

type StoreNames = typeof STORES[keyof typeof STORES];

export interface PendingSyncItem {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: any;
  created_at: string;
}

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        for (const storeName of Object.values(STORES)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: "id" });
            if (storeName === STORES.PENDING_SYNC) {
              store.createIndex("table", "table", { unique: false });
            }
            if (storeName === STORES.HISTORY || storeName === STORES.SAVED_RULES) {
              store.createIndex("created_at", "created_at", { unique: false });
            }
          }
        }
      };
    });
  }

  private async getStore(
    storeName: StoreNames,
    mode: IDBTransactionMode = "readonly"
  ): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    const transaction = this.db!.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic CRUD operations
  async saveAll(storeName: StoreNames, items: any[]): Promise<void> {
    const store = await this.getStore(storeName, "readwrite");
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    return new Promise((resolve, reject) => {
      const tx = (store as any).transaction;
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll(storeName: StoreNames): Promise<any[]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName: StoreNames, item: any): Promise<void> {
    const store = await this.getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async remove(storeName: StoreNames, id: string): Promise<void> {
    const store = await this.getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Convenience methods for each table
  async saveHistory(items: any[]) { return this.saveAll(STORES.HISTORY, items); }
  async getHistory() { return this.getAll(STORES.HISTORY); }
  async putHistory(item: any) { return this.put(STORES.HISTORY, item); }
  async removeHistory(id: string) { return this.remove(STORES.HISTORY, id); }

  async saveSavedRules(items: any[]) { return this.saveAll(STORES.SAVED_RULES, items); }
  async getSavedRules() { return this.getAll(STORES.SAVED_RULES); }
  async putSavedRule(item: any) { return this.put(STORES.SAVED_RULES, item); }
  async removeSavedRule(id: string) { return this.remove(STORES.SAVED_RULES, id); }

  async saveMiningResults(items: any[]) { return this.saveAll(STORES.MINING_RESULTS, items); }
  async getMiningResults() { return this.getAll(STORES.MINING_RESULTS); }
  async putMiningResult(item: any) { return this.put(STORES.MINING_RESULTS, item); }

  async saveProfile(profile: any) { return this.put(STORES.PROFILES, profile); }
  async getProfile() {
    const profiles = await this.getAll(STORES.PROFILES);
    return profiles[0] || null;
  }

  // Pending sync queue for offline mutations
  async addPendingSync(item: PendingSyncItem) { return this.put(STORES.PENDING_SYNC, item); }
  async getPendingSync(): Promise<PendingSyncItem[]> { return this.getAll(STORES.PENDING_SYNC); }
  async removePendingSync(id: string) { return this.remove(STORES.PENDING_SYNC, id); }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    for (const storeName of Object.values(STORES)) {
      const transaction = this.db!.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).clear();
    }
  }
}

export const offlineDB = new OfflineDB();
export { STORES };
