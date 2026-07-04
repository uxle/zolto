# Type Definitions

TypeScript-style types for Zolto's AST nodes and API surfaces.
All node factory functions live in `src/ast.js`.

## Document

```typescript
interface DocumentNode {
  type:     'document';
  children: Node[];
  metadata: {
    title?:      string;
    author?:     string;
    variables?:  Record<string, string>;
    references?: Map<string, RefDef>;   // Phase 2
  };
}

interface RefDef { href: string; title: string | null; }
```

## Phase 2 Block Nodes

```typescript
interface CalloutNode {
  type:        'callout';
  calloutType: string;       // note | tip | warning | important | caution | danger
  title:       string | null;
  children:    Node[];
}

interface AdmonitionNode {
  type:      'admonition';
  admonType: string;         // info | warning | tip | ... (24 types)
  title:     string | null;
  children:  Node[];
}

interface FigureNode {
  type:    'figure';
  src:     string;
  alt:     string;
  title:   string | null;
  caption: string | null;
  lazy:    boolean;
  width:   string | null;
  height:  string | null;
}

interface DefinitionListNode {
  type:  'definition_list';
  items: DefinitionItemNode[];
}

interface DefinitionItemNode {
  type: 'definition_item';
  term: string;
  defs: string[];
}

interface ReferenceDefNode {
  type:  'reference_def';
  id:    string;
  href:  string;
  title: string | null;
}
```

## Phase 2 Inline Nodes

```typescript
interface SuperscriptNode  { type: 'superscript'; children: InlineNode[]; }
interface SubscriptNode    { type: 'subscript';   children: InlineNode[]; }
interface HighlightNode    { type: 'highlight';   children: InlineNode[]; }
interface KbdNode          { type: 'kbd';         value: string; }
interface HtmlEntityNode   { type: 'html_entity'; raw: string; }
interface RefLinkNode      { type: 'ref_link';    id: string; children: InlineNode[]; }
```

## Diagnostics

```typescript
interface DiagnosticItem {
  severity: 'error' | 'warning' | 'info';
  code:     string;   // E001, W001, etc.
  message:  string;
  line:     number | null;
  col:      number | null;
  source:   string | null;
}

class Diagnostics {
  items:    DiagnosticItem[];
  errors:   DiagnosticItem[];
  warnings: DiagnosticItem[];
  infos:    DiagnosticItem[];
  error(code: string, msg: string, opts?: {line?:number}): this;
  warn(code:  string, msg: string, opts?: {line?:number}): this;
  info(code:  string, msg: string, opts?: {line?:number}): this;
  hasErrors():      boolean;
  hasWarnings():    boolean;
  toErrorStrings(): string[];
  merge(other: Diagnostics): this;
  toString(): string;
}
```
