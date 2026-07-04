/**
 * Zolto Plugin Manager
 * Registers, loads, activates and deactivates plugins.
 * Phase 3: first plugins (math, diagrams) will use this API.
 */

const registry = new Map(); // name → { meta, instance }

export const PluginManager = {
  /** @param {{ name:string, version:string, install(api):void }} plugin */
  register(plugin) {
    if (!plugin.name) throw new Error('Plugin must have a name');
    if (registry.has(plugin.name)) {
      console.warn(`[Zolto] Plugin "${plugin.name}" already registered — overwriting`);
    }
    registry.set(plugin.name, { meta: plugin, active: false });
  },

  activate(name, api) {
    const entry = registry.get(name);
    if (!entry) throw new Error(`Plugin "${name}" is not registered`);
    if (entry.active) return;
    try { entry.meta.install(api); entry.active = true; }
    catch (e) { console.error(`[Zolto] Plugin "${name}" failed to activate:`, e); }
  },

  deactivate(name, api) {
    const entry = registry.get(name);
    if (!entry || !entry.active) return;
    entry.meta.uninstall?.(api);
    entry.active = false;
  },

  isActive: name => registry.get(name)?.active ?? false,
  list:     ()   => [...registry.keys()],
  has:      name => registry.has(name),
};
