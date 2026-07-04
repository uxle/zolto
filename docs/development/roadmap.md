# Roadmap

## Phase 1 — Markdown Core ✅

Full CommonMark/GFM-compatible Markdown engine. 60+ tests.

## Phase 2 — Extended Markdown ✅

Callouts, admonitions, reference links, figures, definition lists,
table captions, code metadata, extended inlines, diagnostics. 233 tests.

## Phase 3 — Math + Diagrams (planned)

- KaTeX inline `$...$` and block `$$...$$`
- Mermaid diagram integration
- Function plots
- Chemistry notation `\ce{H2O}`

## Phase 4 — Components + Layouts (planned)

- `@component` / `@slot` system
- JSX-style component invocation `<Card title="…">`
- `@grid` / `@flex` layout blocks
- Full editor UI (`js/editor/`) with contenteditable surface
- Command palette, autocomplete, folding

## Phase 5 — Enterprise Structure (planned)

- Extract CSS from `index.html` into `css/` modules
- Promote `js/` stubs to real implementations
- VS Code LSP extension
- npm package publication
- Full Playwright e2e test suite
