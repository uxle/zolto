# Getting Started with Zolto

Zolto is an **Extended Markdown** engine — a strict superset of CommonMark
that adds production-quality block and inline syntax while staying 100%
backward-compatible with standard Markdown.

## Prerequisites

- Node.js 20 LTS or newer
- Any modern browser (Chrome 120+, Firefox 121+, Safari 17+)

## Installation

**Option A — Zolto Studio (browser, no install)**

```bash
git clone https://github.com/zolto/zolto.git
cd zolto
node scripts/dev.js        # starts http://localhost:3000
```

Open `http://localhost:3000` in your browser. Zolto Studio appears instantly.

**Option B — Engine only (ES module)**

```javascript
import { compile, parse } from './src/zolto.js';

const html = compile('# Hello, **Zolto**!');
console.log(html);
// → <h1 id="hello-zolto">Hello, <strong>Zolto</strong>!</h1>
```

## Your first document

Create `hello.zl`:

```zolto
---
title: My First Zolto Document
---

# Hello, Zolto!

> [!TIP]
> You already know Zolto if you know Markdown.
> Every `.md` file is a valid `.zl` file.

This document uses **Phase 2** features:

- Callout above using `> [!TIP]`
- ==Highlighted text== with `==text==`
- Smart dashes: first --- second

[info]
Start writing. Zolto renders as you type.
[/info]
```

Compile it:

```javascript
import { compile } from './src/zolto.js';
import { readFileSync } from 'fs';
const html = compile(readFileSync('hello.zl', 'utf8'));
```

## Next steps

- Read [Basic Syntax](basic-syntax.md) for the complete Markdown reference
- Read [Advanced Syntax](advanced-syntax.md) for Phase 2 features
- Open [Zolto Studio](http://localhost:3000) and explore the default demo
