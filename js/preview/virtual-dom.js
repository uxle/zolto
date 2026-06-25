/**
 * js/preview/virtual-dom.js
 * Zolto v8.1.0 — Virtual DOM Differ & Patcher
 *
 * Minimal virtual DOM that patches a live DOM container in place
 * by comparing the new HTML string against the previously rendered
 * state at the node level.
 *
 * Algorithm:
 *  1. Parse the new HTML string into a NodeList using a detached <div>
 *  2. Split both old and new content into "keyed blocks" by data-id
 *  3. Diff the two block lists:
 *     - Same id + same content hash → skip (no DOM write)
 *     - Same id + different hash   → replace outerHTML
 *     - New id                     → insert before next sibling
 *     - Old id not in new list     → remove
 *  4. Any unkeyed content (no data-id) → full replace of that zone
 *
 * Benefits:
 *  - CSS animations on unchanged nodes are not interrupted
 *  - Scroll position preserved
 *  - Only changed nodes trigger browser layout/paint
 *  - Tab state, accordion open/closed, etc. preserved
 */

'use strict';

import { createLogger } from '../utils/logger.js';

const logger = createLogger('VirtualDOM');

// ─────────────────────────────────────────────────────────────
// 1. Content Hashing
// ─────────────────────────────────────────────────────────────

/**
 * Fast non-cryptographic string hash (djb2 variant).
 * Used to detect whether a node's content has changed.
 * @param {string} str
 * @returns {number}
 */
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

// ─────────────────────────────────────────────────────────────
// 2. Block Splitting
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} Block
 * @property {string | null} id      — value of data-id attribute, or null
 * @property {number}        hash    — content hash
 * @property {string}        html    — raw outerHTML string
 * @property {Element | null} el     — live DOM element (null for new HTML)
 */

/**
 * Split rendered HTML into Block[] keyed by data-id.
 * Blocks without data-id are wrapped in a synthetic id.
 * @param {string} html
 * @param {number} [counter=0]  — for generating synthetic ids
 * @returns {Block[]}
 */
function parseBlocks(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const blocks = [];
  let   synth  = 0;

  for (const child of container.children) {
    const id = child.getAttribute('data-id') ?? `__synth_${synth++}`;
    blocks.push({
      id,
      hash:  hash(child.outerHTML),
      html:  child.outerHTML,
      el:    null,
    });
  }

  // Handle leading/trailing text nodes (unlikely in Zolto output but safe)
  return blocks;
}

/**
 * Extract Block[] from the live DOM container.
 * @param {Element} container
 * @returns {Block[]}
 */
function liveBlocks(container) {
  const blocks = [];
  let   synth  = 0;

  for (const child of container.children) {
    const id = child.getAttribute('data-id') ?? `__synth_${synth++}`;
    blocks.push({
      id,
      hash:  hash(child.outerHTML),
      html:  child.outerHTML,
      el:    child,
    });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────
// 3. Patch Algorithm
// ─────────────────────────────────────────────────────────────

/**
 * Patch `container`'s DOM to match `newHtml`.
 * Uses data-id attribute as the node key.
 *
 * @param {Element} container — live DOM element to patch in place
 * @param {string}  newHtml   — full rendered HTML from ZoltoRenderer
 * @returns {{ added: number, updated: number, removed: number, skipped: number }}
 */
export function patch(container, newHtml) {
  const t0 = performance.now();

  const newBlocks  = parseBlocks(newHtml);
  const oldBlocks  = liveBlocks(container);

  // Build lookup maps
  const oldMap = new Map(oldBlocks.map(b => [b.id, b]));
  const newMap = new Map(newBlocks.map(b => [b.id, b]));

  let added = 0, updated = 0, removed = 0, skipped = 0;

  // ── Pass 1: Update or insert new blocks ──────────────────
  let refEl = container.firstElementChild;

  for (let ni = 0; ni < newBlocks.length; ni++) {
    const nb  = newBlocks[ni];
    const old = oldMap.get(nb.id);

    if (old && old.el) {
      // Node exists — check if content changed
      if (old.hash === nb.hash) {
        // No change — advance reference element
        skipped++;
        refEl = old.el.nextElementSibling;
        continue;
      }

      // Content changed — replace outerHTML
      old.el.outerHTML = nb.html;
      updated++;

      // outerHTML replacement detaches the element — find new reference
      // by navigating from container's children at the expected position
      refEl = _childAt(container, ni + 1);

    } else {
      // New node — insert before refEl (or append)
      const fragment = _htmlToElement(nb.html);
      if (refEl) {
        container.insertBefore(fragment, refEl);
      } else {
        container.appendChild(fragment);
      }
      added++;
      refEl = _childAt(container, ni + 1);
    }
  }

  // ── Pass 2: Remove old nodes no longer in new list ───────
  for (const [id, old] of oldMap) {
    if (!newMap.has(id) && old.el && old.el.isConnected) {
      old.el.remove();
      removed++;
    }
  }

  const elapsed = (performance.now() - t0).toFixed(2);
  logger.debug(`patch: +${added} ~${updated} -${removed} =${skipped} (${elapsed}ms)`);

  return { added, updated, removed, skipped };
}

// ─────────────────────────────────────────────────────────────
// 4. Full Replace (used when patch is impractical)
// ─────────────────────────────────────────────────────────────

/**
 * Replace the entire container content with new HTML.
 * Used as fallback for initial render or when a full refresh is needed.
 * @param {Element} container
 * @param {string}  html
 */
export function replaceAll(container, html) {
  container.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// 5. Scroll Sync
// ─────────────────────────────────────────────────────────────

/**
 * Synchronise the scroll position of `target` to match `source`
 * as a proportional offset (0–1).
 *
 * @param {Element} source  — e.g. the editor pane
 * @param {Element} target  — e.g. the preview pane
 */
export function syncScroll(source, target) {
  const sourceMax = source.scrollHeight - source.clientHeight;
  if (sourceMax <= 0) return;

  const ratio    = source.scrollTop / sourceMax;
  const targetMax = target.scrollHeight - target.clientHeight;
  target.scrollTop = ratio * targetMax;
}

// ─────────────────────────────────────────────────────────────
// 6. Scroll Progress (for --scroll-progress CSS var)
// ─────────────────────────────────────────────────────────────

/**
 * Update the --scroll-progress CSS custom property on `el`'s
 * parent to drive the scroll indicator bar.
 * @param {Element} el
 */
export function updateScrollProgress(el) {
  const max = el.scrollHeight - el.clientHeight;
  const pct = max > 0 ? ((el.scrollTop / max) * 100).toFixed(1) + '%' : '0%';
  el.closest('[data-scroll-sync]')
    ?.style.setProperty('--scroll-progress', pct);
}

// ─────────────────────────────────────────────────────────────
// 7. Lazy Render Observer
// ─────────────────────────────────────────────────────────────

/**
 * Set up an IntersectionObserver that renders lazy placeholders
 * when they scroll into view.
 *
 * @param {Element}  container — the preview pane root
 * @param {Function} renderFn  — (placeholderEl) => string (HTML for the component)
 * @returns {IntersectionObserver}
 */
export function observeLazy(container, renderFn) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = /** @type {HTMLElement} */ (entry.target);
      if (!el.classList.contains('zolto-lazy-placeholder')) continue;

      try {
        const html = renderFn(el);
        if (html) el.outerHTML = html;
      } catch (err) {
        logger.error('Lazy render error:', err);
      }
      observer.unobserve(el);
    }
  }, { rootMargin: '200px 0px' });

  for (const el of container.querySelectorAll('.zolto-lazy-placeholder')) {
    observer.observe(el);
  }

  return observer;
}

// ─────────────────────────────────────────────────────────────
// 8. Streaming Render
// ─────────────────────────────────────────────────────────────

/**
 * Progressive render — fills in .zolto-streaming-shell placeholders
 * with their rendered content in the next microtask tick.
 *
 * @param {Element}  container
 * @param {Function} renderFn  — (el: HTMLElement) => Promise<string>
 */
export async function processStreaming(container, renderFn) {
  const shells = [...container.querySelectorAll('.zolto-streaming-shell')];
  for (const shell of shells) {
    try {
      const spinner = shell.querySelector('.zolto-streaming-spinner');
      if (spinner) spinner.remove();
      const html = await renderFn(shell);
      if (html) shell.innerHTML = html;
    } catch (err) {
      logger.error('Streaming render error:', err);
    }
    // Yield to browser between each heavy render
    await new Promise(r => setTimeout(r, 0));
  }
}

// ─────────────────────────────────────────────────────────────
// 9. Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get child element at a specific index.
 * @param {Element} parent
 * @param {number}  index
 * @returns {Element | null}
 */
function _childAt(parent, index) {
  return parent.children[index] ?? null;
}

/**
 * Parse an HTML string into a single Element.
 * @param {string} html
 * @returns {Element}
 */
function _htmlToElement(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  // Return first child if single element, else a DocumentFragment
  if (div.children.length === 1) return div.firstElementChild;
  const frag = document.createDocumentFragment();
  while (div.firstChild) frag.appendChild(div.firstChild);
  return /** @type {Element} */ (frag);
}

// ─────────────────────────────────────────────────────────────
// 10. Interactive Component Activators
//     Run after any patch to wire up JS behaviour on new nodes.
// ─────────────────────────────────────────────────────────────

/**
 * Activate all interactive components within `root`.
 * Called by preview.js after every successful patch.
 * @param {Element} root
 */
export function activateInteractivity(root) {
  _activateTabs(root);
  _activateAccordions(root);
  _activateFlashcards(root);
  _activateMCQ(root);
  _activatePresentations(root);
  _activateCodeCopy(root);
}

function _activateTabs(root) {
  for (const tabs of root.querySelectorAll('.zolto-tabs[data-id]')) {
    if (tabs.dataset.jsActivated) continue;
    tabs.dataset.jsActivated = '1';
    tabs.addEventListener('click', (e) => {
      const btn = /** @type {HTMLElement} */ (e.target).closest('.zolto-tab-btn');
      if (!btn) return;
      const id      = tabs.dataset.id;
      const panelId = btn.getAttribute('aria-controls');
      for (const b of tabs.querySelectorAll('.zolto-tab-btn')) {
        b.classList.toggle('zolto-tab-active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      }
      for (const p of tabs.querySelectorAll('.zolto-tab-panel')) {
        const active = p.id === panelId;
        p.classList.toggle('zolto-tab-hidden', !active);
        p.hidden = !active;
      }
    });
  }
}

function _activateAccordions(root) {
  for (const details of root.querySelectorAll('details.zolto-details, details.zolto-accordion-item')) {
    if (details.dataset.jsActivated) continue;
    details.dataset.jsActivated = '1';
    const chevron = details.querySelector('.zolto-accordion-chevron');
    if (chevron) {
      details.addEventListener('toggle', () => {
        chevron.style.transform = details.open ? 'rotate(180deg)' : '';
      });
    }
  }
}

function _activateFlashcards(root) {
  for (const card of root.querySelectorAll('.zolto-flashcard')) {
    if (card.dataset.jsActivated) continue;
    card.dataset.jsActivated = '1';
    const activate = () => card.classList.toggle('flipped');
    card.addEventListener('click', activate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  }
}

function _activateMCQ(root) {
  for (const mcq of root.querySelectorAll('.zolto-mcq')) {
    if (mcq.dataset.jsActivated) continue;
    mcq.dataset.jsActivated = '1';
    const options     = [...mcq.querySelectorAll('.zolto-mcq-option')];
    const explanation = mcq.querySelector('.zolto-mcq-explanation');

    mcq.addEventListener('click', (e) => {
      const opt = /** @type {HTMLElement} */ (e.target).closest('.zolto-mcq-option');
      if (!opt || mcq.dataset.answered) return;

      mcq.dataset.answered = '1';
      const idx     = parseInt(opt.dataset.option ?? '0', 10);
      // Correct answer determined by data injected at render time
      // For now highlight selected
      opt.classList.add('selected');
      if (explanation) mcq.classList.add('revealed');

      options.forEach((o, i) => {
        if (o === opt) o.setAttribute('aria-checked', 'true');
      });
    });
  }
}

function _activatePresentations(root) {
  for (const pres of root.querySelectorAll('.zolto-presentation')) {
    if (pres.dataset.jsActivated) continue;
    pres.dataset.jsActivated = '1';

    const slides  = [...pres.querySelectorAll('.zolto-slide')];
    const counter = pres.querySelector('.zolto-slide-counter');
    const total   = slides.length;
    let   current = 0;

    const showSlide = (idx) => {
      current = Math.max(0, Math.min(idx, total - 1));
      slides.forEach((s, i) => {
        s.classList.toggle('zolto-slide-active',  i === current);
        s.classList.toggle('zolto-slide-hidden', i !== current);
        s.hidden = i !== current;
      });
      if (counter) counter.textContent = `${current + 1} / ${total}`;
    };

    pres.querySelector('.zolto-slide-prev')?.addEventListener('click', () => showSlide(current - 1));
    pres.querySelector('.zolto-slide-next')?.addEventListener('click', () => showSlide(current + 1));
    document.addEventListener('keydown', (e) => {
      if (!pres.isConnected) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') showSlide(current + 1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   showSlide(current - 1);
    });
  }
}

function _activateCodeCopy(root) {
  for (const btn of root.querySelectorAll('.zolto-code-copy')) {
    if (btn.dataset.jsActivated) continue;
    btn.dataset.jsActivated = '1';
    btn.addEventListener('click', async () => {
      const pre = btn.closest('.zolto-code-block')?.querySelector('code');
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.textContent ?? '');
        const orig = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      } catch { /* clipboard access denied */ }
    });
  }
}
