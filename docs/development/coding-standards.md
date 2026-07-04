# Coding Standards

## File size

**Hard limit: 800 lines per file.** Split when approaching this limit.
The entire Phase 2 engine ships in 9 files, none exceeding 800 lines.

## ES modules

```javascript
// ✅ Correct
import { parse } from './parser.js';
export function compile(src) { ... }

// ❌ Never
const { parse } = require('./parser.js');
module.exports = { compile };
```

## Equality

Always `===`, never `==`.

## Variables

`const` everywhere possible. `let` only when reassignment is required.
Never `var`.

## Null vs undefined

Optional scalar fields are `null` when absent — never `undefined`.
This keeps AST node shapes stable (V8 hidden class optimisation).

## Arrays

Collection fields on AST nodes are always `[]` — never `null`.
Renderers can safely call `.map()` without null-checks.

## Error handling in engine code

- Parser / renderer: return an `ErrorNode` or `zl-broken-ref` span — never throw
- Public API: throw `TypeError` for wrong argument types only

## Token mutations in the lexer

Never `tokens.pop()` — use `tokens.splice(lastRealIndex(tokens), 1)` so
blank tokens between the target token and the array tail don't cause
the wrong token to be removed.

## CSS classes

All rendered HTML classes use the `zl-` prefix. No exceptions.
This prevents collisions with user-authored CSS.
