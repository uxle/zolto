/**
 * js/editor/autocomplete.js
 * Zolto v8.1.0 — Tag & Component Autocomplete
 *
 * Provides inline autocomplete suggestions when the user types `<`
 * (tag names), `@` (mentions), or the first characters of a known
 * tag name. Suggestions appear in the floating #zolto-autocomplete
 * popup defined in index.html.
 *
 * Trigger characters:
 *   `<`         → all known block / inline tags
 *   `<[a-z]`    → filtered tag name suggestions
 *   `@`         → @mention suggestions (if configured)
 *
 * After a tag name is selected, attribute suggestions activate
 * when the user types a space inside the opening tag.
 *
 * Keyboard nav:
 *   ArrowDown / ArrowUp  → move through suggestions
 *   Enter / Tab          → accept selected suggestion
 *   Escape               → close popup
 */

'use strict';

import { createLogger }           from '../utils/logger.js';
import { getCursorPosition,
         setCursorPosition }      from './cursor.js';
import { ZoltoComponentRuntime }  from '../parser/transformer.js';
import { bus }                    from '../utils/events.js';

const logger = createLogger('Editor');

// ─────────────────────────────────────────────────────────────
// 1. Suggestion Databases
// ─────────────────────────────────────────────────────────────

/**
 * All known Zolto block tags with their default snippet.
 * {|} marks the cursor insertion point after completion.
 * @type {Array<{label: string, snippet: string, desc: string}>}
 */
const BLOCK_TAG_SUGGESTIONS = [
  // Domain 1
  { label: 'tip',          snippet: '<tip>{|}</tip>',              desc: 'Tip callout' },
  { label: 'note',         snippet: '<note>{|}</note>',            desc: 'Note callout' },
  { label: 'warning',      snippet: '<warning>{|}</warning>',      desc: 'Warning callout' },
  { label: 'danger',       snippet: '<danger>{|}</danger>',        desc: 'Danger callout' },
  { label: 'important',    snippet: '<important>{|}</important>',  desc: 'Important callout' },
  { label: 'info',         snippet: '<info>{|}</info>',            desc: 'Info callout' },
  { label: 'success',      snippet: '<success>{|}</success>',      desc: 'Success callout' },
  { label: 'definition',   snippet: '<definition>{|}</definition>', desc: 'Definition callout' },
  { label: 'theorem',      snippet: '<theorem>{|}</theorem>',      desc: 'Theorem callout' },
  { label: 'accordion',    snippet: '<accordion>\n  <details summary="Section">\n    {|}\n  </details>\n</accordion>', desc: 'Accordion group' },
  { label: 'details',      snippet: '<details summary="{|}">\n  \n</details>',     desc: 'Collapsible spoiler' },
  { label: 'tabs',         snippet: '<tabs>\n  <tab label="Tab 1">{|}</tab>\n  <tab label="Tab 2"></tab>\n</tabs>', desc: 'Tab group' },
  { label: 'card',         snippet: '<card title="{|}">\n  \n</card>',             desc: 'Card block' },
  { label: 'cards',        snippet: '<cards cols="3">\n  <card>{|}</card>\n</cards>', desc: 'Card grid' },
  { label: 'steps',        snippet: '<steps>\n  <step title="{|}">\n    \n  </step>\n</steps>', desc: 'Step sequence' },
  { label: 'hero',         snippet: '<hero>\n  {|}\n</hero>',                      desc: 'Hero section' },
  { label: 'columns',      snippet: '<columns>\n  <col>{|}</col>\n  <col></col>\n</columns>', desc: 'Column layout' },

  // Domain 2
  { label: 'math',         snippet: '<math name="{|}">\n  \n</math>',              desc: 'Math block (LaTeX)' },
  { label: 'm',            snippet: '<m>{|}</m>',                                  desc: 'Inline math' },

  // Domain 3
  { label: 'diagram',      snippet: '<diagram type="flowchart" dir="LR">\n  {|}\n</diagram>', desc: 'Diagram' },

  // Domain 4
  { label: 'vector',       snippet: '<vector width="800" height="600">\n  {|}\n</vector>', desc: 'SVG vector scene' },

  // Domain 5
  { label: 'grid',         snippet: '<grid cols="{|}">\n  \n</grid>',             desc: 'CSS grid layout' },
  { label: 'flex',         snippet: '<flex direction="row" gap="1rem">\n  {|}\n</flex>', desc: 'Flex layout' },
  { label: 'presentation', snippet: '<presentation>\n  <slide layout="title">\n    {|}\n  </slide>\n</presentation>', desc: 'Slide presentation' },
  { label: 'split',        snippet: '<split>\n  <col>{|}</col>\n  <col></col>\n</split>', desc: 'Split pane' },
  { label: 'panel',        snippet: '<panel title="{|}">\n  \n</panel>',          desc: 'Collapsible panel' },
  { label: 'canvas',       snippet: '<canvas width="800" height="480">\n  {|}\n</canvas>', desc: 'Absolute canvas' },
  { label: 'whiteboard',   snippet: '<whiteboard>\n  {|}\n</whiteboard>',         desc: 'Infinite whiteboard' },

  // Domain 6
  { label: 'define',       snippet: '<define name="{|}" props="">\n  \n</define>', desc: 'Component definition' },
  { label: 'slot',         snippet: '<slot name="{|}"></slot>',                   desc: 'Named slot' },
  { label: 'macro',        snippet: '<macro name="{|}" params="">\n  \n</macro>', desc: 'Macro definition' },
  { label: 'theme',        snippet: '<theme name="{|}">\n  --accent-primary: ;\n</theme>', desc: 'Scoped theme' },

  // Assessment
  { label: 'mcq',          snippet: '<mcq>\n  <question>{|}</question>\n  <option>Option A</option>\n  <option correct>Option B</option>\n  <explanation></explanation>\n</mcq>', desc: 'Multiple choice question' },
  { label: 'flashcard',    snippet: '<flashcard>\n  <front>{|}</front>\n  <back></back>\n</flashcard>', desc: 'Flashcard' },

  // Charts
  { label: 'chart',        snippet: '<chart type="{|}" title="">\n  \n</chart>',  desc: 'Chart' },

  // Utility
  { label: 'import',       snippet: '<import src="{|}" />',                       desc: 'Import file' },
  { label: 'embed',        snippet: '<embed src="{|}" alt="" />',                 desc: 'Embed image/video' },
  { label: 'banner',       snippet: '<banner>\n  {|}\n</banner>',                 desc: 'Announcement banner' },
];

/**
 * Attribute suggestions per tag name.
 * @type {Record<string, Array<{label: string, snippet: string}>>}
 */
const ATTR_SUGGESTIONS = {
  diagram:  [
    { label: 'type',        snippet: 'type="{|}"' },
    { label: 'dir',         snippet: 'dir="{|}"' },
    { label: 'interactive', snippet: 'interactive' },
    { label: 'animated',    snippet: 'animated' },
    { label: 'caption',     snippet: 'caption="{|}"' },
  ],
  chart:    [
    { label: 'type',    snippet: 'type="{|}"' },
    { label: 'title',   snippet: 'title="{|}"' },
    { label: 'smooth',  snippet: 'smooth' },
  ],
  math:     [
    { label: 'name',     snippet: 'name="{|}"' },
    { label: 'label',    snippet: 'label="{|}"' },
    { label: 'numbered', snippet: 'numbered' },
    { label: 'env',      snippet: 'env="{|}"' },
    { label: 'type',     snippet: 'type="plot"' },
  ],
  grid:     [
    { label: 'cols',    snippet: 'cols="{|}"' },
    { label: 'gap',     snippet: 'gap="{|}"' },
    { label: 'auto',    snippet: 'auto' },
  ],
  card:     [
    { label: 'title',   snippet: 'title="{|}"' },
    { label: 'icon',    snippet: 'icon="{|}"' },
    { label: 'variant', snippet: 'variant="{|}"' },
    { label: 'href',    snippet: 'href="{|}"' },
  ],
  embed:    [
    { label: 'src',     snippet: 'src="{|}"' },
    { label: 'alt',     snippet: 'alt="{|}"' },
    { label: 'type',    snippet: 'type="{|}"' },
    { label: 'caption', snippet: 'caption="{|}"' },
  ],
};

// ─────────────────────────────────────────────────────────────
// 2. Module State
// ─────────────────────────────────────────────────────────────

/** @type {HTMLElement | null} */
let _popup     = null;
let _editorEl  = null;
let _selectedIndex = -1;
let _currentSuggestions = [];
let _triggerOffset = 0;
let _isOpen    = false;

// ─────────────────────────────────────────────────────────────
// 3. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Initialise the autocomplete system.
 * @param {HTMLElement} editorEl
 */
export function initAutocomplete(editorEl) {
  _editorEl = editorEl;
  _popup    = document.getElementById('zolto-autocomplete');

  if (!_popup) {
    logger.warn('Autocomplete popup #zolto-autocomplete not found');
    return;
  }

  // Delegate item clicks
  _popup.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Don't blur the editor
    const item = /** @type {HTMLElement} */ (e.target).closest('.zolto-autocomplete-item');
    if (item) {
      const idx = parseInt(item.dataset.index ?? '0', 10);
      acceptSuggestion(idx);
    }
  });

  logger.debug('Autocomplete initialised');
}

// ─────────────────────────────────────────────────────────────
// 4. Trigger Detection
// ─────────────────────────────────────────────────────────────

/**
 * Inspect the text before the cursor and show suggestions if appropriate.
 * Called by editor.js on every keyup.
 */
export function triggerAutocomplete() {
  if (!_editorEl || !_popup) return;

  const offset = getCursorPosition(_editorEl);
  const text   = (_editorEl.textContent ?? '').slice(0, offset);

  // Check for partial tag name: < followed by letters
  const tagMatch = text.match(/<([A-Za-z][\w-]*)$/);
  if (tagMatch) {
    const partial = tagMatch[1].toLowerCase();
    _triggerOffset = offset - tagMatch[0].length;
    showTagSuggestions(partial);
    return;
  }

  // Bare < trigger — show all tags
  const bareTagMatch = text.match(/<$/);
  if (bareTagMatch) {
    _triggerOffset = offset - 1;
    showTagSuggestions('');
    return;
  }

  // Inside a tag — suggest attributes
  const attrMatch = text.match(/<([A-Za-z][\w-]*)\s[\w-]*$/);
  if (attrMatch) {
    const tagName = attrMatch[1].toLowerCase();
    const partial = text.match(/[\w-]+$$/)?.[0] ?? '';
    showAttrSuggestions(tagName, partial);
    return;
  }

  // Component names (PascalCase starting char)
  const componentMatch = text.match(/<([A-Z]\w*)$/);
  if (componentMatch) {
    const partial = componentMatch[1];
    _triggerOffset = offset - componentMatch[0].length;
    showComponentSuggestions(partial);
    return;
  }

  // Nothing triggered — close popup
  closePopup();
}

// ─────────────────────────────────────────────────────────────
// 5. Suggestion Displays
// ─────────────────────────────────────────────────────────────

function showTagSuggestions(partial) {
  const filtered = BLOCK_TAG_SUGGESTIONS.filter(s =>
    s.label.startsWith(partial)
  );
  _show(filtered.map(s => ({
    label: s.label,
    snippet: s.snippet,
    desc: s.desc,
    icon: '⬡',
  })));
}

function showAttrSuggestions(tagName, partial) {
  const attrs = ATTR_SUGGESTIONS[tagName];
  if (!attrs || attrs.length === 0) { closePopup(); return; }
  const filtered = attrs.filter(a => a.label.startsWith(partial));
  _show(filtered.map(a => ({
    label: a.label,
    snippet: a.snippet,
    desc: `${tagName} attribute`,
    icon: '◈',
  })));
}

function showComponentSuggestions(partial) {
  const names = ZoltoComponentRuntime.list().filter(n => n.startsWith(partial));
  if (names.length === 0) { closePopup(); return; }
  _show(names.map(name => ({
    label: name,
    snippet: `<${name}{|}></${name}>`,
    desc: 'Component',
    icon: '◇',
  })));
}

// ─────────────────────────────────────────────────────────────
// 6. Popup Rendering & Positioning
// ─────────────────────────────────────────────────────────────

function _show(suggestions) {
  if (!_popup || !_editorEl) return;
  if (suggestions.length === 0) { closePopup(); return; }

  _currentSuggestions = suggestions;
  _selectedIndex = 0;
  _isOpen = true;

  _popup.innerHTML = suggestions.map((s, i) => `
    <div class="zolto-autocomplete-item${i === 0 ? ' zolto-autocomplete-selected' : ''}"
         data-index="${i}" role="option" aria-selected="${i === 0}">
      <span class="zolto-autocomplete-icon">${s.icon}</span>
      <span class="zolto-autocomplete-label">&lt;${s.label}&gt;</span>
      ${s.desc ? `<span class="zolto-autocomplete-desc">${s.desc}</span>` : ''}
    </div>`
  ).join('');

  // Position popup near cursor
  _positionPopup();
  _popup.hidden = false;
  _popup.removeAttribute('aria-hidden');
}

function _positionPopup() {
  if (!_popup || !_editorEl) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();

  const popupH = Math.min(_currentSuggestions.length * 36 + 8, 240);
  const viewH  = window.innerHeight;
  const top    = rect.bottom + popupH > viewH
    ? rect.top - popupH
    : rect.bottom + 4;

  _popup.style.top  = `${top}px`;
  _popup.style.left = `${rect.left}px`;
}

// ─────────────────────────────────────────────────────────────
// 7. Keyboard Navigation
// ─────────────────────────────────────────────────────────────

/**
 * Handle keyboard events when the popup is open.
 * Returns true if the event was consumed by autocomplete.
 * Called from editor.js onKeyDown BEFORE default behaviour.
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function handleAutocompleteKey(event) {
  if (!_isOpen) return false;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      _moveSelection(1);
      return true;

    case 'ArrowUp':
      event.preventDefault();
      _moveSelection(-1);
      return true;

    case 'Enter':
    case 'Tab':
      if (_selectedIndex >= 0) {
        event.preventDefault();
        acceptSuggestion(_selectedIndex);
        return true;
      }
      return false;

    case 'Escape':
      event.preventDefault();
      closePopup();
      return true;

    default:
      return false;
  }
}

function _moveSelection(delta) {
  if (!_popup) return;
  _selectedIndex = Math.max(0, Math.min(
    _currentSuggestions.length - 1,
    _selectedIndex + delta
  ));

  for (const item of _popup.querySelectorAll('.zolto-autocomplete-item')) {
    const el  = /** @type {HTMLElement} */ (item);
    const idx = parseInt(el.dataset.index ?? '0', 10);
    const active = idx === _selectedIndex;
    el.classList.toggle('zolto-autocomplete-selected', active);
    el.setAttribute('aria-selected', String(active));
    if (active) el.scrollIntoView({ block: 'nearest' });
  }
}

// ─────────────────────────────────────────────────────────────
// 8. Suggestion Acceptance
// ─────────────────────────────────────────────────────────────

/**
 * Accept a suggestion, inserting its snippet into the editor.
 * @param {number} index
 */
export function acceptSuggestion(index) {
  if (!_editorEl) return;
  const suggestion = _currentSuggestions[index];
  if (!suggestion) return;

  const offset = getCursorPosition(_editorEl);
  const text   = _editorEl.textContent ?? '';

  // Determine the text to replace (from _triggerOffset to cursor)
  const before  = text.slice(0, _triggerOffset);
  const after   = text.slice(offset);
  const snippet = suggestion.snippet;

  // Find cursor position within snippet (marked by {|})
  const cursorMark = '{|}';
  const cursorPos  = snippet.indexOf(cursorMark);
  const cleanSnippet = snippet.replace(cursorMark, '');

  _editorEl.textContent = before + cleanSnippet + after;

  // Place cursor at {|} position, or end of snippet
  const newOffset = _triggerOffset + (cursorPos !== -1 ? cursorPos : cleanSnippet.length);
  setCursorPosition(_editorEl, newOffset);

  // Trigger re-render and re-highlight
  _editorEl.dispatchEvent(new Event('input', { bubbles: true }));

  closePopup();
  logger.debug('Autocomplete: accepted', suggestion.label);
}

// ─────────────────────────────────────────────────────────────
// 9. Close
// ─────────────────────────────────────────────────────────────

export function closePopup() {
  if (!_popup) return;
  _isOpen = false;
  _popup.hidden = true;
  _popup.setAttribute('aria-hidden', 'true');
  _popup.innerHTML = '';
  _currentSuggestions = [];
  _selectedIndex = -1;
}

export function isOpen() { return _isOpen; }
