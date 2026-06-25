/**
 * plugins/plugin-manager.js
 * Zolto v8.1.0 — Plugin Manager
 *
 * Loads, registers, activates and unloads Zolto plugins.
 * Plugins are plain ESM modules that export a default object
 * conforming to the ZoltoPlugin interface.
 *
 * Plugin lifecycle:
 *   install(api)    — called when plugin is loaded
 *   uninstall(api)  — called when plugin is unloaded
 *   activate()      — optional, called when the user enables the plugin
 *   deactivate()    — optional, called when the user disables the plugin
 *
 * Built-in plugins live in plugins/builtins/ and are always available.
 * Third-party plugins can be loaded from URLs or local file paths.
 *
 * The plugin manager is initialised in app.js after all core
 * subsystems are ready, ensuring the plugin API is fully functional.
 */

'use strict';

import { createLogger }            from '../js/utils/logger.js';
import { bus, EVENTS,
         toastSuccess, toastError } from '../js/utils/events.js';
import { get as getSetting,
         set as setSetting }       from '../js/settings.js';
import { createPluginAPI }         from './api.js';

const logger = createLogger('Plugins');

// ─────────────────────────────────────────────────────────────
// 1. Plugin Type Definition
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} ZoltoPlugin
 * @property {string}   name       — unique plugin identifier (kebab-case)
 * @property {string}   version    — semver string
 * @property {string}   [description]
 * @property {string}   [author]
 * @property {string[]} [dependencies] — names of other plugins required
 * @property {(api: PluginAPI) => void | Promise<void>}  install
 * @property {(api: PluginAPI) => void | Promise<void>}  [uninstall]
 * @property {() => void}                                [activate]
 * @property {() => void}                                [deactivate]
 */

/**
 * @typedef {object} PluginEntry
 * @property {ZoltoPlugin}  plugin
 * @property {PluginAPI}    api
 * @property {boolean}      enabled
 * @property {boolean}      installed
 * @property {'idle'|'installing'|'uninstalling'|'error'} status
 * @property {string|null}  error
 */

// ─────────────────────────────────────────────────────────────
// 2. Plugin Registry
// ─────────────────────────────────────────────────────────────

/** @type {Map<string, PluginEntry>} name → PluginEntry */
const _registry = new Map();

// ─────────────────────────────────────────────────────────────
// 3. Plugin Manager (singleton)
// ─────────────────────────────────────────────────────────────

export const PluginManager = {

  // ── Install ─────────────────────────────────────────────

  /**
   * Install a plugin from a module object.
   * @param {ZoltoPlugin} plugin
   * @returns {Promise<boolean>}
   */
  async install(plugin) {
    const name = plugin.name;

    if (!name || typeof name !== 'string') {
      logger.error('Plugin install failed: missing name');
      return false;
    }

    if (_registry.has(name)) {
      logger.warn('Plugin already installed:', name);
      return true;
    }

    // Check dependencies
    if (Array.isArray(plugin.dependencies)) {
      for (const dep of plugin.dependencies) {
        if (!_registry.has(dep)) {
          logger.error(`Plugin "${name}" requires "${dep}" which is not installed`);
          toastError(`Plugin "${name}" requires "${dep}" — install it first.`);
          return false;
        }
      }
    }

    const api   = createPluginAPI(name);
    const entry = {
      plugin,
      api,
      enabled:   false,
      installed: false,
      status:    'installing',
      error:     null,
    };
    _registry.set(name, entry);

    try {
      await plugin.install(api);
      entry.installed = true;
      entry.status    = 'idle';
      logger.info(`Plugin installed: ${name} v${plugin.version}`);
      bus.emit(EVENTS.PLUGIN_INSTALL, { name, version: plugin.version });
      return true;
    } catch (err) {
      entry.status = 'error';
      entry.error  = err.message ?? String(err);
      logger.error(`Plugin install error: ${name}`, err);
      toastError(`Plugin "${name}" failed to install: ${entry.error}`);
      _registry.delete(name);
      return false;
    }
  },

  /**
   * Install a plugin from a URL (dynamic import).
   * @param {string} url — URL to the plugin ESM module
   * @returns {Promise<boolean>}
   */
  async installFromURL(url) {
    try {
      const module = await import(/* @vite-ignore */ url);
      const plugin = module.default ?? module;
      if (!plugin || typeof plugin.install !== 'function') {
        throw new Error('Module does not export a valid Zolto plugin');
      }
      return this.install(plugin);
    } catch (err) {
      logger.error('Failed to load plugin from URL:', url, err);
      toastError(`Failed to load plugin from ${url}: ${err.message}`);
      return false;
    }
  },

  // ── Uninstall ───────────────────────────────────────────

  /**
   * Uninstall a plugin by name.
   * @param {string} name
   * @returns {Promise<boolean>}
   */
  async uninstall(name) {
    const entry = _registry.get(name);
    if (!entry) {
      logger.warn('Plugin not found:', name);
      return false;
    }

    if (entry.enabled) await this.disable(name);

    entry.status = 'uninstalling';
    try {
      if (typeof entry.plugin.uninstall === 'function') {
        await entry.plugin.uninstall(entry.api);
      }
      entry.api._cleanup();
      _registry.delete(name);
      logger.info('Plugin uninstalled:', name);
      bus.emit(EVENTS.PLUGIN_UNINSTALL, { name });

      // Remove from enabled list in settings
      const enabled = getSetting('enabledPlugins').filter(n => n !== name);
      setSetting('enabledPlugins', enabled);

      return true;
    } catch (err) {
      entry.status = 'error';
      entry.error  = err.message ?? String(err);
      logger.error('Plugin uninstall error:', name, err);
      toastError(`Plugin "${name}" failed to uninstall cleanly.`);
      return false;
    }
  },

  // ── Enable / Disable ─────────────────────────────────────

  /**
   * Enable (activate) an installed plugin.
   * @param {string} name
   * @returns {boolean}
   */
  enable(name) {
    const entry = _registry.get(name);
    if (!entry || !entry.installed) {
      logger.warn('Cannot enable plugin — not installed:', name);
      return false;
    }
    if (entry.enabled) return true;

    try {
      entry.plugin.activate?.();
      entry.enabled = true;

      // Persist to settings
      const enabled = [...new Set([...getSetting('enabledPlugins'), name])];
      setSetting('enabledPlugins', enabled);

      logger.info('Plugin enabled:', name);
      return true;
    } catch (err) {
      logger.error('Plugin enable error:', name, err);
      return false;
    }
  },

  /**
   * Disable (deactivate) an installed plugin.
   * @param {string} name
   * @returns {boolean}
   */
  disable(name) {
    const entry = _registry.get(name);
    if (!entry || !entry.enabled) return false;

    try {
      entry.plugin.deactivate?.();
      entry.enabled = false;

      const enabled = getSetting('enabledPlugins').filter(n => n !== name);
      setSetting('enabledPlugins', enabled);

      logger.info('Plugin disabled:', name);
      return true;
    } catch (err) {
      logger.error('Plugin disable error:', name, err);
      return false;
    }
  },

  // ── Query ────────────────────────────────────────────────

  /**
   * Check if a plugin is installed.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) { return _registry.has(name); },

  /**
   * Get a plugin entry by name.
   * @param {string} name
   * @returns {PluginEntry | null}
   */
  get(name) { return _registry.get(name) ?? null; },

  /**
   * List all installed plugins.
   * @returns {{ name: string, version: string, enabled: boolean, status: string }[]}
   */
  list() {
    return [..._registry.values()].map(e => ({
      name:        e.plugin.name,
      version:     e.plugin.version,
      description: e.plugin.description ?? '',
      enabled:     e.enabled,
      installed:   e.installed,
      status:      e.status,
      error:       e.error,
    }));
  },

  // ── Built-in Plugin Loader ────────────────────────────────

  /**
   * Load all built-in plugins from plugins/builtins/.
   * Called by initPlugins() on app boot.
   */
  async loadBuiltins() {
    const builtins = [
      // Uncomment as built-ins are added:
      // () => import('./builtins/word-count.js'),
      // () => import('./builtins/focus-mode.js'),
    ];

    for (const loader of builtins) {
      try {
        const mod    = await loader();
        const plugin = mod.default ?? mod;
        await this.install(plugin);
        this.enable(plugin.name);
      } catch (err) {
        logger.error('Failed to load builtin plugin:', err);
      }
    }
  },

  /**
   * Load and enable all plugins listed in `names`.
   * Called by app.js with the enabledPlugins setting value.
   * @param {string[]} names
   */
  async loadEnabled(names) {
    await this.loadBuiltins();

    for (const name of names ?? []) {
      if (!_registry.has(name)) {
        logger.debug('Skipping unknown plugin from settings:', name);
        continue;
      }
      this.enable(name);
    }
  },

  /**
   * Uninstall all installed plugins. Used during app teardown / tests.
   */
  async clear() {
    for (const name of [..._registry.keys()]) {
      await this.uninstall(name);
    }
  },
};
