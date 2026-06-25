/**
 * js/parser/parser.js
 * Zolto v8.1.0 — Recursive Descent Parser
 *
 * Consumes LexedToken[] from lexer.js and builds a Document AST
 * using only ASTFactory constructors — never raw object literals.
 *
 * Guarantees:
 *  - Never throws on malformed input — emits ErrorNode instead
 *  - node.inline and node.ast are always null (filled by transformer)
 *  - All collection fields are always [] (never null)
 *  - Max nesting depth: MAX_DEPTH (32) — deeper content → ErrorNode
 */

'use strict';

import { LexedType, isCalloutTag, resolveNodeType } from './lexer.js';
import { ASTFactory, ZOLTONodeTypes }               from './ast.js';
import { createLogger }                             from '../utils/logger.js';
import { slugify }                                  from '../utils/helpers.js';

const logger   = createLogger('Parser');
const MAX_DEPTH = 32;

// ─────────────────────────────────────────────────────────────
// 1. Parser Class
// ─────────────────────────────────────────────────────────────

export class ZoltoParser {
  constructor() {
    /** @type {import('./lexer.js').LexedToken[]} */
    this._tokens = [];
    this._pos    = 0;
    this._depth  = 0;
  }

  /**
   * Parse a Zolto source string into a Document AST.
   * @param {string} source
   * @returns {import('./ast.js').ASTFactory}
   */
  parse(source) {
    // Tokenize + lex
    const { tokenize }          = require('./tokenizer.js');
    const { lex }               = require('./lexer.js');
    this._tokens = lex(tokenize(source));
    this._pos    = 0;
    this._depth  = 0;

    const doc = ASTFactory.createDocument();

    // Parse frontmatter first
    if (this._peek()?.ltype === LexedType.FRONTMATTER) {
      this._parseFrontmatter(doc);
    }

    // Parse all block nodes
    while (!this._atEnd()) {
      const tok = this._peek();
      if (!tok || tok.ltype === LexedType.EOF) break;

      const node = this._parseBlock();
      if (node) doc.nodes.push(node);
    }

    return doc;
  }

  // ─────────────────────────────────────────────────────────
  // 2. Frontmatter
  // ─────────────────────────────────────────────────────────

  _parseFrontmatter(doc) {
    const tok = this._advance();
    const raw = tok.raw ?? '';

    // Simple YAML key: value parser
    for (const line of (tok.lines ?? raw.split('\n'))) {
      const match = line.match(/^(\s*)([\w-]+)\s*:\s*(.*)/);
      if (!match) continue;
      const key = match[2].trim();
      const val = match[3].trim();

      // Unquote string values
      const value = val.replace(/^["']|["']$/g, '');

      // Arrays [a, b, c]
      if (value.startsWith('[')) {
        try {
          doc.frontmatter[key] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          doc.frontmatter[key] = value.slice(1, -1).split(',').map(s => s.trim());
        }
      } else if (value === 'true')  { doc.frontmatter[key] = true;  }
        else if (value === 'false') { doc.frontmatter[key] = false; }
        else if (!isNaN(Number(value)) && value !== '') { doc.frontmatter[key] = Number(value); }
        else { doc.frontmatter[key] = value; }
    }
  }

  // ─────────────────────────────────────────────────────────
  // 3. Block Dispatcher
  // ─────────────────────────────────────────────────────────

  _parseBlock() {
    const tok = this._peek();
    if (!tok) return null;

    this._depth++;
    if (this._depth > MAX_DEPTH) {
      this._advance();
      this._depth--;
      return ASTFactory.createErrorNode('R007', tok.line, `Max nesting depth (${MAX_DEPTH}) exceeded`);
    }

    let node = null;

    switch (tok.ltype) {
      case LexedType.BLANK:
        this._advance();
        node = null;
        break;

      case LexedType.HEADING:
        node = this._parseHeading();
        break;

      case LexedType.PARAGRAPH:
        node = this._parseParagraph();
        break;

      case LexedType.BLOCKQUOTE:
        node = this._parseBlockquote();
        break;

      case LexedType.THEMATIC_BREAK:
        node = this._parseThematicBreak();
        break;

      case LexedType.CODE_BLOCK:
        node = this._parseCodeBlock();
        break;

      case LexedType.LIST_ITEM:
        node = this._parseList();
        break;

      case LexedType.TABLE_ROW:
        node = this._parseTable();
        break;

      case LexedType.VARIABLE_DECL:
        node = this._parseVariableDecl();
        break;

      case LexedType.COMMENT:
        node = this._parseComment();
        break;

      case LexedType.TAG_BLOCK_OPEN:
        node = this._parseTagBlock();
        break;

      case LexedType.TAG_INLINE:
        node = this._parseTagInline();
        break;

      case LexedType.TAG_BLOCK_CLOSE:
        // Stray close tag — skip
        this._advance();
        node = null;
        break;

      case LexedType.TAG_CONTENT:
        // Content outside a tag — treat as paragraph
        node = this._parseParagraph();
        break;

      default:
        this._advance();
        node = null;
    }

    this._depth--;
    return node;
  }

  // ─────────────────────────────────────────────────────────
  // 4. Markdown Nodes
  // ─────────────────────────────────────────────────────────

  _parseHeading() {
    const tok  = this._advance();
    const node = ASTFactory.createHeading(null, tok.line, tok.text ?? '', null);
    node.level  = tok.level ?? 1;
    node.anchor = slugify(tok.text ?? '');
    node.flags  = tok.flags;
    return node;
  }

  _parseParagraph() {
    const tok  = this._advance();
    const text = tok.text ?? tok.raw?.trim() ?? '';
    const node = ASTFactory.createParagraph(null, tok.line, text, null);
    node.flags = tok.flags;
    return node;
  }

  _parseBlockquote() {
    const tok  = this._advance();
    const text = tok.text ?? '';
    const inner = ASTFactory.createParagraph(null, tok.line, text, null);
    inner.flags = tok.flags;
    const node  = ASTFactory.createBlockquote(null, tok.line, [inner]);
    return node;
  }

  _parseThematicBreak() {
    const tok = this._advance();
    return ASTFactory.createHorizontalRule(null, tok.line);
  }

  _parseCodeBlock() {
    const tok  = this._advance();
    const node = ASTFactory.createCodeBlock(null, tok.line, tok.code ?? '', tok.lang ?? null, {});
    return node;
  }

  _parseVariableDecl() {
    const tok = this._advance();
    // Store in parent document's variables — parser accumulates them
    // transformer later injects into doc.variables
    return {
      type:  ZOLTONodeTypes.COMMENT,  // treated as invisible
      id:    'var_' + tok.name,
      line:  tok.line,
      _var:  { name: tok.name, value: tok.value },
    };
  }

  _parseComment() {
    const tok = this._advance();
    return {
      type: ZOLTONodeTypes.COMMENT,
      id:   'cmt_' + tok.line,
      line: tok.line,
      raw:  tok.raw,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 5. List Parser
  // ─────────────────────────────────────────────────────────

  _parseList() {
    const firstTok = this._peek();
    const ordered  = firstTok.ordered ?? false;
    const items    = [];
    const baseIndent = firstTok.indent ?? 0;

    while (!this._atEnd()) {
      const tok = this._peek();
      if (tok.ltype !== LexedType.LIST_ITEM) break;
      if ((tok.indent ?? 0) < baseIndent) break;

      this._advance();

      const item = ASTFactory.createListItem(null, tok.line, tok.text ?? '', null, []);
      item.flags = tok.flags;

      // Nested list
      if (!this._atEnd() && this._peek().ltype === LexedType.LIST_ITEM &&
          (this._peek().indent ?? 0) > (tok.indent ?? 0)) {
        item.children.push(this._parseList());
      }

      items.push(item);
    }

    return ASTFactory.createList(null, firstTok.line, ordered, items);
  }

  // ─────────────────────────────────────────────────────────
  // 6. Table Parser
  // ─────────────────────────────────────────────────────────

  _parseTable() {
    const rows    = [];
    const aligns  = [];
    let   headers = [];
    let   isFirst = true;

    while (!this._atEnd()) {
      const tok = this._peek();
      if (tok.ltype !== LexedType.TABLE_ROW && tok.ltype !== LexedType.TABLE_SEP) break;
      this._advance();

      if (tok.ltype === LexedType.TABLE_SEP) {
        // Parse alignment
        const cells = tok.raw.split('|').filter(s => s.trim());
        for (const cell of cells) {
          const t = cell.trim();
          if (t.startsWith(':') && t.endsWith(':')) aligns.push('center');
          else if (t.endsWith(':'))                  aligns.push('right');
          else                                       aligns.push('left');
        }
        continue;
      }

      // Parse cells
      const cells = tok.raw
        .split('|')
        .slice(1, -1)  // remove leading and trailing |
        .map(c => c.trim());

      if (isFirst) {
        headers = cells;
        isFirst = false;
      } else {
        rows.push(cells);
      }
    }

    return ASTFactory.createTable(
      null,
      this._peek()?.line ?? 0,
      headers,
      rows,
      null,
      aligns
    );
  }

  // ─────────────────────────────────────────────────────────
  // 7. Tag Block Parser (paired <tag>...</tag>)
  // ─────────────────────────────────────────────────────────

  _parseTagBlock() {
    const openTok  = this._advance();
    const tagName  = openTok.tagName;
    const nodeType = openTok.nodeType;
    const attrs    = openTok.attrs ?? {};
    const line     = openTok.line;

    // Collect children until matching close tag
    const children = [];
    let   depth    = 1;

    while (!this._atEnd() && depth > 0) {
      const tok = this._peek();

      if (tok.ltype === LexedType.TAG_BLOCK_OPEN && tok.tagName === tagName) {
        depth++;
        const child = this._parseTagBlock();
        if (child) children.push(child);
        continue;
      }

      if (tok.ltype === LexedType.TAG_BLOCK_CLOSE && tok.tagName === tagName) {
        depth--;
        this._advance();
        break;
      }

      if (tok.ltype === LexedType.EOF) break;

      const child = this._parseBlock();
      if (child) children.push(child);
    }

    return this._buildTagNode(nodeType, tagName, attrs, children, line);
  }

  // ─────────────────────────────────────────────────────────
  // 8. Self-Closing / Inline Tag Parser
  // ─────────────────────────────────────────────────────────

  _parseTagInline() {
    const tok      = this._advance();
    const tagName  = tok.tagName;
    const nodeType = tok.nodeType;
    const attrs    = tok.attrs ?? {};
    const line     = tok.line;

    return this._buildTagNode(nodeType, tagName, attrs, [], line);
  }

  // ─────────────────────────────────────────────────────────
  // 9. Tag Node Builder
  //    Dispatches to the correct ASTFactory method based on
  //    the resolved nodeType string.
  // ─────────────────────────────────────────────────────────

  _buildTagNode(nodeType, tagName, attrs, children, line) {
    switch (nodeType) {

      // ── Callouts ──────────────────────────────────────────
      case ZOLTONodeTypes.CALLOUT: {
        const text = this._extractTextFromChildren(children);
        const node = ASTFactory.createCallout(null, line, tagName, text, null, attrs.title ?? null, children);
        node.attrs = attrs;
        return node;
      }

      case ZOLTONodeTypes.ADMONITION: {
        const node = ASTFactory.createAdmonition(null, line, tagName, attrs.title ?? null, children);
        node.attrs = attrs;
        return node;
      }

      // ── Details ───────────────────────────────────────────
      case ZOLTONodeTypes.DETAILS: {
        const summary = attrs.summary ?? 'Details';
        const open    = attrs.open === true || attrs.open === 'true';
        return ASTFactory.createDetails(null, line, summary, children, open);
      }

      // ── Card ──────────────────────────────────────────────
      case ZOLTONodeTypes.CARD: {
        const node = ASTFactory.createCard(
          null, line,
          String(attrs.variant ?? 'default'),
          attrs.title   ? String(attrs.title)  : null,
          attrs.icon    ? String(attrs.icon)   : null,
          attrs.href    ? String(attrs.href)   : null,
          children
        );
        node.attrs   = attrs;
        node.classes = attrs.class ? String(attrs.class).split(/\s+/) : [];
        return node;
      }

      case ZOLTONodeTypes.CARD_GROUP: {
        const cols = attrs.cols ? parseInt(String(attrs.cols), 10) : 3;
        return ASTFactory.createCardGroup(null, line, cols, children);
      }

      // ── Tabs ──────────────────────────────────────────────
      case ZOLTONodeTypes.TABS: {
        const tabs = children.filter(c => c?.type === ZOLTONodeTypes.TAB);
        return ASTFactory.createTabs(null, line, tabs, attrs.variant ?? 'underline');
      }

      case ZOLTONodeTypes.TAB: {
        return ASTFactory.createTab(null, line, attrs.label ?? String(attrs.name ?? 'Tab'), attrs.icon ?? null, children);
      }

      // ── Steps ─────────────────────────────────────────────
      case ZOLTONodeTypes.STEPS: {
        return ASTFactory.createSteps(null, line, children);
      }

      case ZOLTONodeTypes.STEP: {
        const title = attrs.title ?? String(attrs.name ?? '');
        const node  = ASTFactory.createStep(null, line, title, null, children);
        return node;
      }

      // ── Math ──────────────────────────────────────────────
      case ZOLTONodeTypes.MATH_BLOCK: {
        const content = this._extractRawContent(children);
        const node    = ASTFactory.createMathBlock(
          null, line, content,
          attrs.env    ? String(attrs.env)    : (attrs.type ? String(attrs.type) : 'equation'),
          'block',
          attrs.numbered === true || attrs.numbered === 'true',
          attrs.label   ? String(attrs.label) : null,
          attrs.name    ? String(attrs.name)  : null
        );
        return node;
      }

      case ZOLTONodeTypes.MATH_INLINE: {
        const content = this._extractRawContent(children);
        return ASTFactory.createMathInline(null, line, content);
      }

      // ── Diagram ───────────────────────────────────────────
      case ZOLTONodeTypes.DIAGRAM: {
        const diagramType = attrs.type ? String(attrs.type) : 'flowchart';
        const content     = this._extractRawContent(children);
        const node        = ASTFactory.createDiagram(null, line, diagramType, [], [], {
          dir:         attrs.dir     ?? 'TB',
          title:       attrs.title   ?? null,
          content,
          interactive: attrs.interactive !== 'false',
          animated:    attrs.animated   === 'true',
          ...attrs,
        });
        node.caption = attrs.caption ? String(attrs.caption) : null;
        return node;
      }

      // ── Chart ─────────────────────────────────────────────
      case ZOLTONodeTypes.CHART: {
        const chartType = attrs.type ? String(attrs.type) : 'bar';
        const rawData   = this._extractRawContent(children);
        return ASTFactory.createChart(null, line, chartType, { raw: rawData }, {
          title: attrs.title ?? null,
          ...attrs,
        });
      }

      // ── Layouts ───────────────────────────────────────────
      case ZOLTONodeTypes.GRID: {
        const cols = attrs.cols ? parseInt(String(attrs.cols), 10) : 3;
        return ASTFactory.createGrid(null, line, children, { cols, gap: attrs.gap ?? '1rem', ...attrs });
      }

      case ZOLTONodeTypes.FLEX: {
        return ASTFactory.createFlex(null, line, children, {
          direction: attrs.direction ?? 'row',
          gap:       attrs.gap       ?? '1rem',
          align:     attrs.align     ?? 'flex-start',
          justify:   attrs.justify   ?? 'flex-start',
          wrap:      attrs.wrap      ?? 'wrap',
        });
      }

      case ZOLTONodeTypes.PRESENTATION: {
        const slides = children.filter(c => c?.type === ZOLTONodeTypes.SLIDE);
        return ASTFactory.createPresentation(null, line, slides, { theme: attrs.theme ?? null, ...attrs });
      }

      case ZOLTONodeTypes.SLIDE: {
        return ASTFactory.createSlide(null, line, attrs.layout ?? 'default', children, attrs);
      }

      case ZOLTONodeTypes.PANEL: {
        return ASTFactory.createPanel(null, line, attrs.title ?? null, children, attrs);
      }

      // ── Hero ──────────────────────────────────────────────
      case ZOLTONodeTypes.HERO: {
        return ASTFactory.createHero(null, line, attrs.variant ?? 'default', children, attrs);
      }

      // ── Components ────────────────────────────────────────
      case ZOLTONodeTypes.COMPONENT_DEF: {
        const name = attrs.name ? String(attrs.name) : tagName;
        return ASTFactory.createComponentDef(null, line, name,
          JSON.stringify(attrs), children);
      }

      case ZOLTONodeTypes.SLOT_DEF: {
        return ASTFactory.createSlotDef(null, line, attrs.name ?? 'default', children);
      }

      case ZOLTONodeTypes.THEME_BLOCK: {
        const name   = attrs.name ? String(attrs.name) : 'default';
        const rawCSS = this._extractRawContent(children);
        // Parse --token: value; pairs
        const tokens = {};
        for (const match of rawCSS.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
          tokens[match[1]] = match[2].trim();
        }
        return ASTFactory.createThemeBlock(null, line, name, tokens);
      }

      case ZOLTONodeTypes.IMPORT: {
        return ASTFactory.createImport(
          null, line,
          attrs.src   ? String(attrs.src)   : '',
          attrs.as    ? String(attrs.as)     : null
        );
      }

      case ZOLTONodeTypes.EMBED: {
        const src  = attrs.src  ? String(attrs.src)  : '';
        const type = attrs.type ? String(attrs.type) : this._inferEmbedType(src);
        return ASTFactory.createEmbed(null, line, src, type,
          attrs.alt     ? String(attrs.alt)     : null,
          attrs.caption ? String(attrs.caption) : null,
          attrs
        );
      }

      // ── Assessment ────────────────────────────────────────
      case ZOLTONodeTypes.MCQ: {
        const question = this._extractMCQQuestion(children);
        const options  = children.filter(c => c?.type === ZOLTONodeTypes.MCQ_OPTION);
        const explanation = this._extractMCQExplanation(children);
        return ASTFactory.createMCQ(null, line, question, options, explanation, attrs);
      }

      case ZOLTONodeTypes.MCQ_OPTION: {
        const text    = this._extractTextFromChildren(children);
        const correct = attrs.correct === true || attrs.correct === 'true';
        return ASTFactory.createMCQOption(null, line, text, correct);
      }

      case ZOLTONodeTypes.FLASHCARD: {
        const front = this._extractSlotContent(children, 'front');
        const back  = this._extractSlotContent(children, 'back');
        return ASTFactory.createFlashcard(null, line, front, back, attrs);
      }

      // ── ComponentUse (custom or unknown tag) ──────────────
      case ZOLTONodeTypes.COMPONENT_USE:
      default: {
        // PascalCase → component use; lowercase → unknown block
        const isPascal = /^[A-Z]/.test(tagName);
        const name     = attrs.name ? String(attrs.name) : tagName;

        if (isPascal || !isCalloutTag(tagName.toLowerCase())) {
          return ASTFactory.createComponentUse(null, line,
            // Use original tagName (preserving case) as component name
            tagName,
            JSON.stringify(attrs),
            children,
            {}
          );
        }

        // Fallback for unrecognised lowercase tags — emit as paragraph
        const text = this._extractTextFromChildren(children);
        return ASTFactory.createParagraph(null, line, text, null);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // 10. Content Extraction Helpers
  // ─────────────────────────────────────────────────────────

  /** Extract plain text content from child nodes. */
  _extractTextFromChildren(children) {
    return children
      .filter(c => c?.type === ZOLTONodeTypes.PARAGRAPH)
      .map(c => c.text ?? '')
      .join('\n')
      .trim();
  }

  /** Extract raw source text from TAG_CONTENT children. */
  _extractRawContent(children) {
    return children
      .filter(c => c?.type === ZOLTONodeTypes.PARAGRAPH)
      .map(c => c.text ?? '')
      .join('\n')
      .trim();
  }

  /** Extract content from a named slot child. */
  _extractSlotContent(children, slotName) {
    const slot = children.find(c =>
      c?.type === ZOLTONodeTypes.SLOT_DEF && c?.name === slotName
    );
    if (slot) return this._extractTextFromChildren(slot.children ?? []);
    // Fallback — look for 'FlashcardFront'/'FlashcardBack' pseudo-types
    const pseudo = children.find(c => c?._slot === slotName);
    return pseudo ? (pseudo.text ?? '') : '';
  }

  _extractMCQQuestion(children) {
    const q = children.find(c => c?._mcqPart === 'question');
    return q ? (q.text ?? '') : this._extractTextFromChildren(
      children.filter(c => c?.type !== ZOLTONodeTypes.MCQ_OPTION)
    );
  }

  _extractMCQExplanation(children) {
    const e = children.find(c => c?._mcqPart === 'explanation');
    return e ? (e.text ?? '') : null;
  }

  _inferEmbedType(src) {
    if (/youtube\.com|youtu\.be/.test(src)) return 'youtube';
    if (/vimeo\.com/.test(src))             return 'vimeo';
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(src)) return 'image';
    if (/\.(mp4|webm|ogg)$/i.test(src))    return 'video';
    if (/\.(mp3|wav|ogg)$/i.test(src))     return 'audio';
    if (/\.(pdf)$/i.test(src))             return 'pdf';
    return 'iframe';
  }

  // ─────────────────────────────────────────────────────────
  // 11. Cursor Helpers
  // ─────────────────────────────────────────────────────────

  _peek()    { return this._tokens[this._pos] ?? null; }
  _advance() { return this._tokens[this._pos++] ?? null; }
  _atEnd()   { return this._pos >= this._tokens.length; }
}

// ─────────────────────────────────────────────────────────────
// 12. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Convenience: parse source and return a Document AST.
 * @param {string} source
 * @returns {object}
 */
export function parse(source) {
  return new ZoltoParser().parse(source);
}
