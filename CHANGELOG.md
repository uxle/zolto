# Changelog

All notable changes to Zolto are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) |
Versioning: [Semantic Versioning](https://semver.org/)

---

## [4.0.0] — Phase 4 — Native Mathematics Engine

### Added

#### Inline & Display Math
- `$expr$` inline math with Pandoc-style currency-safe delimiter matching —
  a candidate closing `$` is rejected when immediately followed by a digit,
  so `It costs $10 or $20` never triggers math mode; `\$` escapes a literal dollar
- `@math name="…" label="…" env=… numbered=… … @/math` display math blocks
- Equation numbering (shared counter across the document) with `numbered=false` opt-out
- `@ref(label)` cross-references — resolved links to numbered equations,
  with a visible broken-reference marker and validation warning when undefined
- `env=align` / `env=gather` multi-line equations (bare `&`/`\\`-separated
  rows, no `\begin{}` wrapper required)

#### Mathematical Expressions
- Fractions (`\frac`), roots (`\sqrt`, `\sqrt[n]{}`), powers, subscripts,
  combined sub+superscript
- Big operators: `\sum`, `\prod`, `\int`/`\iint`/`\iiint`/`\oint`, `\lim`
  (and `\limsup`/`\liminf`/`\max`/`\min`/`\sup`/`\inf`) — modeled as
  standalone atoms with `children:[lo,hi]`, matching real LaTeX semantics
  rather than a synthetic "body" argument
- Matrices: `matrix`, `pmatrix`, `bmatrix`, `vmatrix`, `Vmatrix`, `Bmatrix`,
  `cases` (piecewise functions), `aligned`
- Auto-sized `\left … \right` delimiters, plus automatic pairing of bare
  `(x)`, `[a,b]`, `|x|` typed without `\left`/`\right`
- Vectors (`\vec`), accents (`\hat` `\dot` `\ddot` `\tilde` `\bar`),
  `\overline`/`\underline`/`\overbrace`/`\underbrace`
- `\mathbf`/`\boldsymbol` bold, `\mathbb` blackboard-bold set symbols
- 25+ recognized functions (`\sin` `\cos` `\tan` `\log` `\ln` `\exp` `\gcd` …)
  rendered upright, never italicized

#### Symbols
- Full Greek alphabet (lower + upper), operators, relations, arrows,
  logic/set-theory symbols, geometry and misc symbols — ~150 named commands
  total, each with a Unicode mapping (`src/math-symbols.js`)

#### Architecture
- `src/math-tokenizer.js` — LaTeX-like lexical scanner, independent of the
  Markdown tokenizer; `\text{}`/`\mathrm{}`/`\operatorname{}` content is
  captured as raw text directly during tokenization (never re-tokenized as math)
- `src/math-ast.js` — 21 node types matching the Phase 4 spec's naming
  (`Number`, `Identifier`, `Operator`, `UnaryExpression`, `BinaryExpression`,
  `Fraction`, `Root`, `Power`, `Subscript`, `SubSup`, `Summation`, `Product`,
  `Integral`, `Limit`, `Matrix`, `FunctionCall`, `Vector`, `Equation`,
  `EquationGroup`, …)
- `src/math-parser.js` + `src/math-matrix.js` — Pratt precedence-climbing
  parser (relational → additive → multiplicative/implicit → unary → postfix
  → primary); matrix/environment parsing installed as a prototype mixin to
  avoid a circular import
- `src/math-renderer.js` — visual HTML/CSS output (stacked fractions,
  radical overlines, matrix grids, auto-scaling delimiters), plus
  `mathToPlainText()` for `aria-label` generation
- `src/math-mathml.js` — semantic MathML (`<mfrac>` `<msqrt>` `<msup>`
  `<mtable>` …) for native screen-reader accessibility
- `src/math-validator.js` — duplicate label and undefined `@ref()` detection
- Every equation renders **both** HTML (visible) and MathML (visually-hidden,
  `aria-label` fallback) — the same hybrid strategy KaTeX uses internally
- Math CSS injected once via `<style id="zl-math-styles">`, only when math
  nodes are present — same conditional-injection pattern as Phase 3's directive CSS
- New diagnostic codes: `M001`–`M006` (unknown command, unclosed environment,
  mismatched environment, duplicate label, undefined reference, parse error)

#### Tests
- `tests/fixtures-p4.js` — 60 fixtures across inline math, block math,
  equation refs, expressions, symbols, functions, and error recovery
- `tests/tests-p4.js` — unit tests for the tokenizer, symbol tables, parser
  (precedence, error recovery), HTML renderer, MathML renderer, validator,
  integration with Phases 1–3, and stress/performance
- 131 new tests; 511 total across 63 suites (Phases 1–4 combined)

### Fixed
- Two latent Phase 3 lexer gaps, discovered while extending the paragraph-break
  logic for `@math`: a paragraph immediately followed by an `@directive` or
  `@math` line with no blank-line separator was incorrectly absorbed as
  paragraph text instead of starting a new block

### Compatibility
- 100% backward compatible — every Phase 1–3 test (380 tests) still passes unchanged
- No existing syntax was modified; math is purely additive

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
