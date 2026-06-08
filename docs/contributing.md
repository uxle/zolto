# Contributing to Zolto

**File:** `docs/contributing.md`
**Version:** 8.1.0 · Infinity Architecture
**Cross-references:** `docs/architecture.md` · `docs/roadmap.md` · `zolto/specs/`

---

## Table of Contents

1. [Welcome](#1-welcome)
2. [Code of Conduct](#2-code-of-conduct)
3. [Getting Started](#3-getting-started)
4. [Project Structure Quick Reference](#4-project-structure-quick-reference)
5. [Development Workflow](#5-development-workflow)
6. [Coding Standards](#6-coding-standards)
7. [CSS Standards](#7-css-standards)
8. [AST & Parser Rules](#8-ast--parser-rules)
9. [Renderer Rules](#9-renderer-rules)
10. [Writing Tests](#10-writing-tests)
11. [Adding a New Directive](#11-adding-a-new-directive)
12. [Adding a New Diagram Type](#12-adding-a-new-diagram-type)
13. [Adding a New Component Variant](#13-adding-a-new-component-variant)
14. [Adding a New Theme](#14-adding-a-new-theme)
15. [Writing a Plugin](#15-writing-a-plugin)
16. [Documentation Standards](#16-documentation-standards)
17. [Pull Request Process](#17-pull-request-process)
18. [Commit Message Format](#18-commit-message-format)
19. [Reporting Bugs](#19-reporting-bugs)
20. [Requesting Features](#20-requesting-features)

---

## 1. Welcome

Thank you for contributing to Zolto. This document covers everything you need to contribute code, tests, documentation, or bug reports.

Zolto is a vanilla JavaScript project — no React, no Vue, no bundler in development. If you know HTML, CSS, and modern ES module JavaScript, you already have everything you need to contribute.

Before opening a pull request, please read this document in full. The rules here exist to keep the codebase consistent, the AST stable, and the renderer deterministic. PRs that violate the rules in §6–§9 will be returned for revision regardless of how good the feature is.

---

## 2. Code of Conduct

Be direct, be respectful, be constructive. Specifically:

- Critique code and design, not people.
- When you disagree with a decision, explain your reasoning with evidence — benchmarks, spec citations, concrete examples.
- When your PR is rejected or returned for revision, ask why and engage with the feedback.
- No dismissive language, no hostility, no gatekeeping based on experience level.

Issues and PRs that violate these norms will be closed without comment.

---

## 3. Getting Started

### Prerequisites

| Tool | Minimum version | Purpose |
|------|----------------|---------|
| Node.js | 20 LTS | Development server, test runner, linter |
| npm | 10 | Package management |
| Git | 2.40 | Version control |
| A modern browser | Chrome 120 / Firefox 121 / Safari 17 | Running the app |

No native build tools (Rust, Python, C compiler) are required. No Docker.

### Setup

```bash
# Clone
git clone https://github.com/zolto/zolto.git
cd zolto

# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev

# Run the full test suite
npm test

# Run linter
npm run lint

# Run formatter
npm run format

# Type check (JSDoc-based, no TypeScript compilation)
npm run typecheck
```

### npm scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Static file server on port 3000 with live reload |
| `npm test` | Run all test suites via Node.js test runner |
| `npm run test:watch` | Re-run tests on file change |
| `npm run test:coverage` | Tests with V8 coverage report |
| `npm run test:update-snapshots` | Regenerate renderer snapshot files |
| `npm run lint` | ESLint across all `js/` files |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier across `js/`, `css/`, `zolto/` |
| `npm run typecheck` | JSDoc type checking via `tsc --checkJs` |
| `npm run build` | Production bundle via esbuild |
| `npm run docs` | Regenerate `zolto/specs/` from source JSDoc |

---

## 4. Project Structure Quick Reference

```
js/parser/       ← Tokenizer, Lexer, Parser, AST, Validator, Transformer
js/renderer/     ← ZoltoRenderer and all sub-renderers
js/editor/       ← Editor surface, cursor, selection, shortcuts
js/preview/      ← Preview pane, virtual DOM, live renderer
js/export/       ← HTML, PDF, Markdown, text, JSON exporters
js/components/   ← Runtime JS for interactive UI components
js/utils/        ← Shared utilities (debounce, events, DOM, logger)
css/base/        ← Reset, typography, CSS custom properties
css/layouts/     ← Editor, preview, sidebar, workspace chrome
css/components/  ← Per-component stylesheets
css/themes/      ← Theme token overrides
zolto/grammar/   ← Formal grammar files
zolto/specs/     ← Language specification documents
zolto/examples/  ← Sample .zl documents
plugins/         ← Plugin system
tests/           ← All test suites
docs/            ← Architecture, roadmap, contributing, changelog
```

Full dependency rules are in `docs/architecture.md` §18. The short version: layers only depend downward. `js/parser/` never imports from `js/renderer/`. `js/renderer/` never imports from `js/editor/`. Violating this is a blocking review issue.

---

## 5. Development Workflow

### Branching

| Branch | Purpose |
|--------|---------|
| `main` | Stable, always releasable |
| `dev` | Integration branch for upcoming minor release |
| `feature/description` | New features — branch from `dev` |
| `fix/description` | Bug fixes — branch from `main` for patches, `dev` for pre-release fixes |
| `docs/description` | Documentation only changes |
| `perf/description` | Performance improvements |
| `refactor/description` | Refactors with no behaviour change |

All PRs target `dev` unless they are patch bug fixes for `main`.

### Typical feature workflow

```bash
git checkout dev
git pull origin dev
git checkout -b feature/my-feature

# make changes
npm test
npm run lint
npm run typecheck

git add .
git commit -m "feat(parser): add @timeline directive"
git push origin feature/my-feature
# open pull request targeting dev
```

---

## 6. Coding Standards

### Language

ES2022+. Use features that are natively available in the target browsers (Chrome 120, Firefox 121, Safari 17) without transpilation. Do not use TypeScript source files — use JSDoc annotations for types. The CI runs `tsc --checkJs` to validate them.

### Module system

ES modules only (`import` / `export`). No CommonJS (`require`). Every file is a module.

### Style rules (enforced by ESLint + Prettier)

```js
// ✅ Correct
const result = computeValue(input);
const items  = list.map(item => transform(item));

// ❌ Wrong — var, no semicolons, double quotes
var result = computeValue(input)
const items = list.map(function(item) { return transform(item) })
```

- `const` by default; `let` when reassignment is necessary; never `var`
- Single quotes for strings
- Semicolons required
- 2-space indentation
- Arrow functions for callbacks
- No `==` — use `===` always
- No `any` in JSDoc types — be specific
- Maximum line length: 120 characters

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Variables & functions | `camelCase` | `parseHeading`, `nodeCount` |
| Classes | `PascalCase` | `ZoltoParser`, `ASTFactory` |
| Constants (module-level) | `SCREAMING_SNAKE` | `MAX_NESTING_DEPTH` |
| CSS classes | `kebab-case` with `zolto-` prefix | `zolto-card-outline` |
| CSS custom properties | `--kebab-case` | `--accent-primary` |
| File names | `kebab-case.js` | `syntax-highlighter.js` |
| Test files | `{name}.test.js` | `parser.test.js` |

### No magic numbers

```js
// ❌ Wrong
if (ctx.depth > 32) throw new Error('Too deep');

// ✅ Correct
const MAX_NESTING_DEPTH = 32;
if (ctx.depth > MAX_NESTING_DEPTH) throw new Error('Too deep');
```

All numeric constants that carry semantic meaning must be named.

### Error handling

Never swallow errors silently. Either:
- Return an `ErrorNode` (parser/renderer context — user-visible failure)
- Throw with a descriptive message (programming error — should never happen at runtime)
- Log a warning and degrade gracefully (non-critical path)

```js
// ✅ Parser context — return ErrorNode, don't throw
if (!ZoltoComponentRuntime.has(node.componentName)) {
  return ASTFactory.createErrorNode('E006', node.line,
    `Component "${node.componentName}" is not defined.`);
}

// ✅ Programming error — should never happen
if (!node.id) {
  throw new Error(`[ASTFactory] Node missing id. This is a bug. Node: ${JSON.stringify(node)}`);
}
```

### Logging

Use `js/utils/logger.js` — never `console.log` directly in production paths.

```js
import { logger } from '../utils/logger.js';

logger.debug('Parser', 'Parsing heading at line', node.line);
logger.warn('Renderer', 'Unknown node type', node.type);
logger.error('Storage', 'IndexedDB unavailable', err);
```

`logger.debug` is stripped in production builds. `logger.warn` and `logger.error` always emit.

---

## 7. CSS Standards

### Never hardcode values

Every colour, spacing value, shadow, border-radius, transition, and font must come from a CSS custom property defined in `css/base/variables.css`.

```css
/* ❌ Wrong */
.zolto-card {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 16px;
  color: #f1f5f9;
}

/* ✅ Correct */
.zolto-card {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--text-main);
}
```

### Theme sheets only override tokens

`css/themes/*.css` may only contain `:root` or `[data-theme]` CSS custom property declarations. No component rules, no selectors other than `:root` and `[data-theme="name"]`.

```css
/* ✅ Correct — themes/midnight.css */
[data-theme="midnight"] {
  --bg-app:    #0a0a1a;
  --bg-canvas: #0d0d1f;
  --text-main: #e2e8f0;
}

/* ❌ Wrong — themes must not override component styles */
[data-theme="midnight"] .zolto-card {
  border: 1px solid #6366f1;
}
```

### Class naming

All Zolto-rendered classes carry the `zolto-` prefix. No exceptions. This prevents collisions with user-authored class names in embedded HTML.

Modifier classes follow the pattern `zolto-{component}-{modifier}`:

```
zolto-card               ← base
zolto-card-outline       ← variant modifier
zolto-card-primary       ← intent modifier
zolto-card-glass         ← style modifier
```

### Animation rules

All animations must use only `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, or any property that triggers layout.

```css
/* ✅ Correct — compositor only */
@keyframes zolto-fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ❌ Wrong — triggers layout */
@keyframes zolto-expand {
  from { height: 0; }
  to   { height: auto; }
}
```

Add `will-change: transform, opacity` only while the animation is active. Remove it on `animationend`.

### No `!important`

`!important` is banned across all stylesheets. If specificity is the problem, restructure the selector — don't force override.

---

## 8. AST & Parser Rules

These rules are the most critical in the codebase. Violations break V8 Hidden Class stability and introduce subtle deoptimisations that are hard to detect and hard to fix.

### Rule 1 — Always use `ASTFactory`

Never create AST node objects directly. Every node must be constructed through `ASTFactory`.

```js
// ❌ Wrong — raw object literal
const node = {
  type: 'Heading',
  id: generateId(),
  level: 2,
  text: 'Hello',
};

// ✅ Correct
import { ASTFactory } from '../parser/ast.js';
const node = ASTFactory.createHeading(id, line, 'Hello', null);
```

This rule is enforced by a lint rule (`no-restricted-syntax` on object literals with a `type` key matching any `ZOLTONodeTypes` value).

### Rule 2 — Same property layout, always

When adding a new field to an existing node type, add it to `ASTFactory` with a `null` default. Never add it only to some call sites.

```js
// ASTFactory.createHeading — adding a new `subtitle` field
static createHeading(id, line, text, inline) {
  return {
    type:     'Heading',
    id,
    line,
    text,
    inline,
    anchor:   null,
    classes:  [],
    attrs:    {},
    flags:    0,
    subtitle: null,   // ← new field — null default, always present
  };
}
```

### Rule 3 — `null` sentinels, never missing keys

Optional fields are always present with a `null` value. They are never absent from the object.

```js
// ❌ Wrong — missing key breaks Hidden Class
if (node.title) {
  return { type: 'MathBlock', content, title: node.title };
} else {
  return { type: 'MathBlock', content };
}

// ✅ Correct — key always present
return { type: 'MathBlock', content, title: node.title ?? null };
```

### Rule 4 — Arrays are always arrays

Collection fields (`children`, `nodes`, `items`, `edges`, `params`) are always `[]` — never `null`, never `undefined`.

### Rule 5 — The parser never touches `inline` or `ast`

`node.inline` and `node.ast` are lazy fields. The parser creates them as `null`. Only the transformer sets them. The renderer checks for `null` before using them. The parser must not set these fields.

### Rule 6 — No import from `js/renderer/` in `js/parser/`

The parser and transformer have zero knowledge of rendering. They produce an AST. What happens to the AST is not their concern.

### Rule 7 — Validator returns `ErrorNode`, never throws

Parser validation failures produce `ErrorNode` instances in the AST. They do not throw. The application must remain functional even when a document contains invalid syntax.

---

## 9. Renderer Rules

### Rule 1 — The renderer is pure

`ZoltoRenderer.render(doc)` is a pure function. Given the same AST, it always returns the same HTML string. It must not:
- Access `document`, `window`, or any DOM API
- Read from or write to any external state
- Produce different output on repeated calls

This rule enables the renderer to be used server-side, in workers, and in tests without a browser environment.

### Rule 2 — Build HTML with string concatenation only

No `document.createElement`. No `innerHTML` reads. No template literal DOM manipulation. Only string concatenation and `Array.join('')`.

```js
// ✅ Correct
renderCard(node, ctx) {
  const body = this.renderNodes(node.children, ctx);
  return `<div class="zolto-card ${escapeAttr(node.variant)}"
               data-id="${escapeAttr(node.id)}">${body}</div>`;
}

// ❌ Wrong
renderCard(node, ctx) {
  const el = document.createElement('div');
  el.className = 'zolto-card';
  return el.outerHTML;
}
```

### Rule 3 — Always escape user content

All text content that comes from the document source must be HTML-escaped before insertion into the output string. Use `escapeHtml(str)` from `js/utils/helpers.js`.

```js
// ❌ Wrong — XSS vector
return `<p class="zolto-p">${node.text}</p>`;

// ✅ Correct
return `<p class="zolto-p">${escapeHtml(node.text)}</p>`;
```

Attribute values must use `escapeAttr(str)`.

### Rule 4 — Never crash on unknown nodes

Unknown node types must render as `renderErrorNode(node, 'R001')` — not throw. The rest of the document must render normally.

### Rule 5 — Update `zolto/specs/renderer.md` for any output change

If your change alters the HTML or SVG structure of any rendered node — new class names, new wrapper elements, new `data-*` attributes, new ARIA attributes — you must update `zolto/specs/renderer.md` to match. The spec is the contract. The spec and the code must always agree.

### Rule 6 — Update renderer snapshot tests

Every node type has a snapshot test in `tests/renderer/`. If you change the output of any node type, run `npm run test:update-snapshots` and commit the updated snapshots alongside your code changes.

---

## 10. Writing Tests

Source: `tests/`

Zolto uses Node.js's built-in test runner (`node:test`) with the built-in assertion library (`node:assert`). No Jest, no Mocha, no Vitest.

```js
import { test, describe } from 'node:test';
import assert             from 'node:assert/strict';
```

### Test file location

| What you're testing | Test file location |
|--------------------|-------------------|
| Tokenizer | `tests/parser/tokenizer.test.js` |
| Lexer | `tests/parser/lexer.test.js` |
| Parser | `tests/parser/parser.test.js` |
| Transformer | `tests/parser/transformer.test.js` |
| Validator | `tests/parser/validator.test.js` |
| Renderer — a specific node type | `tests/renderer/{node-type}.test.js` |
| Editor behaviour | `tests/editor/{feature}.test.js` |
| Export format | `tests/export/{format}.test.js` |

### Parser test pattern

```js
import { test, describe } from 'node:test';
import assert             from 'node:assert/strict';
import { ZoltoParser }    from '../../js/parser/parser.js';

const parser = new ZoltoParser();

describe('Heading', () => {
  test('parses level-1 heading', () => {
    const doc = parser.parse('# Hello');
    assert.equal(doc.nodes.length, 1);
    assert.equal(doc.nodes[0].type, 'Heading');
    assert.equal(doc.nodes[0].level, 1);
    assert.equal(doc.nodes[0].text, 'Hello');
  });

  test('assigns anchor from text', () => {
    const doc = parser.parse('# Newton\'s Laws');
    assert.equal(doc.nodes[0].anchor, 'newtons-laws');
  });
});
```

### Renderer snapshot test pattern

```js
import { test, describe }  from 'node:test';
import assert              from 'node:assert/strict';
import { ZoltoParser }     from '../../js/parser/parser.js';
import { ZoltoTransformer} from '../../js/parser/transformer.js';
import { ZoltoRenderer }   from '../../js/renderer/renderer.js';
import { readSnapshot,
         writeSnapshot }   from '../helpers/snapshot.js';

const pipeline = (source) => {
  const ast = new ZoltoParser().parse(source);
  const doc = new ZoltoTransformer().transform(ast);
  return new ZoltoRenderer({ theme: 'dark' }).render(doc);
};

describe('Heading renderer', () => {
  test('h1 snapshot', () => {
    const html = pipeline('# Hello World');
    assert.equal(html, readSnapshot('heading-h1'));
  });
});
```

Snapshot files live in `tests/renderer/snapshots/`. They are committed to the repository. When output intentionally changes, update them with `npm run test:update-snapshots`.

### Coverage requirements

All new parser node types: **100% branch coverage**.
All new renderer node types: **snapshot test required**.
All new export formats: **round-trip test required** (source → export → verify key content).
All bug fixes: **regression test required** (a test that would have caught the bug).

---

## 11. Adding a New Directive

Adding a new `@directive` block to the language requires changes in six places. All six are required — a PR that changes fewer will be rejected.

### Step 1 — Grammar

Add the directive rule to the appropriate grammar file in `zolto/grammar/`:

```
blocks.zol    ← block-level directives (@grid, @card, @diagram, …)
inline.zol    ← inline directives
math.zol      ← math-specific blocks
components.zol← component system directives
```

### Step 2 — AST node definition

Add a new `createX` factory method to `ASTFactory` in `js/parser/ast.js`:

```js
static createMyBlock(id, line, title, children) {
  return {
    type:     'MyBlock',       // must be a string in ZOLTONodeTypes
    id,
    line,
    title:    title ?? null,
    children: children ?? [],
    classes:  [],
    attrs:    {},
    flags:    0,
  };
}
```

Add the type string to `ZOLTONodeTypes`:

```js
export const ZOLTONodeTypes = Object.freeze({
  // … existing types …
  MY_BLOCK: 'MyBlock',
});
```

### Step 3 — Parser

Add the parsing logic to `js/parser/parser.js`. The parser should call `ASTFactory.createMyBlock(...)` — never create raw objects.

### Step 4 — Validator

Add type-checking logic to `js/parser/validator.js`. Define what props are required, what types they must be, and what error codes to emit for violations.

### Step 5 — Renderer

Add a render method to `js/renderer/renderer.js` (or the appropriate sub-renderer):

```js
renderMyBlock(node, ctx) {
  const body = this.renderNodes(node.children, ctx);
  return `<div class="zolto-my-block" data-id="${escapeAttr(node.id)}">
    ${node.title ? `<div class="zolto-my-block-title">${escapeHtml(node.title)}</div>` : ''}
    <div class="zolto-my-block-body">${body}</div>
  </div>`;
}
```

Register it in the dispatch table:

```js
case 'MyBlock': return this.renderMyBlock(node, ctx);
```

### Step 6 — Specification & tests

- Add the directive syntax to `zolto/specs/syntax.md`
- Add the AST node shape to `zolto/specs/ast.md`
- Add the HTML output to `zolto/specs/renderer.md`
- Add CSS classes to `css/components/` (new file if needed)
- Add parser tests to `tests/parser/parser.test.js`
- Add renderer snapshot test to `tests/renderer/my-block.test.js`
- Add an example to `zolto/examples/basic.zol`

---

## 12. Adding a New Diagram Type

### Step 1 — Register the type

Add the type string to `ZOLTODiagramTypes` in `js/parser/ast.js`:

```js
export const ZOLTODiagramTypes = Object.freeze({
  // … existing types …
  MY_DIAGRAM: 'my-diagram',
});
```

### Step 2 — Parser

In `js/parser/parser.js`, add parsing logic that converts the diagram body text into nodes and edges on the `Diagram` AST node. Diagram nodes and edges use `ASTFactory.createDiagramNode()` and `ASTFactory.createDiagramEdge()`.

### Step 3 — Diagram renderer

Register the diagram type in `js/renderer/diagram-renderer.js`:

```js
import { MyDiagramLayout } from './layouts/my-diagram-layout.js';

DiagramRenderer.register('my-diagram', (node, ctx) => {
  const layout = MyDiagramLayout.compute(node.nodes, node.edges);
  return buildSVG(layout, node, ctx);
});
```

Create `js/renderer/layouts/my-diagram-layout.js` with the layout algorithm.

### Step 4 — Specification & tests

- Add syntax examples to `zolto/specs/syntax.md` (Diagrams section)
- Add SVG output spec to `zolto/specs/renderer.md` (§7)
- Add parser tests in `tests/parser/`
- Add renderer snapshot tests in `tests/renderer/`
- Add an example to `zolto/examples/basic.zol`

---

## 13. Adding a New Component Variant

Component variants (size, tone, shape) are defined in `zolto/specs/components.md`. To add a new variant value:

1. Add the value to the variant enum in `js/parser/ast.js` (`ZOLTOComponentVariants`).
2. Add the CSS modifier class to the appropriate stylesheet in `css/components/`.
3. Register the class mapping in `js/renderer/component-renderer.js` in the variant class map.
4. Document the new value in `zolto/specs/components.md`.
5. Add a test in `tests/renderer/component-renderer.test.js`.

---

## 14. Adding a New Theme

1. Create `css/themes/{name}.css`. It must only contain `[data-theme="{name}"]` overrides for CSS custom properties defined in `css/base/variables.css`.

2. Add the theme to the `themes` array in `js/settings.js`:

```js
export const AVAILABLE_THEMES = ['light', 'dark', 'midnight', 'oled', 'your-theme'];
```

3. Add a `<link>` tag for the new theme in `index.html`.

4. Add the theme name to the `theme` option in `ZoltoRendererOptions` in `js/renderer/renderer.js`.

5. Document the theme in `README.md` §9.

6. Add a snapshot test: render a heading with the new theme and commit the snapshot.

---

## 15. Writing a Plugin

Plugins are ES modules with an `install` function. They interact with Zolto only through the `ZoltoPluginAPI` object passed to `install`. Direct imports of internal modules are not permitted in plugins.

```js
// plugins/my-plugin.js

export default {
  name:    'my-plugin',
  version: '1.0.0',

  install(api) {
    // Register a custom renderer for a new node type
    api.renderer.register('MyNode', (node, ctx) => {
      return `<div class="my-plugin-node">${node.text}</div>`;
    });

    // Register a custom diagram type
    api.diagrams.register('my-diagram', (node, ctx) => {
      return `<svg class="my-diagram"><!-- … --></svg>`;
    });

    // Add a command palette entry
    api.ui.addPaletteCommand({
      id:      'my-plugin.insert-widget',
      label:   'Insert My Widget',
      icon:    '🧩',
      execute: () => api.editor.insertAtCursor('@my-widget\n@/my-widget'),
    });
  },

  uninstall(api) {
    api.renderer.unregister('MyNode');
    api.diagrams.unregister('my-diagram');
  },
};
```

### Plugin rules

- Plugins may not import from `js/parser/`, `js/renderer/`, `js/editor/`, or any internal module.
- All plugin behaviour must go through `ZoltoPluginAPI`.
- `uninstall` must cleanly reverse everything `install` did.
- Plugins must not store references to internal objects that outlive the `install` call.
- Plugins must handle their own errors — a throwing plugin callback will be caught, the plugin will be uninstalled, and a warning will be logged.

### Publishing a plugin

Community plugins should be published to npm with:
- Package name: `zolto-plugin-{name}` or `@scope/zolto-plugin-{name}`
- `"keywords": ["zolto", "zolto-plugin"]` in `package.json`
- A `zolto` key in `package.json` with `"type": "plugin"` and `"entrypoint": "./index.js"`

---

## 16. Documentation Standards

### Spec files (`zolto/specs/`)

All four spec files (`syntax.md`, `ast.md`, `renderer.md`, `components.md`) are canonical references, not tutorials. They document what the system does, not how to learn it.

- Every directive must have a syntax example.
- Every AST node must have a TypeScript-style interface block.
- Every rendered node must have an HTML/SVG output example.
- Tables of valid values must be exhaustive.
- Examples must be correct — they are tested.

When changing the parser or renderer, update the spec **in the same PR**. Never leave the spec out of date.

### JSDoc

All exported functions, classes, and methods must have JSDoc. Types must be specific — no `@param {any}` or `@returns {object}`.

```js
/**
 * Creates a Heading AST node.
 * @param {string}            id      — unique node ID (from IDGen)
 * @param {number}            line    — 1-based source line number
 * @param {string}            text    — plain text content
 * @param {InlineNode[]|null} inline  — parsed inline nodes (null until transformed)
 * @returns {Heading}
 */
static createHeading(id, line, text, inline) { … }
```

### `docs/changelog.md`

Every PR that ships a user-visible change must include a changelog entry. See `docs/changelog.md` for format.

---

## 17. Pull Request Process

### Before opening a PR

- [ ] `npm test` passes — no failures, no skipped tests
- [ ] `npm run lint` passes — zero lint errors
- [ ] `npm run typecheck` passes — zero type errors
- [ ] `npm run format` has been run — no unformatted files
- [ ] Spec files updated if parser or renderer output changed
- [ ] Snapshot files updated if renderer output changed (`npm run test:update-snapshots`)
- [ ] Changelog entry added if user-visible change
- [ ] New feature has tests (parser tests + renderer snapshot)
- [ ] Bug fix has a regression test

### PR description

Every PR must include:

```
## What
Brief description of what changed.

## Why
The reason for the change. Link to issue if applicable.

## How
Key implementation decisions. Especially any trade-offs made.

## Testing
What tests were added or updated.

## Spec changes
Which spec files were updated (or "none" if no output changed).
```

### Review process

1. CI runs: lint, typecheck, test suite. All must pass before a human reviewer looks at it.
2. At least one maintainer review is required for merge.
3. Changes to `js/parser/ast.js` (ASTFactory, ZOLTONodeTypes) require two maintainer reviews.
4. Changes to `zolto/specs/` require the corresponding code change in the same PR.
5. Reviewer approval does not expire — a PR approved before the latest push must be re-approved if the push changes logic (not just formatting).

### Merge strategy

Squash merge into `dev`. The squash commit message follows the commit format in §18. Feature branches are deleted after merge.

---

## 18. Commit Message Format

Zolto uses **Conventional Commits**.

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or directive |
| `fix` | Bug fix |
| `perf` | Performance improvement with no behaviour change |
| `refactor` | Code restructure with no behaviour change |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `chore` | Build scripts, CI, dependency updates |
| `revert` | Reverting a previous commit |

### Scopes

| Scope | Covers |
|-------|--------|
| `parser` | `js/parser/` |
| `renderer` | `js/renderer/` |
| `editor` | `js/editor/` |
| `preview` | `js/preview/` |
| `export` | `js/export/` |
| `components` | `js/components/` |
| `plugins` | `plugins/` |
| `css` | `css/` |
| `spec` | `zolto/specs/` |
| `grammar` | `zolto/grammar/` |
| `tests` | `tests/` |
| `docs` | `docs/` |
| `deps` | Dependency updates |

### Examples

```
feat(parser): add @quiz block directive

fix(renderer): escape HTML in diagram node labels

perf(parser): skip inline parsing when InlineFlags bitmask is 0

docs(spec): update renderer.md for new zolto-card-glass class

test(renderer): add snapshot tests for @presentation slides

chore(deps): bump katex to 0.16.11
```

### Breaking changes

Breaking changes carry a `!` after the type/scope and a `BREAKING CHANGE:` footer:

```
feat(parser)!: rename @callout to @admonition

BREAKING CHANGE: @callout directive is no longer supported.
Replace all @callout blocks with @admonition.
Migration script: scripts/migrate-callout.js
```

---

## 19. Reporting Bugs

Open an issue with the following template:

```
**Zolto version:** 8.1.0
**Browser:** Chrome 124 / macOS 14.4

**Description**
What went wrong.

**Minimal reproduction**
The shortest .zl source that triggers the bug:

    # Hello
    @math
      \frac{1}{2
    @/math

**Expected behaviour**
What should have happened.

**Actual behaviour**
What actually happened. Include the error node output or console error if applicable.

**Additional context**
Screenshots, console logs, anything else relevant.
```

### Before filing a bug

- Confirm the behaviour is still present on the latest `main` commit.
- Search existing issues for duplicates.
- If the bug is in the parser, check whether the source is valid Zolto syntax first (use `npm run zolto ast your-file.zl`).

---

## 20. Requesting Features

Open an issue with:

```
**Feature request**

**What problem does this solve?**
Describe the use case. "I want X" is less useful than "When I try to do Y, I can't because Z".

**Proposed syntax (if applicable)**
How would a user write this in a .zl document?

**Proposed output (if applicable)**
What HTML/SVG should be rendered?

**Alternatives considered**
Other approaches you thought of and why they're worse.

**Willingness to implement**
Are you able to submit a PR for this? (not required, but helpful)
```

### Feature request guidelines

- Check the roadmap (`docs/roadmap.md`) first — it may already be planned.
- Features that require breaking AST changes are held for the next major version.
- Features that add new syntax must follow the `@directive` pattern — no new special syntax outside the established model.
- Features in the icebox (`docs/roadmap.md` §12) are acknowledged but not currently accepting PRs — comment on the issue to signal interest.

---

*Zolto v8.1.0 · Infinity Architecture*
*Source: `docs/contributing.md` · Architecture: `docs/architecture.md` · Specs: `zolto/specs/`*
