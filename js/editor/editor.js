/**
 * js/editor/editor.js
 * Zolto v8.1.0 — Core Editor Surface
 *
 * Owns the contenteditable editor element. Responsibilities:
 *  - Mount the editor surface and bind input handling
 *  - Maintain the plain-text source-of-truth (not the DOM)
 *  - Emit 'zolto:change' on every modification
 *  - Handle paste (strip formatting, insert as plain text)
 *  - Coordinate with cursor.js, selection.js, shortcuts.js,
 *    autocomplete.js, syntax-highlighter.js
 *
 * Design: the contenteditable DOM is a *view* of the source string.
 * On every input event we re-derive the source string from the DOM
 * text content, then re-run the syntax highlighter to rebuild the
 * styled spans. This keeps a single source of truth and avoids
 * DOM/string desync bugs.
 */

'use strict';

import { createLogger }            from '../utils/logger.js';
import { bus, EVENTS }             from '../utils/events.js';
import { debounce16 }              from '../utils/debounce.js';
import { get as stateGet,
         setSource, setCursor,
         setSelection }            from '../state.js';
import { get as getSetting,
         watch as watchSetting }   from '../settings.js';
import { highlightLine,
         highlightAll }            from './syntax-highlighter.js';
import { getCursorPosition,
         setCursorPosition,
         getLineCol }              from './cursor.js';
import { getSelectionRange }       from './selection.js';
import { initShortcuts }           from './shortcuts.js';
import { initAutocomplete,
         handleAutocompleteKey }   from './autocomplete.js';

const logger = createLogger('Editor');

// ─────────────────────────────────────────────────────────────
// 1. Module State
// ─────────────────────────────────────────────────────────────

/** @type {HTMLElement | null} */
let _el = null;

/** Guards against re-entrant input handling during programmatic updates. */
let _isProgrammaticUpdate = false;

/** Last known source string — used to detect actual changes. */
let _lastSource = '';

/** Flag to track if IME composition is in progress */
let _isComposing = false;

// ─────────────────────────────────────────────────────────────
// 2. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Initialise the editor surface.
 * Call once during app bootstrap.
 */
export function initEditor() {
  _el = document.getElementById('zolto-editor');
  if (!_el) {
    logger.error('Editor element #zolto-editor not found');
    return;
  }

  // Core input handling
  _el.addEventListener('input',     onInput);
  _el.addEventListener('paste',     onPaste);
  _el.addEventListener('keydown',   onKeyDown);
  _el.addEventListener('keyup',     onKeyUp);
  _el.addEventListener('click',     onCursorActivity);
  _el.addEventListener('focus',     onFocus);
  _el.addEventListener('blur',      onBlur);
  
  // IME composition events for Japanese, Chinese, Korean input
  _el.addEventListener('compositionstart', onCompositionStart);
  _el.addEventListener('compositionend',   onCompositionEnd);

  // Drag & drop (images, files) — insert as embed tags
  _el.addEventListener('dragover',  onDragOver);
  _el.addEventListener('drop',      onDrop);

  // Sub-modules
  initShortcuts(_el);
  initAutocomplete(_el);

  // Apply initial settings
  applyEditorSettings();
  watchSetting('fontSize',   applyEditorSettings);
  watchSetting('fontFamily', applyEditorSettings);
  watchSetting('tabSize',    applyEditorSettings);
  watchSetting('wordWrap',   applyEditorSettings);
  watchSetting('spellCheck', applyEditorSettings);

  // Listen for format/insert bus events from the toolbar
  bus.on('zolto:format', handleFormatAction);
  bus.on('zolto:insert', handleInsertAction);

  // Load initial document content
  const doc = stateGet('document');
  if (doc.source) {
    setContent(doc.source);
  }

  bus.emit(EVENTS.EDITOR_READY);
  logger.info('Editor initialised');
}

// ─────────────────────────────────────────────────────────────
// 3. Settings Application
// ─────────────────────────────────────────────────────────────

function applyEditorSettings() {
  if (!_el) return;
  _el.style.fontSize   = `${getSetting('fontSize')}px`;
  _el.style.fontFamily = `"${getSetting('fontFamily')}", monospace`;
  _el.style.tabSize    = String(getSetting('tabSize'));
  _el.style.whiteSpace = getSetting('wordWrap') ? 'pre-wrap' : 'pre';
  _el.spellcheck       = getSetting('spellCheck') !== 'off';
}

// ─────────────────────────────────────────────────────────────
// 4. Content Get / Set
// ─────────────────────────────────────────────────────────────

/**
 * Get the current plain-text source from the editor DOM.
 * @returns {string}
 */
export function getContent() {
  if (!_el) return '';
  return _el.textContent ?? '';
}

/**
 * Set the editor content programmatically (e.g. opening a document).
 * Does not emit 'zolto:change' for the initial set, but does for
 * subsequent calls so the preview stays in sync.
 * @param {string} source
 * @param {boolean} [emitChange=false]
 */
export function setContent(source, emitChange = false) {
  if (!_el) return;

  _isProgrammaticUpdate = true;
  _el.textContent = source;
  _lastSource = source;

  // Apply syntax highlighting
  highlightAll(_el);

  _isProgrammaticUpdate = false;

  if (emitChange) {
    bus.emit(EVENTS.EDITOR_CHANGE, source);
  }
}

/**
 * Insert text at the current cursor position.
 * @param {string} text
 */
export function insertAtCursor(text) {
  if (!_el) return;
  _el.focus();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    _el.textContent += text;
    onInput();
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // Move cursor to end of inserted text
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);

  onInput();
}

/**
 * Wrap the current selection with `before` and `after` strings.
 * If no selection, inserts before+after with cursor in between.
 * @param {string} before
 * @param {string} after
 * @param {string} [placeholder='']
 */
export function wrapSelection(before, after, placeholder = '') {
  if (!_el) return;
  _el.focus();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range    = selection.getRangeAt(0);
  const selected = range.toString();
  const content  = selected || placeholder;

  range.deleteContents();
  const textNode = document.createTextNode(`${before}${content}${after}`);
  range.insertNode(textNode);

  // Select the inserted placeholder/content for easy overtyping
  if (!selected && placeholder) {
    const newRange = document.createRange();
    newRange.setStart(textNode, before.length);
    newRange.setEnd(textNode, before.length + placeholder.length);
    selection.removeAllRanges();
    selection.addRange(newRange);
  } else {
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  onInput();
}

// ─────────────────────────────────────────────────────────────
// 5. Input Event Handling
// ─────────────────────────────────────────────────────────────

const _debouncedHighlight = debounce16(() => {
  if (_el) highlightAll(_el);
});

function onInput() {
  if (_isProgrammaticUpdate || !_el) return;
  
  // Skip input handling during IME composition
  // The actual text will be processed when composition ends
  if (_isComposing) return;

  const source = getContent();
  if (source === _lastSource) return;
  _lastSource = source;

  // Update cursor position in state
  updateCursorState();

  // Mark document dirty and trigger render pipeline
  setSource(source);

  // Re-highlight syntax (debounced to avoid jank while typing fast)
  _debouncedHighlight();
}

function onPaste(event) {
  event.preventDefault();
  const text = (event.clipboardData ?? window.clipboardData).getData('text/plain');
  insertAtCursor(text);
}

function onKeyDown(event) {
  // Tab key — insert spaces instead of moving focus
  if (event.key === 'Tab') {
    event.preventDefault();
    const tabSize = getSetting('tabSize');
    if (event.shiftKey) {
      _dedentCurrentLine();
    } else {
      insertAtCursor(' '.repeat(tabSize));
    }
    return;
  }

  // Auto-close brackets/tags
  if (getSetting('autoCloseBrackets')) {
    const pair = _bracketPairs[event.key];
    if (pair && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      wrapSelection(event.key, pair);
      return;
    }
  }

  // Enter key — auto-continue list markers
  if (event.key === 'Enter' && !event.shiftKey) {
    if (_handleEnterContinuation()) {
      event.preventDefault();
      return;
    }
  }

  // Delegate to autocomplete (arrow keys, enter, escape when popup open)
  if (handleAutocompleteKey(event)) {
    return;
  }
}

function onKeyUp(event) {
  updateCursorState();

  // Trigger autocomplete on relevant keys
  if (event.key === '<' || event.key === '@' || /^[a-zA-Z]$/.test(event.key)) {
    bus.emit('zolto:editor:keyup', { key: event.key });
  }
}

function onCursorActivity() {
  updateCursorState();
}

function onFocus() {
  _el?.classList.add('zolto-editor-focused');
}

function onBlur() {
  _el?.classList.remove('zolto-editor-focused');
}

// ─────────────────────────────────────────────────────────────
// IME Composition Handling (Japanese, Chinese, Korean)
// ─────────────────────────────────────────────────────────────

/**
 * Handle IME composition start event.
 * This is triggered when the user starts typing with an IME
 * (e.g., Japanese Kana-Kanji conversion or Chinese Pinyin).
 */
function onCompositionStart(event) {
  _isComposing = true;
  logger.debug('IME composition started');
}

/**
 * Handle IME composition end event.
 * This is triggered when the IME composition is finished
 * and the final text is committed to the editor.
 */
function onCompositionEnd(event) {
  _isComposing = false;
  logger.debug('IME composition ended');
  // Trigger input handling to process the committed text
  onInput();
}

// ─────────────────────────────────────────────────────────────
// 6. Cursor State Sync
// ─────────────────────────────────────────────────────────────

function updateCursorState() {
  if (!_el) return;
  const offset = getCursorPosition(_el);
  const { line, col } = getLineCol(_el, offset);
  setCursor(line, col, offset);

  const range = getSelectionRange(_el);
  if (range) {
    setSelection(range.start, range.end, range.text);
  }
}

// ─────────────────────────────────────────────────────────────
// 7. Bracket Auto-Close
// ─────────────────────────────────────────────────────────────

const _bracketPairs = Object.freeze({
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>',
  '"': '"',
  "'": "'",
  '`': '`',
});

// ─────────────────────────────────────────────────────────────
// 8. List Continuation on Enter
// ─────────────────────────────────────────────────────────────

/**
 * Check if the current line is a list item / blockquote and,
 * if so, continue the marker on the new line.
 * @returns {boolean} true if handled (caller should preventDefault)
 */
function _handleEnterContinuation() {
  if (!_el) return false;

  const offset = getCursorPosition(_el);
  const source = getContent();
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd   = source.indexOf('\n', offset);
  const line      = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);

  // Unordered list: "- ", "* ", "+ "
  const ulMatch = line.match(/^(\s*)([-*+])\s/);
  if (ulMatch) {
    if (line.trim() === ulMatch[2]) {
      // Empty list item — remove marker instead of continuing
      _replaceCurrentLine('');
      return true;
    }
    insertAtCursor(`\n${ulMatch[1]}${ulMatch[2]} `);
    return true;
  }

  // Ordered list: "1. ", "2. "
  const olMatch = line.match(/^(\s*)(\d+)\.\s/);
  if (olMatch) {
    if (line.trim() === `${olMatch[2]}.`) {
      _replaceCurrentLine('');
      return true;
    }
    const nextNum = parseInt(olMatch[2], 10) + 1;
    insertAtCursor(`\n${olMatch[1]}${nextNum}. `);
    return true;
  }

  // Checklist: "- [ ] "
  const checklistMatch = line.match(/^(\s*)([-*+])\s\[([ x~o!])\]\s/);
  if (checklistMatch) {
    insertAtCursor(`\n${checklistMatch[1]}${checklistMatch[2]} [ ] `);
    return true;
  }

  // Blockquote: "> "
  const bqMatch = line.match(/^(\s*)>\s/);
  if (bqMatch) {
    if (line.trim() === '>') {
      _replaceCurrentLine('');
      return true;
    }
    insertAtCursor(`\n${bqMatch[1]}> `);
    return true;
  }

  return false;
}

/** Replace the current line's content with `text`. */
function _replaceCurrentLine(text) {
  if (!_el) return;
  const offset = getCursorPosition(_el);
  const source = getContent();
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd   = source.indexOf('\n', offset);
  const end       = lineEnd === -1 ? source.length : lineEnd;

  const newSource = source.slice(0, lineStart) + text + source.slice(end);
  setContent(newSource, true);
  setCursorPosition(_el, lineStart + text.length);
}

/** Remove one tab-size worth of leading whitespace from current line. */
function _dedentCurrentLine() {
  if (!_el) return;
  const tabSize  = getSetting('tabSize');
  const offset   = getCursorPosition(_el);
  const source   = getContent();
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const line      = source.slice(lineStart);
  const leading   = line.match(/^ */)[0];
  const removeLen = Math.min(leading.length, tabSize);

  if (removeLen === 0) return;

  const newSource = source.slice(0, lineStart) + source.slice(lineStart + removeLen);
  setContent(newSource, true);
  setCursorPosition(_el, Math.max(lineStart, offset - removeLen));
}

// ─────────────────────────────────────────────────────────────
// 9. Drag & Drop (image/file insertion)
// ─────────────────────────────────────────────────────────────

function onDragOver(event) {
  event.preventDefault();
  _el?.classList.add('zolto-editor-drag-over');
}

function onDrop(event) {
  event.preventDefault();
  _el?.classList.remove('zolto-editor-drag-over');

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        insertAtCursor(`<embed src="${dataUrl}" type="image" alt="${file.name}" />\n`);
      };
      reader.readAsDataURL(file);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 10. Toolbar Format / Insert Actions
// ─────────────────────────────────────────────────────────────

/** @param {string} action */
function handleFormatAction(action) {
  switch (action) {
    case 'bold':   wrapSelection('**', '**', 'bold text'); break;
    case 'italic': wrapSelection('*', '*', 'italic text'); break;
    case 'code':   wrapSelection('`', '`', 'code'); break;
    case 'link':   wrapSelection('[', '](url)', 'link text'); break;
    case 'h1':     _prefixLine('# '); break;
    case 'h2':     _prefixLine('## '); break;
    case 'h3':     _prefixLine('### '); break;
  }
}

/** @param {string} action */
function handleInsertAction(action) {
  switch (action) {
    case 'math':
      insertAtCursor('\n<math name="">\n  \n</math>\n');
      break;
    case 'diagram':
      insertAtCursor('\n<diagram type="flowchart" dir="LR">\n  [Start] --> [End]\n</diagram>\n');
      break;
    case 'chart':
      insertAtCursor('\n<chart type="bar" title="">\n  Label: 0\n</chart>\n');
      break;
    case 'callout':
      insertAtCursor('\n<tip>\n  \n</tip>\n');
      break;
    case 'table':
      insertAtCursor('\n| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n');
      break;
  }
}

/** Prefix the current line with `prefix` (used for headings). */
function _prefixLine(prefix) {
  if (!_el) return;
  const offset = getCursorPosition(_el);
  const source = getContent();
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;

  // Remove any existing heading marker first
  const lineEnd = source.indexOf('\n', lineStart);
  const end     = lineEnd === -1 ? source.length : lineEnd;
  const line    = source.slice(lineStart, end);
  const stripped = line.replace(/^#{1,6}\s*/, '');

  const newSource = source.slice(0, lineStart) + prefix + stripped + source.slice(end);
  setContent(newSource, true);
  setCursorPosition(_el, lineStart + prefix.length + stripped.length);
}

// ─────────────────────────────────────────────────────────────
// 11. Public Getters
// ─────────────────────────────────────────────────────────────

/** @returns {HTMLElement | null} */
export function getEditorElement() { return _el; }

/** Focus the editor. */
export function focusEditor() { _el?.focus(); }
