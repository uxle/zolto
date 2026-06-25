/**
 * js/components/gallery.js
 * Zolto v8.1.0 — Gallery / Lightbox Component
 *
 * Provides an accessible lightbox overlay for <gallery> elements.
 *
 * Features:
 *  - Click any gallery item to open lightbox
 *  - Arrow Left / Right to navigate between images
 *  - Escape to close
 *  - Touch swipe (horizontal) on mobile
 *  - Lazy loading of full-size images in lightbox
 *  - Focus trap within open lightbox
 *  - Caption display
 *  - Image counter ("3 / 12")
 *  - prefers-reduced-motion respected (crossfade disabled)
 */

'use strict';

import { createLogger }                   from '../utils/logger.js';
import { bus, EVENTS, delegate }          from '../utils/events.js';
import { $$, closest, addClass, removeClass,
         trapFocus, data }                from '../utils/dom.js';

const logger = createLogger('Gallery');

// ─────────────────────────────────────────────────────────────
// 1. Constants
// ─────────────────────────────────────────────────────────────

const SEL_GALLERY      = '.zolto-gallery';
const SEL_ITEM         = '.zolto-gallery-item';
const SEL_IMG          = '.zolto-gallery-item img, .zolto-gallery-item [data-src]';

const CLS_LB_OPEN      = 'zolto-lightbox--open';
const LIGHTBOX_ID      = 'zolto-lightbox';

const SWIPE_THRESHOLD  = 50;   // px needed to register a swipe
const _reducedMotion   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─────────────────────────────────────────────────────────────
// 2. Lightbox State
// ─────────────────────────────────────────────────────────────

/** @type {{ items: HTMLElement[], index: number, releaseFocus: (() => void) | null }} */
const _state = {
  items:        [],
  index:        0,
  releaseFocus: null,
};

/** @type {HTMLElement | null} */
let _lightbox   = null;
/** @type {HTMLElement | null} */
let _focusReturn = null;

const _cleanupMap = new WeakMap();

// ─────────────────────────────────────────────────────────────
// 3. Public API
// ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);
  _ensureLightbox();

  const cleanups = [];

  cleanups.push(delegate(root, 'click',   SEL_ITEM, _onItemClick));
  cleanups.push(delegate(root, 'keydown', SEL_ITEM, _onItemKeydown));

  // Make items keyboard-focusable
  $$(SEL_ITEM, root).forEach(item => {
    if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-haspopup', 'dialog');
  });

  const _unRender = bus.on(EVENTS.RENDER_DONE, () => {
    destroy(root);
    init(root);
  });
  cleanups.push(_unRender);

  _cleanupMap.set(root, cleanups);
  logger.debug('Gallery component initialised');
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
// 4. Event Handlers (gallery items)
// ─────────────────────────────────────────────────────────────

function _onItemClick(event, item) {
  const gallery = closest(item, SEL_GALLERY);
  if (!gallery) return;

  const items = $$(SEL_ITEM, gallery);
  const index = items.indexOf(item);

  _open(items, index, item);
}

function _onItemKeydown(event, item) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  _onItemClick(event, item);
}

// ─────────────────────────────────────────────────────────────
// 5. Lightbox DOM
// ─────────────────────────────────────────────────────────────

function _ensureLightbox() {
  if (_lightbox) return;

  _lightbox = document.createElement('div');
  _lightbox.id        = LIGHTBOX_ID;
  _lightbox.className = 'zolto-lightbox';
  _lightbox.setAttribute('role', 'dialog');
  _lightbox.setAttribute('aria-modal', 'true');
  _lightbox.setAttribute('aria-label', 'Image viewer');
  _lightbox.hidden = true;

  _lightbox.innerHTML = `
    <div class="zolto-lightbox-backdrop" aria-hidden="true"></div>
    <div class="zolto-lightbox-dialog">
      <button class="zolto-lightbox-close" aria-label="Close image viewer">
        <span aria-hidden="true">✕</span>
      </button>
      <button class="zolto-lightbox-prev" aria-label="Previous image">
        <span aria-hidden="true">‹</span>
      </button>
      <div class="zolto-lightbox-stage">
        <img class="zolto-lightbox-image" src="" alt="" draggable="false" />
        <p  class="zolto-lightbox-caption" aria-live="polite"></p>
      </div>
      <button class="zolto-lightbox-next" aria-label="Next image">
        <span aria-hidden="true">›</span>
      </button>
      <div class="zolto-lightbox-counter" aria-live="polite"></div>
    </div>
  `;

  document.body.appendChild(_lightbox);

  // Lightbox-level event listeners (persistent)
  _lightbox.querySelector('.zolto-lightbox-close')    .addEventListener('click', _close);
  _lightbox.querySelector('.zolto-lightbox-prev')     .addEventListener('click', () => _navigate(-1));
  _lightbox.querySelector('.zolto-lightbox-next')     .addEventListener('click', () => _navigate(1));
  _lightbox.querySelector('.zolto-lightbox-backdrop') .addEventListener('click', _close);

  document.addEventListener('keydown', _onLightboxKeydown);

  // Touch swipe
  let _touchStartX = 0;
  _lightbox.addEventListener('touchstart', e => { _touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  _lightbox.addEventListener('touchend',   e => {
    const delta = e.changedTouches[0].screenX - _touchStartX;
    if (Math.abs(delta) > SWIPE_THRESHOLD) _navigate(delta < 0 ? 1 : -1);
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────────
// 6. Open / Navigate / Close
// ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement[]} items
 * @param {number}        index
 * @param {HTMLElement}   originEl — element to return focus to on close
 */
function _open(items, index, originEl) {
  _state.items = items;
  _state.index = index;
  _focusReturn = originEl;

  _lightbox.hidden = false;
  addClass(_lightbox, CLS_LB_OPEN);
  document.body.classList.add('zolto-lightbox-active');

  _state.releaseFocus = trapFocus(_lightbox);

  _showItem(index);
  _lightbox.querySelector('.zolto-lightbox-close')?.focus();

  logger.debug('Gallery lightbox opened at index', index);
}

function _close() {
  if (!_lightbox || _lightbox.hidden) return;

  removeClass(_lightbox, CLS_LB_OPEN);
  document.body.classList.remove('zolto-lightbox-active');

  _lightbox.addEventListener('transitionend', () => {
    _lightbox.hidden = true;
    _clearImage();
  }, { once: true });

  _state.releaseFocus?.();
  _state.releaseFocus = null;
  _focusReturn?.focus();
  _focusReturn = null;

  logger.debug('Gallery lightbox closed');
}

/**
 * @param {-1 | 1} dir
 */
function _navigate(dir) {
  const total = _state.items.length;
  if (!total) return;

  _state.index = (_state.index + dir + total) % total;
  _showItem(_state.index);
}

/**
 * Load and display the item at `index`.
 * @param {number} index
 */
function _showItem(index) {
  const item    = _state.items[index];
  const imgEl   = _lightbox.querySelector('.zolto-lightbox-image');
  const caption = _lightbox.querySelector('.zolto-lightbox-caption');
  const counter = _lightbox.querySelector('.zolto-lightbox-counter');
  if (!item || !imgEl) return;

  // Resolve image source
  const srcImg = item.querySelector('img');
  const src    = srcImg?.dataset.full ?? srcImg?.src ?? item.dataset.src ?? '';
  const alt    = srcImg?.alt ?? data(item, 'alt') ?? '';
  const cap    = data(item, 'caption') ?? srcImg?.dataset.caption ?? '';

  if (!_reducedMotion) addClass(imgEl, 'zolto-lightbox-image--loading');

  imgEl.onload = () => removeClass(imgEl, 'zolto-lightbox-image--loading');
  imgEl.src    = src;
  imgEl.alt    = alt;

  if (caption) caption.textContent = cap;

  const total = _state.items.length;
  if (counter) {
    counter.textContent = total > 1 ? `${index + 1} / ${total}` : '';
  }

  // Update prev/next visibility
  const prevBtn = _lightbox.querySelector('.zolto-lightbox-prev');
  const nextBtn = _lightbox.querySelector('.zolto-lightbox-next');
  if (prevBtn) prevBtn.hidden = total < 2;
  if (nextBtn) nextBtn.hidden = total < 2;
}

function _clearImage() {
  const imgEl = _lightbox?.querySelector('.zolto-lightbox-image');
  if (imgEl) imgEl.src = '';
}

// ─────────────────────────────────────────────────────────────
// 7. Keyboard Handler (document-level, only when open)
// ─────────────────────────────────────────────────────────────

function _onLightboxKeydown(event) {
  if (_lightbox?.hidden) return;

  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      _close();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      _navigate(-1);
      break;
    case 'ArrowRight':
      event.preventDefault();
      _navigate(1);
      break;
  }
}
