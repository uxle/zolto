# Zolto Roadmap

**File:** `docs/roadmap.md`
**Version:** 8.1.0 · Infinity Architecture
**Last updated:** 2025

---

## Table of Contents

1. [Current State — v8.1.0](#1-current-state--v810)
2. [Versioning Policy](#2-versioning-policy)
3. [v8.2 — Collaboration & Multiplayer](#3-v82--collaboration--multiplayer)
4. [v8.3 — AI Integration](#4-v83--ai-integration)
5. [v8.4 — Extended Diagram Suite](#5-v84--extended-diagram-suite)
6. [v8.5 — Assessment & Learning Engine](#6-v85--assessment--learning-engine)
7. [v9.0 — Desktop Application](#7-v90--desktop-application)
8. [v9.1 — Mobile & Tablet](#8-v91--mobile--tablet)
9. [v9.2 — Publishing & Sharing](#9-v92--publishing--sharing)
10. [v10.0 — Zolto Runtime](#10-v100--zolto-runtime)
11. [Ongoing Improvements](#11-ongoing-improvements)
12. [Icebox](#12-icebox)
13. [Known Limitations](#13-known-limitations)

---

## 1. Current State — v8.1.0

### Shipped

**Core language (Infinity Architecture)**
- Complete Markdown superset — all CommonMark + GFM supported
- Six capability domains: Rich Markdown, Mathematics, Diagrams, Vector Graphics, Spatial Layouts, Components
- `@directive … @/directive` block syntax unified across all domains
- Inline syntax: bold, italic, code, math, links, images, highlights, strikethrough, superscript, subscript, mentions, hashtags, emoji, colour, variable refs
- Frontmatter (YAML/TOML), variables `$name = value`, imports `@import`, CSS token overrides

**Mathematics**
- KaTeX rendering (MathML output)
- MathJax fallback backend
- All standard environments: `equation`, `align`, `gather`, `multline`, `cases`
- Function plots with root detection
- Custom macros: `\bra`, `\ket`, `\braket`, `\prob`, `\expect`, `\var`, `\cov`, `\std`, `\N`
- Equation numbering and `\ref{}` cross-references
- Chemistry notation via `\ce{}`

**Diagrams**
- 17 diagram types: `flowchart`, `sequence`, `state`, `erd`, `mindmap`, `gantt`, `timeline`, `network`, `architecture`, `dependency`, `tree`, `pipeline`, `kanban`, `geometry`, `circuit`, `atom`, `grammar-tree`
- 20+ node shapes, 20+ edge operators
- Node traits: `+primary`, `+success`, `+danger`, `+warning`, `+glass`, `+outline`, `+dashed`, `+elevated`, `+glow`, `+muted`, `+accent`
- Dagre, force-directed, radial, and fixed-lane layout algorithms
- Interactive pan/zoom/click on all diagrams
- Entrance animations

**Charts**
- 16 chart types: `pie`, `donut`, `bar`, `line`, `area`, `scatter`, `radar`, `gauge`, `waterfall`, `heatmap`, `sankey`, `funnel`, `treemap`, `bubble`, `polar`, `quadrant`
- SVG output, responsive via `ResizeObserver`
- Theme-aware colour token resolution

**Vector Graphics**
- `@vector` scenes with named layers and artboards
- 14 primitive shape types
- Connectors with straight, curved, elbow, smart routing
- Camera pan/zoom

**Spatial Layouts**
- `@grid`, `@flex`, `@canvas`, `@whiteboard`, `@presentation`, `@split`, `@panel`
- 8 presentation slide layouts
- Resizable split panes
- Collapsible panels
- Infinite whiteboard with pan/zoom

**Component System**
- `@component` definition with typed props and defaults
- Named slots with fallback content
- Variants: size, tone, shape, outline, ghost, theme
- `@template`, `@macro`
- `@animate` with stagger support
- Animation library: `fadeIn`, `fadeSlideUp`, `fadeSlideDown`, `fadeSlideLeft`, `fadeSlideRight`, `scaleIn`, `popIn`, `bounceIn`, `slideUp`, `flipIn`
- `render=lazy` and `render=streaming` modes
- Component registry with circular dependency detection

**Assessment**
- `@mcq` — multiple choice, multi-select, true/false, fill-in-blank, matrix
- `@flashcard` — front/back with difficulty and tags
- `@quiz` — wrapper grouping multiple MCQs

**Live editor**
- `contenteditable` surface with inline syntax highlighting
- Virtual DOM differ — only changed nodes re-render
- 16 ms debounce render pipeline
- `Cmd+K` command palette
- Autocomplete for directives and component names
- Keyboard shortcuts for all common formatting operations
- Split-pane, live, and focus preview modes

**Themes**
- Four built-in themes: `light`, `dark`, `midnight`, `oled`
- Full CSS custom property token system
- Document-level token overrides
- Scoped `@theme` blocks

**Export**
- HTML (self-contained, inline CSS)
- PDF (browser print / Puppeteer)
- Markdown (CommonMark)
- Plain text
- JSON (AST)

**Plugin system**
- `install` / `uninstall` lifecycle
- Custom node renderers
- Custom diagram types
- Parser hooks
- Toolbar and palette extension points

---

## 2. Versioning Policy

Zolto follows **semantic versioning** with the following interpretation:

| Change | Version bump |
|--------|-------------|
| New syntax or node types | Minor (`8.x`) |
| Breaking AST schema change | Major (`x.0`) |
| New renderer output features | Minor (`8.x`) |
| Bug fixes, performance | Patch (`8.1.x`) |
| New export format | Minor |
| Breaking plugin API change | Major |

**AST stability guarantee:** Within a major version, `ASTFactory` method signatures never change. New optional parameters may be appended. Existing fields on node shapes are never removed or renamed. Consumers that use `ASTFactory` exclusively will never break on a minor version bump.

**Renderer output guarantee:** Within a minor version, the CSS class names and `data-*` attributes on rendered HTML are stable. New classes may be added. Existing classes are never removed.

---

## 3. v8.2 — Collaboration & Multiplayer

**Target:** Q3 2025

### Real-time co-editing

Operational Transform (OT) or CRDT-based collaborative editing. Two or more users editing the same document simultaneously with presence indicators (named cursors).

- WebSocket-based sync server (`ws/collab-server.js`)
- Conflict-free replicated document type for the source text
- Cursor presence: coloured named carets for each connected user
- Awareness: which line each collaborator is currently on
- Merge conflict resolution UI for offline/reconnect scenarios

### Comments & annotations

- `@comment` inline annotation syntax attached to a specific text range
- Sidebar comment thread panel
- Resolved/unresolved state
- `@annotation` for diagram node annotations (sticky note attached to a node id)

### Document sharing

- Share link generation (read-only and edit permissions)
- Password-protected shares
- Expiry dates on share links
- Embed code for iframes (rendered preview only)

### Version history

- Automatic snapshot on every save
- Visual diff between any two snapshots
- Restore to any snapshot
- Named versions ("Draft", "Final", "Submitted")

---

## 4. v8.3 — AI Integration

**Target:** Q4 2025

### Inline AI assistant

`/ai` command in the editor opens an inline AI prompt. The assistant can:

- Continue writing from the cursor position
- Rewrite selected text in a different tone
- Summarise a selected block
- Explain a selected equation in plain language
- Generate a diagram from a natural language description
- Fill in a table from a description

### Smart autocomplete

Context-aware completions that go beyond directive names:

- Suggest the next diagram node based on existing graph structure
- Suggest equation labels based on content
- Complete component prop values from the component definition

### Document intelligence

- Automatic outline generation from headings
- Reading time estimate
- Concept extraction and cross-reference suggestions
- Grammar and clarity suggestions (opt-in)

### AI-generated diagrams

Natural language → diagram source:

```
/diagram "Show a CI/CD pipeline from push to deploy"
```

Generates valid Zolto flowchart syntax inserted at the cursor.

### Math assistance

- Step-by-step equation solving (powered by a CAS backend)
- LaTeX error explanation ("You wrote `\frace` — did you mean `\frac`?")
- Unit checker for physics equations

---

## 5. v8.4 — Extended Diagram Suite

**Target:** Q1 2026

### New diagram types

| Type | Description |
|------|-------------|
| `uml-class` | Full UML class diagram with method signatures, visibility markers, relationships |
| `uml-usecase` | Use case diagram with actors, associations, extends, includes |
| `uml-component` | Component diagram with interfaces and connectors |
| `bpmn` | Business Process Model and Notation subset |
| `wireframe` | Low-fidelity UI wireframe components (button, input, modal, nav) |
| `network-topology` | Network topology with device icons (router, switch, server, firewall) |
| `data-flow` | DFD with processes, data stores, external entities |
| `c4` | C4 model diagrams (Context, Container, Component, Code) |

### Diagram editor

An optional visual drag-and-drop editor for diagrams. Changes in the visual editor are reflected back as Zolto source text in real time.

- Node creation by clicking the canvas
- Edge drawing by dragging from node handles
- Property panel for node shape, label, and traits
- Auto-layout button that re-runs the layout algorithm
- Export diagram as standalone SVG

### Cross-diagram references

Link a node in one diagram to a node in another:

```zolto
@diagram flowchart
  [AuthService] +primary @ref="arch:auth-service"
@/diagram
```

Clicking the node in the rendered preview navigates to the referenced node in the architecture diagram.

---

## 6. v8.5 — Assessment & Learning Engine

**Target:** Q2 2026

### Expanded question types

| Type | Description |
|------|-------------|
| `short-answer` | Free-text response with keyword matching or AI grading |
| `long-answer` | Essay response with rubric |
| `matching` | Match items in two lists |
| `ordering` | Drag to put steps in the correct order |
| `labelling` | Click on an image to label regions |
| `drawing` | Freehand drawing response (whiteboard canvas) |
| `code` | Code editor response with test runner |

### Spaced repetition

- Flashcard scheduling algorithm (SM-2)
- Review session mode: presents due cards
- Progress tracking: ease factor, interval, repetitions per card
- Statistics dashboard: retention rate, cards due, streak

### Quiz sessions

- Timed quiz mode
- Randomised question order
- Randomised option order
- Immediate feedback mode vs end-of-quiz feedback
- Score breakdown by topic tag
- Export results as CSV

### Learning analytics

Per-document:
- Completion percentage (cards reviewed / total)
- Average score across quiz attempts
- Time spent
- Weak areas (tags with lowest average scores)

### Course mode

Group multiple Zolto documents into an ordered course:

```zolto
@course title="Classical Mechanics"
  @unit "Kinematics"   src="unit-1-kinematics.zl"
  @unit "Dynamics"     src="unit-2-dynamics.zl"
  @unit "Energy"       src="unit-3-energy.zl"
@/course
```

Navigation sidebar, progress tracking, and prerequisite locking.

---

## 7. v9.0 — Desktop Application

**Target:** Q3 2026

Zolto packaged as a native desktop application via **Tauri** (Rust backend + WebView frontend). The web codebase runs unchanged inside the WebView.

### Desktop-specific features

**File system integration**
- Open and save `.zl` files from the native file system
- Watch files for external changes and prompt to reload
- Drag `.zl` files onto the dock/taskbar to open them
- Recent files in the OS file menu and dock jumplist

**Native menus**
- Full native menu bar (File, Edit, View, Insert, Format, Tools, Help)
- All editor shortcuts registered as native menu accelerators
- Context menus on diagram nodes, images, and links

**Window management**
- Multiple windows, each with an independent document
- Split-window mode: two documents side by side in one window
- Fullscreen focus mode

**Performance**
- Local SQLite database via Tauri's `tauri-plugin-sql` for document storage
- File-system-based asset cache for embedded images
- Native PDF export via OS print dialog (no Puppeteer dependency)

**System integration**
- Spotlight / Windows Search indexing of document content
- macOS Quick Look plugin for `.zl` files
- File association: `.zl` opens in Zolto by default

### Platforms

| Platform | Minimum version |
|----------|----------------|
| macOS | 12 Monterey |
| Windows | 10 (64-bit) |
| Linux | Ubuntu 22.04 / Fedora 38 |

---

## 8. v9.1 — Mobile & Tablet

**Target:** Q4 2026

### iOS & Android apps

React Native shell wrapping the Zolto web renderer. Editing on mobile uses a native keyboard-aware input component. The preview renders in a WebView.

### Tablet-first editing

On iPad and Android tablets (screen width ≥ 768 px), the full split-pane editor is available:
- Left pane: Zolto source with mobile-optimised toolbar
- Right pane: live preview

On phones, a tab bar switches between Edit and Preview.

### Mobile toolbar

A scrollable floating toolbar above the keyboard with one-tap insert for:
- Headings H1–H3
- Bold, italic, code
- `@math` block
- `@diagram flowchart`
- `@card`, `@grid`
- Callout types

### Offline support

- Full IndexedDB storage on mobile
- Service Worker caches all static assets
- Full editing and preview work offline
- Sync when connection restored

### Touch gestures

- Pinch to zoom the preview
- Two-finger swipe to switch between Edit and Preview
- Long press on a diagram to open the diagram editor
- Tap a math block to edit the LaTeX inline

---

## 9. v9.2 — Publishing & Sharing

**Target:** Q1 2027

### Zolto Publish

One-click publish a document or course to a public URL:

```
https://zolto.app/p/{username}/{slug}
```

- Custom slug
- Custom domain support (CNAME)
- Password protection
- Unlisted (link-only) mode
- SEO metadata from frontmatter (`title`, `description`, `og:image`)

### Embed

Embed any published document as an interactive iframe:

```html
<iframe src="https://zolto.app/embed/{id}"
        width="100%" height="600"
        frameborder="0"></iframe>
```

Embed respects the document's theme and all interactive features (tabs, accordions, quizzes, diagrams).

### Static site export

Export an entire course or document set as a fully self-contained static site:

```bash
zolto export --format site --output ./dist
```

Produces an `index.html` entry point with all pages, a navigation sidebar, and full search.

### RSS & Changelog feed

Documents published with `type: blog` or `type: changelog` automatically generate an RSS feed at `/feed.xml`.

### Analytics

Optional privacy-respecting view analytics for published documents:
- Page views, unique visitors
- Average reading time
- Quiz completion rate
- No third-party tracking, no cookies

---

## 10. v10.0 — Zolto Runtime

**Target:** 2027

A standalone Zolto compiler and runtime for use outside the editor.

### CLI

```bash
# Compile a .zl file to HTML
npx zolto compile input.zl -o output.html

# Compile with options
npx zolto compile input.zl --theme dark --math-backend katex -o output.html

# Watch mode
npx zolto watch input.zl -o output.html

# Export to multiple formats
npx zolto export input.zl --pdf --md --json -o ./dist

# Serve a document with live reload
npx zolto serve input.zl --port 3000
```

### Node.js API

```js
import { compile, parse, render } from '@zolto/runtime';

// Full pipeline: source → HTML
const html = await compile(source, { theme: 'dark' });

// Individual stages
const ast  = parse(source);
const html = render(ast, { theme: 'dark' });
```

### AST CLI

```bash
# Print the AST as JSON
npx zolto ast input.zl

# Validate a document
npx zolto validate input.zl

# Count nodes by type
npx zolto stats input.zl
```

### Plugin registry

A public npm-compatible registry for Zolto plugins:

```bash
npm install @zolto/plugin-chemistry
npm install @zolto/plugin-music-notation
npm install @zolto/plugin-tikz
```

Plugins installed as npm packages are automatically discovered and loaded.

### Language Server Protocol

A Zolto LSP server for IDE integration:

```bash
npm install -g @zolto/language-server
```

Provides to any LSP-compatible editor:
- Syntax highlighting (TextMate grammar)
- Diagnostic errors and warnings
- Directive autocompletion
- Component name and prop completion
- Hover documentation for directives and math macros
- Go to definition for component names and `\ref{}` labels
- Document symbol outline
- Rename refactoring for component names and variable names

### VS Code extension

An official VS Code extension built on the Zolto LSP:
- Full language support
- Inline preview panel (`Ctrl+Shift+V`)
- Export commands in the command palette
- Snippet library for all directives

---

## 11. Ongoing Improvements

These items are not version-gated — they ship as ready across all minor versions.

### Performance
- Incremental transformer (re-run only affected passes when source changes)
- Worker thread for the parser pipeline (off main thread)
- Streaming renderer output for very large documents (> 10,000 nodes)
- `requestIdleCallback` for non-visible diagram layout

### Accessibility
- Full keyboard navigation for tabs, accordions, presentations, and quizzes
- ARIA live regions for preview updates
- High-contrast theme
- Reduced motion mode (respects `prefers-reduced-motion`)
- Screen reader testing pass for all interactive components

### Internationalisation
- RTL layout support for Arabic, Hebrew, Persian documents
- `lang` attribute injection on rendered HTML
- Locale-aware number and date formatting in charts and Gantt

### Math
- Additional environments: `subequations`, `split`, `aligned`, `gathered`
- Commutative diagrams via `tikz-cd` subset
- Chemical structure diagrams via a `mol` sub-syntax within `@math`
- Interactive sliders for `@interactive` math blocks

### Diagrams
- More edge routing options: curved, bezier, step
- Edge waypoints (manually positioned bends)
- Node groups / subgraphs with collapsible regions
- Diagram search/filter (highlight matching nodes)
- Export individual diagram as SVG or PNG

### Editor
- Multi-file workspace (tabs for multiple open documents)
- Global search across all documents
- Find and replace within the current document
- Code folding for `@directive` blocks
- Minimap for long documents
- Distraction-free full-screen mode

### Themes
- Theme builder UI (edit tokens visually, preview in real time)
- Import/export custom themes as JSON
- Community theme gallery

---

## 12. Icebox

Features that are under consideration but not yet scheduled.

**Zolto Forms** — `@form` block with input, select, textarea, and submit. Form submissions post to a configurable endpoint. Useful for contact forms, feedback collection, and event registrations embedded in published documents.

**Zolto Data** — `@data src="file.csv"` block that loads a CSV or JSON file and makes its rows/columns available as variables for charts, tables, and math expressions. Enables data-driven documents that update automatically when the source data changes.

**Zolto Notebook** — A Jupyter-inspired mode where code blocks are executable. Supports JavaScript (in-browser), Python (via Pyodide/WASM), and R (via webR). Output (text, charts, images) is captured and rendered inline below the code block.

**Zolto Slides Presenter Mode** — Fullscreen presentation mode with a presenter view (current slide + next slide + speaker notes on a second display), slide timer, and remote control via a paired mobile device.

**Zolto Print Stylesheet** — An officially maintained print CSS file that produces well-formatted printed output for all Zolto node types — including paginated math, diagrams that scale to fit the page, and properly headed sections.

**Plugin Marketplace UI** — An in-app browser for discovering, installing, and managing community plugins, with ratings, version history, and dependency resolution.

**Zolto for Notion / Obsidian** — Import plugins that convert Notion exports and Obsidian vaults into Zolto documents, preserving as much structure as possible.

---

## 13. Known Limitations

These are current limitations of v8.1.0 that will be addressed in future releases.

| Limitation | Planned fix | Target |
|-----------|------------|--------|
| No real-time collaboration | v8.2 CRDT sync | v8.2 |
| No file-system access (browser only) | Tauri desktop app | v9.0 |
| PDF export requires browser print dialog | Native PDF in desktop app | v9.0 |
| No incremental parsing | Transformer incremental pass | Ongoing |
| Math sliders (`@interactive`) not yet implemented | Full interactive blocks | v8.3 |
| No mobile app | React Native app | v9.1 |
| `@vector` camera pan/zoom JS not shipped | Vector JS runtime | v8.2 |
| No LSP / IDE integration | Zolto Runtime LSP | v10.0 |
| Plugin API covers renderer and parser only | Full UI extension API | v8.2 |
| Whiteboard has no persistence layer | Whiteboard sync | v8.2 |
| Gantt does not auto-calculate dates from duration | Gantt date engine | v8.4 |
| No BPMN or C4 diagram types | Extended diagram suite | v8.4 |
| No spaced repetition engine | Learning engine | v8.5 |
| Single document per window | Multi-file workspace | Ongoing |

---

*Zolto v8.1.0 · Infinity Architecture*
*Source: `docs/roadmap.md` · Architecture: `docs/architecture.md` · Changelog: `docs/changelog.md`*r