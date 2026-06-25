/**
 * js/components/accordion.js
 * Zolto v8.1.0 — Accordion Component
 *
 * Handles expand / collapse for <accordion> and standalone
 * <details> elements rendered into the preview pane.
 *
 * Features:
 *  - Smooth height animation via CSS transitions + JS measurement
 *  - Exclusive mode: data-exclusive="true" → only one open at a time
 *  - Full ARIA (expanded, controls, region)
 *  - Keyboard: Space / Enter on trigger, Arrow keys to move between triggers
 *  - Variants handled purely by CSS (default, flush, separated)
 */

'use strict';

import { createLogger }                    from '../utils/logger.js';
import { bus, EVENTS, delegate }           from '../utils/events.js';
import { $$, closest, addClass, removeClass,
         toggleClass, setAria, setAttrs }  from '../utils/dom.js';

const logger = createLogger('Accordion');

// ─────────────────────────────────────────────────────────────
// 1. Selectors & Classes
// ─────────────────────────────────────────────────────────────

const SEL_ACCORDION      = '.zolto-accordion';
const SEL_ITEM           = '.zolto-accordion-item';
const SEL_TRIGGER        = '.zolto-accordion-trigger';
const SEL_CONTENT        = '.zolto-accordion-content';

const CLS_ITEM_OPEN      = 'zolto-accordion-item--open';
const CLS_ANIMATING      = 'zolto-accordion-item--animating';

const DURATION_MS        = 260;   // must match --zolto-transition-base in variables.css

const _cleanupMap        = new WeakMap();

// ─────────────────────────────────────────────────────────────
// 2. Public API
// ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);

  const cleanups = [];

  cleanups.push(delegate(root, 'click',   SEL_TRIGGER, _onTriggerClick));
  cleanups.push(delegate(root, 'keydown', SEL_TRIGGER, _onTriggerKeydown));

  _setupAll(root);
  const _unRender = bus.on(EVENTS.RENDER_DONE, () => _setupAll(root));
  cleanups.push(_unRender);

  _cleanupMap.set(root, cleanups);
  logger.debug('Accordion component initialised');
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
// 3. Setup
// ─────────────────────────────────────────────────────────────

function _setupAll(root) {
  $$(SEL_ACCORDION, root).forEach(_setupInstance);
}

/**
 * Initialise ARIA attributes for one accordion.
 * @param {HTMLElement} accordion
 */
function _setupInstance(accordion) {
  $$(SEL_ITEM, accordion).forEach((item, i) => {
    const trigger = item.querySelector(SEL_TRIGGER);
    const content = item.querySelector(SEL_CONTENT);
    if (!trigger || !content) return;

    const id       = item.id || `zolto-acc-item-${_uid(item)}`;
    const panelId  = `${id}-panel`;
    const headerId = `${id}-header`;

    item.id       = id;
    trigger.id    = headerId;
    content.id    = panelId;

    setAttrs(trigger, { role: 'button', tabindex: '0' });
    setAria(trigger,  { expanded: item.classList.contains(CLS_ITEM_OPEN), controls: panelId });
    setAttrs(content, { role: 'region' });
    setAria(content,  { labelledby: headerId });

    // Ensure closed items have height:0 so transition works
    if (!item.classList.contains(CLS_ITEM_OPEN)) {
      content.style.height   = '0';
      content.style.overflow = 'hidden';
      content.hidden         = false; // keep in DOM for ARIA
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Event Handlers
// ─────────────────────────────────────────────────────────────

function _onTriggerClick(event, trigger) {
  const item      = closest(trigger, SEL_ITEM);
  const accordion = closest(trigger, SEL_ACCORDION);
  if (!item || !accordion) return;

  const isOpen = item.classList.contains(CLS_ITEM_OPEN);

  // Exclusive mode
  if (!isOpen && _isExclusive(accordion)) {
    $$(SEL_ITEM, accordion)
      .filter(i => i !== item && i.classList.contains(CLS_ITEM_OPEN))
      .forEach(openItem => _close(openItem));
  }

  isOpen ? _close(item) : _open(item);
}

function _onTriggerKeydown(event, trigger) {
  switch (event.key) {
    case ' ':
    case 'Enter':
      event.preventDefault();
      _onTriggerClick(event, trigger);
      break;

    case 'ArrowDown': {
      event.preventDefault();
      const next = _adjacentTrigger(trigger, 1);
      next?.focus();
      break;
    }
    case 'ArrowUp': {
      event.preventDefault();
      const prev = _adjacentTrigger(trigger, -1);
      prev?.focus();
      break;
    }
    case 'Home': {
      event.preventDefault();
      const accordion = closest(trigger, SEL_ACCORDION);
      accordion?.querySelector(SEL_TRIGGER)?.focus();
      break;
    }
    case 'End': {
      event.preventDefault();
      const accordion = closest(trigger, SEL_ACCORDION);
      const all = $$(SEL_TRIGGER, accordion);
      all[all.length - 1]?.focus();
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Open / Close with Animation
// ─────────────────────────────────────────────────────────────

/**
 * Open an accordion item with height animation.
 * @param {HTMLElement} item
 */
function _open(item) {
  if (item.classList.contains(CLS_ITEM_OPEN)) return;

  const content = item.querySelector(SEL_CONTENT);
  const trigger = item.querySelector(SEL_TRIGGER);
  if (!content || !trigger) return;

  addClass(item, CLS_ITEM_OPEN, CLS_ANIMATING);
  setAria(trigger, { expanded: true });

  // Measure and animate
  content.style.height   = '0';
  content.style.overflow = 'hidden';

  const targetH = _naturalHeight(content);

  requestAnimationFrame(() => {
    content.style.transition = `height ${DURATION_MS}ms var(--zolto-ease-out, ease-out)`;
    content.style.height     = `${targetH}px`;

    const onDone = () => {
      content.style.height   = 'auto';
      content.style.overflow = '';
      content.style.transition = '';
      removeClass(item, CLS_ANIMATING);
    };

    content.addEventListener('transitionend', onDone, { once: true });
    setTimeout(onDone, DURATION_MS + 50); // safety fallback
  });
}

/**
 * Close an accordion item with height animation.
 * @param {HTMLElement} item
 */
function _close(item) {
  if (!item.classList.contains(CLS_ITEM_OPEN)) return;

  const content = item.querySelector(SEL_CONTENT);
  const trigger = item.querySelector(SEL_TRIGGER);
  if (!content || !trigger) return;

  // Pin current height before collapsing
  content.style.height   = `${content.scrollHeight}px`;
  content.style.overflow = 'hidden';

  addClass(item, CLS_ANIMATING);

  requestAnimationFrame(() => {
    content.style.transition = `height ${DURATION_MS}ms var(--zolto-ease-out, ease-out)`;
    content.style.height     = '0';

    const onDone = () => {
      removeClass(item, CLS_ITEM_OPEN, CLS_ANIMATING);
      content.style.transition = '';
      setAria(trigger, { expanded: false });
    };

    content.addEventListener('transitionend', onDone, { once: true });
    setTimeout(onDone, DURATION_MS + 50);
  });
}

/**
 * Measure the natural (auto) height of `el` without disturbing layout.
 * @param {HTMLElement} el
 * @returns {number}
 */
function _naturalHeight(el) {
  const prevHeight  = el.style.height;
  const prevVis     = el.style.visibility;
  const prevPos     = el.style.position;

  el.style.height     = 'auto';
  el.style.visibility = 'hidden';
  el.style.position   = 'absolute';
  const h = el.scrollHeight;
  el.style.height     = prevHeight;
  el.style.visibility = prevVis;
  el.style.position   = prevPos;

  return h;
}

// ─────────────────────────────────────────────────────────────
// 6. Helpers
// ─────────────────────────────────────────────────────────────

function _isExclusive(accordion) {
  return accordion.dataset.exclusive !== 'false'; // exclusive by default
}

/**
 * Find the trigger before (-1) or after (1) the given trigger within
 * the same accordion.
 * @param {HTMLElement} trigger
 * @param {-1 | 1}     dir
 * @returns {HTMLElement | null}
 */
function _adjacentTrigger(trigger, dir) {
  const accordion = closest(trigger, SEL_ACCORDION);
  if (!accordion) return null;
  const all = $$(SEL_TRIGGER, accordion);
  const idx = all.indexOf(trigger);
  return all[idx + dir] ?? null;
}

const _uidMap = new WeakMap();
let   _uidSeq = 0;
function _uid(el) {
  if (!_uidMap.has(el)) _uidMap.set(el, ++_uidSeq);
  return _uidMap.get(el);
}
