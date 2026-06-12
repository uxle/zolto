/**
 * js/utils/events.js
 * Zolto v8.1.0 — Event Bus, DOM Event Helpers & Toast System
 *
 * Three concerns in one module:
 *  1. EventBus   — lightweight pub/sub for cross-module communication
 *  2. DOM events — on(), off(), once(), delegate(), emit() helpers
 *  3. Toast      — programmatic toast notification API
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 1. EventBus — pub/sub for cross-module communication
//    Modules import { bus } and call bus.on / bus.emit
//    without needing direct references to each other.
// ─────────────────────────────────────────────────────────────

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string}   event
   * @param {Function} handler
   * @returns {() => void} unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event once — auto-removes after first fire.
   * @param {string}   event
   * @param {Function} handler
   * @returns {() => void} unsubscribe function
   */
  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe a handler (or all handlers if handler omitted).
   * @param {string}    event
   * @param {Function} [handler]
   */
  off(event, handler) {
    if (!this._listeners.has(event)) return;
    if (handler) {
      this._listeners.get(event).delete(handler);
    } else {
      this._listeners.delete(event);
    }
  }

  /**
   * Emit an event with optional payload.
   * @param {string} event
   * @param {...any}  args
   */
  emit(event, ...args) {
    const handlers = this._listeners.get(event);
    if (!handlers || handlers.size === 0) return;
    // Snapshot the Set before iterating — handlers may remove themselves
    for (const handler of [...handlers]) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  /**
   * Returns true if there are any subscribers for `event`.
   * @param {string} event
   * @returns {boolean}
   */
  has(event) {
    const s = this._listeners.get(event);
    return !!s && s.size > 0;
  }

  /**
   * Remove all listeners for all events.
   */
  clear() {
    this._listeners.clear();
  }

  /**
   * Returns list of all event names with active listeners.
   * @returns {string[]}
   */
  events() {
    return [...this._listeners.keys()].filter(k => this._listeners.get(k).size > 0);
  }
}

/**
 * Global application event bus.
 * Import this instance — do not create new EventBus instances.
 * @type {EventBus}
 */
export const bus = new EventBus();

// ─── Zolto application event names ───────────────────────────
// Centralised here so typos in event strings are caught
// by import (rather than silently failing at runtime).

export const EVENTS = Object.freeze({
  // Document lifecycle
  DOC_NEW:        'zolto:doc:new',
  DOC_OPEN:       'zolto:doc:open',
  DOC_CLOSE:      'zolto:doc:close',
  DOC_SAVE:       'zolto:doc:save',
  DOC_SAVE_ERROR: 'zolto:doc:save-error',
  DOC_DIRTY:      'zolto:doc:dirty',
  DOC_CLEAN:      'zolto:doc:clean',

  // Editor
  EDITOR_CHANGE:  'zolto:change',       // source text changed
  EDITOR_CURSOR:  'zolto:cursor',       // cursor moved
  EDITOR_SELECT:  'zolto:select',       // selection changed
  EDITOR_READY:   'zolto:editor:ready',

  // Render pipeline
  RENDER_START:   'zolto:render:start',
  RENDER_DONE:    'zolto:render:done',
  RENDER_ERROR:   'zolto:render:error',

  // Preview
  PREVIEW_SCROLL: 'zolto:preview:scroll',
  PREVIEW_CLICK:  'zolto:preview:click',

  // Theme
  THEME_CHANGE:   'zolto:theme:change',

  // Settings
  SETTINGS_CHANGE: 'zolto:settings:change',

  // Route
  ROUTE_CHANGE:   'zolto:route:change',

  // Plugins
  PLUGIN_INSTALL:   'zolto:plugin:install',
  PLUGIN_UNINSTALL: 'zolto:plugin:uninstall',

  // Export
  EXPORT_START:   'zolto:export:start',
  EXPORT_DONE:    'zolto:export:done',
  EXPORT_ERROR:   'zolto:export:error',

  // Search
  SEARCH_QUERY:   'zolto:search:query',
  SEARCH_RESULTS: 'zolto:search:results',

  // Toast
  TOAST_SHOW:     'zolto:toast:show',
  TOAST_DISMISS:  'zolto:toast:dismiss',
});


// ─────────────────────────────────────────────────────────────
// 2. DOM Event Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Add an event listener. Returns an unsubscribe function.
 * @param {EventTarget} target
 * @param {string}      type
 * @param {EventListenerOrEventListenerObject} handler
 * @param {AddEventListenerOptions | boolean} [options]
 * @returns {() => void}
 */
export function on(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/**
 * Remove an event listener.
 * @param {EventTarget} target
 * @param {string}      type
 * @param {EventListenerOrEventListenerObject} handler
 * @param {EventListenerOptions | boolean} [options]
 */
export function off(target, type, handler, options) {
  target.removeEventListener(type, handler, options);
}

/**
 * Add a one-time event listener.
 * @param {EventTarget} target
 * @param {string}      type
 * @param {Function}    handler
 * @returns {() => void}
 */
export function once(target, type, handler) {
  const wrapper = (e) => {
    handler(e);
    target.removeEventListener(type, wrapper);
  };
  target.addEventListener(type, wrapper);
  return () => target.removeEventListener(type, wrapper);
}

/**
 * Event delegation — listens on `parent` and fires `handler`
 * only when the event target matches `selector`.
 * @param {Element}  parent
 * @param {string}   type
 * @param {string}   selector
 * @param {Function} handler    — called with (event, matchedElement)
 * @param {AddEventListenerOptions | boolean} [options]
 * @returns {() => void} unsubscribe
 */
export function delegate(parent, type, selector, handler, options) {
  const listener = (event) => {
    const target = /** @type {Element} */ (event.target);
    const match  = target.closest(selector);
    if (match && parent.contains(match)) {
      handler(event, match);
    }
  };
  parent.addEventListener(type, listener, options);
  return () => parent.removeEventListener(type, listener, options);
}

/**
 * Dispatch a custom DOM event on `target`.
 * @param {EventTarget} target
 * @param {string}      type
 * @param {any}         [detail]
 * @param {EventInit}   [options]
 */
export function emit(target, type, detail, options = {}) {
  target.dispatchEvent(new CustomEvent(type, {
    bubbles:    true,
    cancelable: true,
    composed:   false,
    ...options,
    detail,
  }));
}

/**
 * Returns a Promise that resolves on the next occurrence of `type`.
 * @param {EventTarget} target
 * @param {string}      type
 * @param {number}      [timeout] — rejects after this many ms if set
 * @returns {Promise<Event>}
 */
export function nextEvent(target, type, timeout) {
  return new Promise((resolve, reject) => {
    const cleanup = once(target, type, resolve);
    if (timeout !== undefined) {
      setTimeout(() => {
        cleanup();
        reject(new Error(`nextEvent: timed out waiting for "${type}"`));
      }, timeout);
    }
  });
}

/**
 * Listen for `data-action` attribute delegation on a root element.
 * Fires handler(action, event, element) when a click reaches an element
 * with data-action="namespace:name".
 *
 * Used by app.js to wire all button/link clicks centrally.
 *
 * @param {Element}  root
 * @param {Function} handler  — (action: string, event: Event, el: Element) => void
 * @returns {() => void}
 */
export function delegateActions(root, handler) {
  return delegate(root, 'click', '[data-action]', (event, el) => {
    const action = el.getAttribute('data-action');
    if (action) handler(action, event, el);
  });
}

/**
 * Listen for keyboard shortcut on target.
 * @param {EventTarget}  target
 * @param {string}       combo    — e.g. 'Ctrl+K', 'Cmd+Shift+P', 'Escape'
 * @param {Function}     handler
 * @returns {() => void}
 */
export function onKey(target, combo, handler) {
  const parts = combo.toLowerCase().replace('cmd', 'meta').split('+');
  const key   = parts[parts.length - 1];
  const ctrl  = parts.includes('ctrl');
  const meta  = parts.includes('meta');
  const shift = parts.includes('shift');
  const alt   = parts.includes('alt');

  const listener = (/** @type {KeyboardEvent} */ e) => {
    if (e.key.toLowerCase() !== key) return;
    if (ctrl  && !e.ctrlKey)  return;
    if (meta  && !e.metaKey)  return;
    if (shift && !e.shiftKey) return;
    if (alt   && !e.altKey)   return;
    // Don't fire Ctrl combos when meta expected (and vice versa)
    if (!ctrl  && !meta && (e.ctrlKey || e.metaKey)) return;
    handler(e);
  };

  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}


// ─────────────────────────────────────────────────────────────
// 3. Toast Notification System
// ─────────────────────────────────────────────────────────────

/** @type {number} incrementing toast id */
let _toastId = 0;

/** @type {Map<number, { el: HTMLElement, timerId: number | null }>} */
const _activeToasts = new Map();

/**
 * @typedef {'info' | 'success' | 'warning' | 'error'} ToastType
 *
 * @typedef {object} ToastOptions
 * @property {ToastType} [type='info']
 * @property {string}    [title]
 * @property {number}    [duration=3500]   ms before auto-dismiss (0 = never)
 * @property {boolean}   [closable=true]
 * @property {string}    [icon]            emoji or HTML
 */

const TOAST_ICONS = Object.freeze({
  info:    'ℹ️',
  success: '✓',
  warning: '⚠️',
  error:   '✕',
});

const TOAST_DURATION = Object.freeze({
  info:    3500,
  success: 2800,
  warning: 4500,
  error:   6000,
});

/**
 * Show a toast notification.
 * Appends to #zolto-toasts in the DOM.
 *
 * @param {string}       message
 * @param {ToastOptions} [options]
 * @returns {number} toast id (pass to dismissToast() to cancel)
 */
export function toast(message, options = {}) {
  const {
    type     = 'info',
    title    = undefined,
    duration = TOAST_DURATION[type] ?? 3500,
    closable = true,
    icon     = TOAST_ICONS[type],
  } = options;

  const id = ++_toastId;

  const el = document.createElement('div');
  el.className = `zolto-toast zolto-toast-${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.dataset.toastId = String(id);

  el.innerHTML = `
    <span class="zolto-toast-icon" aria-hidden="true">${icon}</span>
    <div class="zolto-toast-body">
      ${title ? `<div class="zolto-toast-title">${_escapeHtml(title)}</div>` : ''}
      <div class="zolto-toast-message">${_escapeHtml(message)}</div>
    </div>
    ${closable ? `<button class="zolto-toast-close" aria-label="Dismiss notification">×</button>` : ''}
  `.trim();

  // Close button
  if (closable) {
    el.querySelector('.zolto-toast-close').addEventListener('click', () => {
      dismissToast(id);
    });
  }

  const region = document.getElementById('zolto-toasts');
  if (!region) {
    console.warn('[toast] #zolto-toasts container not found in DOM.');
    return id;
  }

  region.appendChild(el);

  let timerId = null;
  if (duration > 0) {
    timerId = setTimeout(() => dismissToast(id), duration);
  }

  _activeToasts.set(id, { el, timerId });

  // Also emit on the bus so other modules can react
  bus.emit(EVENTS.TOAST_SHOW, { id, type, message, title });

  return id;
}

/**
 * Dismiss a toast by id (or all toasts if id omitted).
 * @param {number} [id]
 */
export function dismissToast(id) {
  if (id === undefined) {
    for (const toastId of [..._activeToasts.keys()]) {
      dismissToast(toastId);
    }
    return;
  }

  const entry = _activeToasts.get(id);
  if (!entry) return;

  const { el, timerId } = entry;
  if (timerId !== null) clearTimeout(timerId);
  _activeToasts.delete(id);

  el.classList.add('zolto-toast-out');
  // Remove from DOM after exit animation
  el.addEventListener('animationend', () => el.remove(), { once: true });
  // Fallback remove if animation doesn't fire
  setTimeout(() => el.remove(), 400);

  bus.emit(EVENTS.TOAST_DISMISS, { id });
}

/**
 * Convenience helpers
 */
export const toastInfo    = (msg, opts = {}) => toast(msg, { ...opts, type: 'info'    });
export const toastSuccess = (msg, opts = {}) => toast(msg, { ...opts, type: 'success' });
export const toastWarning = (msg, opts = {}) => toast(msg, { ...opts, type: 'warning' });
export const toastError   = (msg, opts = {}) => toast(msg, { ...opts, type: 'error'   });


// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

/** @param {string} str @returns {string} */
function _escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
