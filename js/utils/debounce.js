/**
 * js/utils/debounce.js
 * Zolto v8.1.0 — Debounce & Throttle Utilities
 *
 * Provides debounce, throttle, and leading-edge variants
 * used throughout the editor, preview, and storage layers.
 * Zero dependencies. Pure functions. Tree-shakeable.
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 1. debounce
//    Delays fn execution until after `wait` ms have elapsed
//    since the last call. Trailing-edge by default.
// ─────────────────────────────────────────────────────────────

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} wait        — milliseconds to wait
 * @param {object} [options]
 * @param {boolean} [options.leading=false]  — fire on leading edge
 * @param {boolean} [options.trailing=true]  — fire on trailing edge
 * @param {number}  [options.maxWait]        — maximum delay before forced call
 * @returns {{ (...args: Parameters<T>): void, cancel(): void, flush(): void }}
 */
export function debounce(fn, wait, options = {}) {
  const {
    leading  = false,
    trailing = true,
    maxWait  = undefined,
  } = options;

  let timerId   = null;
  let maxTimer  = null;
  let lastArgs  = null;
  let lastThis  = null;
  let lastCallTime   = 0;
  let lastInvokeTime = 0;

  const invokeFunc = (time) => {
    const args = lastArgs;
    const ctx  = lastThis;
    lastArgs  = null;
    lastThis  = null;
    lastInvokeTime = time;
    return fn.apply(ctx, args);
  };

  const shouldInvoke = (time) => {
    const timeSinceLastCall   = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  };

  const trailingEdge = (time) => {
    timerId = null;
    if (trailing && lastArgs) return invokeFunc(time);
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) return trailingEdge(time);
    // Reschedule
    const remaining = wait - (time - lastCallTime);
    timerId = setTimeout(timerExpired, remaining);
  };

  const leadingEdge = (time) => {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : undefined;
  };

  const debounced = function (...args) {
    const time   = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs     = args;
    lastThis     = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === null) return leadingEdge(time);
      if (maxWait !== undefined) {
        // Handle invocations in a tight loop
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(time);
      }
    }
    if (timerId === null) timerId = setTimeout(timerExpired, wait);

    // maxWait timer
    if (maxWait !== undefined && maxTimer === null) {
      maxTimer = setTimeout(() => {
        maxTimer = null;
        if (trailing && lastArgs) invokeFunc(Date.now());
      }, maxWait);
    }
  };

  debounced.cancel = () => {
    if (timerId  !== null) { clearTimeout(timerId);  timerId  = null; }
    if (maxTimer !== null) { clearTimeout(maxTimer); maxTimer = null; }
    lastArgs  = null;
    lastThis  = null;
    lastCallTime   = 0;
    lastInvokeTime = 0;
  };

  debounced.flush = () => {
    if (timerId === null) return;
    trailingEdge(Date.now());
  };

  debounced.pending = () => timerId !== null;

  return debounced;
}


// ─────────────────────────────────────────────────────────────
// 2. throttle
//    Ensures fn is called at most once per `wait` ms.
//    Fires on leading edge; optionally on trailing edge.
// ─────────────────────────────────────────────────────────────

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} wait
 * @param {object} [options]
 * @param {boolean} [options.leading=true]
 * @param {boolean} [options.trailing=true]
 * @returns {{ (...args: Parameters<T>): void, cancel(): void, flush(): void }}
 */
export function throttle(fn, wait, options = {}) {
  const { leading = true, trailing = true } = options;
  return debounce(fn, wait, { leading, trailing, maxWait: wait });
}


// ─────────────────────────────────────────────────────────────
// 3. debounceAnimationFrame
//    Defers fn to the next animation frame.
//    Cancels any pending frame before scheduling a new one.
//    Ideal for DOM-read/write operations tied to render.
// ─────────────────────────────────────────────────────────────

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {{ (...args: Parameters<T>): void, cancel(): void }}
 */
export function debounceAnimationFrame(fn) {
  let rafId   = null;
  let lastArgs = null;
  let lastThis = null;

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      fn.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    });
  };

  debounced.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return debounced;
}


// ─────────────────────────────────────────────────────────────
// 4. once
//    Returns a version of fn that fires at most once.
// ─────────────────────────────────────────────────────────────

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}


// ─────────────────────────────────────────────────────────────
// 5. idle
//    Defers fn to the browser idle period via
//    requestIdleCallback, falling back to setTimeout(fn, 1).
//    Used for non-critical background work (search indexing, etc.)
// ─────────────────────────────────────────────────────────────

/**
 * @param {(...args: any[]) => any} fn
 * @param {IdleRequestOptions} [options]
 * @returns {{ cancel(): void }}
 */
export function idle(fn, options = { timeout: 2000 }) {
  let id;
  if (typeof requestIdleCallback === 'function') {
    id = requestIdleCallback(fn, options);
    return { cancel: () => cancelIdleCallback(id) };
  }
  id = setTimeout(fn, 1);
  return { cancel: () => clearTimeout(id) };
}


// ─────────────────────────────────────────────────────────────
// 6. memoize
//    Caches the result of fn for repeated identical arguments.
//    Uses a Map keyed on JSON.stringify(args) by default.
//    Pass a custom key function for non-serialisable args.
// ─────────────────────────────────────────────────────────────

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {(...args: Parameters<T>) => string} [keyFn]
 * @returns {T & { cache: Map<string, ReturnType<T>>, clear(): void }}
 */
export function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  const memoized = function (...args) {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}


// ─────────────────────────────────────────────────────────────
// 7. Pre-configured instances used across Zolto
//    Exported as named constants so all modules share the
//    same timer — cancelling one cancels them all.
// ─────────────────────────────────────────────────────────────

/**
 * 16 ms debounce — one animation frame.
 * Used by live-renderer.js for the editor → preview pipeline.
 * @type {(fn: Function) => ReturnType<typeof debounce>}
 */
export const debounce16 = (fn) => debounce(fn, 16);

/**
 * 300 ms debounce — comfortable typing pause.
 * Used by storage.js for auto-save.
 * @type {(fn: Function) => ReturnType<typeof debounce>}
 */
export const debounce300 = (fn) => debounce(fn, 300);

/**
 * 2000 ms debounce — long typing pause.
 * Used by storage.js for definitive save.
 * @type {(fn: Function) => ReturnType<typeof debounce>}
 */
export const debounce2000 = (fn) => debounce(fn, 2000);

/**
 * 60 fps throttle — for scroll handlers, resize observers.
 * @type {(fn: Function) => ReturnType<typeof throttle>}
 */
export const throttle60fps = (fn) => throttle(fn, 1000 / 60);
