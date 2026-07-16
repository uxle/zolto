/**
 * Zolto Combined Test Suite — Phase 1 + 2 + 3 + 4
 *
 * Runs the Phase 2 suite (tests-p2.js — includes full Phase 1 regression),
 * the Phase 3 suite (tests-p3.js — native block directives), and the
 * Phase 4 suite (tests-p4.js — native mathematics engine) together.
 *
 * Export: runAllTests() → { results, passed, failed, total }
 */

import { runP2Tests } from './tests-p2.js';
import { runP3Tests } from './tests-p3.js';
import { runP4Tests } from './tests-p4.js';

export function runAllTests() {
  const p2 = runP2Tests();
  const p3 = runP3Tests();
  const p4 = runP4Tests();

  return {
    results: [...p2.results, ...p3.results, ...p4.results],
    passed:  p2.passed + p3.passed + p4.passed,
    failed:  p2.failed + p3.failed + p4.failed,
    total:   p2.total  + p3.total  + p4.total,
  };
}
