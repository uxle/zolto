# Building

## Development (no build step)

```bash
node scripts/dev.js    # serves . at http://localhost:3000
```

ES modules load natively in all target browsers. No bundling required.

## Production bundle (Phase 5)

```bash
node scripts/build.js
```

Currently a no-op. Phase 5 will use esbuild:

```bash
esbuild src/zolto.js \
  --bundle \
  --minify \
  --format=esm \
  --outfile=dist/zolto.min.js
```

## GitHub Pages deployment

Push to `main`. The `pages.yml` workflow deploys automatically.

## Bundle size analysis

```bash
node scripts/analyze-bundle.js
```

Shows current `src/` file sizes. Total Phase 2 engine: ~50 KB unminified.
