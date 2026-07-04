# Changelog

All notable changes to Zolto are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) |
Versioning: [Semantic Versioning](https://semver.org/)

---

## [2.0.0] — Phase 2 — Extended Markdown

### Added

#### Block syntax
- **GitHub-style callouts** `> [!NOTE]` · `> [!TIP]` · `> [!WARNING]` ·
  `> [!IMPORTANT]` · `> [!CAUTION]` · `> [!DANGER]` with icons, colour, ARIA
- **Native admonitions** `[type]…[/type]` with optional `title="…"` attr;
  supports 24 types including `info` `warning` `tip` `theorem` `definition` `proof`
- **Reference links** `[text][id]` + `[id]: url "optional title"` with validation
- **Figures** — standalone images auto-promoted to `<figure>/<figcaption>`
- **Definition lists** `term\n: definition` → `<dl><dt><dd>`
- **Table captions** — `Table: Caption text` before a table → `<caption>`

#### Code blocks (metadata system)
- `title="…"` — header bar with filename
- `numbers` — line-number gutter via CSS counters
- `{1,3-5}` — highlighted line ranges
- `diff` language or `diff` flag — `+`/`-` line colouring
- Copy button with instant clipboard feedback

#### Inline syntax
- Superscript `^text^` → `<sup>`
- Subscript `~text~` → `<sub>` (distinct from `~~strikethrough~~`)
- Highlight `==text==` → `<mark>`
- Keyboard keys `[[key]]` → `<kbd>`
- HTML entities `&copy;` `&#160;` `&#x2014;` — 150+ named entities decoded
- Smart punctuation `---` → `—`, `--` → `–`, `...` → `…`
- Reference-style links `[text][id]` and shorthand `[id][]`

#### Architecture
- `src/diagnostics.js` — `Diagnostics` class, `Severity` enum, `Code` constants
- `src/validator.js` — rewritten to use Diagnostics; Phase 2 checks added
- `parse()` returns `{ ast, errors, warnings, diagnostics }` — `diagnostics`
  is a full `Diagnostics` instance for structured access
- `lastRealIndex()` in lexer fixes `tokens.pop()` races with blank tokens
- Nested-emphasis `findClosingDelim` fixed: exact run-length matching only
- Unclosed frontmatter now emits a structured lexer error

### Fixed
- `*italic **bold** italic*` — nested emphasis now parses correctly
- Definition list: `tokens.pop()` replaced by `tokens.splice(lastRealIndex())`
- Table caption: same `splice(lastRealIndex())` fix for BLANK-separated caption
- Unclosed frontmatter `---` silently ignored → now emits `E001` diagnostic
- `diff` code block: auto-detects `lang="diff"` without requiring meta flag
- Paragraph loop: breaks before `: definition` marker lines

### Changed
- `VERSION` → `'2.0.0'`, `PHASE` → `2`
- Standalone images now produce `<figure>` nodes (renderer upgrade)
- Tables now wrapped in `<div class="zl-table-wrap" role="region">`
- Footnote / task-list CSS classes unified under `zl-` prefix
- Canvas header subtitle changed to "Extended Markdown" from "Spatial Runtime"

---

## [1.0.0] — Phase 1 — Markdown Core

### Added
- Block lexer, cursor-based inline parser, AST node factory
- Block parser, AST validator, stateless HTML renderer
- Public API `parse()`, `render()`, `compile()`
- 60+ tests across 20 suites
- Zolto Studio UI: deep navy dot-grid canvas, glassmorphic headers,
  brand gradient text, four themes, resizable divider, live preview,
  toolbar, toast notifications, file open/save, PDF export, test modal
