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
