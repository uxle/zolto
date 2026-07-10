# Changelog

All notable changes to Zolto are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) |
Versioning: [Semantic Versioning](https://semver.org/)

---

## [3.0.0] — Phase 3 — Native Block Directives

### Added

#### Universal Directive Syntax
- `@name … @/name` block syntax — the single pattern behind all 14 new component types
- Attribute parser supporting quoted strings, bare strings, numbers, booleans, and
  positional first arguments (`@badge success` vs `@badge variant=success`)
- Recursive Markdown parsing inside every directive body (bold, links, lists, code
  blocks, footnotes, and even other directives all work inside directive content)
- Depth-aware nesting — directives can contain directives to unlimited depth

#### 14 New Directive Types
- **`@embed`** — image, video, audio, youtube, vimeo, figma, codepen, codesandbox, iframe;
  automatic YouTube/Vimeo ID extraction, lazy loading, captions, responsive `<figure>` wrapper
- **`@collapse`** — `<details>/<summary>` disclosure widget with `open` state control
- **`@tabs` / `@tab`** — accessible tab groups with ARIA roles, keyboard-navigable, unlimited tabs
- **`@card` / `@card-group`** — variant-aware cards (default/primary/success/warning/danger/
  outline/ghost) with icon, title, description, image, and href-as-link support; responsive grid groups
- **`@steps` / `@step`** — numbered step lists with automatic numbering, optional icon override
- **`@columns` / `@column`** — responsive flex columns with fixed or auto width
- **`@badge`** — 7 variants × pill/outline modifiers, optional icon
- **`@tag`** — coloured topic tags, optional icon and href-as-link
- **`@alert`** — 6 alert types, optional title, optional dismiss button hook
- **`@timeline` / `@event`** — vertical event timeline with dates and icons
- **`@progress`** — linear progress bar with label, percent display, 4 color variants
- **`@avatar`** — image, initials, or icon fallback; 5 sizes; 4 status indicator states
- **`@icon`** — Material Symbols icon rendering with size, color, and accessible label

#### Architecture
- `src/directive-lexer.js` — attribute string parser (`parseAttrStr`), child directive
  extractor (`extractChildren`), block lexer (`lexDirective`)
- `src/directives.js` — converts directive tokens into typed AST nodes for all 14 types
- `src/directive-renderer.js` — HTML output for all 14 types + embedded CSS, injected
  once via `<style id="zl-p3-styles">` only when Phase 3 directives are present in the document
- `PHASE3_NODE_TYPES` set added to `src/ast.js` for renderer dispatch and CSS-injection detection
- Phase 3 validator checks: missing `embed` src, `progress` value out of range, empty
  `tabs`/`steps`/`timeline` containers

#### Tests
- `tests/fixtures-p3.js` — 92 fixtures across embed, collapse, tabs, cards, steps, columns,
  badge, tag, alert, timeline, progress, avatar, icon, nesting, and attribute-parsing groups
- `tests/tests-p3.js` — unit tests for directive-lexer, directives→AST, directive-renderer
  CSS injection, Phase 3 validator diagnostics, integration, and stress/performance
- 147 new tests; 380 total across 54 suites (Phase 1 + 2 + 3 combined)

### Changed
- `VERSION` → `'3.0.0'`, `PHASE` → `3`
- `tests/tests.js` is now a thin combined runner over `tests-p2.js` + `tests-p3.js`
- CSS injection is conditional — documents with zero Phase 3 directives carry zero
  extra bytes of Phase 3 CSS

### Compatibility
- 100% backward compatible — every Phase 1 and Phase 2 test (233 tests) still passes unchanged
- No existing syntax was modified; directives are purely additive

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
