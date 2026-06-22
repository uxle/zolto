/**
 * js/editor/command-palette.js
 * Zolto v8.1.0 — Command Palette (Ctrl/Cmd+K)
 *
 * Powers the floating command palette overlay. Commands are
 * grouped into categories and fuzzy-filtered in real time as
 * the user types.
 *
 * Architecture:
 *  - COMMANDS array: all registered commands (static + dynamic)
 *  - initPalette():  wires input, keyboard nav, item clicks
 *  - filterCommands(query): fuzzy-match + rank results
 *  - renderResults():  update the #zolto-palette-results DOM
 *
 * Dynamic commands:
 *  - Recent documents (from storage.js)
 *  - Registered component names (from ZoltoComponentRuntime)
 *  - Registered plugins (from PluginManager)
 *
 * Opened by app.js via openPalette() when Ctrl/Cmd+K fires.
 */

'use strict';

import { createLogger }           from '../utils/logger.js';
import { navigate, newDoc,
         openDoc }                from '../router.js';
import { forceSave }              from '../storage.js';
import { bus, EVENTS }            from '../utils/events.js';
import { list as listDocs }       from '../storage.js';
import { get as getSetting,
         set as setSetting }      from '../settings.js';
import { ZoltoComponentRuntime }  from '../parser/transformer.js';
import { AVAILABLE_THEMES }       from '../settings.js';
import { listShortcuts }          from './shortcuts.js';

const logger = createLogger('Editor');

// ─────────────────────────────────────────────────────────────
// 1. Command Registry
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} Command
 * @property {string}   id
 * @property {string}   label
 * @property {string}   [description]
 * @property {string}   [group]       — group heading
 * @property {string}   [icon]
 * @property {string}   [kbd]         — keyboard shortcut hint
 * @property {Function} action        — () => void
 */

/** @type {Command[]} */
const STATIC_COMMANDS = [
  // ── Document ──────────────────────────────────────────────
  {
    id: 'doc:new', label: 'New Document', icon: '📄',
    group: 'Document', kbd: 'Ctrl+N',
    action: () => newDoc(),
  },
  {
    id: 'doc:save', label: 'Save Document', icon: '💾',
    group: 'Document', kbd: 'Ctrl+S',
    action: () => forceSave(),
  },
  {
    id: 'doc:open-settings', label: 'Open Settings', icon: '⚙️',
    group: 'Document',
    action: () => navigate('/settings'),
  },
  {
    id: 'doc:open-plugins', label: 'Plugin Manager', icon: '🔌',
    group: 'Document',
    action: () => navigate('/plugins'),
  },

  // ── View ──────────────────────────────────────────────────
  {
    id: 'view:live', label: 'View: Live Split', icon: '⬛',
    group: 'View', kbd: 'Ctrl+1',
    action: () => {
      setSetting('previewMode', 'live');
      document.documentElement.setAttribute('data-preview-mode', 'live');
    },
  },
  {
    id: 'view:focus', label: 'View: Focus (Preview Only)', icon: '◻',
    group: 'View', kbd: 'Ctrl+2',
    action: () => {
      setSetting('previewMode', 'focus');
      document.documentElement.setAttribute('data-preview-mode', 'focus');
    },
  },
  {
    id: 'view:split', label: 'View: Split', icon: '▪▪',
    group: 'View', kbd: 'Ctrl+3',
    action: () => {
      setSetting('previewMode', 'split');
      document.documentElement.setAttribute('data-preview-mode', 'split');
    },
  },
  {
    id: 'view:sidebar', label: 'Toggle Sidebar', icon: '◧',
    group: 'View', kbd: 'Ctrl+\\',
    action: () => {
      const open = !getSetting('sidebarOpen');
      setSetting('sidebarOpen', open);
    },
  },
  {
    id: 'view:preview-tab', label: 'Open Preview in New Tab', icon: '🔗',
    group: 'View',
    action: () => bus.emit('zolto:action', 'preview:open-tab'),
  },

  // ── Format ────────────────────────────────────────────────
  {
    id: 'format:bold',   label: 'Format: Bold',   icon: 'B', group: 'Format', kbd: 'Ctrl+B',
    action: () => bus.emit('zolto:format', 'bold'),
  },
  {
    id: 'format:italic', label: 'Format: Italic', icon: 'I', group: 'Format', kbd: 'Ctrl+I',
    action: () => bus.emit('zolto:format', 'italic'),
  },
  {
    id: 'format:code',   label: 'Format: Inline Code', icon: '</>',
    group: 'Format',
    action: () => bus.emit('zolto:format', 'code'),
  },
  {
    id: 'format:link',   label: 'Format: Link',   icon: '🔗', group: 'Format', kbd: 'Ctrl+K',
    action: () => bus.emit('zolto:format', 'link'),
  },
  {
    id: 'format:h1', label: 'Heading 1', icon: 'H1', group: 'Format',
    action: () => bus.emit('zolto:format', 'h1'),
  },
  {
    id: 'format:h2', label: 'Heading 2', icon: 'H2', group: 'Format',
    action: () => bus.emit('zolto:format', 'h2'),
  },
  {
    id: 'format:h3', label: 'Heading 3', icon: 'H3', group: 'Format',
    action: () => bus.emit('zolto:format', 'h3'),
  },

  // ── Insert ────────────────────────────────────────────────
  {
    id: 'insert:math',     label: 'Insert: Math Block',    icon: '∑', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'math'),
  },
  {
    id: 'insert:diagram',  label: 'Insert: Diagram',       icon: '⬡', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'diagram'),
  },
  {
    id: 'insert:chart',    label: 'Insert: Chart',         icon: '📊', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'chart'),
  },
  {
    id: 'insert:callout',  label: 'Insert: Callout',       icon: 'ℹ️', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'callout'),
  },
  {
    id: 'insert:table',    label: 'Insert: Table',         icon: '⊞', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'table'),
  },
  {
    id: 'insert:tip',      label: 'Insert: Tip Callout',   icon: '💡', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'tip'),
  },
  {
    id: 'insert:warning',  label: 'Insert: Warning',       icon: '⚠️', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'warning'),
  },
  {
    id: 'insert:mcq',      label: 'Insert: Multiple Choice Question', icon: '❓', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'mcq'),
  },
  {
    id: 'insert:flashcard', label: 'Insert: Flashcard', icon: '🃏', group: 'Insert',
    action: () => bus.emit('zolto:insert', 'flashcard'),
  },

  // ── Export ────────────────────────────────────────────────
  {
    id: 'export:html',     label: 'Export as HTML',        icon: '⬡', group: 'Export',
    action: () => bus.emit('zolto:action', 'export:html'),
  },
  {
    id: 'export:pdf',      label: 'Export as PDF',         icon: '⬛', group: 'Export',
    action: () => bus.emit('zolto:action', 'export:pdf'),
  },
  {
    id: 'export:markdown', label: 'Export as Markdown',    icon: '↓',  group: 'Export',
    action: () => bus.emit('zolto:action', 'export:markdown'),
  },
  {
    id: 'export:text',     label: 'Export as Plain Text',  icon: '≡',  group: 'Export',
    action: () => bus.emit('zolto:action', 'export:text'),
  },
  {
    id: 'export:json',     label: 'Export AST as JSON',    icon: '{}', group: 'Export',
    action: () => bus.emit('zolto:action', 'export:json'),
  },
];

/** @type {Command[]} */
let _dynamicCommands = [];

// ─────────────────────────────────────────────────────────────
// 2. Module State
// ─────────────────────────────────────────────────────────────

let _inputEl   = null;
let _resultsEl = null;
let _selectedIndex = 0;
let _filtered  = /** @type {Command[]} */ ([]);
let _initialised = false;

// ─────────────────────────────────────────────────────────────
// 3. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Initialise the command palette.
 * Called lazily by app.js when the palette first opens.
 */
export function initPalette() {
  if (_initialised) {
    // Already initialised — just refresh dynamic commands and focus
    _refreshDynamic().then(() => {
      renderResults((_inputEl?.value ?? '').trim());
      _inputEl?.focus();
    });
    return;
  }
  _initialised = true;

  _inputEl   = document.getElementById('zolto-palette-input');
  _resultsEl = document.getElementById('zolto-palette-results');

  if (!_inputEl || !_resultsEl) {
    logger.error('Command palette DOM elements not found');
    return;
  }

  // Input filter
  _inputEl.addEventListener('input', () => {
    renderResults(_inputEl.value.trim());
  });

  // Keyboard navigation
  _inputEl.addEventListener('keydown', onPaletteKeyDown);

  // Build theme commands
  for (const theme of AVAILABLE_THEMES) {
    STATIC_COMMANDS.push({
      id:    `theme:${theme.id}`,
      label: `Theme: ${theme.label}`,
      icon:  '◑',
      group: 'Theme',
      action: () => {
        setSetting('theme', theme.id);
        document.documentElement.setAttribute('data-theme', theme.id);
      },
    });
  }

  // Build shortcut commands
  for (const s of listShortcuts()) {
    if (!STATIC_COMMANDS.find(c => c.kbd === s.keys)) {
      STATIC_COMMANDS.push({
        id:    `shortcut:${s.description.toLowerCase().replace(/\s+/g, '-')}`,
        label: s.description,
        icon:  '⌨',
        group: 'Keyboard Shortcuts',
        kbd:   s.keys,
        action: () => { /* shortcut is informational */ },
      });
    }
  }

  // Initial dynamic commands + render
  _refreshDynamic().then(() => {
    renderResults('');
    _inputEl.focus();
    _inputEl.select();
  });

  logger.debug('Command palette initialised');
}

// ─────────────────────────────────────────────────────────────
// 4. Dynamic Command Generation
// ─────────────────────────────────────────────────────────────

async function _refreshDynamic() {
  _dynamicCommands = [];

  // Recent documents
  try {
    const docs = await listDocs();
    for (const doc of docs.slice(0, 5)) {
      _dynamicCommands.push({
        id:     `doc:open:${doc.id}`,
        label:  doc.title ?? 'Untitled',
        icon:   '📄',
        group:  'Recent Documents',
        description: doc.updatedAt ?? '',
        action: () => openDoc(doc.id),
      });
    }
  } catch { /* storage may not be ready */ }

  // Registered components
  for (const name of ZoltoComponentRuntime.list()) {
    _dynamicCommands.push({
      id:     `component:insert:${name}`,
      label:  `Insert: <${name}>`,
      icon:   '◇',
      group:  'Components',
      action: () => {
        bus.emit('zolto:insert:component', name);
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Filtering & Ranking
// ─────────────────────────────────────────────────────────────

/**
 * Filter and rank all commands by `query`.
 * Returns scored, sorted results.
 * @param {string} query
 * @returns {Command[]}
 */
function filterCommands(query) {
  const allCommands = [...STATIC_COMMANDS, ..._dynamicCommands];
  if (!query) return allCommands;

  const lower = query.toLowerCase();
  const scored = [];

  for (const cmd of allCommands) {
    const labelLower = cmd.label.toLowerCase();
    const groupLower = (cmd.group ?? '').toLowerCase();

    let score = 0;

    if (labelLower === lower)                    score = 100;
    else if (labelLower.startsWith(lower))       score = 80;
    else if (labelLower.includes(lower))         score = 60;
    else if (groupLower.includes(lower))         score = 30;
    else if (_fuzzyMatch(labelLower, lower))     score = 20;
    else continue;

    scored.push({ cmd, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.cmd);
}

/**
 * Simple fuzzy match — all characters of `pattern` appear in
 * `text` in order (not necessarily consecutive).
 */
function _fuzzyMatch(text, pattern) {
  let ti = 0;
  for (let pi = 0; pi < pattern.length; pi++) {
    while (ti < text.length && text[ti] !== pattern[pi]) ti++;
    if (ti >= text.length) return false;
    ti++;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// 6. Results Rendering
// ─────────────────────────────────────────────────────────────

/**
 * Filter commands and re-render the results list.
 * @param {string} query
 */
export function renderResults(query) {
  if (!_resultsEl) return;

  _filtered = filterCommands(query);
  _selectedIndex = 0;

  if (_filtered.length === 0) {
    _resultsEl.innerHTML = `<div class="zolto-palette-empty">No commands found for "${_escHtml(query)}"</div>`;
    return;
  }

  // Group results
  const groups = new Map();
  for (const cmd of _filtered.slice(0, 50)) { // cap at 50
    const group = cmd.group ?? 'General';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(cmd);
  }

  let html = '';
  let globalIdx = 0;

  for (const [groupName, cmds] of groups) {
    html += `<div class="zolto-palette-group-label">${_escHtml(groupName)}</div>`;
    for (const cmd of cmds) {
      const isActive = globalIdx === 0;
      html += `<li class="zolto-palette-item${isActive ? ' zolto-palette-item-active' : ''}"
                  data-index="${globalIdx}" role="option" aria-selected="${isActive}">
        <span class="zolto-palette-item-icon">${_escHtml(cmd.icon ?? '▸')}</span>
        <span class="zolto-palette-item-body">
          <span class="zolto-palette-item-label">${_highlight(_escHtml(cmd.label), query)}</span>
          ${cmd.description ? `<span class="zolto-palette-item-desc">${_escHtml(cmd.description)}</span>` : ''}
        </span>
        ${cmd.kbd ? `<kbd class="zolto-palette-item-kbd">${_escHtml(cmd.kbd)}</kbd>` : ''}
      </li>`;
      globalIdx++;
    }
  }

  _resultsEl.innerHTML = html;

  // Wire item clicks
  _resultsEl.addEventListener('click', (e) => {
    const item = /** @type {HTMLElement} */ (e.target).closest('.zolto-palette-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index ?? '0', 10);
    _executeCommand(idx);
  }, { once: false });
}

/** Bold-highlight the matched portion of `text`. */
function _highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<strong>$1</strong>');
}

// ─────────────────────────────────────────────────────────────
// 7. Keyboard Navigation
// ─────────────────────────────────────────────────────────────

function onPaletteKeyDown(event) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      _moveSelection(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      _moveSelection(-1);
      break;
    case 'Enter':
      event.preventDefault();
      _executeCommand(_selectedIndex);
      break;
    case 'Escape':
      event.preventDefault();
      _closePalette();
      break;
  }
}

function _moveSelection(delta) {
  if (!_resultsEl) return;
  _selectedIndex = Math.max(0, Math.min(_filtered.length - 1, _selectedIndex + delta));

  for (const item of _resultsEl.querySelectorAll('.zolto-palette-item')) {
    const el     = /** @type {HTMLElement} */ (item);
    const idx    = parseInt(el.dataset.index ?? '0', 10);
    const active = idx === _selectedIndex;
    el.classList.toggle('zolto-palette-item-active', active);
    el.setAttribute('aria-selected', String(active));
    if (active) el.scrollIntoView({ block: 'nearest' });
  }
}

// ─────────────────────────────────────────────────────────────
// 8. Command Execution
// ─────────────────────────────────────────────────────────────

function _executeCommand(index) {
  const cmd = _filtered[index];
  if (!cmd) return;

  logger.debug('Palette command:', cmd.label);

  try {
    cmd.action();
  } catch (e) {
    logger.error('Palette command error:', e);
  }

  _closePalette();
}

function _closePalette() {
  bus.emit('zolto:action', 'palette:close');
}

// ─────────────────────────────────────────────────────────────
// 9. Plugin API — Register Custom Commands
// ─────────────────────────────────────────────────────────────

/**
 * Register a custom command from a plugin.
 * @param {Command} cmd
 */
export function registerCommand(cmd) {
  STATIC_COMMANDS.push(cmd);
  logger.debug('Custom command registered:', cmd.label);
}

/**
 * Unregister a command by id.
 * @param {string} id
 */
export function unregisterCommand(id) {
  const idx = STATIC_COMMANDS.findIndex(c => c.id === id);
  if (idx >= 0) STATIC_COMMANDS.splice(idx, 1);
}

// ─────────────────────────────────────────────────────────────
// 10. Helpers
// ─────────────────────────────────────────────────────────────

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
