# Zolto Language Syntax Reference

**File:** `zolto/specs/syntax.md`
**Version:** 8.1.0 (Infinity Architecture · Human-Friendly Edition)
**Source of truth:** `js/parser/tokenizer.js` · `js/parser/parser.js` · `zolto/specs/ast.md`

---

## Table of Contents

1. [Language Overview](#1-language-overview)
2. [File Format](#2-file-format)
3. [Lexical Conventions](#3-lexical-conventions)
4. [Domain 1 — Rich Text & Typography](#4-domain-1--rich-text--typography)
5. [Domain 2 — Mathematics](#5-domain-2--mathematics)
6. [Domain 3 — Diagrams & Graphs](#6-domain-3--diagrams--graphs)
7. [Domain 4 — Charts & Data](#7-domain-4--charts--data)
8. [Domain 5 — Vector & Graphics](#8-domain-5--vector--graphics)
9. [Domain 6 — Spatial Layouts](#9-domain-6--spatial-layouts)
10. [Domain 7 — Component System](#10-domain-7--component-system)
11. [Domain 8 — Assessment & Interactive](#11-domain-8--assessment--interactive)
12. [Inline Syntax](#12-inline-syntax)
13. [Directive Reference](#13-directive-reference)
14. [Edge Operators](#14-edge-operators)
15. [Node Shape Syntax](#15-node-shape-syntax)
16. [Token Operator Precedence](#16-token-operator-precedence)
17. [Complete Examples](#17-complete-examples)

---

## 1. Language Overview

Zolto (`.zl`) is a **unified visual markup language** that replaces five separate tools with a single coherent syntax. It is designed to express how humans naturally think — combining prose, mathematics, diagrams, spatial layouts, and interactive components in a single readable file.

### How to learn Zolto in two rules

> **Rule 1 — Everything you know from Markdown works unchanged.**
> Headings, bold, italic, lists, blockquotes, code blocks, links, images — all standard Markdown is fully supported as-is.
>
> **Rule 2 — Everything else uses `@directive … @/directive` blocks.**
> Math, diagrams, charts, layouts, components, and assessments all follow the same `@keyword … @/keyword` pattern. Once you know the keyword, you know the syntax.

That's it. You can write a complete Zolto document knowing only those two rules. The rest of this reference is a lookup table for what keywords exist and what they accept.

### Design Goals

| Goal | Principle |
|------|-----------|
| **Human-readable** | Source is as readable as Markdown without a renderer |
| **No escape hell** | Currency (`$10`), brackets (`[item]`), and angle brackets work naturally |
| **Domain-complete** | One language covers all content types — nothing lives outside |
| **Education-first** | MCQ, flashcard, quiz, interactive math are first-class features |
| **V8-optimised** | Parser produces monomorphic AST nodes; renderer never de-opts |

### Six Capability Domains

```
Domain 1  ── Rich Markdown & Typography   (standard Markdown + admonitions, tabs, cards)
Domain 2  ── LaTeX-level Mathematics      (@math, inline $…$, plots, interactive sliders)
Domain 3  ── Mermaid-level Diagramming    (@diagram, @timeline, spatial graph blocks)
Domain 4  ── Native SVG & Vector Graphics (@vector, shapes, layers, artboards)
Domain 5  ── Spatial Layout System        (@grid, @flex, @canvas, @presentation, @split)
Domain 6  ── Component & Template System  (@component, @template, @macro, @animate)
```

### A complete Zolto document in 10 lines

```zolto
---
title: Quick Demo
---

# Newton's Second Law

The net force equals mass times acceleration: $F = ma$.

@math name="Newton's Second Law"
  \mathbf{F} = m\mathbf{a}
@/math

[tip] Always draw a free-body diagram before solving force problems. [/tip]
```

That single file uses Markdown (heading, paragraph), inline math, a block math equation, and an admonition — three of the six domains — with zero setup.

### Learning path

| If you want to… | Go to… |
|----------------|--------|
| See the full language in one document | §17.1 Beginner Quick-Start |
| Look up a specific syntax | §4–§11 domain sections |
| Find a directive keyword | §13 Directive Reference |
| Understand how it compiles | `zolto/specs/ast.md` |
| Build custom components | `zolto/specs/components.md` |

---

## 2. File Format

### File Extension

Zolto source files use the `.zl` extension. The MIME type is `text/x-zolto`.

### Encoding

Files **must** be UTF-8 encoded. BOM characters are stripped silently.

### Line Endings

Both `LF` (`\n`) and `CRLF` (`\r\n`) are accepted. The tokenizer normalises to `LF` before processing.

### Indentation

Indentation uses **spaces only**. Tabs produce a diagnostic `L001` error. Block nesting (lists, directives, diagram bodies) uses **2-space increments**.

---

## 3. Lexical Conventions

### 3.1 Comments

```zolto
// Single-line comment — ignored by the parser entirely

/* Multi-line comment
   Spans any number of lines
   Ends with the closing marker */
```

Comments are stripped before AST construction and never appear in rendered output.

### 3.2 Frontmatter

An optional YAML/TOML frontmatter block at the very start of the file (line 0):

```zolto
---
title: Newton's Laws of Motion
author: Dr. A. Kumar
date: 2025-09-01
theme: dark
tags: [physics, mechanics, foundation]
---
```

Frontmatter keys are available as document metadata and as variables inside the document via `{$title}`, `{$author}`, etc.

### 3.3 Variables

```zolto
$subject = "Classical Mechanics"
$year    = 2025
$author  := "Prof. Singh"   // := is an alias for =
```

Reference a variable anywhere in body text:

```zolto
This document covers {$subject} for {$year}.
```

### 3.4 Imports

```zolto
@import "shared/header.zl"
@import "components/callout.zl" as callout
```

Imports are resolved by the transformer before rendering. Circular imports produce error `E003`.

### 3.5 Theme Tokens

Override CSS custom properties for this document:

```zolto
--font-sans: "Inter Variable", sans-serif
--accent-primary: #6366f1
--bg-canvas: #0a0a0f
```

### 3.6 Blank Lines

Blank lines (lines containing only whitespace) act as paragraph separators. Multiple consecutive blank lines collapse to one.

---

## 4. Domain 1 — Rich Text & Typography

> **Zolto is a strict superset of Markdown.** Every `.md` file is a valid `.zl` file. If you already know Markdown, you already know Domain 1 — skip straight to §5 (Math) if you like.

### 4.1 Headings

```zolto
# Heading Level 1
## Heading Level 2
### Heading Level 3
#### Heading Level 4
##### Heading Level 5
###### Heading Level 6
```

Custom ID and classes:

```zolto
## Installation Guide {#install}
### Advanced Usage {#adv .highlight .pinned}
```

> **Token:** `HEADING` · **Regex:** `/^(#{1,6})\s+(.*?)(?:\s+\{([^}]*)\})?\s*$/`

---

### 4.2 Paragraphs

Any line that does not match a block-level token is treated as paragraph text. Consecutive non-blank lines are joined into a single paragraph.

```zolto
This is a paragraph. It can span multiple lines
by simply continuing on the next line without a blank line.

A blank line starts a new paragraph.
```

---

### 4.3 Horizontal Rules

```zolto
---
===
***
~~~
```

Any sequence of three or more identical rule characters (`-`, `=`, `*`, `~`) on their own line produces a horizontal rule.

---

### 4.4 Blockquotes

```zolto
> This is a blockquote.
> It can span multiple lines.

> > Nested blockquote.
```

---

### 4.5 Callout Blocks (GitHub-style)

```zolto
> [!NOTE]
> Useful supplementary information.

> [!WARNING]
> This action cannot be undone.

> [!TIP]
> You can skip this step if you are an advanced user.
```

Supported callout types: `NOTE` `TIP` `INFO` `WARNING` `DANGER` `CAUTION` `IMPORTANT` `SUCCESS` `CHECK` `BUG` `EXAMPLE` `QUOTE` `ABSTRACT` `TODO` `QUESTION` `FAILURE` `HELP` `HINT` `ATTENTION` `SEEALSO` `SUMMARY`

---

### 4.6 Admonition Blocks (Zolto Native)

The bracket syntax is the fastest way to add visual callouts. The type name is both the opening and closing tag — no attributes needed for the most common cases.

```zolto
[important]
Newton's First Law is the foundation of classical mechanics.
[/important]

[tip]
Always draw a free-body diagram before solving force problems.
[/tip]

[warning]
Do not confuse mass (kg) with weight (N).
[/warning]

[info]
This concept builds directly on kinematics from Chapter 2.
[/info]

[definition]
**Inertia**: The resistance of an object to changes in its state of motion.
[/definition]

[theorem]
If $F_{net} = 0$, then $\mathbf{a} = 0$.
[/theorem]
```

**All types:** `important` `tip` `warning` `info` `note` `success` `danger` `example` `definition` `theorem` `proof`

> **Tip:** If you want a custom title, use the `:::` fenced form (see §4.7). The bracket form uses the type name as the title automatically.

---

### 4.7 Fenced Blocks (Extended Markdown Syntax)

```zolto
::: warning Watch Out
This section has a custom title passed as the second argument.
:::

::: info
No title — block type becomes the default title.
:::
```

> **Token:** `MD_BLOCK_START` · **Regex:** `/^:::\s*([a-zA-Z0-9_-]+)(?:\s+(.+))?\s*$/`

---

### 4.8 Code Blocks

````zolto
```javascript
const acceleration = force / mass;
```

```python {3,7} title="Newton's Law Demo"
def f_equals_ma(m, a):
    return m * a  # highlighted line
```

```zolto
# This is Zolto inside a code block
@math
  E = mc^2
@/math
```
````

**Config string** (after the language): supports `{line_numbers}`, `{3,7}` (highlight lines 3 and 7), `{3-7}` (range), `title="…"`, `diff`.

> **Token:** `CODE_BLOCK_START` · **Regex:** `/^```([a-zA-Z0-9_+#.\-]*)(?:\s+(.*))?$/`

---

### 4.9 Lists

#### Unordered Lists

```zolto
- Item one
- Item two
  - Nested item (2 spaces indent)
  - Another nested item
- Item three

* Asterisk bullets also work
+ Plus bullets also work
```

#### Ordered Lists

```zolto
1. First item
2. Second item
   1. Nested ordered
   2. Another nested
3. Third item

1) Parenthesis marker
1: Colon marker (alternative)
```

#### Checklists

```zolto
- [x] Completed task
- [ ] Incomplete task
- [o] In-progress task (Zolto extension)
- [?] Needs clarification
- [!] Blocked task
- [~] Cancelled task
- [/] Partial completion
```

> **Token:** `CHECKLIST_ITEM` · **Regex:** `/^(\s*)([-*+])\s+\[([ xXoO?\/!~])\]\s+(.*)$/`

#### Definition Lists

```zolto
: Inertia
:: The resistance of an object to changes in its state of motion.

: Newton
:: Sir Isaac Newton (1643–1727), English mathematician and physicist.
```

---

### 4.10 Tables

#### Standard Markdown Table

```zolto
| Element  | Symbol | Atomic # | Valence |
| :------- | :----: | -------: | ------- |
| Carbon   | C      |        6 | 4       |
| Nitrogen | N      |        7 | 5       |
| Oxygen   | O      |        8 | 6       |
```

Alignment: `:---` left · `:---:` center · `---:` right · `---` default

#### Enhanced Table Block

```zolto
@table title="Periodic Table Excerpt"
  headers: ["Element", "Symbol", "Atomic #", "Mass (u)"]
  rows:
    - ["Hydrogen", "H", 1, 1.008]
    - ["Helium",   "He", 2, 4.003]
    - ["Lithium",  "Li", 3, 6.941]
  format:
    align: [left, center, right, right]
    styles: [bold, code, number, number]
@/table
```

---

### 4.11 Footnotes

Define and reference footnotes:

```zolto
Newton published his laws in 1687.[^pub]
The same year, he also published work on optics.[^opt]

[^pub]: Newton, I. (1687). *Philosophiæ Naturalis Principia Mathematica*.
[^opt]: Newton, I. (1687). *Opticks* was actually published in 1704.
```

Footnotes are rendered at the bottom of the document in `bottom` mode, or as popovers in `tooltip` mode (set in frontmatter).

---

### 4.12 References

```zolto
See the [documentation][docs] for details.

[docs]: https://docs.example.com "Official Docs"
```

---

### 4.13 Embeds

```zolto
@embed youtube "Introduction to Newton's Laws" https://youtube.com/watch?v=abc123
@embed image  "Force diagram" /assets/force-diagram.png width=600
@embed vimeo  "Lecture recording" https://vimeo.com/123456789
@embed figma  "UI Mockup" https://figma.com/file/abc123
@embed iframe "Interactive sim" https://phet.colorado.edu/en/sim/forces-and-motion-basics/latest/embed.html width=800 height=600
@embed audio  "Lecture audio" /assets/lecture1.mp3
```

Supported embed types: `youtube` `vimeo` `image` `video` `audio` `iframe` `codepen` `codesandbox` `figma` `excalidraw` `loom`

---

### 4.14 Collapse / Accordion

```zolto
@collapse title="Why is this important?"
Newton's laws form the foundation of classical mechanics.
They explain motion in everyday life and engineering.
@/collapse

@collapse title="Proof of Law 2" open=true
Starting from $F = ma$, if we integrate with respect to time...
@/collapse
```

---

### 4.15 Tabs

```zolto
@tabs
  @tab label="Overview"
    High-level summary of the concept.
  @/tab

  @tab label="Deep Dive"
    Detailed technical explanation with derivations.
  @/tab

  @tab label="Examples"
    Worked examples and practice problems.
  @/tab
@/tabs
```

---

### 4.16 Details / Spoiler

```zolto
@spoiler "Click to reveal the answer"
  The answer is **42**.
@/spoiler
```

---

### 4.17 Steps

```zolto
@steps
  @step title="Set up the free-body diagram"
    Draw all forces acting on the object.
  @/step
  @step title="Apply Newton's Second Law"
    Write $\sum F = ma$ for each axis.
  @/step
  @step title="Solve for the unknown"
    Substitute known values and calculate.
  @/step
@/steps
```

---

### 4.18 Alignment Blocks

```zolto
::: center
This text is centred on the page.
:::

::: right
Right-aligned text block.
:::

::: left
Explicitly left-aligned text.
:::
```

---

## 5. Domain 2 — Mathematics

Zolto uses a LaTeX-compatible math syntax with a cleaner, less-noisy command set.

**Standard operators are always typed naturally** — `+`, `-`, `*`, `/`, `=`, `%`, `()`, `[]`, `{}`, `<>` are never special characters inside `$…$` or `@math` blocks. Only `\commands` for advanced constructs (fractions, roots, Greek letters, integrals) require the backslash prefix.

```
Simple:  $F = ma$                 ← just type it
Roots:   $\sqrt{b^2 - 4ac}$      ← \command when you need special rendering
Fracs:   $\frac{-b}{2a}$         ← only when displaying a fraction visually
```

### 5.1 Inline Math

Wrap any LaTeX expression in `$…$`:

```zolto
The area of a circle is $A = \pi r^2$.

Einstein's most famous equation is $E = mc^2$.

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.
```

> **Currency safety:** writing `$10` or `$500` in plain text does **not** trigger math mode. The parser only activates math when a closing `$` is found with valid math content between the two delimiters. You never need to escape dollar signs used as currency.

### 5.2 Block Math

```zolto
@math
  \int_0^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
@/math

@math name="Quadratic Formula" label="eq:quad"
  x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
@/math

@math name="Maxwell — Gauss's Law"
  \nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
@/math
```

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Visible title above the equation |
| `label` | string | Cross-reference anchor (e.g. `eq:quad`) |
| `numbered` | bool | Show auto-incremented equation number (default: true) |
| `env` | string | Math environment: `equation` `align` `gather` `cases` |

### 5.3 Equation Block (Shorthand)

```zolto
eq [quad]: x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
equation [maxwell]: \nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
```

> **Token:** `MATH_EQUATION` · **Regex:** `/^eq(?:uation)?\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$/i`

### 5.4 Multi-line Aligned Equations

```zolto
@math env=align
  F &= ma \\
  W &= F \cdot d \\
  P &= \frac{W}{t}
@/math
```

### 5.5 Matrix Blocks

```zolto
@math
  A = \begin{bmatrix}
    1 & 2 & 3 \\
    4 & 5 & 6 \\
    7 & 8 & 9
  \end{bmatrix}
@/math

@math
  \det(A) = \begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc
@/math
```

Supported matrix environments: `matrix` `pmatrix` `bmatrix` `vmatrix` `Vmatrix` `Bmatrix` `smallmatrix` `cases` `array`

### 5.6 Physics Notation

```zolto
@math
  \bra{\psi}\hat{H}\ket{\psi} = E
@/math

@math
  \vec{F} = m\vec{a}
@/math

@math
  \hbar \frac{\partial \Psi}{\partial t} = \hat{H}\Psi
@/math
```

Supported physics extensions: `\bra{}` `\ket{}` `\braket{}{}` `\vec{}` `\hat{}` `\hbar` `\SI{}{}`

### 5.7 Chemistry Notation

```zolto
Water: $\ce{H2O}$

Combustion: $\ce{CH4 + 2O2 -> CO2 + 2H2O}$

Equilibrium: $\ce{N2 + 3H2 <=> 2NH3}$

Ionic: $\ce{NaCl ->[ H2O] Na+(aq) + Cl-(aq)}$
```

### 5.8 Statistics Notation

```zolto
@math
  P(A|B) = \frac{P(B|A)\,P(A)}{P(B)}
@/math

@math
  X \sim \mathcal{N}(\mu, \sigma^2)
@/math
```

Supported: `\prob` `\expect` `\var` `\cov` `\std` `\N` `\Bin` `\Poi` `\Exp` `\Chi`

### 5.9 Function Plotting

```zolto
@math plot name="Quadratic Curve"
  function: "y = x^2 - 4x + 3"
  xrange: [-1, 5]
  yrange: [-2, 8]
  highlight_roots: true
  grid: true
  label_axes: true
@/math

@math plot name="Sine and Cosine"
  function:  "sin(x)"
  function2: "cos(x)"
  xrange: [-6.28, 6.28]
  yrange: [-1.5, 1.5]
  grid: true
  legend: true
@/math
```

### 5.10 Equation Cross-References

```zolto
@math label="eq:newton2"
  F = ma
@/math

As shown in equation \ref{eq:newton2}, force equals mass times acceleration.
```

### 5.11 Math Command Quick Reference

| Command | Output | Notes |
|---------|--------|-------|
| `\frac{a}{b}` | $a/b$ fraction | Recursive |
| `\sqrt{x}` | Square root | `\sqrt[n]{x}` for nth root |
| `x^{n}` or `x^n` | Superscript | |
| `x_{i}` or `x_i` | Subscript | |
| `\sum_{i=1}^{n}` | Summation | |
| `\prod_{i=1}^{n}` | Product | |
| `\int_{a}^{b}` | Integral | `\iint` `\iiint` also supported |
| `\lim_{x \to 0}` | Limit | |
| `\infty` | ∞ | |
| `\nabla` | ∇ | |
| `\partial` | ∂ | |
| `\alpha…\omega` | Greek letters | Full alphabet |
| `\mathbf{v}` | **v** bold | |
| `\mathbb{R}` | ℝ | Blackboard bold |
| `\text{label}` | Roman text | Inside math |
| `\left( \right)` | Auto-sizing `( )` | Also `[ ]` `\{ \}` `| |` |

---

## 6. Domain 3 — Diagrams & Graphs

### 6.1 Diagram Block Wrapper

All diagrams use `@diagram type` … `@/diagram` (or the block-brace syntax):

```zolto
@diagram flowchart title="CI/CD Pipeline" dir=LR
  ...content...
@/diagram
```

**Universal attributes:**

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `dir` | `LR` `RL` `TB` `BT` | `TB` | Layout direction |
| `title` | string | — | Diagram heading |
| `theme` | `default` `dark` `forest` `ocean` `blueprint` `mono` | `default` | Colour theme |
| `interactive` | bool | `true` | Pan/zoom/click enabled |
| `animated` | bool | `true` | Entrance animations |

**All supported `@diagram` type strings:**

`flowchart` `sequence` `state` `erd` `mindmap` `gantt` `timeline` `network` `architecture` `dependency` `tree` `pipeline` `kanban` `geometry` `circuit` `atom` `grammar-tree` `chemistry`

---

### 6.2 Flowchart

```zolto
@diagram flowchart dir=LR
  [Start] --> (Decision)
  (Decision) --"Yes"--> [Process A] +success
  (Decision) --"No"-->  [Process B] +danger
  [Process A] --> [End] +success
  [Process B] --> [End] +success
@/diagram
```

Node bracket types control shape:

| Syntax | Shape |
|--------|-------|
| `[Label]` | Rectangle |
| `(Label)` | Rounded rectangle |
| `((Label))` | Circle / oval |
| `{Label}` | Diamond (decision) |
| `{{Label}}` | Hexagon |
| `([Label])` | Stadium / pill |
| `[[Label]]` | Subprocess (double border) |
| `>Label]` | Asymmetric |

---

### 6.3 Sequence Diagram

```zolto
@diagram sequence title="OAuth2 Flow"
  User -> App: Click "Login with Google"
  App -> Google: Redirect with client_id + scope
  Google -> User: Show consent screen
  User -> Google: Grant permission
  Google -> App: Return auth_code
  App -> Google: Exchange code for tokens
  Google -> App: Return access_token + refresh_token
  App -> User: Render authenticated dashboard
@/diagram
```

Sequence message operators:

| Operator | Meaning |
|----------|---------|
| `->` | Synchronous call (solid line + filled arrowhead) |
| `->>` | Asynchronous message |
| `-->` | Response (dashed line) |
| `-->>` | Async response (dashed + open) |
| `-x` | Destroy message |
| `-)` | Create message |
| `~>` | Async event (wavy) |

Actor kinds: `participant` `actor` `database` `boundary` `control` `entity` `collections` `queue`

```zolto
@diagram sequence
  actor User as U
  database DB
  boundary API as "API Gateway"

  U -> API: Request
  API -> DB: Query
  DB --> API: Results
  API --> U: Response
@/diagram
```

Loop and group blocks:

```zolto
loop until success
  Client -> Server: Retry request
  Server --> Client: Error
end

alt success
  Server --> Client: 200 OK
else failure
  Server --> Client: 500 Error
end
```

---

### 6.4 State Machine

```zolto
@diagram state title="Traffic Light FSM"
  [*] --> Red

  Red --> Green : timer_expired
  Green --> Amber : timer_expired
  Amber --> Red : timer_expired

  state Red {
    entry / turn_on_red
    exit  / turn_off_red
  }
@/diagram
```

Composite states, forks, joins:

```zolto
@diagram state
  [*] --> Idle
  Idle --> Processing : start [valid_input]
  Processing --> [*] : complete
  Processing --> Error : exception
  Error --> Idle : reset

  state Processing {
    [*] --> Validate
    Validate --> Execute
    Execute --> [*]
  }
@/diagram
```

---

### 6.5 ER Diagram

```zolto
@diagram erd
  User {
    uuid    id         PK
    string  email      UK "User email address"
    string  name
    datetime created_at
  }

  Post {
    uuid    id         PK
    string  title
    text    body
    uuid    user_id    FK
    datetime published_at
  }

  Tag {
    uuid    id         PK
    string  name       UK
  }

  User ||--o{ Post : "writes"
  Post }o--o{ Tag  : "tagged_with"
@/diagram
```

ER relation operators (crow's foot notation):

| Operator | Meaning |
|----------|---------|
| `\|\|` | Exactly one |
| `o\|` | Zero or one |
| `\|\{` | One or many |
| `o{` | Zero or many |
| `}{` | One or many (both sides) |

---

### 6.6 Mind Map

```zolto
@diagram mindmap
  (Machine Learning)
    (Supervised Learning)
      Regression
      Classification
        - Binary
        - Multi-class
    (Unsupervised Learning)
      Clustering
        K-Means
        DBSCAN
      Dimensionality Reduction
    (Reinforcement Learning)
      Q-Learning
      Policy Gradients
@/diagram
```

---

### 6.7 Gantt Chart

```zolto
@diagram gantt title="Q1 2025 Sprint Plan" dateFormat="YYYY-MM-DD"
  section Backend
    Auth service    : done,   t1, 2025-01-01, 5d
    API Gateway     : active, t2, after t1, 7d
    Database schema : crit,   t3, 2025-01-10, 3d

  section Frontend
    Login UI        : t4, 2025-01-08, 4d
    Dashboard       : t5, after t4, 6d

  section Testing
    Unit tests      : milestone, t6, 2025-01-20, 1d
    Integration     : t7, after t6, 3d
@/diagram
```

Task modifiers: `done` `active` `crit` (critical path) `milestone`

---

### 6.8 Timeline

```zolto
@timeline title="History of Classical Mechanics"
  section 17th Century
    1609: Galileo studies projectile motion
    1666: Newton derives laws of motion
    1687: Principia Mathematica published

  section 18th Century
    1730: Euler develops analytic mechanics
    1788: Lagrangian mechanics formulated

  section 19th Century
    1833: Hamilton's principle stated
    1864: Maxwell's equations published
@/timeline
```

With icons:

```zolto
@timeline
  event year=1687 text="Principia published" icon="book" category="physics"
  event year=1905 text="Special Relativity" icon="atom" category="physics"
  event year=1916 text="General Relativity" icon="star" category="physics"
@/timeline
```

---

### 6.9 Spatial Graph Block (Compact Syntax)

Outside of `@diagram`, the spatial node syntax can be used directly in the document body:

```zolto
[ Web Client ] +glass
  -> ( Load Balancer )

( Load Balancer ) +primary
  => [ Node A ] +success
  => [ Node B ] +success

[ Node A ]
  -> { PostgreSQL } +success
  ~> < Redis Cache > +warning

{ PostgreSQL } +success
  ..> { Replica DB } +dashed
```

Trait tokens (prefix with `+`):

| Trait | Visual Effect |
|-------|---------------|
| `+primary` | Indigo gradient fill |
| `+success` | Green gradient fill |
| `+danger` | Red gradient fill |
| `+warning` | Amber fill |
| `+glass` | Frosted glass + blur |
| `+outline` | Transparent fill, coloured border |
| `+dashed` | Dashed border |
| `+implicit` | 50% opacity |
| `+elevated` | Drop shadow |
| `+glow` | Glow filter |
| `+muted` | 45% opacity |
| `+accent` | Coloured border accent |

---

### 6.10 Geometry Diagram

```zolto
@diagram geometry
  circle   center=5,5 radius=3
  triangle points=3,2 8,2 5,8
  line     from=5,5 to=3,2
  label "A" at=3,2 offset=0,-15
  label "B" at=8,2 offset=5,0
  label "C" at=5,8 offset=0,10
  angle    at=3,2 from=5,2 to=5,8 label="60°"
@/diagram
```

---

### 6.11 Circuit Diagram

```zolto
@diagram circuit
  component "resistor"  at=10,10 value="100Ω"
  component "capacitor" at=30,10 value="10μF"
  component "inductor"  at=50,10 value="1mH"
  component "battery"   at=0,10  value="12V"
  connect from=0,10  to=10,10
  connect from=20,10 to=30,10
  connect from=40,10 to=50,10
  connect from=60,10 to=0,10 via=60,0,0,0
@/diagram
```

---

### 6.12 Grammar Tree

```zolto
@diagram grammar-tree title="Sentence Parse Tree"
  S
    NP
      Det: "The"
      Adj: "quick"
      N:   "fox"
    VP
      V:   "jumps"
      PP
        P:   "over"
        NP
          Det: "the"
          N:   "fence"
@/diagram
```

---

### 6.13 Network / Dependency / Architecture

```zolto
@diagram architecture title="Microservices Platform"
  / aws-cloud
    / us-east-1
      / vpc
        - ALB
        - EC2_A
        - EC2_B
        - RDS_Primary
        - RDS_Replica
@/diagram
```

---

### 6.14 Atom Model

```zolto
@diagram atom title="Carbon Atom (Bohr Model)"
  nucleus: protons=6 neutrons=6
  shell 1: electrons=2
  shell 2: electrons=4
  label: "C — Carbon — Atomic number 6"
@/diagram
```

---

### 6.15 Chemical Structure

```zolto
@diagram chemistry title="Benzene Ring"
  molecule: C6H6
  style: structural
  bonds: alternating
  label_atoms: true
@/diagram
```

---

### 6.16 Dependency / Package Graph

```zolto
@diagram dependency title="Node.js Module Graph"
  "app.js" -> "express"
  "app.js" -> "dotenv"
  "app.js" -> "router.js"
  "router.js" -> "controller.js"
  "controller.js" -> "db.js"
  "db.js" -> "pg"
  "db.js" -> "redis"
@/diagram
```

---

### 6.17 Kanban Board

```zolto
@diagram kanban title="Sprint Board"
  column Backlog:
    - "User authentication"
    - "Dark mode toggle"

  column In Progress:
    - "API rate limiting"
    - "PDF export" [assigned=Alice]

  column Review:
    - "Diagram renderer" [assigned=Bob]

  column Done:
    - "CI/CD pipeline"
    - "Database migrations"
@/diagram
```

---

## 7. Domain 4 — Charts & Data

### 7.1 Pie Chart

```zolto
@chart pie title="Energy Distribution"
  "Kinetic":   45
  "Potential": 35
  "Thermal":   20
@/chart
```

### 7.2 Donut Chart

```zolto
@chart donut title="Market Share"
  "Product A": 40
  "Product B": 30
  "Product C": 20
  "Other":     10
@/chart
```

### 7.3 Bar Chart

```zolto
@chart bar title="Student Performance"
  "Test 1": 78
  "Test 2": 85
  "Test 3": 92
  "Test 4": 88
  colors: primary success success warning
@/chart
```

### 7.4 Horizontal Bar

```zolto
@chart bar-horizontal title="Country Populations (Billions)"
  "China":       1.41
  "India":       1.40
  "USA":         0.33
  "Indonesia":   0.27
@/chart
```

### 7.5 Line Chart

```zolto
@chart line title="Temperature vs Time"
  x: [0, 5, 10, 15, 20, 25, 30]
  y: [20, 22, 25, 24, 23, 26, 28]
  xlabel: "Time (min)"
  ylabel: "Temperature (°C)"
  smooth: true
@/chart
```

### 7.6 Area Chart

```zolto
@chart area title="Revenue Over Time"
  x: [2020, 2021, 2022, 2023, 2024]
  y: [120,  145,  190,  230,  310]
  fill: true
  gradient: true
@/chart
```

### 7.7 Scatter Plot

```zolto
@chart scatter title="Force vs Acceleration"
  data:
    - [10, 2.0]
    - [20, 4.1]
    - [30, 5.9]
    - [40, 8.2]
    - [50, 9.8]
  xlabel: "Force (N)"
  ylabel: "Acceleration (m/s²)"
  trendline: true
@/chart
```

### 7.8 Radar Chart

```zolto
@chart radar title="Student Skills Assessment"
  categories: ["Math", "Physics", "Chemistry", "Biology", "English"]
  "Student A": [85, 90, 70, 65, 80]
  "Student B": [70, 75, 88, 92, 65]
@/chart
```

### 7.9 Gauge Chart

```zolto
@chart gauge title="CPU Usage"
  value: 72
  min: 0
  max: 100
  thresholds: [60, 80, 90]
  colors: [success, warning, danger, danger]
  unit: "%"
@/chart
```

### 7.10 Waterfall Chart

```zolto
@chart waterfall title="Profit & Loss Summary"
  "Revenue":    +500000
  "COGS":       -180000
  "Gross Profit": null   // auto-calculated subtotal
  "OpEx":       -120000
  "Net Profit": null
@/chart
```

---

### 7.11 Heatmap

```zolto
@chart heatmap title="Weekly Activity"
  x_labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  y_labels: ["00:00", "06:00", "12:00", "18:00", "23:00"]
  data:
    - [12, 5, 8, 3, 15, 20, 18]
    - [8,  2, 6, 1, 10, 14, 12]
    - [20, 8, 15, 7, 22, 25, 20]
    - [5,  3, 7, 2, 8,  12, 9]
    - [3,  1, 4, 1, 5,  8,  6]
  color_scale: [blue, green, yellow, red]
@/chart
```

---

### 7.12 Sankey Flow Diagram

```zolto
@chart sankey title="Energy Flow"
  "Solar" -> "Battery": 60
  "Solar" -> "Grid":    40
  "Battery" -> "Home":  55
  "Grid" -> "Home":     45
  "Home" -> "Lights":   30
  "Home" -> "Heating":  50
  "Home" -> "Appliances": 20
@/chart
```

---

### 7.13 Funnel Chart

```zolto
@chart funnel title="Sales Pipeline"
  "Leads":      1200
  "Prospects":  400
  "Qualified":  150
  "Proposals":  60
  "Closed Won": 20
@/chart
```

---

### 7.14 Treemap

```zolto
@chart treemap title="Portfolio Allocation"
  "Equities":
    "US Stocks":      45
    "Intl Stocks":    20
  "Fixed Income":
    "Bonds":          20
    "Treasury":       5
  "Alternatives":
    "Real Estate":    7
    "Commodities":    3
@/chart
```

---

### 7.15 Bubble Chart

```zolto
@chart bubble title="Country GDP vs HDI"
  data:
    - label="USA"    x=65000 y=0.926 size=332
    - label="India"  x=2100  y=0.633 size=1400
    - label="Germany" x=46000 y=0.942 size=83
    - label="Brazil" x=8700  y=0.754 size=215
  xlabel: "GDP per capita (USD)"
  ylabel: "Human Development Index"
  sizeLabel: "Population (millions)"
@/chart
```

---

### 7.16 Quadrant Chart

```zolto
@chart quadrant title="Feature Prioritisation"
  x_label: "Implementation Effort"
  y_label: "User Value"
  quadrant_labels:
    top_left:     "Quick Wins"
    top_right:    "Major Projects"
    bottom_left:  "Fill-ins"
    bottom_right: "Thankless Tasks"
  points:
    - label="Dark mode"   x=25 y=80
    - label="Export PDF"  x=70 y=75
    - label="Login page"  x=15 y=30
    - label="AI assistant" x=85 y=90
@/chart
```

---

### 7.17 Inline Single-Line Chart Declaration

```zolto
PIE: Physics 40, Chemistry 35, Biology 25
BAR: Q1 120, Q2 145, Q3 190, Q4 230
LINE: Jan 20, Feb 24, Mar 22, Apr 28
SCATTER: 10 2.0, 20 4.1, 30 5.9, 40 8.2
```

> **Token:** `CHART` · **Regex:** `/^(PIE|DONUT|BAR|LINE|AREA|SCATTER|RADAR|GAUGE|WATERFALL|HEATMAP|SANKEY|FUNNEL|TREEMAP|BUBBLE|QUADRANT)\s*:\s*(.*)$/i`

---

## 8. Domain 5 — Vector & Graphics

### 8.1 Vector Scene

```zolto
@vector width=800 height=600 viewBox="0 0 800 600"
  layer: shapes

  circle:   cx=100 cy=100 r=50 fill=#6366f1 stroke=none
  rect:     x=200 y=50 width=150 height=100 rx=12 fill=#10b981
  ellipse:  cx=500 cy=150 rx=80 ry=50 fill=none stroke=#f59e0b stroke-width=3
  line:     x1=50 y1=300 x2=750 y2=300 stroke=#64748b stroke-width=2
  polygon:  points=400,200 500,350 300,350 fill=#6366f1 opacity=0.7
  path:     d="M 100 400 Q 250 300 400 400 T 700 400" stroke=#ef4444 fill=none
  text:     x=400 y=500 text="Force Diagram" font-size=24 text-anchor=middle
@/vector
```

### 8.2 Layer System

```zolto
@vector width=1000 height=700
  layer: background
    rect: x=0 y=0 width=1000 height=700 fill=#0a0a0f

  layer: grid
    // Grid lines rendered automatically when grid=true
    
  layer: shapes
    circle: cx=200 cy=200 r=60 fill=url(#grad-primary)
    
  layer: labels
    text: x=200 y=200 text="Node A" fill=white text-anchor=middle
@/vector
```

### 8.3 Vector Groups

```zolto
@vector
  group arrow-right {
    line:    x1=0 y1=0 x2=80 y2=0 stroke=#6366f1 stroke-width=3
    polygon: points=80,0 70,-6 70,6 fill=#6366f1
  }

  group molecule-h2o {
    circle: cx=100 cy=100 r=20 fill=#ef4444   // Oxygen
    circle: cx=65  cy=130 r=12 fill=#94a3b8   // Hydrogen 1
    circle: cx=135 cy=130 r=12 fill=#94a3b8   // Hydrogen 2
  }
@/vector
```

### 8.4 Artboard System

```zolto
@vector
  artboard slide-1 1280x720
    rect:  x=0   y=0 width=1280 height=720 fill=#1e1e2e
    text:  x=640 y=200 text="Title Slide" font-size=64 text-anchor=middle fill=white

  artboard slide-2 1280x720
    // Different artboard — different "page"
@/vector
```

### 8.5 Camera & Viewport

```zolto
@vector
  camera: x=0 y=0 scale=1.0 zoom-min=0.1 zoom-max=8
  
  // All shapes follow camera transform
  circle: cx=400 cy=300 r=100 fill=#6366f1
@/vector
```

### 8.6 Connectors

```zolto
@vector
  circle: id=nodeA cx=100 cy=200 r=40 fill=#6366f1
  circle: id=nodeB cx=400 cy=200 r=40 fill=#10b981
  
  connector: from=nodeA to=nodeB style=curved label="force"
@/vector
```

### 8.7 SVG Path Data (Advanced)

Full SVG path `d` attribute syntax is supported:

```zolto
@vector
  path: d="M 10,90 Q 90,90 90,45 Q 90,10 50,10 Q 10,10 10,40 Q 10,70 45,70 L 90,70"
        stroke=#6366f1 fill=none stroke-width=3

  bezier: x1=50 y1=100 cx1=150 cy1=50 cx2=250 cy2=150 x2=350 y2=100
          stroke=#f59e0b stroke-width=2 fill=none
@/vector
```

---

## 9. Domain 6 — Spatial Layouts

### 9.1 Row & Cards

```zolto
@row
  @card width=33%
    ## Concept A
    Definition and details of concept A.
  @/card

  @card width=33%
    ## Concept B
    Related information about concept B.
  @/card

  @card width=33%
    ## Concept C
    Third concept with its details.
  @/card
@/row
```

Card attributes: `width` `title` `icon` `variant` `href` `elevation`

Variant values: `default` `primary` `success` `warning` `danger` `outline` `glass`

---

### 9.2 Grid Layout

```zolto
@grid cols=3 gap=1.5rem
  @card ...@/card
  @card ...@/card
  @card ...@/card
  @card ...@/card
  @card ...@/card
  @card ...@/card
@/grid

@grid auto minColWidth=240px gap=1rem
  // Auto-fill: as many columns as fit at minColWidth
@/grid
```

---

### 9.3 Flex Layout

```zolto
@flex direction=row wrap=true gap=1rem align=center justify=space-between
  @card ...@/card
  @card ...@/card
@/flex

@flex direction=column gap=0.5rem
  // Stacked vertically
@/flex
```

---

### 9.4 Multi-Column Text Layout

```zolto
@columns count=3 gap=2rem
  ## Column 1 — Left
  Content for the first column. Can include any block-level content.

  ---col---

  ## Column 2 — Middle
  Middle column content with a diagram:

  @chart pie
    "A": 60
    "B": 40
  @/chart

  ---col---

  ## Column 3 — Right
  Final column with a code example.
  ```python
  F = m * a
  ```
@/columns
```

Column breaks: `---col---` `---split---` `---column---`

---

### 9.5 Canvas Mode (Absolute Positioning)

```zolto
@canvas width=1000 height=600 grid=true snap=true
  place element="formula" at=100,50  width=300
  place element="diagram" at=500,50  width=400
  place element="note"    at=100,350 width=300
@/canvas
```

---

### 9.6 Whiteboard Mode (Infinite Workspace)

```zolto
@whiteboard height=800
  // Infinite scrollable/pannable workspace
  // All content is absolutely positioned within
  // Supports zoom in/out with mouse wheel or pinch

  @card x=100 y=100
    Free-placed card on the whiteboard.
  @/card

  [ Node A ] at=300,200 +primary
    -> [ Node B ] at=500,200 +success
@/whiteboard
```

---

### 9.7 Presentation Mode

```zolto
@presentation theme=dark
  @slide layout=title
    # Introduction to Quantum Mechanics
    *Dr. A. Kumar · Department of Physics*

    A journey from classical to quantum thinking.
  @/slide

  @slide layout=two-col
    ## Wave-Particle Duality

    ::: col
    Every particle exhibits wave properties.

    $\lambda = \frac{h}{mv}$
    :::

    ::: col
    @diagram
      [Wave] <--> [Particle]
    @/diagram
    :::
  @/slide

  @slide layout=blank
    // No default structure — design freely
  @/slide
@/presentation
```

Slide layouts: `default` `title` `two-col` `three-col` `blank` `media` `quote` `section-break`

---

### 9.8 Split View

```zolto
@split direction=horizontal ratio=50/50
  ::: pane
  ## Left Pane
  Content on the left side.
  :::

  ::: pane
  ## Right Pane
  Content on the right side.
  :::
@/split
```

---

### 9.9 Panel System

```zolto
@panel title="Properties" collapsible=true resizable=true
  // Configurable side panel
  Properties panel content here.
@/panel
```

---

### 9.10 Nested Layouts

Layouts can be nested freely:

```zolto
@grid cols=2 gap=2rem
  @card
    @tabs
      @tab label="Math"
        $E = mc^2$
      @/tab
      @tab label="Diagram"
        @diagram sequence
          A -> B: Hello
        @/diagram
      @/tab
    @/tabs
  @/card

  @card
    @columns count=2
      Left column.
      ---col---
      Right column.
    @/columns
  @/card
@/grid
```

---

## 10. Domain 7 — Component System

### 10.1 Define a Component

```zolto
@component DataCard title="" variant="default" icon=null
  @slot header
    ## {title}
    {#if icon}
      ::{icon}::
    {/if}
  @/slot

  @slot default
    // Default content slot — filled by caller
  @/slot

  @slot footer
    ---
    *{title} component*
  @/slot
@/component
```

### 10.2 Use a Component

```zolto
<DataCard title="Revenue" variant="primary">
  The revenue grew by **24%** year-over-year.

  @chart bar
    "Q1": 120
    "Q2": 145
  @/chart
</DataCard>
```

Named slot injection:

```zolto
<DataCard title="Custom Footer">
  Main content goes in the default slot.

  @slot name="footer"
  Custom footer override here.
  @/slot
</DataCard>
```

---

### 10.3 Templates

```zolto
@template StudyNote(subject, level="beginner")
  # {subject} Study Notes
  *Level: {level}*

  [info]
  These notes cover {subject} at the {level} level.
  [/info]
@/template
```

---

### 10.4 Macros

```zolto
@macro formula(name, expr)
  @math name="{name}"
    {expr}
  @/math
@/macro

// Usage:
@formula("Newton's Second Law", "F = ma")
@formula("Kinetic Energy", "KE = \frac{1}{2}mv^2")
```

---

### 10.5 Animations

```zolto
@animate fadeSlideUp duration=300ms timing=ease delay=0ms
  @keyframe 0%
    opacity: 0
    transform: translateY(12px)
  @keyframe 100%
    opacity: 1
    transform: translateY(0)
@/animate

// Apply to an element:
@card animate="fadeSlideUp"
  This card fades in on appearance.
@/card
```

---

### 10.6 Design Tokens

Override design tokens for a component tree:

```zolto
@theme name="custom-cards"
  --card-radius: 16px
  --card-padding: 2rem
  --card-bg: rgba(99, 102, 241, 0.08)
  --card-border: rgba(99, 102, 241, 0.3)
@/theme

// Apply to a section:
@grid cols=3 theme="custom-cards"
  @card ...@/card
@/grid
```

---

## 11. Domain 8 — Assessment & Interactive

### 11.1 MCQ (Single Answer)

```zolto
@mcq
  question: "Who formulated Newton's Laws of Motion?"
  A: "Galileo Galilei"
  B: "Isaac Newton" [correct]
  C: "Albert Einstein"
  D: "Stephen Hawking"
  explanation: "Newton published the three laws in *Principia Mathematica* (1687)."
  difficulty: easy
  tags: [physics, history, mechanics]
@/mcq
```

> **Alternative verbose form** — easier to read for complex questions with long option text:
>
> ```zolto
> @mcq
>   question: "Which of the following best describes Newton's First Law?"
>   options:
>     - text: "Force equals mass times acceleration."
>     - text: "Every object remains at rest or in uniform motion unless acted on by a net force." correct=true
>     - text: "For every action there is an equal and opposite reaction."
>     - text: "Momentum is always conserved."
>   explanation: "The First Law defines inertia."
>   difficulty: medium
> @/mcq
> ```

### 11.2 MCQ (Multiple Correct Answers)

```zolto
@mcq type=multi
  question: "Which of the following are vector quantities?"
  A: "Mass"
  B: "Velocity" [correct]
  C: "Speed"
  D: "Acceleration" [correct]
  E: "Force" [correct]
  explanation: "Vector quantities have both magnitude and direction."
@/mcq
```

### 11.3 Matrix MCQ (Matching)

```zolto
@mcq type=matrix
  question: "Match each law to its description"
  pairs:
    - ("First Law",  "Objects resist changes in motion")
    - ("Second Law", "F = ma")
    - ("Third Law",  "Action equals reaction")
  correct_matches: [1→1, 2→2, 3→3]
@/mcq
```

---

### 11.4 Ordering / Sequencing

```zolto
@mcq type=ordering
  question: "Place these steps in the correct order to solve F = ma."
  items:
    - "Identify all forces acting on the object"
    - "Draw a free-body diagram"
    - "Calculate the net force"
    - "Apply F = ma to find acceleration"
  correct_order: [2, 1, 3, 4]
  explanation: "Always start with the free-body diagram before summing forces."
@/mcq
```

---

### 11.5 Fill in the Blank

```zolto
@mcq type=fillblank
  question: "Newton's second law states that F = ___ × a"
  answer: "m"
  answer_aliases: ["mass", "Mass", "m (mass)"]
  explanation: "The proportionality constant between force and acceleration is mass."
@/mcq
```

---

### 11.6 True / False

```zolto
@mcq type=truefalse
  question: "Inertia is measured in Newtons."
  answer: false
  explanation: "Inertia is a property, not a measured quantity. It depends on mass (kg)."
@/mcq
```

### 11.7 Quiz Block

```zolto
@quiz title="Newton's Laws Quiz" time_limit=900 shuffle=true passing=60

  @mcq
    question: "Which law describes inertia?"
    A: "First Law"  [correct]
    B: "Second Law"
    C: "Third Law"
    D: "Zeroth Law"
    explanation: "Inertia is covered by the First Law."
    difficulty: easy
  @/mcq

  @mcq
    question: "If mass doubles with constant force, acceleration..."
    A: "Doubles"
    B: "Halves"   [correct]
    C: "Stays constant"
    D: "Quadruples"
    explanation: "From F = ma → a = F/m. Doubling m halves a."
    difficulty: medium
  @/mcq

@/quiz
```

Quiz attributes: `time_limit` (seconds, e.g. `900` = 15 min · `0` = no limit) · `shuffle` (bool) · `passing` (% score for pass)

---

### 11.8 Flashcard

```zolto
@flashcard
  front: What is Newton's First Law of Motion?
  back: An object at rest stays at rest, and an object in motion continues in
        motion, unless acted upon by a net external force.
  tags: [physics, mechanics, law]
  difficulty: easy
@/flashcard

@flashcard
  front: State Newton's Second Law in equation form.
  back: $\mathbf{F} = m\mathbf{a}$
  tags: [physics, mechanics, equation]
  difficulty: medium
@/flashcard
```

> **Spaced repetition fields** — add `confidence` to track study progress:
>
> ```zolto
> @flashcard
>   front: What is the SI unit of force?
>   back: Newton (N) = kg·m/s²
>   tags: [units]
>   difficulty: easy
>   confidence: again    // again | hard | good | easy
> @/flashcard
> ```

---

### 11.9 Reasoning Blocks

#### Number Series

```zolto
@reasoning series
  question: "Find the missing number: 2, 4, 8, 16, ?"
  options: [24, 32, 48, 64]
  answer: 32
  explanation: "Each number is double the previous: 2×2=4, 4×2=8, 8×2=16, 16×2=32."
@/reasoning
```

#### Analogy

```zolto
@reasoning analogy
  question: "Bird is to Sky as Fish is to ?"
  options: ["Land", "Water", "Air", "Ocean"]
  answer: "Water"
  explanation: "A bird's natural habitat is sky; a fish's natural habitat is water."
@/reasoning
```

#### Visual Matrix

```zolto
@reasoning visual-matrix
  grid:
    row1: [□, ○, △]
    row2: [○, △, □]
    row3: [△, □, ?]
  options: ["○", "□", "△", "◇"]
  answer: "○"
@/reasoning
```

---

### 11.10 Interactive Controls

```zolto
@interactive
  slider name="mass"     min=1   max=100 default=50  label="Mass (kg)"
  slider name="force"    min=0   max=500 default=100 label="Force (N)"
  slider name="velocity" min=0   max=100 default=20  label="Velocity (m/s)"
  output: $a = \frac{F}{m} = \frac{force}{mass}\,\text{m/s}^2$
  output: $KE = \frac{1}{2}mv^2 = \frac{1}{2} \times mass \times velocity^2$
@/interactive
```

---

### 11.11 AI Integration (Experimental)

```zolto
@solve
  equation: "2x + 5 = 15"
  ai_explain: true
  steps: true
@/solve

@auto-diagram
  molecule: "benzene"
  style: "2d-structural"
@/auto-diagram

@comment author="Teacher" timestamp="2025-09-01"
  Excellent approach — but check your unit conversion!
@/comment
```

---

## 12. Inline Syntax

Inline syntax appears inside paragraphs, headings, table cells, and list items.

### 12.1 Basic Emphasis

```zolto
**Bold text**
__Also bold__

*Italic text*
_Also italic_

***Bold and italic***

~~Strikethrough~~

==Highlighted text==

^Superscript^

~Subscript~

<u>Underlined text</u>
```

### 12.2 Code Spans

```zolto
Use `const x = 42` in JavaScript.
```

### 12.3 Inline Math

```zolto
The formula is $F = ma$ where $m$ is mass in kg.
```

### 12.4 Links & Images

```zolto
[Link text](https://example.com)
[Link with title](https://example.com "Hover tooltip")
[Reference link][ref-id]

![Alt text](https://example.com/image.png)
![Alt text](image.png "Image title")

[ref-id]: https://example.com
```

### 12.5 Footnote References

```zolto
This statement needs a citation.[^cite1]

[^cite1]: Newton, I. (1687). Principia Mathematica.
```

### 12.6 Colour Tags

```zolto
{red This text is red}
{#6366f1 This text is indigo hex}
{primary The accent colour from the theme}
{success Green success text}
{warning Amber warning text}
{danger Red danger text}
```

### 12.7 Variable References

```zolto
$subject = "Physics"

This document covers {$subject} concepts.
```

### 12.8 Mentions & Hashtags

```zolto
This was reviewed by @dr_kumar and tagged #mechanics #newtons-laws.
```

### 12.9 Emoji

```zolto
Great work! :tada: :rocket: :checkmark:
```

### 12.10 Smart Typography

Automatically applied by the renderer (no special syntax required):

| Source | Rendered |
|--------|----------|
| `"quoted"` | "quoted" (curly quotes) |
| `'single'` | 'single' (curly apostrophes) |
| `--` | – (en-dash) |
| `---` | — (em-dash) |
| `...` | … (ellipsis) |
| `1/2` | ½ |
| `1/4` | ¼ |
| `3/4` | ¾ |

Smart typography can be disabled per-document with:
```zolto
---
smart_typography: false
---
```

---

## 13. Directive Reference

The `@keyword` directive is the core extension point of Zolto. All block-level features use it.

### Full Directive List

| Directive | Closes with | Domain | Description |
|-----------|-------------|--------|-------------|
| `@math` | `@/math` | Math | Math equation or plot |
| `@diagram` | `@/diagram` | Diagrams | Any diagram type |
| `@chart` | `@/chart` | Charts | Data visualisation |
| `@graph` | `@/graph` | Diagrams | Spatial graph |
| `@timeline` | `@/timeline` | Diagrams | Timeline chart |
| `@vector` | `@/vector` | Graphics | SVG/vector scene |
| `@canvas` | `@/canvas` | Layout | Positioned canvas |
| `@whiteboard` | `@/whiteboard` | Layout | Infinite workspace |
| `@grid` | `@/grid` | Layout | CSS grid layout |
| `@flex` | `@/flex` | Layout | Flexbox layout |
| `@row` | `@/row` | Layout | Flex row (shorthand) |
| `@columns` | `@/columns` | Layout | Multi-column text |
| `@card` | `@/card` | Layout | Card component |
| `@tabs` | `@/tabs` | UI | Tab group container |
| `@tab` | `@/tab` | UI | Single tab |
| `@collapse` | `@/collapse` | UI | Accordion item |
| `@spoiler` | `@/spoiler` | UI | Spoiler/details block |
| `@steps` | `@/steps` | UI | Numbered steps |
| `@step` | `@/step` | UI | Single step |
| `@table` | `@/table` | Data | Enhanced table |
| `@mcq` | `@/mcq` | Assessment | Multiple choice question |
| `@quiz` | `@/quiz` | Assessment | Quiz block |
| `@flashcard` | `@/flashcard` | Assessment | Flashcard |
| `@reasoning` | `@/reasoning` | Assessment | Reasoning problem |
| `@interactive` | `@/interactive` | UI | Slider inputs + live output |
| `@presentation` | `@/presentation` | Layout | Slide deck |
| `@slide` | `@/slide` | Layout | Single slide |
| `@split` | `@/split` | Layout | Split pane view |
| `@panel` | `@/panel` | Layout | Resizable panel |
| `@component` | `@/component` | Components | Component definition |
| `@slot` | `@/slot` | Components | Slot definition/override |
| `@template` | `@/template` | Components | Template definition |
| `@macro` | `@/macro` | Components | Macro definition |
| `@animate` | `@/animate` | Animation | Animation definition |
| `@keyframe` | *(inline)* | Animation | Single animation keyframe |
| `@theme` | `@/theme` | Theming | Theme token block |
| `@badge` | *(self-closing)* | UI | Inline badge / pill label |
| `@divider` | *(self-closing)* | UI | Decorative section divider |
| `@spacer` | *(self-closing)* | UI | Vertical whitespace block |
| `@hero` | `@/hero` | UI | Full-width hero banner section |
| `@banner` | `@/banner` | UI | Notification banner strip |
| `@embed` | *(self-closing)* | Media | Embed external content |
| `@import` | *(self-closing)* | Document | Import file |
| `@solve` | `@/solve` | AI | AI equation solver |
| `@auto-diagram` | `@/auto-diagram` | AI | Auto-generated diagram |
| `@comment` | `@/comment` | Collaboration | Review comment |

---

## 14. Edge Operators

Edge operators connect nodes in spatial graph blocks and diagram bodies.

| Operator | Class | Style | Arrow | Use Case |
|----------|-------|-------|-------|----------|
| `->` | `edge-solid` | Solid 1.5px | Open → | Default directed edge |
| `=>` | `edge-transition` | Solid 2px | Filled ⇒ | State transition / strong dependency |
| `~>` | `edge-async` | Dashed 1.5px | Open → | Async call / event |
| `-->` | `edge-dashed` | Dashed 1.5px | Open → | Return message / implied |
| `--->` | `edge-long` | Solid 2px | Open → | Long-range connection |
| `==>` | `edge-thick` | Solid 3px | Filled ⇒ | Critical path |
| `===` | `edge-thick` | Solid 4px | None | Heavy association |
| `..>` | `edge-dotted` | Dotted 1px | Open → | UML dependency |
| `<->` | `edge-bidirectional` | Solid 1.5px | Both ← → | Bidirectional |
| `~~>` | `edge-wavy` | Wavy 1.5px | Open → | Event / message bus |
| `---` | `edge-solid` | Solid 1.5px | None | Undirected association |

**Edge labels:**

```zolto
[ Node A ] --"label text"--> [ Node B ]
[ Node A ] ==>|"label"| [ Node B ]
```

**Multi-target edges:**

```zolto
[ Source ] => [ Target A ] & [ Target B ]
```

---

## 15. Node Shape Syntax

### Shape Brackets

| Syntax | Shape | Use |
|--------|-------|-----|
| `[Label]` | Rectangle | Process, service, module |
| `(Label)` | Rounded rect | User, actor, general node |
| `((Label))` | Circle | Start/end state, event |
| `{Label}` | Diamond | Decision, condition |
| `{{Label}}` | Hexagon | Preparation, pre-process |
| `([Label])` | Stadium / pill | Scheduled process |
| `[[Label]]` | Double-border | Sub-process, sub-routine |
| `<Label>` | Asymmetric | Manual input, annotation |

### Alternative Shapes (via `@diagram`)

| Keyword | Shape |
|---------|-------|
| `database` | Cylinder (drum) |
| `cloud` | Cloud outline |
| `actor` | Stick figure |
| `server` | Tower |
| `queue` | Queue barrel |
| `gateway` | Octagon |
| `cache` | Rounded cylinder |

---

## 16. Token Operator Precedence

The tokenizer resolves ambiguous syntax by applying these rules in order:

1. **Frontmatter** — Only on line 0, exactly `---`
2. **Block comments** — `/* … */` — verbatim capture until `*/`
3. **Single-line comments** — `//` — strip immediately
4. **Code block** — ` ``` lang ` — verbatim until closing ` ``` `
5. **Math block** — `@math` or `$$` — raw capture until `@/math` or `$$`
6. **Diagram block** — `@diagram type {` — sub-tokenized until `}`
7. **`@` directives** — matched by `/^@([a-zA-Z0-9_-]+)(?:\s+([^{]+?))?/`
8. **Headings** — `/^(#{1,6})\s+/`
9. **Horizontal rule** — `/^(?:[-*_=~])\1{2,}\s*$/`
10. **Tables** — `/^\|(.+)\|$/`
11. **Checklists** — `/^(\s*)([-*+])\s+\[([ xX…])\]/`
12. **Lists** — `/^(\s*)([-*+])\s+/`
13. **Ordered lists** — `/^(\s*)(\d+)([.):])\s+/`
14. **Blockquotes** — `/^>\s*/`
15. **Admonition shorthand** — `/^\[(!?[a-z]+)\]/`
16. **Extended blocks** — `:::` fenced blocks
17. **Component use** — `/^<([A-Z][a-zA-Z0-9_.-]*)/`
18. **Inline chart** — `/^(PIE|BAR|LINE|…)\s*:/i`
19. **Text** — everything else is a paragraph line

---

## 17. Complete Examples

### 17.1 Beginner Quick-Start

This compact example uses only the two fundamental rules: Markdown for text, `@directives` for everything else. A new Zolto author can write this on their first day.

```zolto
---
title: Newton's Laws of Motion
author: Dr. A. Kumar
---

# Newton's Laws of Motion
*Classical Mechanics · Chapter 3*

[important]
Newton's three laws form the entire foundation of classical mechanics.
[/important]

---

## 1 — Law of Inertia

**Definition**: An object at rest stays at rest, unless acted upon by a net external force.

@math name="Condition for Inertia"
  F_{net} = 0 \implies a = 0
@/math

[tip]
Think of a ball on a perfectly frictionless surface!
[/tip]

@diagram sequence title="Inertia in Action"
  Object -> Table: Rests
  External -> Object: Net force applied
  Object -> Path: Accelerates
@/diagram

---

## 2 — Law of Acceleration

@math name="Newton's Second Law"
  F = ma
@/math

@chart line title="Acceleration vs Force (m = 10 kg)"
  x: [0, 50, 100]
  y: [0, 5,  10]
  xlabel: "Force (N)"
  ylabel: "Acceleration (m/s²)"
@/chart

---

## Summary

@grid cols=3
  @card variant=outline
    **Law 1 · Inertia**
    Objects resist changes in motion.
  @/card
  @card variant=outline
    **Law 2 · F = ma**
    Net force causes acceleration.
  @/card
  @card variant=outline
    **Law 3 · Reaction**
    Every force has an equal opposite.
  @/card
@/grid

---

## Practice Quiz

@quiz title="Quick Check" time_limit=300 passing=70
  @mcq
    question: "A 5 kg object experiences a 20 N net force. What is its acceleration?"
    A: "1 m/s²"
    B: "2 m/s²"
    C: "4 m/s²" [correct]
    D: "100 m/s²"
    explanation: "a = F/m = 20/5 = 4 m/s²"
    difficulty: medium
  @/mcq
@/quiz
```

---

### 17.2 Full Production Example

The following `.zl` document demonstrates all six domains in a single comprehensive study note.

```zolto
---
title: Newton's Laws of Motion
subject: Physics
level: foundation
author: Dr. A. Kumar
tags: [mechanics, newton, force, motion]
---

# Newton's Laws of Motion
*Classical Mechanics · Chapter 3*

[important]
Newton's three laws form the entire foundation of classical mechanics.
Every dynamics problem you encounter traces back to these three laws.
[/important]

---

## 1 — Law of Inertia

**Definition**: An object at rest stays at rest, and an object in motion
continues in motion at constant velocity, unless acted upon by a net
external force.

@math name="Condition for Inertia" label="eq:inertia"
  F_{\text{net}} = 0 \implies \mathbf{a} = 0
@/math

[tip]
Think of a ball on a perfectly frictionless surface — it rolls forever
because there is no friction to apply a net force.
[/tip]

@diagram sequence title="Inertia in Action"
  Object -> Table: Rests at position $x_0$
  Table -> Object: Normal force balances gravity
  External -> Object: Net force $F_{net} \ne 0$ applied
  Object -> Path: Accelerates in the direction of $F$
@/diagram

---

## 2 — Law of Acceleration

**Definition**: The acceleration of an object is directly proportional to
the net force and inversely proportional to its mass.

@math name="Newton's Second Law" label="eq:f=ma"
  \mathbf{F} = m\mathbf{a}
@/math

@interactive
  slider name="mass"  min=1   max=100 default=10 label="Mass (kg)"
  slider name="force" min=0   max=500 default=50 label="Net Force (N)"
  output: $a = \frac{F}{m} = \frac{force}{mass}\,\text{m/s}^2$
@/interactive

@math plot name="Acceleration vs Force (m = 10 kg)"
  function: "y = x / 10"
  xrange: [0, 100]
  yrange: [0, 10]
  xlabel: "Net Force (N)"
  ylabel: "Acceleration (m/s²)"
  grid: true
@/math

---

## 3 — Law of Action and Reaction

**Definition**: For every action force, there is an equal and opposite
reaction force acting on a different object.

@math name="Action–Reaction Pair" label="eq:action"
  \mathbf{F}_{\text{action}} = -\mathbf{F}_{\text{reaction}}
@/math

[warning]
Action and reaction forces always act on **different** objects. They
never cancel each other because they act on different systems.
[/warning]

---

## Summary

@grid cols=3 gap=1.5rem
  @card variant=outline
    **Law 1 · Inertia**

    $F_{net}=0 \Rightarrow a=0$

    Objects resist changes in motion.
  @/card

  @card variant=outline
    **Law 2 · F = ma**

    $\mathbf{F} = m\mathbf{a}$

    Net force causes acceleration.
  @/card

  @card variant=outline
    **Law 3 · Reaction**

    $F_A = -F_R$

    Every force has an equal opposite.
  @/card
@/grid

---

## Architecture of Forces

[ External Force ] +primary
  => ( Net Force Calculator )

( Net Force Calculator ) +glass
  -> { Zero? } +warning

{ Zero? } +warning
  --"Yes"--> [ Constant Velocity ] +success
  --"No"-->  [ Acceleration: a = F/m ] +danger

[ Acceleration: a = F/m ] +danger
  => ( Update Position )
  => ( Update Velocity )

( Update Position )
  -> [ New Position: x = x₀ + vt + ½at² ] +dashed

( Update Velocity )
  -> [ New Velocity: v = v₀ + at ] +dashed

---

## Practice Quiz

@quiz title="Newton's Laws · Chapter Check" time_limit=300 passing=70

  @mcq
    question: "Which law states that objects resist changes in their state of motion?"
    A: "Newton's Zeroth Law"
    B: "Newton's First Law"  [correct]
    C: "Newton's Second Law"
    D: "Newton's Third Law"
    explanation: "The First Law defines inertia — the resistance of objects to acceleration."
    difficulty: easy
  @/mcq

  @mcq
    question: "A 5 kg object experiences a 20 N net force. What is its acceleration?"
    A: "1 m/s²"
    B: "2 m/s²"
    C: "4 m/s²"  [correct]
    D: "100 m/s²"
    explanation: "a = F/m = 20/5 = 4 m/s²"
    difficulty: medium
  @/mcq

  @mcq
    question: "A book rests on a table. The book pushes down with 10 N. How much force does the table exert on the book?"
    A: "0 N"
    B: "5 N"
    C: "10 N upward"  [correct]
    D: "20 N upward"
    explanation: "By Newton's Third Law, the table exerts an equal and opposite (upward) reaction force of 10 N."
    difficulty: medium
  @/mcq

@/quiz

---

## Flashcard Deck

@flashcard
  front: State Newton's First Law.
  back: An object at rest stays at rest, and an object in motion continues
        in motion at constant velocity, unless a net external force acts on it.
  tags: [law1, inertia]
  difficulty: easy
@/flashcard

@flashcard
  front: What is the SI unit of force?
  back: Newton (N) — equivalent to kg·m/s²
  tags: [units, force]
  difficulty: easy
@/flashcard

@flashcard
  front: A 2 kg ball is accelerated at 3 m/s². What force acted on it?
  back: $F = ma = 2 \times 3 = 6\,\text{N}$
  tags: [calculation, law2]
  difficulty: medium
@/flashcard

---

*Next Chapter*: [Work & Energy](work-energy.zl) · [Circular Motion](circular-motion.zl)

[^1]: Newton, I. (1687). *Philosophiæ Naturalis Principia Mathematica*. London: Royal Society.
```

---

*This document is the canonical Zolto language reference.*
*Source: `zolto/specs/syntax.md` · AST spec: `zolto/specs/ast.md` · Grammar: `zolto/lton  @cg ba accelerce?
celegri/s²