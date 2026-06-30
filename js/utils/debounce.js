/**
 * utils/debounce.js
 */

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} delay
 * @returns {T & { cancel(): void }}
 */
export function debounce(fn, delay = 0) {
  let timer = null;

  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return /** @type {any} */ (debounced);
}

/**
 * 16ms debounce（約1フレーム）
 */
export function debounce16(fn) {
  return debounce(fn, 16);
}

/**
 * Debounce using requestAnimationFrame — ensures callback runs at most once per frame.
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T & { cancel(): void }}
 */
export function debounceAnimationFrame(fn) {
  let scheduled = false;
  
  function debounced(...args) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn(...args);
    });
  }

  debounced.cancel = () => {
    scheduled = false;
  };

  return /** @type {any} */ (debounced);
}
