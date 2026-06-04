/**
 * Sample Excel projects yang user hapus — tidak di-reseed oleh ensureSeedProjects().
 * Master Data global tidak terpengaruh.
 */

const DB_NAME = 'manufaktur-bom';
const DB_VERSION = 3;
const STORE = 'master';
const IDB_KEY = 'dismissedSampleKeys_v1';
const LS_KEY = 'bom_dismissed_samples_v1';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGet() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(keys) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(keys, IDB_KEY);
    req.onsuccess = () => resolve(keys);
    req.onerror = () => reject(req.error);
  });
}

function lsGet() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string' && k) : [];
  } catch {
    return [];
  }
}

function lsSet(keys) {
  localStorage.setItem(LS_KEY, JSON.stringify(keys));
}

function normalizeKeys(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter((k) => typeof k === 'string' && k.trim()))];
}

let useFallback = false;

/** @returns {Promise<string[]>} */
export async function getDismissedSampleKeys() {
  if (useFallback) return lsGet();
  try {
    const fromIdb = await idbGet();
    const keys = normalizeKeys(fromIdb);
    lsSet(keys);
    return keys;
  } catch {
    useFallback = true;
    return getDismissedSampleKeys();
  }
}

/** @param {string} sampleKey */
export async function addDismissedSampleKey(sampleKey) {
  if (!sampleKey || typeof sampleKey !== 'string') return;
  const keys = normalizeKeys([...(await getDismissedSampleKeys()), sampleKey]);
  if (useFallback) {
    lsSet(keys);
    return keys;
  }
  try {
    await idbPut(keys);
    lsSet(keys);
    return keys;
  } catch {
    useFallback = true;
    return addDismissedSampleKey(sampleKey);
  }
}

/** @param {string} sampleKey */
export async function isDismissedSampleKey(sampleKey) {
  if (!sampleKey) return false;
  const keys = await getDismissedSampleKeys();
  return keys.includes(sampleKey);
}

export async function clearDismissedSampleKeys() {
  if (useFallback) {
    lsSet([]);
    return [];
  }
  try {
    await idbPut([]);
    lsSet([]);
    return [];
  } catch {
    useFallback = true;
    return clearDismissedSampleKeys();
  }
}
