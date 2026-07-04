# Contributing to Zolto

## Getting started
```bash
git clone https://github.com/zolto/zolto.git && cd zolto
node tests/run-all.js   # all tests must pass before you start
```

No build step. No bundler in development. ES modules run natively in Node 20+.

## File layout
| Path | Purpose |
|------|---------|
| `src/` | Core engine — the only code that ships |
| `tests/` | Test suite (run with `node tests/run-all.js`) |
| `index.html` | Zolto Studio — single-file GitHub Pages UI |
| `examples/` | Example `.zl` documents |
| `docs/` | Developer and user documentation |
| `js/`, `css/`, `plugins/` | Future-phase stubs — not yet implemented |

## Making a change
1. Create a feature branch: `git checkout -b feat/my-feature`
2. Write the code, then write (or update) tests for it
3. `node tests/run-all.js` — all 233+ tests must pass
4. Open a pull request targeting `main`

## Code rules
- **No files over 800 lines** — split if needed
- **ES modules only** — no `require()`
- **All source files under `src/`** keep Phase 2's flat structure
- **No hardcoded assumptions** — use the AST factory, not raw objects

## Adding a Phase 2 feature
1. Add the AST node to `src/ast.js`
2. Lex it in `src/lexer.js`
3. Parse it in `src/parser.js`
4. Validate it in `src/validator.js`
5. Render it in `src/renderer.js`
6. Add fixtures to `tests/fixtures.js`
7. Add tests to `tests/tests.js`
8. Document it in `docs/guide/advanced-syntax.md`
