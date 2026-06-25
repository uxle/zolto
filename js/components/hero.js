/**
 * js/components/hero.js
 * Zolto v8.1.0 — Hero Component
 *
 * Enhances <hero> elements with:
 *  - Parallax background scroll (optional, data-parallax="true")
 *  - Animated headline text (typewriter or word-reveal)
 *  - CTA button ripple and focus ring
 *  - Scroll-down indicator auto-hide on scroll
 *  - Reduced-motion compliance
 */

'use strict';

import { createLogger }               from '../utils/logger.js';
import { bus, EVENTS }                from '../utils/events.js';
import { $$, closest, addClass,
         removeClass, data }          from '../utils/dom.js';

const logger = createLogger('Hero');

// ─────────────────────────────────────────────────────────────
// 1. Constants
// ─────────────────────────────────────────────────────────────

const SEL_HERO          = '.zolto-hero';
const SEL_HEADING       = '.zolto-hero-heading';
const SEL_SUBHEADING    = '.zolto-hero-subheading';
const SEL_CTA_BTN       = '.zolto-hero-cta .zolto-btn, .zolto-hero-cta a';
const SEL_SCROLL_IND    = '.zolto-hero-scroll-indicator';
const SEL_BG            = '.zolto-hero-bg';

const CLS_REVEALED      = 'zolto-hero--revealed';
const CLS_SCROLL_HIDDEN = 'zolto-hero-scroll-indicator--hidden';

const WORD_REVEAL_DELAY = 60;   // ms between each word appearing
const PARALLAX_FACTOR   = 0.3;  // bg moves at 30% of scroll speed
const SCROLL_HIDE_PX    = 80;   // px scrolled before hiding scroll indicator

const _reducedMotion    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─────────────────────────────────────────────────────────────
// 2. Module State
// ─────────────────────────────────────────────────────────────

/** @type {WeakMap<HTMLElement, { cleanups: Function[] }>} */
const _instanceMap  = new WeakMap();

// ─────────────────────────────────────────────────────────────
// 3. Public API
// ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);

  const cleanups = [];

  $$(SEL_HERO, root).forEach(hero => {
    const fns = _initHero(hero);
    cleanups.push(...fns);
  });

  const _unRender = bus.on(EVENTS.RENDER_DONE, () => {
    destroy(root);
    init(root);
  });
  cleanups.push(_unRender);

  _instanceMap.set(root, { cleanups });
  logger.debug('Hero component initialised');
}

/**
 * @param {HTMLElement} root
 */
export function destroy(root) {
  const state = _instanceMap.get(root);
  if (!state) return;
  state.cleanups.forEach(fn => fn?.());
  _instanceMap.delete(root);
}

// ─────────────────────────────────────────────────────────────
// 4. Per-Hero Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Set up all behaviour for one <hero> element.
 * @param {HTMLElement} hero
 * @returns {Function[]} cleanup functions
 */
function _initHero(hero) {
  const cleanups = [];

  // ── Entrance reveal ───────────────────────────────────────
  if (_reducedMotion) {
    addClass(hero, CLS_REVEALED);
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        _reveal(hero);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.1 });

    io.observe(hero);
    cleanups.push(() => io.disconnect());
  }

  // ── Parallax background ───────────────────────────────────
  if (!_reducedMotion && hero.dataset.parallax !== 'false') {
    const onScroll = () => _applyParallax(hero);
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));
    _applyParallax(hero); // initial position
  }

  // ── Animated headline ─────────────────────────────────────
  const heading = hero.querySelector(SEL_HEADING);
  if (heading && !_reducedMotion) {
    const animType = hero.dataset.textAnim ?? 'word-reveal';
    if (animType === 'typewriter') {
      const cancel = _typewriter(heading);
      cleanups.push(cancel);
    } else if (animType === 'word-reveal') {
      _wrapWords(heading);
    }
  }

  // ── Scroll indicator auto-hide ────────────────────────────
  const indicator = hero.querySelector(SEL_SCROLL_IND);
  if (indicator) {
    const onScroll = () => {
      toggleScrollIndicator(indicator, window.scrollY < SCROLL_HIDE_PX);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    // Animate indicator arrow
    if (!_reducedMotion) _bounceIndicator(indicator);
  }

  // ── CTA ripple ────────────────────────────────────────────
  $$(SEL_CTA_BTN, hero).forEach(btn => {
    const onCTAClick = (e) => _ctaRipple(btn, e);
    btn.addEventListener('click', onCTAClick);
    cleanups.push(() => btn.removeEventListener('click', onCTAClick));
  });

  return cleanups;
}

// ─────────────────────────────────────────────────────────────
// 5. Entrance Reveal
// ─────────────────────────────────────────────────────────────

function _reveal(hero) {
  addClass(hero, CLS_REVEALED);

  // Stagger child elements
  const children = Array.from(hero.querySelectorAll(
    '.zolto-hero-eyebrow, .zolto-hero-heading, .zolto-hero-subheading, .zolto-hero-cta, .zolto-hero-scroll-indicator'
  ));

  children.forEach((el, i) => {
    el.style.animationDelay = `${i * 80}ms`;
    addClass(el, 'zolto-hero-child--reveal');
  });
}

// ─────────────────────────────────────────────────────────────
// 6. Parallax
// ─────────────────────────────────────────────────────────────

/**
 * Translate the hero background by a fraction of scroll position.
 * @param {HTMLElement} hero
 */
function _applyParallax(hero) {
  const bg = hero.querySelector(SEL_BG);
  if (!bg) return;

  const { top } = hero.getBoundingClientRect();
  // Only apply when hero is in viewport
  if (top > window.innerHeight || top + hero.offsetHeight < 0) return;

  const offset = (window.scrollY - hero.offsetTop) * PARALLAX_FACTOR;
  bg.style.transform = `translateY(${offset.toFixed(1)}px)`;
}

// ─────────────────────────────────────────────────────────────
// 7. Text Animations
// ─────────────────────────────────────────────────────────────

/**
 * Wrap each word in the heading element in a <span> with a stagger delay,
 * so CSS can animate them in sequentially.
 * @param {HTMLElement} el
 */
function _wrapWords(el) {
  if (el.dataset.wordsWrapped) return;
  el.dataset.wordsWrapped = '1';

  const text  = el.textContent ?? '';
  const words = text.split(/(\s+)/);

  el.textContent = '';

  let wordIdx = 0;
  words.forEach(chunk => {
    if (/\s+/.test(chunk)) {
      el.appendChild(document.createTextNode(chunk));
    } else {
      const span = document.createElement('span');
      span.className = 'zolto-hero-word';
      span.style.animationDelay = `${wordIdx * WORD_REVEAL_DELAY}ms`;
      span.textContent = chunk;
      el.appendChild(span);
      wordIdx++;
    }
  });
}

/**
 * Typewriter animation: progressively reveal text character by character.
 * @param {HTMLElement} el
 * @returns {() => void} cancel function
 */
function _typewriter(el) {
  const full    = el.textContent ?? '';
  el.textContent = '';
  el.setAttribute('aria-label', full);   // full text always accessible

  let i         = 0;
  let cancelled = false;

  const cursor  = document.createElement('span');
  cursor.className   = 'zolto-hero-cursor';
  cursor.textContent = '|';
  cursor.setAttribute('aria-hidden', 'true');
  el.appendChild(cursor);

  function type() {
    if (cancelled) return;
    if (i < full.length) {
      cursor.insertAdjacentText('beforebegin', full[i]);
      i++;
      const delay = full[i - 1] === ' ' ? 60 : 38 + Math.random() * 40;
      setTimeout(type, delay);
    } else {
      // Blink cursor then remove
      setTimeout(() => { if (!cancelled) cursor.remove(); }, 1200);
    }
  }

  setTimeout(type, 300);
  return () => { cancelled = true; el.textContent = full; };
}

// ─────────────────────────────────────────────────────────────
// 8. Scroll Indicator
// ─────────────────────────────────────────────────────────────

function toggleScrollIndicator(indicator, visible) {
  if (visible) removeClass(indicator, CLS_SCROLL_HIDDEN);
  else         addClass(indicator,    CLS_SCROLL_HIDDEN);
}

function _bounceIndicator(indicator) {
  // CSS handles the bounce animation; just add the class
  addClass(indicator, 'zolto-hero-scroll-indicator--animated');
}

// ─────────────────────────────────────────────────────────────
// 9. CTA Ripple
// ─────────────────────────────────────────────────────────────

/**
 * Emit a radial ripple from the click point within a CTA button.
 * @param {HTMLElement} btn
 * @param {MouseEvent}  event
 */
function _ctaRipple(btn, event) {
  const r    = btn.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;

  const ripple  = document.createElement('span');
  ripple.className    = 'zolto-hero-btn-ripple';
  ripple.style.width  = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left   = `${event.clientX - r.left - size / 2}px`;
  ripple.style.top    = `${event.clientY - r.top  - size / 2}px`;

  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);

  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}
