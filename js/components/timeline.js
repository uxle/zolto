/**
 * js/components/timeline.js
 * Zolto v8.1.0 — Timeline Component
 *
 * Animates timeline items into view as the user scrolls.
 * Uses IntersectionObserver with a staggered delay so each
 * item enters slightly after the previous one.
 *
 * Features:
 *  - Scroll-triggered entrance animation (CSS class toggle)
 *  - Stagger delay per item (CSS custom property)
 *  - Alternating left/right layout support
 *  - Progress line fill animation
 *  - Milestone date badges
 *  - Respects prefers-reduced-motion
 */

'use strict';

import { createLogger }               from '../utils/logger.js';
import { bus, EVENTS }                from '../utils/events.js';
import { $$, addClass }               from '../utils/dom.js';

const logger = createLogger('Timeline');

// ─────────────────────────────────────────────────────────────
// 1. Constants
// ─────────────────────────────────────────────────────────────

const SEL_TIMELINE      = '.zolto-timeline';
const SEL_ITEM          = '.zolto-timeline-item';
const SEL_PROGRESS      = '.zolto-timeline-progress';
const SEL_MARKER        = '.zolto-timeline-marker';

const CLS_VISIBLE       = 'zolto-timeline-item--visible';
const CLS_DONE          = 'zolto-timeline-item--done';

const STAGGER_MS        = 80;   // delay between successive items appearing
const ROOT_MARGIN       = '-60px 0px -60px 0px';
const THRESHOLD         = 0.15;

// ─────────────────────────────────────────────────────────────
// 2. Module State
// ─────────────────────────────────────────────────────────────

/** @type {WeakMap<HTMLElement, { observers: IntersectionObserver[], cleanup: Function[] }>} */
const _instanceMap  = new WeakMap();
const _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─────────────────────────────────────────────────────────────
// 3. Public API
// ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);

  const observers = [];
  const cleanup   = [];

  $$(SEL_TIMELINE, root).forEach(timeline => {
    const obs = _observeTimeline(timeline);
    if (obs) observers.push(obs);
    _initProgress(timeline);
  });

  // Re-init after render
  const _unRender = bus.on(EVENTS.RENDER_DONE, () => {
    destroy(root);
    init(root);
  });
  cleanup.push(_unRender);

  _instanceMap.set(root, { observers, cleanup });
  logger.debug('Timeline component initialised');
}

/**
 * @param {HTMLElement} root
 */
export function destroy(root) {
  const state = _instanceMap.get(root);
  if (!state) return;
  state.observers.forEach(obs => obs.disconnect());
  state.cleanup.forEach(fn => fn?.());
  _instanceMap.delete(root);
}

// ─────────────────────────────────────────────────────────────
// 4. Per-Timeline Observation
// ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} timeline
 * @returns {IntersectionObserver | null}
 */
function _observeTimeline(timeline) {
  const items = $$(SEL_ITEM, timeline);
  if (!items.length) return null;

  // Reduced motion: show all immediately
  if (_reducedMotion) {
    items.forEach(item => addClass(item, CLS_VISIBLE));
    return null;
  }

  // Assign stagger index
  items.forEach((item, i) => {
    item.style.setProperty('--zolto-timeline-stagger', `${i * STAGGER_MS}ms`);
  });

  let _visibleCount = 0;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const item  = /** @type {HTMLElement} */ (entry.target);
      const delay = parseInt(item.style.getPropertyValue('--zolto-timeline-stagger') || '0', 10);

      setTimeout(() => {
        addClass(item, CLS_VISIBLE);
        _visibleCount++;

        // Update progress line
        _updateProgress(timeline, _visibleCount, items.length);
      }, delay);

      observer.unobserve(item);
    });
  }, {
    root:       null,
    rootMargin: ROOT_MARGIN,
    threshold:  THRESHOLD,
  });

  items.forEach(item => observer.observe(item));
  return observer;
}

// ─────────────────────────────────────────────────────────────
// 5. Progress Line
// ─────────────────────────────────────────────────────────────

/**
 * Set up the animated progress line SVG within a timeline.
 * @param {HTMLElement} timeline
 */
function _initProgress(timeline) {
  let line = timeline.querySelector(SEL_PROGRESS);
  if (line) return; // Already present from renderer

  // Create a simple vertical progress line element
  line = document.createElement('div');
  line.className = 'zolto-timeline-progress';
  line.setAttribute('aria-hidden', 'true');
  line.style.setProperty('--zolto-timeline-progress', '0%');
  timeline.insertBefore(line, timeline.firstChild);
}

/**
 * Animate the progress line to reflect how many items are visible.
 * @param {HTMLElement} timeline
 * @param {number}      visible
 * @param {number}      total
 */
function _updateProgress(timeline, visible, total) {
  const line = timeline.querySelector(SEL_PROGRESS);
  if (!line) return;

  const pct = total > 0 ? Math.round((visible / total) * 100) : 0;
  line.style.setProperty('--zolto-timeline-progress', `${pct}%`);
}

// ─────────────────────────────────────────────────────────────
// 6. Mark items as "done" (past events)
// ─────────────────────────────────────────────────────────────

/**
 * Mark all timeline items whose date is in the past as "done".
 * Reads data-date="YYYY-MM-DD" from each item.
 * @param {HTMLElement} root
 */
export function markPastItems(root) {
  const now = Date.now();

  $$(SEL_ITEM, root).forEach(item => {
    const dateStr = item.dataset.date;
    if (!dateStr) return;

    const itemDate = Date.parse(dateStr);
    if (!isNaN(itemDate) && itemDate < now) {
      addClass(item, CLS_DONE);
    }
  });
}
