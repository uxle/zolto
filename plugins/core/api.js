/**
 * Zolto Plugin API surface
 * The api object passed to plugin.install(api).
 * Only this surface is considered stable across minor versions.
 * Phase 3: populated with real renderer + parser hooks.
 */
export function createPluginAPI({ rendererRef, parserRef }) {
  return {
    renderer: {
      /** Register a custom block node renderer. */
      register(type, fn) { rendererRef?.registerBlock(type, fn); },
      unregister(type)   { rendererRef?.unregisterBlock(type); },
    },
    parser: {
      /** Add a new block token type to the lexer. */
      addBlockRule(name, rule) { parserRef?.addBlockRule(name, rule); },
    },
    version: '2.0.0',
  };
}
