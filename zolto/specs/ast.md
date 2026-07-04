# Zolto AST Specification

**Version:** 2.0.0

The AST is produced by `src/parser.js` and consumed by `src/renderer.js`
and `src/validator.js`. All nodes are created via `src/ast.js` factory functions.

## Document Root

```js
{
  type: 'document',
  children: Node[],
  metadata: {
    title?: string,
    author?: string,
    variables?: Map<string, string>,
    references?: Map<string, { href, title }>   // Phase 2
  }
}
```

## Phase 2 Block Nodes

### callout
```js
{ type: 'callout', calloutType: string, title: string|null, children: Node[] }
```

### admonition
```js
{ type: 'admonition', admonType: string, title: string|null, children: Node[] }
```

### figure
```js
{ type: 'figure', src: string, alt: string, title: string|null, caption: string|null,
  lazy: boolean, width: string|null, height: string|null }
```

### definition_list / definition_item
```js
{ type: 'definition_list', items: DefinitionItem[] }
{ type: 'definition_item', term: string, defs: string[] }
```

### reference_def
```js
{ type: 'reference_def', id: string, href: string, title: string|null }
```

### code_block (extended)
```js
{ type: 'code_block', lang, meta, value, title, highlightLines, lineNumbers, diff }
```

### table (extended)
```js
{ type: 'table', align, head, rows, caption: string|null }
```

## Phase 2 Inline Nodes

```js
{ type: 'superscript', children: InlineNode[] }
{ type: 'subscript',   children: InlineNode[] }
{ type: 'highlight',   children: InlineNode[] }
{ type: 'kbd',         value: string }
{ type: 'html_entity', raw: string }        // raw = 'copy' | '#160' | '#x2014'
{ type: 'ref_link',    id: string, children: InlineNode[] }
```

## See also

`src/ast.js` — all node factory functions with JSDoc
`src/renderer.js` — HTML output for every node type
