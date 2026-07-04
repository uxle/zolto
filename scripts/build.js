#!/usr/bin/env node
/**
 * scripts/build.js — Production bundle (Phase 5)
 * Phase 2 uses native ES modules — this script is a no-op placeholder.
 * Phase 5 will use esbuild to produce a minified dist/zolto.min.js.
 */
console.log('Zolto Phase 2: No build step required.');
console.log('ES modules run natively in all modern browsers and Node 20+.');
console.log('\nFor Phase 5 bundling, this script will use esbuild:');
console.log('  esbuild src/zolto.js --bundle --minify --format=esm --outfile=dist/zolto.min.js');
