/**
 * js/editor/cursor.js
 * Zolto v8.1.0 — Cursor Position Tracking
 *
 * Tracks cursor position within the contenteditable editor as
 * a plain character offset, and converts between offset and
 * { line, col } coordinates.
 *
 * Since the editor's textContent is the single source of truth,
 * cursor position is always expressed as a character offset into
 * that string — not as a DOM Range, which is fragile across re-renders.
 */

'use strict';

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Editor');

// ─────────────────────────────────────────────────────────────
// 1. Offset ↔ DOM Range Conversion
// ─────────────────────────────────────────────────────────────

/**
 * Get the current cursor position as a character offset into
 * the editor's textContent.
 * @param {HTMLElement} editorEl
 * @returns {number}
 */
export function getCursorPosition(editorEl) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  if (!editorEl.contains(range.startContainer)) return 0;

  // Clone range from start of editor to cursor position
  const preRange = document.createRange();
  preRange.selectNodeContents(editorEl);
  preRange.setEnd(range.startContainer, range.startOffset);

  return preRange.toString().length;
}

/**
 * Set the cursor position to a specific character offset.
 * Walks the text node tree to find the DOM position matching
 * the offset, then collapses the selection there.
 * @param {HTMLElement} editorEl
 * @param {number}      offset
 */
export function setCursorPosition(editorEl, offset) {
  const result = _findNodeAtOffset(editorEl, offset);
  if (!result) return;

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.setStart(result.node, result.offset);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Walk the text node tree of `root` to find the node and local
 * offset corresponding to a global character offset.
 * @param {Node}   root
 * @param {number} targetOffset
 * @returns {{ node: Node, offset: number } | null}
 */
function _findNodeAtOffset(root, targetOffset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let remaining = targetOffset;
  let node;

  while ((node = walker.nextNode())) {
    const len = node.textContent?.length ?? 0;
    if (remaining <= len) {
      return { node, offset: remaining };
    }
    remaining -= len;
  }

  // Offset beyond content — place at end of last text node, or root
  const lastText = _lastTextNode(root);
  if (lastText) {
    return { node: lastText, offset: lastText.textContent?.length ?? 0 };
  }
  return { node: root, offset: 0 };
}

/**
 * Find the last text node within `root` (depth-first).
 * @param {Node} root
 * @returns {Text | null}
 */
function _lastTextNode(root) {
  let last = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) last = node;
  return /** @type {Text | null} */ (last);
}

// ─────────────────────────────────────────────────────────────
// 2. Offset ↔ Line/Column Conversion
// ─────────────────────────────────────────────────────────────

/**
 * Convert a character offset into { line, col } (1-based).
 * @param {HTMLElement} editorEl
 * @param {number}      offset
 * @returns {{ line: number, col: number }}
 */
export function getLineCol(editorEl, offset) {
  const text   = editorEl.textContent ?? '';
  const before = text.slice(0, offset);
  const lines  = before.split('\n');

  return {
    line: lines.length,
    col:  lines[lines.length - 1].length + 1,
  };
}

/**
 * Convert { line, col } (1-based) into a character offset.
 * @param {HTMLElement} editorEl
 * @param {number}      line
 * @param {number}      col
 * @returns {number}
 */
export function lineColToOffset(editorEl, line, col) {
  const text  = editorEl.textContent ?? '';
  const lines = text.split('\n');

  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for the \n
  }

  const targetLine = lines[line - 1] ?? '';
  offset += Math.min(col - 1, targetLine.length);

  return offset;
}

// ─────────────────────────────────────────────────────────────
// 3. Programmatic Cursor Movement
// ─────────────────────────────────────────────────────────────

/**
 * Move the cursor to a specific { line, col }.
 * @param {HTMLElement} editorEl
 * @param {number}      line
 * @param {number}      col
 */
export function moveTo(editorEl, line, col) {
  const offset = lineColToOffset(editorEl, line, col);
  setCursorPosition(editorEl, offset);
  editorEl.focus();
}

/**
 * Move the cursor to the start of the document.
 * @param {HTMLElement} editorEl
 */
export function moveToStart(editorEl) {
  setCursorPosition(editorEl, 0);
  editorEl.focus();
}

/**
 * Move the cursor to the end of the document.
 * @param {HTMLElement} editorEl
 */
export function moveToEnd(editorEl) {
  const len = (editorEl.textContent ?? '').length;
  setCursorPosition(editorEl, len);
  editorEl.focus();
}

/**
 * Move the cursor to the start of a specific line.
 * @param {HTMLElement} editorEl
 * @param {number}      line  — 1-based
 */
export function moveToLineStart(editorEl, line) {
  moveTo(editorEl, line, 1);
}

/**
 * Move the cursor to the end of a specific line.
 * @param {HTMLElement} editorEl
 * @param {number}      line  — 1-based
 */
export function moveToLineEnd(editorEl, line) {
  const text  = editorEl.textContent ?? '';
  const lines = text.split('\n');
  const target = lines[line - 1] ?? '';
  moveTo(editorEl, line, target.length + 1);
}

// ─────────────────────────────────────────────────────────────
// 4. Current Line Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get the full text of the line the cursor is currently on.
 * @param {HTMLElement} editorEl
 * @returns {{ text: string, start: number, end: number }}
 */
export function getCurrentLine(editorEl) {
  const offset = getCursorPosition(editorEl);
  const text   = editorEl.textContent ?? '';

  const start = text.lastIndexOf('\n', offset - 1) + 1;
  const endIdx = text.indexOf('\n', offset);
  const end    = endIdx === -1 ? text.length : endIdx;

  return { text: text.slice(start, end), start, end };
}

/**
 * Highlight (apply a CSS class to) the current line for visual feedback.
 * Uses a CSS-only approach via a synthetic marker element.
 * @param {HTMLElement} editorEl
 */
export function highlightCurrentLine(editorEl) {
  // Remove previous highlight
  const prev = editorEl.querySelector('.zolto-current-line');
  prev?.classList.remove('zolto-current-line');

  const { line } = getLineCol(editorEl, getCursorPosition(editorEl));
  const lineEl = editorEl.children[line - 1];
  if (lineEl) lineEl.classList.add('zolto-current-line');
}

// ─────────────────────────────────────────────────────────────
// 5. Cursor Visibility
// ─────────────────────────────────────────────────────────────

/**
 * Ensure the cursor is scrolled into view within the editor.
 * @param {HTMLElement} editorEl
 */
export function scrollCursorIntoView(editorEl) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const rect  = range.getBoundingClientRect();
  const editorRect = editorEl.getBoundingClientRect();

  if (rect.top < editorRect.top) {
    editorEl.scrollTop -= (editorRect.top - rect.top) + 20;
  } else if (rect.bottom > editorRect.bottom) {
    editorEl.scrollTop += (rect.bottom - editorRect.bottom) + 20;
  }
}
