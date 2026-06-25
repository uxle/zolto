/**
 * js/storage.js
 * Zolto v8.1.0 — Document Persistence Layer
 *
 * Provides IndexedDB-backed storage for Zolto documents,
 * with a localStorage fallback and an in-memory emergency mode.
 *
 * Design decisions:
 *  - Documents are stored as plain text (.zl source) + metadata JSON.
 *    The AST is never persisted — always re-derived from source.
 *  - IndexedDB is the primary backend (async, large capacity).
 *  - localStorage is the fallback (sync, 5 MB limit).
 *  - Auto-save fires 2 s after last edit via debounce.
 *  - All public methods return Promises for uniform async usage.
 */

'use strict';

import { createLogger }              from './utils/logger.js';
import { debounce }                  from './utils/debounce.js';
import { uuid, formatDate, today }   from './utils/helpers.js';
import { bus, EVENTS }               from './utils/events.js';
import { toastSuccess, toastError }  from './utils/events.js';
import { get as stateGet, markSaved, patch } from './state.js';

const logger = createLogger('Storage');

// ─────────────────────────────────────────────────────────────
// 1. Constants
// ─────────────────────────────────────────────────────────────

const DB_NAME     = 'zolto-v8';
const DB_VERSION  = 1;
const STORE_DOCS  = 'documents';
const STORE_META  = 'meta';
const LS_PREFIX   = 'zolto:doc:';
const LS_LIST_KEY = 'zolto:doc-list';
const AUTO_SAVE_DELAY = 2000; // ms

// ─────────────────────────────────────────────────────────────
// 2. Storage Backend Enum
// ─────────────────────────────────────────────────────────────

/** @enum {string} */
const Backend = Object.freeze({
  INDEXED_DB:  'indexeddb',
  LOCAL_STORE: 'localstorage',
  MEMORY:      'memory',
});

let _backend = Backend.INDEXED_DB;

// ─────────────────────────────────────────────────────────────
// 3. In-Memory Fallback Store
// ─────────────────────────────────────────────────────────────

/** @type {Map<string, StoredDocument>} */
const _memoryStore = new Map();

// ─────────────────────────────────────────────────────────────
// 4. Document Type Definition
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} StoredDocument
 * @property {string}   id          — UUID
 * @property {string}   source      — raw .zl source text
 * @property {string}   title       — resolved title (from frontmatter or filename)
 * @property {string}   createdAt   — ISO-8601 date string
 * @property {string}   updatedAt   — ISO-8601 date string
 * @property {number}   savedAt     — Unix timestamp of last save
 * @property {number}   wordCount   — word count at save time
 * @property {string[]} tags        — from frontmatter tags
 * @property {object}   meta        — raw frontmatter metadata
 */

// ─────────────────────────────────────────────────────────────
// 5. IndexedDB Setup
// ─────────────────────────────────────────────────────────────

/** @type {IDBDatabase | null} */
let _db = null;

/**
 * Open (or upgrade) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
async function openDB() {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = /** @type {IDBOpenDBRequest} */ (event.target).result;

      // Documents object store
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const store = db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title',     'title',     { unique: false });
      }

      // App-level metadata (settings, etc.)
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      _db = /** @type {IDBOpenDBRequest} */ (event.target).result;

      _db.onerror = (e) => logger.error('IDB error', e);

      _db.onversionchange = () => {
        _db.close();
        _db = null;
        logger.warn('IDB version changed — connection closed.');
      };

      logger.info('IndexedDB opened successfully');
      resolve(_db);
    };

    request.onerror = (event) => {
      logger.warn('IndexedDB unavailable — falling back to localStorage');
      _backend = Backend.LOCAL_STORE;
      reject(/** @type {IDBOpenDBRequest} */ (event.target).error);
    };

    request.onblocked = () => {
      logger.warn('IDB open blocked — another tab may be using an older version.');
      reject(new Error('IDB blocked by another tab'));
    };

    // Safety net: never hang the boot screen; fall back after 3 s
    setTimeout(() => reject(new Error('IDB open timed out')), 3000);
  });
}

/**
 * Run a transaction on the documents store.
 * @param {'readonly' | 'readwrite'} mode
 * @param {(store: IDBObjectStore) => IDBRequest | void} fn
 * @returns {Promise<any>}
 */
async function idbTransaction(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_DOCS, mode);
    const store = tx.objectStore(STORE_DOCS);
    const req   = fn(store);

    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    } else {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror    = () => reject(tx.error);
    }
  });
}


// ─────────────────────────────────────────────────────────────
// 6. localStorage Backend
// ─────────────────────────────────────────────────────────────

function lsSave(doc) {
  try {
    localStorage.setItem(LS_PREFIX + doc.id, JSON.stringify(doc));
    // Update index
    const list = lsList();
    if (!list.includes(doc.id)) {
      list.push(doc.id);
      localStorage.setItem(LS_LIST_KEY, JSON.stringify(list));
    }
  } catch (e) {
    logger.error('localStorage save failed', e);
    throw e;
  }
}

function lsLoad(id) {
  const raw = localStorage.getItem(LS_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

function lsDelete(id) {
  localStorage.removeItem(LS_PREFIX + id);
  const list = lsList().filter(i => i !== id);
  localStorage.setItem(LS_LIST_KEY, JSON.stringify(list));
}

function lsList() {
  try {
    return JSON.parse(localStorage.getItem(LS_LIST_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function lsLoadAll() {
  return lsList()
    .map(lsLoad)
    .filter(Boolean)
    .sort((a, b) => b.savedAt - a.savedAt);
}


// ─────────────────────────────────────────────────────────────
// 7. Public Storage API
// ─────────────────────────────────────────────────────────────

/**
 * Save a document. Creates it if it doesn't exist.
 * @param {Partial<StoredDocument> & { source: string }} doc
 * @returns {Promise<StoredDocument>}
 */
export async function save(doc) {
  const now = Date.now();
  const stored = /** @type {StoredDocument} */ ({
    id:        doc.id ?? uuid(),
    source:    doc.source,
    title:     doc.title ?? 'Untitled',
    createdAt: doc.createdAt ?? today(),
    updatedAt: today(),
    savedAt:   now,
    wordCount: doc.source.trim().split(/\s+/).filter(Boolean).length,
    tags:      doc.tags ?? [],
    meta:      doc.meta ?? {},
  });

  try {
    if (_backend === Backend.INDEXED_DB) {
      await idbTransaction('readwrite', store => store.put(stored));
    } else if (_backend === Backend.LOCAL_STORE) {
      lsSave(stored);
    } else {
      _memoryStore.set(stored.id, stored);
    }

    logger.debug('Saved document', stored.id, stored.title);
    return stored;
  } catch (err) {
    logger.error('Save failed', err);
    // Cascade to next backend
    if (_backend === Backend.INDEXED_DB) {
      logger.warn('IDB save failed — cascading to localStorage');
      _backend = Backend.LOCAL_STORE;
      return save(doc);
    }
    if (_backend === Backend.LOCAL_STORE) {
      logger.warn('localStorage save failed — cascading to memory');
      _backend = Backend.MEMORY;
      return save(doc);
    }
    throw err;
  }
}

/**
 * Load a document by id.
 * @param {string} id
 * @returns {Promise<StoredDocument | null>}
 */
export async function load(id) {
  try {
    if (_backend === Backend.INDEXED_DB) {
      return await idbTransaction('readonly', store => store.get(id)) ?? null;
    } else if (_backend === Backend.LOCAL_STORE) {
      return lsLoad(id);
    } else {
      return _memoryStore.get(id) ?? null;
    }
  } catch (err) {
    logger.error('Load failed', id, err);
    return null;
  }
}

/**
 * Delete a document by id.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function remove(id) {
  try {
    if (_backend === Backend.INDEXED_DB) {
      await idbTransaction('readwrite', store => store.delete(id));
    } else if (_backend === Backend.LOCAL_STORE) {
      lsDelete(id);
    } else {
      _memoryStore.delete(id);
    }
    logger.debug('Deleted document', id);
  } catch (err) {
    logger.error('Delete failed', id, err);
    throw err;
  }
}

/**
 * List all documents, sorted by last saved (newest first).
 * @returns {Promise<StoredDocument[]>}
 */
export async function list() {
  try {
    if (_backend === Backend.INDEXED_DB) {
      const db    = await openDB();
      const tx    = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const index = store.index('updatedAt');
      return new Promise((resolve, reject) => {
        const results = [];
        const req = index.openCursor(null, 'prev');
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBRequest} */ (e.target).result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } else if (_backend === Backend.LOCAL_STORE) {
      return lsLoadAll();
    } else {
      return [..._memoryStore.values()]
        .sort((a, b) => b.savedAt - a.savedAt);
    }
  } catch (err) {
    logger.error('List failed', err);
    return [];
  }
}

/**
 * Check whether a document with `id` exists.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function exists(id) {
  const doc = await load(id);
  return doc !== null;
}

/**
 * Duplicate a document.
 * @param {string} id
 * @returns {Promise<StoredDocument | null>}
 */
export async function duplicate(id) {
  const original = await load(id);
  if (!original) return null;
  const copy = {
    ...original,
    id:        uuid(),
    title:     `${original.title} (copy)`,
    createdAt: today(),
    updatedAt: today(),
    savedAt:   Date.now(),
  };
  return save(copy);
}

/**
 * Return the currently active backend name.
 * @returns {string}
 */
export function getBackend() {
  return _backend;
}


// ─────────────────────────────────────────────────────────────
// 8. Auto-Save
// ─────────────────────────────────────────────────────────────

/**
 * Debounced auto-save function.
 * Called by the editor on every change; fires 2 s after last edit.
 */
const _autoSave = debounce(async () => {
  const doc = stateGet('document');
  if (!doc.dirty) return;

  patch('saveStatus', 'saving');

  try {
    const stored = await save({
      id:     doc.id ?? undefined,
      source: doc.source,
      title:  doc.meta?.title ?? 'Untitled',
      meta:   doc.meta,
      tags:   doc.meta?.tags ?? [],
    });

    // Sync the document id back to state (first-save case)
    if (!doc.id) {
      patch('document', { id: stored.id });
    }

    markSaved(stored.savedAt);
    logger.debug('Auto-saved', stored.id);
  } catch (err) {
    patch('saveStatus', 'error');
    logger.error('Auto-save failed', err);
    toastError('Auto-save failed. Your changes may be lost.', { duration: 8000 });
  }
}, AUTO_SAVE_DELAY);

/**
 * Trigger the auto-save debounce.
 * Call this whenever the document source changes.
 */
export function scheduleAutoSave() {
  _autoSave();
}

/**
 * Force an immediate save (bypass debounce).
 * @returns {Promise<void>}
 */
export async function forceSave() {
  _autoSave.cancel();
  const doc = stateGet('document');
  if (!doc.dirty) return;

  patch('saveStatus', 'saving');
  try {
    const stored = await save({
      id:     doc.id ?? undefined,
      source: doc.source,
      title:  doc.meta?.title ?? 'Untitled',
      meta:   doc.meta,
      tags:   doc.meta?.tags ?? [],
    });
    if (!doc.id) patch('document', { id: stored.id });
    markSaved(stored.savedAt);
    toastSuccess('Saved');
    logger.info('Force-saved', stored.id);
  } catch (err) {
    patch('saveStatus', 'error');
    logger.error('Force-save failed', err);
    toastError('Save failed.');
    throw err;
  }
}

/**
 * Cancel any pending auto-save.
 */
export function cancelAutoSave() {
  _autoSave.cancel();
}


// ─────────────────────────────────────────────────────────────
// 9. App-Level Metadata (key-value pairs in STORE_META)
// ─────────────────────────────────────────────────────────────

/**
 * Read an app-level metadata value.
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getMeta(key) {
  if (_backend !== Backend.INDEXED_DB) {
    try { return JSON.parse(localStorage.getItem(`zolto:meta:${key}`) ?? 'null'); }
    catch { return null; }
  }
  const db  = await openDB();
  const tx  = db.transaction(STORE_META, 'readonly');
  const req = tx.objectStore(STORE_META).get(key);
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror   = () => resolve(null);
  });
}

/**
 * Write an app-level metadata value.
 * @param {string} key
 * @param {any}    value
 * @returns {Promise<void>}
 */
export async function setMeta(key, value) {
  if (_backend !== Backend.INDEXED_DB) {
    localStorage.setItem(`zolto:meta:${key}`, JSON.stringify(value));
    return;
  }
  const db  = await openDB();
  const tx  = db.transaction(STORE_META, 'readwrite');
  tx.objectStore(STORE_META).put({ key, value });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}


// ─────────────────────────────────────────────────────────────
// 10. Export / Import (JSON backup)
// ─────────────────────────────────────────────────────────────

/**
 * Export all documents as a JSON string.
 * @returns {Promise<string>}
 */
export async function exportAll() {
  const docs = await list();
  return JSON.stringify({ version: '8.1.0', exportedAt: new Date().toISOString(), documents: docs }, null, 2);
}

/**
 * Import documents from a JSON backup string.
 * Skips documents that already exist (by id).
 * @param {string} json
 * @returns {Promise<{ imported: number, skipped: number }>}
 */
export async function importAll(json) {
  const data = JSON.parse(json);
  const docs = data.documents ?? [];
  let imported = 0;
  let skipped  = 0;

  for (const doc of docs) {
    if (await exists(doc.id)) {
      skipped++;
    } else {
      await save(doc);
      imported++;
    }
  }

  logger.info(`Import complete: ${imported} imported, ${skipped} skipped`);
  return { imported, skipped };
}


// ─────────────────────────────────────────────────────────────
// 11. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Initialise the storage layer.
 * Attempts IndexedDB first; falls back gracefully.
 * Call this once during app bootstrap (app.js).
 * @returns {Promise<string>} the active backend name
 */
export async function initStorage() {
  try {
    await openDB();
    _backend = Backend.INDEXED_DB;
    logger.info('Storage initialised — backend: IndexedDB');
  } catch {
    try {
      localStorage.setItem('zolto:probe', '1');
      localStorage.removeItem('zolto:probe');
      _backend = Backend.LOCAL_STORE;
      logger.warn('Storage initialised — backend: localStorage (IDB unavailable)');
    } catch {
      _backend = Backend.MEMORY;
      logger.warn('Storage initialised — backend: memory (all backends unavailable)');
    }
  }

  // Listen for bus events that trigger saves
  bus.on(EVENTS.EDITOR_CHANGE, () => scheduleAutoSave());

  return _backend;
}
