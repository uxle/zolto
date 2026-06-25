/**
 * js/utils/dom.js
 * Zolto v8.1.0 — DOM Utility Functions
 *
 * Pure DOM helpers used across editor, preview, and component layers.
 * No framework, no virtual DOM — raw, fast DOM operations.
 * All functions are pure (no side effects unless explicitly mutating).
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 1. Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Shorthand for document.querySelector.
 * @param {string}        selector
 * @param {ParentNode}    [root=document]
 * @returns {Element | null}
 */
export const $ = (selector, root = document) =>
  root.querySelector(selector);

/**
 * Shorthand for document.querySelectorAll → Array.
 * @param {string}     selector
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

/**
 * Find the closest ancestor (or self) matching selector.
 * @param {Element}  el
 * @param {string}   selector
 * @returns {Element | null}
 */
export const closest = (el, selector) => el?.closest(selector) ?? null;

/**
 * Test whether `el` matches `selector`.
 * @param {Element} el
 * @param {string}  selector
 * @returns {boolean}
 */
export const matches = (el, selector) => el?.matches(selector) ?? false;


// ─────────────────────────────────────────────────────────────
// 2. Element Creation
// ─────────────────────────────────────────────────────────────

/**
 * Create an element with optional attributes, classes, and children.
 *
 * @param {string} tag
 * @param {object} [props]
 * @param {string | string[]}  [props.class]
 * @param {Record<string,string>} [props.attrs]
 * @param {Record<string,string>} [props.dataset]
 * @param {string} [props.html]
 * @param {string} [props.text]
 * @param {(Element | string)[]} [props.children]
 * @returns {HTMLElement}
 */
export function createElement(tag, props = {}) {
  const el = document.createElement(tag);

  if (props.class) {
    const classes = Array.isArray(props.class)
      ? props.class
      : props.class.split(/\s+/);
    el.classList.add(...classes.filter(Boolean));
  }

  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (v !== null && v !== undefined) el.setAttribute(k, String(v));
    }
  }

  if (props.dataset) {
    for (const [k, v] of Object.entries(props.dataset)) {
      el.dataset[k] = String(v);
    }
  }

  if (props.html !== undefined) {
    el.innerHTML = props.html;
  } else if (props.text !== undefined) {
    el.textContent = props.text;
  } else if (props.children) {
    for (const child of props.children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }
  }

  return el;
}

/**
 * Create an SVG element in the SVG namespace.
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @returns {SVGElement}
 */
export function createSVGElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}


// ─────────────────────────────────────────────────────────────
// 3. DOM Mutation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Remove all child nodes from an element.
 * @param {Element} el
 */
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Replace all children of `el` with `newChildren`.
 * @param {Element}               el
 * @param {(Node | string)[]}     newChildren
 */
export function setChildren(el, newChildren) {
  clearChildren(el);
  for (const child of newChildren) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
}

/**
 * Insert `el` before `referenceEl`.
 * @param {Element} el
 * @param {Element} referenceEl
 */
export function insertBefore(el, referenceEl) {
  referenceEl.parentNode?.insertBefore(el, referenceEl);
}

/**
 * Insert `el` after `referenceEl`.
 * @param {Element} el
 * @param {Element} referenceEl
 */
export function insertAfter(el, referenceEl) {
  referenceEl.parentNode?.insertBefore(el, referenceEl.nextSibling);
}

/**
 * Move `el` to the end of `parent`.
 * @param {Element} parent
 * @param {Element} el
 */
export const appendTo = (parent, el) => parent.appendChild(el);

/**
 * Safely remove `el` from the DOM.
 * @param {Element | null} el
 */
export const remove = (el) => el?.remove();

/**
 * Set innerHTML safely — strips scripts.
 * For fully untrusted HTML use a real sanitiser; this is a fast
 * defence-in-depth guard only.
 * @param {Element} el
 * @param {string}  html
 */
export function setHTML(el, html) {
  el.innerHTML = html;
  // Remove any <script> elements that snuck in
  for (const script of el.querySelectorAll('script')) {
    script.remove();
  }
}


// ─────────────────────────────────────────────────────────────
// 4. Class Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Toggle one or more classes on `el`.
 * @param {Element}           el
 * @param {string | string[]} classes
 * @param {boolean}           [force]
 */
export function toggleClass(el, classes, force) {
  const list = Array.isArray(classes) ? classes : [classes];
  for (const cls of list) {
    if (force !== undefined) {
      el.classList.toggle(cls, force);
    } else {
      el.classList.toggle(cls);
    }
  }
}

/**
 * Add one or more classes.
 * @param {Element}           el
 * @param {string | string[]} classes
 */
export function addClass(el, classes) {
  const list = Array.isArray(classes) ? classes : classes.split(/\s+/);
  el.classList.add(...list.filter(Boolean));
}

/**
 * Remove one or more classes.
 * @param {Element}           el
 * @param {string | string[]} classes
 */
export function removeClass(el, classes) {
  const list = Array.isArray(classes) ? classes : classes.split(/\s+/);
  el.classList.remove(...list.filter(Boolean));
}

/**
 * Set exactly these classes on `el` (replaces all existing).
 * @param {Element}           el
 * @param {string | string[]} classes
 */
export function setClass(el, classes) {
  const list = Array.isArray(classes) ? classes : classes.split(/\s+/);
  el.className = list.filter(Boolean).join(' ');
}


// ─────────────────────────────────────────────────────────────
// 5. Attribute Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Set multiple attributes at once.
 * Pass null/undefined as value to remove the attribute.
 * @param {Element}               el
 * @param {Record<string, string | null | undefined>} attrs
 */
export function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) {
      el.removeAttribute(k);
    } else {
      el.setAttribute(k, String(v));
    }
  }
}

/**
 * Read a data attribute as string (or return `fallback`).
 * @param {Element} el
 * @param {string}  key     — without the 'data-' prefix
 * @param {string}  [fallback='']
 * @returns {string}
 */
export const data = (el, key, fallback = '') =>
  el.dataset[key] ?? fallback;

/**
 * Set ARIA attributes from a map.
 * @param {Element}               el
 * @param {Record<string, string | boolean>} aria
 */
export function setAria(el, aria) {
  for (const [k, v] of Object.entries(aria)) {
    el.setAttribute(`aria-${k}`, String(v));
  }
}

/**
 * Hide element (aria-hidden + display:none via [hidden]).
 * @param {Element} el
 */
export function hide(el) {
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
}

/**
 * Show element (removes [hidden] and aria-hidden).
 * @param {Element} el
 */
export function show(el) {
  el.hidden = false;
  el.removeAttribute('aria-hidden');
}

/**
 * Toggle visibility of `el`.
 * @param {Element} el
 * @param {boolean} [visible]
 */
export function toggle(el, visible) {
  const shouldShow = visible !== undefined ? visible : el.hidden;
  if (shouldShow) show(el);
  else hide(el);
}


// ─────────────────────────────────────────────────────────────
// 6. Geometry & Scroll
// ─────────────────────────────────────────────────────────────

/**
 * Get element bounding rect relative to the viewport.
 * @param {Element} el
 * @returns {DOMRect}
 */
export const rect = (el) => el.getBoundingClientRect();

/**
 * Get element position relative to a specific ancestor.
 * @param {Element} el
 * @param {Element} ancestor
 * @returns {{ top: number, left: number, width: number, height: number }}
 */
export function offsetFrom(el, ancestor) {
  const elRect  = el.getBoundingClientRect();
  const ancRect = ancestor.getBoundingClientRect();
  return {
    top:    elRect.top    - ancRect.top,
    left:   elRect.left   - ancRect.left,
    width:  elRect.width,
    height: elRect.height,
  };
}

/**
 * Scroll `el` into view if it's not fully visible within `container`.
 * @param {Element} el
 * @param {Element} container
 * @param {'smooth' | 'auto'} [behavior='smooth']
 */
export function scrollIntoViewIfNeeded(el, container, behavior = 'smooth') {
  const elRect  = el.getBoundingClientRect();
  const conRect = container.getBoundingClientRect();

  const isAbove = elRect.top    < conRect.top;
  const isBelow = elRect.bottom > conRect.bottom;

  if (isAbove || isBelow) {
    el.scrollIntoView({ behavior, block: isAbove ? 'start' : 'end' });
  }
}

/**
 * Get scroll percentage (0–1) of `el`.
 * @param {Element} el
 * @returns {number}
 */
export function scrollProgress(el) {
  const scrollable = el.scrollHeight - el.clientHeight;
  return scrollable > 0 ? el.scrollTop / scrollable : 0;
}

/**
 * Check if `el` is fully visible within the viewport.
 * @param {Element} el
 * @returns {boolean}
 */
export function isInViewport(el) {
  const { top, bottom, left, right } = el.getBoundingClientRect();
  return (
    top    >= 0 &&
    left   >= 0 &&
    bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    right  <= (window.innerWidth  || document.documentElement.clientWidth)
  );
}


// ─────────────────────────────────────────────────────────────
// 7. Focus Management
// ─────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'details > summary',
].join(', ');

/**
 * Get all focusable elements within `root`.
 * @param {Element} root
 * @returns {HTMLElement[]}
 */
export function getFocusable(root) {
  return /** @type {HTMLElement[]} */ (
    [...root.querySelectorAll(FOCUSABLE_SELECTORS)]
      .filter(el => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]'))
  );
}

/**
 * Trap keyboard focus within `container`.
 * Returns a cleanup function that removes the trap.
 * @param {Element} container
 * @returns {() => void}
 */
export function trapFocus(container) {
  const listener = (/** @type {KeyboardEvent} */ e) => {
    if (e.key !== 'Tab') return;

    const focusable = getFocusable(container);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', listener);
  return () => container.removeEventListener('keydown', listener);
}

/**
 * Focus the first focusable element inside `container`.
 * @param {Element} container
 */
export function focusFirst(container) {
  const focusable = getFocusable(container);
  if (focusable.length > 0) focusable[0].focus();
}


// ─────────────────────────────────────────────────────────────
// 8. CSS Custom Property Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Read a CSS custom property value from `el` (or :root if omitted).
 * @param {string}  property  — e.g. '--accent-primary'
 * @param {Element} [el=document.documentElement]
 * @returns {string}
 */
export function getCSSVar(property, el = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(property).trim();
}

/**
 * Set a CSS custom property on `el` (or :root if omitted).
 * @param {string}  property
 * @param {string}  value
 * @param {Element} [el=document.documentElement]
 */
export function setCSSVar(property, value, el = document.documentElement) {
  /** @type {HTMLElement} */ (el).style.setProperty(property, value);
}

/**
 * Set multiple CSS custom properties at once.
 * @param {Record<string, string>} vars
 * @param {Element}                [el=document.documentElement]
 */
export function setCSSVars(vars, el = document.documentElement) {
  for (const [property, value] of Object.entries(vars)) {
    /** @type {HTMLElement} */ (el).style.setProperty(property, value);
  }
}


// ─────────────────────────────────────────────────────────────
// 9. Animation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Animate `el` using the Web Animations API.
 * Returns the Animation object (call .cancel() or .finish() as needed).
 * @param {Element}              el
 * @param {Keyframe[]}           keyframes
 * @param {KeyframeAnimationOptions} options
 * @returns {Animation}
 */
export function animate(el, keyframes, options) {
  return el.animate(keyframes, { fill: 'forwards', ...options });
}

/**
 * Fade `el` in over `duration` ms.
 * @param {Element} el
 * @param {number}  [duration=200]
 * @returns {Animation}
 */
export function fadeIn(el, duration = 200) {
  show(el);
  return animate(el,
    [{ opacity: 0 }, { opacity: 1 }],
    { duration, easing: 'ease-out' }
  );
}

/**
 * Fade `el` out over `duration` ms, then hide it.
 * @param {Element} el
 * @param {number}  [duration=150]
 * @returns {Promise<void>}
 */
export function fadeOut(el, duration = 150) {
  return animate(el,
    [{ opacity: 1 }, { opacity: 0 }],
    { duration, easing: 'ease-in' }
  ).finished.then(() => hide(el));
}

/**
 * Wait for `el`'s next CSS transition to complete.
 * @param {Element} el
 * @returns {Promise<void>}
 */
export function afterTransition(el) {
  return new Promise(resolve => {
    const handler = () => { el.removeEventListener('transitionend', handler); resolve(); };
    el.addEventListener('transitionend', handler, { once: true });
    // Fallback if no transition is running
    const duration = parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0;
    setTimeout(resolve, duration + 50);
  });
}


// ─────────────────────────────────────────────────────────────
// 10. Clipboard
// ─────────────────────────────────────────────────────────────

/**
 * Copy `text` to the clipboard.
 * Falls back to execCommand for older browsers.
 * @param {string} text
 * @returns {Promise<boolean>} true on success
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand
    }
  }
  // Legacy fallback
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}


// ─────────────────────────────────────────────────────────────
// 11. Theme Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get the active Zolto theme id.
 * @returns {string}
 */
export const getTheme = () =>
  document.documentElement.getAttribute('data-theme') ?? 'dark';

/**
 * Set the active Zolto theme id.
 * @param {string} theme
 */
export const setTheme = (theme) =>
  document.documentElement.setAttribute('data-theme', theme);

/**
 * Get the active preview mode.
 * @returns {string}
 */
export const getPreviewMode = () =>
  document.documentElement.getAttribute('data-preview-mode') ?? 'live';

/**
 * Set the active preview mode.
 * @param {'live' | 'focus' | 'split'} mode
 */
export const setPreviewMode = (mode) =>
  document.documentElement.setAttribute('data-preview-mode', mode);


// ─────────────────────────────────────────────────────────────
// 12. String → HTML helpers (used by renderers)
// ─────────────────────────────────────────────────────────────

/**
 * HTML-escape a string for safe insertion into innerHTML.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * HTML-escape a string for use as an attribute value.
 * Stricter than escapeHtml — also escapes backtick.
 * @param {string} str
 * @returns {string}
 */
export function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

/**
 * Strip all HTML tags from a string.
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Truncate a string to `max` characters, appending `…` if needed.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}


// ─────────────────────────────────────────────────────────────
// 13. File Download Helper
// ─────────────────────────────────────────────────────────────

/**
 * Trigger a browser file download with the given content.
 * @param {string} filename  — e.g. 'document.md'
 * @param {string} content   — file content as string
 * @param {string} [mimeType='text/plain']
 */
export function downloadFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Clean up after the download is initiated
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
