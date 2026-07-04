# Markdown Edge Cases

## Delimiter ambiguity
_not italic if surrounded by letters_a_
**double**__also double__

## Escaped characters
\*not italic\* \[not a link\]

## Empty structures
![](empty-src.png)
[](empty-href.com)

## Deeply nested
- L1
  - L2
    - L3
      - L4
        - L5

## Code with HTML inside
```html
<div class="test">&amp;</div>
```

## Table alignment edge
| Left | Center | Right | Default |
| :--- | :----: | ----: | ------- |
| L    | C      | R     | D       |
