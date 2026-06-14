/**
 * js/state.js
 * Zolto v8.1.0 — Global Reactive State
 *
 * Lightweight signal/observer pattern — no external library.
 * A single AppState object is the authoritative source of truth
 * for all reactive UI state across the application.
 *
 * Design:
 *  - state.get(key) / state.set(key, value) — read/write
 *  - watch(key, fn) — subscribe to changes on a specific key
 *  - watchAny(fn)   — subscribe to any state change
 *  - computed(keys, fn) — derived reactive values
 *  - State updates are synchronous; watchers fire immediately.
 *  - No async, no batching, no scheduling — just reactive data.
 */

'use strict';

import { createLogger }  from './utils/logger.js';
import { bus, EVENTS }   from './utils/events.js';
import { deepEqual }     from './utils/helpers.js';

const logger = createLogger('State');

// ─────────────────────────────────────────────────────────────
// 1. State Shape
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} DocumentState
 * @property {string | null}   id        — storage key
 * @property {string}          source    — raw .zl source text
 * @property {object | null}   ast       — parsed Document AST (null until first parse)
 * @property {object}          meta      — frontmatter-derived metadata
 * @property {boolean}         dirty     — unsaved changes exist
 * @property {number}          savedAt   — timestamp of last successful save
 * @property {string | null}   title     — resolved document title
 */

/**
 * @typedef {object} AppState
 * @property {DocumentState}   document
 * @property {string}          theme         — active theme id
 * @property {string}          previewMode   — 'live' | 'focus' | 'split'
 * @property {boolean}         sidebarOpen
 * @property {string}          sidebarPanel  — 'files' | 'outline' | 'search'
 * @property {{ line: number, col: number, offset: number }} cursor
 * @property {{ from: number, to: number, text: string }}    selection
 * @property {object}          settings
 * @property {string[]}        plugins       — installed plugin names
 * @property {boolean}         paletteOpen
 * @property {string}          searchQuery
 * @property {any[]}           searchResults
 * @property {boolean}         rendering     — true while render pipeline is running
 * @property {string | null}   renderError   — last render error message
 * @property {string}          saveStatus    — 'saved' | 'saving' | 'unsaved' | 'error'
 */

/** @type {AppState} */
const _initialState = {
  document: {
    id:      null,
    source:  '',
    ast:     null,
    meta:    {},
    dirty:   false,
    savedAt: 0,
    title:   null,
  },
  theme:        'dark',
  previewMode:  'live',
  sidebarOpen:  true,
  sidebarPanel: 'files',
  cursor:    { line: 1, col: 1, offset: 0 },
  selection: { from: 0, to: 0, text: '' },
  settings:  {},
  plugins:   [],
  paletteOpen:   false,
  searchQuery:   '',
  searchResults: [],
  rendering:     false,
  renderError:   null,
  saveStatus:    'saved',
};


// ─────────────────────────────────────────────────────────────
// 2. Internal State Store
// ─────────────────────────────────────────────────────────────

/** Deep clone of the initial state — mutated in place by set(). */
const _state = JSON.parse(JSON.stringify(_initialState));

/** @type {Map<string, Set<Function>>} key → Set of watchers */
const _watchers = new Map();

/** @type {Set<Function>} called on any state change */
const _anyWatchers = new Set();

/** Whether we're inside a batch() call — suppresses individual notifications. */
let _batching = false;

/** Keys changed during a batch — flushed when batch ends. */
const _batchedKeys = new Set();


// ─────────────────────────────────────────────────────────────
// 3. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Read a top-level state key.
 * For nested access use state.get('document').source etc.
 *
 * @template {keyof AppState} K
 * @param {K} key
 * @returns {AppState[K]}
 */
export function get(key) {
  return _state[key];
}

/**
 * Write a top-level state key and notify watchers.
 * Skips notification if value is deeply equal to current.
 *
 * @template {keyof AppState} K
 * @param {K}          key
 * @param {AppState[K]} value
 */
export function set(key, value) {
  const prev = _state[key];

  // Skip no-op writes
  if (deepEqual(prev, value)) return;

  _state[key] = value;
  logger.debug(`set(${key})`, value);

  if (_batching) {
    _batchedKeys.add(key);
    return;
  }

  _notify(key, value, prev);
}

/**
 * Partially update a nested object key.
 * Shallow-merges `patch` into the existing value.
 *
 * @template {keyof AppState} K
 * @param {K}                       key
 * @param {Partial<AppState[K]>}    patch
 */
export function patch(key, patch) {
  const current = _state[key];
  if (typeof current !== 'object' || current === null) {
    set(key, patch);
    return;
  }
  set(key, { ...current, ...patch });
}

/**
 * Reset a key to its initial value.
 * @template {keyof AppState} K
 * @param {K} key
 */
export function reset(key) {
  set(key, JSON.parse(JSON.stringify(_initialState[key])));
}

/**
 * Reset ALL state to initial values.
 */
export function resetAll() {
  batch(() => {
    for (const key of Object.keys(_initialState)) {
      reset(/** @type {keyof AppState} */ (key));
    }
  });
}

/**
 * Batch multiple set() calls — watchers fire once at the end
 * for all changed keys rather than after each individual set.
 *
 * @param {() => void} fn
 */
export function batch(fn) {
  _batching = true;
  try {
    fn();
  } finally {
    _batching = false;
    const changed = [..._batchedKeys];
    _batchedKeys.clear();
    for (const key of changed) {
      _notify(key, _state[key], undefined);
    }
  }
}

/**
 * Get the entire state snapshot (shallow clone — do not mutate).
 * @returns {AppState}
 */
export function snapshot() {
  return { ..._state };
}


// ─────────────────────────────────────────────────────────────
// 4. Watchers
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to changes on a specific state key.
 * `fn` is called with (newValue, prevValue).
 *
 * @template {keyof AppState} K
 * @param {K}                                              key
 * @param {(next: AppState[K], prev: AppState[K]) => void} fn
 * @param {object}  [options]
 * @param {boolean} [options.immediate=false]  call fn immediately with current value
 * @returns {() => void} unsubscribe function
 */
export function watch(key, fn, options = {}) {
  if (!_watchers.has(key)) _watchers.set(key, new Set());
  _watchers.get(key).add(fn);

  if (options.immediate) fn(_state[key], undefined);

  return () => {
    const s = _watchers.get(key);
    if (s) s.delete(fn);
  };
}

/**
 * Subscribe to any state change.
 * `fn` is called with (key, newValue, prevValue).
 *
 * @param {(key: string, next: any, prev: any) => void} fn
 * @returns {() => void} unsubscribe
 */
export function watchAny(fn) {
  _anyWatchers.add(fn);
  return () => _anyWatchers.delete(fn);
}

/**
 * Subscribe to a key change, but only once.
 * @template {keyof AppState} K
 * @param {K}           key
 * @param {Function}    fn
 * @returns {() => void}
 */
export function watchOnce(key, fn) {
  const unsub = watch(key, (next, prev) => {
    fn(next, prev);
    unsub();
  });
  return unsub;
}


// ─────────────────────────────────────────────────────────────
// 5. Computed Values
// ─────────────────────────────────────────────────────────────

/**
 * Create a derived value that recomputes whenever any of `keys` change.
 * Returns a getter function that always returns the latest computed value.
 *
 * @template T
 * @param {(keyof AppState)[]}  keys    — state keys to watch
 * @param {() => T}             compute — pure function to derive the value
 * @returns {{ get(): T, dispose(): void }}
 */
export function computed(keys, compute) {
  let cached = compute();
  const unsubscribers = [];

  const recompute = () => {
    const next = compute();
    if (!deepEqual(cached, next)) {
      cached = next;
    }
  };

  for (const key of keys) {
    unsubscribers.push(watch(key, recompute));
  }

  return {
    get() { return cached; },
    dispose() { for (const u of unsubscribers) u(); },
  };
}


// ─────────────────────────────────────────────────────────────
// 6. Internal Notify
// ─────────────────────────────────────────────────────────────

/**
 * @param {string} key
 * @param {any}    next
 * @param {any}    prev
 */
function _notify(key, next, prev) {
  // Key-specific watchers
  const handlers = _watchers.get(key);
  if (handlers) {
    for (const fn of [...handlers]) {
      try { fn(next, prev); } catch (e) {
        logger.error(`Watcher error for key "${key}"`, e);
      }
    }
  }
  // Any-change watchers
  for (const fn of [..._anyWatchers]) {
    try { fn(key, next, prev); } catch (e) {
      logger.error(`watchAny handler error`, e);
    }
  }
  // Forward select keys to the global event bus
  _bridgeToEventBus(key, next);
}


// ─────────────────────────────────────────────────────────────
// 7. Event Bus Bridge
//    Certain state changes also emit on the global event bus
//    so modules that import bus directly can react without
//    importing state.
// ─────────────────────────────────────────────────────────────

/** @param {string} key @param {any} next */
function _bridgeToEventBus(key, next) {
  switch (key) {
    case 'document':
      if (next.dirty)  bus.emit(EVENTS.DOC_DIRTY,  next);
      if (!next.dirty) bus.emit(EVENTS.DOC_CLEAN,  next);
      if (next.source !== undefined) {
        bus.emit(EVENTS.EDITOR_CHANGE, next.source);
      }
      break;
    case 'theme':
      bus.emit(EVENTS.THEME_CHANGE, next);
      break;
    case 'settings':
      bus.emit(EVENTS.SETTINGS_CHANGE, next);
      break;
    case 'saveStatus':
      if (next === 'saved') bus.emit(EVENTS.DOC_SAVE, get('document'));
      if (next === 'error') bus.emit(EVENTS.DOC_SAVE_ERROR, get('document'));
      break;
    case 'rendering':
      if (next)  bus.emit(EVENTS.RENDER_START);
      if (!next) bus.emit(EVENTS.RENDER_DONE);
      break;
    case 'renderError':
      if (next) bus.emit(EVENTS.RENDER_ERROR, next);
      break;
  }
}


// ─────────────────────────────────────────────────────────────
// 8. Convenience Document Helpers
//    These are the most common mutation patterns; keeping them
//    here prevents scattered patch() calls across the codebase.
// ─────────────────────────────────────────────────────────────

/**
 * Update the document source (marks dirty).
 * @param {string} source
 */
export function setSource(source) {
  const doc = get('document');
  if (doc.source === source) return;
  patch('document', {
    source,
    dirty: true,
    ast:   null,          // invalidate cached AST
  });
  set('saveStatus', 'unsaved');
  set('rendering', true);
}

/**
 * Store the resolved Document AST after a successful parse.
 * @param {object} ast
 */
export function setAST(ast) {
  patch('document', { ast });
  set('rendering', false);
  set('renderError', null);
}

/**
 * Record that the document was saved.
 * @param {number} [ts=Date.now()]
 */
export function markSaved(ts = Date.now()) {
  patch('document', { dirty: false, savedAt: ts });
  set('saveStatus', 'saved');
}

/**
 * Open a new document — resets document state.
 * @param {{ id?: string, source?: string, meta?: object }} doc
 */
export function openDocument({ id = null, source = '', meta = {} } = {}) {
  batch(() => {
    patch('document', {
      id,
      source,
      ast:     null,
      meta,
      dirty:   false,
      savedAt: Date.now(),
      title:   meta.title ?? null,
    });
    set('saveStatus', 'saved');
    set('renderError', null);
    set('cursor',    { line: 1, col: 1, offset: 0 });
    set('selection', { from: 0, to: 0, text: '' });
  });
  bus.emit(EVENTS.DOC_OPEN, get('document'));
}

/**
 * Update cursor position.
 * @param {number} line
 * @param {number} col
 * @param {number} offset
 */
export function setCursor(line, col, offset) {
  // Use direct mutation + targeted notify to avoid deepEqual overhead
  // on the most frequently-called state mutation in the app.
  const cur = _state.cursor;
  if (cur.line === line && cur.col === col && cur.offset === offset) return;
  cur.line   = line;
  cur.col    = col;
  cur.offset = offset;
  _notify('cursor', cur, undefined);
}

/**
 * Update text selection.
 * @param {number} from
 * @param {number} to
 * @param {string} text
 */
export function setSelection(from, to, text) {
  patch('selection', { from, to, text });
}


// ─────────────────────────────────────────────────────────────
// 9. Dev Tools Integration
//    Expose state on window in development for console inspection.
// ─────────────────────────────────────────────────────────────

if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  window.__zoltoState = {
    get,
    set,
    patch,
    snapshot,
    watch,
    _raw: _state,
  };
  logger.debug('State dev tools mounted on window.__zoltoState');
}
