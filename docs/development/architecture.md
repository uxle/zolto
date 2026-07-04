# Architecture

**Phase 2 — Engine in `src/`**

```
src/
  ast.js          AST node factory — all node shapes
  tokenizer.js    Character scanner + utilities + HTML entity map
  lexer.js        Block tokenizer → typed token stream (T.*)
  inline-parser.js Cursor-based inline parser
  parser.js       Block tokens → Document AST
  diagnostics.js  Structured error/warning accumulator
  validator.js    AST walk + diagnostic emission
  renderer.js     Pure-functional AST → HTML string
  zolto.js        Public API: parse() / render() / compile()
```

## Data flow

```
source string
    │
    ▼
tokenize(src)          ← lexer.js
    │  Block tokens (T.HEADING, T.ADMONITION, T.TABLE …)
    ▼
parseTokens(tokens)    ← parser.js
    │  Document AST (callout, admonition, figure, ref_link …)
    ▼
validate(ast)          ← validator.js
    │  errors[], warnings[], Diagnostics
    ▼
render(ast, opts)      ← renderer.js
    │
    ▼
HTML string
```

## Key design invariants

1. **800-line file limit** — every file in `src/` stays under 800 lines
2. **Pure renderer** — `render(ast)` always produces identical output for identical input
3. **No DOM in src/** — renderer produces strings; no `document` / `window` references
4. **Diagnostic recovery** — parser always returns an AST, even for malformed input
5. **`lastRealIndex()` for token mutation** — never use blind `tokens.pop()`;
   always find the exact token index to avoid BLANK-token splice races

## Phase progression

| Phase | Structure | Status |
| :---- | :-------- | :----- |
| 1 | `src/` flat | ✅ Done |
| 2 | `src/` flat (extended) | ✅ Done |
| 3 | `src/` + `plugins/builtins/math` | Planned |
| 4 | `src/` + `js/editor/` | Planned |
| 5 | Full enterprise tree | Planned |
