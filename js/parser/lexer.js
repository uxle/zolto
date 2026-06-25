/**
 * js/parser/lexer.js
 * Zolto v8.1.0 — Lexer (Token Classifier & Grouper)
 *
 * Receives the flat Token[] from the Tokenizer and:
 *  1. Classifies ambiguous tokens (e.g. * as bullet vs italic marker)
 *  2. Groups related tokens into LexedToken sequences
 *  3. Resolves tag names to known Zolto block types
 *  4. Identifies block boundaries (open/close tag pairs)
 *  5. Attaches parsed attribute maps to TAG tokens
 *
 * Output: LexedToken[] — consumed by parser.js
 */

'use strict';

import { TokenType, parseAttrs,
         extractTagName, extractAttrString } from './tokenizer.js';
import { ZOLTONodeTypes, ZOLTODiagramTypes,
         ZOLTOChartTypes }                   from './ast.js';

// ─────────────────────────────────────────────────────────────
// 1. Lexed Token Types
// ─────────────────────────────────────────────────────────────

export const LexedType = Object.freeze({
  // Pass-through from tokenizer (unchanged)
  FRONTMATTER:     'FRONTMATTER',
  HEADING:         'HEADING',
  PARAGRAPH:       'PARAGRAPH',
  BLANK:           'BLANK',
  BLOCKQUOTE:      'BLOCKQUOTE',
  THEMATIC_BREAK:  'THEMATIC_BREAK',
  CODE_BLOCK:      'CODE_BLOCK',      // fenced code (grouped)
  LIST_ITEM:       'LIST_ITEM',
  TABLE_ROW:       'TABLE_ROW',
  TABLE_SEP:       'TABLE_SEP',
  VARIABLE_DECL:   'VARIABLE_DECL',
  COMMENT:         'COMMENT',
  EOF:             'EOF',

  // Tag-derived
  TAG_BLOCK_OPEN:  'TAG_BLOCK_OPEN',  // <tagName attrs>
  TAG_BLOCK_CLOSE: 'TAG_BLOCK_CLOSE', // </tagName>
  TAG_INLINE:      'TAG_INLINE',      // <tagName ... /> self-closing
  TAG_CONTENT:     'TAG_CONTENT',     // text inside a tag block
});

// ─────────────────────────────────────────────────────────────
// 2. Known Block Tag Registry
//    Maps lowercase tag names → Zolto node type strings.
//    Tags not in this map are treated as ComponentUse.
// ─────────────────────────────────────────────────────────────

const BLOCK_TAGS = Object.freeze({
  // Domain 1
  'tip':         ZOLTONodeTypes.CALLOUT,
  'note':        ZOLTONodeTypes.CALLOUT,
  'info':        ZOLTONodeTypes.CALLOUT,
  'warning':     ZOLTONodeTypes.CALLOUT,
  'danger':      ZOLTONodeTypes.CALLOUT,
  'caution':     ZOLTONodeTypes.CALLOUT,
  'important':   ZOLTONodeTypes.CALLOUT,
  'success':     ZOLTONodeTypes.CALLOUT,
  'check':       ZOLTONodeTypes.CALLOUT,
  'bug':         ZOLTONodeTypes.CALLOUT,
  'example':     ZOLTONodeTypes.CALLOUT,
  'quote':       ZOLTONodeTypes.CALLOUT,
  'abstract':    ZOLTONodeTypes.CALLOUT,
  'todo':        ZOLTONodeTypes.CALLOUT,
  'question':    ZOLTONodeTypes.CALLOUT,
  'failure':     ZOLTONodeTypes.CALLOUT,
  'seealso':     ZOLTONodeTypes.CALLOUT,
  'summary':     ZOLTONodeTypes.CALLOUT,
  'hint':        ZOLTONodeTypes.CALLOUT,
  'attention':   ZOLTONodeTypes.CALLOUT,
  'definition':  ZOLTONodeTypes.CALLOUT,
  'theorem':     ZOLTONodeTypes.CALLOUT,

  'admonition':  ZOLTONodeTypes.ADMONITION,
  'details':     ZOLTONodeTypes.DETAILS,
  'accordion':   ZOLTONodeTypes.ACCORDION,
  'tabs':        ZOLTONodeTypes.TABS,
  'tab':         ZOLTONodeTypes.TAB,
  'card':        ZOLTONodeTypes.CARD,
  'cards':       ZOLTONodeTypes.CARD_GROUP,
  'steps':       ZOLTONodeTypes.STEPS,
  'step':        ZOLTONodeTypes.STEP,
  'col':         'Column',
  'columns':     ZOLTONodeTypes.COLUMNS,
  'hero':        ZOLTONodeTypes.HERO,
  'banner':      ZOLTONodeTypes.BANNER,

  // Domain 2
  'math':        ZOLTONodeTypes.MATH_BLOCK,
  'm':           ZOLTONodeTypes.MATH_INLINE,

  // Domain 3
  'diagram':     ZOLTONodeTypes.DIAGRAM,

  // Domain 4
  'vector':      ZOLTONodeTypes.VECTOR_SCENE,

  // Domain 5
  'grid':        ZOLTONodeTypes.GRID,
  'flex':        ZOLTONodeTypes.FLEX,
  'canvas':      ZOLTONodeTypes.CANVAS,
  'whiteboard':  ZOLTONodeTypes.WHITEBOARD,
  'presentation':ZOLTONodeTypes.PRESENTATION,
  'slide':       ZOLTONodeTypes.SLIDE,
  'split':       ZOLTONodeTypes.SPLIT,
  'panel':       ZOLTONodeTypes.PANEL,

  // Domain 6
  'define':      ZOLTONodeTypes.COMPONENT_DEF,
  'slot':        ZOLTONodeTypes.SLOT_DEF,
  'macro':       ZOLTONodeTypes.MACRO_DEF,
  'template':    ZOLTONodeTypes.TEMPLATE_DEF,
  'animate':     ZOLTONodeTypes.ANIMATION_DEF,
  'theme':       ZOLTONodeTypes.THEME_BLOCK,

  // Assessment
  'mcq':         ZOLTONodeTypes.MCQ,
  'option':      ZOLTONodeTypes.MCQ_OPTION,
  'question':    'MCQQuestion',
  'explanation': 'MCQExplanation',
  'flashcard':   ZOLTONodeTypes.FLASHCARD,
  'front':       'FlashcardFront',
  'back':        'FlashcardBack',
  'quiz':        ZOLTONodeTypes.QUIZ,

  // Charts
  'chart':       ZOLTONodeTypes.CHART,

  // Utility
  'import':      ZOLTONodeTypes.IMPORT,
  'embed':       ZOLTONodeTypes.EMBED,
});

/** Tags that are always self-closing regardless of syntax */
const VOID_TAGS = new Set(['import', 'hr', 'br', 'embed']);

/** Tags that should be treated as inline even when on their own line */
const INLINE_TAGS = new Set(['m']);

// ─────────────────────────────────────────────────────────────
// 3. LexedToken Shape
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} LexedToken
 * @property {string}                   ltype    — LexedType value
 * @property {string}                   raw      — original source text
 * @property {number}                   line     — 1-based source line
 * @property {number}                   col      — 1-based column
 * @property {number}                   flags    — InlineFlags bitmask
 * @property {string}                   [text]   — extracted text content
 * @property {string}                   [tagName] — lowercase tag name
 * @property {string}                   [nodeType] — resolved ZOLTONodeType
 * @property {Record<string, string | true>} [attrs] — parsed attributes
 * @property {number}                   [level]  — heading level (1–6)
 * @property {number}                   [indent] — list indent depth
 * @property {boolean}                  [ordered] — ordered list item
 * @property {number}                   [num]    — ordered list number
 * @property {string}                   [lang]   — code block language
 * @property {string[]}                 [codeLines] — code block content
 */

/**
 * @param {string}  ltype
 * @param {import('./tokenizer.js').Token} token
 * @param {object}  extra
 * @returns {LexedToken}
 */
function makeLexed(ltype, token, extra = {}) {
  return {
    ltype,
    raw:   token.raw,
    line:  token.line,
    col:   token.col,
    flags: token.flags,
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. Lexer Class
// ─────────────────────────────────────────────────────────────

export class Lexer {
  /**
   * @param {import('./tokenizer.js').Token[]} tokens
   */
  constructor(tokens) {
    this._tokens  = tokens;
    this._pos     = 0;
    this._output  = /** @type {LexedToken[]} */ ([]);
  }

  /** @returns {LexedToken[]} */
  lex() {
    while (!this._atEnd()) {
      const tok = this._peek();

      switch (tok.type) {
        case TokenType.FRONTMATTER_OPEN:
          this._lexFrontmatter();
          break;

        case TokenType.HEADING:
          this._lexHeading(tok);
          this._advance();
          break;

        case TokenType.BLANK_LINE:
          this._emit(makeLexed(LexedType.BLANK, tok));
          this._advance();
          break;

        case TokenType.PARAGRAPH:
          this._emit(makeLexed(LexedType.PARAGRAPH, tok, { text: tok.text ?? tok.raw.trim() }));
          this._advance();
          break;

        case TokenType.BLOCKQUOTE:
          this._emit(makeLexed(LexedType.BLOCKQUOTE, tok, { text: tok.text ?? tok.raw.slice(1).trimStart() }));
          this._advance();
          break;

        case TokenType.THEMATIC_BREAK:
          this._emit(makeLexed(LexedType.THEMATIC_BREAK, tok));
          this._advance();
          break;

        case TokenType.CODE_FENCE_OPEN:
          this._lexCodeBlock(tok);
          break;

        case TokenType.LIST_ITEM_UL:
          this._emit(makeLexed(LexedType.LIST_ITEM, tok, {
            text:    tok.text ?? '',
            indent:  tok.indent ?? 0,
            ordered: false,
          }));
          this._advance();
          break;

        case TokenType.LIST_ITEM_OL:
          this._emit(makeLexed(LexedType.LIST_ITEM, tok, {
            text:    tok.text ?? '',
            indent:  tok.indent ?? 0,
            ordered: true,
            num:     tok.num ?? 1,
          }));
          this._advance();
          break;

        case TokenType.TABLE_ROW:
          this._emit(makeLexed(LexedType.TABLE_ROW, tok));
          this._advance();
          break;

        case TokenType.TABLE_SEP:
          this._emit(makeLexed(LexedType.TABLE_SEP, tok));
          this._advance();
          break;

        case TokenType.VARIABLE_DECL:
          this._lexVariable(tok);
          this._advance();
          break;

        case TokenType.COMMENT:
          this._emit(makeLexed(LexedType.COMMENT, tok));
          this._advance();
          break;

        case TokenType.TAG_OPEN:
          this._lexTagOpen(tok);
          this._advance();
          break;

        case TokenType.TAG_CLOSE:
          this._lexTagClose(tok);
          this._advance();
          break;

        case TokenType.TAG_SELF_CLOSE:
          this._lexTagSelfClose(tok);
          this._advance();
          break;

        case TokenType.TAG_CONTENT:
          this._emit(makeLexed(LexedType.TAG_CONTENT, tok, { text: tok.raw.trimStart() }));
          this._advance();
          break;

        case TokenType.EOF:
          this._emit(makeLexed(LexedType.EOF, tok));
          this._advance();
          break;

        default:
          // Unknown token — skip
          this._advance();
          break;
      }
    }
    return this._output;
  }

  // ── Frontmatter ────────────────────────────────────────────

  _lexFrontmatter() {
    // Collect everything between --- and ---
    const startTok = this._advance(); // consume FRONTMATTER_OPEN
    const lines    = [];

    while (!this._atEnd()) {
      const t = this._peek();
      if (t.type === TokenType.FRONTMATTER_CLOSE) {
        this._advance();
        break;
      }
      if (t.type === TokenType.FRONTMATTER_LINE) {
        lines.push(t.raw);
      }
      this._advance();
    }

    this._emit({
      ltype:  LexedType.FRONTMATTER,
      raw:    lines.join('\n'),
      line:   startTok.line,
      col:    1,
      flags:  0,
      lines,
    });
  }

  // ── Heading ────────────────────────────────────────────────

  _lexHeading(tok) {
    this._emit(makeLexed(LexedType.HEADING, tok, {
      level: tok.level ?? 1,
      text:  tok.text  ?? tok.raw.replace(/^#+\s*/, ''),
    }));
  }

  // ── Code block ────────────────────────────────────────────

  _lexCodeBlock(openTok) {
    const lang      = openTok.raw.trim().slice(3).trim();
    const codeLines = [];
    this._advance(); // consume CODE_FENCE_OPEN

    while (!this._atEnd()) {
      const t = this._peek();
      if (t.type === TokenType.CODE_FENCE_CLOSE) {
        this._advance();
        break;
      }
      codeLines.push(t.raw);
      this._advance();
    }

    this._emit({
      ltype:     LexedType.CODE_BLOCK,
      raw:       openTok.raw,
      line:      openTok.line,
      col:       1,
      flags:     0,
      lang:      lang || null,
      codeLines,
      code:      codeLines.join('\n'),
    });
  }

  // ── Variable declaration ──────────────────────────────────

  _lexVariable(tok) {
    const match = tok.raw.match(/^\$(\w+)\s*=\s*(.*)/);
    if (match) {
      this._emit({
        ltype:  LexedType.VARIABLE_DECL,
        raw:    tok.raw,
        line:   tok.line,
        col:    tok.col,
        flags:  0,
        name:   match[1],
        value:  match[2].trim(),
      });
    }
  }

  // ── Tag Open ──────────────────────────────────────────────

  _lexTagOpen(tok) {
    const tagName  = extractTagName(tok.raw).toLowerCase();
    const attrStr  = extractAttrString(tok.raw);
    const attrs    = parseAttrs(attrStr);
    const nodeType = BLOCK_TAGS[tagName] ?? ZOLTONodeTypes.COMPONENT_USE;
    const isVoid   = VOID_TAGS.has(tagName);
    const isInline = INLINE_TAGS.has(tagName);

    this._emit({
      ltype:    isInline ? LexedType.TAG_INLINE : LexedType.TAG_BLOCK_OPEN,
      raw:      tok.raw,
      line:     tok.line,
      col:      tok.col,
      flags:    0,
      tagName,
      nodeType,
      attrs,
      isVoid,
      isInline,
    });
  }

  // ── Tag Close ─────────────────────────────────────────────

  _lexTagClose(tok) {
    const tagName  = extractTagName(tok.raw).toLowerCase();
    const nodeType = BLOCK_TAGS[tagName] ?? ZOLTONodeTypes.COMPONENT_USE;

    this._emit({
      ltype:    LexedType.TAG_BLOCK_CLOSE,
      raw:      tok.raw,
      line:     tok.line,
      col:      tok.col,
      flags:    0,
      tagName,
      nodeType,
    });
  }

  // ── Self-closing tag ──────────────────────────────────────

  _lexTagSelfClose(tok) {
    const tagName  = extractTagName(tok.raw).toLowerCase();
    const attrStr  = extractAttrString(tok.raw);
    const attrs    = parseAttrs(attrStr);
    const nodeType = BLOCK_TAGS[tagName] ?? ZOLTONodeTypes.COMPONENT_USE;

    this._emit({
      ltype:    LexedType.TAG_INLINE,
      raw:      tok.raw,
      line:     tok.line,
      col:      tok.col,
      flags:    0,
      tagName,
      nodeType,
      attrs,
      selfClose: true,
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  _peek()    { return this._tokens[this._pos]; }
  _advance() { return this._tokens[this._pos++]; }
  _atEnd()   { return this._pos >= this._tokens.length; }
  _emit(lt)  { this._output.push(lt); }
}

// ─────────────────────────────────────────────────────────────
// 5. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Convenience: lex a Token[] and return LexedToken[].
 * @param {import('./tokenizer.js').Token[]} tokens
 * @returns {LexedToken[]}
 */
export function lex(tokens) {
  return new Lexer(tokens).lex();
}

/**
 * Check if a tag name is a known Zolto block tag.
 * @param {string} tagName  — lowercase
 * @returns {boolean}
 */
export const isKnownTag = (tagName) => tagName.toLowerCase() in BLOCK_TAGS;

/**
 * Resolve a lowercase tag name to its ZOLTONodeType string.
 * Returns ComponentUse for unknown tags (custom components).
 * @param {string} tagName
 * @returns {string}
 */
export const resolveNodeType = (tagName) =>
  BLOCK_TAGS[tagName.toLowerCase()] ?? ZOLTONodeTypes.COMPONENT_USE;

/**
 * Check if a tag is a callout type.
 * @param {string} tagName  — lowercase
 * @returns {boolean}
 */
export const isCalloutTag = (tagName) =>
  BLOCK_TAGS[tagName.toLowerCase()] === ZOLTONodeTypes.CALLOUT;
