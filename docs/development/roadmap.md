# Roadmap

## Phase 1 — Markdown Core ✅

Full CommonMark/GFM-compatible Markdown engine. 60+ tests.

## Phase 2 — Extended Markdown ✅

Callouts, admonitions, reference links, figures, definition lists,
table captions, code metadata, extended inlines, diagnostics. 233 tests.

## Phase 3 — Native Block Directives ✅

14 component types via universal `@directive` syntax: embed, collapse,
tabs, cards, steps, columns, badges, tags, alerts, timeline, progress,
avatar, icon. 380 tests (cumulative).

## Phase 4 — Native Mathematics Engine ✅

LaTeX-like math syntax with zero external dependencies (no KaTeX/MathJax
required). Inline `$...$` and block `@math...@/math`, equation numbering,
`@ref()` cross-references, full expression support (fractions, roots,
matrices, big operators, piecewise functions, vectors, accents), dual
HTML+MathML rendering for accessibility. 511 tests total (cumulative).

## Phase 5 — Diagrams & Data Visualization (planned)

- Native flowchart / sequence / state-machine diagram syntax
- Chart directive for bar/line/pie/scatter visualizations
- SVG rendering backend shared across both

## Phase 6 — Components + Layouts (planned)

- `@component` / `@slot` system
- JSX-style component invocation `<Card title="…">`
- `@grid` / `@flex` layout blocks
- Full editor UI (`js/editor/`) with contenteditable surface
- Command palette, autocomplete, folding

## Phase 7 — Enterprise Structure (planned)

- Extract CSS from `index.html` into `css/` modules
- Promote `js/` stubs to real implementations
- VS Code LSP extension
- npm package publication
- Full Playwright e2e test suite
