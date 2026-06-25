/**
 * js/components/alert.js
 * Zolto v8.1.0 — Alert / Callout / Assessment Component
 *
 * Handles interactive behaviour for all alert-family elements:
 *  - Callouts        (<tip>, <note>, <warning>, etc.)  — dismiss button
 *  - Details/spoiler (<details summary="…">)           — CSS handles toggle; JS adds animation
 *  - Steps           (<steps>)                          — step progression, mark-complete
 *  - MCQ             (<mcq>)                            — answer checking, reveal explanation
 *  - Flashcard       (<flashcard>)                      — flip animation
 *
 * All interaction is via event delegation on the root container,
 * so it survives full DOM replacement on each render.
 */

'use strict';

import { createLogger }                     from '../utils/logger.js';
import { bus, EVENTS, delegate }            from '../utils/events.js';
import { $$, closest, addClass, removeClass,
         toggleClass, data, setAria }       from '../utils/dom.js';

const logger = createLogger('Alert');

// ─────────────────────────────────────────────────────────────
// 1. Selectors & Classes
// ─────────────────────────────────────────────────────────────

// Callout
const SEL_CALLOUT         = '.zolto-callout';
const SEL_CALLOUT_DISMISS = '.zolto-callout-dismiss';
const CLS_CALLOUT_HIDDEN  = 'zolto-callout--dismissed';

// Details / spoiler
const SEL_DETAILS         = '.zolto-details';
const SEL_DETAILS_SUMMARY = '.zolto-details-summary';
const CLS_DETAILS_OPEN    = 'zolto-details--open';

// Steps
const SEL_STEPS           = '.zolto-steps';
const SEL_STEP            = '.zolto-step';
const SEL_STEP_CHECK      = '.zolto-step-check';
const CLS_STEP_DONE       = 'zolto-step--done';
const CLS_STEP_ACTIVE     = 'zolto-step--active';

// MCQ
const SEL_MCQ             = '.zolto-mcq';
const SEL_MCQ_OPTION      = '.zolto-mcq-option';
const SEL_MCQ_SUBMIT      = '.zolto-mcq-submit';
const SEL_MCQ_RESET       = '.zolto-mcq-reset';
const SEL_MCQ_EXPLANATION = '.zolto-mcq-explanation';
const CLS_MCQ_CORRECT     = 'zolto-mcq-option--correct';
const CLS_MCQ_INCORRECT   = 'zolto-mcq-option--incorrect';
const CLS_MCQ_SELECTED    = 'zolto-mcq-option--selected';
const CLS_MCQ_REVEALED    = 'zolto-mcq--revealed';
const CLS_MCQ_LOCKED      = 'zolto-mcq--locked';

// Flashcard
const SEL_FLASHCARD       = '.zolto-flashcard';
const SEL_FLASHCARD_INNER = '.zolto-flashcard-inner';
const SEL_FLIP_BTN        = '.zolto-flashcard-flip';
const CLS_FLIPPED         = 'zolto-flashcard--flipped';

// Cleanup map
const _cleanupMap = new WeakMap();

// ─────────────────────────────────────────────────────────────
// 2. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Attach all alert-family listeners to `root`.
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);

  const cleanups = [];

  // ── Callout dismiss ───────────────────────────────────────
  cleanups.push(delegate(root, 'click', SEL_CALLOUT_DISMISS, _onDismiss));

  // ── Details toggle ────────────────────────────────────────
  cleanups.push(delegate(root, 'click', SEL_DETAILS_SUMMARY, _onDetailsSummaryClick));

  // ── Step check ────────────────────────────────────────────
  cleanups.push(delegate(root, 'click', SEL_STEP_CHECK, _onStepCheck));

  // ── MCQ option select ─────────────────────────────────────
  cleanups.push(delegate(root, 'click', SEL_MCQ_OPTION, _onMCQOptionClick));
  cleanups.push(delegate(root, 'click', SEL_MCQ_SUBMIT, _onMCQSubmit));
  cleanups.push(delegate(root, 'click', SEL_MCQ_RESET,  _onMCQReset));

  // MCQ keyboard: Space / Enter on options
  cleanups.push(delegate(root, 'keydown', SEL_MCQ_OPTION, _onMCQOptionKeydown));

  // ── Flashcard flip ────────────────────────────────────────
  cleanups.push(delegate(root, 'click', SEL_FLIP_BTN,   _onFlipClick));
  cleanups.push(delegate(root, 'click', SEL_FLASHCARD,   _onFlashcardClick));
  cleanups.push(delegate(root, 'keydown', SEL_FLASHCARD, _onFlashcardKeydown));

  // ── Step progress on re-render ────────────────────────────
  const _unRender = bus.on(EVENTS.RENDER_DONE, () => _restoreStepState(root));
  cleanups.push(_unRender);

  // Init step active state
  _initSteps(root);

  _cleanupMap.set(root, cleanups);
  logger.debug('Alert component initialised');
}

/**
 * Remove all listeners from `root`.
 * @param {HTMLElement} root
 */
export function destroy(root) {
  const cleanups = _cleanupMap.get(root);
  if (!cleanups) return;
  cleanups.forEach(fn => fn?.());
  _cleanupMap.delete(root);
}

// ─────────────────────────────────────────────────────────────
// 3. Callout Dismiss
// ─────────────────────────────────────────────────────────────

function _onDismiss(event, btn) {
  const callout = closest(btn, SEL_CALLOUT);
  if (!callout) return;

  addClass(callout, CLS_CALLOUT_HIDDEN);
  callout.addEventListener('transitionend', () => callout.remove(), { once: true });

  const id = data(callout, 'id');
  if (id) {
    try { sessionStorage.setItem(`zolto-dismissed-${id}`, '1'); } catch { /* private browsing */ }
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Details / Spoiler
// ─────────────────────────────────────────────────────────────

function _onDetailsSummaryClick(event, summary) {
  const details = closest(summary, SEL_DETAILS);
  if (!details) return;

  const isOpen = details.classList.contains(CLS_DETAILS_OPEN);
  toggleClass(details, CLS_DETAILS_OPEN);
  setAria(summary, { expanded: !isOpen });

  const content = details.querySelector('.zolto-details-content');
  if (content) {
    if (!isOpen) {
      // Opening: measure natural height for animation
      content.style.height = '0';
      const targetH = content.scrollHeight;
      requestAnimationFrame(() => {
        content.style.height = `${targetH}px`;
        content.addEventListener('transitionend', () => {
          content.style.height = 'auto';
        }, { once: true });
      });
    } else {
      // Closing: animate back to 0
      content.style.height = `${content.scrollHeight}px`;
      requestAnimationFrame(() => { content.style.height = '0'; });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Steps
// ─────────────────────────────────────────────────────────────

function _initSteps(root) {
  $$(SEL_STEPS, root).forEach(steps => _updateActiveStep(steps));
}

function _restoreStepState(root) {
  _initSteps(root);
}

function _onStepCheck(event, btn) {
  const step  = closest(btn, SEL_STEP);
  const steps = closest(btn, SEL_STEPS);
  if (!step || !steps) return;

  const isDone = step.classList.contains(CLS_STEP_DONE);
  toggleClass(step, CLS_STEP_DONE, !isDone);
  btn.setAttribute('aria-checked', String(!isDone));

  _updateActiveStep(steps);
}

function _updateActiveStep(steps) {
  const allSteps = $$(SEL_STEP, steps);
  let foundActive = false;

  allSteps.forEach(step => {
    step.classList.remove(CLS_STEP_ACTIVE);
    if (!foundActive && !step.classList.contains(CLS_STEP_DONE)) {
      addClass(step, CLS_STEP_ACTIVE);
      foundActive = true;
    }
  });

  // All done → mark steps group complete
  const allDone = allSteps.every(s => s.classList.contains(CLS_STEP_DONE));
  toggleClass(steps, 'zolto-steps--complete', allDone);
}

// ─────────────────────────────────────────────────────────────
// 6. Multiple Choice Questions (MCQ)
// ─────────────────────────────────────────────────────────────

function _onMCQOptionClick(event, option) {
  const mcq = closest(option, SEL_MCQ);
  if (!mcq || mcq.classList.contains(CLS_MCQ_LOCKED)) return;

  // Deselect siblings
  $$(SEL_MCQ_OPTION, mcq).forEach(o => {
    removeClass(o, CLS_MCQ_SELECTED);
    setAria(o, { checked: false });
  });

  addClass(option, CLS_MCQ_SELECTED);
  setAria(option, { checked: true });
}

function _onMCQOptionKeydown(event, option) {
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  _onMCQOptionClick(event, option);
}

function _onMCQSubmit(event, btn) {
  const mcq = closest(btn, SEL_MCQ);
  if (!mcq || mcq.classList.contains(CLS_MCQ_LOCKED)) return;

  const selected = mcq.querySelector(`.${CLS_MCQ_SELECTED}`);
  if (!selected) return; // Nothing selected

  // Mark each option correct/incorrect
  $$(SEL_MCQ_OPTION, mcq).forEach(option => {
    const isCorrect = option.dataset.correct === 'true';
    toggleClass(option, CLS_MCQ_CORRECT,   isCorrect);
    toggleClass(option, CLS_MCQ_INCORRECT, !isCorrect && option.classList.contains(CLS_MCQ_SELECTED));
  });

  // Reveal explanation
  const explanation = mcq.querySelector(SEL_MCQ_EXPLANATION);
  if (explanation) {
    explanation.hidden = false;
    explanation.setAttribute('aria-live', 'polite');
  }

  // Check if correct
  const isCorrect = selected.dataset.correct === 'true';
  addClass(mcq, CLS_MCQ_REVEALED);
  toggleClass(mcq, 'zolto-mcq--correct',   isCorrect);
  toggleClass(mcq, 'zolto-mcq--incorrect', !isCorrect);
  addClass(mcq, CLS_MCQ_LOCKED);

  btn.disabled = true;
  const resetBtn = mcq.querySelector(SEL_MCQ_RESET);
  if (resetBtn) resetBtn.hidden = false;

  logger.debug('MCQ answer:', isCorrect ? 'correct' : 'incorrect');
}

function _onMCQReset(event, btn) {
  const mcq = closest(btn, SEL_MCQ);
  if (!mcq) return;

  // Clear all result classes
  $$(SEL_MCQ_OPTION, mcq).forEach(option => {
    removeClass(option, CLS_MCQ_SELECTED, CLS_MCQ_CORRECT, CLS_MCQ_INCORRECT);
    setAria(option, { checked: false });
  });

  removeClass(mcq, CLS_MCQ_REVEALED, CLS_MCQ_LOCKED, 'zolto-mcq--correct', 'zolto-mcq--incorrect');

  const explanation = mcq.querySelector(SEL_MCQ_EXPLANATION);
  if (explanation) explanation.hidden = true;

  const submitBtn = mcq.querySelector(SEL_MCQ_SUBMIT);
  if (submitBtn) submitBtn.disabled = false;

  btn.hidden = true;
}

// ─────────────────────────────────────────────────────────────
// 7. Flashcard
// ─────────────────────────────────────────────────────────────

function _onFlipClick(event, btn) {
  const flashcard = closest(btn, SEL_FLASHCARD);
  if (!flashcard) return;
  _flip(flashcard);
}

function _onFlashcardClick(event, flashcard) {
  // Only flip on direct click of the card surface (not buttons inside)
  if (event.target.closest('button, a, input')) return;
  _flip(flashcard);
}

function _onFlashcardKeydown(event, flashcard) {
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  _flip(flashcard);
}

function _flip(flashcard) {
  const isFlipped = flashcard.classList.contains(CLS_FLIPPED);
  toggleClass(flashcard, CLS_FLIPPED);
  setAria(flashcard, { label: isFlipped ? 'Card front. Press Space to flip.' : 'Card back. Press Space to flip.' });
}
