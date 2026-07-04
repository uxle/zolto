# Writing Plugins

## Plugin shape

```javascript
export default {
  name:    'my-plugin',
  version: '0.1.0',

  install(api) {
    // Register a custom block renderer
    api.renderer.register('MyNode', (node, ctx) => {
      return `<div class="my-node">${node.value}</div>`;
    });
  },

  uninstall(api) {
    api.renderer.unregister('MyNode');
  },
};
```

## Registering with PluginManager

```javascript
import { PluginManager } from './plugins/core/plugin-manager.js';
import MyPlugin from './plugins/builtins/my-plugin/index.js';

PluginManager.register(MyPlugin);
PluginManager.activate('my-plugin', pluginApi);
```

## Plugin API surface (Phase 3+)

```javascript
api.renderer.register(type, fn)  // Register block renderer
api.renderer.unregister(type)    // Remove block renderer
api.parser.addBlockRule(name, rule)  // Add lexer rule
api.version                      // '2.0.0'
```

## Scaffold a new plugin

```bash
node scripts/scaffold-plugin.js my-feature
# Creates: plugins/builtins/my-feature/index.js + styles.css
```
