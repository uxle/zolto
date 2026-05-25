/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE COMPILER — AST DEFINITIONS
 * Version: 8.0.0 (Infinity Architecture · Unified Spatial AST)
 *
 * Architecture Highlights:
 *  · Strict Monomorphic Object Shapes per node type (V8 Hidden Class guarantee)
 *  · Deeply Frozen Enums — zero runtime de-optimisation
 *  · 6-Domain Coverage: Markdown · Math · Diagrams · Vectors · Layouts · Components
 *  · InlineParser  — single-pass O(n) rich-text → inline AST
 *  · MathASTBuilder — semantic math tree with LaTeX-compatible notation
 *  · Backward-compatible with parser-core.js v7 API surface
 * =========================================================================================
 */

'use strict';

/* =========================================================================================
   §1  NODE TYPE REGISTRY
   ========================================================================================= */

export const ZOLTONodeTypes = Object.freeze({

    // ── CORE DOCUMENT ──────────────────────────────────────────────────────────────────
    DOCUMENT:             'Document',
    FRONTMATTER:          'Frontmatter',
    COMMENT:              'Comment',
    IMPORT:               'Import',
    VARIABLE:             'Variable',
    THEME_TOKEN:          'ThemeToken',

    // ── §1  RICH MARKDOWN & TYPOGRAPHY ─────────────────────────────────────────────────
    HEADING:              'Heading',
    PARAGRAPH:            'Paragraph',
    HORIZONTAL_RULE:      'HorizontalRule',
    QUOTE:                'Quote',
    CALLOUT:              'Callout',
    CODE_BLOCK:           'CodeBlock',
    TABLE:                'Table',
    TABLE_CELL:           'TableCell',
    LIST:                 'List',
    LIST_ITEM:            'ListItem',
    CHECKLIST_ITEM:       'ChecklistItem',
    ORDERED_LIST:         'OrderedList',
    ORDERED_LIST_ITEM:    'OrderedListItem',
    DEFINITION_LIST:      'DefinitionList',
    DEFINITION_ITEM:      'DefinitionItem',
    FOOTNOTE:             'Footnote',
    FOOTNOTE_REF:         'FootnoteRef',
    REFERENCE:            'Reference',
    EMBED:                'Embed',
    COLUMN_LAYOUT:        'ColumnLayout',
    COLUMN:               'Column',

    // Extended documentation structures
    ADMONITION:           'Admonition',
    TAB_GROUP:            'TabGroup',
    TAB:                  'Tab',
    ACCORDION:            'Accordion',
    ACCORDION_ITEM:       'AccordionItem',
    CARD:                 'Card',
    CARD_GROUP:           'CardGroup',
    STEPS:                'Steps',
    STEP:                 'Step',
    BADGE:                'Badge',
    CALLOUT_BLOCK:        'CalloutBlock',
    DETAILS:              'Details',

    // ── §2  ADVANCED MATHEMATICS ───────────────────────────────────────────────────────
    MATH_BLOCK:           'MathBlock',
    MATH_INLINE:          'MathInline',
    MATH_EQUATION:        'MathEquation',
    MATH_ENVIRONMENT:     'MathEnvironment',
    MATH_DISPLAY:         'MathDisplay',

    // ── §3  DIAGRAMMING & SPATIAL GRAPHS ─────────────────────────────────────────────
    DIAGRAM:              'Diagram',            // Generic diagram container
    SHAPE:                'Shape',              // Legacy spatial shape
    EDGE:                 'Edge',               // Legacy spatial edge
    PORT_DEF:             'PortDef',
    CHART:                'Chart',              // Inline single-line chart

    // Flowchart / Graph
    GRAPH:                'Graph',
    GRAPH_NODE:           'GraphNode',
    GRAPH_EDGE:           'GraphEdge',
    GRAPH_SUBGRAPH:       'GraphSubgraph',

    // Sequence Diagram
    SEQUENCE:             'Sequence',
    SEQUENCE_ACTOR:       'SequenceActor',
    SEQUENCE_MESSAGE:     'SequenceMessage',
    SEQUENCE_NOTE:        'SequenceNote',
    SEQUENCE_GROUP:       'SequenceGroup',     // loop, alt, opt, par

    // State Machine
    STATE_MACHINE:        'StateMachine',
    STATE_NODE:           'StateNode',
    STATE_TRANSITION:     'StateTransition',
    STATE_NOTE:           'StateNote',

    // ER Diagram
    ER_DIAGRAM:           'ERDiagram',
    ER_ENTITY:            'EREntity',
    ER_ATTRIBUTE:         'ERAttribute',
    ER_RELATION:          'ERRelation',

    // Mindmap & Tree
    MINDMAP:              'Mindmap',
    MINDMAP_NODE:         'MindmapNode',
    TREE_BRANCH:          'TreeBranch',

    // Gantt & Timeline
    GANTT:                'Gantt',
    GANTT_SECTION:        'GanttSection',
    GANTT_TASK:           'GanttTask',
    TIMELINE:             'Timeline',
    TIMELINE_PERIOD:      'TimelinePeriod',
    TIMELINE_EVENT:       'TimelineEvent',

    // ── §4  NATIVE VECTOR & GRAPHICS ─────────────────────────────────────────────────
    VECTOR_SCENE:         'VectorScene',
    VECTOR_GROUP:         'VectorGroup',
    VECTOR_LAYER:         'VectorLayer',
    VECTOR_ARTBOARD:      'VectorArtboard',
    VECTOR_SHAPE:         'VectorShape',
    VECTOR_PATH:          'VectorPath',
    VECTOR_TEXT:          'VectorText',
    VECTOR_IMAGE:         'VectorImage',
    VECTOR_CONNECTOR:     'VectorConnector',
    VECTOR_CONSTRAINT:    'VectorConstraint',
    VECTOR_CAMERA:        'VectorCamera',

    // ── §5  SPATIAL LAYOUT SYSTEM ─────────────────────────────────────────────────────
    LAYOUT_BLOCK:         'LayoutBlock',
    GRID_LAYOUT:          'GridLayout',
    FLEX_LAYOUT:          'FlexLayout',
    MASONRY_LAYOUT:       'MasonryLayout',
    ABSOLUTE_LAYOUT:      'AbsoluteLayout',
    CANVAS:               'Canvas',
    WHITEBOARD:           'Whiteboard',
    ARTBOARD:             'Artboard',
    LAYER:                'Layer',
    SPLIT_VIEW:           'SplitView',
    PRESENTATION:         'Presentation',
    SLIDE:                'Slide',
    PANEL:                'Panel',

    // ── §6  COMPONENT & TEMPLATE SYSTEM ──────────────────────────────────────────────
    COMPONENT_USE:        'ComponentUse',
    COMPONENT_DEF:        'ComponentDef',
    SLOT_DEF:             'SlotDef',
    SLOT_OUTLET:          'SlotOutlet',
    TEMPLATE_DEF:         'TemplateDef',
    MACRO_DEF:            'MacroDef',
    MACRO_CALL:           'MacroCall',
    ANIMATION:            'Animation',
    KEYFRAME:             'Keyframe',
});

/* =========================================================================================
   §2  INLINE NODE TYPE REGISTRY
   Used by InlineParser to build rich text trees from paragraph content.
   ========================================================================================= */

export const ZOLTOInlineTypes = Object.freeze({
    TEXT:           'text',         // Plain text run
    BOLD:           'bold',         // **text** | __text__
    ITALIC:         'italic',       // *text* | _text_
    BOLD_ITALIC:    'boldItalic',   // ***text*** | ___text___
    CODE:           'code',         // `code`
    MATH:           'math',         // $expr$
    LINK:           'link',         // [label](url "title")
    IMAGE:          'image',        // ![alt](src "title")
    FOOTNOTE_REF:   'footnoteRef',  // [^id]
    HIGHLIGHT:      'highlight',    // ==text==
    STRIKETHROUGH:  'strikethrough',// ~~text~~
    SUPERSCRIPT:    'superscript',  // ^text^
    SUBSCRIPT:      'subscript',    // ~text~
    UNDERLINE:      'underline',    // <u>text</u>
    MENTION:        'mention',      // @username
    HASHTAG:        'hashtag',      // #tag
    EMOJI:          'emoji',        // :name:
    VARIABLE_REF:   'variableRef',  // {$name}
    ABBR:           'abbr',         // abbreviation
    RAW_HTML:       'rawHtml',      // <tag>
    LINE_BREAK:     'lineBreak',    // explicit \n or two trailing spaces
    SOFT_BREAK:     'softBreak',    // single newline in source
    COLOR:          'color',        // color(#hex) inline
    SMART_QUOTE:    'smartQuote',   // typographic quotes
});

/* =========================================================================================
   §3  MATH NODE TYPES — Semantic Math AST
   ========================================================================================= */

export const ZOLTOMathTypes = Object.freeze({
    // Atoms
    NUM:        'Num',          // number literal
    VAR:        'Var',          // variable / identifier
    SYMBOL:     'Symbol',       // named symbol (alpha, beta, pi …)
    OP:         'Op',           // operator (+, -, *, /, =, …)
    TEXT:       'Text',         // \text{…}
    SPACE:      'Space',        // explicit space

    // Structures
    FRAC:       'Frac',         // \frac{num}{den}
    SQRT:       'Sqrt',         // \sqrt[n]{x}
    POWER:      'Power',        // x^{n}
    SUB:        'Sub',          // x_{i}
    SUBSUP:     'SubSup',       // x_{i}^{n}

    // Big operators
    SUM:        'Sum',          // \sum_{lo}^{hi}
    PROD:       'Prod',         // \prod_{lo}^{hi}
    INTEGRAL:   'Integral',     // \int_{lo}^{hi}
    LIMIT:      'Limit',        // \lim_{x→0}

    // Collections
    MATRIX:     'Matrix',       // \begin{matrix}…\end{matrix}
    CASES:      'Cases',        // \begin{cases}…\end{cases}
    ALIGN:      'Align',        // \begin{align}…\end{align}
    ROW:        'Row',          // row inside matrix/align
    CELL:       'Cell',         // cell inside row

    // Delimiters
    DELIM:      'Delim',        // (…), […], {…}, |…|
    OVER:       'Over',         // \overbrace, \overline
    UNDER:      'Under',        // \underbrace, \underline

    // Chemistry
    CHEM_FORMULA:   'ChemFormula',  // H₂O
    CHEM_REACTION:  'ChemReaction', // A + B → C

    // Root expression
    EXPR:       'Expr',         // generic expression container
    SEQUENCE:   'Sequence',     // sequence of math nodes
});

/* =========================================================================================
   §4  SHAPE TYPES — Expanded
   ========================================================================================= */

export const ZOLTOShapeTypes = Object.freeze({
    // Basic geometry
    RECTANGLE:      'Rectangle',
    CIRCLE:         'Circle',
    ELLIPSE:        'Ellipse',
    PILL:           'Pill',
    DIAMOND:        'Diamond',
    HEXAGON:        'Hexagon',
    PENTAGON:       'Pentagon',
    PARALLELOGRAM:  'Parallelogram',
    TRAPEZOID:      'Trapezoid',
    TRIANGLE:       'Triangle',
    STAR:           'Star',
    CROSS:          'Cross',
    ARROW:          'Arrow',

    // System & architecture
    DATABASE:       'Database',
    CYLINDER:       'Cylinder',
    CLOUD:          'Cloud',
    ACTOR:          'Actor',
    NOTE:           'Note',
    FOLDER:         'Folder',
    COMPONENT:      'Component',
    INTERFACE:      'Interface',
    PACKAGE:        'Package',
    MODULE:         'Module',
    SERVER:         'Server',
    QUEUE:          'Queue',
    CACHE:          'Cache',
    GATEWAY:        'Gateway',
    LOAD_BALANCER:  'LoadBalancer',

    // UML
    CLASS:          'Class',
    USE_CASE:       'UseCase',
    BOUNDARY:       'Boundary',
    CONTROLLER:     'Controller',
    ENTITY:         'Entity',
    OBJECT:         'Object',

    // Flow
    START:          'Start',
    END:            'End',
    DECISION:       'Decision',
    PROCESS:        'Process',
    SUBPROCESS:     'Subprocess',
    DELAY:          'Delay',
    MANUAL:         'Manual',
    DOCUMENT:       'Document',
    MULTI_DOC:      'MultiDoc',
    PREP:           'Preparation',
    TERMINATOR:     'Terminator',

    // Subroutine / special
    SUBROUTINE:     'Subroutine',
    STADIUM:        'Stadium',
    ASYMM:          'Asymm',
    PLAIN:          'Plain',
});

/* =========================================================================================
   §5  EDGE OPERATORS — Expanded
   ========================================================================================= */

export const ZOLTOEdgeOperators = Object.freeze({
    // Directed
    SOLID_ARROW:        '-->',
    THICK_ARROW:        '==>',
    DOTTED_ARROW:       '-.->',
    WAVY_ARROW:         '~~>',
    OPEN_ARROW:         '->',
    DASHED_ARROW:       '.->',

    // Undirected / bidirectional
    SOLID_LINE:         '---',
    THICK_LINE:         '===',
    BIDIRECTIONAL:      '<-->',
    DOTTED_LINE:        '-.-.',
    SHORT_ARROW:        '=>',

    // Termination markers
    CROSS_END:          '--x',
    CIRCLE_END:         '--o',

    // UML / architecture
    AGGREGATION:        '<>-',
    COMPOSITION:        '*->',
    DEPENDENCY:         '..>',
    REALIZATION:        '..|>',
    INHERITANCE:        '--|>',
    ASSOCIATION:        '--',

    // Sequence diagram
    SEQ_SYNC:           '->',
    SEQ_ASYNC:          '->>',
    SEQ_RETURN:         '-->',
    SEQ_RETURN_ASYNC:   '-->>',
    SEQ_DESTROY:        '-x',
    SEQ_CREATE:         '-)',
});

/* =========================================================================================
   §6  DIAGRAM TYPES — Full coverage (supersedes ZOLTOChartTypes)
   ========================================================================================= */

export const ZOLTODiagramTypes = Object.freeze({
    // Data visualisation
    PIE:            'PIE',
    BAR:            'BAR',
    LINE:           'LINE',
    AREA:           'AREA',
    SCATTER:        'SCATTER',
    BUBBLE:         'BUBBLE',
    RADAR:          'RADAR',
    POLAR:          'POLAR',
    DONUT:          'DONUT',
    HISTOGRAM:      'HISTOGRAM',
    TREEMAP:        'TREEMAP',
    FUNNEL:         'FUNNEL',
    GAUGE:          'GAUGE',
    WATERFALL:      'WATERFALL',
    HEATMAP:        'HEATMAP',
    SANKEY:         'SANKEY',
    QUADRANT:       'QUADRANT',

    // Process & system
    FLOWCHART:      'FLOWCHART',
    SEQUENCE:       'SEQUENCE',
    GANTT:          'GANTT',
    STATE:          'STATE',
    TIMELINE:       'TIMELINE',
    PIPELINE:       'PIPELINE',
    KANBAN:         'KANBAN',
    GITGRAPH:       'GITGRAPH',

    // Architecture & data modeling
    MINDMAP:        'MINDMAP',
    ER:             'ER',
    NETWORK:        'NETWORK',
    ARCHITECTURE:   'ARCHITECTURE',
    DEPENDENCY:     'DEPENDENCY',
    TREE:           'TREE',
    LOGIC:          'LOGIC',
    GRAPH:          'GRAPH',
});

/** Backward-compatible alias */
export const ZOLTOChartTypes = ZOLTODiagramTypes;

/* =========================================================================================
   §7  VECTOR TYPES — Expanded
   ========================================================================================= */

export const ZOLTOVectorTypes = Object.freeze({
    PATH:       'path',
    CIRCLE:     'circle',
    ELLIPSE:    'ellipse',
    RECT:       'rect',
    POLYGON:    'polygon',
    POLYLINE:   'polyline',
    LINE:       'line',
    TEXT:       'text',
    IMAGE:      'image',
    ARC:        'arc',
    BEZIER:     'bezier',
    SPLINE:     'spline',
    STAR:       'star',
    ARROW:      'arrow',
    GROUP:      'group',
    SYMBOL:     'symbol',
    USE:        'use',
    CLIP_PATH:  'clipPath',
    MASK:       'mask',
    GRADIENT:   'gradient',
    FILTER:     'filter',
});

/* =========================================================================================
   §8  LAYOUT TYPES — Spatial directive names
   ========================================================================================= */

export const ZOLTOLayoutTypes = Object.freeze({
    // Flex
    FLEX_ROW:           'flex-row',
    FLEX_COL:           'flex-col',
    FLEX_ROW_WRAP:      'flex-row-wrap',
    FLEX_CENTER:        'flex-center',

    // Grid
    GRID:               'grid',
    GRID_2:             'grid-2',
    GRID_3:             'grid-3',
    GRID_4:             'grid-4',
    GRID_AUTO:          'grid-auto',
    MASONRY:            'masonry',

    // Columns (multi-col text flow)
    COLUMNS_2:          'columns-2',
    COLUMNS_3:          'columns-3',
    COLUMNS_4:          'columns-4',

    // Positioning
    ABSOLUTE:           'absolute',
    RELATIVE:           'relative',
    STICKY:             'sticky',

    // Special modes
    CANVAS:             'canvas',
    WHITEBOARD:         'whiteboard',
    PRESENTATION:       'presentation',
    SPLIT:              'split',
    SPLIT_VERTICAL:     'split-vertical',

    // Containers
    PANEL:              'panel',
    SIDEBAR:            'sidebar',
    MODAL:              'modal',
    DRAWER:             'drawer',
    POPOVER:            'popover',
    TOOLTIP:            'tooltip',
});

/* =========================================================================================
   §9  CALLOUT & BLOCK TYPES
   ========================================================================================= */

export const ZOLTOCalloutTypes = Object.freeze({
    NOTE:       'note',
    TIP:        'tip',
    INFO:       'info',
    WARNING:    'warning',
    DANGER:     'danger',
    CAUTION:    'caution',
    IMPORTANT:  'important',
    SUCCESS:    'success',
    CHECK:      'check',
    BUG:        'bug',
    EXAMPLE:    'example',
    QUOTE:      'quote',
    ABSTRACT:   'abstract',
    TODO:       'todo',
    QUESTION:   'question',
    FAILURE:    'failure',
    SEEALSO:    'seealso',
    SUMMARY:    'summary',
    HINT:       'hint',
    ATTENTION:  'attention',
});

export const ZOLTOMDBlockTypes = Object.freeze({
    // Admonitions (same as callouts)
    ...ZOLTOCalloutTypes,

    // UI components
    CARD:       'card',
    TAB:        'tab',
    ACCORDION:  'accordion',
    STEPS:      'steps',
    DETAILS:    'details',
    SPOILER:    'spoiler',
    CALLOUT:    'callout',

    // Layout
    COLUMN:     'column',
    SECTION:    'section',
    ASIDE:      'aside',
    HERO:       'hero',
    BANNER:     'banner',
    FOOTER:     'footer',

    // Interactive
    QUIZ:       'quiz',
    EXERCISE:   'exercise',
    SOLUTION:   'solution',
    DEMO:       'demo',

    // Docs-specific
    API:        'api',
    PARAM:      'param',
    RETURN:     'return',
    THROWS:     'throws',
    SINCE:      'since',
    DEPRECATED: 'deprecated',
    EXPERIMENTAL: 'experimental',
});

/* =========================================================================================
   §10  ID GENERATOR — Counter-based, faster than Math.random
   ========================================================================================= */

let _idCtr = 0;

/**
 * Generate a unique short ID with an optional prefix.
 * Produces 'h1a', 'h1b', … — deterministic and collision-free per session.
 * @param {string} [prefix='z']
 * @returns {string}
 */
const _id = (prefix = 'z') => `${prefix}${(++_idCtr).toString(36)}`;

/* =========================================================================================
   §11  AST FACTORY
   Each factory method creates objects with properties in a FIXED ORDER to guarantee
   a single V8 Hidden Class per node type. Never add conditional properties.
   ========================================================================================= */

export class ASTFactory {

    /** Reset the ID counter (useful for deterministic tests). */
    static resetIdCounter() { _idCtr = 0; }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       CORE DOCUMENT
    ───────────────────────────────────────────────────────────────────────────────────── */

    /**
     * Root document node — the single output of the compiler pipeline.
     * Extended with cross-document indices for math, footnotes, references.
     */
    static createDocument() {
        return {
            type:        ZOLTONodeTypes.DOCUMENT,
            version:     '8.0.0',
            frontmatter: null,
            nodes:       [],        // Primary content nodes
            edges:       [],        // Global diagram edges
            components:  [],        // Registered component definitions
            vectors:     [],        // Global vector elements
            mathIndex:   {},        // label → equation number (auto-numbered)
            footnotes:   {},        // id → FootnoteRef nodes
            references:  {},        // id → url
            variables:   {},        // name → value
            imports:     [],        // Import nodes
            meta:        {}         // Runtime / renderer metadata
        };
    }

    static createFrontmatter(line, configString) {
        return {
            type:       ZOLTONodeTypes.FRONTMATTER,
            line:       line,
            rawConfig:  configString || '',
            parsedMeta: {}          // Populated by YAML/TOML pipeline stage
        };
    }

    static createComment(line, text) {
        return {
            type: ZOLTONodeTypes.COMMENT,
            line: line,
            text: text || ''
        };
    }

    static createImport(line, url, alias) {
        return {
            type:  ZOLTONodeTypes.IMPORT,
            line:  line,
            url:   url  || '',
            alias: alias || null
        };
    }

    static createVariable(line, key, value) {
        return {
            type:  ZOLTONodeTypes.VARIABLE,
            line:  line,
            key:   key   || '',
            value: value || ''
        };
    }

    static createThemeToken(line, key, value) {
        return {
            type:  ZOLTONodeTypes.THEME_TOKEN,
            line:  line,
            key:   key   || '',
            value: value || ''
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §1  RICH MARKDOWN & TYPOGRAPHY
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createHeading(line, level, text, config) {
        const safeText = text || '';
        // Derive a slug anchor from config or text
        const anchor  = (config && config.id)
            ? config.id
            : safeText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 64) || _id('h');
        return {
            type:     ZOLTONodeTypes.HEADING,
            id:       anchor,
            line:     line,
            level:    level || 1,
            text:     safeText,
            anchor:   anchor,
            classes:  (config && config.class)  ? config.class.split(/\s+/)  : [],
            attrs:    (config && config.attrs)  ? config.attrs  : {},
            inline:   null,         // Populated by InlineParser on demand
            flags:    0             // InlineFlags bitmask (from tokenizer)
        };
    }

    static createParagraph(line, text) {
        return {
            type:   ZOLTONodeTypes.PARAGRAPH,
            id:     _id('p'),
            line:   line,
            text:   text || '',
            inline: null,           // Populated by InlineParser
            flags:  0
        };
    }

    static createHorizontalRule(line) {
        return {
            type: ZOLTONodeTypes.HORIZONTAL_RULE,
            line: line
        };
    }

    static createQuote(line, text) {
        return {
            type:     ZOLTONodeTypes.QUOTE,
            id:       _id('q'),
            line:     line,
            text:     text || '',
            inline:   null,
            flags:    0,
            children: []            // Nested block content
        };
    }

    static createCallout(line, calloutType, title, children) {
        return {
            type:        ZOLTONodeTypes.CALLOUT,
            id:          _id('cl'),
            line:        line,
            calloutType: calloutType || ZOLTOCalloutTypes.NOTE,
            title:       title    || '',
            children:    children || []
        };
    }

    static createCodeBlock(line, lang, config, content) {
        return {
            type:     ZOLTONodeTypes.CODE_BLOCK,
            id:       _id('cb'),
            line:     line,
            lang:     lang    || 'text',
            language: lang    || 'text',    // Alias for renderer compat
            config:   config  || '',
            content:  content || '',
            meta:     {}
        };
    }

    static createTable(line) {
        return {
            type:       ZOLTONodeTypes.TABLE,
            id:         _id('t'),
            line:       line,
            caption:    null,
            headers:    [],         // string[] or InlineNode[][]
            rows:       [],         // string[][] or InlineNode[][][]
            alignments: [],         // 'left' | 'center' | 'right'
            widths:     [],         // optional column width hints
            meta:       {}
        };
    }

    static createList(line, isOrdered = false) {
        return {
            type:      isOrdered ? ZOLTONodeTypes.ORDERED_LIST : ZOLTONodeTypes.LIST,
            id:        _id('l'),
            line:      line,
            isOrdered: isOrdered,
            tight:     true,        // Tight list (no paragraph wrapping)
            items:     []
        };
    }

    static createListItem(line, indent, bullet, text, isChecklist = false, checked = false) {
        return {
            type:     isChecklist ? ZOLTONodeTypes.CHECKLIST_ITEM : ZOLTONodeTypes.LIST_ITEM,
            id:       _id('li'),
            line:     line,
            indent:   indent  || 0,
            bullet:   bullet  || '-',
            text:     text    || '',
            checked:  checked,
            modifier: null,         // Extended checklist state: '?', '!', 'o', etc.
            inline:   null,
            flags:    0,
            children: []            // Nested list items
        };
    }

    static createOrderedListItem(line, indent, number, marker, text) {
        return {
            type:     ZOLTONodeTypes.ORDERED_LIST_ITEM,
            id:       _id('ol'),
            line:     line,
            indent:   indent  || 0,
            number:   number  || 1,
            marker:   marker  || '.',   // '.' | ')' | ':'
            text:     text    || '',
            inline:   null,
            flags:    0,
            children: []
        };
    }

    static createDefinitionList(line) {
        return {
            type:  ZOLTONodeTypes.DEFINITION_LIST,
            id:    _id('dl'),
            line:  line,
            items: []
        };
    }

    static createDefinitionItem(line, term, definition) {
        return {
            type:       ZOLTONodeTypes.DEFINITION_ITEM,
            id:         _id('di'),
            line:       line,
            term:       term       || '',
            definition: definition || '',
            termInline: null,
            defInline:  null
        };
    }

    static createEmbed(line, embedType, label, url, config) {
        return {
            type:      ZOLTONodeTypes.EMBED,
            id:        _id('em'),
            line:      line,
            embedType: embedType || 'image',
            label:     label    || '',
            url:       url      || '',
            alt:       label    || '',
            title:     null,
            width:     null,
            height:    null,
            config:    config   || null,
            meta:      {}
        };
    }

    static createFootnote(line, id, content) {
        return {
            type:    ZOLTONodeTypes.FOOTNOTE,
            id:      id      || _id('fn'),
            line:    line,
            content: content || '',
            inline:  null,
            number:  0          // Assigned during resolution
        };
    }

    static createReference(line, id, url) {
        return {
            type: ZOLTONodeTypes.REFERENCE,
            line: line,
            id:   id  || '',
            url:  url || ''
        };
    }

    static createColumnLayout(line, count, gap) {
        return {
            type:     ZOLTONodeTypes.COLUMN_LAYOUT,
            id:       _id('co'),
            line:     line,
            count:    count || 2,
            gap:      gap   || null,
            columns:  []
        };
    }

    static createColumn(line) {
        return {
            type:     ZOLTONodeTypes.COLUMN,
            id:       _id('c'),
            line:     line,
            children: []
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       EXTENDED DOCUMENTATION BLOCKS
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createAdmonition(line, blockType, params) {
        return {
            type:      ZOLTONodeTypes.ADMONITION,
            id:        _id('ad'),
            line:      line,
            blockType: blockType || 'info',
            title:     params    || '',
            icon:      null,        // Optional icon name
            children:  []
        };
    }

    static createTabGroup(line, id) {
        return {
            type:     ZOLTONodeTypes.TAB_GROUP,
            id:       id || _id('tg'),
            line:     line,
            active:   0,            // Default active tab index
            tabs:     []
        };
    }

    static createTab(line, label, tabId) {
        return {
            type:     ZOLTONodeTypes.TAB,
            id:       tabId || _id('tb'),
            line:     line,
            label:    label || 'Tab',
            icon:     null,
            children: []
        };
    }

    static createAccordion(line, title, open) {
        return {
            type:     ZOLTONodeTypes.ACCORDION,
            id:       _id('ac'),
            line:     line,
            title:    title || '',
            open:     open  || false,
            children: []
        };
    }

    static createCard(line, title, icon, variant) {
        return {
            type:     ZOLTONodeTypes.CARD,
            id:       _id('cd'),
            line:     line,
            title:    title   || '',
            icon:     icon    || null,
            variant:  variant || 'default',
            href:     null,
            children: []
        };
    }

    static createCardGroup(line, columns) {
        return {
            type:    ZOLTONodeTypes.CARD_GROUP,
            id:      _id('cg'),
            line:    line,
            columns: columns || 3,
            cards:   []
        };
    }

    static createSteps(line) {
        return {
            type:  ZOLTONodeTypes.STEPS,
            id:    _id('st'),
            line:  line,
            items: []
        };
    }

    static createStep(line, number, title) {
        return {
            type:     ZOLTONodeTypes.STEP,
            id:       _id('sp'),
            line:     line,
            number:   number || 1,
            title:    title  || '',
            children: []
        };
    }

    static createDetails(line, summary, open) {
        return {
            type:     ZOLTONodeTypes.DETAILS,
            id:       _id('dt'),
            line:     line,
            summary:  summary || 'Details',
            open:     open    || false,
            children: []
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §2  ADVANCED MATHEMATICS
    ───────────────────────────────────────────────────────────────────────────────────── */

    /**
     * Block-level math — display mode LaTeX/Zolto math.
     */
    static createMathBlock(line, config, content) {
        return {
            type:      ZOLTONodeTypes.MATH_BLOCK,
            id:        _id('mb'),
            line:      line,
            config:    config  || '',
            content:   content || '',
            env:       'equation',  // equation|align|gather|multline|cases
            display:   'block',
            numbered:  false,
            label:     null,        // Equation label for \ref{}
            number:    0,           // Auto-assigned by pipeline
            title:     null,        // Optional math block title
            ast:       null         // Semantic math tree (MathASTBuilder)
        };
    }

    static createMathInline(text) {
        return {
            type:    ZOLTONodeTypes.MATH_INLINE,
            text:    text || '',
            display: 'inline',
            ast:     null
        };
    }

    static createMathEquation(line, label, content) {
        return {
            type:    ZOLTONodeTypes.MATH_EQUATION,
            id:      label || _id('eq'),
            line:    line,
            label:   label   || null,
            content: content || '',
            number:  0,             // Assigned during pipeline resolution
            display: 'block',
            ast:     null
        };
    }

    static createMathEnvironment(line, env, content, options) {
        return {
            type:    ZOLTONodeTypes.MATH_ENVIRONMENT,
            id:      _id('me'),
            line:    line,
            env:     env     || 'equation',
            content: content || '',
            options: options || {},
            numbered: false,
            rows:    [],
            ast:     null
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §3  DIAGRAM SYSTEM — Generic
    ───────────────────────────────────────────────────────────────────────────────────── */

    /**
     * Generic diagram container. Holds domain-specific sub-nodes.
     */
    static createDiagram(line, diagramType, name, dir, config) {
        return {
            type:        ZOLTONodeTypes.DIAGRAM,
            id:          _id('dg'),
            line:        line,
            diagramType: diagramType || ZOLTODiagramTypes.FLOWCHART,
            name:        name    || '',
            dir:         dir     || 'LR',
            config:      config  || '',
            nodes:       [],        // Diagram-internal nodes
            edges:       [],        // Diagram-internal edges
            groups:      [],        // Subgraphs / clusters
            styles:      {},        // Class definitions
            theme:       null,      // Diagram-level theme override
            meta:        {}
        };
    }

    /** Legacy connector shape — kept for parser-core.js compat */
    static createShape(line, id, label, trait, shapeType) {
        return {
            type:      ZOLTONodeTypes.SHAPE,
            id:        id || _id('sh'),
            line:      line,
            label:     label     || '',
            trait:     trait     || 'base',
            shapeType: shapeType || ZOLTOShapeTypes.RECTANGLE,
            x:         0,
            y:         0,
            w:         0,
            h:         0,
            classes:   [],
            metadata:  {}
        };
    }

    /** Legacy edge — kept for parser-core.js compat */
    static createEdge(line, operator, edgeLabel, fromId, toId, rawTarget) {
        return {
            type:      ZOLTONodeTypes.EDGE,
            id:        _id('eg'),
            line:      line,
            operator:  operator  || ZOLTOEdgeOperators.SOLID_ARROW,
            edgeLabel: edgeLabel || null,
            fromId:    fromId    || null,
            toId:      toId      || null,
            rawTarget: rawTarget || ''
        };
    }

    /** Inline single-line chart declaration */
    static createChart(line, chartType, config) {
        return {
            type:      ZOLTONodeTypes.CHART,
            id:        _id('ch'),
            line:      line,
            chartType: (chartType || 'PIE').toUpperCase(),
            config:    config  || '',
            dataset:   [],          // Renderer populates from config
            meta:      {}
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       FLOWCHART / GRAPH
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createGraph(line, dir, name) {
        return {
            type:   ZOLTONodeTypes.GRAPH,
            id:     _id('gr'),
            line:   line,
            dir:    dir  || 'LR',
            name:   name || '',
            nodes:  [],
            edges:  [],
            groups: [],
            styles: {},
            meta:   {}
        };
    }

    static createGraphNode(line, id, label, kind, cssClass) {
        return {
            type:     ZOLTONodeTypes.GRAPH_NODE,
            id:       id  || _id('gn'),
            line:     line,
            label:    label    || id || '',
            kind:     kind     || ZOLTOShapeTypes.RECT,
            cssClass: cssClass || null,
            x:        0,
            y:        0,
            meta:     {}
        };
    }

    static createGraphEdge(line, fromId, toId, operator, edgeLabel) {
        return {
            type:      ZOLTONodeTypes.GRAPH_EDGE,
            id:        _id('ge'),
            line:      line,
            fromId:    fromId    || null,
            toId:      toId      || null,
            operator:  operator  || ZOLTOEdgeOperators.SOLID_ARROW,
            edgeLabel: edgeLabel || null,
            style:     null
        };
    }

    static createGraphSubgraph(line, id, label) {
        return {
            type:     ZOLTONodeTypes.GRAPH_SUBGRAPH,
            id:       id || _id('sg'),
            line:     line,
            label:    label || '',
            nodes:    [],
            edges:    [],
            meta:     {}
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       SEQUENCE DIAGRAM
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createSequence(line, name) {
        return {
            type:    ZOLTONodeTypes.SEQUENCE,
            id:      _id('sq'),
            line:    line,
            name:    name || '',
            actors:  [],
            messages: [],
            groups:  [],
            notes:   [],
            meta:    {}
        };
    }

    static createSequenceActor(line, id, alias, kind) {
        return {
            type:   ZOLTONodeTypes.SEQUENCE_ACTOR,
            id:     id    || _id('sa'),
            line:   line,
            alias:  alias || id || '',
            kind:   kind  || 'participant',   // actor|participant|database|boundary|…
            order:  0                          // Assigned by pipeline
        };
    }

    static createSequenceMessage(line, fromId, toId, operator, text) {
        return {
            type:      ZOLTONodeTypes.SEQUENCE_MESSAGE,
            id:        _id('sm'),
            line:      line,
            fromId:    fromId    || '',
            toId:      toId      || '',
            operator:  operator  || ZOLTOEdgeOperators.SEQ_SYNC,
            text:      text      || '',
            inline:    null,
            activate:  false,
            numbered:  false,
            number:    0
        };
    }

    static createSequenceNote(line, side, actorId, text) {
        return {
            type:    ZOLTONodeTypes.SEQUENCE_NOTE,
            id:      _id('sn'),
            line:    line,
            side:    side    || 'right',  // left|right|over
            actorId: actorId || '',
            text:    text    || '',
            inline:  null
        };
    }

    static createSequenceGroup(line, kind, label) {
        return {
            type:     ZOLTONodeTypes.SEQUENCE_GROUP,
            id:       _id('sg'),
            line:     line,
            kind:     kind  || 'loop',   // loop|alt|opt|par|critical|break|rect
            label:    label || '',
            branches: [],                 // [{condition, messages}]
            children: []
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       STATE MACHINE
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createStateMachine(line, name) {
        return {
            type:        ZOLTONodeTypes.STATE_MACHINE,
            id:          _id('fsm'),
            line:        line,
            name:        name || '',
            states:      [],
            transitions: [],
            notes:       [],
            initial:     null,  // ID of initial state
            final:       [],    // IDs of final states
            meta:        {}
        };
    }

    static createStateNode(line, id, label, kind) {
        return {
            type:    ZOLTONodeTypes.STATE_NODE,
            id:      id || _id('sn'),
            line:    line,
            label:   label || id || '',
            kind:    kind  || 'normal',   // normal|start|end|fork|join|choice
            entry:   null,
            exit:    null,
            substates: []
        };
    }

    static createStateTransition(line, fromId, toId, guard, action) {
        return {
            type:    ZOLTONodeTypes.STATE_TRANSITION,
            id:      _id('st'),
            line:    line,
            fromId:  fromId || '',
            toId:    toId   || '',
            guard:   guard  || null,    // [condition]
            action:  action || null,    // /action
            event:   null
        };
    }

    static createStateNote(line, side, stateId, text) {
        return {
            type:    ZOLTONodeTypes.STATE_NOTE,
            id:      _id('snn'),
            line:    line,
            side:    side    || 'right',
            stateId: stateId || '',
            text:    text    || ''
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       ER DIAGRAM
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createERDiagram(line, name) {
        return {
            type:      ZOLTONodeTypes.ER_DIAGRAM,
            id:        _id('erd'),
            line:      line,
            name:      name || '',
            entities:  [],
            relations: [],
            meta:      {}
        };
    }

    static createEREntity(line, name) {
        return {
            type:       ZOLTONodeTypes.ER_ENTITY,
            id:         name || _id('ent'),
            line:       line,
            name:       name || '',
            attributes: []
        };
    }

    static createERAttribute(line, attrType, attrName, attrKey, comment) {
        return {
            type:       ZOLTONodeTypes.ER_ATTRIBUTE,
            line:       line,
            attrType:   attrType || 'string',
            attrName:   attrName || '',
            attrKey:    attrKey  || null,   // PK|FK|UK
            comment:    comment  || null
        };
    }

    static createERRelation(line, fromEntity, toEntity, operator, label) {
        return {
            type:       ZOLTONodeTypes.ER_RELATION,
            id:         _id('er'),
            line:       line,
            fromEntity: fromEntity || '',
            toEntity:   toEntity   || '',
            operator:   operator   || '',
            label:      label      || '',
            cardinality: null
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       MINDMAP & TREE
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createMindmap(line, root) {
        return {
            type:     ZOLTONodeTypes.MINDMAP,
            id:       _id('mm'),
            line:     line,
            root:     root    || null,
            children: [],
            theme:    null,
            layout:   'radial'    // radial|tree|compact
        };
    }

    static createMindmapNode(line, indent, bullet, text, children) {
        return {
            type:     ZOLTONodeTypes.MINDMAP_NODE,
            id:       _id('mn'),
            line:     line,
            indent:   indent   || 0,
            bullet:   bullet   || '+',
            text:     text     || '',
            inline:   null,
            children: children || []
        };
    }

    static createTreeBranch(line, prefix, text) {
        return {
            type:     ZOLTONodeTypes.TREE_BRANCH,
            id:       _id('tb'),
            line:     line,
            prefix:   prefix || '',
            text:     text   || '',
            depth:    (prefix || '').replace(/[^\s]/g, '').length,
            children: []
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       GANTT & TIMELINE
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createGantt(line, title, dateFormat) {
        return {
            type:       ZOLTONodeTypes.GANTT,
            id:         _id('gn'),
            line:       line,
            title:      title      || '',
            dateFormat: dateFormat || 'YYYY-MM-DD',
            axisFormat: null,
            sections:   [],
            meta:       {}
        };
    }

    static createGanttSection(line, text) {
        return {
            type:  ZOLTONodeTypes.GANTT_SECTION,
            id:    _id('gs'),
            line:  line,
            text:  text || '',
            tasks: []
        };
    }

    static createGanttTask(line, text, id, modifier, start, duration) {
        return {
            type:     ZOLTONodeTypes.GANTT_TASK,
            id:       id || _id('gt'),
            line:     line,
            text:     text     || '',
            modifier: modifier || null,  // crit|done|active|milestone
            start:    start    || null,
            duration: duration || null,
            end:      null,
            progress: 0
        };
    }

    static createTimeline(line, title) {
        return {
            type:    ZOLTONodeTypes.TIMELINE,
            id:      _id('tl'),
            line:    line,
            title:   title || '',
            periods: [],
            meta:    {}
        };
    }

    static createTimelinePeriod(line, period) {
        return {
            type:   ZOLTONodeTypes.TIMELINE_PERIOD,
            id:     _id('tp'),
            line:   line,
            period: period || '',
            events: []
        };
    }

    static createTimelineEvent(line, text, label) {
        return {
            type:   ZOLTONodeTypes.TIMELINE_EVENT,
            id:     _id('te'),
            line:   line,
            text:   text  || '',
            label:  label || null,
            inline: null
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §4  NATIVE VECTOR & GRAPHICS
    ───────────────────────────────────────────────────────────────────────────────────── */

    static createVectorScene(line, width, height) {
        return {
            type:    ZOLTONodeTypes.VECTOR_SCENE,
            id:      _id('vs'),
            line:    line,
            width:   width  || 800,
            height:  height || 600,
            viewBox: null,
            layers:  [],
            defs:    [],        // Gradients, filters, symbols
            meta:    {}
        };
    }

    static createVectorGroup(line, name) {
        return {
            type:      ZOLTONodeTypes.VECTOR_GROUP,
            id:        name || _id('vg'),
            line:      line,
            name:      name     || null,
            transform: null,
            opacity:   1,
            visible:   true,
            children:  [],
            attrs:     {}
        };
    }

    static createVectorLayer(line, name, kind) {
        return {
            type:     ZOLTONodeTypes.VECTOR_LAYER,
            id:       name || _id('vl'),
            line:     line,
            name:     name  || 'Layer',
            kind:     kind  || 'normal',  // front|back|above|below|canvas
            locked:   false,
            visible:  true,
            children: []
        };
    }

    static createVectorArtboard(line, name, width, height) {
        return {
            type:    ZOLTONodeTypes.VECTOR_ARTBOARD,
            id:      name || _id('ab'),
            line:    line,
            name:    name   || 'Canvas',
            width:   width  || null,
            height:  height || null,
            clip:    true,
            layers:  [],
            children: [],
            meta:    {}
        };
    }

    /**
     * Core vector primitive — all SVG shapes map here.
     * @param {string} vectorType - ZOLTOVectorTypes value
     * @param {string} vectorData - raw attribute string from tokenizer
     */
    static createVectorShape(line, vectorType, vectorData) {
        return {
            type:       ZOLTONodeTypes.VECTOR_SHAPE,
            id:         _id('vsh'),
            line:       line,
            vectorType: vectorType || ZOLTOVectorTypes.RECT,
            vectorData: vectorData || '',
            fill:       null,
            stroke:     null,
            strokeWidth: null,
            opacity:    null,
            transform:  null,
            classes:    [],
            attributes: {}
        };
    }

    static createVectorPath(line, d) {
        return {
            type:       ZOLTONodeTypes.VECTOR_PATH,
            id:         _id('vp'),
            line:       line,
            d:          d        || '',
            fill:       'none',
            stroke:     null,
            strokeWidth: 1,
            strokeLinecap: 'round',
            closed:     false,
            attributes: {}
        };
    }

    static createVectorText(line, x, y, text) {
        return {
            type:       ZOLTONodeTypes.VECTOR_TEXT,
            id:         _id('vt'),
            line:       line,
            x:          x    || 0,
            y:          y    || 0,
            text:       text || '',
            fontSize:   null,
            fontFamily: null,
            fill:       null,
            anchor:     'start',  // start|middle|end
            attributes: {}
        };
    }

    static createVectorConnector(line, fromId, toId, style) {
        return {
            type:    ZOLTONodeTypes.VECTOR_CONNECTOR,
            id:      _id('vc'),
            line:    line,
            fromId:  fromId || null,
            toId:    toId   || null,
            style:   style  || 'straight',  // straight|curved|elbow|smart
            label:   null,
            attrs:   {}
        };
    }

    static createVectorConstraint(line, raw) {
        return {
            type: ZOLTONodeTypes.VECTOR_CONSTRAINT,
            id:   _id('vco'),
            line: line,
            raw:  raw || '',
            meta: {}
        };
    }

    static createVectorCamera(line, raw) {
        return {
            type:  ZOLTONodeTypes.VECTOR_CAMERA,
            line:  line,
            x:     0,
            y:     0,
            scale: 1,
            raw:   raw || ''
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §5  SPATIAL LAYOUT SYSTEM
    ───────────────────────────────────────────────────────────────────────────────────── */

    /**
     * Generic layout block — covers @layout, @flex, @grid, @canvas, @whiteboard, etc.
     * Backward-compatible: `directive` = layout type string, `config` = raw args string.
     */
    static createLayoutBlock(line, directive, config) {
        return {
            type:      ZOLTONodeTypes.LAYOUT_BLOCK,
            id:        _id('lb'),
            line:      line,
            directive: directive || ZOLTOLayoutTypes.FLEX_COL,
            config:    config    || '',
            gap:       null,
            padding:   null,
            align:     null,
            justify:   null,
            wrap:      false,
            responsive: null,
            children:  []
        };
    }

    static createGridLayout(line, columns, gap, config) {
        return {
            type:       ZOLTONodeTypes.GRID_LAYOUT,
            id:         _id('gl'),
            line:       line,
            columns:    columns || 3,
            rows:       null,
            gap:        gap     || '1rem',
            config:     config  || '',
            autoFlow:   'row',
            children:   []
        };
    }

    static createFlexLayout(line, direction, wrap, config) {
        return {
            type:      ZOLTONodeTypes.FLEX_LAYOUT,
            id:        _id('fl'),
            line:      line,
            direction: direction || 'row',
            wrap:      wrap      || false,
            gap:       null,
            align:     null,
            justify:   null,
            config:    config    || '',
            children:  []
        };
    }

    static createCanvas(line, width, height, infinite) {
        return {
            type:     ZOLTONodeTypes.CANVAS,
            id:       _id('cv'),
            line:     line,
            width:    width    || null,
            height:   height   || null,
            infinite: infinite || true,
            zoom:     1,
            panX:     0,
            panY:     0,
            snap:     false,
            grid:     false,
            children: []
        };
    }

    static createWhiteboard(line, config) {
        return {
            type:     ZOLTONodeTypes.WHITEBOARD,
            id:       _id('wb'),
            line:     line,
            config:   config  || '',
            infinite: true,
            zoom:     1,
            children: []
        };
    }

    static createArtboard(line, name, config) {
        return {
            type:     ZOLTONodeTypes.ARTBOARD,
            id:       name || _id('ab'),
            line:     line,
            name:     name   || 'Canvas',
            config:   config || '',
            width:    null,
            height:   null,
            layers:   []
        };
    }

    static createLayer(line, name, config) {
        return {
            type:    ZOLTONodeTypes.LAYER,
            id:      name || _id('lr'),
            line:    line,
            name:    name   || 'Layer',
            config:  config || '',
            visible: true,
            locked:  false,
            nodes:   []
        };
    }

    static createSplitView(line, direction, config) {
        return {
            type:      ZOLTONodeTypes.SPLIT_VIEW,
            id:        _id('sv'),
            line:      line,
            direction: direction || 'horizontal',
            ratio:     '50/50',
            config:    config    || '',
            panes:     []
        };
    }

    static createPresentation(line, config) {
        return {
            type:   ZOLTONodeTypes.PRESENTATION,
            id:     _id('pr'),
            line:   line,
            config: config || '',
            theme:  null,
            slides: []
        };
    }

    static createSlide(line, layout, config) {
        return {
            type:     ZOLTONodeTypes.SLIDE,
            id:       _id('sl'),
            line:     line,
            layout:   layout || 'default',
            config:   config || '',
            children: []
        };
    }

    static createPanel(line, title, config) {
        return {
            type:         ZOLTONodeTypes.PANEL,
            id:           _id('pn'),
            line:         line,
            title:        title  || null,
            config:       config || '',
            collapsible:  false,
            collapsed:    false,
            resizable:    false,
            children:     []
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §6  COMPONENT & TEMPLATE SYSTEM
    ───────────────────────────────────────────────────────────────────────────────────── */

    /**
     * <ComponentName props /> — instantiation of a registered component.
     * `parsedProps` populated by the AST resolution phase.
     */
    static createComponentUse(line, componentName, propsString) {
        return {
            type:          ZOLTONodeTypes.COMPONENT_USE,
            id:            _id('cu'),
            line:          line,
            componentName: componentName || 'Fragment',
            propsString:   propsString   || '',
            parsedProps:   {},
            slots:         {},          // Named slot content
            children:      []
        };
    }

    static createComponentDef(line, name, params) {
        return {
            type:     ZOLTONodeTypes.COMPONENT_DEF,
            id:       name || _id('cdf'),
            line:     line,
            name:     name   || '',
            params:   params || [],     // [{name, type, default}]
            slots:    [],               // Named slot names
            variants: {},               // Variant definitions
            children: []
        };
    }

    static createSlotDef(line, slotName) {
        return {
            type:     ZOLTONodeTypes.SLOT_DEF,
            id:       slotName || _id('sd'),
            line:     line,
            slotName: slotName || 'default',
            fallback: null,
            children: []
        };
    }

    static createSlotOutlet(line, slotName) {
        return {
            type:     ZOLTONodeTypes.SLOT_OUTLET,
            id:       _id('so'),
            line:     line,
            slotName: slotName || 'default'
        };
    }

    static createTemplateDef(line, name, params) {
        return {
            type:     ZOLTONodeTypes.TEMPLATE_DEF,
            id:       name || _id('tdf'),
            line:     line,
            name:     name   || '',
            params:   params || [],
            children: []
        };
    }

    static createMacroDef(line, name, params) {
        return {
            type:     ZOLTONodeTypes.MACRO_DEF,
            id:       name || _id('mdf'),
            line:     line,
            name:     name   || '',
            params:   params ? params.split(',').map(p => p.trim()) : [],
            children: []
        };
    }

    static createAnimation(line, name, timing, config) {
        return {
            type:      ZOLTONodeTypes.ANIMATION,
            id:        name || _id('an'),
            line:      line,
            name:      name   || '',
            timing:    timing || 'ease',
            duration:  null,
            delay:     null,
            config:    config || '',
            keyframes: []
        };
    }

    static createKeyframe(offset, properties) {
        return {
            type:       ZOLTONodeTypes.KEYFRAME,
            offset:     offset     || 0,    // 0–100 (%)
            properties: properties || {}
        };
    }
}

/* =========================================================================================
   §12  INLINE PARSER
   Converts raw text strings into inline AST arrays.
   Single-pass O(n) scanner — no backtracking.
   ========================================================================================= */

export class InlineParser {

    /**
     * Parse a raw text string into an array of inline AST nodes.
     * @param {string} text - Raw source text
     * @param {number} [flags=0] - InlineFlags bitmask (from tokenizer, for fast-path)
     * @returns {Array} Inline AST node array
     */
    static parse(text, flags = 0) {
        if (!text) return [InlineParser._text('')];
        // Fast path: no inline content detected
        if (flags === 0 && !InlineParser._hasMarkers(text)) {
            return [InlineParser._text(text)];
        }
        return InlineParser._scan(text, 0, text.length);
    }

    /** Quick pre-check before expensive scan */
    static _hasMarkers(text) {
        return /[*_`$~^=\[@!:{<]/.test(text);
    }

    /**
     * Recursive descent scanner — builds inline nodes left-to-right.
     * @param {string} src
     * @param {number} start
     * @param {number} end
     * @returns {Array}
     */
    static _scan(src, start, end) {
        const nodes = [];
        let i = start;
        let textStart = start;

        const flushText = (to) => {
            if (to > textStart) {
                nodes.push(InlineParser._text(src.slice(textStart, to)));
            }
            textStart = to;
        };

        while (i < end) {
            const c  = src.charCodeAt(i);
            const c1 = i + 1 < end ? src.charCodeAt(i + 1) : -1;
            const c2 = i + 2 < end ? src.charCodeAt(i + 2) : -1;

            // ── Bold-italic: *** or ___
            if ((c === 42 && c1 === 42 && c2 === 42) ||
                (c === 95 && c1 === 95 && c2 === 95)) {
                const close = src.indexOf(c === 42 ? '***' : '___', i + 3);
                if (close !== -1) {
                    flushText(i);
                    const inner = InlineParser._scan(src, i + 3, close);
                    nodes.push({ type: ZOLTOInlineTypes.BOLD_ITALIC, children: inner });
                    i = textStart = close + 3; continue;
                }
            }

            // ── Bold: ** or __
            if ((c === 42 && c1 === 42 && c2 !== 42) ||
                (c === 95 && c1 === 95 && c2 !== 95)) {
                const marker = c === 42 ? '**' : '__';
                const close  = src.indexOf(marker, i + 2);
                if (close !== -1) {
                    flushText(i);
                    const inner = InlineParser._scan(src, i + 2, close);
                    nodes.push({ type: ZOLTOInlineTypes.BOLD, children: inner });
                    i = textStart = close + 2; continue;
                }
            }

            // ── Italic: * or _
            if ((c === 42 && c1 !== 42) || (c === 95 && c1 !== 95)) {
                const marker = c === 42 ? '*' : '_';
                // Avoid word-boundary issues: _ only italic between non-word chars
                const close  = src.indexOf(marker, i + 1);
                if (close !== -1 && close > i + 1) {
                    flushText(i);
                    const inner = InlineParser._scan(src, i + 1, close);
                    nodes.push({ type: ZOLTOInlineTypes.ITALIC, children: inner });
                    i = textStart = close + 1; continue;
                }
            }

            // ── Double-tick backtick `code`
            if (c === 96) {
                const ticks = c1 === 96 ? 2 : 1;
                const open  = i + ticks;
                const marker = '`'.repeat(ticks);
                const close  = src.indexOf(marker, open);
                if (close !== -1) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.CODE, text: src.slice(open, close) });
                    i = textStart = close + ticks; continue;
                }
            }

            // ── Math: $…$ (double $$ for display inline)
            if (c === 36) {
                const display = c1 === 36;
                const open    = display ? i + 2 : i + 1;
                const marker  = display ? '$$' : '$';
                const close   = src.indexOf(marker, open);
                if (close !== -1) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.MATH, text: src.slice(open, close), display });
                    i = textStart = close + (display ? 2 : 1); continue;
                }
            }

            // ── Highlight ==…==
            if (c === 61 && c1 === 61) {
                const close = src.indexOf('==', i + 2);
                if (close !== -1) {
                    flushText(i);
                    const inner = InlineParser._scan(src, i + 2, close);
                    nodes.push({ type: ZOLTOInlineTypes.HIGHLIGHT, children: inner });
                    i = textStart = close + 2; continue;
                }
            }

            // ── Strikethrough ~~…~~
            if (c === 126 && c1 === 126) {
                const close = src.indexOf('~~', i + 2);
                if (close !== -1) {
                    flushText(i);
                    const inner = InlineParser._scan(src, i + 2, close);
                    nodes.push({ type: ZOLTOInlineTypes.STRIKETHROUGH, children: inner });
                    i = textStart = close + 2; continue;
                }
            }

            // ── Subscript ~…~ (single tilde, no preceding ~)
            if (c === 126 && c1 !== 126) {
                const close = src.indexOf('~', i + 1);
                if (close !== -1 && close > i + 1) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.SUBSCRIPT, text: src.slice(i + 1, close) });
                    i = textStart = close + 1; continue;
                }
            }

            // ── Superscript ^…^
            if (c === 94) {
                const close = src.indexOf('^', i + 1);
                if (close !== -1 && close > i + 1) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.SUPERSCRIPT, text: src.slice(i + 1, close) });
                    i = textStart = close + 1; continue;
                }
            }

            // ── Underline <u>…</u>
            if (c === 60 && c1 === 117 && c2 === 62) { // <u>
                const close = src.indexOf('</u>', i + 3);
                if (close !== -1) {
                    flushText(i);
                    const inner = InlineParser._scan(src, i + 3, close);
                    nodes.push({ type: ZOLTOInlineTypes.UNDERLINE, children: inner });
                    i = textStart = close + 4; continue;
                }
            }

            // ── Inline image ![alt](url) or ![alt](url "title")
            if (c === 33 && c1 === 91) { // ![ 
                const res = InlineParser._parseLink(src, i + 1, true);
                if (res) {
                    flushText(i);
                    nodes.push(res.node);
                    i = textStart = res.end; continue;
                }
            }

            // ── Footnote ref [^id]
            if (c === 91 && c1 === 94) { // [^
                const close = src.indexOf(']', i + 2);
                if (close !== -1) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.FOOTNOTE_REF, id: src.slice(i + 2, close) });
                    i = textStart = close + 1; continue;
                }
            }

            // ── Link [label](url) or [label](url "title")
            if (c === 91) {
                const res = InlineParser._parseLink(src, i, false);
                if (res) {
                    flushText(i);
                    nodes.push(res.node);
                    i = textStart = res.end; continue;
                }
            }

            // ── Mention @user
            if (c === 64 && c1 > 64) {
                const m = src.slice(i).match(/^@([a-zA-Z0-9_]{1,50})/);
                if (m) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.MENTION, username: m[1] });
                    i = textStart = i + m[0].length; continue;
                }
            }

            // ── Emoji :name:
            if (c === 58 && c1 > 96 && c1 < 123) {
                const m = src.slice(i).match(/^:([a-z0-9_+\-]{1,40}):/);
                if (m) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.EMOJI, name: m[1] });
                    i = textStart = i + m[0].length; continue;
                }
            }

            // ── Variable ref {$name}
            if (c === 123 && c1 === 36) { // {$
                const close = src.indexOf('}', i + 2);
                if (close !== -1) {
                    flushText(i);
                    nodes.push({ type: ZOLTOInlineTypes.VARIABLE_REF, name: src.slice(i + 2, close) });
                    i = textStart = close + 1; continue;
                }
            }

            i++;
        }

        flushText(end);
        return nodes;
    }

    /**
     * Parse a link or image: [label](url "title")
     * @param {string} src
     * @param {number} i - position of '['
     * @param {boolean} isImage
     */
    static _parseLink(src, i, isImage) {
        const labelClose = src.indexOf(']', i + 1);
        if (labelClose === -1) return null;
        const afterLabel = src.charCodeAt(labelClose + 1);
        if (afterLabel !== 40) return null; // '('

        const urlOpen  = labelClose + 2;
        const urlClose = src.indexOf(')', urlOpen);
        if (urlClose === -1) return null;

        const label    = src.slice(i + 1, labelClose);
        const inner    = src.slice(urlOpen, urlClose);
        const titleM   = inner.match(/^(.*?)\s+"([^"]*)"$/);
        const url      = titleM ? titleM[1].trim() : inner.trim();
        const title    = titleM ? titleM[2]        : null;
        const nodeType = isImage ? ZOLTOInlineTypes.IMAGE : ZOLTOInlineTypes.LINK;
        const node     = isImage
            ? { type: nodeType, src: url, alt: label, title }
            : { type: nodeType, href: url, title, children: InlineParser._scan(label, 0, label.length) };

        return { node, end: urlClose + 1 };
    }

    static _text(str) {
        return { type: ZOLTOInlineTypes.TEXT, text: str };
    }
}

/* =========================================================================================
   §13  MATH AST BUILDER
   Converts Zolto/LaTeX math strings into a semantic tree.
   Provides infrastructure for renderers (KaTeX, MathJax, custom SVG).
   ========================================================================================= */

export class MathASTBuilder {

    /** Known LaTeX → Unicode symbol map */
    static SYMBOLS = Object.freeze({
        '\\alpha': 'α',   '\\beta': 'β',    '\\gamma': 'γ',   '\\delta': 'δ',
        '\\epsilon': 'ε', '\\zeta': 'ζ',    '\\eta': 'η',     '\\theta': 'θ',
        '\\iota': 'ι',    '\\kappa': 'κ',   '\\lambda': 'λ',  '\\mu': 'μ',
        '\\nu': 'ν',      '\\xi': 'ξ',      '\\pi': 'π',      '\\rho': 'ρ',
        '\\sigma': 'σ',   '\\tau': 'τ',     '\\upsilon': 'υ', '\\phi': 'φ',
        '\\chi': 'χ',     '\\psi': 'ψ',     '\\omega': 'ω',
        '\\Gamma': 'Γ',   '\\Delta': 'Δ',   '\\Theta': 'Θ',   '\\Lambda': 'Λ',
        '\\Xi': 'Ξ',      '\\Pi': 'Π',      '\\Sigma': 'Σ',   '\\Upsilon': 'Υ',
        '\\Phi': 'Φ',     '\\Psi': 'Ψ',     '\\Omega': 'Ω',
        '\\infty': '∞',   '\\sum': '∑',     '\\prod': '∏',    '\\int': '∫',
        '\\oint': '∮',    '\\partial': '∂', '\\nabla': '∇',   '\\forall': '∀',
        '\\exists': '∃',  '\\nexists': '∄', '\\in': '∈',      '\\notin': '∉',
        '\\subset': '⊂',  '\\supset': '⊃',  '\\cup': '∪',     '\\cap': '∩',
        '\\emptyset': '∅','\\pm': '±',      '\\mp': '∓',      '\\times': '×',
        '\\div': '÷',     '\\cdot': '·',    '\\leq': '≤',     '\\geq': '≥',
        '\\neq': '≠',     '\\approx': '≈',  '\\equiv': '≡',   '\\sim': '∼',
        '\\propto': '∝',  '\\perp': '⊥',    '\\parallel': '∥','\\angle': '∠',
        '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
        '\\Leftarrow': '⇐',  '\\Leftrightarrow': '⇔',
        '\\sqrt': '√',    '\\ldots': '…',   '\\cdots': '⋯',   '\\vdots': '⋮',
        '\\hbar': 'ℏ',    '\\ell': 'ℓ',     '\\Re': 'ℜ',      '\\Im': 'ℑ',
        // Physics & chemistry
        '\\degree': '°',  '\\celsius': '℃', '\\ohm': 'Ω',
    });

    /**
     * Build a semantic math AST from raw math expression string.
     * @param {string} expr
     * @returns {Object} Math AST root node
     */
    static build(expr) {
        if (!expr || typeof expr !== 'string') {
            return MathASTBuilder._node(ZOLTOMathTypes.EXPR, []);
        }
        try {
            const tokens = MathASTBuilder._tokenize(expr.trim());
            return MathASTBuilder._parseExpr(tokens, 0, tokens.length).node;
        } catch (_) {
            // Always return a valid node — degrade gracefully
            return MathASTBuilder._node(ZOLTOMathTypes.TEXT, [], { text: expr });
        }
    }

    /** Tokenize math string into atomic units */
    static _tokenize(src) {
        const tokens = [];
        let i = 0;
        while (i < src.length) {
            const c = src[i];

            // Whitespace
            if (/\s/.test(c)) { i++; continue; }

            // LaTeX command: \word or \{symbol}
            if (c === '\\') {
                const m = src.slice(i).match(/^\\([a-zA-Z]+|[^a-zA-Z])/);
                if (m) { tokens.push({ t: 'cmd', v: m[0] }); i += m[0].length; continue; }
            }

            // Number
            if (/[0-9.]/.test(c)) {
                const m = src.slice(i).match(/^[0-9]+(?:\.[0-9]+)?/);
                tokens.push({ t: 'num', v: m[0] }); i += m[0].length; continue;
            }

            // Identifier / variable
            if (/[a-zA-Z]/.test(c)) {
                tokens.push({ t: 'var', v: c }); i++; continue;
            }

            // Special single-char tokens
            if ('{}()[]'.includes(c)) { tokens.push({ t: c, v: c }); i++; continue; }
            if ('^_'.includes(c))      { tokens.push({ t: c, v: c }); i++; continue; }

            // Operator
            tokens.push({ t: 'op', v: c }); i++;
        }
        return tokens;
    }

    /** Recursive-descent expression parser */
    static _parseExpr(tokens, start, end) {
        const children = [];
        let i = start;

        while (i < end) {
            const tok = tokens[i];
            if (!tok) break;

            // ── \frac{}{} ──────────────────────────────────────────────────────────────
            if (tok.t === 'cmd' && tok.v === '\\frac') {
                const numRes = MathASTBuilder._parseGroup(tokens, i + 1, end);
                const denRes = MathASTBuilder._parseGroup(tokens, numRes.next, end);
                children.push(MathASTBuilder._node(ZOLTOMathTypes.FRAC, [numRes.node, denRes.node]));
                i = denRes.next; continue;
            }

            // ── \sqrt{} ─────────────────────────────────────────────────────────────────
            if (tok.t === 'cmd' && tok.v === '\\sqrt') {
                const innerRes = MathASTBuilder._parseGroup(tokens, i + 1, end);
                children.push(MathASTBuilder._node(ZOLTOMathTypes.SQRT, [innerRes.node]));
                i = innerRes.next; continue;
            }

            // ── \sum / \prod / \int with limits ────────────────────────────────────────
            if (tok.t === 'cmd' && ['\\sum', '\\prod', '\\int', '\\oint', '\\lim'].includes(tok.v)) {
                const kind = tok.v === '\\sum' ? ZOLTOMathTypes.SUM
                           : tok.v === '\\prod' ? ZOLTOMathTypes.PROD
                           : tok.v === '\\lim'  ? ZOLTOMathTypes.LIMIT
                           : ZOLTOMathTypes.INTEGRAL;
                let lo = null, hi = null, j = i + 1;
                if (j < end && tokens[j] && tokens[j].t === '_') {
                    const r = MathASTBuilder._parseGroup(tokens, j + 1, end);
                    lo = r.node; j = r.next;
                }
                if (j < end && tokens[j] && tokens[j].t === '^') {
                    const r = MathASTBuilder._parseGroup(tokens, j + 1, end);
                    hi = r.node; j = r.next;
                }
                children.push(MathASTBuilder._node(kind, [lo, hi].filter(Boolean), { symbol: tok.v }));
                i = j; continue;
            }

            // ── \begin{env}…\end{env} ──────────────────────────────────────────────────
            if (tok.t === 'cmd' && tok.v === '\\begin') {
                const envRes = MathASTBuilder._parseGroup(tokens, i + 1, end);
                const envName = envRes.node.text || 'matrix';
                const endIdx  = MathASTBuilder._findEnd(tokens, envRes.next, end, envName);
                const inner   = MathASTBuilder._parseExpr(tokens, envRes.next, endIdx).node;
                const matType = envName.includes('matrix') || envName === 'array'
                    ? ZOLTOMathTypes.MATRIX
                    : envName === 'cases' ? ZOLTOMathTypes.CASES : ZOLTOMathTypes.ALIGN;
                children.push(MathASTBuilder._node(matType, [inner], { env: envName }));
                i = endIdx + 2; continue; // skip \end{…}
            }

            // ── Known LaTeX command → symbol ─────────────────────────────────────────────
            if (tok.t === 'cmd') {
                const unicode = MathASTBuilder.SYMBOLS[tok.v];
                if (unicode) {
                    children.push(MathASTBuilder._node(ZOLTOMathTypes.SYMBOL, [], { symbol: tok.v, unicode }));
                } else {
                    // Unknown command — keep as-is for renderer to handle
                    children.push(MathASTBuilder._node(ZOLTOMathTypes.TEXT, [], { text: tok.v }));
                }
                i++; continue;
            }

            // ── Superscript ^ ─────────────────────────────────────────────────────────
            if (tok.t === '^' && children.length > 0) {
                const base    = children.pop();
                const supRes  = MathASTBuilder._parseGroup(tokens, i + 1, end);
                // Check for combined sub-sup: base_{lo}^{hi}
                children.push(MathASTBuilder._node(ZOLTOMathTypes.POWER, [base, supRes.node]));
                i = supRes.next; continue;
            }

            // ── Subscript _ ───────────────────────────────────────────────────────────
            if (tok.t === '_' && children.length > 0) {
                const base   = children.pop();
                const subRes = MathASTBuilder._parseGroup(tokens, i + 1, end);
                children.push(MathASTBuilder._node(ZOLTOMathTypes.SUB, [base, subRes.node]));
                i = subRes.next; continue;
            }

            // ── Grouped expression {…} ────────────────────────────────────────────────
            if (tok.t === '{') {
                const res = MathASTBuilder._parseGroup(tokens, i, end);
                children.push(res.node); i = res.next; continue;
            }

            // ── Delimiter: ( [ ────────────────────────────────────────────────────────
            if (tok.t === '(' || tok.t === '[') {
                const close = tok.t === '(' ? ')' : ']';
                const closeIdx = MathASTBuilder._findClose(tokens, i + 1, end, close);
                const inner   = MathASTBuilder._parseExpr(tokens, i + 1, closeIdx).node;
                children.push(MathASTBuilder._node(ZOLTOMathTypes.DELIM, [inner], { open: tok.v, close }));
                i = closeIdx + 1; continue;
            }

            // ── Number literal ────────────────────────────────────────────────────────
            if (tok.t === 'num') {
                children.push(MathASTBuilder._node(ZOLTOMathTypes.NUM, [], { value: tok.v }));
                i++; continue;
            }

            // ── Variable / identifier ─────────────────────────────────────────────────
            if (tok.t === 'var') {
                children.push(MathASTBuilder._node(ZOLTOMathTypes.VAR, [], { name: tok.v }));
                i++; continue;
            }

            // ── Operator ─────────────────────────────────────────────────────────────
            if (tok.t === 'op') {
                children.push(MathASTBuilder._node(ZOLTOMathTypes.OP, [], { op: tok.v }));
                i++; continue;
            }

            i++;
        }

        if (children.length === 1) return { node: children[0], next: end };
        return { node: MathASTBuilder._node(ZOLTOMathTypes.SEQUENCE, children), next: end };
    }

    /** Parse a single group: {…} or next token */
    static _parseGroup(tokens, i, end) {
        if (i >= end) return { node: MathASTBuilder._node(ZOLTOMathTypes.TEXT, [], { text: '' }), next: i };
        if (tokens[i] && tokens[i].t === '{') {
            // Find matching }
            let depth = 1, j = i + 1;
            while (j < end && depth > 0) {
                if (tokens[j].t === '{') depth++;
                if (tokens[j].t === '}') depth--;
                j++;
            }
            const res = MathASTBuilder._parseExpr(tokens, i + 1, j - 1);
            return { node: res.node, next: j };
        }
        // Single token
        const res = MathASTBuilder._parseExpr(tokens, i, i + 1);
        return { node: res.node, next: i + 1 };
    }

    /** Find closing token type in flat token list */
    static _findClose(tokens, start, end, closeChar) {
        let depth = 1;
        for (let i = start; i < end; i++) {
            if (tokens[i].v === '(' || tokens[i].v === '[') depth++;
            if (tokens[i].v === closeChar) { depth--; if (depth === 0) return i; }
        }
        return end;
    }

    /** Find \end{envName} position */
    static _findEnd(tokens, start, end, envName) {
        for (let i = start; i < end - 1; i++) {
            if (tokens[i].t === 'cmd' && tokens[i].v === '\\end') return i;
        }
        return end;
    }

    /** Create a math AST node */
    static _node(type, children = [], props = {}) {
        return Object.assign({ type, children }, props);
    }
}
