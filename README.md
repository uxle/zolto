# Zolto

> **Native Block Directives** — a production-quality document engine that is a strict
> superset of standard Markdown. Every valid `.md` file is a valid `.zl` file.

[![CI](https://github.com/uxle/zolto/actions/workflows/ci.yml/badge.svg)](https://github.com/uxle/zolto/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Phase](https://img.shields.io/badge/phase-3-indigo)](docs/development/roadmap.md)

## Features — Phase 3

### Native Block Directives (new)

| Directive | Syntax | Purpose |
|-----------|--------|---------|
| `@embed` | `@embed image src="…" @/embed` | image / video / audio / youtube / vimeo / figma / codepen / iframe |
| `@collapse` | `@collapse title="…" @/collapse` | Disclosure widget |
| `@tabs` / `@tab` | `@tabs @tab label="…" @/tab @/tabs` | Accessible tab groups |
| `@card` / `@card-group` | `@card title="…" @/card` | Variant cards, responsive grid |
| `@steps` / `@step` | `@steps @step title="…" @/step @/steps` | Numbered step lists |
| `@columns` / `@column` | `@columns @column width="…" @/column @/columns` | Responsive layout |
| `@badge` | `@badge success pill @/badge` | 7 variants × pill/outline |
| `@tag` | `@tag color=… href="…" @/tag` | Coloured topic tags |
| `@alert` | `@alert warning title="…" @/alert` | 6 alert types, dismissible |
| `@timeline` / `@event` | `@timeline @event title="…" @/event @/timeline` | Vertical event timeline |
| `@progress` | `@progress value=75 @/progress` | Linear progress bar |
| `@avatar` | `@avatar initials="…" status="…" @/avatar` | Image/initials/icon avatar |
| `@icon` | `@icon name size=24 @/icon` | Material Symbols icon |

### Extended Markdown (Phase 2, still fully supported)

| Feature | Syntax | Output |
|---------|--------|--------|
| GitHub Callouts | `> [!NOTE]` | Coloured callout box with icon |
| Admonitions | `[info]…[/info]` | Boxed block with header |
| Reference links | `[text][id]` + `[id]: url` | Resolved `<a>` |
| Figures | Standalone `![alt](src)` | `<figure>` + `<figcaption>` |
| Definition lists | `term\n: def` | `<dl><dt><dd>` |
| Code titles/numbers/diff | `` ```js title="a.js" {1,3} numbers `` | Header bar, gutter, highlights |
| Superscript/Subscript | `^text^` / `~text~` | `<sup>` / `<sub>` |
| Highlight/Kbd | `==text==` / `[[Ctrl+S]]` | `<mark>` / `<kbd>` |

All Phase 1 features (headings, lists, tables, footnotes, variables, etc.) continue working unchanged.

## Quick start

```bash
git clone https://github.com/zolto/zolto.git
cd zolto
# Open index.html in any static server — no build step required
npx serve . --port 3000
```

Or use the engine in your own project (ES modules):

```javascript
import { compile, parse } from './src/zolto.js';

// One-call compile
const html = compile('# Hello **world**\n\n> [!TIP]\n> Try it out!');

// Step-by-step with diagnostics
const { ast, errors, warnings, diagnostics } = parse(source);
const html2 = render(ast, { xhtml: false, footnoteSection: true });
```

## API

```typescript
// parse(src) → { ast, errors, warnings, diagnostics }
parse(src: string): ParseResult

// render(ast, opts?) → html string
render(ast: DocumentNode, opts?: { xhtml?: boolean, footnoteSection?: boolean }): string

// compile(src, opts?) → html string  (parse + render combined)
compile(src: string, opts?: RenderOptions): string
```

## Tests

```bash
node tests/run-all.js
# → 380/380 tests passed · all green
```

## Project structure

```
src/          Core engine (the only code that ships in v3)
  ast.js               AST node factories (Phase 1 + 2 + 3 nodes)
  tokenizer.js         Utilities + HTML entity map
  lexer.js             Block tokenizer
  inline-parser.js     Inline parser
  parser.js            Block → AST
  directive-lexer.js   @directive attribute parser + child extractor
  directives.js        Directive tokens → typed AST nodes (14 types)
  directive-renderer.js HTML + CSS for all 14 directive types
  diagnostics.js       Structured error/warning system
  validator.js         AST walker + diagnostics
  renderer.js          HTML generator
  zolto.js             Public API
tests/        Full test suite (380 tests, 54 suites)
index.html    Zolto Studio — GitHub Pages UI
examples/     Sample .zl documents
docs/         Developer documentation
```

## Phase roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| Phase 1 | ✅ Done | Markdown core |
| Phase 2 | ✅ Done | Extended Markdown |
| **Phase 3** | ✅ Done | Native Block Directives |
| Phase 4 | Planned | Math + Diagrams |
| Phase 5 | Planned | Components + Layouts + Full enterprise structure |

## License

[MIT](LICENSE) © Zolto Team
