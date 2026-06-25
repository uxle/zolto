/**
 * js/editor/selection.js
 * Zolto v8.1.0 — Text Selection & Multi-Cursor Support
 *
 * Provides selection range queries and manipulation as character
 * offsets into the editor's textContent (consistent with cursor.js).
 *
 * Multi-cursor support is implemented as an array of independent
 * { start, end } ranges, all manipulated together for common
 * operations like "wrap each in **bold**".
 */

'use strict';

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Editor');

// ─────────────────────────────────────────────────────────────
// 1. Module State — Multi-cursor ranges
// ─────────────────────────────────────────────────────────────

/** @type {{start: number, end: number}[]} additional cursor ranges beyond the primary selection */
let _additionalRanges = [];

// ─────────────────────────────────────────────────────────────
// 2. Primary Selection Range
// ─────────────────────────────────────────────────────────────

/**
 * Get the current selection as a character offset range.
 * @param {HTMLElement} editorEl
 * @returns {{ start: number, end: number, text: string, collapsed: boolean } | null}
 */
export function getSelectionRange(editorEl) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!editorEl.contains(range.commonAncestorContainer)) return null;

  const start = _offsetOf(editorEl, range.startContainer, range.startOffset);
  const end   = _offsetOf(editorEl, range.endContainer, range.endOffset);

  return {
    start: Math.min(start, end),
    end:   Math.max(start, end),
    text:  range.toString(),
    collapsed: range.collapsed,
  };
}

/**
 * Set the selection to a specific character offset range.
 * @param {HTMLElement} editorEl
 * @param {number}      start
 * @param {number}      end
 */
export function setSelectionRange(editorEl, start, end) {
  const startPos = _findOffset(editorEl, start);
  const endPos   = _findOffset(editorEl, end);
  if (!startPos || !endPos) return;

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);

  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Select the entire content of the editor.
 * @param {HTMLElement} editorEl
 */
export function selectAll(editorEl) {
  const len = (editorEl.textContent ?? '').length;
  setSelectionRange(editorEl, 0, len);
}

/**
 * Select a specific line by line number (1-based).
 * @param {HTMLElement} editorEl
 * @param {number}      line
 */
export function selectLine(editorEl, line) {
  const text  = editorEl.textContent ?? '';
  const lines = text.split('\n');

  let start = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    start += lines[i].length + 1;
  }
  const lineText = lines[line - 1] ?? '';
  setSelectionRange(editorEl, start, start + lineText.length);
}

/**
 * Select the word at a given character offset.
 * @param {HTMLElement} editorEl
 * @param {number}      offset
 */
export function selectWordAt(editorEl, offset) {
  const text = editorEl.textContent ?? '';
  const wordRe = /\w/;

  let start = offset;
  let end   = offset;

  while (start > 0 && wordRe.test(text[start - 1])) start--;
  while (end < text.length && wordRe.test(text[end])) end++;

  setSelectionRange(editorEl, start, end);
}

/**
 * Collapse the selection to a single point (cursor only).
 * @param {HTMLElement} editorEl
 * @param {number}      offset
 */
export function collapseTo(editorEl, offset) {
  setSelectionRange(editorEl, offset, offset);
}

// ─────────────────────────────────────────────────────────────
// 3. Selection Text Replacement
// ─────────────────────────────────────────────────────────────

/**
 * Replace the currently selected text with `replacement`.
 * Returns the new cursor offset (end of inserted text).
 * @param {HTMLElement} editorEl
 * @param {string}      replacement
 * @returns {number}
 */
export function replaceSelection(editorEl, replacement) {
  const range = getSelectionRange(editorEl);
  if (!range) return 0;

  const text    = editorEl.textContent ?? '';
  const newText = text.slice(0, range.start) + replacement + text.slice(range.end);

  editorEl.textContent = newText;

  const newOffset = range.start + replacement.length;
  setSelectionRange(editorEl, newOffset, newOffset);

  return newOffset;
}

/**
 * Get the currently selected text, or empty string if collapsed.
 * @param {HTMLElement} editorEl
 * @returns {string}
 */
export function getSelectedText(editorEl) {
  return getSelectionRange(editorEl)?.text ?? '';
}

// ─────────────────────────────────────────────────────────────
// 4. Multi-Cursor Support
// ─────────────────────────────────────────────────────────────

/**
 * Add an additional cursor/selection range.
 * @param {number} start
 * @param {number} end
 */
export function addCursor(start, end = start) {
  _additionalRanges.push({ start, end });
}

/**
 * Clear all additional cursors (keep only the primary selection).
 */
export function clearAdditionalCursors() {
  _additionalRanges = [];
}

/**
 * Get all active ranges — primary selection plus additional cursors.
 * @param {HTMLElement} editorEl
 * @returns {{start: number, end: number}[]}
 */
export function getAllRanges(editorEl) {
  const primary = getSelectionRange(editorEl);
  const all = primary ? [{ start: primary.start, end: primary.end }] : [];
  return [...all, ..._additionalRanges].sort((a, b) => a.start - b.start);
}

/**
 * Add a cursor at the next occurrence of the currently selected text.
 * Classic "select next occurrence" (Cmd+D in many editors).
 * @param {HTMLElement} editorEl
 */
export function selectNextOccurrence(editorEl) {
  const current = getSelectionRange(editorEl);
  if (!current || current.collapsed) return;

  const text   = editorEl.textContent ?? '';
  const needle = current.text;
  const searchFrom = current.end;

  const nextIndex = text.indexOf(needle, searchFrom);
  if (nextIndex === -1) {
    logger.debug('No more occurrences found');
    return;
  }

  addCursor(current.start, current.end);
  setSelectionRange(editorEl, nextIndex, nextIndex + needle.length);
}

/**
 * Apply a text transformation to all active ranges simultaneously.
 * Ranges are processed in reverse order so earlier offsets remain valid.
 * @param {HTMLElement}            editorEl
 * @param {(text: string) => string} transformFn
 */
export function applyToAllRanges(editorEl, transformFn) {
  const ranges = getAllRanges(editorEl);
  if (ranges.length === 0) return;

  let text = editorEl.textContent ?? '';

  // Process in reverse so earlier offsets aren't invalidated
  for (let i = ranges.length - 1; i >= 0; i--) {
    const { start, end } = ranges[i];
    const selected    = text.slice(start, end);
    const transformed = transformFn(selected);
    text = text.slice(0, start) + transformed + text.slice(end);
  }

  editorEl.textContent = text;
  clearAdditionalCursors();
}

// ─────────────────────────────────────────────────────────────
// 5. Internal Offset Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Compute the character offset of a DOM (node, localOffset) pair
 * relative to the start of `root`'s textContent.
 * @param {Node} root
 * @param {Node} node
 * @param {number} localOffset
 * @returns {number}
 */
function _offsetOf(root, node, localOffset) {
  const preRange = document.createRange();
  preRange.selectNodeContents(root);
  try {
    preRange.setEnd(node, localOffset);
  } catch {
    return 0;
  }
  return preRange.toString().length;
}

/**
 * Find the (node, localOffset) DOM position for a character offset.
 * @param {Node}   root
 * @param {number} targetOffset
 * @returns {{ node: Node, offset: number } | null}
 */
function _findOffset(root, targetOffset) {
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

  return { node: root, offset: 0 };
}

// ─────────────────────────────────────────────────────────────
// 6. Selection State Queries
// ─────────────────────────────────────────────────────────────

/**
 * Check if the current selection spans multiple lines.
 * @param {HTMLElement} editorEl
 * @returns {boolean}
 */
export function isMultilineSelection(editorEl) {
  const range = getSelectionRange(editorEl);
  return range ? range.text.includes('\n') : false;
}

/**
 * Get the line numbers (1-based) spanned by the current selection.
 * @param {HTMLElement} editorEl
 * @returns {{ startLine: number, endLine: number }}
 */
export function getSelectionLines(editorEl) {
  const range = getSelectionRange(editorEl);
  if (!range) return { startLine: 1, endLine: 1 };

  const text = editorEl.textContent ?? '';
  const startLine = text.slice(0, range.start).split('\n').length;
  const endLine   = text.slice(0, range.end).split('\n').length;

  return { startLine, endLine };
}

/**
 * Check whether there is any non-collapsed selection.
 * @param {HTMLElement} editorEl
 * @returns {boolean}
 */
export function hasSelection(editorEl) {
  const range = getSelectionRange(editorEl);
  return range !== null && !range.collapsed;
}
