/**
 * js/app.js
 * Zolto v8.1.0 — Application Bootstrap
 *
 * The single entry point loaded by index.html.
 * Responsible for:
 *  1. Initialising all core subsystems in dependency order
 *  2. Wiring up global UI event delegation
 *  3. Hiding the boot screen once the first render completes
 *  4. Setting up error boundaries
 *
 * Import order matters — subsystems depend on each other:
 *   utils → state → settings → storage → router
 *   → editor → preview/renderer → plugins
 */

'use strict';

import { createLogger }              from './utils/logger.js';
import { bus, EVENTS,
         delegateActions, onKey,
         toastError, toastSuccess }  from './utils/events.js';
import { setTheme, setPreviewMode,
         hide, show, toggle }        from './utils/dom.js';
import { get as stateGet,
         set as stateSet,
         patch, watch,
         openDocument }              from './state.js';
import { initSettings,
         get as getSetting,
         set as setSetting,
         AVAILABLE_THEMES }          from './settings.js';
import { initStorage,
         forceSave, list as listDocs,
         remove as removeDoc }       from './storage.js';
import { initRouter, navigate,
         newDoc, openDoc }           from './router.js';

const logger = createLogger('App');

// ─────────────────────────────────────────────────────────────
// 1. Boot Sequence
// ─────────────────────────────────────────────────────────────

/**
 * Main bootstrap function.
 * Called when the DOM is ready.
 */
async function boot() {
  logger.info('Zolto v8.1.0 booting…');
  const t0 = performance.now();

  try {
    // ── Phase 1: Core systems ──────────────────────────────
    initSettings();
    logger.debug('Settings ready');

    const backend = await initStorage();
    logger.debug('Storage ready —', backend);

    // ── Phase 2: Editor & Preview ─────────────────────────
    const { initEditor }   = await import('./editor/editor.js');
    const { initPreview }  = await import('./preview/preview.js');

    initEditor();
    logger.debug('Editor ready');

    initPreview();
    logger.debug('Preview ready');

    // ── Phase 3: Router (processes initial URL) ───────────
    initRouter();
    logger.debug('Router ready');

    // ── Phase 4: Plugins ──────────────────────────────────
    const { PluginManager } = await import('../plugins/plugin-manager.js');
    await PluginManager.loadEnabled(getSetting('enabledPlugins'));
    logger.debug('Plugins ready');

    // ── Phase 5: UI wiring ────────────────────────────────
    wireGlobalEvents();
    wireKeyboardShortcuts();
    wireStateWatchers();
    await populateFileList();

    // ── Phase 6: Hide boot screen ─────────────────────────
    hideBoot();

    const elapsed = (performance.now() - t0).toFixed(1);
    logger.info(`Zolto ready in ${elapsed} ms`);

  } catch (err) {
    logger.error('Boot failed', err);
    showGlobalError(err instanceof Error ? err.message : String(err));
  }
}


// ─────────────────────────────────────────────────────────────
// 2. Boot Screen
// ─────────────────────────────────────────────────────────────

function hideBoot() {
  const boot = document.getElementById('zolto-boot');
  if (!boot) return;
  boot.classList.add('hidden');
  // Remove from DOM after transition (600 ms matches --duration-slow)
  setTimeout(() => boot.remove(), 700);
}

function showGlobalError(message) {
  const overlay = document.getElementById('zolto-error-overlay');
  const msgEl   = document.getElementById('zolto-error-message');
  if (!overlay || !msgEl) { alert(`Zolto failed to load: ${message}`); return; }
  msgEl.textContent = message;
  show(overlay);
  hideBoot();
}


// ─────────────────────────────────────────────────────────────
// 3. Global UI Event Delegation
//    All button/link clicks are handled here via data-action
//    attributes — no inline event handlers in HTML.
// ─────────────────────────────────────────────────────────────

function wireGlobalEvents() {
  delegateActions(document.body, handleAction);

  // Close dropdowns & palette on outside click
  document.addEventListener('click', (e) => {
    const target = /** @type {Element} */ (e.target);

    // Close theme dropdown
    if (!target.closest('#btn-theme') && !target.closest('#theme-dropdown')) {
      closeDropdown('theme-dropdown', 'btn-theme');
    }

    // Close export menu
    if (!target.closest('[data-action="export:toggle-menu"]') && !target.closest('#export-menu')) {
      closeDropdown('export-menu', '[data-action="export:toggle-menu"]');
    }

    // Close palette on backdrop click
    if (target.id === 'zolto-palette-overlay') {
      closePalette();
    }
  });

  // Close palette on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (stateGet('paletteOpen')) closePalette();
    }
  });

  logger.debug('Global event delegation wired');
}

/**
 * Central action dispatcher — handles all data-action clicks.
 * @param {string}  action
 * @param {Event}   event
 * @param {Element} el
 */
async function handleAction(action, event, el) {
  event.preventDefault?.();
  logger.debug('Action:', action);

  switch (action) {

    // ── Sidebar ──────────────────────────────────────────
    case 'sidebar:toggle': {
      const open = !stateGet('sidebarOpen');
      stateSet('sidebarOpen', open);
      setSetting('sidebarOpen', open);
      const btn = document.getElementById('btn-sidebar-toggle');
      if (btn) btn.setAttribute('aria-expanded', String(open));
      break;
    }

    // ── Document lifecycle ────────────────────────────────
    case 'doc:new':
      newDoc();
      break;

    case 'doc:open-example': {
      const { loadExample } = await import('./storage.js');
      if (loadExample) loadExample();
      else newDoc();
      break;
    }

    // ── Preview mode ──────────────────────────────────────
    case 'preview:toggle-scroll-sync': {
      const current = getSetting('scrollSync');
      setSetting('scrollSync', !current);
      el.setAttribute('aria-pressed', String(!current));
      break;
    }

    case 'preview:open-tab': {
      const { openPreviewTab } = await import('./preview/preview.js');
      openPreviewTab?.();
      break;
    }

    // ── Theme ─────────────────────────────────────────────
    case 'theme:toggle-picker': {
      const dropdown = document.getElementById('theme-dropdown');
      const isOpen   = dropdown && !dropdown.hidden;
      if (isOpen) {
        closeDropdown('theme-dropdown', 'btn-theme');
      } else {
        openDropdown('theme-dropdown', 'btn-theme');
      }
      break;
    }

    // ── Export ────────────────────────────────────────────
    case 'export:toggle-menu': {
      const menu   = document.getElementById('export-menu');
      const isOpen = menu && !menu.hidden;
      if (isOpen) {
        closeDropdown('export-menu', '[data-action="export:toggle-menu"]');
      } else {
        openDropdown('export-menu', '[data-action="export:toggle-menu"]');
      }
      break;
    }

    case 'export:html':
      closeDropdown('export-menu');
      await runExport('html');
      break;

    case 'export:pdf':
      closeDropdown('export-menu');
      await runExport('pdf');
      break;

    case 'export:markdown':
      closeDropdown('export-menu');
      await runExport('markdown');
      break;

    case 'export:text':
      closeDropdown('export-menu');
      await runExport('text');
      break;

    case 'export:json':
      closeDropdown('export-menu');
      await runExport('json');
      break;

    // ── Settings ──────────────────────────────────────────
    case 'settings:open':
      navigate('/settings');
      break;

    // ── App ───────────────────────────────────────────────
    case 'app:reload':
      window.location.reload();
      break;

    // ── Search ────────────────────────────────────────────
    case 'search:open': {
      stateSet('sidebarPanel', 'search');
      setSetting('sidebarPanel', 'search');
      const input = document.getElementById('sidebar-search-input');
      setTimeout(() => input?.focus(), 50);
      break;
    }

    // ── Command palette ───────────────────────────────────
    case 'palette:open':
      openPalette();
      break;

    // ── Format actions (delegated to editor) ──────────────
    case 'format:bold':
    case 'format:italic':
    case 'format:code':
    case 'format:link':
    case 'format:h1':
    case 'format:h2':
    case 'format:h3':
      bus.emit('zolto:format', action.split(':')[1]);
      break;

    // ── Insert actions ────────────────────────────────────
    case 'insert:math':
    case 'insert:diagram':
    case 'insert:chart':
    case 'insert:callout':
    case 'insert:table':
      bus.emit('zolto:insert', action.split(':')[1]);
      break;

    default:
      // Handle theme selection from dropdown
      if (el.dataset.themeId) {
        applyTheme(el.dataset.themeId);
        break;
      }
      logger.debug('Unhandled action:', action);
  }
}


// ─────────────────────────────────────────────────────────────
// 4. Keyboard Shortcuts (global)
// ─────────────────────────────────────────────────────────────

function wireKeyboardShortcuts() {
  // Command palette
  onKey(document, 'Ctrl+K', (e) => { e.preventDefault(); openPalette(); });
  onKey(document, 'Cmd+K',  (e) => { e.preventDefault(); openPalette(); });

  // Save
  onKey(document, 'Ctrl+S', (e) => { e.preventDefault(); forceSave(); });
  onKey(document, 'Cmd+S',  (e) => { e.preventDefault(); forceSave(); });

  // New document
  onKey(document, 'Ctrl+N', (e) => { e.preventDefault(); newDoc(); });
  onKey(document, 'Cmd+N',  (e) => { e.preventDefault(); newDoc(); });

  // Preview modes
  onKey(document, 'Ctrl+1', (e) => { e.preventDefault(); applyPreviewMode('live');   });
  onKey(document, 'Ctrl+2', (e) => { e.preventDefault(); applyPreviewMode('focus');  });
  onKey(document, 'Ctrl+3', (e) => { e.preventDefault(); applyPreviewMode('split');  });

  // Toggle sidebar
  onKey(document, 'Ctrl+\\', (e) => {
    e.preventDefault();
    handleAction('sidebar:toggle', e, document.body);
  });

  logger.debug('Global keyboard shortcuts registered');
}


// ─────────────────────────────────────────────────────────────
// 5. State Watchers
// ─────────────────────────────────────────────────────────────

function wireStateWatchers() {
  // Preview mode switcher buttons
  watch('previewMode', (mode) => {
    document.querySelectorAll('.zolto-mode-btn').forEach(btn => {
      const active = btn.getAttribute('data-mode') === mode;
      btn.classList.toggle('zolto-mode-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }, { immediate: true });

  // Dirty indicator
  watch('document', (doc) => {
    const indicator = document.getElementById('zolto-dirty');
    if (indicator) toggle(indicator, doc.dirty);

    // Update document title in topbar
    const titleEl = document.getElementById('zolto-doc-title-text');
    if (titleEl && doc.title) titleEl.textContent = doc.title;
  });

  // Save status badge
  watch('saveStatus', (status) => {
    document.querySelectorAll('.zolto-save-badge').forEach(badge => {
      const el = /** @type {HTMLElement} */ (badge);
      el.hidden = el.getAttribute('data-status') !== status;
    });
  }, { immediate: true });

  // Word count
  watch('document', (doc) => {
    const el    = document.getElementById('word-count-value');
    const words = doc.source.trim().split(/\s+/).filter(Boolean).length;
    if (el) el.textContent = String(words);
  });

  // Theme dropdown sync
  watch('settings', (settings) => {
    document.querySelectorAll('[data-theme-id]').forEach(item => {
      const active = item.getAttribute('data-theme-id') === settings.theme;
      item.classList.toggle('zolto-dropdown-active', active);
      item.setAttribute('aria-selected', String(active));
    });
  }, { immediate: true });

  // Cursor position in statusbar
  watch('cursor', (cursor) => {
    const lineEl = document.getElementById('cursor-line');
    const colEl  = document.getElementById('cursor-col');
    if (lineEl) lineEl.textContent = String(cursor.line);
    if (colEl)  colEl.textContent  = String(cursor.col);
  }, { immediate: true });

  // Rendering indicator
  watch('renderError', (err) => {
    if (err) toastError(`Render error: ${err}`, { duration: 5000 });
  });

  logger.debug('State watchers wired');
}


// ─────────────────────────────────────────────────────────────
// 6. Theme & Preview Mode Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Apply a theme by id.
 * @param {string} themeId
 */
function applyTheme(themeId) {
  const valid = AVAILABLE_THEMES.some(t => t.id === themeId);
  if (!valid) return;
  setSetting('theme', themeId);
  closeDropdown('theme-dropdown', 'btn-theme');
}

/**
 * Apply a preview mode.
 * @param {'live' | 'focus' | 'split'} mode
 */
function applyPreviewMode(mode) {
  setSetting('previewMode', mode);
  stateSet('previewMode', mode);
}


// ─────────────────────────────────────────────────────────────
// 7. Dropdown Helpers
// ─────────────────────────────────────────────────────────────

/**
 * @param {string} menuId
 * @param {string} [btnSelector]
 */
function openDropdown(menuId, btnSelector) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.hidden = false;
  if (btnSelector) {
    const btn = typeof btnSelector === 'string' && btnSelector.startsWith('#')
      ? document.getElementById(btnSelector.slice(1))
      : document.querySelector(btnSelector);
    btn?.setAttribute('aria-expanded', 'true');
  }
}

/**
 * @param {string} menuId
 * @param {string} [btnSelector]
 */
function closeDropdown(menuId, btnSelector) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.hidden = true;
  if (btnSelector) {
    const btn = typeof btnSelector === 'string' && btnSelector.startsWith('#')
      ? document.getElementById(btnSelector.slice(1))
      : document.querySelector(btnSelector);
    btn?.setAttribute('aria-expanded', 'false');
  }
}


// ─────────────────────────────────────────────────────────────
// 8. Command Palette
// ─────────────────────────────────────────────────────────────

function openPalette() {
  stateSet('paletteOpen', true);
  const overlay = document.getElementById('zolto-palette-overlay');
  if (!overlay) return;
  show(overlay);
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('zolto-palette-input')?.focus(), 50);

  // Lazily initialise the command palette module
  import('./editor/command-palette.js').then(({ initPalette }) => {
    initPalette?.();
  });
}

function closePalette() {
  stateSet('paletteOpen', false);
  const overlay = document.getElementById('zolto-palette-overlay');
  if (!overlay) return;
  hide(overlay);
  overlay.setAttribute('aria-hidden', 'true');
}


// ─────────────────────────────────────────────────────────────
// 9. File List (Home & Sidebar)
// ─────────────────────────────────────────────────────────────

async function populateFileList() {
  const docs = await listDocs();

  // Sidebar file list
  const sidebarList = document.getElementById('zolto-file-list');
  if (sidebarList) {
    sidebarList.innerHTML = docs.length === 0
      ? `<div class="zolto-file-list-empty">
           <span class="zolto-file-list-empty-icon">📄</span>
           <span class="zolto-file-list-empty-text">No documents yet</span>
         </div>`
      : docs.map(doc => `
          <div class="zolto-file-item" role="listitem"
               data-action="doc:open" data-doc-id="${doc.id}"
               tabindex="0" aria-label="${doc.title}">
            <span class="zolto-file-icon">📄</span>
            <span class="zolto-file-name">${doc.title}</span>
            <span class="zolto-file-meta">${_relativeDate(doc.savedAt)}</span>
            <div class="zolto-file-actions">
              <button class="zolto-file-action-btn"
                      data-action="doc:delete" data-doc-id="${doc.id}"
                      aria-label="Delete ${doc.title}">✕</button>
            </div>
          </div>`).join('');
  }

  // Home recent list
  const recentList = document.getElementById('zolto-recent-list');
  if (recentList) {
    recentList.innerHTML = docs.slice(0, 8).map(doc => `
      <div class="zolto-recent-doc" data-action="doc:open" data-doc-id="${doc.id}"
           role="listitem" tabindex="0">
        <div class="zolto-recent-doc-icon">📄</div>
        <div class="zolto-recent-doc-body">
          <div class="zolto-recent-doc-name">${doc.title}</div>
          <div class="zolto-recent-doc-date">${_relativeDate(doc.savedAt)}</div>
        </div>
      </div>`).join('');
  }

  // Wire open/delete actions for file list items
  delegateActions(document.body, async (action, event, el) => {
    if (action === 'doc:open') {
      const id = el.dataset.docId;
      if (id) openDoc(id);
    }
    if (action === 'doc:delete') {
      const id = el.dataset.docId;
      if (id && confirm('Delete this document? This cannot be undone.')) {
        await removeDoc(id);
        await populateFileList();
        toastSuccess('Document deleted');
      }
    }
  });
}

/**
 * Format a timestamp as a short relative date.
 * @param {number} ts
 * @returns {string}
 */
function _relativeDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)      return 'just now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}


// ─────────────────────────────────────────────────────────────
// 10. Export Runner
// ─────────────────────────────────────────────────────────────

/**
 * @param {'html' | 'pdf' | 'markdown' | 'text' | 'json'} format
 */
async function runExport(format) {
  const doc = stateGet('document');
  if (!doc.ast) {
    toastError('Nothing to export — open a document first.');
    return;
  }

  try {
    const title    = doc.meta?.title ?? 'document';
    const ext      = { html: '.html', pdf: '.pdf', markdown: '.md', text: '.txt', json: '.json' }[format];
    const filename = `${title}${ext}`;

    let content;
    switch (format) {
      case 'html': {
        const { HTMLExporter } = await import('./export/html-export.js');
        content = await HTMLExporter.export(doc.ast, { theme: getSetting('theme') });
        break;
      }
      case 'pdf': {
        const { PDFExporter } = await import('./export/pdf-export.js');
        await PDFExporter.export(doc.ast);
        return; // PDF triggers print dialog directly
      }
      case 'markdown': {
        const { MarkdownExporter } = await import('./export/markdown-export.js');
        content = MarkdownExporter.export(doc.ast);
        break;
      }
      case 'text': {
        const { TextExporter } = await import('./export/text-export.js');
        content = TextExporter.export(doc.ast);
        break;
      }
      case 'json': {
        const { JSONExporter } = await import('./export/json-export.js');
        content = JSONExporter.export(doc.ast);
        break;
      }
    }

    const { downloadFile } = await import('./utils/dom.js');
    downloadFile(filename, content);
    toastSuccess(`Exported as ${filename}`);
    bus.emit(EVENTS.EXPORT_DONE, { format, filename });

  } catch (err) {
    logger.error('Export failed', format, err);
    toastError(`Export failed: ${err.message}`);
    bus.emit(EVENTS.EXPORT_ERROR, { format, error: err });
  }
}


// ─────────────────────────────────────────────────────────────
// 11. Error Boundary
// ─────────────────────────────────────────────────────────────

window.addEventListener('error', (event) => {
  logger.error('Uncaught error', event.error);
  // Don't show error overlay for non-critical errors
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason);
});


// ─────────────────────────────────────────────────────────────
// 12. Entry Point
// ─────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  // Already loaded (e.g. deferred script)
  boot();
}
