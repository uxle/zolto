/**
 * plugins/api.js
 * Zolto v8.1.0 — Plugin API Surface
 *
 * The PluginAPI object is passed to each plugin's install(api)
 * function. It provides a safe, versioned surface for plugins
 * to interact with Zolto without importing internal modules directly.
 *
 * API surface grouped into namespaces:
 *  api.renderer  — register/unregister custom node renderers
 *  api.diagrams  — register/unregister custom diagram types
 *  api.parser    — hook into the tokenizer and transformer passes
 *  api.editor    — register editor commands and format actions
 *  api.palette   — add commands to the command palette
 *  api.settings  — read/write user settings
 *  api.state     — read state, subscribe to changes
 *  api.storage   — access document storage
 *  api.ui        — show toasts, open dialogs
 *  api.events    — subscribe to global event bus
 *  api.version   — Zolto version string
 *
 * All subscriptions registered through the API are automatically
 * cleaned up when the plugin is uninstalled (via _cleanup()).
 * Plugins do NOT need to manually unsubscribe from anything they
 * registered through this API.
 */

'use strict';

import { ZoltoRenderer }     from '../js/renderer/renderer.js';
import { DiagramRenderer }   from '../js/renderer/diagram-renderer.js';
import { get as getSetting,
         set as setSetting,
         watch as watchSetting } from '../js/settings.js';
import { get as stateGet,
         watch as stateWatch }   from '../js/state.js';
import { bus, EVENTS,
         toastInfo, toastSuccess,
         toastWarning, toastError } from '../js/utils/events.js';
import { list as listDocs,
         load as loadDoc,
         save as saveDoc }         from '../js/storage.js';
import { registerCommand,
         unregisterCommand }       from '../js/editor/command-palette.js';
import { createLogger }            from '../js/utils/logger.js';

const logger = createLogger('Plugins');

const ZOLTO_VERSION = '8.1.0';

// ─────────────────────────────────────────────────────────────
// API Factory
// ─────────────────────────────────────────────────────────────

/**
 * Create a PluginAPI instance for a named plugin.
 * Each plugin gets its own API instance with isolated cleanup tracking.
 * @param {string} pluginName
 * @returns {PluginAPI}
 */
export function createPluginAPI(pluginName) {
  /** @type {Array<() => void>} cleanup functions */
  const _cleanups = [];

  const track = (unsub) => { _cleanups.push(unsub); return unsub; };

  const api = {

    // ──────────────────────────────────────────────────────
    // Meta
    // ──────────────────────────────────────────────────────

    /** Zolto version string */
    version: ZOLTO_VERSION,

    /** This plugin's name */
    pluginName,

    // ──────────────────────────────────────────────────────
    // Renderer — custom node renderers
    // ──────────────────────────────────────────────────────

    renderer: {
      /**
       * Register a custom renderer for a node type.
       * @param {string}   nodeType — ZOLTONodeType string
       * @param {Function} fn       — (node, ctx) => string (HTML)
       */
      register(nodeType, fn) {
        ZoltoRenderer.registerRenderer(nodeType, fn);
        _cleanups.push(() => ZoltoRenderer.unregisterRenderer(nodeType));
        logger.debug(`[${pluginName}] Renderer registered for:`, nodeType);
      },

      /**
       * Unregister a custom renderer immediately.
       * @param {string} nodeType
       */
      unregister(nodeType) {
        ZoltoRenderer.unregisterRenderer(nodeType);
      },
    },

    // ──────────────────────────────────────────────────────
    // Diagrams — custom diagram types
    // ──────────────────────────────────────────────────────

    diagrams: {
      /**
       * Register a custom diagram type renderer.
       * @param {string}   type — e.g. 'my-diagram'
       * @param {Function} fn   — (node, ctx) => string (SVG)
       */
      register(type, fn) {
        DiagramRenderer.register(type, fn);
        _cleanups.push(() => DiagramRenderer.unregister(type));
        logger.debug(`[${pluginName}] Diagram registered:`, type);
      },

      unregister(type) {
        DiagramRenderer.unregister(type);
      },
    },

    // ──────────────────────────────────────────────────────
    // Parser — tokenizer and transformer hooks
    // ──────────────────────────────────────────────────────

    parser: {
      /**
       * Register a handler for a specific token type (fired by lexer).
       * Note: this is a bus-based hook — the tokenizer emits events
       * that plugins can intercept for custom processing.
       * @param {string}   tokenType — TokenType string
       * @param {Function} handler
       */
      onToken(tokenType, handler) {
        const unsub = bus.on(`zolto:token:${tokenType}`, handler);
        track(unsub);
        return unsub;
      },

      /**
       * Register a transformer pass to run after the standard 8 passes.
       * Receives the fully-transformed Document and returns a modified one.
       * @param {Function} fn — (doc: object) => object
       */
      addTransformPass(fn) {
        const unsub = bus.on('zolto:transform:done', (doc) => {
          try { fn(doc); } catch (e) { logger.error(`[${pluginName}] Transform pass error:`, e); }
        });
        track(unsub);
        return unsub;
      },
    },

    // ──────────────────────────────────────────────────────
    // Editor — format actions and toolbar
    // ──────────────────────────────────────────────────────

    editor: {
      /**
       * Register a custom format action handler.
       * Fires when a toolbar button with data-action="format:<name>" is clicked.
       * @param {string}   name    — e.g. 'my-format'
       * @param {Function} handler — (editorEl) => void
       */
      onFormatAction(name, handler) {
        const unsub = bus.on('zolto:format', (action) => {
          if (action === name) handler();
        });
        track(unsub);
        return unsub;
      },

      /**
       * Register a custom insert action.
       * @param {string}   name
       * @param {Function} handler
       */
      onInsertAction(name, handler) {
        const unsub = bus.on('zolto:insert', (action) => {
          if (action === name) handler();
        });
        track(unsub);
        return unsub;
      },
    },

    // ──────────────────────────────────────────────────────
    // Command Palette
    // ──────────────────────────────────────────────────────

    palette: {
      /**
       * Add a command to the command palette.
       * @param {object} command — { id, label, icon?, group?, action }
       */
      addCommand(command) {
        registerCommand({ ...command, _plugin: pluginName });
        _cleanups.push(() => unregisterCommand(command.id));
        logger.debug(`[${pluginName}] Palette command registered:`, command.label);
      },

      /**
       * Remove a previously registered command.
       * @param {string} id
       */
      removeCommand(id) {
        unregisterCommand(id);
      },
    },

    // ──────────────────────────────────────────────────────
    // Settings
    // ──────────────────────────────────────────────────────

    settings: {
      /**
       * Get a setting value.
       * @param {string} key
       * @returns {any}
       */
      get: getSetting,

      /**
       * Set a setting value.
       * @param {string} key
       * @param {any}    value
       */
      set: setSetting,

      /**
       * Watch for changes to a setting.
       * @param {string}   key
       * @param {Function} fn
       * @returns {() => void}
       */
      watch(key, fn) {
        const unsub = watchSetting(key, fn);
        track(unsub);
        return unsub;
      },
    },

    // ──────────────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────────────

    state: {
      /**
       * Read a state value.
       * @param {string} key
       * @returns {any}
       */
      get: stateGet,

      /**
       * Watch for state changes.
       * @param {string}   key
       * @param {Function} fn
       * @returns {() => void}
       */
      watch(key, fn) {
        const unsub = stateWatch(key, fn);
        track(unsub);
        return unsub;
      },
    },

    // ──────────────────────────────────────────────────────
    // Storage
    // ──────────────────────────────────────────────────────

    storage: {
      /**
       * List all stored documents.
       * @returns {Promise<object[]>}
       */
      list: listDocs,

      /**
       * Load a document by id.
       * @param {string} id
       * @returns {Promise<object | null>}
       */
      load: loadDoc,

      /**
       * Save a document.
       * @param {object} doc
       * @returns {Promise<object>}
       */
      save: saveDoc,
    },

    // ──────────────────────────────────────────────────────
    // UI — toasts and notifications
    // ──────────────────────────────────────────────────────

    ui: {
      toast:        toastInfo,
      toastSuccess,
      toastWarning,
      toastError,

      /**
       * Show a confirm dialog (native browser).
       * @param {string}  message
       * @returns {boolean}
       */
      confirm: (message) => window.confirm(message),

      /**
       * Show a prompt dialog.
       * @param {string}  message
       * @param {string}  [defaultValue]
       * @returns {string | null}
       */
      prompt: (message, defaultValue = '') => window.prompt(message, defaultValue),
    },

    // ──────────────────────────────────────────────────────
    // Events — global event bus
    // ──────────────────────────────────────────────────────

    events: {
      EVENTS,

      /**
       * Subscribe to a bus event.
       * @param {string}   event
       * @param {Function} handler
       * @returns {() => void}
       */
      on(event, handler) {
        const unsub = bus.on(event, handler);
        track(unsub);
        return unsub;
      },

      /**
       * Subscribe once to a bus event.
       * @param {string}   event
       * @param {Function} handler
       * @returns {() => void}
       */
      once(event, handler) {
        const unsub = bus.once(event, handler);
        track(unsub);
        return unsub;
      },

      /**
       * Emit an event on the bus.
       * @param {string} event
       * @param {...any}  args
       */
      emit(event, ...args) {
        bus.emit(event, ...args);
      },
    },

    // ──────────────────────────────────────────────────────
    // Logging — namespaced to this plugin
    // ──────────────────────────────────────────────────────

    log: {
      debug: (...args) => logger.debug(`[${pluginName}]`, ...args),
      info:  (...args) => logger.info(`[${pluginName}]`, ...args),
      warn:  (...args) => logger.warn(`[${pluginName}]`, ...args),
      error: (...args) => logger.error(`[${pluginName}]`, ...args),
    },

    // ──────────────────────────────────────────────────────
    // Internal — cleanup (called by PluginManager.uninstall)
    // ──────────────────────────────────────────────────────

    _cleanup() {
      for (const fn of _cleanups) {
        try { fn(); } catch { /* best effort */ }
      }
      _cleanups.length = 0;
      logger.debug(`[${pluginName}] API cleanup complete`);
    },
  };

  return api;
}
