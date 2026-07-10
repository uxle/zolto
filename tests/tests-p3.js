/**
 * Zolto Phase 3 Test Suite — Native Block Directives
 *
 * Covers: directive-lexer.js (attribute parsing, child extraction),
 *         directives.js (AST construction for all 14 types),
 *         directive-renderer.js (HTML output, CSS injection),
 *         validator.js (Phase 3 diagnostic checks),
 *         nesting, stress, and performance.
 *
 * Export: runP3Tests() → { results, passed, failed, total }
 */

import { compile, parse } from '../src/zolto.js';
import { createSuite, runSuites, assert, eq, contains, notContains, deepEq } from './runner.js';
import { parseAttrStr, extractChildren, KNOWN_DIRECTIVES } from '../src/directive-lexer.js';
import { hasP3Directives, PHASE3_CSS } from '../src/directive-renderer.js';

import {
  embedFixtures, collapseFixtures, tabsFixtures, cardFixtures,
  stepsFixtures, columnsFixtures, badgeFixtures, tagFixtures,
  alertFixtures, timelineFixtures, progressFixtures, avatarFixtures,
  iconFixtures, nestingFixtures, attributeFixtures,
} from './fixtures-p3.js';

// ─── Fixture runner helper ────────────────────────────────────────────────────

function fixturesSuite(name, fixtures) {
  const suite = createSuite(name);
  for (const fx of fixtures) {
    suite.test(fx.description, () => {
      const html = compile(fx.input);
      for (const s of (fx.contains ?? [])) {
        contains(html, s, `Should contain: ${JSON.stringify(s)}\nGot: ${html}`);
      }
      for (const s of (fx.notContains ?? [])) {
        notContains(html, s, `Should NOT contain: ${JSON.stringify(s)}\nGot: ${html}`);
      }
    });
  }
  return suite;
}

// ─── Directive lexer unit tests ────────────────────────────────────────────────

function directiveLexerSuite() {
  const suite = createSuite('Directive Lexer');

  suite.test('KNOWN_DIRECTIVES contains all 14 component types', () => {
    const expected = ['embed','collapse','tabs','tab','card','card-group','steps','step',
                       'columns','column','badge','tag','alert','timeline','event','progress','avatar','icon'];
    for (const d of expected) assert(KNOWN_DIRECTIVES.has(d), `Missing: ${d}`);
  });

  suite.test('parseAttrStr: empty string returns _first null', () => {
    const a = parseAttrStr('');
    eq(a._first, null);
  });

  suite.test('parseAttrStr: positional first arg', () => {
    const a = parseAttrStr('success');
    eq(a._first, 'success');
  });

  suite.test('parseAttrStr: key="quoted value"', () => {
    const a = parseAttrStr('title="Hello World"');
    eq(a.title, 'Hello World');
  });

  suite.test("parseAttrStr: key='single quoted'", () => {
    const a = parseAttrStr("title='Hello'");
    eq(a.title, 'Hello');
  });

  suite.test('parseAttrStr: unquoted numeric value becomes Number', () => {
    const a = parseAttrStr('value=42');
    eq(a.value, 42);
    eq(typeof a.value, 'number');
  });

  suite.test('parseAttrStr: unquoted true/false become Boolean', () => {
    const a = parseAttrStr('open=true dismissible=false');
    eq(a.open, true);
    eq(a.dismissible, false);
  });

  suite.test('parseAttrStr: bare flag word becomes true', () => {
    const a = parseAttrStr('title="X" pill outline');
    eq(a.pill, true);
    eq(a.outline, true);
  });

  suite.test('parseAttrStr: multiple mixed attributes', () => {
    const a = parseAttrStr('primary title="Card" icon=star cols=3');
    eq(a._first, 'primary');
    eq(a.title, 'Card');
    eq(a.icon, 'star');
    eq(a.cols, 3);
  });

  suite.test('parseAttrStr: escaped quote inside quoted value', () => {
    const a = parseAttrStr('title="She said \\"hi\\""');
    contains(a.title, 'hi');
  });

  suite.test('extractChildren: finds multiple tab blocks', () => {
    const body = '@tab label="A"\nBody A\n@/tab\n@tab label="B"\nBody B\n@/tab';
    const children = extractChildren(body, 'tab');
    eq(children.length, 2);
    eq(children[0].attrStr, 'label="A"');
    contains(children[0].body, 'Body A');
  });

  suite.test('extractChildren: returns empty array when no matches', () => {
    const children = extractChildren('no children here', 'tab');
    eq(children.length, 0);
  });

  suite.test('extractChildren: handles nested same-name directives via depth tracking', () => {
    const body = '@step title="Outer"\nOuter body\n@step title="Inner"\nShould not double-count\n@/step\n@/step';
    const children = extractChildren(body, 'step');
    // Top-level extraction should find exactly 1 (the outer), since depth
    // tracking treats the inner @step/@/step pair as nested content
    eq(children.length, 1);
  });

  return suite;
}

// ─── Directives → AST unit tests ───────────────────────────────────────────────

function directivesToAstSuite() {
  const suite = createSuite('Directives → AST');

  suite.test('embed node has correct type and embedType', () => {
    const { ast } = parse('@embed image src="x.png"\n@/embed');
    const n = ast.children.find(n => n.type === 'embed');
    eq(n?.embedType, 'image');
    eq(n?.src, 'x.png');
  });

  suite.test('collapse node stores title and open state', () => {
    const { ast } = parse('@collapse title="Test" open=true\nBody\n@/collapse');
    const n = ast.children.find(n => n.type === 'collapse');
    eq(n?.title, 'Test');
    eq(n?.open, true);
  });

  suite.test('tabs node contains tab array', () => {
    const { ast } = parse('@tabs\n@tab label="A"\nX\n@/tab\n@tab label="B"\nY\n@/tab\n@/tabs');
    const n = ast.children.find(n => n.type === 'tabs');
    eq(n?.tabs?.length, 2);
    eq(n?.tabs[0].label, 'A');
    eq(n?.tabs[1].label, 'B');
  });

  suite.test('card node captures all attributes', () => {
    const { ast } = parse('@card primary title="X" icon=star href="/y"\n@/card');
    const n = ast.children.find(n => n.type === 'card');
    eq(n?.variant, 'primary');
    eq(n?.title, 'X');
    eq(n?.icon, 'star');
    eq(n?.href, '/y');
  });

  suite.test('card-group node has correct cols and children', () => {
    const { ast } = parse('@card-group cols=4\n@card title="A"\n@/card\n@/card-group');
    const n = ast.children.find(n => n.type === 'card_group');
    eq(n?.cols, 4);
    eq(n?.children?.length, 1);
  });

  suite.test('steps node contains step array with titles', () => {
    const { ast } = parse('@steps\n@step title="First"\nA\n@/step\n@step title="Second"\nB\n@/step\n@/steps');
    const n = ast.children.find(n => n.type === 'steps');
    eq(n?.children?.length, 2);
    eq(n?.children[0].title, 'First');
  });

  suite.test('columns node with width on individual columns', () => {
    const { ast } = parse('@columns\n@column width=40%\nA\n@/column\n@/columns');
    const n = ast.children.find(n => n.type === 'columns');
    eq(n?.children[0].width, '40%');
  });

  suite.test('badge node captures variant, pill, outline flags', () => {
    const { ast } = parse('@badge success pill outline\nText\n@/badge');
    const n = ast.children.find(n => n.type === 'badge');
    eq(n?.variant, 'success');
    eq(n?.pill, true);
    eq(n?.outline, true);
    eq(n?.value, 'Text');
  });

  suite.test('tag node captures color and href', () => {
    const { ast } = parse('@tag color=red href="/x"\nLabel\n@/tag');
    const n = ast.children.find(n => n.type === 'tag');
    eq(n?.color, 'red');
    eq(n?.href, '/x');
  });

  suite.test('alert node defaults to info type', () => {
    const { ast } = parse('@alert\nBody\n@/alert');
    const n = ast.children.find(n => n.type === 'alert');
    eq(n?.alertType, 'info');
  });

  suite.test('alert node dismissible flag', () => {
    const { ast } = parse('@alert warning dismissible\nBody\n@/alert');
    const n = ast.children.find(n => n.type === 'alert');
    eq(n?.dismissible, true);
  });

  suite.test('timeline node contains event array', () => {
    const { ast } = parse('@timeline\n@event title="X" date="2025"\nBody\n@/event\n@/timeline');
    const n = ast.children.find(n => n.type === 'timeline');
    eq(n?.children?.length, 1);
    eq(n?.children[0].title, 'X');
    eq(n?.children[0].date, '2025');
  });

  suite.test('progress node parses numeric value and max', () => {
    const { ast } = parse('@progress value=30 max=50\n@/progress');
    const n = ast.children.find(n => n.type === 'progress');
    eq(n?.value, 30);
    eq(n?.max, 50);
  });

  suite.test('avatar node captures size and status', () => {
    const { ast } = parse('@avatar initials=XY size=lg status=busy\n@/avatar');
    const n = ast.children.find(n => n.type === 'avatar');
    eq(n?.initials, 'XY');
    eq(n?.size, 'lg');
    eq(n?.status, 'busy');
  });

  suite.test('icon node captures name from positional arg', () => {
    const { ast } = parse('@icon home size=24\n@/icon');
    const n = ast.children.find(n => n.type === 'icon');
    eq(n?.name, 'home');
    eq(n?.size, 24);
  });

  suite.test('directive body markdown is recursively parsed', () => {
    const { ast } = parse('@alert info\n**Bold** text.\n@/alert');
    const n = ast.children.find(n => n.type === 'alert');
    const para = n?.children?.[0];
    assert(para?.type === 'paragraph');
    assert(para?.children?.some(c => c.type === 'bold'));
  });

  return suite;
}

// ─── Renderer / CSS injection unit tests ──────────────────────────────────────

function directiveRendererSuite() {
  const suite = createSuite('Directive Renderer');

  suite.test('hasP3Directives detects top-level directive', () => {
    const { ast } = parse('@badge info\nX\n@/badge');
    eq(hasP3Directives(ast.children), true);
  });

  suite.test('hasP3Directives returns false for plain markdown', () => {
    const { ast } = parse('# Just a heading\n\nA paragraph.');
    eq(hasP3Directives(ast.children), false);
  });

  suite.test('hasP3Directives detects directive nested inside another', () => {
    const { ast } = parse('@collapse title="X"\n@badge info\nY\n@/badge\n@/collapse');
    eq(hasP3Directives(ast.children), true);
  });

  suite.test('CSS is injected exactly once even with multiple directives', () => {
    const html = compile('@badge info\nA\n@/badge\n\n@tag\nB\n@/tag\n\n@alert warning\nC\n@/alert');
    const matches = html.match(/zl-p3-styles/g) ?? [];
    eq(matches.length, 1);
  });

  suite.test('PHASE3_CSS contains rules for every component class', () => {
    const classes = ['zl-embed', 'zl-collapse', 'zl-tabs', 'zl-card', 'zl-steps',
                      'zl-columns', 'zl-badge', 'zl-tag', 'zl-alert', 'zl-timeline',
                      'zl-progress', 'zl-avatar', 'zl-icon'];
    for (const c of classes) contains(PHASE3_CSS, c, `PHASE3_CSS missing rules for ${c}`);
  });

  suite.test('CSS not injected for pure Phase 1/2 documents', () => {
    const html = compile('# Title\n\n> [!NOTE]\n> A callout.\n\n**Bold** text.');
    notContains(html, 'zl-p3-styles');
  });

  return suite;
}

// ─── Validator unit tests (Phase 3 diagnostics) ───────────────────────────────

function validatorSuite() {
  const suite = createSuite('Phase 3 Validator');

  suite.test('embed without src produces a warning', () => {
    const { warnings } = parse('@embed image\n@/embed');
    assert(warnings.some(w => w.includes('src')));
  });

  suite.test('embed with src has no warning', () => {
    const { warnings } = parse('@embed image src="x.png"\n@/embed');
    assert(!warnings.some(w => w.toLowerCase().includes('missing src')));
  });

  suite.test('progress value out of range warns', () => {
    const { warnings } = parse('@progress value=150 max=100\n@/progress');
    assert(warnings.some(w => w.includes('out of range')));
  });

  suite.test('progress value in range has no warning', () => {
    const { warnings } = parse('@progress value=50 max=100\n@/progress');
    assert(!warnings.some(w => w.includes('out of range')));
  });

  suite.test('empty tabs directive warns', () => {
    const { warnings } = parse('@tabs\n@/tabs');
    assert(warnings.some(w => w.includes('tab')));
  });

  suite.test('empty steps directive warns', () => {
    const { warnings } = parse('@steps\n@/steps');
    assert(warnings.some(w => w.includes('step')));
  });

  suite.test('empty timeline directive warns', () => {
    const { warnings } = parse('@timeline\n@/timeline');
    assert(warnings.some(w => w.includes('event')));
  });

  suite.test('well-formed directive tree has zero Phase 3 warnings', () => {
    const src = '@tabs\n@tab label="A"\nContent.\n@/tab\n@/tabs';
    const { warnings } = parse(src);
    eq(warnings.length, 0);
  });

  return suite;
}

// ─── Integration / cross-cutting tests ────────────────────────────────────────

function integrationSuite() {
  const suite = createSuite('Phase 3 Integration');

  suite.test('Full document mixing Phase 1, 2, and 3 features compiles cleanly', () => {
    const src = [
      '# Product Launch {#launch}', '',
      '> [!NOTE]', '> This page combines every phase of Zolto.', '',
      '[info]', 'Native admonitions still work.', '[/info]', '',
      '@alert success title="Shipped"', 'Version 3.0.0 is live.', '@/alert', '',
      '@card-group cols=3',
      '@card title="Fast" icon=bolt', 'Blazing speed.', '@/card',
      '@card title="Safe" icon=shield', 'Zero XSS.', '@/card',
      '@card title="Free" icon=favorite', 'MIT licensed.', '@/card',
      '@/card-group', '',
      '@steps',
      '@step title="Install"', '```bash', 'npm install zolto', '```', '@/step',
      '@step title="Compile"', 'Call `compile(src)`.', '@/step',
      '@/steps', '',
      'Footnote reference[^1].', '', '[^1]: Phase 3 ships 14 new directives.',
    ].join('\n');

    const { errors } = parse(src);
    eq(errors.length, 0);

    const html = compile(src);
    contains(html, 'id="launch"');
    contains(html, 'zl-callout-note');
    contains(html, 'zl-admonition-info');
    contains(html, 'zl-alert-success');
    contains(html, 'zl-card-group');
    contains(html, 'zl-cg-3');
    contains(html, 'zl-steps');
    contains(html, 'language-bash');
    contains(html, 'zl-footnotes');
  });

  suite.test('Directives do not interfere with reference link resolution', () => {
    const src = '@card title="Link"\nSee [docs][d].\n@/card\n\n[d]: https://zolto.dev';
    const html = compile(src);
    contains(html, 'href="https://zolto.dev"');
  });

  suite.test('Directives do not interfere with footnotes', () => {
    const src = '@alert info\nSee note[^1].\n@/alert\n\n[^1]: A footnote inside context.';
    const html = compile(src);
    contains(html, 'zl-fn-ref');
    contains(html, 'zl-footnotes');
  });

  suite.test('Unknown directive name is not lexed as a directive', () => {
    const { ast } = parse('@notreal\ntext\n@/notreal');
    assert(!ast.children.some(n => n.type === 'notreal'));
  });

  return suite;
}

// ─── Stress / performance tests ────────────────────────────────────────────────

function stressSuite() {
  const suite = createSuite('Phase 3 Stress');

  suite.test('50 badges in one document render without error', () => {
    const src = Array.from({ length: 50 }, (_, i) => `@badge info\nBadge ${i}\n@/badge`).join('\n\n');
    const html = compile(src);
    contains(html, 'Badge 49');
    eq((html.match(/zl-badge/g) ?? []).length > 50, true);
  });

  suite.test('Deeply nested directives (5 levels) do not hang', () => {
    const src = '@collapse title="L1"\n@collapse title="L2"\n@collapse title="L3"\n@collapse title="L4"\n@collapse title="L5"\nDeep content.\n@/collapse\n@/collapse\n@/collapse\n@/collapse\n@/collapse';
    const html = compile(src);
    contains(html, 'Deep content.');
    eq((html.match(/zl-collapse/g) ?? []).length >= 5, true);
  });

  suite.test('Large card-group (30 cards) renders all cards', () => {
    const cards = Array.from({ length: 30 }, (_, i) => `@card title="Card ${i}"\nBody ${i}.\n@/card`).join('\n');
    const html = compile(`@card-group cols=4\n${cards}\n@/card-group`);
    contains(html, 'Card 29');
    contains(html, 'Body 29.');
  });

  suite.test('1000-line document with mixed directives compiles under 2s', () => {
    const blocks = [];
    for (let i = 0; i < 100; i++) {
      blocks.push(`@alert info\nAlert number ${i}.\n@/alert`);
      blocks.push(`Paragraph ${i} with **bold** text.`);
    }
    const src = blocks.join('\n\n');
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const html = compile(src);
    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    assert(html.length > 0);
    assert(t1 - t0 < 2000, `Expected < 2000ms, took ${(t1 - t0).toFixed(1)}ms`);
  });

  return suite;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function runP3Tests() {
  const suites = [
    fixturesSuite('Embed',          embedFixtures),
    fixturesSuite('Collapse',       collapseFixtures),
    fixturesSuite('Tabs',           tabsFixtures),
    fixturesSuite('Cards',          cardFixtures),
    fixturesSuite('Steps',          stepsFixtures),
    fixturesSuite('Columns',        columnsFixtures),
    fixturesSuite('Badge',          badgeFixtures),
    fixturesSuite('Tag',            tagFixtures),
    fixturesSuite('Alert',          alertFixtures),
    fixturesSuite('Timeline',       timelineFixtures),
    fixturesSuite('Progress',       progressFixtures),
    fixturesSuite('Avatar',         avatarFixtures),
    fixturesSuite('Icon',           iconFixtures),
    fixturesSuite('Nesting',        nestingFixtures),
    fixturesSuite('Attribute Parsing', attributeFixtures),
    directiveLexerSuite(),
    directivesToAstSuite(),
    directiveRendererSuite(),
    validatorSuite(),
    integrationSuite(),
    stressSuite(),
  ];

  return runSuites(suites);
}
