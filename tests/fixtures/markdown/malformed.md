# Malformed Markdown Fixture

These should not crash the parser.

## Unclosed emphasis
*not closed

## Missing footnote ref
Text[^missing].

## Table without separator
| A | B |
| 1 | 2 |

## Nested emphasis confusion
*a **b* c**
