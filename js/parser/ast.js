/**
 * js/parser/ast.js
 * Zolto v8.1.0 — AST Node Factory & Type System
 *
 * Single source of truth for all AST node shapes.
 * Every node must be created via ASTFactory — never raw objects.
 *
 * Rules (enforced by ESLint no-restricted-syntax):
 *  1. Always use ASTFactory — never plain object literals with a `type` key
 *  2. Every node has the same property keys in the same order (Hidden Class)
 *  3. Optional fields default to null (never absent)
 *  4. Collection fields are always [] (never null)
 *  5. node.inline and node.ast start as null (filled by transformer)
 */

'use strict';

import { hexId } from '../utils/helpers.js';

// ─────────────────────────────────────────────────────────────
// 1. Node Type Enums
// ─────────────────────────────────────────────────────────────

export const ZOLTONodeTypes = Object.freeze({
  // Document
  DOCUMENT:       'Document',

  // Domain 1 — Markdown & Typography
  HEADING:        'Heading',
  PARAGRAPH:      'Paragraph',
  BLOCKQUOTE:     'Blockquote',
  HORIZONTAL_RULE: 'HorizontalRule',
  LIST:           'List',
  LIST_ITEM:      'ListItem',
  DEFINITION_LIST: 'DefinitionList',
  DEFINITION_TERM: 'DefinitionTerm',
  DEFINITION_DESC: 'DefinitionDesc',
  TABLE:          'Table',
  TABLE_ROW:      'TableRow',
  TABLE_CELL:     'TableCell',
  CODE_BLOCK:     'CodeBlock',
  CALLOUT:        'Callout',
  ADMONITION:     'Admonition',
  DETAILS:        'Details',
  ACCORDION:      'Accordion',
  ACCORDION_ITEM: 'AccordionItem',
  TABS:           'Tabs',
  TAB:            'Tab',
  CARD:           'Card',
  CARD_GROUP:     'CardGroup',
  STEPS:          'Steps',
  STEP:           'Step',
  COLUMNS:        'Columns',
  HERO:           'Hero',
  EMBED:          'Embed',
  FOOTNOTE:       'Footnote',
  FOOTNOTE_DEF:   'FootnoteDef',
  BANNER:         'Banner',
  COMMENT:        'Comment',

  // Domain 2 — Mathematics
  MATH_BLOCK:     'MathBlock',
  MATH_INLINE:    'MathInline',

  // Domain 3 — Diagrams
  DIAGRAM:        'Diagram',
  DIAGRAM_NODE:   'DiagramNode',
  DIAGRAM_EDGE:   'DiagramEdge',

  // Domain 4 — Vector / SVG
  VECTOR_SCENE:   'VectorScene',
  VECTOR_LAYER:   'VectorLayer',
  VECTOR_SHAPE:   'VectorShape',

  // Domain 5 — Layouts
  GRID:           'Grid',
  FLEX:           'Flex',
  CANVAS:         'Canvas',
  WHITEBOARD:     'Whiteboard',
  PRESENTATION:   'Presentation',
  SLIDE:          'Slide',
  SPLIT:          'Split',
  PANEL:          'Panel',

  // Domain 6 — Components
  COMPONENT_DEF:  'ComponentDef',
  COMPONENT_USE:  'ComponentUse',
  SLOT_DEF:       'SlotDef',
  SLOT_OUTLET:    'SlotOutlet',
  MACRO_DEF:      'MacroDef',
  MACRO_USE:      'MacroUse',
  TEMPLATE_DEF:   'TemplateDef',
  ANIMATION_DEF:  'AnimationDef',
  THEME_BLOCK:    'ThemeBlock',
  IMPORT:         'Import',

  // Assessment
  MCQ:            'MCQ',
  MCQ_OPTION:     'MCQOption',
  FLASHCARD:      'Flashcard',
  QUIZ:           'Quiz',

  // Charts
  CHART:          'Chart',

  // Error
  ERROR_NODE:     'ErrorNode',
});

// ─────────────────────────────────────────────────────────────
// 2. Supporting Enums
// ─────────────────────────────────────────────────────────────

export const ZOLTODiagramTypes = Object.freeze({
  FLOWCHART:    'flowchart',
  SEQUENCE:     'sequence',
  STATE:        'state',
  ERD:          'erd',
  MINDMAP:      'mindmap',
  GANTT:        'gantt',
  TIMELINE:     'timeline',
  NETWORK:      'network',
  ARCHITECTURE: 'architecture',
  DEPENDENCY:   'dependency',
  TREE:         'tree',
  PIPELINE:     'pipeline',
  KANBAN:       'kanban',
  GEOMETRY:     'geometry',
  CIRCUIT:      'circuit',
  ATOM:         'atom',
  GRAMMAR_TREE: 'grammar-tree',
  CHEMISTRY:    'chemistry',
});

export const ZOLTOChartTypes = Object.freeze({
  PIE:       'pie',
  DONUT:     'donut',
  BAR:       'bar',
  LINE:      'line',
  AREA:      'area',
  SCATTER:   'scatter',
  RADAR:     'radar',
  GAUGE:     'gauge',
  WATERFALL: 'waterfall',
  HEATMAP:   'heatmap',
  SANKEY:    'sankey',
  FUNNEL:    'funnel',
  TREEMAP:   'treemap',
  BUBBLE:    'bubble',
  POLAR:     'polar',
  QUADRANT:  'quadrant',
});

export const ZOLTOEdgeOperators = Object.freeze({
  ARROW:         '-->',
  ARROW_DASHED:  '-.->',
  ARROW_THICK:   '==>',
  ARROW_DOT:     '..>',
  LINE:          '---',
  LINE_DASHED:   '-.-',
  BIDIR:         '<-->',
  BIDIR_DASHED:  '<-.->',
  OPEN:          '---',
});

export const ZOLTOShapeTypes = Object.freeze({
  RECTANGLE:  'Rectangle',
  CIRCLE:     'Circle',
  DIAMOND:    'Diamond',
  HEXAGON:    'Hexagon',
  CYLINDER:   'Cylinder',
  STADIUM:    'Stadium',
  SUBPROCESS: 'Subprocess',
  CLOUD:      'Cloud',
  PARALLELOGRAM: 'Parallelogram',
  TRAPEZOID:  'Trapezoid',
  DOCUMENT:   'Document',
  MANUAL:     'Manual',
});

export const ZOLTOInlineTypes = Object.freeze({
  TEXT:         'text',
  BOLD:         'bold',
  ITALIC:       'italic',
  BOLD_ITALIC:  'boldItalic',
  CODE:         'code',
  MATH:         'math',
  LINK:         'link',
  IMAGE:        'image',
  FOOTNOTE_REF: 'footnoteRef',
  HIGHLIGHT:    'highlight',
  STRIKETHROUGH:'strikethrough',
  SUPERSCRIPT:  'superscript',
  SUBSCRIPT:    'subscript',
  UNDERLINE:    'underline',
  MENTION:      'mention',
  HASHTAG:      'hashtag',
  EMOJI:        'emoji',
  VARIABLE_REF: 'variableRef',
  COLOR:        'color',
  LINE_BREAK:   'lineBreak',
  SOFT_BREAK:   'softBreak',
});

// ─────────────────────────────────────────────────────────────
// 3. ID Generator
// ─────────────────────────────────────────────────────────────

/** Generate a unique AST node ID. */
const genId = () => `n_${hexId(6)}`;


// ─────────────────────────────────────────────────────────────
// 4. ASTFactory
//    All node constructors in one class.
//    Property order is FIXED — do not reorder within any method.
//    Adding new fields: append at end with null default.
// ─────────────────────────────────────────────────────────────

export class ASTFactory {

  // ── Document ─────────────────────────────────────────────

  static createDocument() {
    return {
      type:        ZOLTONodeTypes.DOCUMENT,
      id:          genId(),
      version:     '8.1.0',
      nodes:       [],
      frontmatter: {},
      variables:   {},
      imports:     [],
      references:  {},
      footnotes:   {},
      mathIndex:   {},
      components:  {},
      animations:  {},
      themes:      {},
    };
  }

  // ── Domain 1: Markdown & Typography ──────────────────────

  static createHeading(id, line, text, inline) {
    return {
      type:    ZOLTONodeTypes.HEADING,
      id:      id ?? genId(),
      line,
      level:   1,
      text,
      inline,
      anchor:  null,
      classes: [],
      attrs:   {},
      flags:   0,
    };
  }

  static createParagraph(id, line, text, inline) {
    return {
      type:    ZOLTONodeTypes.PARAGRAPH,
      id:      id ?? genId(),
      line,
      text,
      inline,
      classes: [],
      attrs:   {},
      flags:   0,
    };
  }

  static createBlockquote(id, line, children) {
    return {
      type:     ZOLTONodeTypes.BLOCKQUOTE,
      id:       id ?? genId(),
      line,
      children: children ?? [],
      classes:  [],
      attrs:    {},
    };
  }

  static createHorizontalRule(id, line) {
    return {
      type:    ZOLTONodeTypes.HORIZONTAL_RULE,
      id:      id ?? genId(),
      line,
      classes: [],
      attrs:   {},
    };
  }

  static createList(id, line, ordered, children) {
    return {
      type:     ZOLTONodeTypes.LIST,
      id:       id ?? genId(),
      line,
      ordered:  ordered ?? false,
      tight:    true,
      children: children ?? [],
      classes:  [],
      attrs:    {},
    };
  }

  static createListItem(id, line, text, inline, children) {
    return {
      type:     ZOLTONodeTypes.LIST_ITEM,
      id:       id ?? genId(),
      line,
      text,
      inline,
      checked:  null,   // null = not a checklist; true/false = checked state
      children: children ?? [],
      classes:  [],
      attrs:    {},
      flags:    0,
    };
  }

  static createTable(id, line, headers, rows, caption, align) {
    return {
      type:    ZOLTONodeTypes.TABLE,
      id:      id ?? genId(),
      line,
      headers: headers ?? [],
      rows:    rows    ?? [],
      caption: caption ?? null,
      align:   align   ?? [],
      classes: [],
      attrs:   {},
    };
  }

  static createCodeBlock(id, line, code, lang, config) {
    return {
      type:    ZOLTONodeTypes.CODE_BLOCK,
      id:      id ?? genId(),
      line,
      code,
      lang:    lang   ?? null,
      config:  config ?? {},
      classes: [],
      attrs:   {},
    };
  }

  static createCallout(id, line, calloutType, text, inline, title, children) {
    return {
      type:         ZOLTONodeTypes.CALLOUT,
      id:           id ?? genId(),
      line,
      calloutType,
      text,
      inline,
      title:        title    ?? null,
      children:     children ?? [],
      classes:      [],
      attrs:        {},
      flags:        0,
    };
  }

  static createAdmonition(id, line, admonitionType, title, children) {
    return {
      type:            ZOLTONodeTypes.ADMONITION,
      id:              id ?? genId(),
      line,
      admonitionType,
      title:           title    ?? null,
      children:        children ?? [],
      classes:         [],
      attrs:           {},
    };
  }

  static createDetails(id, line, summary, children, open) {
    return {
      type:     ZOLTONodeTypes.DETAILS,
      id:       id ?? genId(),
      line,
      summary,
      children: children ?? [],
      open:     open ?? false,
      classes:  [],
      attrs:    {},
    };
  }

  static createTabs(id, line, tabs, variant) {
    return {
      type:    ZOLTONodeTypes.TABS,
      id:      id ?? genId(),
      line,
      tabs:    tabs ?? [],
      variant: variant ?? 'underline',
      classes: [],
      attrs:   {},
    };
  }

  static createTab(id, line, label, icon, children) {
    return {
      type:     ZOLTONodeTypes.TAB,
      id:       id ?? genId(),
      line,
      label,
      icon:     icon ?? null,
      children: children ?? [],
      attrs:    {},
    };
  }

  static createCard(id, line, variant, title, icon, href, children) {
    return {
      type:     ZOLTONodeTypes.CARD,
      id:       id ?? genId(),
      line,
      variant:  variant  ?? 'default',
      title:    title    ?? null,
      icon:     icon     ?? null,
      href:     href     ?? null,
      children: children ?? [],
      classes:  [],
      attrs:    {},
    };
  }

  static createCardGroup(id, line, columns, children) {
    return {
      type:     ZOLTONodeTypes.CARD_GROUP,
      id:       id ?? genId(),
      line,
      columns:  columns  ?? 3,
      children: children ?? [],
      classes:  [],
      attrs:    {},
    };
  }

  static createSteps(id, line, children) {
    return {
      type:     ZOLTONodeTypes.STEPS,
      id:       id ?? genId(),
      line,
      children: children ?? [],
      classes:  [],
      attrs:    {},
    };
  }

  static createStep(id, line, title, inline, children) {
    return {
      type:     ZOLTONodeTypes.STEP,
      id:       id ?? genId(),
      line,
      title,
      inline,
      children: children ?? [],
      status:   null,
      attrs:    {},
      flags:    0,
    };
  }

  static createEmbed(id, line, src, embedType, alt, caption, config) {
    return {
      type:      ZOLTONodeTypes.EMBED,
      id:        id ?? genId(),
      line,
      src,
      embedType: embedType ?? 'image',
      alt:       alt       ?? null,
      caption:   caption   ?? null,
      config:    config    ?? {},
      classes:   [],
      attrs:     {},
    };
  }

  static createHero(id, line, variant, children, config) {
    return {
      type:     ZOLTONodeTypes.HERO,
      id:       id ?? genId(),
      line,
      variant:  variant  ?? 'default',
      children: children ?? [],
      config:   config   ?? {},
      classes:  [],
      attrs:    {},
    };
  }

  static createFootnote(id, line, label, inline, children) {
    return {
      type:     ZOLTONodeTypes.FOOTNOTE,
      id:       id ?? genId(),
      line,
      label,
      number:   null,
      inline,
      children: children ?? [],
      attrs:    {},
      flags:    0,
    };
  }

  // ── Domain 2: Mathematics ─────────────────────────────────

  static createMathBlock(id, line, content, env, display, numbered, label, title) {
    return {
      type:     ZOLTONodeTypes.MATH_BLOCK,
      id:       id ?? genId(),
      line,
      content,
      env:      env      ?? 'equation',
      display:  display  ?? 'block',
      numbered: numbered ?? false,
      label:    label    ?? null,
      number:   null,
      title:    title    ?? null,
      ast:      null,        // MathAST — filled by transformer
      config:   {},
      classes:  [],
      attrs:    {},
    };
  }

  static createMathInline(id, line, content) {
    return {
      type:    ZOLTONodeTypes.MATH_INLINE,
      id:      id ?? genId(),
      line,
      content,
      ast:     null,
      attrs:   {},
    };
  }

  // ── Domain 3: Diagrams ────────────────────────────────────

  static createDiagram(id, line, diagramType, nodes, edges, config) {
    return {
      type:        ZOLTONodeTypes.DIAGRAM,
      id:          id ?? genId(),
      line,
      diagramType: diagramType ?? 'flowchart',
      nodes:       nodes  ?? [],
      edges:       edges  ?? [],
      config:      config ?? {},
      caption:     null,
      classes:     [],
      attrs:       {},
    };
  }

  static createDiagramNode(id, nodeId, label, shape, traits, config) {
    return {
      type:    ZOLTONodeTypes.DIAGRAM_NODE,
      id:      id ?? genId(),
      nodeId,
      label,
      shape:   shape  ?? 'Rectangle',
      traits:  traits ?? [],
      config:  config ?? {},
      attrs:   {},
    };
  }

  static createDiagramEdge(id, from, to, label, operator, config) {
    return {
      type:     ZOLTONodeTypes.DIAGRAM_EDGE,
      id:       id ?? genId(),
      from,
      to,
      label:    label    ?? null,
      operator: operator ?? '-->',
      config:   config   ?? {},
      attrs:    {},
    };
  }

  // ── Domain 4: Vector ──────────────────────────────────────

  static createVectorScene(id, line, width, height, layers, config) {
    return {
      type:    ZOLTONodeTypes.VECTOR_SCENE,
      id:      id ?? genId(),
      line,
      width:   width  ?? 800,
      height:  height ?? 600,
      layers:  layers ?? [],
      config:  config ?? {},
      classes: [],
      attrs:   {},
    };
  }

  static createVectorShape(id, shapeType, props, config) {
    return {
      type:      ZOLTONodeTypes.VECTOR_SHAPE,
      id:        id ?? genId(),
      shapeType: shapeType ?? 'rect',
      props:     props  ?? {},
      config:    config ?? {},
      attrs:     {},
    };
  }

  // ── Domain 5: Layouts ─────────────────────────────────────

  static createGrid(id, line, children, config) {
    return {
      type:     ZOLTONodeTypes.GRID,
      id:       id ?? genId(),
      line,
      children: children ?? [],
      config:   config   ?? { cols: 3, gap: '1rem' },
      classes:  [],
      attrs:    {},
    };
  }

  static createFlex(id, line, children, config) {
    return {
      type:     ZOLTONodeTypes.FLEX,
      id:       id ?? genId(),
      line,
      children: children ?? [],
      config:   config   ?? { direction: 'row', gap: '1rem' },
      classes:  [],
      attrs:    {},
    };
  }

  static createPresentation(id, line, slides, config) {
    return {
      type:    ZOLTONodeTypes.PRESENTATION,
      id:      id ?? genId(),
      line,
      slides:  slides ?? [],
      config:  config ?? {},
      classes: [],
      attrs:   {},
    };
  }

  static createSlide(id, line, layout, children, config) {
    return {
      type:     ZOLTONodeTypes.SLIDE,
      id:       id ?? genId(),
      line,
      layout:   layout   ?? 'default',
      children: children ?? [],
      config:   config   ?? {},
      classes:  [],
      attrs:    {},
    };
  }

  static createPanel(id, line, title, children, config) {
    return {
      type:      ZOLTONodeTypes.PANEL,
      id:        id ?? genId(),
      line,
      title:     title    ?? null,
      children:  children ?? [],
      collapsed: false,
      config:    config   ?? {},
      classes:   [],
      attrs:     {},
    };
  }

  // ── Domain 6: Components ──────────────────────────────────

  static createComponentDef(id, line, name, propsString, children) {
    return {
      type:        ZOLTONodeTypes.COMPONENT_DEF,
      id:          id ?? genId(),
      line,
      name,
      propsString: propsString ?? '',
      parsedProps: {},
      children:    children ?? [],
      slots:       {},
      attrs:       {},
    };
  }

  static createComponentUse(id, line, componentName, propsString, children, slots) {
    return {
      type:          ZOLTONodeTypes.COMPONENT_USE,
      id:            id ?? genId(),
      line,
      componentName,
      propsString:   propsString ?? '',
      parsedProps:   {},
      children:      children   ?? [],
      slots:         slots      ?? {},
      attrs:         {},
    };
  }

  static createSlotDef(id, line, name, children) {
    return {
      type:     ZOLTONodeTypes.SLOT_DEF,
      id:       id ?? genId(),
      line,
      name:     name ?? 'default',
      children: children ?? [],
      attrs:    {},
    };
  }

  static createThemeBlock(id, line, name, tokens) {
    return {
      type:   ZOLTONodeTypes.THEME_BLOCK,
      id:     id ?? genId(),
      line,
      name,
      tokens: tokens ?? {},
      attrs:  {},
    };
  }

  static createImport(id, line, src, alias) {
    return {
      type:  ZOLTONodeTypes.IMPORT,
      id:    id ?? genId(),
      line,
      src,
      alias: alias ?? null,
      attrs: {},
    };
  }

  // ── Assessment ────────────────────────────────────────────

  static createMCQ(id, line, question, options, explanation, config) {
    return {
      type:        ZOLTONodeTypes.MCQ,
      id:          id ?? genId(),
      line,
      question,
      options:     options     ?? [],
      explanation: explanation ?? null,
      config:      config      ?? {},
      classes:     [],
      attrs:       {},
    };
  }

  static createMCQOption(id, line, text, correct) {
    return {
      type:    ZOLTONodeTypes.MCQ_OPTION,
      id:      id ?? genId(),
      line,
      text,
      correct: correct ?? false,
      attrs:   {},
    };
  }

  static createFlashcard(id, line, front, back, config) {
    return {
      type:   ZOLTONodeTypes.FLASHCARD,
      id:     id ?? genId(),
      line,
      front,
      back,
      config: config ?? {},
      attrs:  {},
    };
  }

  // ── Charts ────────────────────────────────────────────────

  static createChart(id, line, chartType, data, config) {
    return {
      type:      ZOLTONodeTypes.CHART,
      id:        id ?? genId(),
      line,
      chartType: chartType ?? 'bar',
      data:      data   ?? {},
      config:    config ?? {},
      caption:   null,
      classes:   [],
      attrs:     {},
    };
  }

  // ── Error ─────────────────────────────────────────────────

  static createErrorNode(code, line, message, context) {
    return {
      type:     ZOLTONodeTypes.ERROR_NODE,
      id:       genId(),
      line,
      code,
      message,
      context:  context ?? null,
      classes:  [],
      attrs:    {},
    };
  }
}


// ─────────────────────────────────────────────────────────────
// 5. InlineParser
//    Converts a text string + InlineFlags into InlineNode[].
//    Called by the transformer on each node with inline content.
// ─────────────────────────────────────────────────────────────

/** InlineFlags bitmask constants */
export const InlineFlags = Object.freeze({
  HAS_BOLD:    0x0001,
  HAS_ITALIC:  0x0002,
  HAS_CODE:    0x0004,
  HAS_MATH:    0x0008,
  HAS_LINK:    0x0010,
  HAS_IMG:     0x0020,
  HAS_MENTION: 0x0040,
  HAS_EMOJI:   0x0080,
  HAS_VAR:     0x0100,
  HAS_COLOR:   0x0200,
  HAS_SPECIAL: 0x0400,
});

export class InlineParser {
  /**
   * Parse inline text into InlineNode[].
   * Fast-path: if flags === 0, returns a single TextNode.
   * @param {string} text
   * @param {number} flags   — InlineFlags bitmask
   * @returns {import('./types').InlineNode[]}
   */
  static parse(text, flags = 0) {
    if (!text) return [];

    // Fast path — plain text, no markers
    if (flags === 0) {
      return [{ type: ZOLTOInlineTypes.TEXT, text }];
    }

    const nodes = [];
    let   i     = 0;
    let   buf   = '';

    const flush = () => {
      if (buf) { nodes.push({ type: ZOLTOInlineTypes.TEXT, text: buf }); buf = ''; }
    };

    while (i < text.length) {
      const ch   = text[i];
      const ch2  = text[i + 1];
      const ch3  = text[i + 2];

      // ── Bold-italic ***...*** ──
      if (ch === '*' && ch2 === '*' && ch3 === '*' && (flags & InlineFlags.HAS_BOLD)) {
        const end = text.indexOf('***', i + 3);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.BOLD_ITALIC, text: text.slice(i + 3, end), children: [] });
          i = end + 3; continue;
        }
      }

      // ── Bold **...** ──
      if (ch === '*' && ch2 === '*' && (flags & InlineFlags.HAS_BOLD)) {
        const end = text.indexOf('**', i + 2);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.BOLD, text: text.slice(i + 2, end), children: [] });
          i = end + 2; continue;
        }
      }

      // ── Italic *...* ──
      if (ch === '*' && ch2 !== '*' && (flags & InlineFlags.HAS_ITALIC)) {
        const end = text.indexOf('*', i + 1);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.ITALIC, text: text.slice(i + 1, end), children: [] });
          i = end + 1; continue;
        }
      }

      // ── Strikethrough ~~...~~ ──
      if (ch === '~' && ch2 === '~' && (flags & InlineFlags.HAS_SPECIAL)) {
        const end = text.indexOf('~~', i + 2);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.STRIKETHROUGH, text: text.slice(i + 2, end) });
          i = end + 2; continue;
        }
      }

      // ── Highlight ==...== ──
      if (ch === '=' && ch2 === '=' && (flags & InlineFlags.HAS_SPECIAL)) {
        const end = text.indexOf('==', i + 2);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.HIGHLIGHT, text: text.slice(i + 2, end) });
          i = end + 2; continue;
        }
      }

      // ── Superscript ^...^ ──
      if (ch === '^' && (flags & InlineFlags.HAS_SPECIAL)) {
        const end = text.indexOf('^', i + 1);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.SUPERSCRIPT, text: text.slice(i + 1, end) });
          i = end + 1; continue;
        }
      }

      // ── Subscript ~...~ ──
      if (ch === '~' && ch2 !== '~' && (flags & InlineFlags.HAS_SPECIAL)) {
        const end = text.indexOf('~', i + 1);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.SUBSCRIPT, text: text.slice(i + 1, end) });
          i = end + 1; continue;
        }
      }

      // ── Inline code `...` ──
      if (ch === '`' && (flags & InlineFlags.HAS_CODE)) {
        const end = text.indexOf('`', i + 1);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.CODE, text: text.slice(i + 1, end) });
          i = end + 1; continue;
        }
      }

      // ── Inline math <m>...</m> ──
      if (ch === '<' && text.slice(i, i + 3) === '<m>' && (flags & InlineFlags.HAS_MATH)) {
        const end = text.indexOf('</m>', i + 3);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.MATH, text: text.slice(i + 3, end), ast: null });
          i = end + 4; continue;
        }
      }

      // ── Link [...](url) ──
      if (ch === '[' && (flags & InlineFlags.HAS_LINK)) {
        const closeBracket = text.indexOf(']', i + 1);
        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2);
          if (closeParen !== -1) {
            flush();
            const linkText = text.slice(i + 1, closeBracket);
            const href     = text.slice(closeBracket + 2, closeParen);
            nodes.push({ type: ZOLTOInlineTypes.LINK, text: linkText, href, title: null });
            i = closeParen + 1; continue;
          }
        }
      }

      // ── Image ![alt](url) ──
      if (ch === '!' && ch2 === '[' && (flags & InlineFlags.HAS_IMG)) {
        const closeBracket = text.indexOf(']', i + 2);
        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2);
          if (closeParen !== -1) {
            flush();
            const alt = text.slice(i + 2, closeBracket);
            const src = text.slice(closeBracket + 2, closeParen);
            nodes.push({ type: ZOLTOInlineTypes.IMAGE, text: alt, src, title: null });
            i = closeParen + 1; continue;
          }
        }
      }

      // ── Mention @word ──
      if (ch === '@' && (flags & InlineFlags.HAS_MENTION)) {
        const match = text.slice(i + 1).match(/^[\w.-]+/);
        if (match) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.MENTION, text: match[0] });
          i += 1 + match[0].length; continue;
        }
      }

      // ── Variable ref {$name} ──
      if (ch === '{' && ch2 === '$' && (flags & InlineFlags.HAS_VAR)) {
        const end = text.indexOf('}', i + 2);
        if (end !== -1) {
          flush();
          nodes.push({ type: ZOLTOInlineTypes.VARIABLE_REF, name: text.slice(i + 2, end), text: '' });
          i = end + 1; continue;
        }
      }

      // ── Hard line break (two spaces + \n) ──
      if (ch === ' ' && ch2 === ' ' && text[i + 2] === '\n') {
        flush();
        nodes.push({ type: ZOLTOInlineTypes.LINE_BREAK });
        i += 3; continue;
      }

      // ── Soft break \n ──
      if (ch === '\n') {
        flush();
        nodes.push({ type: ZOLTOInlineTypes.SOFT_BREAK });
        i++; continue;
      }

      buf += ch;
      i++;
    }

    flush();
    return nodes;
  }
}


// ─────────────────────────────────────────────────────────────
// 6. MathASTBuilder
//    Parses a LaTeX string into a simple MathAST.
//    Used by the transformer; actual rendering is by KaTeX/MathJax.
// ─────────────────────────────────────────────────────────────

export class MathASTBuilder {
  /**
   * Parse a LaTeX string into a minimal MathAST.
   * The AST is used for equation numbering and cross-reference
   * resolution — full rendering is delegated to KaTeX.
   *
   * @param {string} latex
   * @returns {{ type: string, source: string, valid: boolean, error: string | null }}
   */
  static parse(latex) {
    // Validate basic structure (unmatched braces, etc.)
    let depth   = 0;
    let valid   = true;
    let error   = null;

    for (const ch of latex) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth < 0) { valid = false; error = 'Unexpected }'; break; }
    }
    if (depth !== 0 && valid) { valid = false; error = `Unclosed { (depth ${depth})`; }

    // Detect environment type
    const envMatch = latex.match(/^\\begin\{(\w+\*?)\}/);
    const env      = envMatch ? envMatch[1] : 'equation';

    return {
      type:   'MathAST',
      source: latex,
      env,
      valid,
      error,
    };
  }
}
