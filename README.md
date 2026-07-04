# Zolto

> **Extended Markdown** — a production-quality document engine that is a strict superset of
> standard Markdown. Every valid `.md` file is a valid `.zl` file.

[![CI](https://github.com/zolto/zolto/actions/workflows/ci.yml/badge.svg)](https://github.com/zolto/zolto/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Phase](https://img.shields.io/badge/phase-2-indigo)](docs/development/roadmap.md)

## Features — Phase 2

| Feature | Syntax | Output |
|---------|--------|--------|
| **GitHub Callouts** | `> [!NOTE]` | Coloured callout box with icon |
| **Admonitions** | `[info]…[/info]` | Boxed block with header |
| **Reference links** | `[text][id]` + `[id]: url` | Resolved `<a>` |
| **Figures** | Standalone `![alt](src)` | `<figure>` + `<figcaption>` |
| **Definition lists** | `term\n: def` | `<dl><dt><dd>` |
| **Table captions** | `Table: Caption` before table | `<caption>` |
| **Code titles** | `` ```js title="a.js" `` | Header bar with title |
| **Line numbers** | `` ```js numbers `` | Numbered gutter |
| **Highlighted lines** | `` ```js {1,3-5} `` | Per-line highlighting |
| **Diff blocks** | `` ```diff `` | `+`/`-` coloured |
| **Superscript** | `^text^` | `<sup>` |
| **Subscript** | `~text~` | `<sub>` |
| **Highlight** | `==text==` | `<mark>` |
| **Keyboard keys** | `[[Ctrl+S]]` | `<kbd>` |
| **HTML entities** | `&copy;` `&#x2764;` | Verbatim / decoded |
| **Smart punctuation** | `---` `--` `...` | `—` `–` `…` |
| **Diagnostics** | — | Structured error/warning API |

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
# → 233/233 tests passed · all green
```

## Project structure

```
src/          Core engine (the only code that ships in v2)
  ast.js      AST node factories
  tokenizer.js Utilities + HTML entity map
  lexer.js    Block tokenizer
  inline-parser.js Inline parser
  parser.js   Block → AST
  diagnostics.js Structured error/warning system
  validator.js AST walker + diagnostics
  renderer.js HTML generator
  zolto.js    Public API
tests/        Full test suite (233 tests, 31 suites)
index.html    Zolto Studio — GitHub Pages UI
examples/     Sample .zl documents
docs/         Developer documentation
```

## Phase roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| Phase 1 | ✅ Done | Markdown core |
| **Phase 2** | ✅ Done | Extended Markdown |
| Phase 3 | Planned | Math + Diagrams |
| Phase 4 | Planned | Components + Layouts |
| Phase 5 | Planned | Full enterprise structure |

## License

[MIT](LICENSE) © Zolto Team
