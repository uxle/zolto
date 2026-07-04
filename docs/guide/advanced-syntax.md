# Advanced Syntax Reference — Phase 2

These features are unique to Zolto (not in standard Markdown).

## GitHub-style Callouts

```markdown
> [!NOTE]
> Content here.

> [!TIP]
> With a custom title:

> [!WARNING] Watch Out
> Body text.
```

**Available types:** `NOTE` `TIP` `WARNING` `IMPORTANT` `CAUTION` `DANGER`

## Native Admonition Blocks

```zolto
[info]
Content here.
[/info]

[warning title="Custom Title"]
Content with **nested markdown**.
[/warning]
```

**All 24 types:** `info` `warning` `tip` `success` `danger` `note`
`definition` `theorem` `proof` `caution` `important` `example`
`question` `bug` `quote` `abstract` `todo` `failure` `seealso`
`summary` `hint` `check` `attention`

## Reference Links

```markdown
[Link text][ref-id]
[ref-id][]

[ref-id]: https://example.com "Optional title"
```

## Enhanced Code Blocks

```
```lang title="filename" {1,3-5} numbers diff
```

| Option | Syntax | Effect |
| :----- | :----- | :----- |
| Title | `title="name"` | Header bar with filename |
| Line numbers | `numbers` | Numbered gutter |
| Highlighted lines | `{1,3-5}` | Background on specified lines |
| Diff mode | `diff` or lang `diff` | `+`/`-` line colouring |

## Extended Inline Syntax

| Syntax | Output | Meaning |
| :----- | :----- | :------ |
| `^text^` | `<sup>` | Superscript |
| `~text~` | `<sub>` | Subscript |
| `==text==` | `<mark>` | Highlight |
| `[[key]]` | `<kbd>` | Keyboard key |
| `&copy;` | © | Named HTML entity |
| `&#160;` | NBSP | Decimal entity |
| `---` | — | Em dash |
| `--` | – | En dash |
| `...` | … | Ellipsis |

## Table Captions

```markdown
Table: Caption text here

| A | B |
|---|---|
| 1 | 2 |
```

## Definition Lists

```markdown
Term
: First definition
: Second definition
```

## Diagnostics

`parse()` returns a structured `Diagnostics` object:

```javascript
const { errors, warnings, diagnostics } = parse(src);

// Structured access
diagnostics.errors.forEach(d => console.log(d.code, d.message, d.line));
diagnostics.hasErrors();   // boolean
diagnostics.toString();    // summary string
```
