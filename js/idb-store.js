// Lightweight Promise wrapper around IndexedDB ('beerdex_db' / store 'kv')
// Falls back cleanly (null / false) when IDB is unavailable or blocked.

const DB_NAME = 'beerdex_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

let _dbPromise = null;

export function isIdbAvailable() {
    try {
        return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
        return false;
    }
}

function _openDb() {
    if (!isIdbAvailable()) return Promise.resolve(null);
    if (_dbPromise) return _dbPromise;

    _dbPromise = new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = (e) => {
                const db = e.target.result;
                db.onversionchange = () => {
                    db.close();
                    _dbPromise = null;
                };
                resolve(db);
            };
            req.onerror = () => {
                _dbPromise = null;
                resolve(null);
            };
            req.onblocked = () => resolve(null);
        } catch {
            _dbPromise = null;
            resolve(null);
        }
    });

    return _dbPromise;
}

export async function idbGet(key) {
    const db = await _openDb();
    if (!db) return undefined;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
        } catch {
            resolve(undefined);
        }
    });
}

export async function idbSet(key, value) {
    const db = await _openDb();
    if (!db) return false;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).put(value, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
}

export async function idbDelete(key) {
    const db = await _openDb();
    if (!db) return false;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        } catch {
            resolve(false);
        }
    });
}

export async function idbGetMany(keys) {
    const out = {};
    const db = await _openDb();
    if (!db || !Array.isArray(keys) || keys.length === 0) return out;
    await Promise.all(keys.map(async (k) => {
        const val = await idbGet(k);
        if (val !== undefined) out[k] = val;
    }));
    return out;
}

export async function idbGetAllEntries() {
    const db = await _openDb();
    if (!db) return [];
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const entries = [];
            const req = store.openCursor();
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    entries.push([cursor.key, cursor.value]);
                    cursor.continue();
                } else {
                    resolve(entries);
                }
            };
            req.onerror = () => resolve(entries);
        } catch {
            resolve([]);
        }
    });
}
