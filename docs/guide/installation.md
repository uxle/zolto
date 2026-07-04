# Installation

## No build step

Zolto Phase 2 uses **native ES modules**. No bundler, no transpiler,
no build step required in development.

```
Node.js 20+  ──→  ES modules  ──→  run directly
Browser      ──→  ES modules  ──→  load directly via <script type="module">
```

## Development server

```bash
node scripts/dev.js          # http://localhost:3000
node scripts/dev.js 4000     # custom port
```

## GitHub Pages deployment

Push to `main`. The `.github/workflows/pages.yml` workflow deploys
`index.html` automatically. No build step needed.

## Using the engine in your project

Copy `src/` into your project and import directly:

```javascript
import { compile }      from './zolto/src/zolto.js';
import { parse, render} from './zolto/src/zolto.js';
import { Diagnostics }  from './zolto/src/diagnostics.js';
```

## Requirements

| Requirement | Minimum |
| :---------- | :------ |
| Node.js | 20.0.0 |
| Chrome | 120 |
| Firefox | 121 |
| Safari | 17 |
| Edge | 120 |
