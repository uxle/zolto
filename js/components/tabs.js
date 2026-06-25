/**
 * js/components/tabs.js
 * Zolto v8.1.0 — Tabs Component
 *
 * Full ARIA-compliant tab implementation for <tabs> elements.
 *
 * Features:
 *  - Tab activation on click
 *  - Arrow-key navigation (Left / Right / Home / End)
 *  - ARIA roles: tablist / tab / tabpanel
 *  - Variant classes (underline, pill, plain) handled by CSS
 *  - Session-persistent active tab per tabs instance
 *  - Tab keyboard roving tabindex
 */

'use strict';

import { createLogger }                    from '../utils/logger.js';
import { bus, EVENTS, delegate }           from '../utils/events.js';
import { $$, closest, addClass, removeClass,
         setAria, setAttrs }               from '../utils/dom.js';

const logger = createLogger('Tabs');

// ─────────────────────────────────────────────────────────────
// 1. Selectors & Classes
// ─────────────────────────────────────────────────────────────

const SEL_TABS      = '.zolto-tabs';
const SEL_TABLIST   = '.zolto-tab-list';
const SEL_TAB       = '.zolto-tab';
const SEL_PANEL     = '.zolto-tab-panel';

const CLS_ACTIVE_TAB   = 'zolto-tab--active';
const CLS_ACTIVE_PANEL = 'zolto-tab-panel--active';

const _cleanupMap = new WeakMap();

// ─────────────────────────────────────────────────────────────
// 2. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Initialise tab interactivity within `root`.
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);

  const cleanups = [];

  cleanups.push(delegate(root, 'click',   SEL_TAB, _onTabClick));
  cleanups.push(delegate(root, 'keydown', SEL_TABLIST, _onTablistKeydown));

  // Initialise ARIA and active states after every render
  _setupAll(root);
  const _unRender = bus.on(EVENTS.RENDER_DONE, () => _setupAll(root));
  cleanups.push(_unRender);

  _cleanupMap.set(root, cleanups);
  logger.debug('Tabs component initialised');
}

/**
 * @param {HTMLElement} root
 */
export function destroy(root) {
  const cleanups = _cleanupMap.get(root);
  if (!cleanups) return;
  cleanups.forEach(fn => fn?.());
  _cleanupMap.delete(root);
}

// ─────────────────────────────────────────────────────────────
// 3. Setup — ARIA attributes & initial active tab
// ─────────────────────────────────────────────────────────────

function _setupAll(root) {
  $$(SEL_TABS, root).forEach(tabsEl => _setupTabsInstance(tabsEl));
}

/**
 * Wire up one <tabs> instance with correct ARIA and active state.
 * @param {HTMLElement} tabsEl
 */
function _setupTabsInstance(tabsEl) {
  const tablist = tabsEl.querySelector(SEL_TABLIST);
  const tabs    = $$(SEL_TAB,   tabsEl);
  const panels  = $$(SEL_PANEL, tabsEl);

  if (!tablist || !tabs.length) return;

  // Assign ARIA roles
  setAttrs(tablist, { role: 'tablist' });

  tabs.forEach((tab, i) => {
    const panelId = tab.dataset.panel ?? `zolto-panel-${_uid(tabsEl)}-${i}`;
    const tabId   = tab.id || `zolto-tab-${_uid(tabsEl)}-${i}`;

    tab.id = tabId;
    setAttrs(tab, { role: 'tab', tabindex: '-1' });
    setAria(tab,  { controls: panelId, selected: false });
  });

  panels.forEach((panel, i) => {
    const tab   = tabs[i];
    const tabId = tab?.id ?? '';
    panel.id    = panel.id || tab?.dataset.panel || `zolto-panel-${_uid(tabsEl)}-${i}`;
    setAttrs(panel, { role: 'tabpanel', tabindex: '0' });
    setAria(panel,  { labelledby: tabId });
  });

  // Restore or default active tab
  const savedIndex = _getSavedIndex(tabsEl);
  const activeIdx  = (savedIndex >= 0 && savedIndex < tabs.length) ? savedIndex : 0;
  _activate(tabsEl, tabs, panels, activeIdx, false);
}

// ─────────────────────────────────────────────────────────────
// 4. Event Handlers
// ─────────────────────────────────────────────────────────────

function _onTabClick(event, tab) {
  const tabsEl = closest(tab, SEL_TABS);
  if (!tabsEl) return;

  const tabs   = $$(SEL_TAB,   tabsEl);
  const panels = $$(SEL_PANEL, tabsEl);
  const idx    = tabs.indexOf(tab);
  if (idx < 0) return;

  _activate(tabsEl, tabs, panels, idx, true);
}

function _onTablistKeydown(event, tablist) {
  const tabsEl = closest(tablist, SEL_TABS);
  if (!tabsEl) return;

  const tabs = $$(SEL_TAB, tabsEl);
  const currentIdx = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');

  let nextIdx = currentIdx;

  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault();
      nextIdx = currentIdx > 0 ? currentIdx - 1 : tabs.length - 1;
      break;

    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault();
      nextIdx = currentIdx < tabs.length - 1 ? currentIdx + 1 : 0;
      break;

    case 'Home':
      event.preventDefault();
      nextIdx = 0;
      break;

    case 'End':
      event.preventDefault();
      nextIdx = tabs.length - 1;
      break;

    default:
      return;
  }

  if (nextIdx !== currentIdx) {
    const panels = $$(SEL_PANEL, tabsEl);
    _activate(tabsEl, tabs, panels, nextIdx, true);
    tabs[nextIdx]?.focus();
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Activation
// ─────────────────────────────────────────────────────────────

/**
 * Activate a tab by index, updating ARIA and classes.
 * @param {HTMLElement}   tabsEl
 * @param {HTMLElement[]} tabs
 * @param {HTMLElement[]} panels
 * @param {number}        idx
 * @param {boolean}       save
 */
function _activate(tabsEl, tabs, panels, idx, save) {
  tabs.forEach((tab, i) => {
    const active = i === idx;
    toggleTabClass(tab, CLS_ACTIVE_TAB, active);
    setAria(tab, { selected: active });
    tab.setAttribute('tabindex', active ? '0' : '-1');
  });

  panels.forEach((panel, i) => {
    const active = i === idx;
    toggleTabClass(panel, CLS_ACTIVE_PANEL, active);
    panel.hidden = !active;
  });

  if (save) _saveIndex(tabsEl, idx);

  logger.debug(`Tabs: activated index ${idx}`);
}

function toggleTabClass(el, cls, force) {
  if (force) addClass(el, cls);
  else removeClass(el, cls);
}

// ─────────────────────────────────────────────────────────────
// 6. Session Persistence
// ─────────────────────────────────────────────────────────────

/** Stable per-instance UID based on DOM order. */
const _uidMap = new WeakMap();
let   _uidSeq = 0;

function _uid(el) {
  if (!_uidMap.has(el)) _uidMap.set(el, ++_uidSeq);
  return _uidMap.get(el);
}

function _storageKey(tabsEl) {
  return `zolto-tab-${tabsEl.id || _uid(tabsEl)}`;
}

function _saveIndex(tabsEl, idx) {
  try { sessionStorage.setItem(_storageKey(tabsEl), String(idx)); } catch { /* ignore */ }
}

function _getSavedIndex(tabsEl) {
  try {
    const v = sessionStorage.getItem(_storageKey(tabsEl));
    return v !== null ? parseInt(v, 10) : -1;
  } catch {
    return -1;
  }
}
