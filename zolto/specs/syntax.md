# Zolto Syntax Reference

**Version:** 2.0.0 · Phase 2 · Extended Markdown

---

## Overview

Zolto is a **strict superset of Markdown**. Every standard `.md` file
is a valid `.zl` file that compiles unchanged.

## Phase 2 Block Syntax

### GitHub-style Callouts

```
> [!NOTE]
> Content of the callout.
```

Types: `NOTE` `TIP` `WARNING` `IMPORTANT` `CAUTION` `DANGER`
(case-insensitive). Custom title: `> [!NOTE] My Title`

### Admonition Blocks

```
[info]
Content here — supports **nested markdown**.
[/info]

[warning title="Custom Title"]
Content.
[/warning]
```

24 types: `info` `warning` `tip` `success` `danger` `note`
`definition` `theorem` `proof` `caution` `important` `example`
`question` `bug` `quote` `abstract` `todo` `failure`
`seealso` `summary` `hint` `check` `attention`

### Reference Links

```
[Link text][ref-id]
[ref-id][]          ← shorthand: text used as id

[ref-id]: https://example.com "Optional title"
```

### Table Captions

```
Table: My Caption Text

| Column A | Column B |
| -------- | -------- |
| value    | value    |
```

### Definition Lists

```
Term
: First definition
: Second definition
```

### Code Block Metadata

```
```lang title="filename" {2,4-6} numbers diff
```

Options: `title="…"` `numbers` `{line-ranges}` `diff`

### Standalone Figure

A paragraph containing only a single image becomes a `<figure>`:

```
![Alt text](image.png "Caption text")
```

## Phase 2 Inline Syntax

| Syntax | Output | Description |
|--------|--------|-------------|
| `^text^` | `<sup>` | Superscript |
| `~text~` | `<sub>` | Subscript |
| `==text==` | `<mark>` | Highlight |
| `[[key]]` | `<kbd>` | Keyboard key |
| `&copy;` | `&copy;` | Named HTML entity |
| `&#160;` | NBSP | Decimal entity |
| `&#x2014;` | — | Hex entity |
| `---` | — | Em dash |
| `--` | – | En dash |
| `...` | … | Ellipsis |

## Phase 1 Syntax (inherited, all working)

See `docs/guide/basic-syntax.md` for the complete Phase 1 reference.
