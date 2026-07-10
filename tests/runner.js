/**
 * Zolto Test Runner — Phase 2
 *
 * A lightweight, zero-dependency test framework that runs in the browser.
 * No process.exit(), no Node APIs — results are returned as plain objects.
 *
 * Usage:
 *   import { createSuite, assert, eq, contains, notContains } from './runner.js';
 *
 *   const suite = createSuite('Headings');
 *   suite.test('renders H1', () => {
 *     eq(compile('# Hello'), '<h1 id="hello">Hello</h1>');
 *   });
 *
 *   const results = suite.run();
 *   // [{ suite, desc, pass, error? }, ...]
 */

// ─── Suite ────────────────────────────────────────────────────────────────────

/**
 * Create a named test suite.
 * @param {string} name
 */
export function createSuite(name) {
  const tests = [];

  return {
    name,

    /**
     * Register a test case.
     * @param {string}   desc  Human-readable description
     * @param {Function} fn    Test body — throws on failure
     */
    test(desc, fn) {
      tests.push({ desc, fn });
    },

    /**
     * Run all registered tests and return results.
     * @returns {TestResult[]}
     */
    run() {
      return tests.map(t => {
        try {
          t.fn();
          return { suite: name, desc: t.desc, pass: true, error: null };
        } catch (e) {
          return {
            suite: name,
            desc:  t.desc,
            pass:  false,
            error: e.message ?? String(e),
          };
        }
      });
    },
  };
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

/**
 * Assert a truthy condition.
 * @param {*}      cond
 * @param {string} [msg]
 */
export function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'Assertion failed');
}

/**
 * Assert strict equality.
 * @param {*}      actual
 * @param {*}      expected
 * @param {string} [msg]
 */
export function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(
      msg ?? `Expected:\n  ${JSON.stringify(expected)}\nGot:\n  ${JSON.stringify(actual)}`
    );
  }
}

/**
 * Assert that a string contains a substring.
 * @param {string} haystack
 * @param {string} needle
 * @param {string} [msg]
 */
export function contains(haystack, needle, msg) {
  if (!String(haystack).includes(needle)) {
    throw new Error(
      msg ?? `Expected output to contain:\n  ${JSON.stringify(needle)}\nGot:\n  ${JSON.stringify(haystack)}`
    );
  }
}

/**
 * Assert that a string does NOT contain a substring.
 * @param {string} haystack
 * @param {string} needle
 * @param {string} [msg]
 */
export function notContains(haystack, needle, msg) {
  if (String(haystack).includes(needle)) {
    throw new Error(
      msg ?? `Expected output NOT to contain:\n  ${JSON.stringify(needle)}`
    );
  }
}

/**
 * Assert that two values are deeply equal (JSON-comparison).
 * @param {*}      actual
 * @param {*}      expected
 * @param {string} [msg]
 */
export function deepEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(
      msg ?? `Deep equality failed.\nExpected: ${b}\nGot:      ${a}`
    );
  }
}

// ─── Runner (runs multiple suites) ───────────────────────────────────────────

/**
 * Run an array of suites and return a flat result list plus a summary.
 * @param {Suite[]} suites
 * @returns {{ results: TestResult[], passed: number, failed: number, total: number }}
 */
export function runSuites(suites) {
  const results = suites.flatMap(s => s.run());
  const passed  = results.filter(r => r.pass).length;
  const failed  = results.filter(r => !r.pass).length;
  return { results, passed, failed, total: results.length };
}
