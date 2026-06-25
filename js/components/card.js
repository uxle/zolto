/**
 * js/components/card.js
 * Zolto v8.1.0 — Card Component
 *
 * Handles interactive behaviour for <card> and <cards> elements
 * rendered into the preview pane.
 *
 * Responsibilities:
 *  - Click-through navigation for cards with href
 *  - Keyboard accessibility (Enter / Space on interactive cards)
 *  - Lazy image loading for card thumbnails
 *  - Equal-height equalisation within card groups
 *  - Ripple effect on interactive cards
 *
 * Lifecycle:
 *  init(root)     — attach delegated listeners; safe to call on every render
 *  destroy(root)  — remove listeners
 */

'use strict';

import { createLogger }                    from '../utils/logger.js';
import { bus, EVENTS, delegate }           from '../utils/events.js';
import { $$, closest, addClass, data,
         scrollIntoViewIfNeeded }          from '../utils/dom.js';

const logger = createLogger('Card');

// ─────────────────────────────────────────────────────────────
// 1. Constants
// ─────────────────────────────────────────────────────────────

const SEL_CARD         = '.zolto-card';
const SEL_CARD_LINK    = '.zolto-card--interactive, .zolto-card[data-href]';
const SEL_CARD_GROUP   = '.zolto-card-group';
const SEL_CARD_IMG     = '.zolto-card-thumbnail img[data-src]';

const CLS_INTERACTIVE  = 'zolto-card--interactive';
const CLS_FOCUSED      = 'zolto-card--focused';
const CLS_LOADING      = 'zolto-card--loading';
const CLS_RIPPLE       = 'zolto-card-ripple';
const CLS_RIPPLE_WAVE  = 'zolto-card-ripple-wave';

// Per-root cleanup map: root → cleanup fn[]
const _cleanupMap = new WeakMap();

// ─────────────────────────────────────────────────────────────
// 2. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Initialise card interactivity within `root`.
 * Idempotent — calling twice on the same root replaces previous listeners.
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);

  const cleanups = [];

  // Click delegation
  cleanups.push(delegate(root, 'click', SEL_CARD, _onCardClick));

  // Keyboard delegation (Enter / Space)
  cleanups.push(delegate(root, 'keydown', SEL_CARD, _onCardKeydown));

  // Focus / blur for visual ring
  cleanups.push(delegate(root, 'focusin',  SEL_CARD, _onCardFocus));
  cleanups.push(delegate(root, 'focusout', SEL_CARD, _onCardBlur));

  // Lazy images
  _lazyImages(root);

  // Equal-height groups
  _equaliseGroups(root);

  // Re-equalise on window resize
  const _onResize = () => _equaliseGroups(root);
  window.addEventListener('resize', _onResize, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', _onResize));

  // Re-equalise after render
  const _unRender = bus.on(EVENTS.RENDER_DONE, () => {
    _lazyImages(root);
    _equaliseGroups(root);
  });
  cleanups.push(_unRender);

  _cleanupMap.set(root, cleanups);
  logger.debug('Card component initialised');
}

/**
 * Remove all listeners attached by init().
 * @param {HTMLElement} root
 */
export function destroy(root) {
  const cleanups = _cleanupMap.get(root);
  if (!cleanups) return;
  cleanups.forEach(fn => fn?.());
  _cleanupMap.delete(root);
}

// ─────────────────────────────────────────────────────────────
// 3. Event Handlers
// ─────────────────────────────────────────────────────────────

/**
 * Navigate to the card's href on click.
 * @param {MouseEvent} event
 * @param {HTMLElement} card
 */
function _onCardClick(event, card) {
  // Don't steal clicks on inner links / buttons
  if (event.target.closest('a, button, input, select, textarea')) return;

  const href = data(card, 'href');
  if (!href) return;

  _ripple(card, event);

  if (href.startsWith('#')) {
    // In-doc anchor
    const target = document.querySelector(href);
    if (target) scrollIntoViewIfNeeded(target, card.closest('.zolto-preview-inner') ?? document.documentElement);
    return;
  }

  if (href.startsWith('/') || href.startsWith('.')) {
    bus.emit(EVENTS.ROUTE_CHANGE, { path: href });
  } else {
    window.open(href, card.dataset.target ?? '_blank', 'noopener,noreferrer');
  }
}

/**
 * Activate card on Enter / Space for keyboard users.
 * @param {KeyboardEvent} event
 * @param {HTMLElement}   card
 */
function _onCardKeydown(event, card) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!card.classList.contains(CLS_INTERACTIVE) && !data(card, 'href')) return;

  event.preventDefault();
  _onCardClick(event, card);
}

function _onCardFocus(event, card) {
  addClass(card, CLS_FOCUSED);
}

function _onCardBlur(event, card) {
  card.classList.remove(CLS_FOCUSED);
}

// ─────────────────────────────────────────────────────────────
// 4. Lazy Image Loading
// ─────────────────────────────────────────────────────────────

/**
 * Set up IntersectionObserver-based lazy loading for card thumbnails.
 * @param {HTMLElement} root
 */
function _lazyImages(root) {
  const imgs = $$(SEL_CARD_IMG, root);
  if (!imgs.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: load all immediately
    imgs.forEach(_loadImage);
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      _loadImage(/** @type {HTMLImageElement} */ (entry.target));
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '100px' });

  imgs.forEach(img => observer.observe(img));
}

/**
 * Swap data-src → src on a lazy image.
 * @param {HTMLImageElement} img
 */
function _loadImage(img) {
  const src = img.dataset.src;
  if (!src) return;

  const card = closest(img, SEL_CARD);
  if (card) addClass(card, CLS_LOADING);

  img.onload  = () => { card?.classList.remove(CLS_LOADING); };
  img.onerror = () => { card?.classList.remove(CLS_LOADING); img.alt = img.dataset.alt ?? ''; };
  img.src = src;
  delete img.dataset.src;
}

// ─────────────────────────────────────────────────────────────
// 5. Equal-Height Equalisation
// ─────────────────────────────────────────────────────────────

/**
 * Make all cards in a group the same height (tallest card wins).
 * @param {HTMLElement} root
 */
function _equaliseGroups(root) {
  $$(SEL_CARD_GROUP, root).forEach(group => {
    const cards = $$(SEL_CARD, group);

    // Reset heights first
    cards.forEach(c => { c.style.height = ''; });

    // Only equalise if laid out horizontally (more than 1 column)
    const cols = _getColumnCount(group);
    if (cols < 2) return;

    // Group cards into rows by their top offset
    const rows = new Map();
    cards.forEach(card => {
      const top = card.getBoundingClientRect().top;
      if (!rows.has(top)) rows.set(top, []);
      rows.get(top).push(card);
    });

    // Set uniform height per row
    rows.forEach(rowCards => {
      const maxH = Math.max(...rowCards.map(c => c.getBoundingClientRect().height));
      rowCards.forEach(c => { c.style.height = `${maxH}px`; });
    });
  });
}

/**
 * Infer column count from the group's CSS grid / flex layout.
 * @param {HTMLElement} group
 * @returns {number}
 */
function _getColumnCount(group) {
  const style = getComputedStyle(group);
  if (style.display === 'grid') {
    return style.gridTemplateColumns.split(' ').filter(Boolean).length;
  }
  // flex fallback: check how many children share the same top
  const children = Array.from(group.children);
  if (children.length < 2) return 1;
  return children.filter(c => c.getBoundingClientRect().top === children[0].getBoundingClientRect().top).length;
}

// ─────────────────────────────────────────────────────────────
// 6. Ripple Effect
// ─────────────────────────────────────────────────────────────

/**
 * Create a material-style ripple origin at the click position.
 * @param {HTMLElement} card
 * @param {MouseEvent | KeyboardEvent} event
 */
function _ripple(card, event) {
  if (!card.classList.contains(CLS_INTERACTIVE)) return;

  // Ensure ripple container exists
  let container = card.querySelector(`.${CLS_RIPPLE}`);
  if (!container) {
    container = document.createElement('span');
    container.className = CLS_RIPPLE;
    container.setAttribute('aria-hidden', 'true');
    card.appendChild(container);
  }

  const wave     = document.createElement('span');
  wave.className = CLS_RIPPLE_WAVE;

  if (event instanceof MouseEvent) {
    const r    = card.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    wave.style.width  = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.left   = `${event.clientX - r.left - size / 2}px`;
    wave.style.top    = `${event.clientY - r.top  - size / 2}px`;
  }

  container.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
}
