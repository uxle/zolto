# Parser API

## parse(src)

```typescript
function parse(src: string): ParseResult
```

### ParseResult

```typescript
interface ParseResult {
  ast:         DocumentNode;
  errors:      string[];      // Human-readable error strings
  warnings:    string[];      // Human-readable warning strings
  diagnostics: Diagnostics;   // Structured diagnostic object
}
```

### Example

```javascript
import { parse } from './src/zolto.js';

const { ast, errors, warnings, diagnostics } = parse(`
# Hello World

See [link][ref] and note[^1].

[ref]: https://example.com
[^1]: A footnote.
`);

console.log(errors);         // [] — no errors
console.log(warnings);       // [] — all refs resolved
console.log(ast.type);       // 'document'
console.log(ast.children[0].type);  // 'heading'
console.log(ast.metadata.references.get('ref'));
// { href: 'https://example.com', title: null }
```

### Lexer errors

Lexer errors (unclosed fences, unclosed admonitions) are returned in
`errors` and also in `diagnostics.errors`. The `ast` is still returned —
Zolto always recovers and produces a best-effort AST.

### Diagnostic codes

| Code | Severity | Trigger |
| :--- | :------- | :------ |
| `E001` | error | Unclosed fence / comment / admonition |
| `W001` | warning | Undefined `{{variable}}` reference |
| `W002` | warning | Undefined footnote `[^id]` |
| `W003` | warning | Undefined reference def |
| `W004` | warning | Duplicate reference def id |
| `W005` | warning | Duplicate explicit heading id |
| `W010` | warning | Unresolved reference link `[text][id]` |
