/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE COMPILER — TOKENIZER
 * Version: 8.0.0 (Infinity Architecture · Unified Lexical Engine)
 *
 * Architecture Highlights:
 *  · V8 Monomorphic Object Shapes — single hidden class for ALL tokens (zero de-opt)
 *  · charCodeAt(0) Zero-Backtracking Router — O(1) first-char dispatch
 *  · O(n) Linear Single-Pass Scanning with pre-allocated memory arenas
 *  · Frozen REGEX cache — zero per-call RegExp allocation
 *  · Inline Bitmask Flags — O(1) renderer feature detection
 *  · Diagram Sub-Tokenizer — rich AST for flowchart/sequence/ER/state/mindmap
 *  · Full Coverage: Markdown · LaTeX Math · Diagramming · SVG/Graphics ·
 *                  Spatial Layouts · Component System · Animation · Theming
 * =========================================================================================
 */

'use strict';

/* =========================================================================================
   §1  TOKEN TYPE REGISTRY
   ========================================================================================= */

export const TokenTypes = Object.freeze({

    // ── CORE DOCUMENT ──────────────────────────────────────────────────────────────────
    BLANK:                'BLANK',
    TEXT:                 'TEXT',
    RAW_LINE:             'RAW_LINE',
    COMMENT:              'COMMENT',
    BLOCK_COMMENT_START:  'BLOCK_COMMENT_START',
    BLOCK_COMMENT_END:    'BLOCK_COMMENT_END',
    IMPORT_STMT:          'IMPORT_STMT',
    VARIABLE_DEF:         'VARIABLE_DEF',

    // ── FRONTMATTER ────────────────────────────────────────────────────────────────────
    FRONTMATTER_START:    'FRONTMATTER_START',
    FRONTMATTER_END:      'FRONTMATTER_END',

    // ── HEADINGS & TYPOGRAPHY ──────────────────────────────────────────────────────────
    HEADING:              'HEADING',
    HORIZONTAL_RULE:      'HORIZONTAL_RULE',

    // ── QUOTES & CALLOUTS ──────────────────────────────────────────────────────────────
    QUOTE:                'QUOTE',
    CALLOUT:              'CALLOUT',       // > [!NOTE], > [!WARNING], …

    // ── LISTS ──────────────────────────────────────────────────────────────────────────
    LIST_ITEM:            'LIST_ITEM',
    ORDERED_LIST_ITEM:    'ORDERED_LIST_ITEM',
    CHECKLIST_ITEM:       'CHECKLIST_ITEM',
    DEFINITION_TERM:      'DEFINITION_TERM',
    DEFINITION_DEF:       'DEFINITION_DEF',

    // ── TABLES ─────────────────────────────────────────────────────────────────────────
    TABLE_ROW:            'TABLE_ROW',
    TABLE_DIVIDER:        'TABLE_DIVIDER',

    // ── MATH ───────────────────────────────────────────────────────────────────────────
    MATH_BLOCK_START:     'MATH_BLOCK_START',
    MATH_BLOCK_END:       'MATH_BLOCK_END',
    MATH_EQUATION:        'MATH_EQUATION',  // eq [n]: E = mc²

    // ── CODE ───────────────────────────────────────────────────────────────────────────
    CODE_BLOCK_START:     'CODE_BLOCK_START',
    CODE_BLOCK_END:       'CODE_BLOCK_END',

    // ── DIAGRAMS (block-level) ─────────────────────────────────────────────────────────
    DIAGRAM_START:        'DIAGRAM_START',
    DIAGRAM_END:          'DIAGRAM_END',
    CHART:                'CHART',          // Inline single-line chart declarations

    // ── GRAPH PRIMITIVES (emitted inside diagram blocks) ───────────────────────────────
    GRAPH_NODE:           'GRAPH_NODE',
    GRAPH_EDGE:           'GRAPH_EDGE',
    GRAPH_SUBGRAPH_START: 'GRAPH_SUBGRAPH_START',
    GRAPH_SUBGRAPH_END:   'GRAPH_SUBGRAPH_END',
    GRAPH_CLASS_DEF:      'GRAPH_CLASS_DEF',
    GRAPH_STYLE:          'GRAPH_STYLE',

    // ── SEQUENCE DIAGRAM ───────────────────────────────────────────────────────────────
    SEQUENCE_ACTOR:       'SEQUENCE_ACTOR',
    SEQUENCE_MSG:         'SEQUENCE_MSG',
    SEQUENCE_NOTE:        'SEQUENCE_NOTE',
    SEQUENCE_LOOP:        'SEQUENCE_LOOP',
    SEQUENCE_LOOP_END:    'SEQUENCE_LOOP_END',
    SEQUENCE_ACTIVATE:    'SEQUENCE_ACTIVATE',

    // ── STATE MACHINE ──────────────────────────────────────────────────────────────────
    STATE_DEF:            'STATE_DEF',
    STATE_TRANS:          'STATE_TRANS',
    STATE_NOTE:           'STATE_NOTE',

    // ── ER DIAGRAM ─────────────────────────────────────────────────────────────────────
    ER_ENTITY:            'ER_ENTITY',
    ER_ATTR:              'ER_ATTR',
    ER_RELATION:          'ER_RELATION',

    // ── MINDMAP / TREE ─────────────────────────────────────────────────────────────────
    MINDMAP_NODE:         'MINDMAP_NODE',
    TREE_BRANCH:          'TREE_BRANCH',

    // ── GANTT / TIMELINE ───────────────────────────────────────────────────────────────
    GANTT_SECTION:        'GANTT_SECTION',
    GANTT_TASK:           'GANTT_TASK',
    TIMELINE_PERIOD:      'TIMELINE_PERIOD',
    TIMELINE_EVENT:       'TIMELINE_EVENT',

    // ── SPATIAL SHAPES & EDGES (Legacy connector syntax) ──────────────────────────────
    SHAPE:                'SHAPE',
    EDGE:                 'EDGE',
    PORT_DEF:             'PORT_DEF',
    DIAGRAM_DEF:          'DIAGRAM_DEF',

    // ── VECTOR & GRAPHICS SYSTEM ───────────────────────────────────────────────────────
    VECTOR_PATH:          'VECTOR_PATH',
    VECTOR_SHAPE:         'VECTOR_SHAPE',
    VECTOR_GROUP_START:   'VECTOR_GROUP_START',
    VECTOR_GROUP_END:     'VECTOR_GROUP_END',
    VECTOR_LAYER:         'VECTOR_LAYER',
    VECTOR_ARTBOARD:      'VECTOR_ARTBOARD',

    // ── SPATIAL LAYOUT ─────────────────────────────────────────────────────────────────
    DIRECTIVE_START:      'DIRECTIVE_START',  // @layout, @component, @artboard, @layer …
    DIRECTIVE_END:        'DIRECTIVE_END',    // @end
    COLUMN_BREAK:         'COLUMN_BREAK',     // ---col--- between columns

    // ── COMPONENT & TEMPLATE SYSTEM ────────────────────────────────────────────────────
    COMPONENT_USE:        'COMPONENT_USE',    // <MyComponent props />
    SLOT_DEF:             'SLOT_DEF',         // ::slot{name}
    TEMPLATE_START:       'TEMPLATE_START',   // #template Name(params)
    TEMPLATE_END:         'TEMPLATE_END',     // #end
    MACRO_DEF:            'MACRO_DEF',        // @macro name(params)

    // ── EXTENDED MARKDOWN BLOCKS ───────────────────────────────────────────────────────
    MD_BLOCK_START:       'MD_BLOCK_START',   // ::: warning · ::: tab · ::: card …
    MD_BLOCK_END:         'MD_BLOCK_END',     // :::

    // ── MEDIA & REFERENCES ─────────────────────────────────────────────────────────────
    FOOTNOTE_DEF:         'FOOTNOTE_DEF',
    REFERENCE_DEF:        'REFERENCE_DEF',
    EMBED:                'EMBED',            // !youtube[id], !figma[url], ![alt](src)

    // ── THEMING & ANIMATION ────────────────────────────────────────────────────────────
    THEME_VAR:            'THEME_VAR',        // --token: value
    ANIMATION_DEF:        'ANIMATION_DEF',   // @animate name keyframes
});

/* =========================================================================================
   §2  INLINE CONTENT BITMASK FLAGS
   Used on TEXT / QUOTE / HEADING tokens so the renderer can fast-path inline parsing.
   ========================================================================================= */

export const InlineFlags = Object.freeze({
    NONE:           0,
    MATH:           1 << 0,   // $...$  or  $$...$$
    BOLD:           1 << 1,   // **...** | __...__
    ITALIC:         1 << 2,   // *...*   | _..._
    CODE_SPAN:      1 << 3,   // `...`
    LINK:           1 << 4,   // [...](...)
    FOOTNOTE_REF:   1 << 5,   // [^…]
    HIGHLIGHT:      1 << 6,   // ==...==
    STRIKETHROUGH:  1 << 7,   // ~~...~~
    SUPERSCRIPT:    1 << 8,   // ^...^
    SUBSCRIPT:      1 << 9,   // ~...~
    UNDERLINE:      1 << 10,  // <u>...</u>
    IMAGE_INLINE:   1 << 11,  // ![alt](src)
    MENTION:        1 << 12,  // @username
    HASHTAG:        1 << 13,  // #tag
    VARIABLE_REF:   1 << 14,  // {$var}
    EMOJI:          1 << 15,  // :emoji_name:
    RAW_HTML:       1 << 16,  // <tag attr>
    ABBR:           1 << 17,  // *[ABBR]: expansion
    COLOR:          1 << 18,  // color(…) | #rrggbb inline
    SMART_QUOTE:    1 << 19,  // "…" | '…'
});

/* =========================================================================================
   §3  DOMAIN CLASSIFICATION SETS
   ========================================================================================= */

/** Code-block langs that trigger the diagram sub-tokenizer instead of RAW_LINE capture. */
const DIAGRAM_LANGS = new Set([
    'flowchart', 'flow', 'graph', 'digraph',
    'sequence', 'sequencediagram', 'seq',
    'mindmap', 'mind',
    'statechart', 'state', 'statemachine',
    'erd', 'entityrelationship', 'erdiagram',
    'gantt',
    'timeline',
    'network',
    'architecture', 'arch',
    'dependency', 'deps',
    'pipeline',
    'sankey',
    'quadrant',
    'gitgraph', 'git',
    'kanban',
    'radar',
    'heatmap',
    'tree',
    'logic',
]);

/** Code-block langs that trigger math-block handling. */
const MATH_LANGS = new Set(['math', 'latex', 'katex', 'tex', 'asciimath']);

/** Callout types (GitHub-style + Zolto extensions). */
const CALLOUT_TYPES = new Set([
    'note', 'tip', 'info', 'warning', 'danger', 'caution',
    'important', 'success', 'check', 'bug', 'example',
    'quote', 'abstract', 'todo', 'question', 'failure',
    'help', 'hint', 'attention', 'seealso', 'summary',
]);

/** Direction tokens valid inside diagram blocks. */
const DIAGRAM_DIRECTIONS = new Set(['LR', 'RL', 'TB', 'BT', 'TD']);

/* =========================================================================================
   §4  REGEX CACHE — Strictly anchored, zero per-call allocation
   ========================================================================================= */

const REGEX = Object.freeze({

    // ── STRUCTURAL ──────────────────────────────────────────────────────────────────────
    BLANK_LINE:           /^\s*$/,
    HEADING:              /^(#{1,6})\s+(.*?)(?:\s+\{([^}]*)\})?\s*$/,
    HORIZONTAL_RULE:      /^(?:[-*_=~])\1{2,}\s*$/,
    FRONTMATTER_DELIM:    /^---\s*$/,

    // ── COMMENTS ────────────────────────────────────────────────────────────────────────
    COMMENT_LINE:         /^\/\/\s?(.*)$/,
    BLOCK_COMMENT_START:  /^\/\*\s?(.*)$/,
    BLOCK_COMMENT_END:    /^(.*?)\*\/\s*$/,

    // ── IMPORTS · VARIABLES · THEMING ───────────────────────────────────────────────────
    IMPORT_STMT:          /^@import\s+"([^"]+)"(?:\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*$/,
    VARIABLE_DEF:         /^\$([a-zA-Z_][a-zA-Z0-9_-]*)\s*(?::=|=)\s*(.+)$/,
    THEME_VAR:            /^--([a-zA-Z0-9_-]+)\s*:\s*(.+)$/,

    // ── QUOTES & CALLOUTS ────────────────────────────────────────────────────────────────
    QUOTE:                /^>\s*(.*)$/,
    CALLOUT:              /^>\s*\[!([a-zA-Z]+)\]\s*(.*)$/,

    // ── LISTS ────────────────────────────────────────────────────────────────────────────
    CHECKLIST_ITEM:       /^(\s*)([-*+])\s+\[([ xXoO?\/!~])\]\s+(.*)$/,
    LIST_ITEM:            /^(\s*)([-*+])\s+(.*)$/,
    ORDERED_LIST_ITEM:    /^(\s*)(\d+)([.):])\s+(.*)$/,
    DEFINITION_TERM:      /^:\s+(.+)$/,
    DEFINITION_DEF:       /^::\s+(.+)$/,

    // ── TABLES ───────────────────────────────────────────────────────────────────────────
    TABLE_ROW:            /^\|(.+)\|$/,
    TABLE_DIVIDER:        /^\|(?:\s*:?-{1,}\s*:?\s*\|)+$/,

    // ── CODE & MATH ──────────────────────────────────────────────────────────────────────
    CODE_BLOCK_START:     /^`{3}([a-zA-Z0-9_+#.\-]*)(?:\s+(.*))?$/,
    MATH_BLOCK_START:     /^(?:\$\$|math(?:\s+([a-zA-Z0-9_-]+))?)\s*(?:\{(.*))?\s*$/i,
    MATH_EQUATION:        /^eq(?:uation)?\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$/i,

    // ── INLINE CHART (single-line) ────────────────────────────────────────────────────────
    CHART_INLINE:         /^(PIE|BAR|LINE|AREA|SCATTER|BUBBLE|RADAR|POLAR|DONUT|HISTOGRAM|TREEMAP|FUNNEL|GAUGE|WATERFALL)\s*:\s*(.*)$/i,

    // ── STANDALONE DIAGRAM BLOCK ─────────────────────────────────────────────────────────
    DIAGRAM_BLOCK_START:  /^(flowchart|sequence|mindmap|statechart|erd|network|architecture|gantt|timeline|dependency|logic|pipeline|graph|digraph|tree|sankey|quadrant|gitgraph|kanban|radar|heatmap)\s+(?:(LR|RL|TB|BT|TD)\s+)?([a-zA-Z0-9_-]*)?\s*\{\s*$/i,
    DIAGRAM_BLOCK_END:    /^\}\s*$/,

    // ── GRAPH NODES (flowchart/graph body) ────────────────────────────────────────────────
    GRAPH_NODE_RECT:      /^([a-zA-Z0-9_]+)\[([^\]]*)\](?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_ROUND:     /^([a-zA-Z0-9_]+)\(([^)]*)\)(?!\))(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_CIRCLE:    /^([a-zA-Z0-9_]+)\(\(([^)]*)\)\)(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_DIAMOND:   /^([a-zA-Z0-9_]+)\{([^}]*)\}(?!\})(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_HEX:       /^([a-zA-Z0-9_]+)\{\{([^}]*)\}\}(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_STADIUM:   /^([a-zA-Z0-9_]+)\(\[([^\]]*)\]\)(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_SUBRTN:    /^([a-zA-Z0-9_]+)\[\[([^\]]*)\]\](?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_ASYMM:     /^([a-zA-Z0-9_]+)>([^\]]+)\](?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_NODE_PLAIN:     /^([a-zA-Z0-9_]+)(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
    GRAPH_EDGE:           /^([a-zA-Z0-9_]+(?:\s*&\s*[a-zA-Z0-9_]+)*)\s*(-->|---|-\.->|==>|===|--[ox]|<-->|~~>|-.->|===>|-->>)\s*(?:\|([^|]*)\|\s*)?([a-zA-Z0-9_]+(?:\s*&\s*[a-zA-Z0-9_]+)*)\s*$/,
    GRAPH_SUBGRAPH:       /^subgraph\s+([a-zA-Z0-9_]*)(?:\s*\[([^\]]*)\])?\s*$/i,
    GRAPH_SUBGRAPH_END:   /^end\s*$/i,
    GRAPH_CLASS_DEF:      /^classDef\s+([a-zA-Z0-9_-]+)\s+(.+)$/i,
    GRAPH_STYLE_LINE:     /^style\s+([a-zA-Z0-9_]+)\s+(.+)$/i,
    GRAPH_LINKSTYLE:      /^linkStyle\s+(\d+)\s+(.+)$/i,

    // ── SEQUENCE DIAGRAM ──────────────────────────────────────────────────────────────────
    SEQUENCE_ACTOR:       /^(?:actor|participant|database|boundary|control|entity|collections|queue)\s+([a-zA-Z0-9_]+)(?:\s+as\s+(.+))?\s*$/i,
    SEQUENCE_MSG:         /^([a-zA-Z0-9_]+)\s*(->|-->|->>|-->>|-[xX]|--[xX]|-\)|--\)|~>)\s*([a-zA-Z0-9_]+)\s*:\s*(.+)$/,
    SEQUENCE_NOTE:        /^[Nn]ote\s+(left|right|over)\s+(?:of\s+)?([a-zA-Z0-9_]+(?:\s*,\s*[a-zA-Z0-9_]+)*)\s*:\s*(.+)$/,
    SEQUENCE_LOOP:        /^(loop|alt|else|opt|par|and|critical|break|rect|ref|neg)\s+(.*)?$/i,
    SEQUENCE_END:         /^end\s*$/i,
    SEQUENCE_ACTIVATE:    /^(activate|deactivate)\s+([a-zA-Z0-9_]+)\s*$/i,
    SEQUENCE_AUTONUMBER:  /^autonumber(?:\s+(\d+))?(?:\s+(\d+))?\s*$/i,

    // ── STATE MACHINE ─────────────────────────────────────────────────────────────────────
    STATE_DEF:            /^state\s+"([^"]+)"\s+as\s+([a-zA-Z0-9_]+)(?:\s*:\s*(.+))?\s*$/i,
    STATE_DEF_SIMPLE:     /^state\s+([a-zA-Z0-9_]+)(?:\s+\{)?\s*$/i,
    STATE_TRANS:          /^([a-zA-Z0-9_[\]*+]+)\s*-->\s*(?:\[([^\]]*)\]\s*)?([a-zA-Z0-9_[\]*+]+)(?:\s*:\s*(.+))?\s*$/,
    STATE_NOTE:           /^note\s+(right|left)\s+of\s+([a-zA-Z0-9_]+)\s*:\s*(.+)$/i,
    STATE_COMPOSITE:      /^\[([*+])\]\s*$/,

    // ── ER DIAGRAM ────────────────────────────────────────────────────────────────────────
    ER_ENTITY:            /^([a-zA-Z0-9_]+)\s*\{\s*$/,
    ER_ATTR:              /^\s+(string|int|integer|float|double|boolean|bool|date|datetime|timestamp|enum|uuid|bigint|json|text|blob|decimal)\s+([a-zA-Z0-9_]+)(?:\s+(PK|FK|UK))?(?:\s+"([^"]*)")?\s*$/i,
    ER_RELATION:          /^([a-zA-Z0-9_]+)\s+([|o{}*+[\]]{2,4}--[|o{}*+[\]]{2,4})\s+([a-zA-Z0-9_]+)\s*:\s*"([^"]*)"\s*$/,

    // ── MINDMAP ───────────────────────────────────────────────────────────────────────────
    MINDMAP_NODE:         /^(\s*)([+\-*o~@#])\s+(.+)$/,
    MINDMAP_ROOT:         /^root\s*(?:\(\((.+)\)\)|(.+))$/i,

    // ── GANTT ─────────────────────────────────────────────────────────────────────────────
    GANTT_TITLE:          /^title\s+(.+)$/i,
    GANTT_DATEFORMAT:     /^dateFormat\s+(.+)$/i,
    GANTT_SECTION:        /^section\s+(.+)$/i,
    GANTT_TASK:           /^\s{0,}([^:]+)\s*:\s*(?:(crit|done|active|milestone)\s*,\s*)?(?:([a-zA-Z0-9_]+)\s*,\s*)?([^,]+)(?:\s*,\s*(.+))?\s*$/,
    GANTT_AXISFMT:        /^axisFormat\s+(.+)$/i,

    // ── TIMELINE ──────────────────────────────────────────────────────────────────────────
    TIMELINE_TITLE:       /^title\s+(.+)$/i,
    TIMELINE_PERIOD:      /^(\d{4}(?:-\d{2})?(?:-\d{2})?|\w+\s+\d{4})\s*$/,
    TIMELINE_EVENT:       /^\s{2,}(.+?)(?:\s*:\s*(.+))?\s*$/,

    // ── TREE ─────────────────────────────────────────────────────────────────────────────
    TREE_BRANCH:          /^([├└│ ─\s]+)(.+)$/,

    // ── VECTORS & GRAPHICS ────────────────────────────────────────────────────────────────
    VECTOR_COMMAND:       /^(path|circle|ellipse|rect|rectangle|polygon|polyline|line|text|image|arc|bezier|spline|star|arrow)\s*:\s*(.*)$/i,
    VECTOR_GROUP_START:   /^group\s*([a-zA-Z0-9_-]*)?\s*\{?\s*$/i,
    VECTOR_GROUP_END:     /^\}\s*(?:\/\/?\s*(?:end\s*)?group)?\s*$/i,
    VECTOR_LAYER:         /^layer\s+([a-zA-Z0-9_-]+)(?:\s+(front|back|above|below|canvas))?\s*$/i,
    VECTOR_ARTBOARD:      /^artboard\s+([a-zA-Z0-9_-]+)(?:\s+([0-9]+)x([0-9]+))?\s*$/i,
    VECTOR_CAMERA:        /^camera\s*:\s*(.+)$/i,
    VECTOR_CONSTRAINT:    /^constraint\s*:\s*(.+)$/i,

    // ── SPATIAL DIRECTIVES ────────────────────────────────────────────────────────────────
    DIRECTIVE_START:      /^@([a-zA-Z0-9_-]+)(?:\s+([^{]+?))?(?:\s*\{([^}]*)\})?\s*$/,
    DIRECTIVE_END:        /^@end(?:\s+([a-zA-Z0-9_-]+))?\s*$/,

    // ── COMPONENTS & TEMPLATES ────────────────────────────────────────────────────────────
    COMPONENT_USE:        /^<([A-Z][a-zA-Z0-9_.-]*)(?:\s+(.*?))?(?:\s*\/>|>)\s*$/,
    SLOT_DEF:             /^::slot(?:\{([a-zA-Z0-9_-]+)\})?\s*$/,
    TEMPLATE_START:       /^#template\s+([a-zA-Z0-9_-]+)(?:\s*\(([^)]*)\))?\s*$/,
    TEMPLATE_END:         /^#end(?:\s+template)?\s*$/,
    MACRO_DEF:            /^@macro\s+([a-zA-Z0-9_-]+)(?:\s*\(([^)]*)\))?\s*$/,

    // ── EXTENDED MARKDOWN BLOCKS ──────────────────────────────────────────────────────────
    MD_BLOCK_START:       /^:::\s*([a-zA-Z0-9_-]+)(?:\s+(.+))?\s*$/,
    MD_BLOCK_END:         /^:::\s*$/,

    // ── LEGACY SPATIAL CONNECTORS ─────────────────────────────────────────────────────────
    SHAPE_DEF:            /^\[(.+?)\](?:\s*\+([a-zA-Z0-9_-]+))?(?:\s*@([a-zA-Z0-9_-]+))?(?:\s*\{([^}]*)\})?\s*$/,
    EDGE_DEF:             /^([-=]>|[-=]{2,}|\.[-]+>|<[-=]+>|\.\.\.|~~>)\s*(?:\((.+?)\)\s*)?\[(.*?)\]\s*$/,
    PORT_DEF:             /^::port\s+([a-zA-Z0-9_-]+)\s*$/,

    // ── MEDIA & REFERENCES ────────────────────────────────────────────────────────────────
    EMBED:                /^!(?:([a-zA-Z0-9_-]+))?\[([^\]]*)\]\(([^)]+)\)(?:\s*\{([^}]*)\})?\s*$/,
    FOOTNOTE_DEF:         /^\[\^([^\]]+)\]:\s+(.+)$/,
    REFERENCE_DEF:        /^\[([^\]]+)\]:\s+(.+)$/,

    // ── ANIMATION ─────────────────────────────────────────────────────────────────────────
    ANIMATION_DEF:        /^@animate\s+([a-zA-Z0-9_-]+)(?:\s+([a-zA-Z0-9_-]+))?(?:\s+\{(.+))?\s*$/i,

    // ── COLUMN BREAK ──────────────────────────────────────────────────────────────────────
    COLUMN_BREAK:         /^---(?:col(?:umn)?|split|break)---\s*$/i,
});

/* =========================================================================================
   §5  ZOLTO TOKEN — Monomorphic Object Shape
   All tokens share the same V8 Hidden Class regardless of type.
   All fields are declared in one deterministic order and pre-set to typed zero-values.
   ========================================================================================= */

class ZoltoToken {
    constructor(type, line, raw) {
        // Identity
        this.type  = type;
        this.line  = line;
        this.raw   = raw;

        // ── String payloads ─────────────────────────────────────────────────────────────
        this.value         = null;  // Generic string value / text content
        this.text          = null;  // Human-visible label / heading text
        this.label         = null;  // Node label (shapes, edges)
        this.lang          = null;  // Code block language
        this.content       = null;  // Table row raw content
        this.config        = null;  // Block configuration string
        this.directive     = null;  // @directive name
        this.args          = null;  // @directive argument string
        this.blockType     = null;  // ::: block type
        this.params        = null;  // ::: block parameters
        this.url           = null;  // URL for embeds / references
        this.embedType     = null;  // 'image' | 'youtube' | 'figma' | …
        this.componentName = null;  // Component identifier
        this.props         = null;  // Raw props string
        this.slotName      = null;  // Slot name
        this.vectorType    = null;  // 'path' | 'circle' | 'rect' | …
        this.vectorData    = null;  // SVG path / attribute string
        this.chartType     = null;  // 'PIE' | 'BAR' | …
        this.id            = null;  // Node ID in diagram
        this.trait         = null;  // Node trait / shape class
        this.operator      = null;  // Edge operator
        this.target        = null;  // Raw edge target
        this.bullet        = null;  // List bullet character
        this.prefix        = null;  // Tree prefix chars
        this.key           = null;  // Variable / CSS-var key
        this.name          = null;  // Template / layer / animation name
        this.alias         = null;  // Sequence actor alias
        this.kind          = null;  // Node shape kind (rect|circle|diamond|…)
        this.diagramType   = null;  // Diagram block type
        this.dir           = null;  // Diagram direction (LR|TB|…)
        this.modifier      = null;  // e.g. list marker char ('.', ')', ':')
        this.from          = null;  // Edge source node ID
        this.to            = null;  // Edge target node ID
        this.edgeLabel     = null;  // Edge label text
        this.calloutType   = null;  // Callout level type
        this.cssClass      = null;  // CSS class assignment (:::className)
        this.attrName      = null;  // ER attribute name
        this.attrType      = null;  // ER attribute type
        this.attrKey       = null;  // ER attribute key (PK|FK|UK)
        this.attrComment   = null;  // ER attribute comment
        this.period        = null;  // Timeline / gantt period

        // ── Numeric payloads ─────────────────────────────────────────────────────────────
        this.level   = 0;   // Heading level (1–6) / indent depth
        this.indent  = 0;   // Whitespace indent (list nesting)
        this.number  = 0;   // Ordered list item index / equation number
        this.flags   = 0;   // InlineFlags bitmask

        // ── Boolean payloads ─────────────────────────────────────────────────────────────
        this.checked  = false;  // Checklist state
        this.ordered  = false;  // Is list ordered
    }
}

/* =========================================================================================
   §6  ZOLTO TOKENIZER ENGINE
   ========================================================================================= */

export class ZOLTOTokenizer {

    /**
     * @param {string} sourceCode - Raw Zolto document source
     */
    constructor(sourceCode) {
        this.source = typeof sourceCode === 'string' ? sourceCode : '';
        this.lines  = this.source.split(/\r?\n/);
        this.length = this.lines.length;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       PUBLIC: tokenize()
       Main O(n) scanning loop. Uses a state machine for verbatim blocks.
    ───────────────────────────────────────────────────────────────────────────────────── */
    tokenize() {
        // Pre-allocate with capacity hint then trim at end
        const tokens = new Array(Math.min(this.length * 2, 32000));
        let tc = 0; // token count

        // ── Verbatim block state ──────────────────────────────────────────────────────
        let inCodeBlock      = false;
        let inMathBlock      = false;
        let inFrontmatter    = false;
        let inBlockComment   = false;
        let inDiagram        = false;
        let inErEntity       = false;   // ER entity body { … }
        let inGraphSubgraph  = false;

        // Diagram block metadata (set when inDiagram = true)
        let curDiagramType  = '';
        let curDiagramName  = '';
        let curDiagramDir   = '';
        let curDiagramLine  = 0;

        // Code block metadata
        let curCodeLang   = '';
        let curCodeConfig = '';
        let curMathCfg    = '';

        // ER entity under construction
        let curErEntity   = '';

        for (let i = 0; i < this.length; i++) {
            const rawLine = this.lines[i];
            const trimmed = rawLine.trim();

            /* ── §6.1 VERBATIM BLOCK DISPATCH ──────────────────────────────────────── */

            // ── Block comment ──────────────────────────────────────────────────────────
            if (inBlockComment) {
                if (REGEX.BLOCK_COMMENT_END.test(trimmed)) {
                    inBlockComment = false;
                    tokens[tc++] = this._token(TokenTypes.BLOCK_COMMENT_END, i, rawLine);
                } else {
                    tokens[tc++] = this._token(TokenTypes.COMMENT, i, rawLine, { value: trimmed });
                }
                continue;
            }

            // ── Frontmatter ────────────────────────────────────────────────────────────
            if (inFrontmatter) {
                if (REGEX.FRONTMATTER_DELIM.test(trimmed)) {
                    inFrontmatter = false;
                    tokens[tc++] = this._token(TokenTypes.FRONTMATTER_END, i, rawLine);
                } else {
                    tokens[tc++] = this._token(TokenTypes.RAW_LINE, i, rawLine, { value: rawLine });
                }
                continue;
            }

            // ── Math block ────────────────────────────────────────────────────────────
            if (inMathBlock) {
                if (trimmed === '$$' || trimmed === 'end' || trimmed === '@end') {
                    inMathBlock = false;
                    tokens[tc++] = this._token(TokenTypes.MATH_BLOCK_END, i, rawLine);
                } else {
                    tokens[tc++] = this._token(TokenTypes.RAW_LINE, i, rawLine, {
                        value: rawLine,
                        flags: ZOLTOTokenizer.analyzeInline(rawLine),
                    });
                }
                continue;
            }

            // ── Code block ────────────────────────────────────────────────────────────
            if (inCodeBlock) {
                if (trimmed === '```' || trimmed === '~~~') {
                    inCodeBlock = false;
                    tokens[tc++] = this._token(TokenTypes.CODE_BLOCK_END, i, rawLine);
                } else {
                    tokens[tc++] = this._token(TokenTypes.RAW_LINE, i, rawLine, { value: rawLine });
                }
                continue;
            }

            // ── Diagram block ─────────────────────────────────────────────────────────
            if (inDiagram) {
                // ER entity body needs its own sub-state
                if (inErEntity) {
                    if (trimmed === '}') {
                        inErEntity  = false;
                        curErEntity = '';
                        tokens[tc++] = this._token(TokenTypes.RAW_LINE, i, rawLine, { value: '}' });
                    } else {
                        const attrMatch = rawLine.match(REGEX.ER_ATTR);
                        if (attrMatch) {
                            tokens[tc++] = this._token(TokenTypes.ER_ATTR, i, rawLine, {
                                attrType:    attrMatch[1].toLowerCase(),
                                attrName:    attrMatch[2],
                                attrKey:     attrMatch[3] || null,
                                attrComment: attrMatch[4] || null,
                                name:        curErEntity,
                            });
                        } else {
                            tokens[tc++] = this._token(TokenTypes.RAW_LINE, i, rawLine, { value: rawLine });
                        }
                    }
                    continue;
                }

                // End of diagram block
                if (trimmed === '}' || trimmed === '@end' || trimmed === '```' || trimmed === '~~~') {
                    inDiagram        = false;
                    curDiagramType   = '';
                    tokens[tc++] = this._token(TokenTypes.DIAGRAM_END, i, rawLine);
                    continue;
                }

                if (!trimmed || REGEX.BLANK_LINE.test(trimmed)) {
                    tokens[tc++] = this._token(TokenTypes.BLANK, i, rawLine);
                    continue;
                }

                // Sub-tokenize diagram content
                const diagramToken = this._tokenizeDiagramLine(
                    trimmed, rawLine, i, curDiagramType
                );

                // Track ER entity bodies
                if (diagramToken.type === TokenTypes.ER_ENTITY) {
                    inErEntity  = true;
                    curErEntity = diagramToken.name;
                }

                tokens[tc++] = diagramToken;
                continue;
            }

            /* ── §6.2 FAST PATHS ──────────────────────────────────────────────────── */

            // Blank line
            if (!trimmed) {
                tokens[tc++] = this._token(TokenTypes.BLANK, i, rawLine);
                continue;
            }

            // Frontmatter start — only valid at line 0
            if (i === 0 && REGEX.FRONTMATTER_DELIM.test(trimmed)) {
                inFrontmatter = true;
                tokens[tc++] = this._token(TokenTypes.FRONTMATTER_START, i, rawLine);
                continue;
            }

            /* ── §6.3 CHARCODE ZERO-BACKTRACKING ROUTER ─────────────────────────── */

            const fc = trimmed.charCodeAt(0); // first char code — O(1)
            let m; // reusable match variable

            // ── '`' (96) — Code / Diagram / Math blocks via fenced syntax ─────────────
            if (fc === 96 && trimmed.charCodeAt(1) === 96 && trimmed.charCodeAt(2) === 96) {
                m = rawLine.match(REGEX.CODE_BLOCK_START);
                const lang   = m && m[1] ? m[1].toLowerCase() : '';
                const config = m && m[2] ? m[2].trim() : '';

                if (MATH_LANGS.has(lang)) {
                    // Treat as math block
                    inMathBlock = true;
                    curMathCfg  = config;
                    tokens[tc++] = this._token(TokenTypes.MATH_BLOCK_START, i, rawLine, {
                        lang,
                        config,
                        diagramType: 'math',
                    });
                } else if (DIAGRAM_LANGS.has(lang)) {
                    // Treat as structured diagram block
                    inDiagram      = true;
                    curDiagramType = lang;
                    curDiagramName = config || '';
                    curDiagramDir  = DIAGRAM_DIRECTIONS.has(config) ? config : '';
                    curDiagramLine = i;
                    tokens[tc++] = this._token(TokenTypes.DIAGRAM_START, i, rawLine, {
                        diagramType: lang,
                        name:        curDiagramName,
                        dir:         curDiagramDir,
                        config,
                    });
                } else {
                    inCodeBlock  = true;
                    curCodeLang  = lang;
                    curCodeConfig = config;
                    tokens[tc++] = this._token(TokenTypes.CODE_BLOCK_START, i, rawLine, {
                        lang,
                        config,
                    });
                }
                continue;
            }

            // '~' (126) — Tilde fenced code blocks ~~~ lang
            if (fc === 126 && trimmed.charCodeAt(1) === 126 && trimmed.charCodeAt(2) === 126) {
                const lang   = trimmed.slice(3).trim().toLowerCase();
                const config = '';
                if (DIAGRAM_LANGS.has(lang)) {
                    inDiagram      = true;
                    curDiagramType = lang;
                    curDiagramName = '';
                    curDiagramLine = i;
                    tokens[tc++] = this._token(TokenTypes.DIAGRAM_START, i, rawLine, {
                        diagramType: lang, name: '', dir: '', config,
                    });
                } else {
                    inCodeBlock  = true;
                    curCodeLang  = lang;
                    curCodeConfig = config;
                    tokens[tc++] = this._token(TokenTypes.CODE_BLOCK_START, i, rawLine, {
                        lang, config,
                    });
                }
                continue;
            }

            // '$' (36) — Math block $$ ... $$
            if (fc === 36 && trimmed.charCodeAt(1) === 36) {
                inMathBlock = true;
                tokens[tc++] = this._token(TokenTypes.MATH_BLOCK_START, i, rawLine, {
                    config: trimmed.slice(2).trim() || '',
                });
                continue;
            }

            // '/' (47) — Line comment or block comment start
            if (fc === 47) {
                const sc = trimmed.charCodeAt(1);
                if (sc === 47) { // //
                    m = trimmed.match(REGEX.COMMENT_LINE);
                    tokens[tc++] = this._token(TokenTypes.COMMENT, i, rawLine, {
                        value: m ? m[1].trim() : trimmed.slice(2),
                    });
                    continue;
                }
                if (sc === 42) { // /*
                    m = trimmed.match(REGEX.BLOCK_COMMENT_START);
                    inBlockComment = true;
                    tokens[tc++] = this._token(TokenTypes.BLOCK_COMMENT_START, i, rawLine, {
                        value: m ? m[1].trim() : '',
                    });
                    continue;
                }
            }

            // '#' (35) — Heading
            if (fc === 35) {
                m = trimmed.match(REGEX.HEADING);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.HEADING, i, rawLine, {
                        level:  m[1].length,
                        text:   m[2].trim(),
                        config: m[3] || null,
                        flags:  ZOLTOTokenizer.analyzeInline(m[2]),
                    });
                    continue;
                }
            }

            // '>' (62) — Blockquote or Callout
            if (fc === 62) {
                // Callout: > [!TYPE] optional-title
                m = trimmed.match(REGEX.CALLOUT);
                if (m) {
                    const calloutType = m[1].toLowerCase();
                    if (CALLOUT_TYPES.has(calloutType)) {
                        tokens[tc++] = this._token(TokenTypes.CALLOUT, i, rawLine, {
                            calloutType,
                            text:  m[2].trim() || null,
                            flags: ZOLTOTokenizer.analyzeInline(m[2]),
                        });
                        continue;
                    }
                }
                m = trimmed.match(REGEX.QUOTE);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.QUOTE, i, rawLine, {
                        text:  m[1].trim(),
                        flags: ZOLTOTokenizer.analyzeInline(m[1]),
                    });
                    continue;
                }
            }

            // '|' (124) — Table row / divider
            if (fc === 124 && trimmed.charCodeAt(trimmed.length - 1) === 124) {
                if (REGEX.TABLE_DIVIDER.test(trimmed)) {
                    tokens[tc++] = this._token(TokenTypes.TABLE_DIVIDER, i, rawLine);
                } else {
                    tokens[tc++] = this._token(TokenTypes.TABLE_ROW, i, rawLine, {
                        content: trimmed.slice(1, -1), // raw cell string between pipes
                    });
                }
                continue;
            }

            // '!' (33) — Embed / inline image
            if (fc === 33) {
                m = trimmed.match(REGEX.EMBED);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.EMBED, i, rawLine, {
                        embedType: m[1] ? m[1].toLowerCase() : 'image',
                        label:     m[2].trim(),
                        url:       m[3].trim(),
                        config:    m[4] ? m[4].trim() : null,
                    });
                    continue;
                }
            }

            // '@' (64) — Directives · Macros · Animations · Imports
            if (fc === 64) {
                // @end
                if (trimmed === '@end' || REGEX.DIRECTIVE_END.test(trimmed)) {
                    m = trimmed.match(REGEX.DIRECTIVE_END);
                    tokens[tc++] = this._token(TokenTypes.DIRECTIVE_END, i, rawLine, {
                        name: m && m[1] ? m[1] : null,
                    });
                    continue;
                }

                // @import "path"
                m = trimmed.match(REGEX.IMPORT_STMT);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.IMPORT_STMT, i, rawLine, {
                        url:  m[1],
                        name: m[2] || null,
                    });
                    continue;
                }

                // @macro name(params)
                m = trimmed.match(REGEX.MACRO_DEF);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.MACRO_DEF, i, rawLine, {
                        name:   m[1],
                        params: m[2] ? m[2].trim() : null,
                    });
                    continue;
                }

                // @animate name timing { … }
                m = trimmed.match(REGEX.ANIMATION_DEF);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.ANIMATION_DEF, i, rawLine, {
                        name:   m[1],
                        args:   m[2] || null,
                        config: m[3] ? m[3].trim() : null,
                    });
                    continue;
                }

                // Generic @directive [args] [{config}]
                m = trimmed.match(REGEX.DIRECTIVE_START);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.DIRECTIVE_START, i, rawLine, {
                        directive: m[1].toLowerCase(),
                        args:      m[2] ? m[2].trim() : null,
                        config:    m[3] ? m[3].trim() : null,
                    });
                    continue;
                }
            }

            // ':' (58) — Extended MD blocks · Slots · Definition lists
            if (fc === 58) {
                if (trimmed.startsWith(':::')) {
                    if (trimmed === ':::') {
                        tokens[tc++] = this._token(TokenTypes.MD_BLOCK_END, i, rawLine);
                    } else {
                        m = trimmed.match(REGEX.MD_BLOCK_START);
                        if (m) {
                            tokens[tc++] = this._token(TokenTypes.MD_BLOCK_START, i, rawLine, {
                                blockType: m[1].toLowerCase(),
                                params:    m[2] ? m[2].trim() : null,
                            });
                        }
                    }
                    continue;
                }

                if (trimmed.startsWith('::slot')) {
                    m = trimmed.match(REGEX.SLOT_DEF);
                    if (m) {
                        tokens[tc++] = this._token(TokenTypes.SLOT_DEF, i, rawLine, {
                            slotName: m[1] || 'default',
                        });
                        continue;
                    }
                }

                if (trimmed.startsWith('::port')) {
                    m = trimmed.match(REGEX.PORT_DEF);
                    if (m) {
                        tokens[tc++] = this._token(TokenTypes.PORT_DEF, i, rawLine, {
                            name: m[1],
                        });
                        continue;
                    }
                }

                // Definition list
                if (trimmed.startsWith(':: ')) {
                    m = trimmed.match(REGEX.DEFINITION_DEF);
                    if (m) {
                        tokens[tc++] = this._token(TokenTypes.DEFINITION_DEF, i, rawLine, {
                            text:  m[1].trim(),
                            flags: ZOLTOTokenizer.analyzeInline(m[1]),
                        });
                        continue;
                    }
                }
                if (trimmed.startsWith(': ')) {
                    m = trimmed.match(REGEX.DEFINITION_TERM);
                    if (m) {
                        tokens[tc++] = this._token(TokenTypes.DEFINITION_TERM, i, rawLine, {
                            text:  m[1].trim(),
                            flags: ZOLTOTokenizer.analyzeInline(m[1]),
                        });
                        continue;
                    }
                }
            }

            // '#' already handled above — '#template' caught here via 't' (116)
            // '#' (35) — Template definitions
            if (fc === 35) {
                m = trimmed.match(REGEX.TEMPLATE_START);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.TEMPLATE_START, i, rawLine, {
                        name:   m[1],
                        params: m[2] ? m[2].trim() : null,
                    });
                    continue;
                }
            }

            // '#' — Template end (#end)
            if (fc === 35 && trimmed.startsWith('#end')) {
                m = trimmed.match(REGEX.TEMPLATE_END);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.TEMPLATE_END, i, rawLine);
                    continue;
                }
            }

            // '<' (60) — Component use
            if (fc === 60) {
                m = trimmed.match(REGEX.COMPONENT_USE);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.COMPONENT_USE, i, rawLine, {
                        componentName: m[1],
                        props:         m[2] ? m[2].trim() : null,
                    });
                    continue;
                }
            }

            // '[' (91) — Shapes · Footnote defs · Reference defs
            if (fc === 91) {
                if (trimmed.charCodeAt(1) === 94) { // [^
                    m = trimmed.match(REGEX.FOOTNOTE_DEF);
                    if (m) {
                        tokens[tc++] = this._token(TokenTypes.FOOTNOTE_DEF, i, rawLine, {
                            id:    m[1],
                            text:  m[2].trim(),
                            flags: ZOLTOTokenizer.analyzeInline(m[2]),
                        });
                        continue;
                    }
                }

                m = trimmed.match(REGEX.REFERENCE_DEF);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.REFERENCE_DEF, i, rawLine, {
                        id:  m[1],
                        url: m[2].trim(),
                    });
                    continue;
                }

                m = trimmed.match(REGEX.SHAPE_DEF);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.SHAPE, i, rawLine, {
                        label:  m[1].trim(),
                        trait:  m[2] || 'base',
                        id:     m[3] || null,
                        config: m[4] || null,
                    });
                    continue;
                }
            }

            // '-' (45) · '*' (42) · '+' (43) — Lists · Checklists · HR
            if (fc === 45 || fc === 42 || fc === 43) {
                // Checklist takes priority
                m = rawLine.match(REGEX.CHECKLIST_ITEM);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.CHECKLIST_ITEM, i, rawLine, {
                        indent:  m[1].length,
                        bullet:  m[2],
                        checked: /[xX]/.test(m[3]),
                        modifier: m[3], // Full state char: ' ', 'x', 'o', '?', '/', '!'
                        text:    m[4].trim(),
                        flags:   ZOLTOTokenizer.analyzeInline(m[4]),
                    });
                    continue;
                }

                m = rawLine.match(REGEX.LIST_ITEM);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.LIST_ITEM, i, rawLine, {
                        indent: m[1].length,
                        bullet: m[2],
                        text:   m[3].trim(),
                        flags:  ZOLTOTokenizer.analyzeInline(m[3]),
                    });
                    continue;
                }

                // Horizontal rule --- / *** / ---
                if (REGEX.HORIZONTAL_RULE.test(trimmed)) {
                    // Column break takes priority
                    if (REGEX.COLUMN_BREAK.test(trimmed)) {
                        tokens[tc++] = this._token(TokenTypes.COLUMN_BREAK, i, rawLine);
                    } else {
                        tokens[tc++] = this._token(TokenTypes.HORIZONTAL_RULE, i, rawLine);
                    }
                    continue;
                }
            }

            // '_' (95) · '=' (61) — HR variants: ___ / ===
            if ((fc === 95 || fc === 61 || fc === 126) && REGEX.HORIZONTAL_RULE.test(trimmed)) {
                tokens[tc++] = this._token(TokenTypes.HORIZONTAL_RULE, i, rawLine);
                continue;
            }

            // '0'–'9' (48–57) — Ordered list items · Equations
            if (fc >= 48 && fc <= 57) {
                m = rawLine.match(REGEX.ORDERED_LIST_ITEM);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.ORDERED_LIST_ITEM, i, rawLine, {
                        indent:   m[1].length,
                        number:   parseInt(m[2], 10),
                        modifier: m[3],  // '.' | ')' | ':'
                        text:     m[4].trim(),
                        ordered:  true,
                        flags:    ZOLTOTokenizer.analyzeInline(m[4]),
                    });
                    continue;
                }
            }

            // '$' (36) — Variable definitions · CSS custom props
            if (fc === 36) {
                m = trimmed.match(REGEX.VARIABLE_DEF);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.VARIABLE_DEF, i, rawLine, {
                        key:   m[1],
                        value: m[2].trim(),
                    });
                    continue;
                }
            }

            // '-' (45) — CSS custom property (--token: value)
            if (fc === 45 && trimmed.charCodeAt(1) === 45) {
                m = trimmed.match(REGEX.THEME_VAR);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.THEME_VAR, i, rawLine, {
                        key:   m[1],
                        value: m[2].trim(),
                    });
                    continue;
                }
            }

            // Edge operators: '->', '=>', '<->', '.→', '~~>' etc.
            if (fc === 45 || fc === 61 || fc === 46 || fc === 60 || fc === 126) {
                m = trimmed.match(REGEX.EDGE_DEF);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.EDGE, i, rawLine, {
                        operator: m[1],
                        label:    m[2] ? m[2].trim() : null,
                        target:   m[3].trim(),
                    });
                    continue;
                }
            }

            // 'e'|'E' (101|69) — Equations: eq [n]: formula
            if (fc === 101 || fc === 69) {
                m = trimmed.match(REGEX.MATH_EQUATION);
                if (m) {
                    tokens[tc++] = this._token(TokenTypes.MATH_EQUATION, i, rawLine, {
                        id:    m[1] ? m[1].trim() : null,
                        value: m[2].trim(),
                        flags: InlineFlags.MATH,
                    });
                    continue;
                }
            }

            // Inline chart declarations: PIE: … / BAR: … / LINE: …
            m = trimmed.match(REGEX.CHART_INLINE);
            if (m) {
                tokens[tc++] = this._token(TokenTypes.CHART, i, rawLine, {
                    chartType: m[1].toUpperCase(),
                    config:    m[2].trim(),
                });
                continue;
            }

            // Standalone diagram blocks: flowchart LR { …
            m = trimmed.match(REGEX.DIAGRAM_BLOCK_START);
            if (m) {
                const dtype = m[1].toLowerCase();
                const ddir  = DIAGRAM_DIRECTIONS.has(m[2]) ? m[2] : '';
                const dname = m[3] || '';
                inDiagram      = true;
                curDiagramType = dtype;
                curDiagramDir  = ddir;
                curDiagramName = dname;
                curDiagramLine = i;
                tokens[tc++] = this._token(TokenTypes.DIAGRAM_START, i, rawLine, {
                    diagramType: dtype,
                    dir:         ddir,
                    name:        dname,
                    config:      '',
                });
                continue;
            }

            // Vector group start: group { / group myGroup {
            m = trimmed.match(REGEX.VECTOR_GROUP_START);
            if (m && trimmed.charCodeAt(0) !== 62) { // not a quote
                tokens[tc++] = this._token(TokenTypes.VECTOR_GROUP_START, i, rawLine, {
                    name: m[1] ? m[1].trim() : null,
                });
                continue;
            }

            // Vector group end: } // group
            if (trimmed.charCodeAt(0) === 125) { // '}'
                if (REGEX.VECTOR_GROUP_END.test(trimmed)) {
                    tokens[tc++] = this._token(TokenTypes.VECTOR_GROUP_END, i, rawLine);
                    continue;
                }
            }

            // Vector layer / artboard / camera
            m = trimmed.match(REGEX.VECTOR_ARTBOARD);
            if (m) {
                tokens[tc++] = this._token(TokenTypes.VECTOR_ARTBOARD, i, rawLine, {
                    name:   m[1],
                    value:  m[2] && m[3] ? `${m[2]}x${m[3]}` : null,
                    config: m[2] || null,
                });
                continue;
            }

            m = trimmed.match(REGEX.VECTOR_LAYER);
            if (m) {
                tokens[tc++] = this._token(TokenTypes.VECTOR_LAYER, i, rawLine, {
                    name:   m[1],
                    trait:  m[2] || null,
                });
                continue;
            }

            // Vector shapes: path: M0,0 L10,10 / circle: r=10 cx=5 cy=5
            m = trimmed.match(REGEX.VECTOR_COMMAND);
            if (m) {
                tokens[tc++] = this._token(TokenTypes.VECTOR_SHAPE, i, rawLine, {
                    vectorType: m[1].toLowerCase(),
                    vectorData: m[2].trim(),
                });
                continue;
            }

            // Tree branches with box-drawing characters
            m = rawLine.match(REGEX.TREE_BRANCH);
            if (m && /[├└│─]/.test(m[1])) {
                tokens[tc++] = this._token(TokenTypes.TREE_BRANCH, i, rawLine, {
                    prefix: m[1],
                    text:   m[2].trim(),
                });
                continue;
            }

            // Column break: ---col---
            if (REGEX.COLUMN_BREAK.test(trimmed)) {
                tokens[tc++] = this._token(TokenTypes.COLUMN_BREAK, i, rawLine);
                continue;
            }

            /* ── §6.4 FALLBACK — plain text ─────────────────────────────────────── */
            tokens[tc++] = this._token(TokenTypes.TEXT, i, rawLine, {
                value: trimmed,
                flags: ZOLTOTokenizer.analyzeInline(trimmed),
            });
        }

        // Trim to actual size — frees pre-allocated slots
        tokens.length = tc;
        return tokens;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       PRIVATE: _tokenizeDiagramLine()
       Specialized sub-tokenizer for content inside diagram blocks.
       Routes to the appropriate domain parser based on diagramType.
    ───────────────────────────────────────────────────────────────────────────────────── */
    _tokenizeDiagramLine(trimmed, rawLine, lineIndex, diagramType) {
        let m;

        // ── FLOWCHART / GRAPH / DIGRAPH ────────────────────────────────────────────────
        if (diagramType === 'flowchart' || diagramType === 'flow' ||
            diagramType === 'graph'     || diagramType === 'digraph') {

            // Subgraph
            m = trimmed.match(REGEX.GRAPH_SUBGRAPH);
            if (m) return this._token(TokenTypes.GRAPH_SUBGRAPH_START, lineIndex, rawLine, {
                id: m[1] || null, label: m[2] || m[1] || null,
            });
            if (REGEX.GRAPH_SUBGRAPH_END.test(trimmed))
                return this._token(TokenTypes.GRAPH_SUBGRAPH_END, lineIndex, rawLine);

            // classDef / style / linkStyle
            m = trimmed.match(REGEX.GRAPH_CLASS_DEF);
            if (m) return this._token(TokenTypes.GRAPH_CLASS_DEF, lineIndex, rawLine, {
                name: m[1], config: m[2].trim(),
            });
            m = trimmed.match(REGEX.GRAPH_STYLE_LINE);
            if (m) return this._token(TokenTypes.GRAPH_STYLE, lineIndex, rawLine, {
                id: m[1], config: m[2].trim(),
            });
            m = trimmed.match(REGEX.GRAPH_LINKSTYLE);
            if (m) return this._token(TokenTypes.GRAPH_STYLE, lineIndex, rawLine, {
                id: m[1], config: m[2].trim(), kind: 'link',
            });

            // Edge (must test before node — edges contain node IDs)
            m = trimmed.match(REGEX.GRAPH_EDGE);
            if (m) return this._token(TokenTypes.GRAPH_EDGE, lineIndex, rawLine, {
                from:      m[1].trim(),
                operator:  m[2],
                edgeLabel: m[3] ? m[3].trim() : null,
                to:        m[4].trim(),
            });

            // Nodes — ordered by specificity (double-bracket before single)
            const nodeToken = this._matchGraphNode(trimmed, rawLine, lineIndex);
            if (nodeToken) return nodeToken;
        }

        // ── SEQUENCE DIAGRAM ──────────────────────────────────────────────────────────
        if (diagramType === 'sequence' || diagramType === 'sequencediagram' || diagramType === 'seq') {

            if (REGEX.SEQUENCE_AUTONUMBER.test(trimmed))
                return this._token(TokenTypes.RAW_LINE, lineIndex, rawLine, { value: trimmed });

            m = trimmed.match(REGEX.SEQUENCE_ACTOR);
            if (m) return this._token(TokenTypes.SEQUENCE_ACTOR, lineIndex, rawLine, {
                id:    m[1],
                alias: m[2] ? m[2].trim() : m[1],
                kind:  trimmed.split(' ')[0].toLowerCase(), // actor|participant|database|…
            });

            m = trimmed.match(REGEX.SEQUENCE_MSG);
            if (m) return this._token(TokenTypes.SEQUENCE_MSG, lineIndex, rawLine, {
                from:      m[1],
                operator:  m[2],
                to:        m[3],
                text:      m[4].trim(),
                flags:     ZOLTOTokenizer.analyzeInline(m[4]),
            });

            m = trimmed.match(REGEX.SEQUENCE_NOTE);
            if (m) return this._token(TokenTypes.SEQUENCE_NOTE, lineIndex, rawLine, {
                kind:  m[1].toLowerCase(), // left|right|over
                id:    m[2],
                text:  m[3].trim(),
                flags: ZOLTOTokenizer.analyzeInline(m[3]),
            });

            m = trimmed.match(REGEX.SEQUENCE_ACTIVATE);
            if (m) return this._token(TokenTypes.SEQUENCE_ACTIVATE, lineIndex, rawLine, {
                kind: m[1].toLowerCase(), // activate|deactivate
                id:   m[2],
            });

            m = trimmed.match(REGEX.SEQUENCE_LOOP);
            if (m) return this._token(TokenTypes.SEQUENCE_LOOP, lineIndex, rawLine, {
                kind:  m[1].toLowerCase(), // loop|alt|opt|par|…
                text:  m[2] ? m[2].trim() : null,
            });

            if (REGEX.SEQUENCE_END.test(trimmed))
                return this._token(TokenTypes.SEQUENCE_LOOP_END, lineIndex, rawLine);
        }

        // ── STATE MACHINE ─────────────────────────────────────────────────────────────
        if (diagramType === 'statechart' || diagramType === 'state' || diagramType === 'statemachine') {

            if (REGEX.STATE_COMPOSITE.test(trimmed))
                return this._token(TokenTypes.STATE_DEF, lineIndex, rawLine, {
                    id: trimmed, kind: 'composite',
                });

            m = trimmed.match(REGEX.STATE_DEF);
            if (m) return this._token(TokenTypes.STATE_DEF, lineIndex, rawLine, {
                text: m[1], id: m[2], config: m[3] || null,
            });

            m = trimmed.match(REGEX.STATE_DEF_SIMPLE);
            if (m) return this._token(TokenTypes.STATE_DEF, lineIndex, rawLine, {
                id: m[1], text: m[1],
            });

            m = trimmed.match(REGEX.STATE_TRANS);
            if (m) return this._token(TokenTypes.STATE_TRANS, lineIndex, rawLine, {
                from:      m[1],
                config:    m[2] || null,
                to:        m[3],
                edgeLabel: m[4] ? m[4].trim() : null,
            });

            m = trimmed.match(REGEX.STATE_NOTE);
            if (m) return this._token(TokenTypes.STATE_NOTE, lineIndex, rawLine, {
                kind: m[1].toLowerCase(),
                id:   m[2],
                text: m[3].trim(),
            });
        }

        // ── ER DIAGRAM ────────────────────────────────────────────────────────────────
        if (diagramType === 'erd' || diagramType === 'entityrelationship' || diagramType === 'erdiagram') {
            m = trimmed.match(REGEX.ER_ENTITY);
            if (m) return this._token(TokenTypes.ER_ENTITY, lineIndex, rawLine, {
                name: m[1],
            });

            m = trimmed.match(REGEX.ER_RELATION);
            if (m) return this._token(TokenTypes.ER_RELATION, lineIndex, rawLine, {
                from:      m[1],
                operator:  m[2],
                to:        m[3],
                edgeLabel: m[4].trim(),
            });
        }

        // ── MINDMAP ───────────────────────────────────────────────────────────────────
        if (diagramType === 'mindmap' || diagramType === 'mind') {
            m = trimmed.match(REGEX.MINDMAP_ROOT);
            if (m) return this._token(TokenTypes.MINDMAP_NODE, lineIndex, rawLine, {
                indent: 0,
                kind:   'root',
                text:   (m[1] || m[2]).trim(),
                flags:  ZOLTOTokenizer.analyzeInline(m[1] || m[2]),
            });

            m = rawLine.match(REGEX.MINDMAP_NODE);
            if (m) return this._token(TokenTypes.MINDMAP_NODE, lineIndex, rawLine, {
                indent: m[1].length,
                bullet: m[2],
                text:   m[3].trim(),
                flags:  ZOLTOTokenizer.analyzeInline(m[3]),
            });
        }

        // ── GANTT ─────────────────────────────────────────────────────────────────────
        if (diagramType === 'gantt') {
            m = trimmed.match(REGEX.GANTT_TITLE);
            if (m) return this._token(TokenTypes.RAW_LINE, lineIndex, rawLine, {
                value: m[1], kind: 'title',
            });

            m = trimmed.match(REGEX.GANTT_SECTION);
            if (m) return this._token(TokenTypes.GANTT_SECTION, lineIndex, rawLine, {
                text: m[1].trim(),
            });

            m = trimmed.match(REGEX.GANTT_TASK);
            if (m) return this._token(TokenTypes.GANTT_TASK, lineIndex, rawLine, {
                text:     m[1].trim(),
                modifier: m[2] || null,  // crit|done|active|milestone
                id:       m[3] || null,
                value:    m[4] ? m[4].trim() : null,  // start
                config:   m[5] ? m[5].trim() : null,  // duration/end
            });
        }

        // ── TIMELINE ──────────────────────────────────────────────────────────────────
        if (diagramType === 'timeline') {
            m = trimmed.match(REGEX.TIMELINE_TITLE);
            if (m) return this._token(TokenTypes.RAW_LINE, lineIndex, rawLine, {
                value: m[1], kind: 'title',
            });

            m = trimmed.match(REGEX.TIMELINE_PERIOD);
            if (m) return this._token(TokenTypes.TIMELINE_PERIOD, lineIndex, rawLine, {
                period: m[1].trim(),
            });

            m = rawLine.match(REGEX.TIMELINE_EVENT);
            if (m && rawLine.match(/^\s{2,}/)) {
                return this._token(TokenTypes.TIMELINE_EVENT, lineIndex, rawLine, {
                    text:   m[1].trim(),
                    label:  m[2] ? m[2].trim() : null,
                    flags:  ZOLTOTokenizer.analyzeInline(m[1]),
                });
            }
        }

        // ── TREE ──────────────────────────────────────────────────────────────────────
        if (diagramType === 'tree') {
            m = rawLine.match(REGEX.TREE_BRANCH);
            if (m) return this._token(TokenTypes.TREE_BRANCH, lineIndex, rawLine, {
                prefix: m[1],
                text:   m[2].trim(),
            });

            m = rawLine.match(REGEX.MINDMAP_NODE);
            if (m) return this._token(TokenTypes.MINDMAP_NODE, lineIndex, rawLine, {
                indent: m[1].length,
                bullet: m[2],
                text:   m[3].trim(),
            });
        }

        // ── UNIVERSAL FALLBACK inside diagram ─────────────────────────────────────────
        // Still try generic graph edge / node for flexible diagram types
        m = trimmed.match(REGEX.GRAPH_EDGE);
        if (m) return this._token(TokenTypes.GRAPH_EDGE, lineIndex, rawLine, {
            from:      m[1].trim(),
            operator:  m[2],
            edgeLabel: m[3] ? m[3].trim() : null,
            to:        m[4].trim(),
        });

        const nodeToken = this._matchGraphNode(trimmed, rawLine, lineIndex);
        if (nodeToken) return nodeToken;

        return this._token(TokenTypes.RAW_LINE, lineIndex, rawLine, { value: rawLine });
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       PRIVATE: _matchGraphNode()
       Ordered by shape specificity (double-bracket/paren before single).
    ───────────────────────────────────────────────────────────────────────────────────── */
    _matchGraphNode(trimmed, rawLine, lineIndex) {
        let m;

        m = trimmed.match(REGEX.GRAPH_NODE_CIRCLE);  // ((…))
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'circle', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_HEX);     // {{…}}
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'hexagon', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_SUBRTN);  // [[…]]
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'subroutine', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_STADIUM); // ([…])
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'stadium', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_RECT);    // […]
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'rect', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_ROUND);   // (…)
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'round', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_DIAMOND); // {…}
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'diamond', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_ASYMM);   // >…]
        if (m) return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
            id: m[1], label: m[2], kind: 'asymm', cssClass: m[3] || null,
        });

        m = trimmed.match(REGEX.GRAPH_NODE_PLAIN);   // plain ID
        if (m && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(m[1])) {
            return this._token(TokenTypes.GRAPH_NODE, lineIndex, rawLine, {
                id: m[1], label: m[1], kind: 'plain', cssClass: m[2] || null,
            });
        }

        return null;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       STATIC: analyzeInline(text)
       Single-pass charcode scanner — detects inline content types and returns a bitmask.
       False positives are OK (renderer wastes ~1 parse). False negatives break rendering.
    ───────────────────────────────────────────────────────────────────────────────────── */
    static analyzeInline(text) {
        if (!text || text.length < 2) return InlineFlags.NONE;

        let flags = 0;
        const len = text.length;

        for (let i = 0; i < len; i++) {
            const c = text.charCodeAt(i);

            switch (c) {
                case 36:  // '$' — math $…$ or $$…$$
                    flags |= InlineFlags.MATH;
                    break;

                case 42:  // '*' — bold **…** or italic *…*
                    flags |= (i + 1 < len && text.charCodeAt(i + 1) === 42)
                        ? InlineFlags.BOLD
                        : InlineFlags.ITALIC;
                    break;

                case 95:  // '_' — bold __…__ or italic _…_
                    flags |= (i + 1 < len && text.charCodeAt(i + 1) === 95)
                        ? InlineFlags.BOLD
                        : InlineFlags.ITALIC;
                    break;

                case 96:  // '`' — code span
                    flags |= InlineFlags.CODE_SPAN;
                    break;

                case 91:  // '[' — link or footnote ref [^…]
                    flags |= (i + 1 < len && text.charCodeAt(i + 1) === 94)
                        ? InlineFlags.FOOTNOTE_REF
                        : InlineFlags.LINK;
                    break;

                case 33:  // '!' — inline image ![…](…)
                    if (i + 1 < len && text.charCodeAt(i + 1) === 91)
                        flags |= InlineFlags.IMAGE_INLINE;
                    break;

                case 61:  // '=' — highlight ==…==
                    if (i + 1 < len && text.charCodeAt(i + 1) === 61)
                        flags |= InlineFlags.HIGHLIGHT;
                    break;

                case 126: // '~' — strikethrough ~~…~~ or subscript ~…~
                    flags |= (i + 1 < len && text.charCodeAt(i + 1) === 126)
                        ? InlineFlags.STRIKETHROUGH
                        : InlineFlags.SUBSCRIPT;
                    break;

                case 94:  // '^' — superscript
                    flags |= InlineFlags.SUPERSCRIPT;
                    break;

                case 60:  // '<' — underline <u> or raw HTML
                    if (i + 2 < len &&
                        text.charCodeAt(i + 1) === 117 && // 'u'
                        text.charCodeAt(i + 2) === 62)    // '>'
                        flags |= InlineFlags.UNDERLINE;
                    else if (i + 1 < len && text.charCodeAt(i + 1) !== 32)
                        flags |= InlineFlags.RAW_HTML;
                    break;

                case 64:  // '@' — mention @user
                    if (i + 1 < len && text.charCodeAt(i + 1) > 64) // letter follows
                        flags |= InlineFlags.MENTION;
                    break;

                case 123: // '{' — variable ref {$var}
                    if (i + 1 < len && text.charCodeAt(i + 1) === 36) // '$'
                        flags |= InlineFlags.VARIABLE_REF;
                    break;

                case 58:  // ':' — emoji :name: (must have letter following)
                    if (i + 1 < len) {
                        const nc = text.charCodeAt(i + 1);
                        if ((nc >= 97 && nc <= 122) || (nc >= 65 && nc <= 90))
                            flags |= InlineFlags.EMOJI;
                    }
                    break;

                case 34:  // '"' or "'" — smart quotes (context-aware typography)
                case 39:
                    flags |= InlineFlags.SMART_QUOTE;
                    break;
            }
        }

        return flags;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       PRIVATE: _token()
       Monomorphic token factory — property assignment order is ALWAYS identical.
       This guarantees a single V8 Hidden Class for all ZoltoToken instances.
    ───────────────────────────────────────────────────────────────────────────────────── */
    _token(type, lineIndex, rawStr, payload = null) {
        const t = new ZoltoToken(type, lineIndex, rawStr);
        if (payload === null) return t;

        // Assign only defined payload keys — never conditionally add keys to avoid IC splits
        if (payload.value         !== undefined) t.value         = payload.value;
        if (payload.text          !== undefined) t.text          = payload.text;
        if (payload.label         !== undefined) t.label         = payload.label;
        if (payload.lang          !== undefined) t.lang          = payload.lang;
        if (payload.content       !== undefined) t.content       = payload.content;
        if (payload.config        !== undefined) t.config        = payload.config;
        if (payload.directive     !== undefined) t.directive     = payload.directive;
        if (payload.args          !== undefined) t.args          = payload.args;
        if (payload.blockType     !== undefined) t.blockType     = payload.blockType;
        if (payload.params        !== undefined) t.params        = payload.params;
        if (payload.url           !== undefined) t.url           = payload.url;
        if (payload.embedType     !== undefined) t.embedType     = payload.embedType;
        if (payload.componentName !== undefined) t.componentName = payload.componentName;
        if (payload.props         !== undefined) t.props         = payload.props;
        if (payload.slotName      !== undefined) t.slotName      = payload.slotName;
        if (payload.vectorType    !== undefined) t.vectorType    = payload.vectorType;
        if (payload.vectorData    !== undefined) t.vectorData    = payload.vectorData;
        if (payload.chartType     !== undefined) t.chartType     = payload.chartType;
        if (payload.id            !== undefined) t.id            = payload.id;
        if (payload.trait         !== undefined) t.trait         = payload.trait;
        if (payload.operator      !== undefined) t.operator      = payload.operator;
        if (payload.target        !== undefined) t.target        = payload.target;
        if (payload.bullet        !== undefined) t.bullet        = payload.bullet;
        if (payload.prefix        !== undefined) t.prefix        = payload.prefix;
        if (payload.key           !== undefined) t.key           = payload.key;
        if (payload.name          !== undefined) t.name          = payload.name;
        if (payload.alias         !== undefined) t.alias         = payload.alias;
        if (payload.kind          !== undefined) t.kind          = payload.kind;
        if (payload.diagramType   !== undefined) t.diagramType   = payload.diagramType;
        if (payload.dir           !== undefined) t.dir           = payload.dir;
        if (payload.modifier      !== undefined) t.modifier      = payload.modifier;
        if (payload.from          !== undefined) t.from          = payload.from;
        if (payload.to            !== undefined) t.to            = payload.to;
        if (payload.edgeLabel     !== undefined) t.edgeLabel     = payload.edgeLabel;
        if (payload.calloutType   !== undefined) t.calloutType   = payload.calloutType;
        if (payload.cssClass      !== undefined) t.cssClass      = payload.cssClass;
        if (payload.attrName      !== undefined) t.attrName      = payload.attrName;
        if (payload.attrType      !== undefined) t.attrType      = payload.attrType;
        if (payload.attrKey       !== undefined) t.attrKey       = payload.attrKey;
        if (payload.attrComment   !== undefined) t.attrComment   = payload.attrComment;
        if (payload.period        !== undefined) t.period        = payload.period;
        if (payload.level         !== undefined) t.level         = payload.level;
        if (payload.indent        !== undefined) t.indent        = payload.indent;
        if (payload.number        !== undefined) t.number        = payload.number;
        if (payload.flags         !== undefined) t.flags         = payload.flags;
        if (payload.checked       !== undefined) t.checked       = payload.checked;
        if (payload.ordered       !== undefined) t.ordered       = payload.ordered;

        return t;
    }
}
