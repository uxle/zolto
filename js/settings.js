/**
 * js/settings.js
 * Zolto v8.1.0 — User Settings Management
 *
 * Manages all user-configurable preferences.
 * Persisted to localStorage as JSON under 'zolto:settings'.
 * Reactive — watchers fire when any setting changes.
 * Provides typed defaults, validation, and migration support.
 */

'use strict';

import { createLogger }         from './utils/logger.js';
import { bus, EVENTS }          from './utils/events.js';
import { deepEqual, deepClone } from './utils/helpers.js';
import { set as setState,
         get as getState }                from './state.js';

const logger = createLogger('Settings');

const LS_KEY = 'zolto:settings';

// ─────────────────────────────────────────────────────────────
// 1. Settings Schema & Defaults
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} UserSettings
 *
 * Editor
 * @property {string}  theme           — 'dark' | 'light' | 'midnight' | 'oled'
 * @property {string}  previewMode     — 'live' | 'focus' | 'split'
 * @property {number}  fontSize        — editor font size in px (10–24)
 * @property {string}  fontFamily      — editor font family
 * @property {number}  tabSize         — spaces per indent level (2 | 4)
 * @property {boolean} wordWrap        — wrap long lines in editor
 * @property {boolean} lineNumbers     — show line numbers (future)
 * @property {boolean} autoCloseBrackets — auto-close <>, [], {}
 * @property {boolean} highlightActiveLine
 *
 * Preview
 * @property {boolean} scrollSync      — sync editor + preview scroll
 * @property {string}  mathBackend     — 'katex' | 'mathjax'
 * @property {boolean} codeHighlight   — syntax-highlight code blocks
 * @property {string}  footnoteMode    — 'bottom' | 'tooltip'
 * @property {boolean} smartTypography — smart quotes / dashes
 *
 * Save & auto-save
 * @property {boolean} autoSave        — enable auto-save
 * @property {number}  autoSaveDelay   — ms delay (500–10000)
 *
 * Accessibility
 * @property {boolean} reducedMotion   — override prefers-reduced-motion
 * @property {boolean} highContrast    — additional contrast boost
 * @property {string}  spellCheck      — 'off' | 'editor' | 'all'
 *
 * Interface
 * @property {boolean} sidebarOpen     — sidebar visible on start
 * @property {string}  sidebarPanel    — 'files' | 'outline' | 'search'
 * @property {number}  sidebarWidth    — px width (180–400)
 * @property {number}  splitRatio      — editor split % (20–80)
 * @property {boolean} showWordCount   — show word count in toolbar
 *
 * Plugins & Advanced
 * @property {string[]} enabledPlugins — list of enabled plugin names
 * @property {boolean}  devMode        — enable dev tools / debug panel
 */

/** @type {UserSettings} */
export const DEFAULTS = Object.freeze({
  // Editor
  theme:               'dark',
  previewMode:         'live',
  fontSize:            14,
  fontFamily:          'JetBrains Mono',
  tabSize:             2,
  wordWrap:            true,
  lineNumbers:         false,
  autoCloseBrackets:   true,
  highlightActiveLine: true,

  // Preview
  scrollSync:          true,
  mathBackend:         'katex',
  codeHighlight:       true,
  footnoteMode:        'bottom',
  smartTypography:     true,

  // Save
  autoSave:            true,
  autoSaveDelay:       2000,

  // Accessibility
  reducedMotion:       false,
  highContrast:        false,
  spellCheck:          'off',

  // Interface
  sidebarOpen:         true,
  sidebarPanel:        'files',
  sidebarWidth:        240,
  splitRatio:          50,
  showWordCount:       true,

  // Advanced
  enabledPlugins:      [],
  devMode:             false,
});

// ─────────────────────────────────────────────────────────────
// 2. Validation Rules
// ─────────────────────────────────────────────────────────────

/**
 * Each validator returns the value if valid, or the default if not.
 * @type {Partial<Record<keyof UserSettings, (v: any) => any>>}
 */
const VALIDATORS = {
  theme:           (v) => ['dark', 'light', 'midnight', 'oled'].includes(v) ? v : DEFAULTS.theme,
  previewMode:     (v) => ['live', 'focus', 'split'].includes(v) ? v : DEFAULTS.previewMode,
  fontSize:        (v) => (typeof v === 'number' && v >= 10 && v <= 24) ? v : DEFAULTS.fontSize,
  tabSize:         (v) => [2, 4].includes(v) ? v : DEFAULTS.tabSize,
  autoSaveDelay:   (v) => (typeof v === 'number' && v >= 500 && v <= 10000) ? v : DEFAULTS.autoSaveDelay,
  mathBackend:     (v) => ['katex', 'mathjax'].includes(v) ? v : DEFAULTS.mathBackend,
  footnoteMode:    (v) => ['bottom', 'tooltip'].includes(v) ? v : DEFAULTS.footnoteMode,
  spellCheck:      (v) => ['off', 'editor', 'all'].includes(v) ? v : DEFAULTS.spellCheck,
  sidebarPanel:    (v) => ['files', 'outline', 'search'].includes(v) ? v : DEFAULTS.sidebarPanel,
  sidebarWidth:    (v) => (typeof v === 'number' && v >= 180 && v <= 400) ? v : DEFAULTS.sidebarWidth,
  splitRatio:      (v) => (typeof v === 'number' && v >= 20 && v <= 80) ? v : DEFAULTS.splitRatio,
  enabledPlugins:  (v) => Array.isArray(v) ? v : DEFAULTS.enabledPlugins,
  fontFamily:      (v) => typeof v === 'string' && v.length > 0 ? v : DEFAULTS.fontFamily,
};

// ─────────────────────────────────────────────────────────────
// 3. In-Memory Settings Object
// ─────────────────────────────────────────────────────────────

/** @type {UserSettings} */
let _settings = deepClone(DEFAULTS);

/** @type {Map<string, Set<Function>>} */
const _watchers = new Map();

// ─────────────────────────────────────────────────────────────
// 4. Internal Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validate a single setting value.
 * @param {keyof UserSettings} key
 * @param {any} value
 * @returns {any}
 */
function validate(key, value) {
  const validator = VALIDATORS[key];
  return validator ? validator(value) : value;
}

/**
 * Persist current settings to localStorage.
 */
function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(_settings));
  } catch (e) {
    logger.warn('Failed to persist settings to localStorage', e);
  }
}

/**
 * Notify watchers and sync to global state.
 * @param {keyof UserSettings} key
 * @param {any} next
 * @param {any} prev
 */
function notify(key, next, prev) {
  const handlers = _watchers.get(key);
  if (handlers) {
    for (const fn of [...handlers]) {
      try { fn(next, prev); } catch (e) {
        logger.error(`Settings watcher error for "${key}"`, e);
      }
    }
  }

  // Sync the full settings object to global state
  setState('settings', { ..._settings });

  // Emit on the bus
  // SETTINGS_CHANGE is emitted by state.js _bridgeToEventBus — do not double-emit here.
}


// ─────────────────────────────────────────────────────────────
// 5. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Get a setting value.
 * @template {keyof UserSettings} K
 * @param {K} key
 * @returns {UserSettings[K]}
 */
export function get(key) {
  return _settings[key];
}

/**
 * Get all settings (shallow clone).
 * @returns {UserSettings}
 */
export function getAll() {
  return { ..._settings };
}

/**
 * Set a single setting value.
 * Validates, persists, and notifies watchers.
 * @template {keyof UserSettings} K
 * @param {K}              key
 * @param {UserSettings[K]} value
 */
export function set(key, value) {
  const validated = validate(key, value);
  const prev      = _settings[key];

  if (deepEqual(prev, validated)) return;

  _settings[key] = validated;
  persist();
  notify(key, validated, prev);

  logger.debug(`settings.set(${key})`, validated);

  // Apply side effects immediately
  _applySideEffect(key, validated);
}

/**
 * Update multiple settings at once (batched).
 * Only notifies once per changed key.
 * @param {Partial<UserSettings>} patch
 */
export function setMany(patch) {
  const changed = [];

  for (const [key, value] of Object.entries(patch)) {
    const validated = validate(/** @type {keyof UserSettings} */ (key), value);
    const prev      = _settings[key];
    if (!deepEqual(prev, validated)) {
      _settings[key] = validated;
      changed.push({ key, value: validated, prev });
    }
  }

  if (changed.length === 0) return;

  persist();

  for (const { key, value, prev } of changed) {
    notify(/** @type {keyof UserSettings} */ (key), value, prev);
    _applySideEffect(/** @type {keyof UserSettings} */ (key), value);
  }
}

/**
 * Reset a single setting to its default.
 * @param {keyof UserSettings} key
 */
export function reset(key) {
  set(key, DEFAULTS[key]);
}

/**
 * Reset ALL settings to defaults.
 */
export function resetAll() {
  setMany(deepClone(DEFAULTS));
}

/**
 * Watch for changes to a specific setting.
 * @template {keyof UserSettings} K
 * @param {K}        key
 * @param {(next: UserSettings[K], prev: UserSettings[K]) => void} fn
 * @param {{ immediate?: boolean }} [options]
 * @returns {() => void} unsubscribe
 */
export function watch(key, fn, options = {}) {
  if (!_watchers.has(key)) _watchers.set(key, new Set());
  _watchers.get(key).add(fn);
  if (options.immediate) fn(_settings[key], undefined);
  return () => {
    const s = _watchers.get(key);
    if (s) s.delete(fn);
  };
}


// ─────────────────────────────────────────────────────────────
// 6. Side Effects
//    Certain settings require immediate DOM/CSS changes when set.
// ─────────────────────────────────────────────────────────────

/**
 * @param {keyof UserSettings} key
 * @param {any}                value
 */
function _applySideEffect(key, value) {
  const root = document.documentElement;

  switch (key) {
    case 'theme':
      root.setAttribute('data-theme', value);
      break;

    case 'previewMode':
      root.setAttribute('data-preview-mode', value);
      break;

    case 'sidebarOpen':
      root.setAttribute('data-sidebar', value ? 'open' : 'closed');
      break;

    case 'fontSize':
      document.getElementById('zolto-editor')
        ?.style.setProperty('font-size', `${value}px`);
      break;

    case 'fontFamily':
      document.getElementById('zolto-editor')
        ?.style.setProperty('font-family', `"${value}", monospace`);
      break;

    case 'tabSize':
      document.getElementById('zolto-editor')
        ?.style.setProperty('tab-size', String(value));
      break;

    case 'sidebarWidth':
      root.style.setProperty('--sidebar-width', `${value}px`);
      break;

    case 'splitRatio': {
      const editorPane  = document.getElementById('zolto-editor-pane');
      const previewPane = document.getElementById('zolto-preview-pane');
      if (editorPane)  editorPane.style.flex  = `0 0 ${value}%`;
      if (previewPane) previewPane.style.flex = `0 0 ${100 - value}%`;
      break;
    }

    case 'reducedMotion':
      root.setAttribute('data-reduced-motion', value ? 'true' : 'false');
      break;

    case 'highContrast':
      root.setAttribute('data-high-contrast', value ? 'true' : 'false');
      break;

    case 'spellCheck': {
      const editor = document.getElementById('zolto-editor');
      if (editor) editor.spellcheck = value !== 'off';
      break;
    }

    case 'wordWrap': {
      const editor = document.getElementById('zolto-editor');
      if (editor) {
        /** @type {HTMLElement} */ (editor).style.whiteSpace =
          value ? 'pre-wrap' : 'pre';
      }
      break;
    }
  }
}


// ─────────────────────────────────────────────────────────────
// 7. Migration
//    Handles settings format changes between versions.
// ─────────────────────────────────────────────────────────────

const CURRENT_SETTINGS_VERSION = 2;

/**
 * Migrate settings from an older format to the current one.
 * @param {object} raw   — raw parsed settings from localStorage
 * @returns {UserSettings}
 */
function migrate(raw) {
  const version = raw.__version ?? 1;

  if (version < 2) {
    // v1 → v2: renamed 'editorFontSize' to 'fontSize'
    if (raw.editorFontSize !== undefined) {
      raw.fontSize = raw.editorFontSize;
      delete raw.editorFontSize;
    }
    // v1 → v2: renamed 'autoSaveInterval' to 'autoSaveDelay'
    if (raw.autoSaveInterval !== undefined) {
      raw.autoSaveDelay = raw.autoSaveInterval;
      delete raw.autoSaveInterval;
    }
    logger.info('Migrated settings v1 → v2');
  }

  raw.__version = CURRENT_SETTINGS_VERSION;
  return raw;
}


// ─────────────────────────────────────────────────────────────
// 8. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Load settings from localStorage, validate, and apply all side effects.
 * Call once during app bootstrap (app.js).
 */
export function initSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed   = JSON.parse(raw);
      const migrated = migrate(parsed);

      // Merge stored values over defaults, validate each key
      for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
        const stored = migrated[key];
        _settings[key] = stored !== undefined
          ? validate(/** @type {keyof UserSettings} */ (key), stored)
          : defaultVal;
      }

      logger.info('Settings loaded from localStorage');
    } else {
      logger.info('No saved settings found — using defaults');
    }
  } catch (e) {
    logger.warn('Failed to load settings — using defaults', e);
    _settings = deepClone(DEFAULTS);
  }

  // Sync to global state
  setState('settings', { ..._settings });

  // Apply all side effects for the loaded settings
  for (const key of Object.keys(_settings)) {
    _applySideEffect(/** @type {keyof UserSettings} */ (key), _settings[key]);
  }

  logger.debug('Settings initialised', _settings);
}

/**
 * Export settings as a JSON string (for backup / transfer).
 * @returns {string}
 */
export function exportSettings() {
  return JSON.stringify({ ..._settings, __version: CURRENT_SETTINGS_VERSION }, null, 2);
}

/**
 * Import settings from a JSON string.
 * @param {string} json
 */
export function importSettings(json) {
  try {
    const parsed = JSON.parse(json);
    setMany(parsed);
    logger.info('Settings imported successfully');
  } catch (e) {
    logger.error('Failed to import settings', e);
    throw new Error('Invalid settings JSON');
  }
}

// ─────────────────────────────────────────────────────────────
// 9. Available Theme & Font Lists (used by settings UI)
// ─────────────────────────────────────────────────────────────

export const AVAILABLE_THEMES = Object.freeze([
  { id: 'dark',     label: 'Dark'     },
  { id: 'light',    label: 'Light'    },
  { id: 'midnight', label: 'Midnight' },
  { id: 'oled',     label: 'OLED'     },
]);

export const AVAILABLE_FONTS = Object.freeze([
  { id: 'JetBrains Mono',  label: 'JetBrains Mono'  },
  { id: 'Fira Code',       label: 'Fira Code'        },
  { id: 'Cascadia Code',   label: 'Cascadia Code'    },
  { id: 'Consolas',        label: 'Consolas'         },
  { id: 'Menlo',           label: 'Menlo'            },
  { id: 'monospace',       label: 'System Monospace' },
]);

export const AVAILABLE_MATH_BACKENDS = Object.freeze([
  { id: 'katex',   label: 'KaTeX (faster)'   },
  { id: 'mathjax', label: 'MathJax (compat)' },
]);
