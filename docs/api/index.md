# Zolto API Reference

**Version:** 2.0.0 · Phase 2

---

## Core API  (`src/zolto.js`)

| Export | Type | Description |
| :----- | :--- | :---------- |
| `parse(src)` | Function | Parse source → AST + diagnostics |
| `render(ast, opts?)` | Function | AST → HTML string |
| `compile(src, opts?)` | Function | parse + render combined |
| `renderInline(nodes, ctx)` | Function | Render inline node array → HTML |
| `inlineToText(nodes)` | Function | Extract plain text from inline nodes |
| `about()` | Function | Return library metadata banner |
| `VERSION` | string | `'2.0.0'` |
| `PHASE` | number | `2` |

## Diagnostics API  (`src/diagnostics.js`)

| Export | Description |
| :----- | :---------- |
| `Diagnostics` | Class — collects errors, warnings, info |
| `Severity` | Enum — `ERROR` `WARNING` `INFO` |
| `Code` | Enum — all error/warning codes |
| `fromPlain(obj)` | Convert legacy `{errors, warnings}` to `Diagnostics` |

## Detailed References

- [parser-api.md](parser-api.md) — `parse()` options, `ParseResult` shape
- [renderer-api.md](renderer-api.md) — `render()` options, `RenderOptions` shape
- [types.md](types.md) — TypeScript-style type definitions for all nodes
- [events.md](events.md) — Event system (Phase 4)
- [plugin-api.md](plugin-api.md) — Plugin installation API (Phase 3)
- [state-api.md](state-api.md) — App state API (Phase 4)
- [editor-api.md](editor-api.md) — Editor API (Phase 4)
