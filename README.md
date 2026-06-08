# Zolto

**Version:** 8.1.0 · Infinity Architecture
**License:** MIT

Zolto (`.zl`) is a unified visual markup language and live editor. It replaces five separate tools — a Markdown editor, a LaTeX renderer, a diagramming tool, a charting library, and a component system — with a single coherent syntax and a real-time split-pane workspace.

---

## Table of Contents

1. [What Is Zolto?](#1-what-is-zolto)
2. [Quick Start](#2-quick-start)
3. [Project Structure](#3-project-structure)
4. [Language Overview](#4-language-overview)
5. [Editor](#5-editor)
6. [Parser Pipeline](#6-parser-pipeline)
7. [Renderer](#7-renderer)
8. [Component System](#8-component-system)
9. [Themes & Design Tokens](#9-themes--design-tokens)
10. [Export](#10-export)
11. [Plugins](#11-plugins)
12. [CSS Architecture](#12-css-architecture)
13. [Tests](#13-tests)
14. [Specs & Documentation](#14-specs--documentation)
15. [Contributing](#15-contributing)

---

## 1. What Is Zolto?

Zolto is built on **two rules**:

> **Rule 1 — Everything you know from Markdown works unchanged.**
> Headings, bold, italic, lists, blockquotes, code blocks, links, images — all standard Markdown is fully supported as-is.
>
> **Rule 2 — Everything else uses `@directive … @/directive` blocks.**
> Math, diagrams, charts, layouts, components, and assessments all follow the same `@keyword … @/keyword` pattern.

That's it. A complete Zolto document in 10 lines:

```zolto
---
title: Quick Demo
---

# Newton's Second Law

The net force equals mass times acceleration: $F = ma$.

@math name="Newton's Second Law"
  \mathbf{F} = m\mathbf{a}
@/math

[tip] Always draw a free-body diagram before solving force problems. [/tip]
```

### Six Capability Domains

| Domain | What it covers |
|--------|----------------|
| **1 — Rich Markdown & Typography** | Standard Markdown + admonitions, tabs, cards, callouts, steps, accordions |
| **2 — LaTeX-level Mathematics** | `@math`, inline `$…$`, multi-line environments, function plots, interactive sliders |
| **3 — Mermaid-level Diagramming** | Flowchart, sequence, state machine, ER, mindmap, Gantt, timeline, kanban, circuit, atom, and more |
| **4 — Native SVG & Vector Graphics** | `@vector` scenes, layers, artboards, connectors, camera |
| **5 — Spatial Layout System** | `@grid`, `@flex`, `@canvas`, `@whiteboard`, `@presentation`, `@split`, `@panel` |
| **6 — Component & Template System** | `@component`, `@template`, `@macro`, `@animate`, slots, props, variants, themes |

---

## 2. Quick Start

```bash
# Install dependencies
npm install

# Start the live development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

Open `index.html` in your browser. The live editor opens with a split-pane: source on the left, rendered preview on the right. Changes appear within 16 ms.

### Hello World

Create a new file and paste:

```zolto
---
title: My First Zolto Document
theme: dark
---

# Hello, Zolto

This is **bold**, this is *italic*, and this is $E = mc^2$.

[tip]
You're already writing Zolto — it's just Markdown with superpowers.
[/tip]

@math name="Einstein's Energy"
  E = mc^2
@/math
```

---

## 3. Project Structure

```
zolto/
│
├── index.html                  ← Application entry point
├── README.md
├── LICENSE
├── package.json
│
├── css/                        ← All stylesheets (see §12)
│   ├── base/                   ← Reset, typography, CSS custom properties
│   ├── layouts/                ← Editor, preview, sidebar, workspace chrome
│   ├── components/             ← Per-component styles (card, tabs, chart, …)
│   └── themes/                 ← light / dark / midnight / oled
│
├── js/                         ← All JavaScript source
│   ├── app.js                  ← Application bootstrap
│   ├── router.js               ← Client-side routing
│   ├── state.js                ← Global reactive state
│   ├── storage.js              ← Persistence (IndexedDB / localStorage)
│   ├── settings.js             ← User settings management
│   │
│   ├── editor/                 ← Source editor (see §5)
│   ├── preview/                ← Live preview + virtual DOM (see §7)
│   ├── parser/                 ← Tokenizer → Lexer → Parser → AST (see §6)
│   ├── renderer/               ← AST → HTML/SVG (see §7)
│   ├── components/             ← Runtime JS for interactive components
│   ├── export/                 ← HTML / PDF / Markdown / JSON export (see §10)
│   └── utils/                  ← Shared utilities
│
├── zolto/
│   ├── grammar/                ← Formal grammar rules (.zol files)
│   ├── specs/                  ← Language specifications (see §14)
│   └── examples/               ← Sample .zol documents
│
├── plugins/                    ← Plugin system (see §11)
├── tests/                      ← Test suites (see §13)
└── docs/                       ← Architecture, roadmap, changelog
```

---

## 4. Language Overview

Zolto source files use the `.zl` extension and must be UTF-8 encoded.

### Frontmatter

```zolto
---
title: Document Title
author: Dr. A. Kumar
theme: dark
tags: [physics, mechanics]
---
```

### Variables

```zolto
$subject = "Classical Mechanics"
$year    = 2025

This document covers {$subject} for {$year}.
```

### Imports

```zolto
@import "shared/components.zl"
@import "shared/theme.zl" as theme
```

### Inline syntax

```zolto
**bold**   *italic*   ***bold-italic***   ~~strike~~   ==highlight==
^super^    ~sub~      `code`              $math$
{red coloured text}   {primary themed text}
[link text](url)      ![alt](image.png)
@mention   #hashtag   :emoji:   {$variable}
```

### Block directives (Domain 2–6)

Every non-Markdown feature follows the same pattern:

```zolto
@keyword [attributes]
  content
@/keyword
```

See `zolto/specs/syntax.md` for the complete directive reference, or jump to the relevant domain section in this README.

### Admonitions (fastest callout syntax)

```zolto
[tip] Draw a free-body diagram first. [/tip]
[warning] Do not confuse mass with weight. [/warning]
[important] This is the key equation. [/important]
```

All types: `note` `tip` `info` `warning` `danger` `caution` `important` `success` `check` `bug` `example` `quote` `abstract` `todo` `question` `failure` `seealso` `summary` `hint` `attention` `definition` `theorem`

### Mathematics

```zolto
Inline: $F = ma$

Block:
@math name="Newton's Second Law" label="eq:f=ma"
  \mathbf{F} = m\mathbf{a}
@/math

Aligned:
@math env=align
  F &= ma \\
  W &= F \cdot d \\
  P &= \frac{W}{t}
@/math

Function plot:
@math plot name="Quadratic Curve"
  function: "y = x^2 - 4x + 3"
  xrange: [-1, 5]
  grid: true
@/math
```

### Diagrams

```zolto
@diagram flowchart dir=LR
  [Start] --> (Decision)
  (Decision) --"Yes"--> [Process A] +success
  (Decision) --"No"-->  [Process B] +danger
@/diagram

@diagram sequence
  User -> App: Login request
  App -> DB: Validate credentials
  DB --> App: OK
  App --> User: Access token
@/diagram
```

All diagram types: `flowchart` `sequence` `state` `erd` `mindmap` `gantt` `timeline` `network` `architecture` `dependency` `tree` `pipeline` `kanban` `geometry` `circuit` `atom` `grammar-tree` `chemistry`

### Charts

```zolto
@chart pie title="Energy Distribution"
  "Kinetic":   45
  "Potential": 35
  "Thermal":   20
@/chart

@chart line title="Acceleration vs Time"
  x: [0, 1, 2, 3, 4]
  y: [0, 9.8, 19.6, 29.4, 39.2]
  smooth: true
@/chart
```

All chart types: `pie` `donut` `bar` `line` `area` `scatter` `radar` `gauge` `waterfall` `heatmap` `sankey` `funnel` `treemap` `bubble` `polar` `quadrant`

### Layouts

```zolto
@grid cols=3 gap=1.5rem
  @card variant=outline
    **Law 1** — Inertia
  @/card
  @card variant=outline
    **Law 2** — $F = ma$
  @/card
  @card variant=outline
    **Law 3** — Action & Reaction
  @/card
@/grid

@presentation theme=dark
  @slide layout=title
    # Introduction to Quantum Mechanics
  @/slide
  @slide layout=two-col
    ## Wave-Particle Duality
    ::: col
    Particles exhibit wave properties.
    :::
    ::: col
    @diagram flowchart
      [Wave] <--> [Particle]
    @/diagram
    :::
  @/slide
@/presentation
```

### Assessment blocks

```zolto
@mcq
  question: "A 5 kg object experiences 20 N net force. Acceleration?"
  A: "1 m/s²"
  B: "4 m/s²" [correct]
  C: "100 m/s²"
  explanation: "a = F/m = 20/5 = 4 m/s²"
  difficulty: medium
@/mcq

@flashcard
  front: What is Newton's First Law?
  back:  Objects resist changes in their state of motion (inertia).
  tags: [physics, mechanics]
@/flashcard
```

---

## 5. Editor

Source: `js/editor/`

| File | Responsibility |
|------|---------------|
| `editor.js` | Core editor — contenteditable surface, line tracking, input handling |
| `cursor.js` | Cursor position, line/column reporting, programmatic cursor movement |
| `selection.js` | Text selection, range queries, multi-cursor support |
| `shortcuts.js` | Keyboard shortcut registry — bold, italic, heading insert, etc. |
| `autocomplete.js` | Directive completion, prop name hints, component name suggestions |
| `syntax-highlighter.js` | Token-based syntax colouring in the editor surface |
| `command-palette.js` | `Cmd/Ctrl+K` command palette — file actions, insert commands, theme switch |

The editor emits a `zolto:change` event on every keystroke (debounced at 16 ms by `utils/debounce.js`). The preview pipeline subscribes to this event and triggers a re-render.

---

## 6. Parser Pipeline

Source: `js/parser/`

```
Source (.zl text)
      │
  tokenizer.js    →  Token stream + InlineFlags bitmask
      │
  lexer.js        →  Token classification, keyword recognition
      │
  parser.js       →  Document AST  (uses ASTFactory from ast.js only)
      │
  validator.js    →  Type checks, diagnostic error nodes
      │
  transformer.js  →  InlineParser · MathASTBuilder · equation numbering
                     · footnote resolution · component registry population
      │
  Document AST  (ready for all consumers)
```

| File | Exports |
|------|---------|
| `tokenizer.js` | `Tokenizer` |
| `lexer.js` | `Lexer` |
| `parser.js` | `ZoltoParser` |
| `ast.js` | `ASTFactory`, `InlineParser`, `MathASTBuilder`, `ZOLTONodeTypes`, enums |
| `validator.js` | `ZoltoValidator` |
| `transformer.js` | `ZoltoTransformer`, `ZoltoComponentRuntime` |

### Using the parser

```js
import { ZoltoParser }      from './js/parser/parser.js';
import { ZoltoTransformer } from './js/parser/transformer.js';

const source = '# Hello\n\nThis is $F = ma$.';
const parser      = new ZoltoParser();
const transformer = new ZoltoTransformer();

const rawAST = parser.parse(source);
const doc    = transformer.transform(rawAST);
// doc is now ready for ZoltoRenderer
```

### ASTFactory

All AST nodes must be constructed via `ASTFactory` — never plain objects. Every node has a fixed shape (same keys, same order) for V8 Hidden Class stability.

```js
import { ASTFactory } from './js/parser/ast.js';

const doc  = ASTFactory.createDocument();
const head = ASTFactory.createHeading(1, 2, 'My Title', null);
doc.nodes.push(head);
```

Full method list: see `zolto/specs/ast.md` §14.

---

## 7. Renderer

Source: `js/renderer/` and `js/preview/`

| File | Responsibility |
|------|---------------|
| `renderer.js` | `ZoltoRenderer` — main entry, dispatches all node types |
| `html-renderer.js` | Domain 1 nodes (Markdown, typography, tables, lists) |
| `math-renderer.js` | `MathBlock` / `MathInline` → KaTeX MathML/SVG + function plots |
| `diagram-renderer.js` | All `@diagram` types → SVG (Dagre layout, force-directed, radial) |
| `component-renderer.js` | `ComponentUse` → HTML (slot injection, prop merging, variant classes) |
| `preview/preview.js` | Preview pane controller — mounts renderer output into the DOM |
| `preview/virtual-dom.js` | Virtual DOM differ — patches only changed nodes on re-render |
| `preview/live-renderer.js` | Glue layer — subscribes to `zolto:change`, debounces, triggers render |

### Basic usage

```js
import { ZoltoRenderer } from './js/renderer/renderer.js';

const renderer = new ZoltoRenderer({ theme: 'dark', mathBackend: 'katex' });
const html     = renderer.render(documentAST);

document.getElementById('preview').innerHTML = html;
```

### Render modes

| Mode | How to trigger | Use case |
|------|---------------|----------|
| **Static** | `renderer.render(doc)` | Server-side render, initial page load |
| **Live** | `renderer.renderToCanvas(doc, el)` | Live editor — patches DOM incrementally |
| **Lazy** | `@component … render=lazy` | Heavy diagrams rendered on scroll intersection |
| **Streaming** | `@component … render=streaming` | Large documents — shell first, content progressively |

### Extending the renderer

```js
import { ZoltoRenderer } from './js/renderer/renderer.js';

// Register a custom node type
ZoltoRenderer.registerRenderer('MyCustomNode', (node, ctx) => {
  return `<div class="my-node">${node.text}</div>`;
});

// Use render hooks
const renderer = new ZoltoRenderer({
  hooks: {
    afterRenderNode: (node, html, ctx) => html,
  }
});
```

Full output specification: see `zolto/specs/renderer.md`.

---

## 8. Component System

Source: `js/parser/transformer.js` (registry) · `js/renderer/component-renderer.js` (render)

### Define a component

```zolto
@component StatCard title="" value="" trend="neutral"
  @card variant=outline
    **{title}**
    # {value}
    {#if trend == "up"}
      {success ↑ Trending up}
    {/if}
  @/card
@/component
```

### Use it

```zolto
<StatCard title="Revenue" value="$124,000" trend="up" />
<StatCard title="Users"   value="8,420"    trend="up" />
<StatCard title="Churn"   value="2.4%"     trend="down" />
```

### Slots

```zolto
@component FeatureCard title="" icon=""
  @slot header
    ### {title}
  @/slot
  @slot default
    // Caller fills this.
  @/slot
@/component

<FeatureCard title="Fast Rendering" icon="zap">
  Renders 10,000 nodes in under 16 ms.
</FeatureCard>
```

### Component Registry API

```js
import { ZoltoComponentRuntime } from './js/parser/transformer.js';

ZoltoComponentRuntime.register('MyWidget', defNode);
ZoltoComponentRuntime.has('UserCard');   // → boolean
ZoltoComponentRuntime.get('UserCard');   // → ComponentDef | null
ZoltoComponentRuntime.list();            // → string[]
ZoltoComponentRuntime.clear();
```

### Macros

```zolto
@macro formula(name, expr)
  @math name="{name}"
    {expr}
  @/math
@/macro

@formula("Newton's Second Law", "F = ma")
```

Full component system reference: see `zolto/specs/components.md`.

---

## 9. Themes & Design Tokens

Source: `css/themes/` · `css/base/variables.css`

### Built-in themes

| ID | File | Description |
|----|------|-------------|
| `light` | `css/themes/light.css` | Clean light background, dark text |
| `dark` | `css/themes/dark.css` | Deep dark canvas, subtle borders |
| `midnight` | `css/themes/midnight.css` | Deep navy, high-contrast accents |
| `oled` | `css/themes/oled.css` | Pure black for OLED screens |

Set in frontmatter:

```zolto
---
theme: dark
---
```

### Override tokens for a document

```zolto
--accent-primary: #6366f1
--font-sans: "Inter Variable", system-ui, sans-serif
--radius-md: 12px
```

### Scoped theme block

```zolto
@theme name="physics-palette"
  --accent-primary: #0ea5e9;
  --card-bg: rgba(14, 165, 233, 0.05);
@/theme

@grid cols=3 theme="physics-palette"
  @card
    ## Mechanics
  @/card
@/grid
```

### Token categories

| Category | Example tokens |
|----------|---------------|
| Accent | `--accent-primary` `--accent-secondary` `--accent-tertiary` |
| Background | `--bg-app` `--bg-canvas` `--bg-panel` `--bg-surface` |
| Text | `--text-main` `--text-mute` `--text-faint` `--text-link` |
| Border | `--border-subtle` `--border-normal` `--border-heavy` |
| Intent | `--intent-primary` `--intent-success` `--intent-warning` `--intent-danger` |
| Font | `--font-sans` `--font-mono` `--font-display` |
| Radius | `--radius-sm` `--radius-md` `--radius-lg` `--radius-full` |
| Spacing | `--space-1` … `--space-16` (4 px increments) |
| Shadow | `--shadow-sm` `--shadow-md` `--shadow-lg` `--shadow-glow` |
| Transition | `--duration-fast` `--duration-normal` `--duration-slow` |

---

## 10. Export

Source: `js/export/`

| File | Format | Notes |
|------|--------|-------|
| `html-export.js` | `.html` | Self-contained — inlines CSS + rendered HTML |
| `pdf-export.js` | `.pdf` | Print stylesheet + headless Chrome / Puppeteer |
| `markdown-export.js` | `.md` | Strips Zolto-only syntax, preserves standard Markdown |
| `text-export.js` | `.txt` | Plain text, strips all markup |
| `json-export.js` | `.json` | Raw Document AST export |

### Usage

```js
import { HTMLExporter }     from './js/export/html-export.js';
import { PDFExporter }      from './js/export/pdf-export.js';
import { MarkdownExporter } from './js/export/markdown-export.js';

const html = await HTMLExporter.export(documentAST, { theme: 'dark', inline: true });
const pdf  = await PDFExporter.export(documentAST, { paperSize: 'A4' });
const md   = MarkdownExporter.export(documentAST);
```

---

## 11. Plugins

Source: `plugins/`

| File | Role |
|------|------|
| `plugin-manager.js` | Loads, registers, and unloads plugins |
| `api.js` | Public plugin API surface |
| `builtins/` | Bundled first-party plugins |

### Plugin API

```js
// plugins/my-plugin.js
export default {
  name:    'my-plugin',
  version: '1.0.0',

  install(api) {
    // Register a custom node renderer
    api.renderer.register('MyNode', (node, ctx) => `<div>${node.text}</div>`);

    // Register a custom diagram type
    api.diagrams.register('my-diagram', (node, ctx) => `<svg>…</svg>`);

    // Hook into the parser
    api.parser.onToken('MY_TOKEN', (token, state) => { … });
  },

  uninstall(api) {
    api.renderer.unregister('MyNode');
  },
};
```

```js
import { PluginManager } from './plugins/plugin-manager.js';
import MyPlugin          from './plugins/my-plugin.js';

PluginManager.install(MyPlugin);
```

---

## 12. CSS Architecture

Source: `css/`

```
css/
├── base/
│   ├── reset.css        ← Box-sizing, margin/padding reset
│   ├── typography.css   ← Font stacks, base sizes, line heights
│   └── variables.css    ← All CSS custom property declarations (:root)
│
├── layouts/
│   ├── editor.css       ← Source editor pane chrome
│   ├── preview.css      ← Preview pane chrome and scroll
│   ├── sidebar.css      ← File tree / outline sidebar
│   └── workspace.css    ← Top-level split layout
│
├── components/
│   ├── card.css         ← .zolto-card and all variants
│   ├── alert.css        ← .zolto-callout, .zolto-admonition
│   ├── tabs.css         ← .zolto-tabs, .zolto-tab-btn, panels
│   ├── accordion.css    ← .zolto-accordion, details/summary
│   ├── timeline.css     ← .zolto-diagram-timeline
│   ├── hero.css         ← .zolto-hero sections
│   ├── gallery.css      ← Image gallery layout
│   └── chart.css        ← .zolto-chart figure wrapper
│
└── themes/
    ├── light.css        ← Light theme token overrides
    ├── dark.css         ← Dark theme token overrides
    ├── midnight.css     ← Midnight theme token overrides
    └── oled.css         ← OLED theme token overrides
```

All component styles use CSS custom properties defined in `variables.css`. Themes override only the tokens — never component rules directly. This means swapping themes at runtime requires only toggling a `data-theme` attribute on `<html>`.

```js
document.documentElement.setAttribute('data-theme', 'dark');
```

---

## 13. Tests

Source: `tests/`

```
tests/
├── parser/          ← Tokenizer, lexer, parser, transformer unit tests
├── renderer/        ← HTML output snapshot tests per node type
├── editor/          ← Cursor, selection, shortcut integration tests
└── export/          ← Export format output tests
```

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run a single suite
npm test -- --filter parser
```

Tests use snapshot assertions for rendered HTML output. When intentionally changing output, update snapshots with:

```bash
npm run test:update-snapshots
```

---

## 14. Specs & Documentation

Source: `zolto/specs/` and `docs/`

| File | Contents |
|------|----------|
| `zolto/specs/syntax.md` | Complete Zolto language syntax reference — all directives, operators, inline syntax, token precedence, examples |
| `zolto/specs/ast.md` | AST node type definitions, `ASTFactory` method list, `InlineParser`, `MathASTBuilder`, ID generation, developer JSON examples |
| `zolto/specs/renderer.md` | HTML/SVG output specification for every node type, CSS class reference, theming, render modes, extension API |
| `zolto/specs/components.md` | Component system — definition, props, slots, variants, themes, templates, macros, animations, registry API |
| `docs/architecture.md` | High-level system design and data flow |
| `docs/roadmap.md` | Planned features and milestones |
| `docs/contributing.md` | Contribution guidelines, code style, PR process |
| `docs/changelog.md` | Version history |

### Grammar files

```
zolto/grammar/
├── blocks.zol      ← Block-level grammar rules
├── inline.zol      ← Inline grammar rules
├── math.zol        ← Math block grammar
└── components.zol  ← Component syntax grammar
```

### Example documents

```
zolto/examples/
├── basic.zol           ← Beginner quick-start (all six domains)
├── dashboard.zol       ← Metrics dashboard with charts and components
├── presentation.zol    ← Multi-slide presentation
├── notes.zol           ← Study notes with math, MCQ, and flashcards
└── documentation.zol   ← API documentation with code blocks and tables
```

---

## 15. Contributing

See `docs/contributing.md` for the full guide. Key points:

- **Node creation:** always use `ASTFactory` — never plain objects.
- **CSS:** all colours and spacing via CSS custom properties — no hardcoded values.
- **Renderer output:** update `zolto/specs/renderer.md` when changing HTML output.
- **New directives:** add grammar rule to `zolto/grammar/blocks.zol`, AST node to `ast.js`, renderer to `renderer.js`, and spec entry to `syntax.md`.
- **Tests:** every parser and renderer change requires a snapshot test.

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run typecheck
```

---

## License

MIT — see `LICENSE`.

---

*Zolto v8.1.0 · Infinity Architecture*
*Source: `README.md` · Specs: `zolto/specs/` · Examples: `zolto/examples/`*
