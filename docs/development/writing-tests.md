# Writing Tests

## Test file locations

| What | Where |
| :--- | :---- |
| Fixture-based snapshot tests | `tests/fixtures.js` + `tests/tests.js` |
| Unit tests for src/ modules | `tests/tests.js` (dedicated suites) |
| Unit tests for js/ modules | `tests/unit/**/*.test.js` |
| Integration tests | `tests/integration/*.test.js` |
| e2e tests | `tests/e2e/*.spec.js` (Phase 4, Playwright) |

## Adding a fixture test

In `tests/fixtures.js`, add to the appropriate export array:

```javascript
export const calloutFixtures = [
  // ...
  {
    description: 'My new callout type',
    input: '> [!SUCCESS]\n> All done.',
    contains: ['zl-callout-success', 'All done.'],
    notContains: ['zl-callout-note'],
  },
];
```

The `fixturesSuite()` runner in `tests/tests.js` picks it up automatically.

## Adding a unit test

In `tests/tests.js`, inside the relevant suite function:

```javascript
function calloutSuite() {
  const suite = createSuite('Callouts');

  suite.test('Custom title is rendered', () => {
    contains(compile('> [!NOTE] My Title\n> Body'), 'My Title');
  });

  return suite;
}
```

Add the suite to `runAllTests()`:

```javascript
export function runAllTests() {
  const suites = [
    // ...
    calloutSuite(),
  ];
  return runSuites(suites);
}
```

## Assertions

```javascript
import { assert, eq, contains, notContains, deepEq } from './runner.js';

assert(condition, 'optional message');
eq(actual, expected);
contains(html, 'substring');
notContains(html, 'substring');
deepEq(obj1, obj2);
```

## Negative tests (notContains)

Be especially careful with `notContains` — the logic is inverted.
Always test by hand first:

```javascript
const html = compile(input);
console.log(html); // confirm the substring is absent
notContains(html, 'unwanted-string');
```

## Running a single suite manually

```javascript
import { validatorSuite } from './tests/tests.js';
const { results } = validatorSuite().run();
results.filter(r => !r.pass).forEach(r => console.log(r));
```
