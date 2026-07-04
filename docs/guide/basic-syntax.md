# Basic Syntax Reference

Zolto is a strict superset of Markdown. Everything here works in standard
Markdown too.

## Headings

```
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

Custom id and classes: `## Section {#my-id .my-class}`

## Emphasis

| Syntax | Output |
| :----- | :----- |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `***bold italic***` | ***bold italic*** |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `` `inline code` `` | `inline code` |

## Links

```markdown
[text](https://example.com)
[text](https://example.com "Title")
<https://auto-link.com>
<email@example.com>
```

## Images

```markdown
![Alt text](image.png)
![Alt text](image.png "Title")
```

A standalone image (paragraph with only one image) becomes a `<figure>`.

## Lists

```markdown
- Unordered item
  - Nested item
- Another item

1. Ordered item
2. Second item

- [x] Completed task
- [ ] Pending task
```

## Blockquotes

```markdown
> A blockquote.
> > Nested blockquote.
```

## Code blocks

````markdown
```javascript
const x = 42;
```
````

## Tables

```markdown
| Column A | Column B | Column C |
| :------- | :------: | -------: |
| Left     | Center   | Right    |
```

## Horizontal rules

```markdown
---
***
___
```

## Footnotes

```markdown
Text with a footnote[^1].

[^1]: The footnote content.
```

## Variables

```zolto
@var name = Alice

Hello, {{name}}!
```

## Comments

```zolto
<!-- This comment is not rendered -->
```
