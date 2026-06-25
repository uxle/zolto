/**
 * js/editor/shortcuts.js
 * Zolto v8.1.0 — Keyboard Shortcut Registry
 *
 * Registers all editor-scoped keyboard shortcuts (formatting,
 * navigation, line manipulation). Global app-level shortcuts
 * (command palette, save, new doc) live in app.js — this module
 * only handles shortcuts that act on the editor content itself.
 *
 * Shortcut format: 'Ctrl+B', 'Cmd+Shift+K', 'Alt+ArrowUp', etc.
 * Both Ctrl and Cmd variants are auto-registered for cross-platform
 * support (Ctrl on Windows/Linux, Cmd on macOS).
 */

'use strict';

import { createLogger }       from '../utils/logger.js';
import { bus }                 from '../utils/events.js';
import { getCursorPosition,
         setCursorPosition,
         getLineCol,
         lineColToOffset,
         moveToLineStart,
         moveToLineEnd }       from './cursor.js';
import { getSelectionRange,
         setSelectionRange,
         selectLine,
         selectNextOccurrence,
         hasSelection }        from './selection.js';

const logger = createLogger('Editor');

// ─────────────────────────────────────────────────────────────
// 1. Shortcut Definitions
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} ShortcutDef
 * @property {string}   key         — e.g. 'b', 'k', 'ArrowUp'
 * @property {boolean}  [ctrl]
 * @property {boolean}  [shift]
 * @property {boolean}  [alt]
 * @property {Function} handler     — (editorEl, event) => void
 * @property {string}   description
 */

/** @type {ShortcutDef[]} */
const SHORTCUTS = [
  // ── Text formatting ──────────────────────────────────────
  { key: 'b', ctrl: true, handler: (el) => bus.emit('zolto:format', 'bold'),
    description: 'Bold' },
  { key: 'i', ctrl: true, handler: (el) => bus.emit('zolto:format', 'italic'),
    description: 'Italic' },
  { key: 'e', ctrl: true, handler: (el) => bus.emit('zolto:format', 'code'),
    description: 'Inline code' },
  { key: 'k', ctrl: true, handler: (el) => bus.emit('zolto:format', 'link'),
    description: 'Insert link' },

  // ── Headings ──────────────────────────────────────────────
  { key: '1', ctrl: true, alt: true, handler: () => bus.emit('zolto:format', 'h1'),
    description: 'Heading 1' },
  { key: '2', ctrl: true, alt: true, handler: () => bus.emit('zolto:format', 'h2'),
    description: 'Heading 2' },
  { key: '3', ctrl: true, alt: true, handler: () => bus.emit('zolto:format', 'h3'),
    description: 'Heading 3' },

  // ── Line manipulation ─────────────────────────────────────
  { key: 'd', ctrl: true, shift: true, handler: duplicateLine,
    description: 'Duplicate line' },
  { key: 'k', ctrl: true, shift: true, handler: deleteLine,
    description: 'Delete line' },
  { key: 'ArrowUp', alt: true, handler: (el) => moveLine(el, -1),
    description: 'Move line up' },
  { key: 'ArrowDown', alt: true, handler: (el) => moveLine(el, 1),
    description: 'Move line down' },
  { key: '/', ctrl: true, handler: toggleLineComment,
    description: 'Toggle comment' },

  // ── Indentation ───────────────────────────────────────────
  { key: ']', ctrl: true, handler: (el) => indentSelection(el, 1),
    description: 'Indent' },
  { key: '[', ctrl: true, handler: (el) => indentSelection(el, -1),
    description: 'Outdent' },

  // ── Selection / navigation ────────────────────────────────
  { key: 'l', ctrl: true, handler: (el) => {
      const { line } = getLineCol(el, getCursorPosition(el));
      selectLine(el, line);
    }, description: 'Select line' },
  { key: 'd', ctrl: true, handler: selectNextOccurrence,
    description: 'Select next occurrence' },
  { key: 'Home', handler: (el) => {
      const { line } = getLineCol(el, getCursorPosition(el));
      moveToLineStart(el, line);
    }, description: 'Go to line start' },
  { key: 'End', handler: (el) => {
      const { line } = getLineCol(el, getCursorPosition(el));
      moveToLineEnd(el, line);
    }, description: 'Go to line end' },

  // ── Case transforms ───────────────────────────────────────
  { key: 'u', ctrl: true, shift: true, handler: (el) => transformSelection(el, s => s.toUpperCase()),
    description: 'Transform to UPPERCASE' },
  { key: 'l', ctrl: true, shift: true, handler: (el) => transformSelection(el, s => s.toLowerCase()),
    description: 'Transform to lowercase' },

  // ── Undo/redo are native browser behaviour, no handler needed ──
];

// ─────────────────────────────────────────────────────────────
// 2. Shortcut Matching
// ─────────────────────────────────────────────────────────────

/**
 * @param {KeyboardEvent} event
 * @param {ShortcutDef}   def
 * @returns {boolean}
 */
function matches(event, def) {
  const keyMatch = event.key.toLowerCase() === def.key.toLowerCase();
  if (!keyMatch) return false;

  // Either ctrlKey or metaKey satisfies a "ctrl" requirement (cross-platform)
  const ctrlOk  = def.ctrl  ? (event.ctrlKey || event.metaKey) : (!event.ctrlKey && !event.metaKey);
  const shiftOk = def.shift ? event.shiftKey : !event.shiftKey;
  const altOk   = def.alt   ? event.altKey   : !event.altKey;

  return ctrlOk && shiftOk && altOk;
}

// ─────────────────────────────────────────────────────────────
// 3. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Register all editor shortcuts on `editorEl`.
 * @param {HTMLElement} editorEl
 */
export function initShortcuts(editorEl) {
  editorEl.addEventListener('keydown', (event) => {
    for (const def of SHORTCUTS) {
      if (matches(event, def)) {
        event.preventDefault();
        def.handler(editorEl, event);
        logger.debug('Shortcut fired:', def.description);
        return;
      }
    }
  });

  logger.debug(`${SHORTCUTS.length} editor shortcuts registered`);
}

/**
 * Get all registered shortcuts (used by the help panel / palette).
 * @returns {{ keys: string, description: string }[]}
 */
export function listShortcuts() {
  return SHORTCUTS.map(def => ({
    keys: _formatKeys(def),
    description: def.description,
  }));
}

/** @param {ShortcutDef} def @returns {string} */
function _formatKeys(def) {
  const parts = [];
  if (def.ctrl)  parts.push('Ctrl');
  if (def.shift) parts.push('Shift');
  if (def.alt)   parts.push('Alt');
  parts.push(def.key.length === 1 ? def.key.toUpperCase() : def.key);
  return parts.join('+');
}

// ─────────────────────────────────────────────────────────────
// 4. Shortcut Handlers
// ─────────────────────────────────────────────────────────────

/**
 * Duplicate the current line below itself.
 * @param {HTMLElement} editorEl
 */
function duplicateLine(editorEl) {
  const offset = getCursorPosition(editorEl);
  const text   = editorEl.textContent ?? '';
  const { line } = getLineCol(editorEl, offset);

  const lines = text.split('\n');
  const idx   = line - 1;
  lines.splice(idx + 1, 0, lines[idx]);

  editorEl.textContent = lines.join('\n');
  const newOffset = lineColToOffset(editorEl, line + 1, 1) +
                     (offset - lineColToOffset(editorEl, line, 1));
  setCursorPosition(editorEl, newOffset);
  _emitChange(editorEl);
}

/**
 * Delete the current line entirely.
 * @param {HTMLElement} editorEl
 */
function deleteLine(editorEl) {
  const offset = getCursorPosition(editorEl);
  const text   = editorEl.textContent ?? '';
  const { line, col } = getLineCol(editorEl, offset);

  const lines = text.split('\n');
  lines.splice(line - 1, 1);

  editorEl.textContent = lines.join('\n');
  const newLine = Math.min(line, lines.length);
  const newOffset = lineColToOffset(editorEl, newLine, col);
  setCursorPosition(editorEl, newOffset);
  _emitChange(editorEl);
}

/**
 * Move the current line up or down by `direction` (-1 or 1).
 * @param {HTMLElement} editorEl
 * @param {-1 | 1}      direction
 */
function moveLine(editorEl, direction) {
  const offset = getCursorPosition(editorEl);
  const text   = editorEl.textContent ?? '';
  const { line, col } = getLineCol(editorEl, offset);

  const lines   = text.split('\n');
  const idx     = line - 1;
  const swapIdx = idx + direction;

  if (swapIdx < 0 || swapIdx >= lines.length) return;

  [lines[idx], lines[swapIdx]] = [lines[swapIdx], lines[idx]];
  editorEl.textContent = lines.join('\n');

  const newOffset = lineColToOffset(editorEl, line + direction, col);
  setCursorPosition(editorEl, newOffset);
  _emitChange(editorEl);
}

/**
 * Toggle an HTML comment wrapper around the current line or selection.
 * @param {HTMLElement} editorEl
 */
function toggleLineComment(editorEl) {
  const range = getSelectionRange(editorEl);
  const text  = editorEl.textContent ?? '';

  if (!range || range.collapsed) {
    // Comment the current line
    const offset = getCursorPosition(editorEl);
    const { line } = getLineCol(editorEl, offset);
    const lines = text.split('\n');
    const idx   = line - 1;
    const lineText = lines[idx];

    const commentMatch = lineText.match(/^(\s*)<!--\s*(.*?)\s*-->(\s*)$/);
    if (commentMatch) {
      lines[idx] = commentMatch[1] + commentMatch[2] + commentMatch[3];
    } else {
      const leading = lineText.match(/^\s*/)[0];
      const content = lineText.slice(leading.length);
      lines[idx] = `${leading}<!-- ${content} -->`;
    }

    editorEl.textContent = lines.join('\n');
    _emitChange(editorEl);
    return;
  }

  // Comment the selected range
  const selected = range.text;
  const isCommented = /^<!--\s*[\s\S]*\s*-->$/.test(selected.trim());
  const replacement = isCommented
    ? selected.replace(/^\s*<!--\s*/, '').replace(/\s*-->\s*$/, '')
    : `<!-- ${selected} -->`;

  const newText = text.slice(0, range.start) + replacement + text.slice(range.end);
  editorEl.textContent = newText;
  setSelectionRange(editorEl, range.start, range.start + replacement.length);
  _emitChange(editorEl);
}

/**
 * Indent or outdent the selected lines.
 * @param {HTMLElement} editorEl
 * @param {-1 | 1}      direction
 */
function indentSelection(editorEl, direction) {
  const range = getSelectionRange(editorEl);
  const text  = editorEl.textContent ?? '';
  const TAB   = '  '; // 2 spaces

  if (!range) return;

  const startLine = text.slice(0, range.start).split('\n').length;
  const endLine   = text.slice(0, range.end).split('\n').length;

  const lines = text.split('\n');
  for (let i = startLine - 1; i < endLine; i++) {
    if (direction === 1) {
      lines[i] = TAB + lines[i];
    } else {
      lines[i] = lines[i].replace(new RegExp(`^ {1,${TAB.length}}`), '');
    }
  }

  editorEl.textContent = lines.join('\n');
  _emitChange(editorEl);
}

/**
 * Apply a text transform to the current selection.
 * @param {HTMLElement}              editorEl
 * @param {(s: string) => string}    fn
 */
function transformSelection(editorEl, fn) {
  const range = getSelectionRange(editorEl);
  if (!range || range.collapsed) return;

  const text = editorEl.textContent ?? '';
  const transformed = fn(range.text);
  const newText = text.slice(0, range.start) + transformed + text.slice(range.end);

  editorEl.textContent = newText;
  setSelectionRange(editorEl, range.start, range.start + transformed.length);
  _emitChange(editorEl);
}

/** Trigger an 'input' event so editor.js picks up the programmatic change. */
function _emitChange(editorEl) {
  editorEl.dispatchEvent(new Event('input', { bubbles: true }));
}
