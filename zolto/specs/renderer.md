# Zolto Renderer Reference

**File:** `zolto/specs/renderer.md`
**Version:** 8.1.0 (Infinity Architecture · Unified Spatial Renderer · Human-Friendly Edition)
**Source of truth:** `js/renderer/renderer.js`
**Cross-references:** `zolto/specs/ast.md` · `zolto/specs/syntax.md` · `zolto/specs/components.md`

---

## Table of Contents

1. [What Is the Renderer?](#1-what-is-the-renderer)
2. [Architecture Overview](#2-architecture-overview)
3. [Renderer Pipeline](#3-renderer-pipeline)
4. [ZoltoRenderer API](#4-zoltorenderer-api)
5. [Domain 1 — Rich Markdown & Typography](#5-domain-1--rich-markdown--typography)
6. [Domain 2 — Mathematics](#6-domain-2--mathematics)
7. [Domain 3 — Diagrams & Spatial Graphs](#7-domain-3--diagrams--spatial-graphs)
8. [Domain 4 — Native Vector & Graphics](#8-domain-4--native-vector--graphics)
9. [Domain 5 — Spatial Layout System](#9-domain-5--spatial-layout-system)
10. [Domain 6 — Component & Template System](#10-domain-6--component--template-system)
11. [Inline Node Rendering](#11-inline-node-rendering)
12. [Math Rendering](#12-math-rendering)
13. [Diagram Rendering](#13-diagram-rendering)
14. [Chart Rendering](#14-chart-rendering)
15. [CSS Class Reference](#15-css-class-reference)
16. [Theming & Design Token Injection](#16-theming--design-token-injection)
17. [Render Modes & Performance](#17-render-modes--performance)
18. [Error Nodes & Diagnostics](#18-error-nodes--diagnostics)
19. [Extending the Renderer](#19-extending-the-renderer)
20. [Complete HTML Output Examples](#20-complete-html-output-examples)

---

## 1. What Is the Renderer?

The Zolto **Renderer** is the final stage in the compiler pipeline. It takes a fully-resolved **Document AST** (produced by the parser and transformer) and walks every node, emitting HTML and SVG strings that the browser can display.

```
 Document AST  (ready — all inline arrays filled, all math ASTs built)
       │
  ZoltoRenderer
       │
   ┌───┴───────────────────────────────────────────┐
   │  renderNode(node) → string                    │
   │  walk Document.nodes[]                        │
   │  dispatch by node.type → renderHeading,       │
   │    renderMathBlock, renderDiagram, …          │
   └───────────────────────────────────────────────┘
       │
  HTML + SVG output
```

The renderer is **pure**: given the same AST it always produces the same HTML. It holds no mutable state between `render()` calls. Each render is a complete fresh pass.

### What the renderer is not

- It does **not** parse Zolto source — the parser does that.
- It does **not** resolve component definitions — the transformer does that.
- It does **not** build the inline or math ASTs — the transformer's `InlineParser` and `MathASTBuilder` do that.
- It does **not** manage the DOM — it produces strings. The live editor's virtual-DOM layer patches the DOM separately.

---

## 2. Architecture Overview

```
js/renderer/
  renderer.js                ← ZoltoRenderer (main entry, dispatches all nodes)
  inline-renderer.js         ← Renders InlineNode[] arrays to HTML strings
  math-renderer.js           ← MathBlock / MathInline → MathML or SVG via KaTeX
  diagram-renderer.js        ← All @diagram types → SVG
  chart-renderer.js          ← All @chart types → SVG / Canvas
  vector-renderer.js         ← @vector scenes → SVG
  layout-renderer.js         ← @grid, @flex, @canvas, @presentation → HTML
  component-renderer.js      ← ComponentUse nodes → HTML (uses ComponentRegistry)
  assessment-renderer.js     ← @mcq, @quiz, @flashcard → interactive HTML
```

### Import map

```js
import { ZoltoRenderer }          from './js/renderer/renderer.js';
import { InlineRenderer }         from './js/renderer/inline-renderer.js';
import { MathRenderer }           from './js/renderer/math-renderer.js';
import { DiagramRenderer }        from './js/renderer/diagram-renderer.js';
import { ChartRenderer }          from './js/renderer/chart-renderer.js';
import { VectorRenderer }         from './js/renderer/vector-renderer.js';
import { LayoutRenderer }         from './js/renderer/layout-renderer.js';
import { ComponentRenderer }      from './js/renderer/component-renderer.js';
import { AssessmentRenderer }     from './js/renderer/assessment-renderer.js';
```

Each sub-renderer is stateless and exposes a single `render(node, ctx)` method.

---

## 3. Renderer Pipeline

```
 ZoltoRenderer.render(document)
       │
       ├─ renderFrontmatter(document.frontmatter)   // <meta> tags only — no visible HTML
       │
       ├─ injectThemeTokens(document.variables)     // :root { --token: value } block
       │
       ├─ for each node in document.nodes:
       │     renderNode(node)
       │         │
       │         └─ dispatch by node.type:
       │               'Heading'          → renderHeading()
       │               'Paragraph'        → renderParagraph()
       │               'MathBlock'        → MathRenderer.render()
       │               'Diagram'          → DiagramRenderer.render()
       │               'Chart'            → ChartRenderer.render()
       │               'VectorScene'      → VectorRenderer.render()
       │               'GridLayout'       → LayoutRenderer.renderGrid()
       │               'FlexLayout'       → LayoutRenderer.renderFlex()
       │               'Presentation'     → LayoutRenderer.renderPresentation()
       │               'ComponentUse'     → ComponentRenderer.render()
       │               'Card' / 'CardGroup' → renderCard() / renderCardGroup()
       │               'TabGroup'         → renderTabGroup()
       │               'Accordion'        → renderAccordion()
       │               'Steps'            → renderSteps()
       │               'Table'            → renderTable()
       │               'List'             → renderList()
       │               'CodeBlock'        → renderCodeBlock()
       │               'Callout'          → renderCallout()
       │               'Admonition'       → renderAdmonition()
       │               'Embed'            → renderEmbed()
       │               'HorizontalRule'   → renderHorizontalRule()
       │               'Quote'            → renderQuote()
       │               'Details'          → renderDetails()
       │               'ColumnLayout'     → renderColumnLayout()
       │               'MCQ'              → AssessmentRenderer.renderMCQ()
       │               'Quiz'             → AssessmentRenderer.renderQuiz()
       │               'Flashcard'        → AssessmentRenderer.renderFlashcard()
       │               'Animation'        → renderAnimationDef()   // injects <style>
       │               'Comment'          → ''                     // silently skipped
       │               unknown            → renderErrorNode()
       │
       └─ renderFootnotes(document.footnotes)
```

---

## 4. ZoltoRenderer API

```js
import { ZoltoRenderer } from './js/renderer/renderer.js';

const renderer = new ZoltoRenderer(options);

// Render an entire document
const html = renderer.render(documentAST);

// Render a single node (used by component-renderer for template bodies)
const fragment = renderer.renderNode(node);

// Render an array of nodes (used for slot content)
const html = renderer.renderNodes(nodes);

// Render a document to a live DOM container (patches via virtual DOM)
renderer.renderToCanvas(documentAST, containerElement);
```

### Constructor options

```ts
interface ZoltoRendererOptions {
  theme?:           string;              // 'light' | 'dark' | 'midnight' | 'oled'
  mathBackend?:     'katex' | 'mathjax'; // default: 'katex'
  diagramBackend?:  'native' | 'elk';    // default: 'native'
  chartBackend?:    'svg' | 'canvas';    // default: 'svg'
  codeHighlight?:   boolean;             // default: true (Prism.js)
  smartTypography?: boolean;             // default: true
  footnoteMode?:    'bottom' | 'tooltip'; // default: 'bottom'
  sanitize?:        boolean;             // default: true — strip unknown HTML
  baseUrl?:         string;              // Prefix for relative @embed URLs
  renderContext?:   RenderContext;       // Injected ctx (theme tokens, component registry)
}
```

### RenderContext

`RenderContext` is threaded through every sub-renderer call. It carries:

```ts
interface RenderContext {
  theme:             string;
  tokens:            Record<string, string>;   // CSS custom properties in scope
  componentRegistry: ComponentRegistry;
  mathIndex:         Record<string, number>;   // label → equation number
  footnotes:         Record<string, Footnote>;
  variables:         Record<string, string>;
  equationCounter:   { value: number };        // mutable counter threaded by reference
  animationDefs:     Map<string, Animation>;   // name → Animation node
  depth:             number;                   // nesting depth (guards against infinite component loops)
}
```

---

## 5. Domain 1 — Rich Markdown & Typography

### 5.1 Heading → `<h1>` … `<h6>`

```ts
renderHeading(node: Heading, ctx: RenderContext): string
```

```html
<!-- Heading { level:2, text:"Newton's Laws", anchor:"newtons-laws", classes:["highlight"] } -->
<h2 id="newtons-laws" class="zolto-heading zolto-h2 highlight">
  Newton's Laws
</h2>
```

- The `id` attribute is set to `node.anchor`.
- Extra classes from `node.classes` are appended after the base classes.
- Custom attributes from `node.attrs` are injected as HTML attributes.
- `node.inline` is rendered by `InlineRenderer.render()` when non-null; otherwise `node.text` is HTML-escaped.

---

### 5.2 Paragraph → `<p>`

```html
<p class="zolto-p">
  The acceleration of an object is <strong>directly proportional</strong>
  to the net force.
</p>
```

---

### 5.3 HorizontalRule → `<hr>`

```html
<hr class="zolto-hr" />
```

---

### 5.4 Quote → `<blockquote>`

```html
<blockquote class="zolto-blockquote">
  <p>Every object persists in its state of rest or uniform motion.</p>
</blockquote>
```

---

### 5.5 Callout → `.zolto-callout`

```html
<div class="zolto-callout zolto-callout-tip" role="note" aria-label="Tip">
  <div class="zolto-callout-icon" aria-hidden="true">💡</div>
  <div class="zolto-callout-body">
    Always draw a free-body diagram before solving force problems.
  </div>
</div>
```

Icon map (default):

| calloutType | Icon |
|-------------|------|
| `tip` | 💡 |
| `warning` | ⚠️ |
| `danger` | 🚫 |
| `info` | ℹ️ |
| `note` | 📝 |
| `success` | ✅ |
| `check` | ✔️ |
| `bug` | 🐛 |
| `example` | 📋 |
| `important` | ❗ |
| `abstract` | 📄 |
| `todo` | ☑️ |
| `question` | ❓ |
| `failure` | ✖️ |
| `definition` | 📖 |
| `theorem` | 📐 |

---

### 5.6 Admonition → `.zolto-admonition`

```html
<div class="zolto-admonition zolto-admonition-warning" role="note">
  <div class="zolto-admonition-header">
    <span class="zolto-admonition-icon" aria-hidden="true">⚠️</span>
    <span class="zolto-admonition-title">Watch Out</span>
  </div>
  <div class="zolto-admonition-body">
    Do not confuse mass (kg) with weight (N).
  </div>
</div>
```

---

### 5.7 CodeBlock → `<pre><code>`

```html
<div class="zolto-code-block" data-lang="javascript">
  <div class="zolto-code-header">
    <span class="zolto-code-lang">javascript</span>
    <button class="zolto-code-copy" aria-label="Copy code">⎘</button>
  </div>
  <pre class="zolto-pre"><code class="zolto-code language-javascript">const acceleration = force / mass;
</code></pre>
</div>
```

- Syntax highlighting is applied via Prism.js when `codeHighlight: true`.
- If `config` contains `title="…"`, a title bar is rendered above the code.
- Line highlights (`{3,7}`) inject `<mark>` elements on the specified lines.
- `diff` config adds `+`/`-` prefix coloring.

---

### 5.8 Table → `<table>`

```html
<div class="zolto-table-wrapper">
  <table class="zolto-table" role="table">
    <caption class="zolto-table-caption">Periodic Table Excerpt</caption>
    <thead>
      <tr>
        <th class="align-left" scope="col">Element</th>
        <th class="align-center" scope="col">Symbol</th>
        <th class="align-right" scope="col">Atomic #</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="align-left">Hydrogen</td>
        <td class="align-center">H</td>
        <td class="align-right">1</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### 5.9 Lists → `<ul>` / `<ol>`

**Unordered:**
```html
<ul class="zolto-list">
  <li class="zolto-list-item">Item one</li>
  <li class="zolto-list-item">Item two
    <ul class="zolto-list zolto-list-nested">
      <li class="zolto-list-item">Nested item</li>
    </ul>
  </li>
</ul>
```

**Ordered:**
```html
<ol class="zolto-list zolto-list-ordered">
  <li class="zolto-list-item" value="1">First item</li>
  <li class="zolto-list-item" value="2">Second item</li>
</ol>
```

**Checklist:**
```html
<ul class="zolto-checklist">
  <li class="zolto-checklist-item zolto-checked" role="checkbox" aria-checked="true">
    <span class="zolto-check-icon" aria-hidden="true">✓</span>
    Completed task
  </li>
  <li class="zolto-checklist-item" role="checkbox" aria-checked="false">
    <span class="zolto-check-icon" aria-hidden="true">☐</span>
    Incomplete task
  </li>
</ul>
```

Checklist modifier classes: `zolto-checked` `zolto-in-progress` `zolto-blocked` `zolto-cancelled` `zolto-partial`

---

### 5.10 Definition List → `<dl>`

```html
<dl class="zolto-definition-list">
  <dt class="zolto-dt">Inertia</dt>
  <dd class="zolto-dd">The resistance of an object to changes in its state of motion.</dd>
</dl>
```

---

### 5.11 Footnote → `<aside>` (bottom mode)

```html
<!-- Inline reference in text: -->
<sup class="zolto-footnote-ref">
  <a href="#fn-pub" id="fnref-pub" aria-describedby="footnote-label">[1]</a>
</sup>

<!-- Bottom of document: -->
<aside class="zolto-footnotes" aria-label="Footnotes">
  <h2 class="zolto-footnotes-title" id="footnote-label">Footnotes</h2>
  <ol class="zolto-footnotes-list">
    <li id="fn-pub" class="zolto-footnote">
      Newton, I. (1687). <em>Philosophiæ Naturalis Principia Mathematica</em>.
      <a href="#fnref-pub" class="zolto-footnote-backref" aria-label="Back to content">↩</a>
    </li>
  </ol>
</aside>
```

---

### 5.12 Embed → `.zolto-embed`

**Image:**
```html
<figure class="zolto-embed zolto-embed-image">
  <img src="/assets/force-diagram.png"
       alt="Force diagram"
       width="600"
       class="zolto-embed-img"
       loading="lazy" />
  <figcaption class="zolto-embed-caption">Force diagram</figcaption>
</figure>
```

**YouTube:**
```html
<figure class="zolto-embed zolto-embed-youtube">
  <div class="zolto-embed-ratio" style="--ratio: 56.25%">
    <iframe
      src="https://www.youtube-nocookie.com/embed/abc123"
      title="Introduction to Newton's Laws"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
      class="zolto-embed-iframe"
    ></iframe>
  </div>
  <figcaption class="zolto-embed-caption">Introduction to Newton's Laws</figcaption>
</figure>
```

All embed types follow the same `<figure>` wrapper pattern with `zolto-embed-{type}` class.

---

### 5.13 TabGroup → `.zolto-tabs`

```html
<div class="zolto-tabs" data-id="tg1" role="tablist" aria-label="Tabs">
  <div class="zolto-tabs-header">
    <button class="zolto-tab-btn zolto-tab-active" role="tab"
            aria-selected="true" aria-controls="tab-panel-tg1-0" id="tab-btn-tg1-0">
      Theory
    </button>
    <button class="zolto-tab-btn" role="tab"
            aria-selected="false" aria-controls="tab-panel-tg1-1" id="tab-btn-tg1-1">
      Formula
    </button>
  </div>
  <div class="zolto-tabs-body">
    <div class="zolto-tab-panel" id="tab-panel-tg1-0"
         role="tabpanel" aria-labelledby="tab-btn-tg1-0">
      <!-- Tab 0 content -->
    </div>
    <div class="zolto-tab-panel zolto-tab-hidden" id="tab-panel-tg1-1"
         role="tabpanel" aria-labelledby="tab-btn-tg1-1" hidden>
      <!-- Tab 1 content -->
    </div>
  </div>
</div>
```

---

### 5.14 Accordion → `.zolto-accordion`

```html
<details class="zolto-accordion" id="ac1">
  <summary class="zolto-accordion-header">
    <span class="zolto-accordion-icon" aria-hidden="true">▸</span>
    Prove Newton's Second Law from First Principles
  </summary>
  <div class="zolto-accordion-body">
    <!-- children rendered here -->
  </div>
</details>
```

When `open: true`, the `<details>` element carries the `open` attribute.

---

### 5.15 Card & CardGroup → `.zolto-card`

```html
<!-- Card { title:"Law 1", icon:null, variant:"outline", href:null } -->
<div class="zolto-card zolto-card-outline" data-id="cd1">
  <div class="zolto-card-header">
    <span class="zolto-card-title">Law 1 · Inertia</span>
  </div>
  <div class="zolto-card-body">
    <!-- children -->
  </div>
</div>

<!-- CardGroup { columns:3 } -->
<div class="zolto-card-group zolto-card-group-3" data-id="cg1">
  <!-- Card nodes -->
</div>
```

Card variant class map:

| variant | Added class |
|---------|-------------|
| `default` | *(none)* |
| `primary` | `zolto-card-primary` |
| `success` | `zolto-card-success` |
| `warning` | `zolto-card-warning` |
| `danger` | `zolto-card-danger` |
| `outline` | `zolto-card-outline` |
| `glass` | `zolto-card-glass` |

When `href` is set the root element becomes `<a class="zolto-card …" href="…">`.

---

### 5.16 Steps → `.zolto-steps`

```html
<ol class="zolto-steps" data-id="st1">
  <li class="zolto-step" data-step="1">
    <div class="zolto-step-marker" aria-hidden="true">1</div>
    <div class="zolto-step-content">
      <div class="zolto-step-title">Set up the free-body diagram</div>
      <div class="zolto-step-body">Draw all forces acting on the object.</div>
    </div>
  </li>
</ol>
```

---

### 5.17 Details (Spoiler) → `<details>`

```html
<details class="zolto-details" id="dt1">
  <summary class="zolto-details-summary">Click to reveal the answer</summary>
  <div class="zolto-details-body">
    The answer is <strong>42</strong>.
  </div>
</details>
```

---

### 5.18 ColumnLayout → `.zolto-columns`

```html
<div class="zolto-columns zolto-columns-3" data-id="co1">
  <div class="zolto-column"><!-- column 0 content --></div>
  <div class="zolto-column"><!-- column 1 content --></div>
  <div class="zolto-column"><!-- column 2 content --></div>
</div>
```

---

## 6. Domain 2 — Mathematics

### 6.1 MathBlock → `.zolto-math-block`

```html
<figure class="zolto-math-block" id="mb1" data-label="eq:f=ma">
  <div class="zolto-math-title">Newton's Second Law</div>
  <div class="zolto-math-equation" aria-label="F = m a">
    <!-- KaTeX-rendered MathML / SVG injected here -->
  </div>
  <figcaption class="zolto-math-number">(1)</figcaption>
</figure>
```

- `node.title` is rendered in `.zolto-math-title` when non-null.
- Equation numbering uses `ctx.equationCounter.value++` when `node.numbered === true`.
- The `data-label` attribute enables cross-reference linking via `\ref{label}`.
- When `node.env === 'plot'`, `MathRenderer.renderPlot(node)` is called instead, which produces an SVG function plot.

---

### 6.2 MathInline → `<span class="zolto-math-inline">`

```html
<span class="zolto-math-inline" aria-label="F equals m a"><!-- KaTeX output --></span>
```

---

### 6.3 Math environments

| `node.env` | Wrapping LaTeX | Renderer method |
|------------|---------------|-----------------|
| `equation` | `\begin{equation}` | `renderEquation()` |
| `align` | `\begin{align}` | `renderAlign()` |
| `gather` | `\begin{gather}` | `renderGather()` |
| `cases` | `\begin{cases}` | `renderCases()` |
| `plot` | *(SVG plot)* | `renderPlot()` |

---

## 7. Domain 3 — Diagrams & Spatial Graphs

All diagram nodes are dispatched to `DiagramRenderer.render(node, ctx)`.

### 7.1 Diagram wrapper HTML

Every diagram type shares the same outer wrapper:

```html
<figure class="zolto-diagram zolto-diagram-flowchart" id="dg1"
        data-type="flowchart" data-interactive="true">
  <div class="zolto-diagram-canvas">
    <!-- SVG output from the diagram sub-renderer -->
  </div>
  <figcaption class="zolto-diagram-caption">CI/CD Pipeline</figcaption>
</figure>
```

- `data-interactive="true"` enables pan/zoom/click JavaScript handlers.
- `data-animated="true"` enables entrance animation for each node/edge.

---

### 7.2 Flowchart SVG structure

```html
<svg class="zolto-graph" viewBox="0 0 820 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow-dg1" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" class="zolto-arrow-head" />
    </marker>
  </defs>
  <g class="zolto-graph-edges">
    <path class="zolto-edge edge-solid" d="M 100,200 L 300,200"
          marker-end="url(#arrow-dg1)" data-from="Start" data-to="Decision" />
    <text class="zolto-edge-label" x="200" y="190">label</text>
  </g>
  <g class="zolto-graph-nodes">
    <g class="zolto-node zolto-node-rectangle zolto-trait-primary"
       data-id="Start" transform="translate(50,170)">
      <rect width="100" height="60" rx="4" />
      <text class="zolto-node-label" x="50" y="35">Start</text>
    </g>
    <g class="zolto-node zolto-node-diamond"
       data-id="Decision" transform="translate(250,150)">
      <polygon points="100,0 200,50 100,100 0,50" />
      <text class="zolto-node-label" x="100" y="55">Decision</text>
    </g>
  </g>
</svg>
```

Node shape → SVG element mapping:

| shape | SVG element | Notes |
|-------|-------------|-------|
| `Rectangle` | `<rect>` | `rx=4` default radius |
| `Circle` | `<circle>` | `r` = half min dimension |
| `Diamond` | `<polygon>` | 4-point lozenge |
| `Hexagon` | `<polygon>` | 6 points |
| `Cylinder` | `<g>` + `<ellipse>` + `<rect>` | Database shape |
| `Stadium` | `<rect>` | `rx` = half height |
| `Subprocess` | `<rect>` + inner `<rect>` | Double border |
| `Cloud` | `<path>` | Bezier cloud outline |

---

### 7.3 Sequence Diagram SVG structure

```html
<svg class="zolto-sequence" viewBox="0 0 960 500">
  <g class="zolto-sequence-actors">
    <g class="zolto-actor" data-id="User" transform="translate(100,20)">
      <rect class="zolto-actor-box" width="80" height="40" rx="6" />
      <text class="zolto-actor-label" x="40" y="26">User</text>
    </g>
    <!-- lifeline -->
    <line class="zolto-lifeline" x1="140" y1="60" x2="140" y2="480"
          stroke-dasharray="4 4" />
  </g>
  <g class="zolto-sequence-messages">
    <path class="zolto-message message-sync" d="M 140,100 L 380,100"
          marker-end="url(#arrow-seq)" />
    <text class="zolto-message-label" x="260" y="92">Click "Login"</text>
  </g>
</svg>
```

---

### 7.4 State Machine SVG structure

States render as rounded rectangles or specialised shapes:

| state kind | SVG |
|-----------|-----|
| `start` | `<circle>` filled |
| `end` | `<circle>` + inner `<circle>` |
| `normal` | `<rect rx="12">` |
| `fork` / `join` | `<rect>` thin horizontal bar |
| `choice` | `<polygon>` diamond |

Substates render as nested `<rect>` with a dashed inner border.

---

### 7.5 ER Diagram SVG structure

```html
<g class="zolto-er-entity" data-name="User" transform="translate(50,50)">
  <rect class="zolto-er-entity-header" width="200" height="40" rx="4" />
  <text class="zolto-er-entity-name" x="100" y="26">User</text>
  <rect class="zolto-er-attrs" y="40" width="200" height="120" />
  <text class="zolto-er-attr" x="10" y="62">
    <tspan class="zolto-er-pk">🔑</tspan> id: uuid
  </text>
  <text class="zolto-er-attr" x="10" y="82">email: string</text>
  <text class="zolto-er-attr" x="10" y="102">name: string</text>
</g>
```

Crow's foot notation is rendered as SVG path endings on the relation lines.

---

### 7.6 Mindmap SVG structure

Mindmap uses a radial layout algorithm. The root node is centred; branches radiate outward. Each level decreases in font size and node radius.

```html
<svg class="zolto-mindmap" viewBox="-400 -300 800 600">
  <g class="zolto-mindmap-root" transform="translate(0,0)">
    <ellipse class="zolto-mm-node zolto-mm-root" rx="80" ry="32" />
    <text class="zolto-mm-label">Machine Learning</text>
  </g>
  <g class="zolto-mindmap-branch" data-depth="1">
    <path class="zolto-mm-edge" d="M 0,0 C 60,0 120,80 180,80" />
    <ellipse class="zolto-mm-node" transform="translate(180,80)" rx="60" ry="22" />
    <text class="zolto-mm-label" transform="translate(180,80)">Supervised</text>
  </g>
</svg>
```

---

### 7.7 Gantt Chart SVG structure

```html
<svg class="zolto-gantt" viewBox="0 0 1000 300">
  <g class="zolto-gantt-header">
    <!-- Date axis ticks and labels -->
  </g>
  <g class="zolto-gantt-rows">
    <g class="zolto-gantt-section" data-section="Backend">
      <text class="zolto-gantt-section-label" x="10" y="50">Backend</text>
    </g>
    <g class="zolto-gantt-task zolto-gantt-done" data-id="t1">
      <rect x="150" y="35" width="120" height="24" rx="4" />
      <text x="160" y="52" class="zolto-gantt-task-label">Auth service</text>
    </g>
    <g class="zolto-gantt-task zolto-gantt-milestone" data-id="t6">
      <polygon points="210,35 225,52 210,69 195,52" />
    </g>
  </g>
</svg>
```

Task modifier class map: `zolto-gantt-done` · `zolto-gantt-active` · `zolto-gantt-crit` · `zolto-gantt-milestone`

---

### 7.8 Timeline

Timelines render as vertically-stacked period groups with horizontal event lines. Each event is a `<circle>` + label pair on the timeline track.

---

### 7.9 Spatial Graph Block (inline syntax)

Inline spatial graph blocks (outside `@diagram`) produce the same SVG structure as flowchart nodes but are wrapped in:

```html
<div class="zolto-spatial-graph" id="sg1">
  <svg class="zolto-graph" …>…</svg>
</div>
```

---

## 8. Domain 4 — Native Vector & Graphics

### 8.1 VectorScene → `<svg>`

```html
<div class="zolto-vector" data-id="vs1" style="width:800px;height:600px">
  <svg class="zolto-vector-svg"
       width="800" height="600"
       viewBox="0 0 800 600"
       xmlns="http://www.w3.org/2000/svg">
    <defs><!-- gradients, filters, clip paths --></defs>
    <g class="zolto-layer" data-name="shapes" data-kind="normal">
      <!-- VectorShape nodes -->
    </g>
    <g class="zolto-layer" data-name="labels" data-kind="normal">
      <!-- Label shapes -->
    </g>
  </svg>
</div>
```

---

### 8.2 VectorShape → SVG primitive

Each `VectorShape` maps directly to its SVG primitive:

```html
<!-- circle -->
<circle class="zolto-vshape" cx="100" cy="100" r="50"
        fill="#6366f1" data-id="vsh1" />

<!-- rect -->
<rect class="zolto-vshape" x="200" y="50" width="150" height="100"
      rx="12" fill="#10b981" data-id="vsh2" />

<!-- path -->
<path class="zolto-vshape"
      d="M 100 400 Q 250 300 400 400 T 700 400"
      stroke="#ef4444" fill="none" stroke-width="2"
      data-id="vsh3" />

<!-- text -->
<text class="zolto-vshape zolto-vtext"
      x="400" y="500"
      text-anchor="middle"
      font-size="24"
      data-id="vsh4">Force Diagram</text>
```

---

### 8.3 VectorConnector → `<path>` with arrowhead

```html
<g class="zolto-connector" data-from="nodeA" data-to="nodeB">
  <path class="zolto-connector-line connector-curved"
        d="M 140,200 C 220,200 300,200 360,200"
        marker-end="url(#arrow-vc1)" />
  <text class="zolto-connector-label" x="250" y="190">force</text>
</g>
```

---

### 8.4 VectorCamera

Camera transforms are applied as a CSS `transform` on the SVG root group:

```html
<g class="zolto-camera"
   style="transform: translate(0px, 0px) scale(1);"
   data-x="0" data-y="0" data-scale="1">
  <!-- all scene content -->
</g>
```

Pan and zoom are handled by JavaScript event listeners that update the `transform` property.

---

## 9. Domain 5 — Spatial Layout System

### 9.1 GridLayout → `.zolto-grid`

```html
<div class="zolto-grid" data-id="gl1"
     style="--grid-cols:3; --grid-gap:1.5rem; grid-auto-flow:row">
  <!-- children -->
</div>
```

CSS custom property injection: `--grid-cols`, `--grid-gap`, `--grid-rows`.

Auto-fill grids use `--grid-min-col-width` and `grid-template-columns: repeat(auto-fill, minmax(var(--grid-min-col-width), 1fr))`.

---

### 9.2 FlexLayout → `.zolto-flex`

```html
<div class="zolto-flex" data-id="fl1"
     style="--flex-direction:row; --flex-gap:1rem; --flex-align:center; --flex-justify:space-between; flex-wrap:wrap">
  <!-- children -->
</div>
```

---

### 9.3 Canvas → `.zolto-canvas`

```html
<div class="zolto-canvas" data-id="cv1" data-infinite="false"
     style="--canvas-width:1000px; --canvas-height:600px"
     data-snap="true" data-grid="true">
  <!-- absolutely-positioned children -->
</div>
```

---

### 9.4 Whiteboard → `.zolto-whiteboard`

```html
<div class="zolto-whiteboard" data-id="wb1" data-infinite="true"
     style="height:800px; --zoom:1">
  <div class="zolto-whiteboard-viewport">
    <div class="zolto-whiteboard-content">
      <!-- children -->
    </div>
  </div>
</div>
```

The `zolto-whiteboard-content` div receives CSS `transform: translate(Xpx, Ypx) scale(Z)` which is updated by the pan/zoom JavaScript.

---

### 9.5 Presentation & Slide → `.zolto-presentation`

```html
<div class="zolto-presentation" data-id="pr1"
     data-theme="dark" data-total-slides="5">
  <div class="zolto-slide-deck">
    <section class="zolto-slide zolto-slide-active"
             data-slide="0" data-layout="title"
             id="slide-0" aria-label="Slide 1 of 5">
      <!-- slide content -->
    </section>
    <section class="zolto-slide zolto-slide-hidden"
             data-slide="1" data-layout="two-col"
             id="slide-1" aria-label="Slide 2 of 5" hidden>
      <!-- slide content -->
    </section>
  </div>
  <nav class="zolto-slide-nav" aria-label="Slide navigation">
    <button class="zolto-slide-prev" aria-label="Previous slide">‹</button>
    <span class="zolto-slide-counter" aria-live="polite">1 / 5</span>
    <button class="zolto-slide-next" aria-label="Next slide">›</button>
  </nav>
</div>
```

Slide layout class map:

| layout | Root class |
|--------|-----------|
| `default` | `zolto-slide-default` |
| `title` | `zolto-slide-title` |
| `two-col` | `zolto-slide-two-col` |
| `three-col` | `zolto-slide-three-col` |
| `blank` | `zolto-slide-blank` |
| `media` | `zolto-slide-media` |
| `quote` | `zolto-slide-quote` |
| `section-break` | `zolto-slide-section` |

---

### 9.6 SplitView → `.zolto-split`

```html
<div class="zolto-split zolto-split-horizontal" data-id="sv1"
     style="--split-ratio:50%">
  <div class="zolto-split-pane zolto-split-pane-a"><!-- left --></div>
  <div class="zolto-split-handle" role="separator" aria-valuenow="50"
       aria-label="Resize panels" tabindex="0"></div>
  <div class="zolto-split-pane zolto-split-pane-b"><!-- right --></div>
</div>
```

---

### 9.7 Panel → `.zolto-panel`

```html
<div class="zolto-panel" data-id="pn1"
     data-collapsible="true" data-collapsed="false">
  <div class="zolto-panel-header">
    <span class="zolto-panel-title">Properties</span>
    <button class="zolto-panel-toggle" aria-expanded="true"
            aria-label="Collapse panel">−</button>
  </div>
  <div class="zolto-panel-body"><!-- children --></div>
</div>
```

---

## 10. Domain 6 — Component & Template System

Component rendering is handled by `ComponentRenderer` (see `zolto/specs/components.md` §14 for full internals). This section documents the **HTML output** produced.

### 10.1 ComponentUse → `.zolto-component`

```html
<div class="zolto-component zolto-cmp-UserCard zolto-tone-default"
     data-component="UserCard"
     data-id="cu1"
     style="--cmp-color: #6366f1">
  <!-- rendered template body with slots injected -->
</div>
```

Class list breakdown:
- `zolto-component` — always present
- `zolto-cmp-{Name}` — component identity
- `zolto-size-{size}` — if `size` variant set
- `zolto-tone-{tone}` — if `tone` variant set
- `zolto-shape-{shape}` — if `shape` variant set
- `zolto-outline` — if `outline=true`
- `zolto-ghost` — if `ghost=true`
- `zolto-theme-{name}` — if `theme` prop set
- *(custom classes)* — from `class="…"` use-site prop

---

### 10.2 SlotOutlet replacement

When the renderer encounters a `SlotOutlet` node while walking a `ComponentDef`'s template body, it replaces it with either:
- The matching slot content from `ComponentUse.slots[slotName]`, or
- The fallback children of the `SlotDef` node (rendered recursively).

---

### 10.3 Animation injection

When a `ComponentUse` or block node carries an `animate` prop, the renderer injects:

```html
<style>
.zolto-anim-fadeSlideUp {
  animation: zolto-fadeSlideUp 300ms ease forwards;
}
@keyframes zolto-fadeSlideUp {
  0%   { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
</style>
```

For staggered grids, `animation-delay` is set per-child via inline `style`:

```html
<div class="zolto-card zolto-anim-fadeSlideUp"
     style="animation-delay: 120ms">…</div>
```

---

## 11. Inline Node Rendering

`InlineRenderer.render(nodes: InlineNode[]): string` converts an `InlineNode[]` array to an HTML string.

### Inline node → HTML mapping

| type | HTML output |
|------|------------|
| `text` | HTML-escaped plain text |
| `bold` | `<strong class="zolto-bold">…</strong>` |
| `italic` | `<em class="zolto-italic">…</em>` |
| `boldItalic` | `<strong><em class="zolto-bolditalic">…</em></strong>` |
| `code` | `<code class="zolto-code-inline">…</code>` |
| `math` | `<span class="zolto-math-inline">…</span>` (KaTeX) |
| `link` | `<a class="zolto-link" href="…" title="…">…</a>` |
| `image` | `<img class="zolto-inline-img" src="…" alt="…" />` |
| `footnoteRef` | `<sup><a class="zolto-fn-ref" href="#fn-…">[n]</a></sup>` |
| `highlight` | `<mark class="zolto-highlight">…</mark>` |
| `strikethrough` | `<del class="zolto-strikethrough">…</del>` |
| `superscript` | `<sup class="zolto-sup">…</sup>` |
| `subscript` | `<sub class="zolto-sub">…</sub>` |
| `underline` | `<u class="zolto-underline">…</u>` |
| `mention` | `<span class="zolto-mention">@username</span>` |
| `hashtag` | `<span class="zolto-hashtag">#tag</span>` |
| `emoji` | Unicode character looked up from emoji map |
| `variableRef` | Resolved variable value, HTML-escaped |
| `color` | `<span class="zolto-color" style="color:…">…</span>` |
| `lineBreak` | `<br />` |
| `softBreak` | ` ` (single space) |

### Fast path

When `node.inline` is `null` (lazy not yet parsed), `InlineRenderer` falls back to HTML-escaping `node.text` directly. This is always safe because the transformer guarantees `inline` is set before rendering begins on visible nodes.

---

## 12. Math Rendering

`MathRenderer` wraps KaTeX (default) or MathJax depending on `options.mathBackend`.

### 12.1 KaTeX rendering

```js
import katex from 'katex';

const html = katex.renderToString(latexString, {
  displayMode:  node.display === 'block',
  throwOnError: false,
  output:       'mathml',        // or 'html' for browsers without MathML
  macros:       ZoltoMathMacros, // custom macro definitions
});
```

### 12.2 Custom macros (`ZoltoMathMacros`)

| Macro | Expands to |
|-------|-----------|
| `\bra{#1}` | `\langle #1 \rvert` |
| `\ket{#1}` | `\lvert #1 \rangle` |
| `\braket{#1}{#2}` | `\langle #1 \mid #2 \rangle` |
| `\prob` | `\mathrm{P}` |
| `\expect` | `\mathbb{E}` |
| `\var` | `\mathrm{Var}` |
| `\cov` | `\mathrm{Cov}` |
| `\std` | `\mathrm{Std}` |
| `\N` | `\mathcal{N}` |

### 12.3 Function plots

When `node.env === 'plot'`, `MathRenderer.renderPlot(node)` generates an SVG graph using a sampling loop:

1. Parse the function expression using `mathjs`.
2. Sample `N=200` points across `node.xrange`.
3. Scale to SVG viewport coordinates.
4. Emit `<polyline>` for each function.
5. Draw axes, grid lines, and labels.
6. Mark roots if `highlight_roots: true`.

```html
<figure class="zolto-math-plot" data-id="mb3">
  <div class="zolto-math-title">Quadratic Curve</div>
  <svg class="zolto-plot-svg" viewBox="0 0 600 400">
    <g class="zolto-plot-grid"><!-- grid lines --></g>
    <g class="zolto-plot-axes">
      <line class="zolto-axis-x" x1="60" y1="300" x2="560" y2="300" />
      <line class="zolto-axis-y" x1="300" y1="20" x2="300" y2="380" />
    </g>
    <g class="zolto-plot-curves">
      <polyline class="zolto-plot-curve zolto-plot-curve-0"
                points="60,220 120,160 180,140 240,160 …" />
    </g>
    <g class="zolto-plot-roots">
      <circle class="zolto-plot-root" cx="130" cy="300" r="4" />
      <circle class="zolto-plot-root" cx="295" cy="300" r="4" />
    </g>
  </svg>
</figure>
```

---

## 13. Diagram Rendering

### 13.1 Layout algorithms

| diagram type | Layout |
|-------------|--------|
| `flowchart` | Dagre (directed acyclic graph, ELK optional) |
| `sequence` | Fixed vertical lifeline lanes |
| `state` | Dagre with substate grouping |
| `erd` | Force-directed, then snapped to grid |
| `mindmap` | Radial tree (recursive angle partition) |
| `gantt` | Timeline axis + horizontal bars |
| `timeline` | Vertical list, alternating left/right |
| `network` | Force-directed (`d3-force`) |
| `architecture` | Hierarchical nested boxes |
| `tree` | Reingold–Tilford tree layout |
| `pipeline` | Linear horizontal chain |
| `kanban` | Fixed column lanes |
| `geometry` | Coordinate pass-through |
| `circuit` | Coordinate pass-through |

### 13.2 Edge routing

Edges are routed as:
- **Straight lines** — for simple pairs
- **Polylines with corner rounding** — for orthogonal layouts
- **Bezier curves** — for `sequence`, `mindmap`, arc-style connections

All edge paths are clipped to the node boundary using an intersection test against the node's bounding box.

### 13.3 Theme classes on diagram nodes

```
zolto-trait-primary    → --diagram-node-primary-fill, etc.
zolto-trait-success    → --diagram-node-success-fill
zolto-trait-danger     → --diagram-node-danger-fill
zolto-trait-warning    → --diagram-node-warning-fill
zolto-trait-glass      → backdrop-filter: blur(12px)
zolto-trait-outline    → fill: transparent; stroke: currentColor
zolto-trait-dashed     → stroke-dasharray: 6 3
zolto-trait-elevated   → filter: drop-shadow(…)
zolto-trait-glow       → filter: drop-shadow(0 0 8px currentColor)
zolto-trait-muted      → opacity: 0.45
zolto-trait-accent     → stroke: var(--accent-primary); stroke-width: 3
```

---

## 14. Chart Rendering

`ChartRenderer.render(node, ctx)` produces SVG charts. All charts are responsive: dimensions derive from the container width via a `ResizeObserver` mounted at runtime.

### 14.1 Chart wrapper

```html
<figure class="zolto-chart zolto-chart-pie" data-id="ch1">
  <div class="zolto-chart-title">Energy Distribution</div>
  <svg class="zolto-chart-svg" viewBox="0 0 400 300">
    <!-- chart body -->
  </svg>
  <div class="zolto-chart-legend"><!-- legend items --></div>
</figure>
```

### 14.2 Chart type → SVG element

| chartType | Primary SVG element |
|-----------|---------------------|
| `PIE` / `DONUT` | `<path>` arc segments |
| `BAR` | `<rect>` bars |
| `LINE` / `AREA` | `<polyline>` / `<path>` with fill |
| `SCATTER` | `<circle>` data points |
| `RADAR` | `<polygon>` / `<polyline>` |
| `GAUGE` | `<path>` arc, needle `<line>` |
| `WATERFALL` | `<rect>` stacked/floating bars |
| `HEATMAP` | `<rect>` grid cells with opacity scale |
| `SANKEY` | `<path>` bezier flows |
| `FUNNEL` | `<trapezoid>` via `<polygon>` |
| `TREEMAP` | `<rect>` nested rectangles |
| `BUBBLE` | `<circle>` with `r` = `sqrt(size)` |
| `POLAR` | `<path>` polar segments |
| `QUADRANT` | `<circle>` data points on 2-axis grid |

### 14.3 Color scheme resolution

Colors are resolved from the active theme's design tokens:

```
intent-primary   → var(--intent-primary,   #6366f1)
intent-success   → var(--intent-success,   #10b981)
intent-warning   → var(--intent-warning,   #f59e0b)
intent-danger    → var(--intent-danger,    #ef4444)
intent-info      → var(--intent-info,      #0ea5e9)
```

When a chart specifies `colors: primary success warning`, the renderer resolves each token and applies it to the corresponding series.

---

## 15. CSS Class Reference

### Base classes (always present)

| Class | Applied to |
|-------|-----------|
| `zolto-heading` | All `<h1>`–`<h6>` |
| `zolto-h{n}` | Level-specific heading |
| `zolto-p` | `<p>` paragraphs |
| `zolto-hr` | `<hr>` |
| `zolto-blockquote` | `<blockquote>` |
| `zolto-callout` | Callout container |
| `zolto-admonition` | Admonition container |
| `zolto-code-block` | Code block wrapper |
| `zolto-table` | `<table>` |
| `zolto-list` | `<ul>` / `<ol>` |
| `zolto-checklist` | Checklist `<ul>` |
| `zolto-definition-list` | `<dl>` |
| `zolto-math-block` | Block equation `<figure>` |
| `zolto-math-inline` | Inline math `<span>` |
| `zolto-diagram` | Diagram `<figure>` |
| `zolto-chart` | Chart `<figure>` |
| `zolto-vector` | Vector scene wrapper |
| `zolto-card` | Card container |
| `zolto-card-group` | Card group container |
| `zolto-tabs` | Tab group container |
| `zolto-accordion` | Accordion `<details>` |
| `zolto-steps` | Steps `<ol>` |
| `zolto-grid` | Grid layout |
| `zolto-flex` | Flex layout |
| `zolto-canvas` | Canvas layout |
| `zolto-whiteboard` | Whiteboard layout |
| `zolto-presentation` | Presentation container |
| `zolto-split` | Split view container |
| `zolto-panel` | Panel container |
| `zolto-component` | Component root |
| `zolto-embed` | Embed `<figure>` |
| `zolto-footnotes` | Footnote `<aside>` |

### Modifier classes

| Class | Meaning |
|-------|---------|
| `zolto-card-primary` | Card with primary intent fill |
| `zolto-card-outline` | Card with border only |
| `zolto-card-glass` | Card with backdrop blur |
| `zolto-tab-active` | Currently visible tab |
| `zolto-tab-hidden` | Hidden tab (has `hidden` attribute) |
| `zolto-checked` | Checked checklist item |
| `zolto-in-progress` | `[o]` checklist item |
| `zolto-blocked` | `[!]` checklist item |
| `zolto-cancelled` | `[~]` checklist item |
| `zolto-gantt-done` | Completed Gantt task |
| `zolto-gantt-active` | Active Gantt task |
| `zolto-gantt-crit` | Critical-path Gantt task |
| `zolto-gantt-milestone` | Gantt milestone |
| `zolto-slide-active` | Current presentation slide |
| `zolto-slide-hidden` | Non-current slide |
| `zolto-panel-collapsed` | Collapsed panel |
| `zolto-anim-{name}` | Animation applied |

---

## 16. Theming & Design Token Injection

### 16.1 Global theme injection

At the start of each render, the renderer injects a `<style>` block into the document head with the resolved design tokens for the active theme:

```html
<style id="zolto-theme-tokens">
  :root {
    --accent-primary:   #6366f1;
    --accent-secondary: #8b5cf6;
    --bg-app:           #0a0a0f;
    --bg-canvas:        #111118;
    --text-main:        #f1f5f9;
    --text-mute:        #94a3b8;
    --font-sans:        "Inter Variable", system-ui, sans-serif;
    --font-mono:        "JetBrains Mono", monospace;
    --radius-md:        8px;
    /* … all tokens … */
  }
</style>
```

### 16.2 Document-level token overrides

`ThemeToken` nodes in the AST are collected into a second `<style>` block that appears after the global theme:

```html
<style id="zolto-document-tokens">
  :root {
    --accent-primary: #0ea5e9;
    --font-sans: "Inter Variable", system-ui, sans-serif;
  }
</style>
```

### 16.3 Scoped theme blocks (`@theme name="…"`)

Named theme blocks are rendered as CSS custom property overrides scoped to a class:

```html
<style id="zolto-theme-physics-palette">
  .zolto-theme-physics-palette {
    --accent-primary: #0ea5e9;
    --card-bg: rgba(14, 165, 233, 0.05);
    --card-border: rgba(14, 165, 233, 0.3);
  }
</style>
```

The layout or component that declares `theme="physics-palette"` receives the class `zolto-theme-physics-palette` on its root element.

### 16.4 Component prop → CSS variable injection

Props declared in a component's `propStyleMap` are injected as inline CSS custom properties:

```html
<div class="zolto-component zolto-cmp-FormulaCard"
     style="--cmp-color:#6366f1; --cmp-bg:rgba(99,102,241,0.1)">
```

---

## 17. Render Modes & Performance

### 17.1 Static render (default)

The default `renderer.render(doc)` is a full synchronous pass. The entire HTML string is assembled in memory before being returned. Used for server-side rendering and initial page load.

### 17.2 Live render (incremental DOM patching)

`renderer.renderToCanvas(doc, el)` renders the AST and then uses a virtual DOM diffing strategy to patch `el` in place. Only nodes that changed are re-rendered. This is the mode used by the live editor canvas.

Patch strategy:
1. Compare incoming `Document.nodes[]` against the previously rendered node list by `node.id`.
2. For unchanged nodes (same id, same content hash), skip re-render.
3. For changed nodes, re-render just that node's fragment and patch the DOM.
4. For added/removed nodes, insert/remove DOM elements.

### 17.3 Lazy render

Components with `render=lazy` are rendered as placeholder `<div class="zolto-lazy-placeholder">` elements. An `IntersectionObserver` triggers the actual render when the element scrolls into view:

```html
<!-- Before intersection -->
<div class="zolto-lazy-placeholder" data-component="HeavyDiagram"
     data-node-id="cu5" style="min-height: 200px">
</div>

<!-- After intersection — placeholder replaced by real render -->
<div class="zolto-component zolto-cmp-HeavyDiagram" data-id="cu5">
  <!-- full rendered content -->
</div>
```

### 17.4 Streaming render

Components with `render=streaming` progressively output their content in chunks. The renderer emits a shell immediately, then fills in heavy sub-nodes (diagrams, charts) asynchronously:

1. Emit component shell HTML with loading spinners in diagram/chart slots.
2. Schedule diagram/chart sub-renders in a microtask queue.
3. Resolve and patch each heavy node as it completes.

### 17.5 GPU-accelerated animations

All animation classes use `transform` and `opacity` only — never properties that trigger layout (`width`, `height`, `top`, `left`). This keeps animations on the GPU compositor thread.

The `will-change: transform, opacity` hint is added only when an animation is actively running and removed on `animationend`.

---

## 18. Error Nodes & Diagnostics

When a node fails to render (e.g. unknown type, missing component def), the renderer emits a diagnostic element instead of crashing:

```html
<div class="zolto-error-node" role="alert" aria-live="assertive"
     data-code="E006" data-node-id="cu3" data-line="42">
  <span class="zolto-error-icon" aria-hidden="true">⚠</span>
  <span class="zolto-error-message">
    Component "UnknownWidget" is not defined. Did you forget to import its definition?
  </span>
  <code class="zolto-error-source">Line 42 · ComponentUse → UnknownWidget</code>
</div>
```

### Renderer error codes

| Code | Trigger |
|------|---------|
| `R001` | Unknown node type — no renderer registered |
| `R002` | MathBlock rendering failed (KaTeX error) |
| `R003` | Diagram layout failed — cycle detected |
| `R004` | Chart data is empty or malformed |
| `R005` | VectorScene has no layers |
| `E006` | ComponentUse references undefined component |
| `R007` | Max nesting depth (32) exceeded |
| `R008` | Animation name not found in `ctx.animationDefs` |

All errors are also emitted to the browser console as `[ZoltoRenderer] Error R00x: …` with the full node JSON for debugging.

---

## 19. Extending the Renderer

### 19.1 Registering a custom node renderer

```js
import { ZoltoRenderer } from './js/renderer/renderer.js';

ZoltoRenderer.registerRenderer('MyCustomNode', (node, ctx) => {
  return `<div class="my-custom-node" data-id="${node.id}">${node.text}</div>`;
});
```

The callback receives the raw AST node and the current `RenderContext`. It must return a valid HTML string.

### 19.2 Registering a custom diagram renderer

```js
import { DiagramRenderer } from './js/renderer/diagram-renderer.js';

DiagramRenderer.register('my-diagram-type', (node, ctx) => {
  // Return SVG string
  return `<svg class="zolto-diagram-my-diagram-type">…</svg>`;
});
```

### 19.3 Registering a custom inline node renderer

```js
import { InlineRenderer } from './js/renderer/inline-renderer.js';

InlineRenderer.register('myInlineType', (node, ctx) => {
  return `<span class="my-inline">${escapeHtml(node.text)}</span>`;
});
```

### 19.4 Hooks

```js
const renderer = new ZoltoRenderer({
  hooks: {
    beforeRenderNode:  (node, ctx) => { /* inspect / mutate node */ },
    afterRenderNode:   (node, html, ctx) => html,      // can transform output
    beforeRenderInline: (nodes, ctx) => { /* … */ },
    afterRenderInline:  (html, ctx) => html,
    onError:           (err, node) => { /* custom error handling */ },
  }
});
```

`afterRenderNode` and `afterRenderInline` receive the rendered HTML string and may return a modified version. This is useful for post-processing (e.g. injecting analytics `data-` attributes, applying output sanitization passes).

---

## 20. Complete HTML Output Examples

### 20.1 Heading with inline content

**AST input:**
```json
{
  "type": "Heading", "id": "newtons-laws", "line": 1,
  "level": 1, "text": "Newton's Laws of Motion",
  "anchor": "newtons-laws", "classes": [], "attrs": {},
  "inline": [{ "type": "text", "text": "Newton's Laws of Motion" }],
  "flags": 0
}
```

**HTML output:**
```html
<h1 id="newtons-laws" class="zolto-heading zolto-h1">Newton's Laws of Motion</h1>
```

---

### 20.2 MathBlock with label and number

**AST input:**
```json
{
  "type": "MathBlock", "id": "mb1", "line": 14,
  "content": "\\mathbf{F} = m\\mathbf{a}",
  "env": "equation", "display": "block",
  "numbered": true, "label": "eq:f=ma", "number": 1,
  "title": "Newton's Second Law",
  "ast": { "type": "Sequence", "children": [ … ] }
}
```

**HTML output:**
```html
<figure class="zolto-math-block" id="mb1" data-label="eq:f=ma">
  <div class="zolto-math-title">Newton's Second Law</div>
  <div class="zolto-math-equation" aria-label="F = m a">
    <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
      <!-- KaTeX MathML for \mathbf{F} = m\mathbf{a} -->
    </math>
  </div>
  <figcaption class="zolto-math-number">(1)</figcaption>
</figure>
```

---

### 20.3 Flowchart diagram

**HTML output:**
```html
<figure class="zolto-diagram zolto-diagram-flowchart" id="dg1"
        data-type="flowchart" data-interactive="true" data-animated="true">
  <div class="zolto-diagram-canvas">
    <svg class="zolto-graph" viewBox="0 0 520 200"
         xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow-dg1" markerWidth="10" markerHeight="7"
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" class="zolto-arrow-head" />
        </marker>
      </defs>
      <g class="zolto-graph-edges">
        <path class="zolto-edge edge-solid"
              d="M 130,70 L 230,70"
              marker-end="url(#arrow-dg1)"
              data-from="Start" data-to="Decision" />
        <path class="zolto-edge edge-solid"
              d="M 330,70 L 430,70"
              marker-end="url(#arrow-dg1)"
              data-from="Decision" data-to="ProcessA" />
        <text class="zolto-edge-label" x="380" y="60">Yes</text>
      </g>
      <g class="zolto-graph-nodes">
        <g class="zolto-node zolto-node-rectangle"
           data-id="Start" transform="translate(30,40)">
          <rect width="100" height="60" rx="4"
                class="zolto-node-shape" />
          <text class="zolto-node-label" x="50" y="35">Start</text>
        </g>
        <g class="zolto-node zolto-node-diamond"
           data-id="Decision" transform="translate(230,20)">
          <polygon points="100,0 200,50 100,100 0,50"
                   class="zolto-node-shape" />
          <text class="zolto-node-label" x="100" y="55">Decision</text>
        </g>
        <g class="zolto-node zolto-node-rectangle zolto-trait-primary"
           data-id="ProcessA" transform="translate(430,40)">
          <rect width="100" height="60" rx="4"
                class="zolto-node-shape" />
          <text class="zolto-node-label" x="50" y="35">Process A</text>
        </g>
      </g>
    </svg>
  </div>
</figure>
```

---

### 20.4 Card with inline math

**HTML output:**
```html
<div class="zolto-card zolto-card-outline" data-id="cd1">
  <div class="zolto-card-header">
    <span class="zolto-card-title">Law 1 · Inertia</span>
  </div>
  <div class="zolto-card-body">
    <p class="zolto-p">Objects resist change in motion.</p>
  </div>
</div>
```

---

### 20.5 ComponentUse output

**HTML output for `<UserCard name="Alice" role="Admin" />`:**
```html
<div class="zolto-component zolto-cmp-UserCard zolto-tone-default"
     data-component="UserCard" data-id="cu1">
  <h3 class="zolto-heading zolto-h3">Alice</h3>
  <p class="zolto-p">Role: <strong class="zolto-bold">Admin</strong></p>
</div>
```

---

### 20.6 Full document render structure

```html
<!– injected by renderer before document.nodes –>
<style id="zolto-theme-tokens">:root { … }</style>
<style id="zolto-document-tokens">:root { … }</style>
<style id="zolto-animations">@keyframes zolto-fadeSlideUp { … }</style>

<!-- document.nodes rendered in order -->
<h1 id="newtons-laws-of-motion" class="zolto-heading zolto-h1">…</h1>

<figure class="zolto-math-block" id="mb1" data-label="eq:f=ma">…</figure>

<div class="zolto-grid" style="--grid-cols:3; --grid-gap:1.5rem">
  <div class="zolto-card zolto-card-outline zolto-anim-fadeSlideUp"
       style="animation-delay:0ms">…</div>
  <div class="zolto-card zolto-card-outline zolto-anim-fadeSlideUp"
       style="animation-delay:60ms">…</div>
  <div class="zolto-card zolto-card-outline zolto-anim-fadeSlideUp"
       style="animation-delay:120ms">…</div>
</div>

<!-- injected after document.nodes -->
<aside class="zolto-footnotes" aria-label="Footnotes">…</aside>
```

---

*Canonical Renderer reference for Zolto v8.1.0.*
*Source: `js/renderer/renderer.js` · AST: `zolto/specs/ast.md` · Syntax: `zolto/specs/syntax.md` · Components: `zolto/specs/components.md`*
*Regenerate: `npm run docs`*
