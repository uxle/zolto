# Zolto AST Specification

**File:** `zolto/specs/ast.md`
**Version:** 8.1.0 (Infinity Architecture · Unified Spatial AST · Human-Friendly Edition)
**Source of truth:** `js/parser/ast.js`
**Syntax reference:** `zolto/specs/syntax.md`

---

## Table of Contents

1. [What Is the AST?](#1-what-is-the-ast)
2. [Design Principles](#2-design-principles)
3. [Compiler Pipeline](#3-compiler-pipeline)
4. [Document Root](#4-document-root)
5. [Domain 1 — Rich Markdown & Typography](#5-domain-1--rich-markdown--typography)
6. [Domain 2 — Advanced Mathematics](#6-domain-2--advanced-mathematics)
7. [Domain 3 — Diagrams & Spatial Graphs](#7-domain-3--diagrams--spatial-graphs)
8. [Domain 4 — Native Vector & Graphics](#8-domain-4--native-vector--graphics)
9. [Domain 5 — Spatial Layout System](#9-domain-5--spatial-layout-system)
10. [Domain 6 — Component & Template System](#10-domain-6--component--template-system)
11. [Inline Nodes](#11-inline-nodes)
12. [Math AST Nodes](#12-math-ast-nodes)
13. [Enumerations](#13-enumerations)
14. [ASTFactory — Every Method](#14-astfactory--every-method)
15. [InlineParser](#15-inlineparser)
16. [MathASTBuilder](#16-mathastbuilder)
17. [ID Generation](#17-id-generation)
18. [Node Shape Rules](#18-node-shape-rules)
19. [Developer JSON Examples](#19-developer-json-examples)

---

## 1. What Is the AST?

The Zolto **Abstract Syntax Tree (AST)** is the single shared data structure connecting every part of the system:

```
 Zolto source (.zl)
        │
      Parser          ← produces the AST
        │
        ▼
  Document (AST)
        │
   ┌────┴────┐
   ▼         ▼
Renderer   Exporter   ← both consume the AST
```

When you write a `.zl` file, the parser reads it and builds a `Document` node containing every heading, equation, diagram, card, and component as a structured JavaScript object. The renderer then walks that tree and produces HTML/SVG output.

**You never need to think about the AST as an author.** This document is for developers building renderers, exporters, plugins, or editor tooling.

### How the syntax maps to the AST

Zolto uses two syntactic layers, both of which produce the same AST node types:

| Layer | Used for | Example |
|-------|----------|---------|
| **Standard Markdown** | Prose, headings, lists, emphasis | `## Section`, `**bold**`, `- item` |
| **`@directive` blocks** | Math, diagrams, charts, layouts, components | `@math … @/math`, `@diagram flowchart … @/diagram` |

Both layers are first-class. Everything compiles to the same typed node objects described in this document.

---

## 2. Design Principles

### 2.1 One Object Shape Per Node Type

Every `Heading` node has exactly the same keys, in the same order, every time. This lets V8 use a single **Hidden Class** for all headings rather than re-optimising on every property access.

```js
// ✅  Always the same shape — V8 loves this
{ type, id, line, level, text, anchor, classes, attrs, inline, flags }

// ❌  Conditional keys break Hidden Class stability
if (hasId) node.id = generateId();
```

### 2.2 `null` Instead of Missing

Optional fields are always declared with `null` — never omitted.

```js
// ✅  label is always present, null when unused
{ type: 'MathBlock', label: null, number: 0, ... }

// ❌  omitting label breaks the hidden class
{ type: 'MathBlock', number: 0, ... }
```

### 2.3 Frozen Enums

All type constants are `Object.freeze()`-d at module load. Use the constant, not the raw string:

```js
// ✅ Correct
node.type === ZOLTONodeTypes.HEADING

// ❌ Fragile — breaks if a string ever changes
node.type === 'Heading'
```

### 2.4 Inline Content Is Lazily Parsed

`Paragraph` leaves `inline: null` when first created. The `InlineParser` fills it during the transformer pass. If a node is never rendered, its inline parsing is never paid for.

### 2.5 Arrays Are Always Arrays

Array fields are initialised to `[]`, never `null`. Renderers always call `.map()` safely without null-checks.

### 2.6 No `meta` for Known Properties

If a property is known at design time, it gets its own explicit key. Only open-ended renderer hints go in `meta`. This preserves Hidden Class stability across all node consumers.

---

## 3. Compiler Pipeline

```
 ┌──────────────────────────────────────────────┐
 │  Source File  (.zl)                          │
 └──────────────────┬───────────────────────────┘
                    ▼
 ┌──────────────────────────────────────────────┐
 │  Tokenizer  (tokenizer.js)                   │
 │  Stream of tokens + InlineFlags bitmask      │
 └──────────────────┬───────────────────────────┘
                    ▼
 ┌──────────────────────────────────────────────┐
 │  Lexer  (lexer.js)                           │
 │  Token classification, keyword recognition   │
 └──────────────────┬───────────────────────────┘
                    ▼
 ┌──────────────────────────────────────────────┐
 │  Parser  (parser.js)  ←── ASTFactory only    │
 │  Builds the Document node tree               │
 └──────────────────┬───────────────────────────┘
                    ▼
 ┌──────────────────────────────────────────────┐
 │  Validator  (validator.js)                   │
 │  Type checks, diagnostic error nodes         │
 └──────────────────┬───────────────────────────┘
                    ▼
 ┌──────────────────────────────────────────────┐
 │  Transformer  (transformer.js)               │
 │  • InlineParser fills node.inline            │
 │  • MathASTBuilder fills node.ast             │
 │  • Equation auto-numbering                   │
 │  • Footnote / reference resolution           │
 │  • Component registry population             │
 │  • Variable expansion                        │
 └──────────────────┬───────────────────────────┘
                    ▼
 ┌──────────────────────────────────────────────┐
 │  Document AST  (ready for all consumers)     │
 └───┬──────────────┬────────────────┬──────────┘
     ▼              ▼                ▼
 html-renderer  pdf-export    virtual-dom
 math-renderer  markdown-exp  live-renderer
 diagram-renderer json-export
```

---

## 4. Document Root

`ASTFactory.createDocument()` produces the root. It is **never** placed inside another node.

```ts
interface Document {
  type:        'Document';
  version:     '8.1.0';
  frontmatter: Frontmatter | null;
  nodes:       ASTNode[];
  edges:       Edge[];
  components:  ComponentDef[];
  vectors:     VectorScene[];
  mathIndex:   Record<string, number>;
  footnotes:   Record<string, Footnote>;
  references:  Record<string, string>;
  variables:   Record<string, string>;
  imports:     Import[];
  meta:        Record<string, unknown>;
}
```

### Document-level metadata nodes

| Node type | Zolto syntax | Purpose |
|-----------|-------------|---------|
| `Frontmatter` | `---` … `---` | YAML/TOML document metadata |
| `Comment` | `// text` or `/* … */` | Source comment — never rendered |
| `Import` | `@import "file.zl"` | External file reference |
| `Variable` | `$name = value` | Document variable declaration |
| `ThemeToken` | `--token: value` | CSS custom property override |

---

## 5. Domain 1 — Rich Markdown & Typography

Zolto is a **strict superset of Markdown**. Everything from Markdown works unchanged.

```
# Heading 1       → Heading { level: 1 }
**bold**          → inline Bold node
*italic*          → inline Italic node
- item            → List > ListItem
- [x] done        → ChecklistItem { checked: true }
> quote           → Quote node
[text](url)       → inline Link node
---               → HorizontalRule
```

---

### 5.1 Heading

```ts
interface Heading {
  type:    'Heading';
  id:      string;
  line:    number;
  level:   1 | 2 | 3 | 4 | 5 | 6;
  text:    string;
  anchor:  string;
  classes: string[];
  attrs:   Record<string, string>;
  inline:  InlineNode[] | null;
  flags:   number;
}
```

**Zolto syntax:** `# Title` · `## Section {#custom-id}` · `### Sub {.highlight}`

---

### 5.2 Paragraph

```ts
interface Paragraph {
  type:   'Paragraph';
  id:     string;
  line:   number;
  text:   string;
  inline: InlineNode[] | null;
  flags:  number;
}
```

---

### 5.3 HorizontalRule

```ts
interface HorizontalRule { type: 'HorizontalRule'; line: number; }
```

---

### 5.4 Quote

```ts
interface Quote {
  type:     'Quote';
  id:       string;
  line:     number;
  text:     string;
  inline:   InlineNode[] | null;
  flags:    number;
  children: ASTNode[];
}
```

---

### 5.5 Callout

```ts
interface Callout {
  type:        'Callout';
  id:          string;
  line:        number;
  calloutType: ZOLTOCalloutTypes;
  title:       string;
  children:    ASTNode[];
}
```

**Zolto syntax:** `[important]…[/important]` · `[tip]…[/tip]` · `[warning]…[/warning]`

All types: `note` `tip` `info` `warning` `danger` `caution` `important` `success` `check` `bug` `example` `quote` `abstract` `todo` `question` `failure` `seealso` `summary` `hint` `attention`

---

### 5.6 Admonition

```ts
interface Admonition {
  type:      'Admonition';
  id:        string;
  line:      number;
  blockType: ZOLTOCalloutTypes;
  title:     string;
  icon:      string | null;
  children:  ASTNode[];
}
```

**Zolto syntax:** `::: warning Watch out! … :::`

---

### 5.7 CodeBlock

```ts
interface CodeBlock {
  type:     'CodeBlock';
  id:       string;
  line:     number;
  lang:     string;
  language: string;
  config:   string;
  content:  string;
  meta:     Record<string, unknown>;
}
```

---

### 5.8 Table

```ts
interface Table {
  type:       'Table';
  id:         string;
  line:       number;
  caption:    string | null;
  headers:    string[];
  rows:       string[][];
  alignments: ('left' | 'center' | 'right')[];
  widths:     string[];
  meta:       Record<string, unknown>;
}
```

---

### 5.9 Lists

```ts
interface List {
  type:      'List';
  id:        string;
  line:      number;
  isOrdered: false;
  tight:     boolean;
  items:     ListItem[];
}

interface ListItem {
  type:     'ListItem';
  id:       string;
  line:     number;
  indent:   number;
  bullet:   '-' | '*' | '+';
  text:     string;
  checked:  false;
  modifier: null;
  inline:   InlineNode[] | null;
  flags:    number;
  children: ASTNode[];
}

interface ChecklistItem {
  type:     'ChecklistItem';
  id:       string;
  line:     number;
  indent:   number;
  bullet:   '-' | '*' | '+';
  text:     string;
  checked:  boolean;
  modifier: '?' | '!' | 'o' | '~' | '/' | null;
  inline:   InlineNode[] | null;
  flags:    number;
  children: ASTNode[];
}

interface OrderedListItem {
  type:     'OrderedListItem';
  id:       string;
  line:     number;
  indent:   number;
  number:   number;
  marker:   '.' | ')' | ':';
  text:     string;
  inline:   InlineNode[] | null;
  flags:    number;
  children: ASTNode[];
}
```

---

### 5.10 DefinitionList

```ts
interface DefinitionList {
  type:  'DefinitionList';
  id:    string;
  line:  number;
  items: DefinitionItem[];
}

interface DefinitionItem {
  type:       'DefinitionItem';
  id:         string;
  line:       number;
  term:       string;
  definition: string;
  termInline: InlineNode[] | null;
  defInline:  InlineNode[] | null;
}
```

---

### 5.11 Footnote & Reference

```ts
interface Footnote {
  type:    'Footnote';
  id:      string;
  line:    number;
  content: string;
  inline:  InlineNode[] | null;
  number:  number;
}

interface Reference {
  type: 'Reference';
  line: number;
  id:   string;
  url:  string;
}
```

---

### 5.12 Embed

```ts
interface Embed {
  type:      'Embed';
  id:        string;
  line:      number;
  embedType: 'image' | 'youtube' | 'vimeo' | 'audio' | 'video'
           | 'iframe' | 'codepen' | 'figma' | 'excalidraw' | 'loom';
  label:     string;
  url:       string;
  alt:       string;
  title:     string | null;
  width:     string | null;
  height:    string | null;
  config:    string | null;
  meta:      Record<string, unknown>;
}
```

---

### 5.13 TabGroup & Tab

```ts
interface TabGroup {
  type:   'TabGroup';
  id:     string;
  line:   number;
  active: number;
  tabs:   Tab[];
}

interface Tab {
  type:     'Tab';
  id:       string;
  line:     number;
  label:    string;
  icon:     string | null;
  children: ASTNode[];
}
```

---

### 5.14 Accordion

```ts
interface Accordion {
  type:     'Accordion';
  id:       string;
  line:     number;
  title:    string;
  open:     boolean;
  children: ASTNode[];
}
```

---

### 5.15 Card & CardGroup

```ts
interface Card {
  type:     'Card';
  id:       string;
  line:     number;
  title:    string;
  icon:     string | null;
  variant:  string;
  href:     string | null;
  children: ASTNode[];
}

interface CardGroup {
  type:    'CardGroup';
  id:      string;
  line:    number;
  columns: number;
  cards:   Card[];
}
```

---

### 5.16 Steps & Step

```ts
interface Steps {
  type:  'Steps';
  id:    string;
  line:  number;
  items: Step[];
}

interface Step {
  type:     'Step';
  id:       string;
  line:     number;
  number:   number;
  title:    string;
  children: ASTNode[];
}
```

---

### 5.17 Details (Spoiler)

```ts
interface Details {
  type:     'Details';
  id:       string;
  line:     number;
  summary:  string;
  open:     boolean;
  children: ASTNode[];
}
```

---

### 5.18 ColumnLayout

```ts
interface ColumnLayout {
  type:    'ColumnLayout';
  id:      string;
  line:    number;
  count:   number;
  gap:     string | null;
  columns: Column[];
}

interface Column {
  type:     'Column';
  id:       string;
  line:     number;
  children: ASTNode[];
}
```

---

### 5.19 Flashcard

Stored as `Card { variant: 'flashcard', meta: FlashcardMeta }`:

```ts
interface FlashcardMeta {
  front:      string;
  back:       string;
  tags:       string[];
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

### 5.20 MCQ & Quiz

Stored as `Card { variant: 'mcq', meta: MCQMeta }`:

```ts
interface MCQMeta {
  question:    string;
  options:     { key: string; text: string; correct: boolean }[];
  explanation: string;
  difficulty:  'easy' | 'medium' | 'hard';
  tags:        string[];
  type:        'single' | 'multi' | 'truefalse' | 'fillblank' | 'matrix';
}
```

Quizzes wrap multiple MCQs in a `LayoutBlock { directive: 'quiz' }`.

---

## 6. Domain 2 — Advanced Mathematics

| Use case | Syntax | Node type |
|----------|--------|-----------|
| Inline equation | `$E = mc^2$` | `MathInline` |
| Block equation | `@math … @/math` | `MathBlock` |
| Named / labelled | `@math name="…" label="…"` | `MathBlock` |
| Function plot | `@math plot … @/math` | `MathBlock` (env=plot) |
| Interactive sliders | `@interactive … @/interactive` | `LayoutBlock` |

Currency (`$10`) never triggers math — the parser requires a closing `$` with math-like content.

---

### 6.1 MathBlock

```ts
interface MathBlock {
  type:     'MathBlock';
  id:       string;
  line:     number;
  config:   string;
  content:  string;
  env:      'equation' | 'align' | 'gather' | 'multline' | 'cases' | 'plot';
  display:  'block';
  numbered: boolean;
  label:    string | null;
  number:   number;
  title:    string | null;
  ast:      MathASTNode | null;
}
```

**Zolto syntax:**
```
@math name="Newton's Second Law" label="eq:f=ma"
  \mathbf{F} = m\mathbf{a}
@/math

@math env=align
  F &= ma \\
  W &= F \cdot d \\
  P &= \frac{W}{t}
@/math
```

---

### 6.2 MathInline

```ts
interface MathInline {
  type:    'MathInline';
  text:    string;
  display: 'inline';
  ast:     MathASTNode | null;
}
```

---

### 6.3 MathEquation

```ts
interface MathEquation {
  type:    'MathEquation';
  id:      string;
  line:    number;
  label:   string | null;
  content: string;
  number:  number;
  display: 'block';
  ast:     MathASTNode | null;
}
```

---

### 6.4 MathEnvironment

```ts
interface MathEnvironment {
  type:     'MathEnvironment';
  id:       string;
  line:     number;
  env:      string;
  content:  string;
  options:  Record<string, unknown>;
  numbered: boolean;
  rows:     MathASTNode[];
  ast:      MathASTNode | null;
}
```

---

## 7. Domain 3 — Diagrams & Spatial Graphs

### Diagram types

| `diagramType` | What it renders |
|--------------|----------------|
| `flowchart` | Node-and-arrow flows |
| `sequence` | Lifeline message diagrams |
| `state` | Finite state machines |
| `erd` | Entity–relationship diagrams |
| `mindmap` | Radial / tree mind maps |
| `gantt` | Project Gantt charts |
| `timeline` | Historical / roadmap timelines |
| `network` | Force-directed network graphs |
| `architecture` | Cloud / system architecture |
| `dependency` | Package / module dependency |
| `tree` | Hierarchy trees |
| `pipeline` | Linear process pipelines |
| `kanban` | Kanban columns |
| `geometry` | Geometric shapes |
| `circuit` | Electronic circuits |
| `atom` | Bohr atom model |
| `grammar-tree` | Sentence parse trees |

---

### 7.1 Generic Diagram Container

```ts
interface Diagram {
  type:        'Diagram';
  id:          string;
  line:        number;
  diagramType: ZOLTODiagramTypes;
  name:        string;
  dir:         'LR' | 'RL' | 'TB' | 'BT';
  config:      string;
  nodes:       ASTNode[];
  edges:       ASTNode[];
  groups:      ASTNode[];
  styles:      Record<string, string>;
  theme:       string | null;
  meta:        Record<string, unknown>;
}
```

---

### 7.2 Graph (Flowchart)

```ts
interface Graph {
  type:   'Graph';
  id:     string;
  line:   number;
  dir:    'LR' | 'RL' | 'TB' | 'BT';
  name:   string;
  nodes:  GraphNode[];
  edges:  GraphEdge[];
  groups: GraphSubgraph[];
  styles: Record<string, string>;
  meta:   Record<string, unknown>;
}

interface GraphNode {
  type:     'GraphNode';
  id:       string;
  line:     number;
  label:    string;
  kind:     ZOLTOShapeTypes;
  cssClass: string | null;
  x:        number;
  y:        number;
  meta:     Record<string, unknown>;
}

interface GraphEdge {
  type:      'GraphEdge';
  id:        string;
  line:      number;
  fromId:    string;
  toId:      string;
  operator:  ZOLTOEdgeOperators;
  edgeLabel: string | null;
  style:     string | null;
}

interface GraphSubgraph {
  type:  'GraphSubgraph';
  id:    string;
  line:  number;
  label: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta:  Record<string, unknown>;
}
```

#### Node shape brackets

| Brackets | Shape |
|---------|-------|
| `[Label]` | Rectangle |
| `(Label)` | Rounded rect |
| `((Label))` | Circle |
| `{Label}` | Diamond |
| `{{Label}}` | Hexagon |
| `[(Label)]` | Cylinder |
| `<Label>` | Parallelogram |
| `[[Label]]` | Double-border |

#### Node traits (append `+name`)

`+primary` `+success` `+danger` `+warning` `+glass` `+outline` `+dashed` `+elevated` `+glow` `+muted` `+accent`

---

### 7.3 Sequence Diagram

```ts
interface Sequence {
  type:      'Sequence';
  id:        string;
  line:      number;
  name:      string;
  actors:    SequenceActor[];
  messages:  SequenceMessage[];
  groups:    SequenceGroup[];
  notes:     SequenceNote[];
  meta:      Record<string, unknown>;
}

interface SequenceActor {
  type:  'SequenceActor';
  id:    string;
  line:  number;
  alias: string;
  kind:  'participant' | 'actor' | 'database' | 'boundary' | 'control' | 'entity';
  order: number;
}

interface SequenceMessage {
  type:      'SequenceMessage';
  id:        string;
  line:      number;
  fromId:    string;
  toId:      string;
  operator:  '->' | '-->' | '->>' | '-->>' | '-x' | '-)';
  text:      string;
  inline:    InlineNode[] | null;
  activate:  boolean;
  numbered:  boolean;
  number:    number;
}

interface SequenceNote {
  type:    'SequenceNote';
  id:      string;
  line:    number;
  side:    'left' | 'right' | 'over';
  actorId: string;
  text:    string;
  inline:  InlineNode[] | null;
}

interface SequenceGroup {
  type:     'SequenceGroup';
  id:       string;
  line:     number;
  kind:     'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect';
  label:    string;
  branches: { condition: string; messages: SequenceMessage[] }[];
  children: ASTNode[];
}
```

---

### 7.4 State Machine

```ts
interface StateMachine {
  type:        'StateMachine';
  id:          string;
  line:        number;
  name:        string;
  states:      StateNode[];
  transitions: StateTransition[];
  notes:       StateNote[];
  initial:     string | null;
  final:       string[];
  meta:        Record<string, unknown>;
}

interface StateNode {
  type:      'StateNode';
  id:        string;
  line:      number;
  label:     string;
  kind:      'normal' | 'start' | 'end' | 'fork' | 'join' | 'choice';
  entry:     string | null;
  exit:      string | null;
  substates: StateNode[];
}

interface StateTransition {
  type:   'StateTransition';
  id:     string;
  line:   number;
  fromId: string;
  toId:   string;
  guard:  string | null;
  action: string | null;
  event:  string | null;
}
```

---

### 7.5 ER Diagram

```ts
interface ERDiagram {
  type:      'ERDiagram';
  id:        string;
  line:      number;
  name:      string;
  entities:  EREntity[];
  relations: ERRelation[];
  meta:      Record<string, unknown>;
}

interface EREntity {
  type:       'EREntity';
  id:         string;
  line:       number;
  name:       string;
  attributes: ERAttribute[];
}

interface ERAttribute {
  type:     'ERAttribute';
  line:     number;
  attrType: string;
  attrName: string;
  attrKey:  'PK' | 'FK' | 'UK' | null;
  comment:  string | null;
}

interface ERRelation {
  type:        'ERRelation';
  id:          string;
  line:        number;
  fromEntity:  string;
  toEntity:    string;
  operator:    string;
  label:       string;
  cardinality: string | null;
}
```

---

### 7.6 Mindmap

```ts
interface Mindmap {
  type:     'Mindmap';
  id:       string;
  line:     number;
  root:     MindmapNode | null;
  children: MindmapNode[];
  theme:    string | null;
  layout:   'radial' | 'tree' | 'compact';
}

interface MindmapNode {
  type:     'MindmapNode';
  id:       string;
  line:     number;
  indent:   number;
  bullet:   string;
  text:     string;
  inline:   InlineNode[] | null;
  children: MindmapNode[];
}
```

---

### 7.7 Gantt Chart

```ts
interface Gantt {
  type:       'Gantt';
  id:         string;
  line:       number;
  title:      string;
  dateFormat: string;
  axisFormat: string | null;
  sections:   GanttSection[];
  meta:       Record<string, unknown>;
}

interface GanttSection {
  type:  'GanttSection';
  id:    string;
  line:  number;
  text:  string;
  tasks: GanttTask[];
}

interface GanttTask {
  type:     'GanttTask';
  id:       string;
  line:     number;
  text:     string;
  modifier: 'crit' | 'done' | 'active' | 'milestone' | null;
  start:    string | null;
  duration: string | null;
  end:      string | null;
  progress: number;
}
```

---

### 7.8 Timeline

```ts
interface Timeline {
  type:    'Timeline';
  id:      string;
  line:    number;
  title:   string;
  periods: TimelinePeriod[];
  meta:    Record<string, unknown>;
}

interface TimelinePeriod {
  type:   'TimelinePeriod';
  id:     string;
  line:   number;
  period: string;
  events: TimelineEvent[];
}

interface TimelineEvent {
  type:   'TimelineEvent';
  id:     string;
  line:   number;
  text:   string;
  label:  string | null;
  inline: InlineNode[] | null;
}
```

---

### 7.9 Data Charts

```ts
interface Chart {
  type:      'Chart';
  id:        string;
  line:      number;
  chartType: 'PIE' | 'BAR' | 'LINE' | 'AREA' | 'SCATTER' | 'RADAR'
           | 'DONUT' | 'HISTOGRAM' | 'GAUGE' | 'WATERFALL'
           | 'HEATMAP' | 'SANKEY' | 'FUNNEL' | 'TREEMAP'
           | 'BUBBLE' | 'POLAR' | 'QUADRANT';
  config:    string;
  dataset:   { label: string; value: number }[];
  meta:      Record<string, unknown>;
}
```

---

### 7.10 Legacy Shape & Edge

```ts
interface Shape {
  type:      'Shape';
  id:        string;
  line:      number;
  label:     string;
  trait:     string;
  shapeType: ZOLTOShapeTypes;
  x:         number;
  y:         number;
  w:         number;
  h:         number;
  classes:   string[];
  metadata:  Record<string, unknown>;
}

interface Edge {
  type:      'Edge';
  id:        string;
  line:      number;
  operator:  ZOLTOEdgeOperators;
  edgeLabel: string | null;
  fromId:    string | null;
  toId:      string | null;
  rawTarget: string;
}
```

---

## 8. Domain 4 — Native Vector & Graphics

### 8.1 VectorScene

```ts
interface VectorScene {
  type:    'VectorScene';
  id:      string;
  line:    number;
  width:   number;
  height:  number;
  viewBox: string | null;
  layers:  VectorLayer[];
  defs:    ASTNode[];
  meta:    Record<string, unknown>;
}
```

---

### 8.2 VectorLayer

```ts
interface VectorLayer {
  type:     'VectorLayer';
  id:       string;
  line:     number;
  name:     string;
  kind:     'normal' | 'front' | 'back' | 'canvas';
  locked:   boolean;
  visible:  boolean;
  children: VectorShape[];
}
```

---

### 8.3 VectorShape

```ts
interface VectorShape {
  type:        'VectorShape';
  id:          string;
  line:        number;
  vectorType:  ZOLTOVectorTypes;
  vectorData:  string;
  fill:        string | null;
  stroke:      string | null;
  strokeWidth: number | null;
  opacity:     number | null;
  transform:   string | null;
  classes:     string[];
  attributes:  Record<string, string | number>;
}
```

| `vectorType` | Required attributes |
|-------------|-------------------|
| `rect` | `x y width height` |
| `circle` | `cx cy r` |
| `ellipse` | `cx cy rx ry` |
| `line` | `x1 y1 x2 y2` |
| `polyline` / `polygon` | `points` |
| `path` | `d` (SVG path data) |
| `text` | `x y text` |
| `image` | `x y width height href` |
| `arc` | `cx cy r startAngle endAngle` |
| `bezier` | `x1 y1 cx1 cy1 cx2 cy2 x2 y2` |
| `star` | `cx cy r points innerR` |
| `arrow` | `x1 y1 x2 y2 headSize` |

---

### 8.4 VectorPath

```ts
interface VectorPath {
  type:          'VectorPath';
  id:            string;
  line:          number;
  d:             string;
  fill:          string;
  stroke:        string | null;
  strokeWidth:   number;
  strokeLinecap: 'round' | 'butt' | 'square';
  closed:        boolean;
  attributes:    Record<string, string | number>;
}
```

---

### 8.5 VectorConnector

```ts
interface VectorConnector {
  type:   'VectorConnector';
  id:     string;
  line:   number;
  fromId: string | null;
  toId:   string | null;
  style:  'straight' | 'curved' | 'elbow' | 'smart';
  label:  string | null;
  attrs:  Record<string, string>;
}
```

---

### 8.6 VectorArtboard

```ts
interface VectorArtboard {
  type:     'VectorArtboard';
  id:       string;
  line:     number;
  name:     string;
  width:    number | null;
  height:   number | null;
  clip:     boolean;
  layers:   VectorLayer[];
  children: ASTNode[];
  meta:     Record<string, unknown>;
}
```

---

### 8.7 VectorCamera

```ts
interface VectorCamera {
  type:  'VectorCamera';
  line:  number;
  x:     number;
  y:     number;
  scale: number;
  raw:   string;
}
```

---

## 9. Domain 5 — Spatial Layout System

| Node type | Mode | Description |
|-----------|------|-------------|
| `GridLayout` | CSS Grid | Fixed or auto-fill grid |
| `FlexLayout` | CSS Flex | Row or column flex |
| `ColumnLayout` | Multi-column | 2–6 column text layout |
| `Canvas` | Canvas | Finite absolute-positioned surface |
| `Whiteboard` | Infinite | Infinite pan/zoom workspace |
| `Presentation` | Slides | Slide deck |
| `SplitView` | Split | Resizable pane pair |
| `Panel` | Panel | Collapsible side panel |

---

### 9.1 GridLayout

```ts
interface GridLayout {
  type:     'GridLayout';
  id:       string;
  line:     number;
  columns:  number;
  rows:     number | null;
  gap:      string;
  config:   string;
  autoFlow: 'row' | 'column' | 'dense';
  children: ASTNode[];
}
```

---

### 9.2 FlexLayout

```ts
interface FlexLayout {
  type:      'FlexLayout';
  id:        string;
  line:      number;
  direction: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap:      boolean;
  gap:       string | null;
  align:     string | null;
  justify:   string | null;
  config:    string;
  children:  ASTNode[];
}
```

---

### 9.3 Canvas

```ts
interface Canvas {
  type:     'Canvas';
  id:       string;
  line:     number;
  width:    number | null;
  height:   number | null;
  infinite: boolean;
  zoom:     number;
  panX:     number;
  panY:     number;
  snap:     boolean;
  grid:     boolean;
  children: ASTNode[];
}
```

---

### 9.4 Whiteboard

```ts
interface Whiteboard {
  type:     'Whiteboard';
  id:       string;
  line:     number;
  config:   string;
  infinite: true;
  zoom:     number;
  children: ASTNode[];
}
```

---

### 9.5 Presentation & Slide

```ts
interface Presentation {
  type:   'Presentation';
  id:     string;
  line:   number;
  config: string;
  theme:  string | null;
  slides: Slide[];
}

interface Slide {
  type:     'Slide';
  id:       string;
  line:     number;
  layout:   string;
  config:   string;
  children: ASTNode[];
}
```

---

### 9.6 SplitView

```ts
interface SplitView {
  type:      'SplitView';
  id:        string;
  line:      number;
  direction: 'horizontal' | 'vertical';
  ratio:     string;
  config:    string;
  panes:     ASTNode[];
}
```

---

### 9.7 Panel

```ts
interface Panel {
  type:        'Panel';
  id:          string;
  line:        number;
  title:       string | null;
  config:      string;
  collapsible: boolean;
  collapsed:   boolean;
  resizable:   boolean;
  children:    ASTNode[];
}
```

---

### 9.8 Layer & Artboard

```ts
interface Layer {
  type:    'Layer';
  id:      string;
  line:    number;
  name:    string;
  config:  string;
  visible: boolean;
  locked:  boolean;
  nodes:   ASTNode[];
}

interface Artboard {
  type:   'Artboard';
  id:     string;
  line:   number;
  name:   string;
  config: string;
  width:  number | null;
  height: number | null;
  layers: Layer[];
}
```

---

## 10. Domain 6 — Component & Template System

### 10.1 ComponentDef

```ts
interface ComponentDef {
  type:     'ComponentDef';
  id:       string;
  line:     number;
  name:     string;
  params:   { name: string; type: string; default: unknown }[];
  slots:    string[];
  variants: Record<string, Record<string, string>>;
  children: ASTNode[];
}
```

---

### 10.2 ComponentUse

```ts
interface ComponentUse {
  type:          'ComponentUse';
  id:            string;
  line:          number;
  componentName: string;
  propsString:   string;
  parsedProps:   Record<string, unknown>;
  slots:         Record<string, ASTNode[]>;
  children:      ASTNode[];
}
```

**Zolto syntax:** `<UserCard name="Alice" role="Admin" />`

---

### 10.3 SlotDef & SlotOutlet

```ts
interface SlotDef {
  type:     'SlotDef';
  id:       string;
  line:     number;
  slotName: string;
  fallback: ASTNode[] | null;
  children: ASTNode[];
}

interface SlotOutlet {
  type:     'SlotOutlet';
  id:       string;
  line:     number;
  slotName: string;
}
```

---

### 10.4 TemplateDef & MacroDef

```ts
interface TemplateDef {
  type:     'TemplateDef';
  id:       string;
  line:     number;
  name:     string;
  params:   { name: string; type: string; default: unknown }[];
  children: ASTNode[];
}

interface MacroDef {
  type:     'MacroDef';
  id:       string;
  line:     number;
  name:     string;
  params:   string[];
  children: ASTNode[];
}
```

---

### 10.5 Animation & Keyframe

```ts
interface Animation {
  type:      'Animation';
  id:        string;
  line:      number;
  name:      string;
  timing:    'ease' | 'linear' | 'ease-in' | 'ease-out' | 'spring';
  duration:  string | null;
  delay:     string | null;
  config:    string;
  keyframes: Keyframe[];
}

interface Keyframe {
  type:       'Keyframe';
  offset:     number;
  properties: Record<string, string>;
}
```

---

## 11. Inline Nodes

Inline nodes live inside `node.inline[]` arrays. They are **never** top-level in `Document.nodes`.

| Syntax | Type | Key fields |
|--------|------|-----------|
| plain text | `text` | `text: string` |
| `**text**` | `bold` | `children: InlineNode[]` |
| `*text*` | `italic` | `children: InlineNode[]` |
| `***text***` | `boldItalic` | `children: InlineNode[]` |
| `` `code` `` | `code` | `text: string` |
| `$expr$` | `math` | `text: string`, `display: boolean` |
| `[label](url)` | `link` | `label`, `url`, `title`, `children` |
| `![alt](src)` | `image` | `alt`, `src`, `title` |
| `[^id]` | `footnoteRef` | `id: string` |
| `==text==` | `highlight` | `children: InlineNode[]` |
| `~~text~~` | `strikethrough` | `children: InlineNode[]` |
| `^text^` | `superscript` | `text: string` |
| `~text~` | `subscript` | `text: string` |
| `<u>text</u>` | `underline` | `children: InlineNode[]` |
| `@username` | `mention` | `username: string` |
| `#tag` | `hashtag` | `tag: string` |
| `:name:` | `emoji` | `name: string` |
| `{$name}` | `variableRef` | `name: string` |
| `{red text}` | `color` | `color: string`, `children: InlineNode[]` |
| line break | `lineBreak` | — |
| soft break | `softBreak` | — |

### Fast path

If `flags === 0` and the text contains none of the marker chars, the entire string becomes a single `TextNode` without scanning.

---

## 12. Math AST Nodes

| Type | Meaning | Key properties |
|------|---------|----------------|
| `Num` | Number literal | `value: string` |
| `Var` | Variable / identifier | `name: string` |
| `Symbol` | Named symbol (`\alpha`, `\pi`) | `symbol: string`, `unicode: string` |
| `Op` | Operator (`+` `−` `=`) | `op: string` |
| `Text` | `\text{…}` roman text | `text: string` |
| `Space` | Explicit spacing | — |
| `Frac` | `\frac{a}{b}` | `children: [num, den]` |
| `Sqrt` | `\sqrt{x}` | `children: [inner]` |
| `Power` | `x^{n}` | `children: [base, exp]` |
| `Sub` | `x_{i}` | `children: [base, sub]` |
| `SubSup` | `x_{i}^{n}` | `children: [base, sub, sup]` |
| `Sum` | `\sum_{i=1}^{n}` | `children: [lo?, hi?]`, `symbol` |
| `Prod` | `\prod` | `children: [lo?, hi?]`, `symbol` |
| `Integral` | `\int_{a}^{b}` | `children: [lo?, hi?]`, `symbol` |
| `Limit` | `\lim_{x \to 0}` | `children: [lo?]`, `symbol` |
| `Matrix` | `\begin{matrix}…` | `children: [rows]`, `env` |
| `Cases` | `\begin{cases}…` | `children: [rows]` |
| `Align` | `\begin{align}…` | `children: [rows]` |
| `Row` | Row inside matrix | `children: [cells]` |
| `Cell` | Cell (`&` separator) | `children: [content]` |
| `Delim` | `\left(…\right)` | `children: [inner]`, `open`, `close` |
| `Over` | `\overbrace` / `\overline` | `children: [inner]` |
| `Under` | `\underbrace` / `\underline` | `children: [inner]` |
| `ChemFormula` | `\ce{H2O}` | `text: string` |
| `ChemReaction` | `\ce{A -> B}` | `children: [lhs, rhs]` |
| `Expr` | Expression wrapper | `children: [...]` |
| `Sequence` | Flat sequence | `children: [...]` |

**Supported symbol → unicode:** `\alpha` α · `\beta` β · `\gamma` γ · `\delta` δ · `\pi` π · `\sigma` σ · `\omega` ω · `\Omega` Ω · `\infty` ∞ · `\nabla` ∇ · `\partial` ∂ · `\hbar` ℏ · `\pm` ± · `\times` × · `\leq` ≤ · `\geq` ≥ · `\neq` ≠ · `\approx` ≈ · `\equiv` ≡ · `\in` ∈ · `\forall` ∀ · `\exists` ∃ · `\mathbb{R}` ℝ · `\mathbb{N}` ℕ · `\mathbb{Z}` ℤ · `\mathbb{C}` ℂ

---

## 13. Enumerations

### ZOLTOEdgeOperators

| Operator | Visual |
|---------|--------|
| `-->` | Dashed directed arrow |
| `==>` | Thick directed arrow |
| `-.->` | Dotted directed arrow |
| `~~>` | Wavy / async arrow |
| `->` | Solid thin arrow |
| `.->` | Light dashed arrow |
| `---` | Undirected solid line |
| `===` | Undirected thick line |
| `<-->` | Bidirectional |
| `=>` | Short thick arrow |
| `--x` | Terminated end |
| `--o` | Aggregation end |
| `<>-` | UML aggregation |
| `*->` | UML composition |
| `..>` | UML dependency |
| `..\|>` | UML realization |
| `--\|>` | UML inheritance |
| `--` | UML association |
| `->>` | Sequence async |
| `-->>` | Sequence async return |
| `-x` | Sequence destroy |
| `-)` | Sequence create |

---

### ZOLTOShapeTypes

| Category | Shapes |
|----------|--------|
| Basic | `Rectangle` `Circle` `Ellipse` `Pill` `Diamond` `Hexagon` `Pentagon` `Parallelogram` `Trapezoid` `Triangle` `Star` `Cross` `Arrow` |
| System | `Database` `Cylinder` `Cloud` `Actor` `Note` `Folder` `Component` `Interface` `Package` `Module` `Server` `Queue` `Cache` `Gateway` `LoadBalancer` |
| UML | `Class` `UseCase` `Boundary` `Controller` `Entity` `Object` |
| Flow | `Start` `End` `Decision` `Process` `Subprocess` `Delay` `Manual` `Document` `MultiDoc` `Preparation` `Terminator` `Subroutine` `Stadium` |

---

### ZOLTOVectorTypes

`path` `circle` `ellipse` `rect` `polygon` `polyline` `line` `text` `image` `arc` `bezier` `spline` `star` `arrow` `group` `symbol` `use` `clipPath` `mask` `gradient` `filter`

---

### ZOLTOLayoutTypes

| Type | Meaning |
|------|---------|
| `flex-row` | Horizontal flex |
| `flex-col` | Vertical flex |
| `flex-row-wrap` | Wrapping flex |
| `flex-center` | Centred flex |
| `grid` | CSS grid |
| `grid-2` … `grid-6` | Column shorthand |
| `masonry` | Masonry |
| `absolute` | Free positioning |
| `canvas` | Drawing canvas |
| `whiteboard` | Infinite workspace |
| `presentation` | Slide deck |
| `split` | Horizontal panes |
| `split-vertical` | Vertical panes |
| `panel` | Side panel |
| `sidebar` | Navigation panel |
| `interactive` | Slider + live output |

---

### ZOLTOMDBlockTypes

**Admonitions:** `note` `tip` `info` `warning` `danger` `caution` `important` `success` `check` `bug` `example` `quote` `abstract` `todo` `question` `failure` `seealso` `summary` `hint` `attention`

**UI blocks:** `card` `tab` `accordion` `steps` `details` `spoiler` `callout` `column` `section` `aside` `hero` `banner` `footer`

**Interactive:** `quiz` `exercise` `solution` `demo`

**Docs-specific:** `api` `param` `return` `throws` `since` `deprecated` `experimental`

---

## 14. ASTFactory — Every Method

```js
import { ASTFactory } from './js/parser/ast.js';

const doc  = ASTFactory.createDocument();
const head = ASTFactory.createHeading(1, 2, 'My Title', null);
doc.nodes.push(head);
```

| Method | Returns |
|--------|---------|
| `createDocument()` | `Document` |
| `createFrontmatter(line, configString)` | `Frontmatter` |
| `createComment(line, text)` | `Comment` |
| `createImport(line, url, alias)` | `Import` |
| `createVariable(line, key, value)` | `Variable` |
| `createThemeToken(line, key, value)` | `ThemeToken` |
| `createHeading(line, level, text, config?)` | `Heading` |
| `createParagraph(line, text)` | `Paragraph` |
| `createHorizontalRule(line)` | `HorizontalRule` |
| `createQuote(line, text)` | `Quote` |
| `createCallout(line, calloutType, title, children)` | `Callout` |
| `createCodeBlock(line, lang, config, content)` | `CodeBlock` |
| `createTable(line)` | `Table` |
| `createList(line, isOrdered?)` | `List` / `OrderedList` |
| `createListItem(line, indent, bullet, text, isChecklist?, checked?)` | `ListItem` / `ChecklistItem` |
| `createOrderedListItem(line, indent, number, marker, text)` | `OrderedListItem` |
| `createDefinitionList(line)` | `DefinitionList` |
| `createDefinitionItem(line, term, definition)` | `DefinitionItem` |
| `createEmbed(line, embedType, label, url, config?)` | `Embed` |
| `createFootnote(line, id, content)` | `Footnote` |
| `createReference(line, id, url)` | `Reference` |
| `createColumnLayout(line, count, gap?)` | `ColumnLayout` |
| `createColumn(line)` | `Column` |
| `createAdmonition(line, blockType, title?)` | `Admonition` |
| `createTabGroup(line, id?)` | `TabGroup` |
| `createTab(line, label, tabId?)` | `Tab` |
| `createAccordion(line, title, open?)` | `Accordion` |
| `createCard(line, title, icon?, variant?)` | `Card` |
| `createCardGroup(line, columns?)` | `CardGroup` |
| `createSteps(line)` | `Steps` |
| `createStep(line, number, title)` | `Step` |
| `createDetails(line, summary, open?)` | `Details` |
| `createMathBlock(line, config, content)` | `MathBlock` |
| `createMathInline(text)` | `MathInline` |
| `createMathEquation(line, label, content)` | `MathEquation` |
| `createMathEnvironment(line, env, content, options?)` | `MathEnvironment` |
| `createDiagram(line, diagramType, name, dir, config?)` | `Diagram` |
| `createShape(line, id, label, trait, shapeType?)` | `Shape` |
| `createEdge(line, operator, edgeLabel, fromId, toId, rawTarget)` | `Edge` |
| `createChart(line, chartType, config)` | `Chart` |
| `createGraph(line, dir, name)` | `Graph` |
| `createGraphNode(line, id, label, kind?, cssClass?)` | `GraphNode` |
| `createGraphEdge(line, fromId, toId, operator, edgeLabel?)` | `GraphEdge` |
| `createGraphSubgraph(line, id, label)` | `GraphSubgraph` |
| `createSequence(line, name)` | `Sequence` |
| `createSequenceActor(line, id, alias, kind?)` | `SequenceActor` |
| `createSequenceMessage(line, fromId, toId, operator, text)` | `SequenceMessage` |
| `createSequenceNote(line, side, actorId, text)` | `SequenceNote` |
| `createSequenceGroup(line, kind, label)` | `SequenceGroup` |
| `createStateMachine(line, name)` | `StateMachine` |
| `createStateNode(line, id, label, kind?)` | `StateNode` |
| `createStateTransition(line, fromId, toId, guard?, action?)` | `StateTransition` |
| `createStateNote(line, side, stateId, text)` | `StateNote` |
| `createERDiagram(line, name)` | `ERDiagram` |
| `createEREntity(line, name)` | `EREntity` |
| `createERAttribute(line, attrType, attrName, attrKey?, comment?)` | `ERAttribute` |
| `createERRelation(line, fromEntity, toEntity, operator, label)` | `ERRelation` |
| `createMindmap(line, root?)` | `Mindmap` |
| `createMindmapNode(line, indent, bullet, text, children?)` | `MindmapNode` |
| `createTreeBranch(line, prefix, text)` | `TreeBranch` |
| `createGantt(line, title, dateFormat?)` | `Gantt` |
| `createGanttSection(line, text)` | `GanttSection` |
| `createGanttTask(line, text, id, modifier?, start?, duration?)` | `GanttTask` |
| `createTimeline(line, title)` | `Timeline` |
| `createTimelinePeriod(line, period)` | `TimelinePeriod` |
| `createTimelineEvent(line, text, label?)` | `TimelineEvent` |
| `createVectorScene(line, width, height)` | `VectorScene` |
| `createVectorGroup(line, name)` | `VectorGroup` |
| `createVectorLayer(line, name, kind?)` | `VectorLayer` |
| `createVectorArtboard(line, name, width, height)` | `VectorArtboard` |
| `createVectorShape(line, vectorType, vectorData)` | `VectorShape` |
| `createVectorPath(line, d)` | `VectorPath` |
| `createVectorText(line, x, y, text)` | `VectorText` |
| `createVectorConnector(line, fromId, toId, style?)` | `VectorConnector` |
| `createVectorConstraint(line, raw)` | `VectorConstraint` |
| `createVectorCamera(line, raw)` | `VectorCamera` |
| `createLayoutBlock(line, directive, config?)` | `LayoutBlock` |
| `createGridLayout(line, columns, gap, config?)` | `GridLayout` |
| `createFlexLayout(line, direction, wrap, config?)` | `FlexLayout` |
| `createCanvas(line, width, height, infinite?)` | `Canvas` |
| `createWhiteboard(line, config?)` | `Whiteboard` |
| `createArtboard(line, name, config?)` | `Artboard` |
| `createLayer(line, name, config?)` | `Layer` |
| `createSplitView(line, direction, config?)` | `SplitView` |
| `createPresentation(line, config?)` | `Presentation` |
| `createSlide(line, layout, config?)` | `Slide` |
| `createPanel(line, title?, config?)` | `Panel` |
| `createComponentUse(line, componentName, propsString?)` | `ComponentUse` |
| `createComponentDef(line, name, params?)` | `ComponentDef` |
| `createSlotDef(line, slotName)` | `SlotDef` |
| `createSlotOutlet(line, slotName)` | `SlotOutlet` |
| `createTemplateDef(line, name, params?)` | `TemplateDef` |
| `createMacroDef(line, name, params?)` | `MacroDef` |
| `createAnimation(line, name, timing, config?)` | `Animation` |
| `createKeyframe(offset, properties)` | `Keyframe` |

---

## 15. InlineParser

```js
import { InlineParser } from './js/parser/ast.js';

paragraph.inline = InlineParser.parse(paragraph.text, paragraph.flags);
heading.inline   = InlineParser.parse(heading.text,   heading.flags);
```

### Parsing precedence

1. Bold-italic `***` / `___`
2. Bold `**` / `__`
3. Italic `*` / `_`
4. Code span `` ` `` — no inner parsing
5. Math `$` — no inner parsing
6. Highlight `==`
7. Strikethrough `~~`
8. Subscript `~`
9. Superscript `^`
10. Underline `<u>…</u>`
11. Image `![`
12. Footnote ref `[^`
13. Link `[`
14. Mention `@`
15. Emoji `:name:`
16. Variable ref `{$`

**Fast path:** if `flags === 0`, the whole string becomes one `TextNode` without scanning.

---

## 16. MathASTBuilder

```js
import { MathASTBuilder } from './js/parser/ast.js';

const tree = MathASTBuilder.parse('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
// Frac { children: [ Sequence[Symbol(±), Sqrt(...)], Sequence[Num(2), Var(a)] ] }
```

**Two phases:** tokenise → recursive descent parse.

| Input | Output |
|-------|--------|
| `\frac{a}{b}` | `Frac [a, b]` |
| `\sqrt{x}` | `Sqrt [x]` |
| `x^{n}` | `Power [x, n]` |
| `x_{i}` | `Sub [x, i]` |
| `\sum_{i=1}^{n}` | `Sum [Sub(i,1), n]` |
| `\int_{0}^{\infty}` | `Integral [0, ∞]` |
| `\lim_{x \to 0}` | `Limit [x→0]` |
| `\begin{pmatrix}…\end{pmatrix}` | `Matrix [rows]` |
| `\begin{cases}…\end{cases}` | `Cases [rows]` |
| `\left(\right)` | `Delim` open=( close=) |
| `\ce{H2O}` | `ChemFormula` |
| `\alpha`, `\beta`, … | `Symbol` + unicode |

---

## 17. ID Generation

```js
_id('h')  // → 'h1', 'h2', 'h3' …
_id('mb') // → 'mb4', 'mb5' …
_id()     // → 'z6', 'z7' … (generic fallback)

ASTFactory.resetIdCounter(); // Reset to 0 — tests only
```

### Prefix table

| Prefix | Types |
|--------|-------|
| `h` | Heading |
| `p` | Paragraph |
| `q` | Quote |
| `cl` | Callout |
| `cb` | CodeBlock |
| `t` | Table |
| `l`, `li`, `ol` | List, ListItem, OrderedListItem |
| `dl`, `di` | DefinitionList, DefinitionItem |
| `em` | Embed |
| `fn` | Footnote |
| `co`, `c` | ColumnLayout, Column |
| `ad` | Admonition |
| `tg`, `tb` | TabGroup, Tab |
| `ac` | Accordion |
| `cd`, `cg` | Card, CardGroup |
| `st`, `sp` | Steps, Step |
| `dt` | Details |
| `mb` | MathBlock |
| `eq` | MathEquation |
| `me` | MathEnvironment |
| `dg` | Diagram |
| `sh` | Shape |
| `eg` | Edge |
| `ch` | Chart |
| `gr`, `gn`, `ge`, `sg` | Graph sub-nodes |
| `sq`, `sa`, `sm`, `sn` | Sequence sub-nodes |
| `fsm` | StateMachine |
| `erd` | ERDiagram |
| `mm`, `mn` | Mindmap, MindmapNode |
| `gn`, `gs`, `gt` | Gantt sub-nodes |
| `tl`, `tp`, `te` | Timeline sub-nodes |
| `vs`, `vg`, `vl`, `ab` | Vector scene/group/layer/artboard |
| `vsh`, `vp`, `vt`, `vc` | Vector shapes |
| `lb`, `gl`, `fl`, `cv`, `wb` | Layout nodes |
| `sv`, `pr`, `sl`, `pn` | SplitView, Presentation, Slide, Panel |
| `cu`, `cdf`, `sd`, `so` | Component nodes |
| `tdf`, `mdf` | Template/Macro defs |
| `an` | Animation |
| `z` | Generic fallback |

---

## 18. Node Shape Rules

1. **Always use `ASTFactory`** — never construct raw objects.
2. **Never add keys after creation** — declare all fields null in the factory.
3. **Never delete keys** — use `null` sentinels.
4. **Array fields are always `[]`** — never `null`.
5. **`id` is always a non-empty string** — from `_id()`.
6. **`line` is always a non-negative integer** — use `0` if unknown.
7. **`inline` is `null` until `InlineParser` runs** — check `node.inline != null`.
8. **`ast` is `null` until `MathASTBuilder` runs** — same lazy pattern.
9. **No `meta` for known properties** — use explicit typed keys.

---

## 19. Developer JSON Examples

### Heading

```json
{
  "type": "Heading", "id": "newtons-laws", "line": 1,
  "level": 1, "text": "Newton's Laws of Motion",
  "anchor": "newtons-laws", "classes": [], "attrs": {},
  "inline": [{ "type": "text", "text": "Newton's Laws of Motion" }],
  "flags": 0
}
```

### MathBlock

```json
{
  "type": "MathBlock", "id": "mb1", "line": 14,
  "config": "name=\"Newton's Second Law\" label=\"eq:f=ma\"",
  "content": "\\mathbf{F} = m\\mathbf{a}",
  "env": "equation", "display": "block",
  "numbered": true, "label": "eq:f=ma", "number": 1,
  "title": "Newton's Second Law",
  "ast": {
    "type": "Sequence",
    "children": [
      { "type": "Var", "name": "F" },
      { "type": "Op",  "op":  "=" },
      { "type": "Var", "name": "m" },
      { "type": "Var", "name": "a" }
    ]
  }
}
```

### Diagram (flowchart)

```json
{
  "type": "Diagram", "id": "dg1", "line": 22,
  "diagramType": "flowchart", "name": "", "dir": "LR",
  "config": "", "groups": [], "styles": {}, "theme": null, "meta": {},
  "nodes": [
    { "type": "GraphNode", "id": "Start",    "line": 23, "label": "Start",     "kind": "Rectangle", "cssClass": null,      "x": 0, "y": 0, "meta": {} },
    { "type": "GraphNode", "id": "Decision", "line": 24, "label": "Decision",  "kind": "Diamond",   "cssClass": null,      "x": 0, "y": 0, "meta": {} },
    { "type": "GraphNode", "id": "ProcessA", "line": 25, "label": "Process A", "kind": "Rectangle", "cssClass": "primary", "x": 0, "y": 0, "meta": {} }
  ],
  "edges": [
    { "type": "GraphEdge", "id": "ge1", "line": 23, "fromId": "Start",    "toId": "Decision", "operator": "-->", "edgeLabel": null,  "style": null },
    { "type": "GraphEdge", "id": "ge2", "line": 24, "fromId": "Decision", "toId": "ProcessA", "operator": "-->", "edgeLabel": "Yes", "style": null }
  ]
}
```

### Card

```json
{
  "type": "Card", "id": "cd1", "line": 40,
  "title": "Law 1 · Inertia", "icon": null,
  "variant": "outline", "href": null,
  "children": [
    {
      "type": "Paragraph", "id": "p2", "line": 41,
      "text": "Objects resist change in motion.",
      "inline": [{ "type": "text", "text": "Objects resist change in motion." }],
      "flags": 0
    }
  ]
}
```

### ComponentUse

```json
{
  "type": "ComponentUse", "id": "cu1", "line": 55,
  "componentName": "UserCard",
  "propsString": "name=\"Alice\" role=\"Admin\"",
  "parsedProps": { "name": "Alice", "role": "Admin" },
  "slots": {}, "children": []
}
```

### VectorShape

```json
{
  "type": "VectorShape", "id": "vsh1", "line": 12,
  "vectorType": "circle",
  "vectorData": "cx=100 cy=100 r=50 fill=#6366f1",
  "fill": "#6366f1", "stroke": null, "strokeWidth": null,
  "opacity": null, "transform": null, "classes": [],
  "attributes": { "cx": 100, "cy": 100, "r": 50 }
}
```

---

*Canonical AST reference for Zolto v8.1.0.*
*Source: `js/parser/ast.js` · Syntax: `zolto/specs/syntax.md` · Regenerate: `npm run docs`*
