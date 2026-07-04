# Renderer API

## render(ast, opts?)

```typescript
function render(ast: DocumentNode, opts?: RenderOptions): string
```

### RenderOptions

```typescript
interface RenderOptions {
  xhtml?:           boolean;  // default: false — self-close void elements
  footnoteSection?: boolean;  // default: true  — append footnotes section
}
```

### Example

```javascript
import { parse, render } from './src/zolto.js';

const { ast } = parse('# Hello

Paragraph[^1].

[^1]: A note.');
const html = render(ast, { xhtml: true, footnoteSection: false });
```

## compile(src, opts?)

Convenience wrapper: `compile(src, opts)` = `render(parse(src).ast, opts)`.

```javascript
import { compile } from './src/zolto.js';
const html = compile('# Hello **world**');
// → <h1 id="hello-world">Hello <strong>world</strong></h1>
```

## CSS class reference

All rendered elements carry `zl-*` prefixed classes:

| Class | Element |
| :---- | :------ |
| `zl-callout` | Callout container (`> [!NOTE]`) |
| `zl-callout-{type}` | Type modifier (note / tip / warning …) |
| `zl-admonition` | Admonition container (`[info]…[/info]`) |
| `zl-admonition-{type}` | Type modifier |
| `zl-cb` | Code block wrapper |
| `zl-code-header` | Code block header bar |
| `zl-code-title` | Code block filename |
| `zl-copy` | Copy button |
| `zl-pre` | `<pre>` element |
| `zl-ln` | Single code line `<span>` |
| `zl-has-nums` | Applied to `<pre>` when line numbers enabled |
| `zl-hl` | Highlighted line |
| `zl-diff-add` | Diff added line |
| `zl-diff-rem` | Diff removed line |
| `zl-table-wrap` | Responsive table wrapper |
| `zl-table` | Table element |
| `zl-figure` | Figure wrapper |
| `zl-caption` | Figure or table caption |
| `zl-dl` | Definition list |
| `zl-dt` | Definition term |
| `zl-dd` | Definition description |
| `zl-fn-ref` | Footnote reference superscript |
| `zl-footnotes` | Footnotes section |
| `zl-fn-back` | Backlink from footnote |
| `zl-broken-ref` | Unresolved reference link span |
| `zl-task` | Task list item |
| `zl-done` | Completed task list item |
