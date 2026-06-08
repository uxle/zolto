# Zolto Architecture

**File:** `docs/architecture.md`
**Version:** 8.1.0 · Infinity Architecture
**Cross-references:** `zolto/specs/ast.md` · `zolto/specs/renderer.md` · `zolto/specs/components.md` · `zolto/specs/syntax.md`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Top-Level Data Flow](#2-top-level-data-flow)
3. [Layer Map](#3-layer-map)
4. [Layer 1 — Source & Storage](#4-layer-1--source--storage)
5. [Layer 2 — Parser Pipeline](#5-layer-2--parser-pipeline)
6. [Layer 3 — Document AST](#6-layer-3--document-ast)
7. [Layer 4 — Renderer Pipeline](#7-layer-4--renderer-pipeline)
8. [Layer 5 — Live Editor](#8-layer-5--live-editor)
9. [Layer 6 — Preview & Virtual DOM](#9-layer-6--preview--virtual-dom)
10. [Layer 7 — Export Pipeline](#10-layer-7--export-pipeline)
11. [Layer 8 — Component System](#11-layer-8--component-system)
12. [Layer 9 — Plugin System](#12-layer-9--plugin-system)
13. [Layer 10 — CSS & Theme System](#13-layer-10--css--theme-system)
14. [State Management](#14-state-management)
15. [Routing](#15-routing)
16. [Performance Model](#16-performance-model)
17. [Error Handling Strategy](#17-error-handling-strategy)
18. [File Dependency Graph](#18-file-dependency-graph)
19. [Key Design Decisions](#19-key-design-decisions)

---

## 1. System Overview

Zolto is a **single-page application** built entirely with vanilla JavaScript, HTML, and CSS — no framework, no build step for development, no virtual DOM library. The application runs directly in the browser from `index.html`.

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                 │
│                                                                  │
│   ┌──────────────┐        ┌──────────────────────────────────┐  │
│   │   Editor     │        │           Preview                │  │
│   │  (source)    │──────▶ │       (rendered HTML/SVG)        │  │
│   └──────────────┘        └──────────────────────────────────┘  │
│          │                                                       │
│   ┌──────▼──────────────────────────────────────────────────┐   │
│   │                   Parser Pipeline                        │   │
│   │  Tokenizer → Lexer → Parser → Validator → Transformer   │   │
│   └──────────────────────────┬──────────────────────────────┘   │
│                               │                                  │
│                        Document AST                              │
│                               │                                  │
│   ┌───────────────────────────▼──────────────────────────────┐   │
│   │                  Renderer Pipeline                        │   │
│   │  ZoltoRenderer → sub-renderers → HTML + SVG strings      │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌──────────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐   │
│   │  State       │  │  Router   │  │ Storage  │  │Plugins  │   │
│   └──────────────┘  └───────────┘  └──────────┘  └─────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Guiding principles

**No build step.** Development runs directly from the file system via `npm run dev` (a simple static server). ES modules are used natively. No transpilation, no bundling, no `.gitignore`d `dist/`.

**One data structure.** The Document AST is the single source of truth between the parser and every consumer (renderer, exporter, outline view, search index). Nothing duplicates it.

**Pure renderer.** Given the same AST, `ZoltoRenderer.render()` always produces the same HTML string. No side effects, no DOM access, no mutable state.

**Hidden Class stability.** All AST nodes are created via `ASTFactory` with identical property layouts. V8 uses one Hidden Class per node type, making property access near-free at scale.

---

## 2. Top-Level Data Flow

```
 User types in editor
         │
         ▼
  editor.js emits 'zolto:change'
         │
         ▼ (debounced 16 ms)
  live-renderer.js picks up event
         │
         ▼
  ZoltoParser.parse(source)
         │
         ▼
  ZoltoTransformer.transform(rawAST)
         │
  Document AST  ←──────────────────────────── used by:
         │                                     • outline panel
         │                                     • search index
         │                                     • word count
         │                                     • export pipeline
         ▼
  ZoltoRenderer.renderToCanvas(doc, el)
         │
  virtual-dom.js diffs previous render
         │
         ▼
  DOM patched — only changed nodes updated
         │
         ▼
  Preview visible to user
```

---

## 3. Layer Map

```
Layer 10 — CSS & Theme System          css/base/ css/layouts/ css/components/ css/themes/
Layer 9  — Plugin System               plugins/plugin-manager.js  plugins/api.js
Layer 8  — Component System            js/parser/transformer.js  js/renderer/component-renderer.js
Layer 7  — Export Pipeline             js/export/
Layer 6  — Preview & Virtual DOM       js/preview/
Layer 5  — Live Editor                 js/editor/
Layer 4  — Renderer Pipeline           js/renderer/
Layer 3  — Document AST                js/parser/ast.js
Layer 2  — Parser Pipeline             js/parser/
Layer 1  — Source & Storage            js/storage.js  js/state.js  js/settings.js
```

Each layer depends only on layers below it. No upward dependencies.

---

## 4. Layer 1 — Source & Storage

### `js/storage.js`

Persists documents to IndexedDB (primary) with localStorage as fallback. Exposes a promise-based API:

```js
await Storage.save(id, { source, meta });
const doc = await Storage.load(id);
await Storage.delete(id);
const list = await Storage.list();
```

Documents are stored as plain text (`.zl` source). The AST is never persisted — it is always rebuilt from source on load. This keeps storage compact and avoids versioning problems when the AST schema changes.

Auto-save fires 2 seconds after the last keystroke.

---

### `js/state.js`

Global reactive state. A lightweight signal/observer pattern — no external library.

```js
import { state, watch } from './js/state.js';

state.theme       // current theme id
state.document    // { id, source, ast, meta }
state.selection   // { from, to, line, col }
state.settings    // mirrors js/settings.js

watch('theme', (next) => applyTheme(next));
```

State updates are synchronous. Watchers fire synchronously after each `state.set(key, value)`. The editor and preview pane both subscribe to `state.document.source`.

---

### `js/settings.js`

User-configurable preferences. Persisted to localStorage as JSON. Defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `theme` | `dark` | Active theme ID |
| `mathBackend` | `katex` | KaTeX or MathJax |
| `codeHighlight` | `true` | Prism.js syntax colouring |
| `autoSave` | `true` | Auto-save interval |
| `previewMode` | `live` | live / split / focus |
| `fontSize` | `14` | Editor font size in px |
| `fontFamily` | `JetBrains Mono` | Editor font |
| `tabSize` | `2` | Spaces per indent |
| `wordWrap` | `true` | Editor line wrapping |
| `footnoteMode` | `bottom` | bottom / tooltip |
| `spellCheck` | `false` | Native browser spell check |

---

## 5. Layer 2 — Parser Pipeline

Source: `js/parser/`

```
 tokenizer.js  →  lexer.js  →  parser.js  →  validator.js  →  transformer.js
```

Each stage is a class that takes the output of the previous stage as input. They are composable and individually testable.

---

### `tokenizer.js` — `Tokenizer`

Reads the raw source string character by character and emits a flat `Token[]` array. A `Token` carries:

```ts
interface Token {
  type:   TokenType;   // HEADING | PARA | DIRECTIVE_OPEN | DIRECTIVE_CLOSE | INLINE | …
  raw:    string;      // original source text
  line:   number;      // 1-based line number
  col:    number;      // 1-based column number
  flags:  number;      // InlineFlags bitmask — marks which inline chars are present
}
```

**InlineFlags bitmask** — set during tokenisation so the inline parser can skip the full scan when `flags === 0`:

| Flag | Bit | Triggers inline parsing |
|------|-----|-------------------------|
| `HAS_BOLD` | 0x0001 | `**` or `__` present |
| `HAS_ITALIC` | 0x0002 | `*` or `_` present |
| `HAS_CODE` | 0x0004 | `` ` `` present |
| `HAS_MATH` | 0x0008 | `$` present |
| `HAS_LINK` | 0x0010 | `[` present |
| `HAS_IMG` | 0x0020 | `![` present |
| `HAS_MENTION` | 0x0040 | `@` present |
| `HAS_EMOJI` | 0x0080 | `:` present |
| `HAS_VAR` | 0x0100 | `{$` present |
| `HAS_COLOR` | 0x0200 | `{` present |
| `HAS_SPECIAL` | 0x0400 | `~~`, `==`, `^`, `~` present |

---

### `lexer.js` — `Lexer`

Classifies and groups the token stream. Resolves ambiguous tokens (e.g. `*` as list bullet vs italic marker), identifies directive block boundaries, and emits a `LexedToken[]` stream ready for the parser.

---

### `parser.js` — `ZoltoParser`

Recursive descent parser. Consumes the lexed token stream and builds the Document AST using only `ASTFactory` methods — never raw object literals. This is enforced by a lint rule.

The parser handles:
- All Markdown constructs (headings, paragraphs, lists, tables, code blocks, blockquotes)
- All `@directive … @/directive` blocks
- Nested structures (lists inside cards, cards inside grids, slides inside presentations)
- Inline `.zl` component invocations (`<ComponentName prop="val" />`)

The parser never touches `node.inline` or `node.ast` — those are lazy fields filled by the transformer.

---

### `validator.js` — `ZoltoValidator`

Walks the raw AST and type-checks every node against its expected schema. Unknown or malformed nodes are replaced with `ErrorNode` instances that carry a diagnostic code and message. The renderer renders these as visible inline warnings rather than crashing.

Validator error codes:

| Code | Meaning |
|------|---------|
| `V001` | Unknown directive name |
| `V002` | Required prop missing |
| `V003` | Prop value has wrong type |
| `V004` | Diagram edge references unknown node ID |
| `V005` | Component use before definition |
| `V006` | Circular component dependency detected |
| `V007` | Nesting depth exceeds maximum (32) |

---

### `transformer.js` — `ZoltoTransformer` & `ZoltoComponentRuntime`

The transformer is the last and most complex stage. It performs multiple passes over the validated AST:

**Pass 1 — Variable expansion.** Resolves `{$name}` references using `Document.variables`. Mutates `node.text` in place.

**Pass 2 — Import resolution.** Loads `@import` targets from storage and splices their nodes into the document.

**Pass 3 — Component registry population.** Walks all `ComponentDef` nodes and registers them in `ZoltoComponentRuntime`. Detects circular dependencies.

**Pass 4 — Inline parsing.** Calls `InlineParser.parse(node.text, node.flags)` for every node with an `inline` field. Stores result in `node.inline`.

**Pass 5 — Math AST building.** Calls `MathASTBuilder.parse(node.content)` for every `MathBlock` and `MathInline`. Stores result in `node.ast`.

**Pass 6 — Equation numbering.** Assigns sequential numbers to all `MathBlock` nodes with `numbered: true`. Populates `Document.mathIndex`.

**Pass 7 — Footnote resolution.** Collects all `Footnote` definitions, assigns numbers, populates `Document.footnotes`. Marks inline `footnoteRef` nodes with resolved numbers.

**Pass 8 — Heading anchor generation.** Builds unique, URL-safe `anchor` strings for all headings. Populates `Document.references`.

---

## 6. Layer 3 — Document AST

Source: `js/parser/ast.js`

The AST is the single shared data structure for the entire system. Full specification: `zolto/specs/ast.md`.

### Key design invariants

**One Hidden Class per node type.** `ASTFactory` always creates nodes with the same property keys in the same order. V8 compiles a single Hidden Class per type, making property access as fast as a C struct field lookup.

**`null` sentinels, never missing keys.** Optional fields are always declared with `null` at creation. This preserves Hidden Class stability even when optional fields are unused.

**`inline` and `ast` are lazy.** Both fields start as `null` and are filled by the transformer. The renderer checks `node.inline != null` before calling the inline renderer. This means nodes that are never visible (e.g. nodes below the fold on initial load) never pay the parsing cost.

**Arrays are always arrays.** `children`, `nodes`, `edges`, `items`, etc. are always `[]` — never `null`. Renderers call `.map()` safely without null checks.

### Module exports

```js
export {
  ASTFactory,       // All node constructors
  InlineParser,     // Text → InlineNode[]
  MathASTBuilder,   // LaTeX → MathASTNode tree
  ZOLTONodeTypes,   // Frozen enum of all type strings
  ZOLTOEdgeOperators, ZOLTOShapeTypes, ZOLTOVectorTypes,
  ZOLTOLayoutTypes, ZOLTOMDBlockTypes, ZOLTODiagramTypes,
};
```

---

## 7. Layer 4 — Renderer Pipeline

Source: `js/renderer/`

The renderer is **pure** and **stateless**. It takes a Document AST and returns an HTML string. Full specification: `zolto/specs/renderer.md`.

### Sub-renderer dispatch

`ZoltoRenderer` is the entry point. It walks `Document.nodes[]` and dispatches each node to the appropriate sub-renderer by `node.type`:

```
renderer.js         ← main dispatcher
html-renderer.js    ← Domain 1: Markdown & typography nodes
math-renderer.js    ← Domain 2: MathBlock, MathInline
diagram-renderer.js ← Domain 3: all @diagram types → SVG
                       (inline-renderer, chart, vector, layout, assessment
                        are wired directly into renderer.js in this build)
component-renderer.js ← Domain 6: ComponentUse → HTML
```

### RenderContext

A `RenderContext` object is created at the start of each `render()` call and threaded through every sub-renderer:

```ts
interface RenderContext {
  theme:             string;
  tokens:            Record<string, string>;   // CSS custom properties
  componentRegistry: ComponentRegistry;        // from ZoltoComponentRuntime
  mathIndex:         Record<string, number>;   // label → equation number
  footnotes:         Record<string, Footnote>;
  variables:         Record<string, string>;
  equationCounter:   { value: number };        // mutable, shared by reference
  animationDefs:     Map<string, Animation>;
  depth:             number;                   // nesting guard (max 32)
}
```

`RenderContext` is the only mutable object during a render pass. Everything else is read-only.

### HTML construction

All HTML is built with string concatenation — no `document.createElement`, no template literals with DOM access. This keeps the renderer usable in both browser and server/worker contexts without modification.

---

## 8. Layer 5 — Live Editor

Source: `js/editor/`

The editor is a `contenteditable` surface — not a `<textarea>`. This enables syntax highlighting to be rendered directly inside the edit area as styled `<span>` elements, without needing an overlay canvas.

### File responsibilities

| File | Role |
|------|------|
| `editor.js` | Core editor: mounts the contenteditable surface, handles `input`, `keydown`, `paste`, `cut` events, manages the line buffer |
| `cursor.js` | Tracks caret position as `{line, col, offset}`. Provides `moveTo(line, col)` for programmatic cursor placement |
| `selection.js` | Multi-cursor support, selection range queries, `getSelectedText()`, `replaceSelection()` |
| `shortcuts.js` | Keyboard shortcut registry. Default bindings: `Cmd+B` bold, `Cmd+I` italic, `Cmd+K` link, `Cmd+/` toggle comment, `Tab` indent, `Shift+Tab` dedent |
| `autocomplete.js` | Directive completion popup. Triggers on `@` and `<`. Queries the component registry for component name completions |
| `syntax-highlighter.js` | Token-based in-editor syntax colouring. Runs on every change, colorises directive keywords, math delimiters, inline markers, and string literals |
| `command-palette.js` | `Cmd+K` / `Ctrl+K` palette. Actions: New Document, Open, Save, Export, Switch Theme, Insert Diagram, Insert Math, Insert Component |

### Editor ↔ preview coupling

```
editor.js                     live-renderer.js
  └─ dispatchEvent('zolto:change', { source })
                                   └─ debounce(16ms)
                                   └─ ZoltoParser.parse(source)
                                   └─ ZoltoTransformer.transform(ast)
                                   └─ ZoltoRenderer.renderToCanvas(doc, previewEl)
                                   └─ virtual-dom.js patches previewEl
```

The event carries the full source string. The parser always does a complete re-parse — there is no incremental parsing. This is fast enough in practice because the parser processes approximately 50,000 tokens per millisecond on modern hardware.

---

## 9. Layer 6 — Preview & Virtual DOM

Source: `js/preview/`

### `preview.js`

Manages the preview pane DOM element. Mounts scroll sync between editor and preview. Handles clicks on internal links (`#anchor`), diagram node clicks, tab switches, accordion toggles, and quiz interactions.

### `virtual-dom.js`

A minimal virtual DOM differ. On each render, it receives the new HTML string from `ZoltoRenderer` and computes a diff against the previous render at the node level.

Diff strategy:

```
1. Split HTML into per-node fragments by data-id attribute
2. For each incoming node:
   a. If node.id is new → insertBefore next sibling
   b. If node content hash is unchanged → skip (no DOM write)
   c. If node content changed → replace outerHTML
3. For each old node not in incoming set → remove
```

This means a single word change in a paragraph re-renders only that paragraph's `<p>` element. A diagram change re-renders only that `<figure>`. CSS animations on unchanged nodes are not interrupted.

### `live-renderer.js`

Glue layer. Subscribes to `zolto:change`. Debounces at 16 ms (one frame). Coordinates the parser → transformer → renderer pipeline and calls `virtual-dom.js` with the result.

Also handles:
- Render error recovery (catches renderer exceptions, displays error overlay)
- Performance timing (logs render time to console in development mode)
- Lazy render triggering via `IntersectionObserver` for `zolto-lazy-placeholder` elements

---

## 10. Layer 7 — Export Pipeline

Source: `js/export/`

All exporters receive the Document AST (not the source string). They are synchronous except `pdf-export.js`.

| File | Format | Mechanism |
|------|--------|-----------|
| `html-export.js` | `.html` | Calls `ZoltoRenderer.render(doc)` with `{ sanitize: false }`, wraps in a full HTML document shell, inlines all CSS from `css/` |
| `pdf-export.js` | `.pdf` | Generates the HTML export, opens it in a hidden `<iframe>`, calls `window.print()` with a print-optimised stylesheet. Alternatively delegates to a Puppeteer server endpoint if configured |
| `markdown-export.js` | `.md` | AST walker that emits standard CommonMark Markdown. Zolto-only nodes (math, diagrams, components) are either serialised to their closest Markdown equivalent or omitted with a comment |
| `text-export.js` | `.txt` | Strips all markup. Headings get underlines. Lists get ASCII bullets. Math is rendered as plain LaTeX |
| `json-export.js` | `.json` | `JSON.stringify(documentAST, null, 2)` — full AST export for tooling integration |

### Export API

```js
import { HTMLExporter }     from './js/export/html-export.js';
import { PDFExporter }      from './js/export/pdf-export.js';
import { MarkdownExporter } from './js/export/markdown-export.js';
import { TextExporter }     from './js/export/text-export.js';
import { JSONExporter }     from './js/export/json-export.js';

const html = await HTMLExporter.export(documentAST, options);
const md   = MarkdownExporter.export(documentAST, options);
const txt  = TextExporter.export(documentAST);
const json = JSONExporter.export(documentAST);
await PDFExporter.export(documentAST, options); // triggers browser print dialog
```

---

## 11. Layer 8 — Component System

Source: `js/parser/transformer.js` (registry + resolution) · `js/renderer/component-renderer.js` (rendering)

Full specification: `zolto/specs/components.md`.

### Registry

`ZoltoComponentRuntime` is a module-level singleton:

```js
import { ZoltoComponentRuntime } from './js/parser/transformer.js';

ZoltoComponentRuntime.register('UserCard', defNode);
ZoltoComponentRuntime.has('UserCard');    // → boolean
ZoltoComponentRuntime.get('UserCard');    // → ComponentDef | null
ZoltoComponentRuntime.list();            // → string[]
ZoltoComponentRuntime.clear();           // used by tests
```

### Resolution flow

```
Document source contains <UserCard name="Alice" />
           │
     Parser creates ComponentUse node
           │
     Transformer Pass 3 runs ZoltoComponentRuntime.register()
       for each ComponentDef in the document
           │
     Renderer encounters ComponentUse node
           │
     ComponentRenderer.render(node, ctx)
           │
       ctx.componentRegistry.get(node.componentName) → ComponentDef
           │
       Merge parsedProps with ComponentDef defaults
           │
       Walk ComponentDef.children (template body)
           │
       Replace SlotOutlet nodes with ComponentUse.slots content
           │
       Recurse for nested ComponentUse nodes (depth guard: max 32)
           │
     HTML output string returned
```

### Prop system

Props are parsed from the `propsString` attribute of `ComponentUse` nodes. The prop parser supports:

```
name="string value"          → string
count=42                     → number
enabled=true / enabled=false → boolean
color=#6366f1                → string (CSS colour pass-through)
class="outline primary"      → injected onto root element's class list
style="font-size:1.2em"      → injected onto root element's style attribute
theme="dark"                 → activates a @theme block
animate="fadeSlideUp"        → triggers animation injection
```

---

## 12. Layer 9 — Plugin System

Source: `plugins/`

### `plugin-manager.js`

Manages a registry of installed plugins. Plugins are ES modules with a standard shape:

```ts
interface ZoltoPlugin {
  name:    string;
  version: string;
  install(api: ZoltoPluginAPI): void;
  uninstall?(api: ZoltoPluginAPI): void;
}
```

Install / uninstall:

```js
import { PluginManager } from './plugins/plugin-manager.js';
import MyPlugin          from './plugins/my-plugin.js';

PluginManager.install(MyPlugin);
PluginManager.uninstall('my-plugin');
PluginManager.list();    // → ZoltoPlugin[]
PluginManager.has('my-plugin');
```

### `api.js` — `ZoltoPluginAPI`

The public surface exposed to plugins. Plugins may not import internal modules directly — they must use the API object passed to `install()`.

```ts
interface ZoltoPluginAPI {
  renderer: {
    register(type: string, fn: (node, ctx) => string): void;
    unregister(type: string): void;
  };
  diagrams: {
    register(type: string, fn: (node, ctx) => string): void;
  };
  parser: {
    onToken(type: string, fn: (token, state) => void): void;
    addDirective(name: string, handler: DirectiveHandler): void;
  };
  components: {
    register(name: string, def: ComponentDef): void;
  };
  state: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
    watch(key: string, fn: (value: unknown) => void): void;
  };
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
  };
  ui: {
    addToolbarItem(item: ToolbarItem): void;
    addPaletteCommand(cmd: PaletteCommand): void;
    addContextMenuItem(item: ContextMenuItem): void;
  };
}
```

---

## 13. Layer 10 — CSS & Theme System

Source: `css/`

### Cascade order

```html
<link rel="stylesheet" href="css/base/reset.css">
<link rel="stylesheet" href="css/base/variables.css">   ← all tokens declared here
<link rel="stylesheet" href="css/base/typography.css">
<link rel="stylesheet" href="css/layouts/workspace.css">
<link rel="stylesheet" href="css/layouts/editor.css">
<link rel="stylesheet" href="css/layouts/preview.css">
<link rel="stylesheet" href="css/layouts/sidebar.css">
<link rel="stylesheet" href="css/components/card.css">
<!-- … remaining component sheets … -->
<link rel="stylesheet" href="css/themes/dark.css">      ← active theme last
```

Theme sheets only override CSS custom property values on `:root` and `[data-theme]`. They never override component rules. Swapping themes at runtime:

```js
document.documentElement.setAttribute('data-theme', 'midnight');
```

No JavaScript re-render is needed — all component colours are CSS `var()` references.

### Token architecture

Every colour, spacing, shadow, and transition value in the entire UI is a CSS custom property defined in `css/base/variables.css`. Components reference tokens only — never hardcoded values.

```css
/* variables.css — declarations */
:root {
  --accent-primary:   #6366f1;
  --bg-canvas:        #111118;
  --text-main:        #f1f5f9;
  --radius-md:        8px;
  --space-4:          1rem;
  --shadow-md:        0 4px 24px rgba(0,0,0,.35);
}

/* dark.css — overrides */
[data-theme="dark"] {
  --bg-canvas: #111118;
  --text-main: #f1f5f9;
}

/* light.css — overrides */
[data-theme="light"] {
  --bg-canvas: #ffffff;
  --text-main: #0f172a;
}

/* card.css — uses only tokens */
.zolto-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}
```

### Renderer-injected tokens

When a document declares `--token: value` overrides in its source, `ZoltoRenderer` injects a `<style id="zolto-document-tokens">` block at render time. These take precedence over the theme sheet because they come later in the cascade.

---

## 14. State Management

Source: `js/state.js`

Zolto uses a minimal signal pattern. No Proxy, no framework — just a plain object with a watcher registry.

```js
// state.js internals (simplified)
const _state  = {};
const _watchers = {};

export const state = new Proxy(_state, {
  set(target, key, value) {
    target[key] = value;
    (_watchers[key] || []).forEach(fn => fn(value));
    return true;
  }
});

export function watch(key, fn) {
  (_watchers[key] ??= []).push(fn);
}
```

### Global state shape

```ts
interface AppState {
  document: {
    id:     string | null;
    source: string;
    ast:    Document | null;
    meta:   Record<string, unknown>;
    dirty:  boolean;
  };
  theme:       string;           // active theme id
  previewMode: 'live' | 'split' | 'focus';
  selection:   { line: number; col: number; offset: number };
  settings:    UserSettings;
  plugins:     string[];         // names of installed plugins
}
```

The `document.source` field is the single source of truth for the current document. All other derived state (`ast`, preview HTML, outline) is computed from it.

---

## 15. Routing

Source: `js/router.js`

Client-side hash router. No server-side routing required — `index.html` is the only entry point.

```
#/                    → Home (recent documents)
#/new                 → New document
#/doc/{id}            → Open document by id
#/doc/{id}/export     → Export panel for document
#/settings            → Settings page
#/plugins             → Plugin manager
```

Route transitions are handled by swapping a `data-route` attribute on `<main>`. CSS `display: none` / `display: block` is toggled by the attribute selector. No JavaScript DOM insertion per route.

---

## 16. Performance Model

### Parser throughput

The tokeniser processes ~50,000 tokens/ms on a mid-range laptop. A typical 1,000-line Zolto document tokenises in under 1 ms. The full parser pipeline (tokenise → lex → parse → validate → transform) completes in 5–15 ms for documents up to 5,000 lines.

### Renderer throughput

The renderer produces ~10,000 nodes/ms. A 1,000-node document renders in under 1 ms. Math and diagram rendering are the expensive operations (KaTeX: ~0.5 ms per equation; Dagre layout: ~2–5 ms per diagram).

### Virtual DOM patch budget

The 16 ms debounce means renders target 60 fps. For typical typing scenarios (one paragraph changes), the virtual DOM patches a single `<p>` element — a 0.1 ms DOM write. Full re-renders (theme change, large paste) stay under 30 ms on modern hardware.

### Lazy rendering

Components marked `render=lazy` are deferred until they enter the viewport via `IntersectionObserver`. This keeps the initial render fast for long documents with many diagrams.

### Inline parsing fast path

If a node's `flags` bitmask is `0` (no inline markers in the text), `InlineParser` skips all scanning and returns a single `TextNode`. This applies to the majority of plain-prose paragraphs and heading text.

### Hidden Class stability

All AST nodes are created with `ASTFactory`. The same property layout every time means V8 allocates one Hidden Class per node type and never transitions it. Property access is O(1) with no hidden deoptimisation.

### CSS paint performance

All animations use `transform` and `opacity` only. These are compositor-only properties — no layout or paint is triggered. `will-change: transform, opacity` is added only while an animation is active and removed on `animationend` to avoid excessive memory reservation.

---

## 17. Error Handling Strategy

### Parser errors

Malformed syntax never throws. The validator replaces problematic nodes with `ErrorNode` instances. These render as inline yellow warning boxes in the preview. The user can continue editing.

### Renderer errors

Sub-renderers are wrapped in try/catch. On failure, the node is replaced with a `zolto-error-node` div carrying the error code and message. Other nodes render normally.

### Component errors

Missing component definitions render as `zolto-error-node` with code `E006`. Circular component dependencies are caught in transformer Pass 3 before any rendering begins.

### Storage errors

IndexedDB failures fall back to localStorage. localStorage failures emit a console warning and operate in-memory only (changes are lost on page close). The UI shows a persistent "Storage unavailable" banner.

### Plugin errors

Plugin `install()` and renderer callbacks are wrapped in try/catch. A failing plugin is automatically uninstalled and logged. Core functionality is never affected by a plugin crash.

---

## 18. File Dependency Graph

```
index.html
  └─ js/app.js
       ├─ js/router.js
       ├─ js/state.js
       ├─ js/storage.js
       ├─ js/settings.js
       ├─ js/editor/editor.js
       │    ├─ js/editor/cursor.js
       │    ├─ js/editor/selection.js
       │    ├─ js/editor/shortcuts.js
       │    ├─ js/editor/autocomplete.js
       │    ├─ js/editor/syntax-highlighter.js
       │    └─ js/editor/command-palette.js
       ├─ js/preview/preview.js
       │    ├─ js/preview/virtual-dom.js
       │    └─ js/preview/live-renderer.js
       │         ├─ js/parser/tokenizer.js
       │         ├─ js/parser/lexer.js
       │         ├─ js/parser/parser.js
       │         │    └─ js/parser/ast.js          ← ASTFactory, InlineParser, MathASTBuilder
       │         ├─ js/parser/validator.js
       │         ├─ js/parser/transformer.js
       │         └─ js/renderer/renderer.js
       │              ├─ js/renderer/html-renderer.js
       │              ├─ js/renderer/math-renderer.js
       │              ├─ js/renderer/diagram-renderer.js
       │              └─ js/renderer/component-renderer.js
       ├─ js/export/html-export.js
       ├─ js/export/pdf-export.js
       ├─ js/export/markdown-export.js
       ├─ js/export/text-export.js
       ├─ js/export/json-export.js
       └─ plugins/plugin-manager.js
            └─ plugins/api.js
```

**Strict rule:** `js/parser/` never imports from `js/renderer/`, `js/editor/`, or `js/preview/`. `js/renderer/` never imports from `js/editor/` or `js/preview/`. These layer boundaries are enforced by a lint rule (`no-restricted-imports`).

---

## 19. Key Design Decisions

### Why no framework?

Zolto's rendering loop is already a pipeline — source → AST → HTML string — that maps naturally onto a functional architecture. A framework like React or Vue would add a virtual DOM on top of a virtual DOM (the custom differ), add ~40 KB to the bundle, and constrain the renderer's output to JSX syntax. Vanilla ES modules are faster to load, easier to debug, and have zero API surface to learn.

### Why no bundler in development?

Native ES module imports work in all modern browsers. Bundling is reserved for the production `npm run build` step (esbuild, under 100 ms). Development runs directly from source. This eliminates the "why is my hot reload broken" class of problems and makes the source tree the exact running code.

### Why always re-parse on every keystroke?

Incremental parsing is complex to implement correctly and introduces subtle bugs when edit positions interact with block boundaries. Given that a full parse completes in under 5 ms for typical documents, the simpler approach — always parse from scratch — produces correct results with no special cases.

### Why store only source, not the AST?

The AST is derived data. Storing it alongside the source creates a versioning problem: when the AST schema changes (new fields, renamed types), old stored ASTs become invalid. Source text is durable and schema-agnostic. Re-deriving the AST on load takes 5–15 ms — imperceptible to the user.

### Why `ASTFactory` instead of class constructors or raw objects?

`ASTFactory` enforces three things at once: every node has the same property layout (Hidden Class stability), required fields are always present (no missing-key bugs), and optional fields default to `null` rather than being absent (no `hasOwnProperty` checks). Class constructors would achieve the same layout but add prototype chain overhead. Raw objects would break Hidden Class stability immediately.

### Why a virtual DOM differ instead of `innerHTML = html`?

Setting `innerHTML` on the entire preview element on every keystroke destroys and recreates all DOM nodes. This causes visible flicker, interrupts CSS animations, resets scroll position, and triggers expensive browser re-layouts. The virtual DOM differ keeps unchanged nodes intact. CSS animations on cards, diagrams, and presentations run uninterrupted while adjacent content changes.

### Why `contenteditable` for the editor instead of `<textarea>`?

A `<textarea>` cannot display syntax highlighting inline — it only shows plain text. Implementing a highlighting overlay (the approach taken by CodeMirror 5 and Monaco's textarea fallback) requires pixel-perfect alignment of an absolutely-positioned overlay, which breaks on zoom, high-DPI, and non-monospace fonts. A `contenteditable` surface lets the syntax highlighter inject styled `<span>` elements directly into the edit area, with no alignment problem.

---

*Zolto v8.1.0 · Infinity Architecture*
*Source: `docs/architecture.md` · Cross-references: `zolto/specs/` · Regenerate: `npm run docs`*
