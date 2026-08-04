const DB_NAME = 'METARH_CACHE_DB';
const STORE_NAME = 'alocados_store';
const CACHE_KEY = 'latest_alocados';
const LOCAL_STORAGE_KEY = 'metarh_alocados_local_cache';

export interface CachedDataPayload {
  data: any[];
  fetchedAt: string;
  source: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalCache(payload: CachedDataPayload): Promise<void> {
  // Try IndexedDB first (supports high capacity > 50MB)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload, CACHE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao salvar no IndexedDB, tentando localStorage:', err);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('localStorage cota excedida:', e);
    }
  }
}

export async function getLocalCache(): Promise<CachedDataPayload | null> {
  // Try IndexedDB first
  try {
    const db = await openDB();
    const result = await new Promise<CachedDataPayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (result && Array.isArray(result.data) && result.data.length >= 100) {
      return result;
    }
  } catch (err) {
    console.warn('IndexedDB indisponível, buscando do localStorage:', err);
  }

  // Fallback to localStorage
  try {
    const str = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (str) {
      const parsed = JSON.parse(str) as CachedDataPayload;
      if (parsed && Array.isArray(parsed.data) && parsed.data.length >= 100) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler do localStorage:', e);
  }

  return null;
}
