/**
 * js/utils/helpers.js
 * Zolto v8.1.0 — General Purpose Helpers
 *
 * Miscellaneous pure utility functions used across the codebase.
 * Grouped by concern:
 *  1.  String utilities
 *  2.  Number & math utilities
 *  3.  Array utilities
 *  4.  Object utilities
 *  5.  ID & UID generation
 *  6.  URL & path helpers
 *  7.  Date & time helpers
 *  8.  Type guards
 *  9.  Colour utilities
 *  10. File & MIME helpers
 *  11. Deep equality & clone
 *  12. Error helpers
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 1. String Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Convert a string to a URL-safe slug.
 * Used for heading anchors, document slugs.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanumeric
    .trim()
    .replace(/[\s_]+/g, '-')         // spaces/underscores → hyphens
    .replace(/-{2,}/g, '-')          // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

/**
 * Capitalise the first character of a string.
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) =>
  str.length === 0 ? str : str[0].toUpperCase() + str.slice(1);

/**
 * Convert a camelCase or PascalCase string to kebab-case.
 * @param {string} str
 * @returns {string}
 */
export const camelToKebab = (str) =>
  str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

/**
 * Convert a kebab-case string to camelCase.
 * @param {string} str
 * @returns {string}
 */
export const kebabToCamel = (str) =>
  str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Convert a snake_case string to camelCase.
 * @param {string} str
 * @returns {string}
 */
export const snakeToCamel = (str) =>
  str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Pad `str` to `length` with `char` on the left.
 * @param {string | number} str
 * @param {number}          length
 * @param {string}          [char='0']
 * @returns {string}
 */
export const padStart = (str, length, char = '0') =>
  String(str).padStart(length, char);

/**
 * Trim and normalise whitespace in a string.
 * Collapses internal runs of whitespace to a single space.
 * @param {string} str
 * @returns {string}
 */
export const normalizeWhitespace = (str) =>
  str.trim().replace(/\s+/g, ' ');

/**
 * Count the number of words in a string.
 * @param {string} str
 * @returns {number}
 */
export const wordCount = (str) =>
  str.trim() === '' ? 0 : str.trim().split(/\s+/).length;

/**
 * Count the number of characters excluding whitespace.
 * @param {string} str
 * @returns {number}
 */
export const charCount = (str) =>
  str.replace(/\s/g, '').length;

/**
 * Estimate reading time in minutes (200 wpm average).
 * @param {string} text
 * @returns {number}  — rounded up minutes
 */
export const readingTime = (text) =>
  Math.max(1, Math.ceil(wordCount(text) / 200));

/**
 * Escape a string for use in a RegExp pattern.
 * @param {string} str
 * @returns {string}
 */
export const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Highlight occurrences of `query` within `text` using <mark> tags.
 * Case-insensitive.
 * @param {string} text
 * @param {string} query
 * @returns {string} HTML string
 */
export function highlight(text, query) {
  if (!query) return text;
  const escaped = escapeRegex(query);
  const re = new RegExp(`(${escaped})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

/**
 * Generate a human-readable file size string.
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @returns {string}  e.g. '4.2 KB'
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k     = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${units[i]}`;
}

/**
 * Pluralise a word based on count.
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]   defaults to singular + 's'
 * @returns {string}
 */
export const pluralise = (count, singular, plural = singular + 's') =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * Generate an ordinal string for a number (1st, 2nd, 3rd, …).
 * @param {number} n
 * @returns {string}
 */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}


// ─────────────────────────────────────────────────────────────
// 2. Number & Math Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Clamp `value` between `min` and `max`.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

/**
 * Linear interpolation between `a` and `b` at position `t` (0–1).
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Map `value` from range [inMin, inMax] to [outMin, outMax].
 * @param {number} value
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {number}
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) =>
  ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;

/**
 * Round `value` to `decimals` decimal places.
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {number}
 */
export const round = (value, decimals = 2) =>
  Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);

/**
 * Returns true if `value` is between `min` and `max` (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export const inRange = (value, min, max) => value >= min && value <= max;

/**
 * Sum an array of numbers.
 * @param {number[]} arr
 * @returns {number}
 */
export const sum = (arr) => arr.reduce((a, b) => a + b, 0);

/**
 * Average of an array of numbers.
 * @param {number[]} arr
 * @returns {number}
 */
export const average = (arr) => arr.length ? sum(arr) / arr.length : 0;

/**
 * Format a number with thousands separators.
 * @param {number} n
 * @param {string} [locale='en-US']
 * @returns {string}
 */
export const formatNumber = (n, locale = 'en-US') =>
  n.toLocaleString(locale);


// ─────────────────────────────────────────────────────────────
// 3. Array Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Remove duplicate values from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export const unique = (arr) => [...new Set(arr)];

/**
 * Remove duplicate objects by a key function.
 * @template T
 * @param {T[]}           arr
 * @param {(item: T) => any} keyFn
 * @returns {T[]}
 */
export function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Chunk an array into groups of `size`.
 * @template T
 * @param {T[]}   arr
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Flatten a nested array one level deep.
 * @template T
 * @param {(T | T[])[]} arr
 * @returns {T[]}
 */
export const flatten = (arr) => arr.flat();

/**
 * Group an array of objects by a key function.
 * @template T
 * @param {T[]}              arr
 * @param {(item: T) => string} keyFn
 * @returns {Record<string, T[]>}
 */
export function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ??= []).push(item);
    return acc;
  }, /** @type {Record<string, T[]>} */ ({}));
}

/**
 * Return the last item in an array.
 * @template T
 * @param {T[]} arr
 * @returns {T | undefined}
 */
export const last = (arr) => arr[arr.length - 1];

/**
 * Return a random item from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
export const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Shuffle an array in place (Fisher-Yates).
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Zip two arrays into an array of [a, b] pairs.
 * @template A, B
 * @param {A[]} a
 * @param {B[]} b
 * @returns {[A, B][]}
 */
export const zip = (a, b) => a.map((item, i) => [item, b[i]]);

/**
 * Create a range of integers [start, end).
 * @param {number} start
 * @param {number} end
 * @param {number} [step=1]
 * @returns {number[]}
 */
export function range(start, end, step = 1) {
  const result = [];
  for (let i = start; i < end; i += step) result.push(i);
  return result;
}


// ─────────────────────────────────────────────────────────────
// 4. Object Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Pick specific keys from an object.
 * @template T
 * @param {T}          obj
 * @param {(keyof T)[]} keys
 * @returns {Partial<T>}
 */
export function pick(obj, keys) {
  return Object.fromEntries(
    keys.filter(k => k in obj).map(k => [k, obj[k]])
  );
}

/**
 * Omit specific keys from an object.
 * @template T
 * @param {T}          obj
 * @param {(keyof T)[]} keys
 * @returns {Partial<T>}
 */
export function omit(obj, keys) {
  const set = new Set(keys);
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !set.has(k))
  );
}

/**
 * Shallow merge objects (last key wins).
 * @param {...object} objects
 * @returns {object}
 */
export const merge = (...objects) => Object.assign({}, ...objects);

/**
 * Return true if `obj` has no own enumerable keys.
 * @param {object} obj
 * @returns {boolean}
 */
export const isEmpty = (obj) => Object.keys(obj).length === 0;

/**
 * Swap keys and values in an object.
 * @param {Record<string, string>} obj
 * @returns {Record<string, string>}
 */
export const invert = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));


// ─────────────────────────────────────────────────────────────
// 5. ID & UID Generation
// ─────────────────────────────────────────────────────────────

let _uidCounter = 0;

/**
 * Generate a short sequential numeric ID.
 * Resets on page reload. Not suitable for persistence.
 * @param {string} [prefix='id']
 * @returns {string}
 */
export const uid = (prefix = 'id') => `${prefix}-${++_uidCounter}`;

/**
 * Generate a pseudo-random hex ID of `length` chars.
 * Not cryptographically secure — use for AST node IDs only.
 * @param {number} [length=8]
 * @returns {string}
 */
export function hexId(length = 8) {
  return [...Array(length)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');
}

/**
 * Generate a UUID v4-like string.
 * Uses crypto.randomUUID() when available, falls back to Math.random.
 * @returns {string}  e.g. '550e8400-e29b-41d4-a716-446655440000'
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * Generate a short collision-resistant ID for AST nodes.
 * Format: 'n_<6 hex chars>' — 16M possible values per session.
 * @returns {string}
 */
export const nodeId = () => `n_${hexId(6)}`;


// ─────────────────────────────────────────────────────────────
// 6. URL & Path Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get the file extension from a filename or path.
 * @param {string} path
 * @returns {string}  e.g. '.zl', '.md', ''
 */
export const extname = (path) => {
  const i = path.lastIndexOf('.');
  return i < 0 ? '' : path.slice(i);
};

/**
 * Get the base filename from a path (without extension).
 * @param {string} path
 * @param {string} [ext]  extension to strip
 * @returns {string}
 */
export function basename(path, ext) {
  const name = path.split(/[\\/]/).pop() ?? path;
  if (ext && name.endsWith(ext)) return name.slice(0, -ext.length);
  return name;
}

/**
 * Check if a filename has a Zolto source extension.
 * @param {string} filename
 * @returns {boolean}
 */
export const isZoltoFile = (filename) =>
  /\.(zl|zolto)$/i.test(filename);

/**
 * Build a query string from an object.
 * @param {Record<string, string | number | boolean>} params
 * @returns {string}  e.g. '?key=value&other=2'
 */
export function buildQuery(params) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `?${qs}` : '';
}

/**
 * Parse a query string into an object.
 * @param {string} [search=window.location.search]
 * @returns {Record<string, string>}
 */
export function parseQuery(search = window.location.search) {
  return Object.fromEntries(new URLSearchParams(search));
}


// ─────────────────────────────────────────────────────────────
// 7. Date & Time Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Format a Date (or timestamp) as a short human-readable string.
 * @param {Date | number} date
 * @param {string}        [locale='en-US']
 * @returns {string}  e.g. 'Jan 15, 2025'
 */
export function formatDate(date, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  }).format(new Date(date));
}

/**
 * Format a Date as a relative time string.
 * @param {Date | number} date
 * @param {string}        [locale='en-US']
 * @returns {string}  e.g. '3 hours ago', 'just now', 'in 2 days'
 */
export function timeAgo(date, locale = 'en-US') {
  const rtf   = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const delta = (new Date(date).getTime() - Date.now()) / 1000;

  const cutoffs = [
    [60,          'seconds', 1           ],
    [3600,        'minutes', 60          ],
    [86400,       'hours',   3600        ],
    [2592000,     'days',    86400       ],
    [31536000,    'months',  2592000     ],
    [Infinity,    'years',   31536000    ],
  ];

  for (const [limit, unit, divisor] of cutoffs) {
    if (Math.abs(delta) < limit) {
      return rtf.format(Math.round(delta / divisor), unit);
    }
  }
  return formatDate(date, locale);
}

/**
 * Format milliseconds as a human-readable duration string.
 * @param {number} ms
 * @returns {string}  e.g. '2h 3m', '45s', '1.2ms'
 */
export function formatDuration(ms) {
  if (ms < 1)    return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0)     return `${h}h ${m % 60}m`;
  if (m > 0)     return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/**
 * Return an ISO-8601 date string (YYYY-MM-DD) for today.
 * @returns {string}
 */
export const today = () => new Date().toISOString().slice(0, 10);


// ─────────────────────────────────────────────────────────────
// 8. Type Guards
// ─────────────────────────────────────────────────────────────

export const isString  = (v) => typeof v === 'string';
export const isNumber  = (v) => typeof v === 'number' && !Number.isNaN(v);
export const isBoolean = (v) => typeof v === 'boolean';
export const isArray   = (v) => Array.isArray(v);
export const isObject  = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isFunction = (v) => typeof v === 'function';
export const isNull    = (v) => v === null;
export const isUndefined = (v) => v === undefined;
export const isNullish = (v) => v === null || v === undefined;
export const isDefined = (v) => v !== null && v !== undefined;
export const isElement = (v) => v instanceof Element;
export const isNode    = (v) => v instanceof Node;


// ─────────────────────────────────────────────────────────────
// 9. Colour Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Parse a hex colour string to RGB components.
 * @param {string} hex  — e.g. '#6366f1' or '#fff'
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Convert RGB to a hex colour string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

/**
 * Add alpha to a hex colour — returns rgba() string.
 * @param {string} hex
 * @param {number} alpha  0–1
 * @returns {string}
 */
export function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Determine if a hex colour is "dark" (luminance < 0.5).
 * Useful for choosing foreground text colour.
 * @param {string} hex
 * @returns {boolean}
 */
export function isDarkColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const { r, g, b } = rgb;
  // Relative luminance (WCAG formula)
  const lum = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b) < 0.179;
}


// ─────────────────────────────────────────────────────────────
// 10. File & MIME Helpers
// ─────────────────────────────────────────────────────────────

const MIME_MAP = Object.freeze({
  '.zl':   'text/x-zolto',
  '.md':   'text/markdown',
  '.html': 'text/html',
  '.pdf':  'application/pdf',
  '.json': 'application/json',
  '.txt':  'text/plain',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
});

/**
 * Get MIME type for a file extension.
 * @param {string} ext  — e.g. '.zl', '.md'
 * @returns {string}
 */
export const mimeType = (ext) => MIME_MAP[ext.toLowerCase()] ?? 'application/octet-stream';

/**
 * Trigger a browser file download.
 * @param {string} filename
 * @param {string | Blob} content
 * @param {string} [mime]
 */
export function downloadFile(filename, content, mime) {
  const blob = content instanceof Blob
    ? content
    : new Blob([content], { type: mime ?? mimeType(extname(filename)) });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}


// ─────────────────────────────────────────────────────────────
// 11. Deep Equality & Clone
// ─────────────────────────────────────────────────────────────

/**
 * Deep structural equality check.
 * Handles primitives, arrays, plain objects, Date, RegExp.
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp) return a.toString() === b.toString();
  if (typeof a !== 'object' || a === null) return false;
  if (typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEqual(a[k], b[k]));
}

/**
 * Deep clone a plain-object / array / primitive value.
 * Uses structuredClone when available; falls back to JSON round-trip.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}


// ─────────────────────────────────────────────────────────────
// 12. Error Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Wrap a value in a Result-style tuple: [value, null] on success,
 * [null, error] on thrown error.
 * Useful for avoiding try/catch nesting in async code.
 *
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<[T, null] | [null, Error]>}
 */
export async function attempt(promise) {
  try {
    return [await promise, null];
  } catch (err) {
    return [null, err instanceof Error ? err : new Error(String(err))];
  }
}

/**
 * Assert that a value is not null or undefined.
 * Throws a descriptive error if it is.
 * @template T
 * @param {T | null | undefined} value
 * @param {string}               [message]
 * @returns {T}
 */
export function assertDefined(value, message = 'Expected a defined value') {
  if (value === null || value === undefined) {
    throw new Error(`[Zolto] ${message}, got ${value}`);
  }
  return value;
}

/**
 * Unreachable code guard — throws at runtime with a descriptive message.
 * Use in switch/if exhaustive checks.
 * @param {never}  value
 * @param {string} [context]
 * @returns {never}
 */
export function assertNever(value, context = '') {
  throw new Error(
    `[Zolto] Unreachable code reached${context ? ` in ${context}` : ''}: ${JSON.stringify(value)}`
  );
}
