/**
 * js/preview/live-renderer.js
 * Zolto v8.1.0 — Live Render Pipeline
 *
 * Glue layer that connects the editor to the preview pane:
 *  - Subscribes to 'zolto:change' (source text changed)
 *  - Debounces at 16ms (one animation frame) via debounce16
 *  - Runs the full parser pipeline: tokenize → lex → parse →
 *    validate → transform
 *  - Renders the resulting Document AST via ZoltoRenderer
 *  - Patches the live DOM via virtual-dom.js
 *  - Handles render errors gracefully (shows overlay, logs)
 *  - Tracks render performance and logs slow renders
 */

'use strict';

import { ZoltoParser }      from '../parser/parser.js';
import { validate }         from '../parser/validator.js';
import { ZoltoTransformer } from '../parser/transformer.js';
import { ZoltoRenderer }    from '../renderer/renderer.js';
import { patch,
         activateInteractivity,
         observeLazy,
         processStreaming }  from './virtual-dom.js';
import { debounce16 }       from '../utils/debounce.js';
import { createLogger }     from '../utils/logger.js';
import { bus, EVENTS }      from '../utils/events.js';
import { get as stateGet,
         set as stateSet,
         setAST, watch }    from '../state.js';
import { get as getSetting,
         watch as watchSetting } from '../settings.js';

const logger = createLogger('Preview');

// ─────────────────────────────────────────────────────────────
// 1. Pipeline Instances (reused across renders)
// ─────────────────────────────────────────────────────────────

const parser      = new ZoltoParser();
const transformer  = new ZoltoTransformer();
let   renderer     = null; // (re)created when settings change

/** @type {IntersectionObserver | null} */
let _lazyObserver = null;

/** Slow render threshold in ms — logs a warning above this. */
const SLOW_RENDER_THRESHOLD = 50;

// ─────────────────────────────────────────────────────────────
// 2. Renderer Factory (rebuilt when theme/math backend changes)
// ─────────────────────────────────────────────────────────────

function buildRenderer() {
  return new ZoltoRenderer({
    theme:          getSetting('theme'),
    mathBackend:    getSetting('mathBackend'),
    codeHighlight:  getSetting('codeHighlight'),
    footnoteMode:   getSetting('footnoteMode'),
    sanitize:       true,
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Core Pipeline Function
// ─────────────────────────────────────────────────────────────

/**
 * Run the full parser → transformer → renderer pipeline on `source`.
 * @param {string} source
 * @returns {{ html: string, doc: object, diagnostics: object[], elapsed: number }}
 */
function runPipeline(source) {
  const t0 = performance.now();

  // Parse
  const rawDoc = parser.parse(source);

  // Validate
  const { doc: validatedDoc, diagnostics } = validate(rawDoc);

  // Transform (8 passes)
  const finalDoc = transformer.transform(validatedDoc);

  // Render
  if (!renderer) renderer = buildRenderer();
  const html = renderer.render(finalDoc);

  const elapsed = performance.now() - t0;

  return { html, doc: finalDoc, diagnostics, elapsed };
}

// ─────────────────────────────────────────────────────────────
// 4. Debounced Render Trigger
// ─────────────────────────────────────────────────────────────

const _debouncedRender = debounce16((source) => {
  renderNow(source);
});

/**
 * Trigger a debounced render (16ms — one animation frame).
 * Called on every editor keystroke via 'zolto:change'.
 * @param {string} source
 */
export function scheduleRender(source) {
  _debouncedRender(source);
}

/**
 * Run the render pipeline immediately, bypassing the debounce.
 * Used for initial render and forced refreshes (e.g. theme change).
 * @param {string} source
 */
export function renderNow(source) {
  stateSet('rendering', true);

  let result;
  try {
    result = runPipeline(source);
  } catch (err) {
    logger.error('Pipeline error', err);
    stateSet('renderError', err.message ?? String(err));
    stateSet('rendering', false);
    bus.emit(EVENTS.RENDER_ERROR, err);
    return;
  }

  const { html, doc, diagnostics, elapsed } = result;

  if (elapsed > SLOW_RENDER_THRESHOLD) {
    logger.warn(`Slow render: ${elapsed.toFixed(1)}ms for ${source.length} chars`);
  } else {
    logger.debug(`Render: ${elapsed.toFixed(1)}ms`);
  }

  // Patch the live preview DOM
  const container = document.getElementById('zolto-preview');
  if (container) {
    patch(container, html);
    activateInteractivity(container);

    // Re-observe lazy placeholders after patch
    if (_lazyObserver) _lazyObserver.disconnect();
    _lazyObserver = observeLazy(container, renderLazyPlaceholder);

    // Process any streaming shells
    processStreaming(container, renderStreamingShell);
  }

  // Update outline panel from headings
  updateOutline(doc);

  // Update state
  setAST(doc);
  stateSet('renderError', diagnostics.some(d => d.severity === 'error')
    ? diagnostics.find(d => d.severity === 'error').message
    : null);

  bus.emit(EVENTS.RENDER_DONE, { doc, elapsed, diagnostics });
}

// ─────────────────────────────────────────────────────────────
// 5. Lazy & Streaming Render Callbacks
// ─────────────────────────────────────────────────────────────

/**
 * Render a single lazy-loaded component when it scrolls into view.
 * @param {HTMLElement} placeholderEl
 * @returns {string}
 */
function renderLazyPlaceholder(placeholderEl) {
  const nodeId = placeholderEl.dataset.nodeId;
  const doc    = stateGet('document').ast;
  if (!doc || !renderer) return '';

  const node = _findNodeById(doc.nodes, nodeId);
  if (!node) return '';

  const ctx = {
    theme: getSetting('theme'),
    tokens: doc.frontmatter?.tokens ?? {},
    componentRegistry: null,
    mathIndex: doc.mathIndex ?? {},
    footnotes: doc.footnotes ?? {},
    variables: doc.variables ?? {},
    equationCounter: { value: 0 },
    animationDefs: new Map(),
    depth: 0,
  };

  return renderer.renderNode(node, ctx);
}

/**
 * Render a streaming shell's heavy content asynchronously.
 * @param {HTMLElement} shellEl
 * @returns {Promise<string>}
 */
async function renderStreamingShell(shellEl) {
  const nodeId = shellEl.dataset.nodeId;
  const doc    = stateGet('document').ast;
  if (!doc || !renderer) return '';

  // Yield once to let the UI breathe before heavy diagram/chart work
  await new Promise(r => setTimeout(r, 0));

  const node = _findNodeById(doc.nodes, nodeId);
  if (!node) return '';

  const ctx = {
    theme: getSetting('theme'),
    tokens: {},
    componentRegistry: null,
    mathIndex: doc.mathIndex ?? {},
    footnotes: doc.footnotes ?? {},
    variables: doc.variables ?? {},
    equationCounter: { value: 0 },
    animationDefs: new Map(),
    depth: 0,
  };

  return renderer.renderNode(node, ctx);
}

/** Recursively find a node by id. */
function _findNodeById(nodes, id) {
  for (const node of nodes ?? []) {
    if (!node) continue;
    if (node.id === id) return node;
    const childMatch =
      _findNodeById(node.children ?? [], id) ??
      _findNodeById(node.slides   ?? [], id) ??
      _findNodeById(node.tabs     ?? [], id);
    if (childMatch) return childMatch;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// 6. Outline Panel Sync
// ─────────────────────────────────────────────────────────────

/**
 * Rebuild the sidebar outline panel from the document's headings.
 * @param {object} doc
 */
function updateOutline(doc) {
  const outlineEl = document.getElementById('zolto-outline');
  if (!outlineEl) return;

  const headings = _collectHeadings(doc.nodes);

  if (headings.length === 0) {
    outlineEl.innerHTML = `<div class="zolto-outline-empty">No headings yet — add a # Heading to see it here.</div>`;
    return;
  }

  outlineEl.innerHTML = headings.map(h => `
    <a class="zolto-outline-item zolto-outline-h${h.level}"
       href="#${h.anchor}" data-anchor="${h.anchor}">
      <span class="zolto-outline-label">${_escapeHtml(h.text)}</span>
    </a>`).join('');
}

function _collectHeadings(nodes, acc = []) {
  for (const node of nodes ?? []) {
    if (!node) continue;
    if (node.type === 'Heading') {
      acc.push({ level: node.level, text: node.text, anchor: node.anchor });
    }
    if (Array.isArray(node.children)) _collectHeadings(node.children, acc);
    if (Array.isArray(node.slides))   _collectHeadings(node.slides,   acc);
  }
  return acc;
}

function _escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────
// 7. Word Count
// ─────────────────────────────────────────────────────────────

/**
 * @param {string} source
 * @returns {number}
 */
export function wordCount(source) {
  const trimmed = source.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

// ─────────────────────────────────────────────────────────────
// 8. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Initialise the live render pipeline.
 * Subscribes to editor changes and settings changes that require
 * a renderer rebuild (theme, math backend) or full re-render.
 */
export function initLiveRenderer() {
  // Source changes trigger debounced render
  bus.on(EVENTS.EDITOR_CHANGE, (source) => {
    scheduleRender(source);
  });

  // Theme or math backend change → rebuild renderer, force re-render
  watchSetting('theme', () => {
    renderer = buildRenderer();
    const source = stateGet('document').source;
    if (source) renderNow(source);
  });

  watchSetting('mathBackend', () => {
    renderer = buildRenderer();
    const source = stateGet('document').source;
    if (source) renderNow(source);
  });

  watchSetting('codeHighlight', () => {
    renderer = buildRenderer();
    const source = stateGet('document').source;
    if (source) renderNow(source);
  });

  // Document opened → render immediately (no debounce)
  watch('document', (doc, prevDoc) => {
    // Only force-render on document id change (new doc opened),
    // not on every keystroke (those go through EDITOR_CHANGE)
    if (doc.id !== prevDoc?.id) {
      renderNow(doc.source);
    }
  });

  logger.info('Live renderer initialised');
}

/**
 * Force a full re-render of the current document.
 * Useful after plugin install/uninstall or manual refresh.
 */
export function forceRerender() {
  const source = stateGet('document').source;
  if (source !== undefined) renderNow(source);
}
