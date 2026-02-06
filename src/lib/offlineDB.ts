/**
 * IndexedDB Cache for offline support
 * Stores History and Saved Rules data locally
 */

const DB_NAME = "smartmine_offline";
const DB_VERSION = 1;
const STORES = {
  HISTORY: "mining_history",
  SAVED_RULES: "saved_rules",
};

type StoreNames = typeof STORES[keyof typeof STORES];

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
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          db.createObjectStore(STORES.HISTORY, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.SAVED_RULES)) {
          db.createObjectStore(STORES.SAVED_RULES, { keyPath: "id" });
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

  async saveHistory(items: any[]): Promise<void> {
    const store = await this.getStore(STORES.HISTORY, "readwrite");
    
    // Clear existing data
    store.clear();
    
    // Add new items
    for (const item of items) {
      store.add(item);
    }

    return new Promise((resolve, reject) => {
      const transaction = (store as any).transaction;
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getHistory(): Promise<any[]> {
    const store = await this.getStore(STORES.HISTORY);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSavedRules(items: any[]): Promise<void> {
    const store = await this.getStore(STORES.SAVED_RULES, "readwrite");
    
    // Clear existing data
    store.clear();
    
    // Add new items
    for (const item of items) {
      store.add(item);
    }

    return new Promise((resolve, reject) => {
      const transaction = (store as any).transaction;
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSavedRules(): Promise<any[]> {
    const store = await this.getStore(STORES.SAVED_RULES);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    for (const storeName of Object.values(STORES)) {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.clear();
    }
  }
}

export const offlineDB = new OfflineDB();
