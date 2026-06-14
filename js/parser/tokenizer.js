/**
 * js/parser/tokenizer.js
 * Zolto v8.1.0 — Source Tokenizer
 *
 * Reads raw .zl source text character-by-character and emits
 * a flat Token[] array. Each token carries:
 *  - type      — TokenType enum value
 *  - raw       — original source text for this token
 *  - line      — 1-based line number
 *  - col       — 1-based column number
 *  - flags     — InlineFlags bitmask (which inline markers appear in raw)
 *
 * The InlineFlags bitmask lets the InlineParser fast-path skip
 * the full inline scan when flags === 0 (plain text paragraphs).
 *
 * Performance targets:
 *  - ~50,000 tokens/ms on M1
 *  - Zero heap allocations for the common ASCII fast path
 */

'use strict';

import { InlineFlags } from './ast.js';

// ─────────────────────────────────────────────────────────────
// 1. Token Types
// ─────────────────────────────────────────────────────────────

export const TokenType = Object.freeze({
  // Document structure
  FRONTMATTER_OPEN:   'FRONTMATTER_OPEN',   // ---
  FRONTMATTER_CLOSE:  'FRONTMATTER_CLOSE',  // ---
  FRONTMATTER_LINE:   'FRONTMATTER_LINE',   // key: value inside frontmatter

  // Block elements
  HEADING:            'HEADING',            // # text
  BLANK_LINE:         'BLANK_LINE',         // empty line
  PARAGRAPH:          'PARAGRAPH',          // inline text line
  BLOCKQUOTE:         'BLOCKQUOTE',         // > text
  THEMATIC_BREAK:     'THEMATIC_BREAK',     // --- / *** / ___
  CODE_FENCE_OPEN:    'CODE_FENCE_OPEN',    // ``` lang
  CODE_FENCE_CLOSE:   'CODE_FENCE_CLOSE',   // ```
  CODE_LINE:          'CODE_LINE',          // line inside code fence
  LIST_ITEM_UL:       'LIST_ITEM_UL',       // - item or * item
  LIST_ITEM_OL:       'LIST_ITEM_OL',       // 1. item
  TABLE_ROW:          'TABLE_ROW',          // | col | col |
  TABLE_SEP:          'TABLE_SEP',          // | --- | --- |

  // Variable declaration
  VARIABLE_DECL:      'VARIABLE_DECL',      // $name = value

  // Tags (Domain 2–6)
  TAG_OPEN:           'TAG_OPEN',           // <TagName attr="val">
  TAG_CLOSE:          'TAG_CLOSE',          // </TagName>
  TAG_SELF_CLOSE:     'TAG_SELF_CLOSE',     // <TagName attr="val" />
  TAG_CONTENT:        'TAG_CONTENT',        // text content inside a tag block

  // Whitespace
  INDENT:             'INDENT',             // leading spaces/tabs
  NEWLINE:            'NEWLINE',            // \n

  // Meta
  COMMENT:            'COMMENT',            // <!-- ... -->
  EOF:                'EOF',
});

// ─────────────────────────────────────────────────────────────
// 2. Token Shape
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} Token
 * @property {string} type  — TokenType value
 * @property {string} raw   — original source text
 * @property {number} line  — 1-based line number
 * @property {number} col   — 1-based column number
 * @property {number} flags — InlineFlags bitmask
 */

/**
 * @param {string} type
 * @param {string} raw
 * @param {number} line
 * @param {number} col
 * @param {number} [flags=0]
 * @returns {Token}
 */
function makeToken(type, raw, line, col, flags = 0) {
  return { type, raw, line, col, flags };
}

// ─────────────────────────────────────────────────────────────
// 3. Inline Flag Scanner
//    One fast pass over a string to build the bitmask.
//    Called on every non-code, non-fence text line.
// ─────────────────────────────────────────────────────────────

/**
 * Scan `text` and return an InlineFlags bitmask indicating
 * which inline markers are present.
 * @param {string} text
 * @returns {number}
 */
function scanFlags(text) {
  let flags = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    switch (c) {
      case 42:  flags |= InlineFlags.HAS_BOLD | InlineFlags.HAS_ITALIC; break; // *
      case 95:  flags |= InlineFlags.HAS_BOLD | InlineFlags.HAS_ITALIC; break; // _
      case 96:  flags |= InlineFlags.HAS_CODE;    break; // `
      case 91:  flags |= InlineFlags.HAS_LINK;    break; // [
      case 64:  flags |= InlineFlags.HAS_MENTION; break; // @
      case 58:  flags |= InlineFlags.HAS_EMOJI;   break; // :
      case 126: flags |= InlineFlags.HAS_SPECIAL; break; // ~
      case 94:  flags |= InlineFlags.HAS_SPECIAL; break; // ^
      case 61:  flags |= InlineFlags.HAS_SPECIAL; break; // =
      case 123: // {
        if (i + 1 < text.length) {
          const next = text.charCodeAt(i + 1);
          if (next === 36) flags |= InlineFlags.HAS_VAR;   // $
          else             flags |= InlineFlags.HAS_COLOR;
        }
        break;
      case 60: // <
        if (text.slice(i, i + 3) === '<m>') flags |= InlineFlags.HAS_MATH;
        break;
      case 33: // !
        if (i + 1 < text.length && text.charCodeAt(i + 1) === 91) {
          flags |= InlineFlags.HAS_IMG; // ![
        }
        break;
    }
  }
  return flags;
}

// ─────────────────────────────────────────────────────────────
// 4. Tokenizer Class
// ─────────────────────────────────────────────────────────────

export class Tokenizer {
  /**
   * @param {string} source
   */
  constructor(source) {
    this._src   = source;
    this._lines = source.split('\n');
    this._tokens = [];
    this._line   = 1;
  }

  /**
   * Tokenize the source and return a Token[].
   * @returns {Token[]}
   */
  tokenize() {
    const lines = this._lines;
    let inFrontmatter = false;
    let inCodeFence   = false;
    let codeFenceLang = '';
    let inTagBlock    = false;
    let tagDepth      = 0;

    for (let li = 0; li < lines.length; li++) {
      const line    = lines[li];
      const lineNum = li + 1;
      const trimmed = line.trim();

      // ── Frontmatter ──────────────────────────────────────
      if (lineNum === 1 && trimmed === '---') {
        this._push(TokenType.FRONTMATTER_OPEN, line, lineNum, 1);
        inFrontmatter = true;
        continue;
      }

      if (inFrontmatter) {
        if (trimmed === '---') {
          this._push(TokenType.FRONTMATTER_CLOSE, line, lineNum, 1);
          inFrontmatter = false;
        } else {
          this._push(TokenType.FRONTMATTER_LINE, line, lineNum, 1);
        }
        continue;
      }

      // ── Code fence ───────────────────────────────────────
      if (!inCodeFence && trimmed.startsWith('```')) {
        codeFenceLang = trimmed.slice(3).trim();
        this._push(TokenType.CODE_FENCE_OPEN, line, lineNum, 1);
        inCodeFence = true;
        continue;
      }

      if (inCodeFence) {
        if (trimmed === '```') {
          this._push(TokenType.CODE_FENCE_CLOSE, line, lineNum, 1);
          inCodeFence = false;
          codeFenceLang = '';
        } else {
          this._push(TokenType.CODE_LINE, line, lineNum, 1);
        }
        continue;
      }

      // ── HTML comments ─────────────────────────────────────
      if (trimmed.startsWith('<!--')) {
        // Collect until -->
        let comment = line;
        let cLi     = li;
        while (!comment.includes('-->') && cLi + 1 < lines.length) {
          cLi++;
          comment += '\n' + lines[cLi];
        }
        this._push(TokenType.COMMENT, comment, lineNum, 1);
        li = cLi;
        continue;
      }

      // ── Blank line ────────────────────────────────────────
      if (trimmed === '') {
        this._push(TokenType.BLANK_LINE, line, lineNum, 1);
        continue;
      }

      // ── Variable declaration $name = value ───────────────
      if (/^\$\w+\s*=/.test(trimmed)) {
        this._push(TokenType.VARIABLE_DECL, trimmed, lineNum, 1);
        continue;
      }

      // ── Thematic break --- / *** / ___ ───────────────────
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
        this._push(TokenType.THEMATIC_BREAK, trimmed, lineNum, 1);
        continue;
      }

      // ── Headings # through ###### ─────────────────────────
      if (trimmed.startsWith('#')) {
        const match = trimmed.match(/^(#{1,6})\s+(.*)/);
        if (match) {
          const raw   = trimmed;
          const flags = scanFlags(match[2]);
          const t     = this._push(TokenType.HEADING, raw, lineNum, 1, flags);
          t.level     = match[1].length;
          t.text      = match[2];
          continue;
        }
      }

      // ── Blockquote > ──────────────────────────────────────
      if (trimmed.startsWith('>')) {
        const text  = trimmed.slice(1).trimStart();
        const flags = scanFlags(text);
        const t     = this._push(TokenType.BLOCKQUOTE, trimmed, lineNum, 1, flags);
        t.text      = text;
        continue;
      }

      // ── Unordered list - or * ─────────────────────────────
      if (/^[-*+]\s/.test(trimmed)) {
        const indent = line.length - line.trimStart().length;
        const text   = trimmed.slice(2);
        const flags  = scanFlags(text);
        const t      = this._push(TokenType.LIST_ITEM_UL, trimmed, lineNum, 1, flags);
        t.indent     = indent;
        t.text       = text;
        continue;
      }

      // ── Ordered list 1. ───────────────────────────────────
      if (/^\d+\.\s/.test(trimmed)) {
        const indent  = line.length - line.trimStart().length;
        const match   = trimmed.match(/^(\d+)\.\s+(.*)/);
        const text    = match ? match[2] : '';
        const num     = match ? parseInt(match[1], 10) : 1;
        const flags   = scanFlags(text);
        const t       = this._push(TokenType.LIST_ITEM_OL, trimmed, lineNum, 1, flags);
        t.indent      = indent;
        t.num         = num;
        t.text        = text;
        continue;
      }

      // ── Table row | col | ─────────────────────────────────
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Check for separator row |---|---|
        if (/^\|[\s|:-]+\|$/.test(trimmed)) {
          this._push(TokenType.TABLE_SEP, trimmed, lineNum, 1);
        } else {
          const flags = scanFlags(trimmed);
          this._push(TokenType.TABLE_ROW, trimmed, lineNum, 1, flags);
        }
        continue;
      }

      // ── Tags <TagName ...> / </TagName> / <TagName ... /> ─
      if (trimmed.startsWith('<')) {
        // Self-closing: <Import src="..." />  or  <StatCard ... />
        if (/^<[A-Za-z][\w-]*[^>]*\/>$/.test(trimmed) ||
            /^<[a-z][\w-]*[^>]*\/>$/.test(trimmed)) {
          this._push(TokenType.TAG_SELF_CLOSE, trimmed, lineNum, 1);
          continue;
        }

        // Closing tag </TagName>
        if (/^<\/[A-Za-z][\w-]*>/.test(trimmed)) {
          this._push(TokenType.TAG_CLOSE, trimmed, lineNum, 1);
          tagDepth = Math.max(0, tagDepth - 1);
          if (tagDepth === 0) inTagBlock = false;
          continue;
        }

        // Opening tag <TagName ...> or <tagname ...>
        if (/^<[A-Za-z][\w-]*/.test(trimmed)) {
          this._push(TokenType.TAG_OPEN, trimmed, lineNum, 1);
          tagDepth++;
          inTagBlock = true;
          continue;
        }
      }

      // ── Tag content (text inside a tag block) ─────────────
      if (inTagBlock && tagDepth > 0) {
        const flags = scanFlags(trimmed);
        this._push(TokenType.TAG_CONTENT, line, lineNum, 1, flags);
        continue;
      }

      // ── Paragraph / inline text ───────────────────────────
      const flags = scanFlags(trimmed);
      const t     = this._push(TokenType.PARAGRAPH, line, lineNum, 1, flags);
      t.text      = trimmed;
    }

    // EOF
    this._push(TokenType.EOF, '', this._lines.length + 1, 1);
    return this._tokens;
  }

  /**
   * Push a token and return it (so callers can add extra fields).
   * @private
   */
  _push(type, raw, line, col, flags = 0) {
    const t = makeToken(type, raw, line, col, flags);
    this._tokens.push(t);
    return t;
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Tokenizer Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Convenience: tokenize source and return Token[].
 * @param {string} source
 * @returns {Token[]}
 */
export function tokenize(source) {
  return new Tokenizer(source).tokenize();
}

/**
 * Parse a tag's attribute string into a key-value map.
 * Handles: key="value"  key='value'  key=value  booleanFlag
 * @param {string} attrString
 * @returns {Record<string, string | true>}
 */
export function parseAttrs(attrString) {
  const attrs  = {};
  const regex  = /(\w[\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>/]+)))?/g;
  let   match;

  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1];
    const val = match[2] ?? match[3] ?? match[4];
    attrs[key] = val !== undefined ? val : true;
  }

  return attrs;
}

/**
 * Extract tag name from an opening tag string.
 * '<grid cols="3">' → 'grid'
 * @param {string} raw
 * @returns {string}
 */
export function extractTagName(raw) {
  const match = raw.match(/^<\/?([A-Za-z][\w-]*)/);
  return match ? match[1] : '';
}

/**
 * Extract attribute string from an opening tag.
 * '<grid cols="3" gap="1rem">' → 'cols="3" gap="1rem"'
 * @param {string} raw  — full tag string including < and >
 * @returns {string}
 */
export function extractAttrString(raw) {
  const match = raw.match(/^<[A-Za-z][\w-]*\s*(.*?)(?:\s*\/?>)$/s);
  return match ? match[1].trim() : '';
}
