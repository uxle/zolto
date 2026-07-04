# Configuration

## Render options

```javascript
import { render } from './src/zolto.js';

const html = render(ast, {
  xhtml:           false,  // Self-close void elements (<br />, <img />)
  footnoteSection: true,   // Append footnotes <section> at document end
});
```

## Frontmatter

```yaml
---
title: Document Title
author: Author Name
date: 2025-01-15
---
```

Frontmatter values are available in the AST as `ast.metadata`.

## Variables

```zolto
@var name = Alice
@var version = 2.0.0

Hello, {{name}}! Version: {{version}}
```

## Smart punctuation

Smart punctuation (em dash, en dash, ellipsis) is enabled by default
in the inline parser. It applies only to plain text — not inside code
spans or code blocks.

Disable per-call (Phase 3):

```javascript
// smartPunctuation option — Phase 3
const nodes = parseInline(text, { smartPunctuation: false });
```
