/**
 * Zolto Combined Test Suite — Phase 1 + 2 + 3
 *
 * Runs the Phase 2 suite (tests-p2.js — includes full Phase 1 regression)
 * together with the Phase 3 suite (tests-p3.js — native block directives).
 *
 * Export: runAllTests() → { results, passed, failed, total }
 */

import { runP2Tests } from './tests-p2.js';
import { runP3Tests } from './tests-p3.js';

export function runAllTests() {
  const p2 = runP2Tests();
  const p3 = runP3Tests();

  return {
    results: [...p2.results, ...p3.results],
    passed:  p2.passed + p3.passed,
    failed:  p2.failed + p3.failed,
    total:   p2.total  + p3.total,
  };
}
