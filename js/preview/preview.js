/**
 * js/preview/preview.js
 * Zolto v8.1.0 — Preview Pane Controller
 *
 * Owns the preview pane DOM element and its surrounding chrome.
 * Responsibilities:
 *  - Mount/initialise the preview pane on app boot
 *  - Scroll sync between editor and preview
 *  - Handle clicks inside rendered content (internal links,
 *    diagram nodes, footnote refs, outline navigation)
 *  - Open preview in a new tab
 *  - Toggle preview modes (live / focus / split)
 *
 * Does NOT do rendering itself — that's live-renderer.js.
 * This module is purely the "preview pane as a UI surface" layer.
 */

'use strict';

import { createLogger }          from '../utils/logger.js';
import { bus, EVENTS, delegate } from '../utils/events.js';
import { syncScroll,
         updateScrollProgress }  from './virtual-dom.js';
import { initLiveRenderer,
         renderNow }             from './live-renderer.js';
import { get as stateGet,
         set as stateSet,
         watch }                 from '../state.js';
import { get as getSetting,
         watch as watchSetting } from '../settings.js';
import { debounceAnimationFrame } from '../utils/debounce.js';

const logger = createLogger('Preview');

// ─────────────────────────────────────────────────────────────
// 1. Module State
// ─────────────────────────────────────────────────────────────

let _editorEl   = null;
let _previewEl  = null;
let _previewPane = null;
let _scrollSyncActive = true;
let _syncingFromEditor  = false;
let _syncingFromPreview = false;

// ─────────────────────────────────────────────────────────────
// 2. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Initialise the preview pane.
 * Call once during app bootstrap, after the editor is ready.
 */
export function initPreview() {
  _previewEl   = document.getElementById('zolto-preview');
  _previewPane = document.getElementById('zolto-preview-pane');
  _editorEl    = document.getElementById('zolto-editor');

  if (!_previewEl || !_previewPane) {
    logger.error('Preview DOM elements not found — preview will not function');
    return;
  }

  // Start the live render pipeline
  initLiveRenderer();

  // Wire scroll sync
  _scrollSyncActive = getSetting('scrollSync');
  wireScrollSync();

  // Wire click handling inside rendered content
  wireContentClicks();

  // Wire outline panel → scroll-to-heading
  wireOutlineNavigation();

  // React to scrollSync setting toggling
  watchSetting('scrollSync', (enabled) => {
    _scrollSyncActive = enabled;
    _previewPane.setAttribute('data-scroll-sync', String(enabled));
  });
  _previewPane.setAttribute('data-scroll-sync', String(_scrollSyncActive));

  // Initial render if a document is already open
  const doc = stateGet('document');
  if (doc.source) renderNow(doc.source);

  logger.info('Preview pane initialised');
}

// ─────────────────────────────────────────────────────────────
// 3. Scroll Sync
// ─────────────────────────────────────────────────────────────

function wireScrollSync() {
  if (!_editorEl || !_previewEl) return;

  const onEditorScroll = debounceAnimationFrame(() => {
    if (_syncingFromPreview) { _syncingFromPreview = false; return; }
    if (!_scrollSyncActive) return;

    _syncingFromEditor = true;
    syncScroll(_editorEl, _previewEl);
    requestAnimationFrame(() => { _syncingFromEditor = false; });
  });

  const onPreviewScroll = debounceAnimationFrame(() => {
    updateScrollProgress(_previewEl);

    if (_syncingFromEditor) { _syncingFromEditor = false; return; }
    if (!_scrollSyncActive) return;

    _syncingFromPreview = true;
    syncScroll(_previewEl, _editorEl);
    requestAnimationFrame(() => { _syncingFromPreview = false; });

    bus.emit(EVENTS.PREVIEW_SCROLL, {
      scrollTop: _previewEl.scrollTop,
      scrollHeight: _previewEl.scrollHeight,
    });
  });

  _editorEl.addEventListener('scroll', onEditorScroll, { passive: true });
  _previewEl.addEventListener('scroll', onPreviewScroll, { passive: true });
}

// ─────────────────────────────────────────────────────────────
// 4. Content Click Handling
//    Internal anchor links, footnote refs, diagram node clicks
// ─────────────────────────────────────────────────────────────

function wireContentClicks() {
  if (!_previewEl) return;

  // Internal anchor links (#heading-id)
  delegate(_previewEl, 'click', 'a.zolto-link[href^="#"]', (event, el) => {
    event.preventDefault();
    const targetId = el.getAttribute('href').slice(1);
    scrollToAnchor(targetId);
  });

  // Footnote reference clicks
  delegate(_previewEl, 'click', '.zolto-footnote-ref a', (event, el) => {
    event.preventDefault();
    const href = el.getAttribute('href');
    if (href) scrollToAnchor(href.slice(1));
  });

  // Footnote backlink clicks
  delegate(_previewEl, 'click', '.zolto-footnote-backref', (event, el) => {
    event.preventDefault();
    const href = el.getAttribute('href');
    if (href) scrollToAnchor(href.slice(1));
  });

  // Diagram node clicks (for cross-references, future feature)
  delegate(_previewEl, 'click', '.zolto-node[data-ref]', (event, el) => {
    const ref = el.getAttribute('data-ref');
    if (ref) {
      bus.emit(EVENTS.PREVIEW_CLICK, { type: 'diagram-node-ref', ref });
    }
  });

  // External links — open in new tab, don't navigate the app
  delegate(_previewEl, 'click', 'a.zolto-link[href^="http"]', (event, el) => {
    event.preventDefault();
    window.open(el.getAttribute('href'), '_blank', 'noopener,noreferrer');
  });

  // Card with href
  delegate(_previewEl, 'click', 'a.zolto-card[href]', (event, el) => {
    const href = el.getAttribute('href');
    if (href?.startsWith('#')) {
      event.preventDefault();
      scrollToAnchor(href.slice(1));
    } else if (href?.startsWith('http')) {
      event.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  });

  logger.debug('Preview content click handlers wired');
}

/**
 * Scroll the preview pane to bring an anchor element into view.
 * @param {string} anchorId
 */
export function scrollToAnchor(anchorId) {
  if (!_previewEl) return;
  const target = _previewEl.querySelector(`#${CSS.escape(anchorId)}`);
  if (!target) {
    logger.warn('Anchor not found:', anchorId);
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Briefly highlight the target for visual feedback
  target.classList.add('zolto-anchor-flash');
  setTimeout(() => target.classList.remove('zolto-anchor-flash'), 1200);

}

// ─────────────────────────────────────────────────────────────
// 5. Outline Panel Navigation
// ─────────────────────────────────────────────────────────────

function wireOutlineNavigation() {
  const outlineEl = document.getElementById('zolto-outline');
  if (!outlineEl) return;

  delegate(outlineEl, 'click', '.zolto-outline-item', (event, el) => {
    event.preventDefault();
    const anchor = el.dataset.anchor;
    if (anchor) scrollToAnchor(anchor);

    // Update active state
    for (const item of outlineEl.querySelectorAll('.zolto-outline-item')) {
      item.classList.remove('zolto-outline-active');
    }
    el.classList.add('zolto-outline-active');
  });

  // Highlight current section in outline as user scrolls preview
  if (_previewEl) {
    const onScroll = debounceAnimationFrame(() => updateActiveOutlineItem());
    _previewEl.addEventListener('scroll', onScroll, { passive: true });
  }
}

/**
 * Determine which heading is currently in view and highlight
 * the corresponding outline item.
 */
function updateActiveOutlineItem() {
  if (!_previewEl) return;
  const headings = [..._previewEl.querySelectorAll('.zolto-heading[id]')];
  if (headings.length === 0) return;

  const scrollTop = _previewEl.scrollTop + 80; // offset for sticky chrome
  let current = headings[0];

  for (const h of headings) {
    if (h.offsetTop <= scrollTop) current = h;
    else break;
  }

  const outlineEl = document.getElementById('zolto-outline');
  if (!outlineEl) return;

  for (const item of outlineEl.querySelectorAll('.zolto-outline-item')) {
    item.classList.toggle('zolto-outline-active', item.dataset.anchor === current.id);
  }
}

// ─────────────────────────────────────────────────────────────
// 6. Open Preview in New Tab
// ─────────────────────────────────────────────────────────────

/**
 * Open the current rendered preview in a standalone browser tab.
 * Useful for presenting, printing, or sharing without the editor chrome.
 */
export function openPreviewTab() {
  if (!_previewEl) return;

  const doc      = stateGet('document');
  const theme    = getSetting('theme');
  const title    = doc.title ?? 'Zolto Document';
  const bodyHtml = _previewEl.innerHTML;

  // Collect all stylesheet links from the current page
  const styleLinks = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => `<link rel="stylesheet" href="${link.href}">`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${_escapeHtml(title)}</title>
  ${styleLinks}
  <style>
    body { margin: 0; background: var(--bg-canvas); }
    .zolto-preview { max-width: 800px; margin: 0 auto; padding: 3rem 2rem; }
  </style>
</head>
<body>
  <div class="zolto-preview">${bodyHtml}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function _escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────
// 7. Preview Mode Switching
// ─────────────────────────────────────────────────────────────

/**
 * Apply a preview mode to the document root.
 * @param {'live' | 'focus' | 'split'} mode
 */
export function setPreviewMode(mode) {
  document.documentElement.setAttribute('data-preview-mode', mode);
  stateSet('previewMode', mode);
}

// ─────────────────────────────────────────────────────────────
// 8. Print Support
// ─────────────────────────────────────────────────────────────

/**
 * Prepare the preview for printing (used by export/pdf-export.js).
 * Temporarily removes interactive-only chrome.
 */
export function preparePrintView() {
  document.body.classList.add('zolto-printing');
}

export function endPrintView() {
  document.body.classList.remove('zolto-printing');
}

window.addEventListener('beforeprint', preparePrintView);
window.addEventListener('afterprint',  endPrintView);
