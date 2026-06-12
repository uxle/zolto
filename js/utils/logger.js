/**
 * js/utils/logger.js
 * Zolto v8.1.0 — Structured Logger
 *
 * Wraps console with:
 *  - Log levels: DEBUG < INFO < WARN < ERROR < SILENT
 *  - Module namespacing — every log carries a [Module] prefix
 *  - Colour-coded output in development
 *  - debug() calls stripped in production builds (tree-shaken by esbuild)
 *  - Structured log history for the in-app debug panel
 *  - Performance timing helpers
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 1. Log Level Constants
// ─────────────────────────────────────────────────────────────

/** @enum {number} */
export const LogLevel = Object.freeze({
  DEBUG:  0,
  INFO:   1,
  WARN:   2,
  ERROR:  3,
  SILENT: 4,
});

// ─────────────────────────────────────────────────────────────
// 2. Global Logger State
// ─────────────────────────────────────────────────────────────

/** Current minimum log level. Set via logger.setLevel(). */
let _level = LogLevel.DEBUG;

/** Whether to use styled console output. Auto-detected. */
let _styled = typeof window !== 'undefined';

/** In-memory ring buffer of recent log entries (max 500). */
const _history = /** @type {LogEntry[]} */ ([]);
const HISTORY_MAX = 500;

/** @typedef {{ ts: number, level: string, module: string, args: any[] }} LogEntry */

// ─────────────────────────────────────────────────────────────
// 3. Module colours (for styled output)
// ─────────────────────────────────────────────────────────────

const MODULE_COLOURS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#0ea5e9',
  '#22c55e', '#f59e0b', '#ef4444', '#14b8a6',
  '#f97316', '#a3e635',
];
const _moduleColorMap = new Map();
let   _colorIndex = 0;

/** @param {string} module @returns {string} */
function moduleColor(module) {
  if (!_moduleColorMap.has(module)) {
    _moduleColorMap.set(module, MODULE_COLOURS[_colorIndex % MODULE_COLOURS.length]);
    _colorIndex++;
  }
  return _moduleColorMap.get(module);
}

// ─────────────────────────────────────────────────────────────
// 4. Core Logger Class
// ─────────────────────────────────────────────────────────────

class Logger {
  /**
   * @param {string} module — e.g. 'Parser', 'Renderer', 'Editor'
   */
  constructor(module) {
    /** @type {string} */
    this.module = module;
  }

  // ── Core methods ──────────────────────────────────────────

  /**
   * Debug — development-only, stripped in production.
   * @param {...any} args
   */
  debug(...args) {
    if (_level > LogLevel.DEBUG) return;
    this._log('DEBUG', 'debug', '#94a3b8', ...args);
  }

  /**
   * Info — general operational messages.
   * @param {...any} args
   */
  info(...args) {
    if (_level > LogLevel.INFO) return;
    this._log('INFO', 'info', '#22c55e', ...args);
  }

  /**
   * Warn — unexpected but recoverable situations.
   * @param {...any} args
   */
  warn(...args) {
    if (_level > LogLevel.WARN) return;
    this._log('WARN', 'warn', '#f59e0b', ...args);
  }

  /**
   * Error — failures that need attention.
   * @param {...any} args
   */
  error(...args) {
    if (_level > LogLevel.ERROR) return;
    this._log('ERROR', 'error', '#ef4444', ...args);
  }

  // ── Internal dispatch ─────────────────────────────────────

  /**
   * @param {string} levelName
   * @param {'debug'|'info'|'warn'|'error'} method
   * @param {string} colour
   * @param {...any} args
   */
  _log(levelName, method, colour, ...args) {
    // Write to history
    const entry = { ts: Date.now(), level: levelName, module: this.module, args };
    _history.push(entry);
    if (_history.length > HISTORY_MAX) _history.shift();

    // Console output
    if (_styled) {
      const modColor = moduleColor(this.module);
      console[method](
        `%c[Zolto]%c[${this.module}]%c ${levelName}`,
        'color:#6366f1;font-weight:700',
        `color:${modColor};font-weight:600`,
        `color:${colour};font-weight:400`,
        ...args
      );
    } else {
      console[method](`[Zolto][${this.module}] ${levelName}`, ...args);
    }
  }

  // ── Performance timing ────────────────────────────────────

  /**
   * Start a named timer.
   * @param {string} label
   */
  time(label) {
    if (_level > LogLevel.DEBUG) return;
    console.time(`[${this.module}] ${label}`);
  }

  /**
   * End a named timer and log the elapsed time.
   * @param {string} label
   */
  timeEnd(label) {
    if (_level > LogLevel.DEBUG) return;
    console.timeEnd(`[${this.module}] ${label}`);
  }

  /**
   * Measure and log the time a synchronous function takes.
   * @template T
   * @param {string}    label
   * @param {() => T}   fn
   * @returns {T}
   */
  measure(label, fn) {
    if (_level > LogLevel.DEBUG) return fn();
    const start  = performance.now();
    const result = fn();
    const end    = performance.now();
    this.debug(`${label} took ${(end - start).toFixed(2)} ms`);
    return result;
  }

  /**
   * Measure and log the time an async function takes.
   * @template T
   * @param {string}         label
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async measureAsync(label, fn) {
    if (_level > LogLevel.DEBUG) return fn();
    const start  = performance.now();
    const result = await fn();
    const end    = performance.now();
    this.debug(`${label} took ${(end - start).toFixed(2)} ms`);
    return result;
  }

  // ── Group helpers ─────────────────────────────────────────

  /**
   * Start a collapsed console group.
   * @param {string} label
   */
  group(label) {
    if (_level > LogLevel.DEBUG) return;
    console.groupCollapsed(`[${this.module}] ${label}`);
  }

  /**
   * End a console group.
   */
  groupEnd() {
    if (_level > LogLevel.DEBUG) return;
    console.groupEnd();
  }

  // ── Table helper ──────────────────────────────────────────

  /**
   * Log tabular data.
   * @param {any} data
   * @param {string[]} [columns]
   */
  table(data, columns) {
    if (_level > LogLevel.DEBUG) return;
    console.log(`[${this.module}]`);
    console.table(data, columns);
  }

  // ── Assert ────────────────────────────────────────────────

  /**
   * Log an error if `condition` is falsy.
   * @param {boolean} condition
   * @param {string}  message
   * @param {...any}  args
   */
  assert(condition, message, ...args) {
    if (!condition) this.error(`Assertion failed: ${message}`, ...args);
  }
}


// ─────────────────────────────────────────────────────────────
// 5. Global Controls
// ─────────────────────────────────────────────────────────────

/**
 * Set the global minimum log level.
 * @param {number} level — use LogLevel enum values
 */
export function setLevel(level) {
  _level = level;
}

/**
 * Get the current log level.
 * @returns {number}
 */
export function getLevel() {
  return _level;
}

/**
 * Enable or disable styled (colour) console output.
 * @param {boolean} enabled
 */
export function setStyled(enabled) {
  _styled = enabled;
}

/**
 * Get a copy of the recent log history.
 * @returns {LogEntry[]}
 */
export function getHistory() {
  return [..._history];
}

/**
 * Clear the log history.
 */
export function clearHistory() {
  _history.length = 0;
}

/**
 * Filter log history by module name and/or level.
 * @param {{ module?: string, level?: string }} filter
 * @returns {LogEntry[]}
 */
export function filterHistory({ module, level } = {}) {
  return _history.filter(e => {
    if (module && e.module !== module) return false;
    if (level  && e.level  !== level)  return false;
    return true;
  });
}


// ─────────────────────────────────────────────────────────────
// 6. Logger Factory
// ─────────────────────────────────────────────────────────────

/** Cache so the same module name always returns the same Logger instance. */
const _loggers = new Map();

/**
 * Get (or create) a Logger for a named module.
 * This is the primary export — all modules call createLogger().
 *
 * @param {string} module
 * @returns {Logger}
 *
 * @example
 * import { createLogger } from '../utils/logger.js';
 * const logger = createLogger('Parser');
 * logger.debug('Tokenizing line', lineNumber);
 * logger.warn('Unknown directive', name);
 */
export function createLogger(module) {
  if (!_loggers.has(module)) {
    _loggers.set(module, new Logger(module));
  }
  return _loggers.get(module);
}


// ─────────────────────────────────────────────────────────────
// 7. Pre-created module loggers (shared across the codebase)
// ─────────────────────────────────────────────────────────────

export const logger = {
  app:       createLogger('App'),
  parser:    createLogger('Parser'),
  renderer:  createLogger('Renderer'),
  editor:    createLogger('Editor'),
  preview:   createLogger('Preview'),
  storage:   createLogger('Storage'),
  router:    createLogger('Router'),
  state:     createLogger('State'),
  settings:  createLogger('Settings'),
  plugins:   createLogger('Plugins'),
  export:    createLogger('Export'),
  math:      createLogger('Math'),
  diagram:   createLogger('Diagram'),
  component: createLogger('Component'),
};


// ─────────────────────────────────────────────────────────────
// 8. Production mode detection
//    esbuild replaces process.env.NODE_ENV at build time.
//    In production, level is raised to WARN automatically.
// ─────────────────────────────────────────────────────────────

if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
  setLevel(LogLevel.WARN);
  setStyled(false);
}
