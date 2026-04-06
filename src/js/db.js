/**
 * ChitraVithika — IndexedDB Module
 *
 * Provides a Promise-based abstraction over IndexedDB for caching:
 * - Decrypted image Blobs (keyed by item ID)
 * - Search index state
 *
 * API:
 *   import { db } from './db.js';
 *   await db.open();
 *   await db.putBlob(itemId, blob);
 *   const blob = await db.getBlob(itemId);
 *   await db.deleteBlob(itemId);
 */

const DB_NAME = 'chitravithika';
const DB_VERSION = 1;

/** Object store names */
const STORE_IMAGES = 'images';
const STORE_META = 'meta';

let _db = null;

/**
 * Opens (or reuses) the IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
function open() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                const store = db.createObjectStore(STORE_IMAGES, { keyPath: 'itemId' });
                store.createIndex('cachedAt', 'cachedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            _db = event.target.result;

            // Handle unexpected close (e.g. version update from another tab)
            _db.onversionchange = () => {
                _db.close();
                _db = null;
            };

            resolve(_db);
        };

        request.onerror = () => reject(request.error);
        request.onblocked = () => console.warn('[db] IDB upgrade blocked by another tab');
    });
}

/**
 * Wraps an IDBRequest in a Promise.
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
function promisify(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Gets a read-write transaction on the given store.
 * @param {string}   storeName
 * @param {'readonly'|'readwrite'} mode
 * @returns {IDBObjectStore}
 */
async function getStore(storeName, mode = 'readonly') {
    const db = await open();
    return db.transaction(storeName, mode).objectStore(storeName);
}

// ─────────────────────────────────────────────────────────────
// IMAGE CACHE API
// ─────────────────────────────────────────────────────────────

/**
 * Store a decrypted Blob associated with a catalog item.
 * @param {number} itemId
 * @param {Blob}   blob
 */
async function putBlob(itemId, blob) {
    const store = await getStore(STORE_IMAGES, 'readwrite');
    await promisify(store.put({
        itemId,
        blob,
        cachedAt: Date.now(),
        size: blob.size,
        mimeType: blob.type,
    }));
}

/**
 * Retrieve a cached Blob for a catalog item.
 * @param {number} itemId
 * @returns {Promise<Blob|null>}
 */
async function getBlob(itemId) {
    const store = await getStore(STORE_IMAGES, 'readonly');
    const record = await promisify(store.get(itemId));
    return record ? record.blob : null;
}

/**
 * Delete a cached Blob.
 * @param {number} itemId
 */
async function deleteBlob(itemId) {
    const store = await getStore(STORE_IMAGES, 'readwrite');
    await promisify(store.delete(itemId));
}

/**
 * Check if an item is cached.
 * @param {number} itemId
 * @returns {Promise<boolean>}
 */
async function hasBlob(itemId) {
    const store = await getStore(STORE_IMAGES, 'readonly');
    const key = await promisify(store.getKey(itemId));
    return key !== undefined;
}

/**
 * Evict old cache entries. Keeps the N most recent.
 * @param {number} maxEntries - max number of cached images
 */
async function evictOldest(maxEntries = 20) {
    const store = await getStore(STORE_IMAGES, 'readwrite');
    const index = store.index('cachedAt');
    const records = await promisify(index.getAll());

    if (records.length <= maxEntries) return;

    // Sort ascending by cachedAt — delete oldest first
    records.sort((a, b) => a.cachedAt - b.cachedAt);
    const toDelete = records.slice(0, records.length - maxEntries);

    const delStore = await getStore(STORE_IMAGES, 'readwrite');
    for (const record of toDelete) {
        await promisify(delStore.delete(record.itemId));
    }

    console.log(`[db] Evicted ${toDelete.length} old cache entries`);
}

// ─────────────────────────────────────────────────────────────
// META STORE API
// ─────────────────────────────────────────────────────────────

/**
 * Store arbitrary metadata (key-value).
 * @param {string} key
 * @param {*}      value
 */
async function setMeta(key, value) {
    const store = await getStore(STORE_META, 'readwrite');
    await promisify(store.put({ key, value, updatedAt: Date.now() }));
}

/**
 * Retrieve stored metadata.
 * @param {string} key
 * @returns {Promise<*|null>}
 */
async function getMeta(key) {
    const store = await getStore(STORE_META, 'readonly');
    const record = await promisify(store.get(key));
    return record ? record.value : null;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

export const db = {
    open,
    putBlob,
    getBlob,
    deleteBlob,
    hasBlob,
    evictOldest,
    setMeta,
    getMeta,
};
