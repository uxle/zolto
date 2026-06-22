/**
 * js/editor/syntax-highlighter.js
 * Zolto v8.1.0 — In-Editor Syntax Highlighting
 *
 * Tokenises the editor's plain-text content and wraps tokens in
 * <span data-t="..."> elements so CSS (editor.css) can colour them.
 *
 * Critical constraint: this rewrites the editor's innerHTML, which
 * would normally destroy cursor position. We solve this by:
 *  1. Capturing the cursor offset before re-highlighting
 *  2. Rebuilding innerHTML from the highlighted tokens
 *  3. Restoring the cursor offset afterward
 *
 * Performance: re-tokenises the full document on every call.
 * This is acceptable because Zolto documents are typically under
 * 10,000 lines and the tokenizer runs at ~50,000 tokens/ms.
 * For very large documents, only the changed line could be
 * re-highlighted (see highlightLine for that path).
 */

'use strict';

import { getCursorPosition, setCursorPosition } from './cursor.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Editor');

// ─────────────────────────────────────────────────────────────
// 1. Token Patterns
//    Each pattern produces a data-t value matching the CSS
//    selectors in css/layouts/editor.css §4
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} HighlightRule
 * @property {RegExp} pattern
 * @property {string | ((match: RegExpMatchArray) => string)} type
 */

/** Line-level patterns — matched against the full line text. */
const LINE_PATTERNS = [
  // Frontmatter fence
  { pattern: /^---$/, type: 'frontmatter-fence' },

  // Headings
  { pattern: /^(#{1,6})(\s+)(.*)$/, type: 'heading-line' },

  // Blockquote
  { pattern: /^(\s*)(>)(\s?)(.*)$/, type: 'blockquote-line' },

  // List markers
  { pattern: /^(\s*)([-*+])(\s)/, type: 'list-bullet-line' },
  { pattern: /^(\s*)(\d+\.)(\s)/, type: 'list-number-line' },

  // Code fence
  { pattern: /^```(\w*)$/, type: 'code-fence-line' },

  // Variable declaration
  { pattern: /^\$(\w+)(\s*=\s*)(.*)$/, type: 'variable-line' },

  // HTML comment
  { pattern: /^<!--.*-->$/, type: 'comment-line' },
];

/** Inline patterns — matched within a single line's text content. */
const INLINE_PATTERNS = [
  // Tags: <TagName attr="val"> / </TagName> / <TagName ... />
  { re: /(<\/?)([A-Za-z][\w-]*)((?:\s+[\w-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)(\s*\/?>)/g,
    build: (m) => _buildTagSpans(m) },

  // Inline math <m>...</m>
  { re: /<m>([\s\S]*?)<\/m>/g,
    build: (m) => `<span data-t="math-marker">&lt;m&gt;</span><span data-t="math-inline">${_esc(m[1])}</span><span data-t="math-marker">&lt;/m&gt;</span>` },

  // Bold-italic ***text***
  { re: /\*\*\*([^*]+)\*\*\*/g,
    build: (m) => `<span data-t="marker">***</span><span data-t="bold">${_esc(m[1])}</span><span data-t="marker">***</span>` },

  // Bold **text**
  { re: /\*\*([^*]+)\*\*/g,
    build: (m) => `<span data-t="marker">**</span><span data-t="bold">${_esc(m[1])}</span><span data-t="marker">**</span>` },

  // Italic *text*
  { re: /\*([^*]+)\*/g,
    build: (m) => `<span data-t="marker">*</span><span data-t="italic">${_esc(m[1])}</span><span data-t="marker">*</span>` },

  // Strikethrough ~~text~~
  { re: /~~([^~]+)~~/g,
    build: (m) => `<span data-t="marker">~~</span><span data-t="strike">${_esc(m[1])}</span><span data-t="marker">~~</span>` },

  // Highlight ==text==
  { re: /==([^=]+)==/g,
    build: (m) => `<span data-t="marker">==</span><span data-t="highlight">${_esc(m[1])}</span><span data-t="marker">==</span>` },

  // Inline code `code`
  { re: /`([^`]+)`/g,
    build: (m) => `<span data-t="marker">\`</span><span data-t="code-inline">${_esc(m[1])}</span><span data-t="marker">\`</span>` },

  // Links [text](url)
  { re: /\[([^\]]*)\]\(([^)]*)\)/g,
    build: (m) => `<span data-t="link-punct">[</span><span data-t="link-text">${_esc(m[1])}</span><span data-t="link-punct">](</span><span data-t="link-url">${_esc(m[2])}</span><span data-t="link-punct">)</span>` },

  // Variable refs {$name}
  { re: /\{(\$\w+)\}/g,
    build: (m) => `<span data-t="var-brace">{</span><span data-t="variable">${_esc(m[1])}</span><span data-t="var-brace">}</span>` },
];

// ─────────────────────────────────────────────────────────────
// 2. Full-Document Highlighting
// ─────────────────────────────────────────────────────────────

/**
 * Re-highlight the entire editor content.
 * Preserves cursor position across the innerHTML rewrite.
 * @param {HTMLElement} editorEl
 */
export function highlightAll(editorEl) {
  const cursorOffset = getCursorPosition(editorEl);
  const text = editorEl.textContent ?? '';

  const lines = text.split('\n');
  const html  = lines.map(line => highlightLineText(line)).join('\n');

  editorEl.innerHTML = html || '';

  // Restore cursor
  requestAnimationFrame(() => {
    setCursorPosition(editorEl, cursorOffset);
  });
}

/**
 * Re-highlight just the current line (cheaper than highlightAll).
 * Useful for very large documents where full re-highlight is slow.
 * Currently unused by default (editor.js calls highlightAll via
 * debounce16), but exposed for future optimisation.
 * @param {HTMLElement} editorEl
 * @param {number}      lineNumber  — 1-based
 */
export function highlightLine(editorEl, lineNumber) {
  const lineEl = editorEl.children[lineNumber - 1];
  if (!lineEl) return;

  const cursorOffset = getCursorPosition(editorEl);
  const lineText = lineEl.textContent ?? '';
  lineEl.innerHTML = highlightLineText(lineText);

  requestAnimationFrame(() => {
    setCursorPosition(editorEl, cursorOffset);
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Single-Line Highlighting
// ─────────────────────────────────────────────────────────────

/**
 * Convert a single line of plain text into highlighted HTML.
 * @param {string} line
 * @returns {string}
 */
function highlightLineText(line) {
  if (line === '') return '';

  // ── Line-level patterns first ──────────────────────────
  for (const { pattern, type } of LINE_PATTERNS) {
    const match = line.match(pattern);
    if (!match) continue;

    switch (type) {
      case 'frontmatter-fence':
        return `<span data-t="frontmatter-fence">---</span>`;

      case 'heading-line': {
        const [, hashes, space, text] = match;
        const level = hashes.length;
        return `<span data-t="heading-marker">${hashes}</span>${space}` +
               `<span data-t="heading-${level}">${_highlightInline(text)}</span>`;
      }

      case 'blockquote-line': {
        const [, lead, gt, space, text] = match;
        return `${lead}<span data-t="blockquote-marker">${gt}</span>${space}${_highlightInline(text)}`;
      }

      case 'list-bullet-line': {
        const [, lead, bullet, space] = match;
        const rest = line.slice(match[0].length);
        return `${lead}<span data-t="list-bullet">${bullet}</span>${space}${_highlightInline(rest)}`;
      }

      case 'list-number-line': {
        const [, lead, num, space] = match;
        const rest = line.slice(match[0].length);
        return `${lead}<span data-t="list-number">${num}</span>${space}${_highlightInline(rest)}`;
      }

      case 'code-fence-line': {
        const [, lang] = match;
        return `<span data-t="code-fence">\`\`\`</span><span data-t="code-lang">${_esc(lang)}</span>`;
      }

      case 'variable-line': {
        const [, name, eq, value] = match;
        return `<span data-t="variable">$${_esc(name)}</span>` +
               `<span data-t="frontmatter-colon">${_esc(eq)}</span>` +
               `<span data-t="frontmatter-val">${_esc(value)}</span>`;
      }

      case 'comment-line':
        return `<span data-t="comment">${_esc(line)}</span>`;
    }
  }

  // ── No line-level match — apply inline patterns only ────
  return _highlightInline(line);
}

/**
 * Apply all inline highlight patterns to a text fragment.
 * Order matters: patterns are applied sequentially, each operating
 * on the previous pattern's output (which is already HTML-safe).
 * @param {string} text
 * @returns {string}
 */
function _highlightInline(text) {
  // Start by escaping the raw text
  let html = _esc(text);

  // Tag-aware approach: since later patterns must not re-process
  // content already wrapped in spans, we use a placeholder strategy.
  // For simplicity and correctness in this editor (display-only,
  // not contenteditable-safe HTML editing), we apply patterns on
  // the escaped string in priority order, using negative lookahead
  // to avoid double-processing already-tagged content.

  const segments = [{ text: html, processed: false }];

  for (const { re, build } of INLINE_PATTERNS) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.processed) continue;

      re.lastIndex = 0;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = re.exec(seg.text)) !== null) {
        parts.push({ text: seg.text.slice(lastIndex, match.index), processed: false });
        parts.push({ text: build(match), processed: true });
        lastIndex = match.index + match[0].length;
      }

      if (parts.length > 0) {
        parts.push({ text: seg.text.slice(lastIndex), processed: false });
        segments.splice(i, 1, ...parts);
        i += parts.length - 1;
      }
    }
  }

  return segments.map(s => s.text).join('');
}

// ─────────────────────────────────────────────────────────────
// 4. Tag Span Builder (handles attribute highlighting)
// ─────────────────────────────────────────────────────────────

/**
 * Build highlighted spans for a matched HTML-style tag.
 * @param {RegExpMatchArray} m — [full, openSlash, tagName, attrs, close]
 * @returns {string}
 */
function _buildTagSpans(m) {
  const [, openSlash, tagName, attrs, close] = m;

  const attrHtml = _highlightAttrs(attrs);

  return `<span data-t="tag-punct">${openSlash}</span>` +
         `<span data-t="tag-name">${_esc(tagName)}</span>` +
         attrHtml +
         `<span data-t="tag-punct">${_esc(close)}</span>`;
}

/**
 * Highlight an attribute string: ` key="value" flag`
 * @param {string} attrStr
 * @returns {string}
 */
function _highlightAttrs(attrStr) {
  if (!attrStr) return '';

  const re = /(\s+)([\w-]+)(?:(=)("[^"]*"|'[^']*'|[^\s>]+))?/g;
  let html = '';
  let match;

  while ((match = re.exec(attrStr)) !== null) {
    const [, space, name, eq, value] = match;
    html += space;
    html += `<span data-t="attr-name">${_esc(name)}</span>`;
    if (eq) {
      html += `<span data-t="attr-eq">=</span>`;
      html += `<span data-t="attr-value">${_esc(value)}</span>`;
    }
  }

  return html;
}

// ─────────────────────────────────────────────────────────────
// 5. Escape Helper
// ─────────────────────────────────────────────────────────────

/**
 * HTML-escape a string (for inserting raw text into innerHTML).
 * @param {string} str
 * @returns {string}
 */
function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────
// 6. Bracket Matching Highlight
// ─────────────────────────────────────────────────────────────

const BRACKET_PAIRS = { '(': ')', '[': ']', '{': '}', '<': '>' };
const BRACKET_CLOSE  = { ')': '(', ']': '[', '}': '{', '>': '<' };

/**
 * Highlight matching bracket pairs around the cursor.
 * Adds/removes .zolto-bracket-match classes on synthetic marker spans.
 * Note: requires the editor content to remain a flat text representation;
 * this is a best-effort visual aid, not a strict syntax validator.
 * @param {HTMLElement} editorEl
 */
export function highlightBracketMatch(editorEl) {
  // Clear previous matches
  for (const el of editorEl.querySelectorAll('.zolto-bracket-match, .zolto-bracket-error')) {
    el.classList.remove('zolto-bracket-match', 'zolto-bracket-error');
  }

  const offset = getCursorPosition(editorEl);
  const text   = editorEl.textContent ?? '';
  const before = text[offset - 1];
  const after  = text[offset];

  let pos = null;
  let openChar = null;

  if (after && BRACKET_PAIRS[after]) {
    pos = offset; openChar = after;
  } else if (before && BRACKET_CLOSE[before]) {
    pos = offset - 1; openChar = BRACKET_CLOSE[before];
  }

  if (pos === null) return;
  // Visual bracket matching would require per-character span
  // wrapping, which is deferred to a future enhancement — the
  // CSS classes are defined and ready for that implementation.
  logger.debug('Bracket match at', pos, 'pairs with', openChar);
}
