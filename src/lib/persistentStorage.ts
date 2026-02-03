/**
 * Persistent storage adapter for Supabase Auth
 * Uses IndexedDB as primary storage (more persistent on iOS PWAs)
 * Falls back to localStorage if IndexedDB is unavailable
 */

const DB_NAME = 'hoop-journal-auth';
const STORE_NAME = 'auth-storage';
const DB_VERSION = 1;

// Legacy keys to clean up (from before custom storageKey was set)
const LEGACY_KEYS = [
  'sb-jwoupnumuotmwpwrkmob-auth-token',
  'supabase.auth.token',
];

let db: IDBDatabase | null = null;
let dbReady: Promise<IDBDatabase | null>;

// Clean up legacy auth tokens that might be stale
function cleanupLegacyTokens(): void {
  try {
    LEGACY_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase | null> {
  // Clean up any legacy tokens first
  cleanupLegacyTokens();
  
  return new Promise((resolve) => {
    try {
      if (!window.indexedDB) {
        console.log('IndexedDB not available, using localStorage');
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('IndexedDB open failed, falling back to localStorage');
        resolve(null);
      };

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
    } catch (error) {
      console.warn('IndexedDB initialization error:', error);
      resolve(null);
    }
  });
}

// Ensure DB is ready
dbReady = initDB();

async function getFromIDB(key: string): Promise<string | null> {
  const database = await dbReady;
  if (!database) return null;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        console.warn('IndexedDB get error');
        resolve(null);
      };
    } catch (error) {
      console.warn('IndexedDB get transaction error:', error);
      resolve(null);
    }
  });
}

async function setInIDB(key: string, value: string): Promise<void> {
  const database = await dbReady;
  if (!database) return;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(value, key);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.warn('IndexedDB set error');
        resolve();
      };
    } catch (error) {
      console.warn('IndexedDB set transaction error:', error);
      resolve();
    }
  });
}

async function removeFromIDB(key: string): Promise<void> {
  const database = await dbReady;
  if (!database) return;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.warn('IndexedDB remove error');
        resolve();
      };
    } catch (error) {
      console.warn('IndexedDB remove transaction error:', error);
      resolve();
    }
  });
}

/**
 * Custom storage adapter for Supabase Auth
 * Syncs between IndexedDB (persistent) and localStorage (fast access)
 */
export const persistentStorage = {
  async getItem(key: string): Promise<string | null> {
    // Try IndexedDB first (more persistent on iOS)
    const idbValue = await getFromIDB(key);
    if (idbValue !== null) {
      // Sync to localStorage for faster subsequent reads
      try {
        localStorage.setItem(key, idbValue);
      } catch (e) {
        // localStorage might be full or unavailable
      }
      return idbValue;
    }

    // Fallback to localStorage
    const lsValue = localStorage.getItem(key);
    if (lsValue !== null) {
      // Sync back to IndexedDB
      await setInIDB(key, lsValue);
    }
    return lsValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    // Write to both for redundancy
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // localStorage might be full or unavailable
    }
    await setInIDB(key, value);
  },

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore errors
    }
    await removeFromIDB(key);
  },
};
