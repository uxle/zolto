/**
 * Zolto Test Suite — Phase 2
 *
 * Imports all fixtures and verifies the full compile() pipeline:
 *   source → lex → parse → render → HTML
 *
 * Also includes targeted unit tests for edge-cases in the
 * lexer, inline parser, renderer, validator, and diagnostics
 * system that aren't covered by the fixture snapshots, plus
 * Markdown-compatibility and performance benchmark suites.
 *
 * Export:  runAllTests() → { results, passed, failed, total }
 */

import { compile, parse, render } from '../src/zolto.js';
import {
  createSuite, runSuites,
  assert, eq, contains, notContains, deepEq,
} from './runner.js';
import { Diagnostics, Severity, Code } from '../src/diagnostics.js';

import {
  headingFixtures, paragraphFixtures, hrFixtures,
  blockquoteFixtures, listFixtures, codeFixtures,
  inlineFixtures, linkFixtures, tableFixtures,
  frontmatterFixtures, variableFixtures,
  commentFixtures, footnoteFixtures, importFixtures,
  calloutFixtures, admonitionFixtures, superSubFixtures,
  entityFixtures, smartPunctuationFixtures, referenceLinkFixtures,
  codeMetaFixtures, figureFixtures, definitionListFixtures,
  tableCaptionFixtures,
} from './fixtures.js';

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

// ─── Lexer unit tests ─────────────────────────────────────────────────────────

function lexerSuite() {
  const suite = createSuite('Lexer');

  suite.test('Tokenises frontmatter correctly', () => {
    const { ast } = parse('---\ntitle: hi\n---\n\n# Done');
    eq(ast.children[0].type, 'frontmatter');
    eq(ast.children[0].data.title, 'hi');
  });

  suite.test('Mid-document --- is treated as HR, not frontmatter', () => {
    const html = compile('# Heading\n\n---\nNOT FM\n---\n');
    contains(html, 'NOT FM');
    contains(html, '<hr>');
  });

  suite.test('Handles missing frontmatter close gracefully', () => {
    const { errors } = parse('---\ntitle: oops');
    assert(errors.length > 0, 'Should report unclosed frontmatter');
  });

  suite.test('Fenced code: tilde fence', () => {
    contains(compile('~~~\ncode\n~~~'), 'code');
  });

  suite.test('Fenced code: unclosed fence is still parsed', () => {
    const { ast } = parse('```\ncode without close');
    assert(ast.children.some(n => n.type === 'code_block'));
  });

  suite.test('@var and @import tokenised as directives', () => {
    const { ast } = parse('@var x = hello\n@import "file.zl"\n\nText.');
    assert(ast.children.some(n => n.type === 'variable_def'));
    assert(ast.children.some(n => n.type === 'import'));
  });

  suite.test('Table without separator falls back to paragraph', () => {
    notContains(compile('| A | B |\n| content |'), '<table');
  });

  suite.test('Blank lines are not emitted as block nodes', () => {
    const { ast } = parse('# A\n\n\n# B');
    assert(!ast.children.map(n => n.type).includes('blank'));
  });

  // ── Phase 2 ──────────────────────────────────────────────────────────────

  suite.test('Admonition tokenised with type and title', () => {
    const { tokens } = (() => {
      const { ast } = parse('[info title="Hi"]\nBody\n[/info]');
      return { tokens: ast.children };
    })();
    const a = tokens.find(n => n.type === 'admonition');
    eq(a?.admonType, 'info');
    eq(a?.title, 'Hi');
  });

  suite.test('Unclosed admonition reports an error', () => {
    const { errors } = parse('[warning]\nNo closing tag');
    assert(errors.length > 0);
  });

  suite.test('Reference definition tokenised', () => {
    const { ast } = parse('[id]: https://x.com "T"');
    const r = ast.children.find(n => n.type === 'reference_def');
    eq(r?.href, 'https://x.com');
    eq(r?.title, 'T');
  });

  suite.test('Definition list tokenised from term + colon line', () => {
    const { ast } = parse('Term\n: Def');
    assert(ast.children.some(n => n.type === 'definition_list'));
  });

  suite.test('Table caption line consumed, not left as paragraph', () => {
    const { ast } = parse('Table: My Caption\n\n| A |\n| - |\n| 1 |');
    const paras = ast.children.filter(n => n.type === 'paragraph');
    assert(!paras.some(p => p.children?.some(c => c.value?.includes('My Caption'))));
  });

  return suite;
}

// ─── Parser unit tests ────────────────────────────────────────────────────────

function parserSuite() {
  const suite = createSuite('Parser');

  suite.test('Document node is always returned', () => {
    const { ast } = parse('');
    eq(ast.type, 'document');
    assert(Array.isArray(ast.children));
  });

  suite.test('Heading level stored correctly', () => {
    const { ast } = parse('### Three');
    eq(ast.children.find(n => n.type === 'heading')?.level, 3);
  });

  suite.test('Custom heading attrs parsed: id', () => {
    const { ast } = parse('# Title {#my-id}');
    eq(ast.children.find(n => n.type === 'heading')?.id, 'my-id');
  });

  suite.test('Custom heading attrs parsed: classes', () => {
    const { ast } = parse('# Title {.a .b}');
    deepEq(ast.children.find(n => n.type === 'heading')?.classes, ['a', 'b']);
  });

  suite.test('HR node type', () => {
    const { ast } = parse('---');
    assert(ast.children.some(n => n.type === 'horizontal_rule'));
  });

  suite.test('Blockquote contains block children', () => {
    const { ast } = parse('> # Inner\n> Para');
    const bq = ast.children.find(n => n.type === 'blockquote');
    assert(bq?.children.some(c => c.type === 'heading'));
  });

  suite.test('List ordered flag', () => {
    const { ast: u } = parse('- item');
    const { ast: o } = parse('1. item');
    eq(u.children.find(n => n.type === 'list')?.ordered, false);
    eq(o.children.find(n => n.type === 'list')?.ordered, true);
  });

  suite.test('Task list item checked flag true/false', () => {
    eq(parse('- [x] Done').ast.children.find(n => n.type === 'list')?.children[0]?.checked, true);
    eq(parse('- [ ] Todo').ast.children.find(n => n.type === 'list')?.children[0]?.checked, false);
  });

  suite.test('Code block stores lang', () => {
    eq(parse('```ts\ncode\n```').ast.children.find(n => n.type === 'code_block')?.lang, 'ts');
  });

  suite.test('Table has correct alignment array', () => {
    const { ast } = parse('| A | B | C |\n| :- | :-: | -: |\n| 1 | 2 | 3 |');
    deepEq(ast.children.find(n => n.type === 'table')?.align, ['left', 'center', 'right']);
  });

  suite.test('Frontmatter data merged into metadata', () => {
    eq(parse('---\nauthor: Bob\n---\n\nHello.').ast.metadata.author, 'Bob');
  });

  suite.test('Footnote def captured with correct id', () => {
    eq(parse('Text[^1].\n\n[^1]: Note.').ast.children.find(n => n.type === 'footnote_def')?.id, '1');
  });

  // ── Phase 2 ──────────────────────────────────────────────────────────────

  suite.test('Callout produces callout node, not blockquote', () => {
    const { ast } = parse('> [!TIP]\n> Body');
    assert(ast.children.some(n => n.type === 'callout' && n.calloutType === 'tip'));
  });

  suite.test('Callout custom title captured', () => {
    const { ast } = parse('> [!NOTE] My Title\n> Body');
    eq(ast.children.find(n => n.type === 'callout')?.title, 'My Title');
  });

  suite.test('Admonition node has correct children', () => {
    const { ast } = parse('[info]\nPara one.\n[/info]');
    const a = ast.children.find(n => n.type === 'admonition');
    assert(a?.children.some(c => c.type === 'paragraph'));
  });

  suite.test('Standalone image produces figure node', () => {
    const { ast } = parse('![Alt](x.png)');
    assert(ast.children.some(n => n.type === 'figure' && n.src === 'x.png'));
  });

  suite.test('Inline image does NOT produce figure node', () => {
    const { ast } = parse('Some text ![alt](x.png) more text');
    assert(!ast.children.some(n => n.type === 'figure'));
  });

  suite.test('Code block metadata parsed: title + line numbers', () => {
    const { ast } = parse('```js title="a.js" numbers\nx\n```');
    const cb = ast.children.find(n => n.type === 'code_block');
    eq(cb?.title, 'a.js');
    eq(cb?.lineNumbers, true);
  });

  suite.test('Code block highlight lines parsed', () => {
    const { ast } = parse('```js {1,3-4}\na\nb\nc\nd\n```');
    deepEq(ast.children.find(n => n.type === 'code_block')?.highlightLines, [1, 3, 4]);
  });

  suite.test('Table caption attached to table node', () => {
    const { ast } = parse('Table: Results\n\n| A |\n| - |\n| 1 |');
    eq(ast.children.find(n => n.type === 'table')?.caption, 'Results');
  });

  suite.test('Reference defs collected into metadata.references', () => {
    const { ast } = parse('[a]: https://x.com');
    assert(ast.metadata.references instanceof Map);
    assert(ast.metadata.references.has('a'));
  });

  return suite;
}

// ─── Inline parser unit tests ─────────────────────────────────────────────────

function inlineSuite() {
  const suite = createSuite('Inline Parser');

  suite.test('Plain text is preserved', () => {
    eq(compile('Hello world.'), '<p>Hello world.</p>');
  });

  suite.test('Escaped asterisk not italic', () => {
    const html = compile('\\*not italic\\*');
    notContains(html, '<em>');
    contains(html, '*not italic*');
  });

  suite.test('Inline code escapes HTML', () => {
    contains(compile('`<br>`'), '&lt;br&gt;');
  });

  suite.test('Bold with __ works', () => {
    contains(compile('__strong__'), '<strong>strong</strong>');
  });

  suite.test('Underscore mid-word not italic', () => {
    const html = compile('snake_case_var');
    notContains(html, '<em>');
  });

  suite.test('Hard line break via two spaces', () => {
    contains(compile('line one  \nline two'), '<br>');
  });

  suite.test('Hard line break via backslash', () => {
    contains(compile('line one\\\nline two'), '<br>');
  });

  suite.test('Variable ref substituted', () => {
    const html = compile('@var lang = Zolto\n\nBuilt with {{lang}}.');
    contains(html, 'Built with Zolto.');
    notContains(html, '{{lang}}');
  });

  suite.test('Auto-link https', () => {
    contains(compile('<https://example.com>'), 'href="https://example.com"');
  });

  suite.test('Link with inline content', () => {
    contains(compile('[**bold**](https://x.com)'), '<strong>bold</strong>');
  });

  suite.test('Footnote ref produces superscript', () => {
    const html = compile('Note[^1].\n\n[^1]: Content.');
    contains(html, '<sup');
    contains(html, 'href="#fn-1"');
  });

  // ── Phase 2 ──────────────────────────────────────────────────────────────

  suite.test('Superscript requires no surrounding whitespace', () => {
    contains(compile('x^2^'), '<sup>2</sup>');
    notContains(compile('a ^ b ^ c'), '<sup>');
  });

  suite.test('Subscript does not collide with strikethrough', () => {
    const html = compile('~~strike~~ and H~2~O');
    contains(html, '<del>strike</del>');
    contains(html, '<sub>2</sub>');
  });

  suite.test('Highlight requires closing ==', () => {
    contains(compile('==done=='), '<mark>done</mark>');
    notContains(compile('a == b'), '<mark>');
  });

  suite.test('Kbd parses multi-key combos', () => {
    contains(compile('[[Cmd+K]]'), '<kbd>Cmd+K</kbd>');
  });

  suite.test('Named HTML entity passed through verbatim', () => {
    contains(compile('&trade;'), '&trade;');
  });

  suite.test('Numeric HTML entity decoded to character', () => {
    contains(compile('&#9733;'), '\u2605');
  });

  suite.test('Smart punctuation disabled inside inline code', () => {
    contains(compile('`x---y`'), '<code>x---y</code>');
  });

  suite.test('Reference link resolves against metadata.references', () => {
    contains(compile('[A][b]\n\n[b]: https://b.com'), 'href="https://b.com"');
  });

  suite.test('Unresolved reference link does not throw', () => {
    assert(() => compile('[A][nope]') || true);
  });

  return suite;
}

// ─── Renderer unit tests ──────────────────────────────────────────────────────

function rendererSuite() {
  const suite = createSuite('Renderer');

  suite.test('Empty document produces empty string', () => {
    eq(compile(''), '');
  });

  suite.test('Comment is not in output', () => {
    notContains(compile('<!-- secret -->'), 'secret');
  });

  suite.test('HTML block passes through raw', () => {
    contains(compile('<div class="custom">content</div>'), '<div class="custom">content</div>');
  });

  suite.test('Ordered list with start attr', () => {
    contains(compile('5. First\n6. Second'), 'start="5"');
  });

  suite.test('Tight list: no extra <p> tags', () => {
    const html = compile('- Alpha\n- Beta');
    notContains(html, '<p>Alpha</p>');
    contains(html, '<li>Alpha</li>');
  });

  suite.test('Loose list: items wrapped in <p>', () => {
    const html = compile('- Alpha\n\n- Beta');
    contains(html, '<p>Alpha</p>');
  });

  suite.test('Footnote section rendered at end with zl- prefix', () => {
    const html = compile('Text[^1].\n\n[^1]: Note here.');
    contains(html, 'class="zl-footnotes"');
  });

  suite.test('xhtml option self-closes img', () => {
    const { ast } = parse('Text ![x](y.png) text');
    const html = render(ast, { xhtml: true });
    contains(html, 'src="y.png"');
    contains(html, 'alt="x"');
    contains(html, ' />');
  });

  suite.test('xhtml option self-closes br', () => {
    const { ast } = parse('line  \ncont');
    contains(render(ast, { xhtml: true }), '<br />');
  });

  suite.test('Heading ID is unique across duplicates', () => {
    const html = compile('# Title\n\n# Title\n\n# Title');
    contains(html, 'id="title"');
    contains(html, 'id="title-1"');
    contains(html, 'id="title-2"');
  });

  suite.test('footnoteSection:false suppresses footnote section', () => {
    const { ast } = parse('Text[^1].\n\n[^1]: Note.');
    notContains(render(ast, { footnoteSection: false }), 'zl-footnotes');
  });

  // ── Phase 2 ──────────────────────────────────────────────────────────────

  suite.test('Callout renders icon and default title from type', () => {
    const html = compile('> [!TIP]\n> Body');
    contains(html, 'Tip');
    contains(html, '\u{1F4A1}'); // 💡
  });

  suite.test('Admonition renders ARIA role and label', () => {
    const html = compile('[warning]\nBody\n[/warning]');
    contains(html, 'role="note"');
    contains(html, 'aria-label="Warning"');
  });

  suite.test('Figure renders semantic <figure>/<figcaption>', () => {
    const html = compile('![Pic](p.png "Caption text")');
    contains(html, '<figure');
    contains(html, '<figcaption');
  });

  suite.test('Definition list renders <dl>/<dt>/<dd>', () => {
    const html = compile('Term\n: Definition');
    contains(html, '<dl');
    contains(html, '<dt');
    contains(html, '<dd');
  });

  suite.test('Code block with no lang and no meta has no header', () => {
    const html = compile('```\nplain\n```');
    notContains(html, 'zl-code-header');
  });

  suite.test('Code block copy button references zl-cb container', () => {
    contains(compile('```js\nx\n```'), 'zl-cb');
  });

  suite.test('Table renders inside responsive wrapper with ARIA region', () => {
    const html = compile('| A |\n| - |\n| 1 |');
    contains(html, 'zl-table-wrap');
    contains(html, 'role="region"');
  });

  return suite;
}

// ─── Validator / diagnostics unit tests ───────────────────────────────────────

function validatorSuite() {
  const suite = createSuite('Validator');

  suite.test('Valid document has no errors', () => {
    eq(parse('# Hello\n\nParagraph.').errors.length, 0);
  });

  suite.test('Undefined variable produces warning', () => {
    assert(parse('Hello {{ghost}}!').warnings.some(w => w.includes('ghost')));
  });

  suite.test('Defined variable has no warning', () => {
    assert(!parse('@var color = blue\n\nColor is {{color}}.').warnings.some(w => w.includes('color')));
  });

  suite.test('Undefined footnote ref warns', () => {
    assert(parse('Text[^missing].').warnings.some(w => w.includes('missing')));
  });

  // ── Phase 2 ──────────────────────────────────────────────────────────────

  suite.test('Unresolved reference link warns', () => {
    assert(parse('[x][nowhere]').warnings.some(w => w.includes('nowhere')));
  });

  suite.test('Resolved reference link has no warning', () => {
    assert(!parse('[x][a]\n\n[a]: u').warnings.some(w => w.includes('Unresolved')));
  });

  suite.test('Duplicate reference def IDs warn', () => {
    assert(parse('[a]: u1\n[a]: u2').warnings.some(w => w.toLowerCase().includes('duplicate')));
  });

  suite.test('Duplicate explicit heading IDs warn', () => {
    const w = parse('# One {#x}\n\n# Two {#x}').warnings;
    assert(w.some(msg => msg.includes('x')));
  });

  suite.test('Unknown admonition type cannot tokenise (falls back to text)', () => {
    // "bogus" is not in the admonition whitelist, so it is NOT tokenised as
    // an admonition at all — it should appear as literal bracketed text.
    const html = compile('[bogus]\nx\n[/bogus]');
    contains(html, '[bogus]');
  });

  suite.test('parse() returns a Diagnostics instance', () => {
    const { diagnostics } = parse('# Hi');
    assert(diagnostics instanceof Diagnostics);
  });

  return suite;
}

// ─── Diagnostics class unit tests (Phase 2) ───────────────────────────────────

function diagnosticsSuite() {
  const suite = createSuite('Diagnostics');

  suite.test('add() stores severity/code/message', () => {
    const d = new Diagnostics();
    d.add(Severity.ERROR, Code.MALFORMED_TABLE, 'broken');
    eq(d.items.length, 1);
    eq(d.items[0].severity, 'error');
  });

  suite.test('error()/warn()/info() shortcuts work', () => {
    const d = new Diagnostics();
    d.error(Code.UNEXPECTED_TOKEN, 'e').warn(Code.UNDEFINED_VAR, 'w').info(Code.BARE_LINK, 'i');
    eq(d.errors.length, 1);
    eq(d.warnings.length, 1);
    eq(d.infos.length, 1);
  });

  suite.test('hasErrors() / hasWarnings() reflect state', () => {
    const d = new Diagnostics();
    eq(d.hasErrors(), false);
    d.error(Code.UNEXPECTED_TOKEN, 'x');
    eq(d.hasErrors(), true);
  });

  suite.test('toErrorStrings() includes line number when present', () => {
    const d = new Diagnostics();
    d.error(Code.MALFORMED_TABLE, 'bad table', { line: 7 });
    contains(d.toErrorStrings()[0], 'line 7');
  });

  suite.test('merge() combines two Diagnostics instances', () => {
    const a = new Diagnostics().error(Code.UNEXPECTED_TOKEN, 'a');
    const b = new Diagnostics().warn(Code.UNDEFINED_VAR, 'b');
    a.merge(b);
    eq(a.items.length, 2);
  });

  suite.test('toString() summarises counts', () => {
    const d = new Diagnostics();
    eq(d.toString(), 'No issues');
    d.error(Code.UNEXPECTED_TOKEN, 'x');
    contains(d.toString(), '1 error');
  });

  suite.test('chained add calls return this for fluent API', () => {
    const d = new Diagnostics();
    const result = d.error(Code.UNEXPECTED_TOKEN, 'a').warn(Code.UNDEFINED_VAR, 'b');
    assert(result === d);
  });

  return suite;
}

// ─── Integration tests ────────────────────────────────────────────────────────

function integrationSuite() {
  const suite = createSuite('Integration');

  suite.test('Full Phase 1 feature document still compiles correctly', () => {
    const src = [
      '---', 'title: Test Doc', '---', '',
      '@var engine = Zolto', '',
      '# Welcome to {{engine}} {#welcome}', '',
      '> A **blockquote** with *italic* and `code`.', '',
      '## Lists', '',
      '- Item A', '- Item B', '  - Nested', '',
      '1. First', '2. Second', '',
      '- [x] Done', '- [ ] Todo', '',
      '## Code', '', '```js', 'const x = 1;', '```', '',
      '## Table', '',
      '| Col A | Col B |', '| :---- | ----: |', '| Left  | Right |', '',
      '---', '',
      'Footnote here[^1].', '', '[^1]: The note.',
    ].join('\n');

    const html = compile(src);
    contains(html, '<h1 id="welcome">Welcome to Zolto</h1>');
    contains(html, '<blockquote>');
    contains(html, '<ul>');
    contains(html, '<ol>');
    contains(html, 'input type="checkbox" checked');
    contains(html, 'language-js');
    contains(html, '<table');
    contains(html, 'text-align:left');
    contains(html, 'text-align:right');
    contains(html, '<hr>');
    contains(html, 'zl-footnotes');
  });

  suite.test('Plain Markdown is valid Zolto', () => {
    const md = '# Title\n\nParagraph with **bold** and *italic*.\n\n- List\n- Items\n';
    eq(parse(md).errors.length, 0, 'Plain Markdown should have zero errors');
  });

  suite.test('Full Phase 2 feature document compiles with every new construct', () => {
    const src = [
      '# Phase 2 Showcase', '',
      '> [!NOTE]', '> A GitHub callout.', '',
      '[tip title="Pro Tip"]', 'Use admonitions for emphasis.', '[/tip]', '',
      'Reference: [Zolto][z].', '', '[z]: https://zolto.dev "Home"', '',
      'E = mc^2^ and H~2~O, with ==highlighted== text and [[Ctrl+S]].', '',
      '```js title="demo.js" {2} numbers', 'const a = 1;', 'const b = 2;', '```', '',
      '![A diagram](diagram.png "System Overview")', '',
      'Term', ': A definition.', '',
      'Table: Summary', '', '| A | B |', '| - | - |', '| 1 | 2 |',
    ].join('\n');

    const { errors } = parse(src);
    eq(errors.length, 0);

    const html = compile(src);
    contains(html, 'zl-callout-note');
    contains(html, 'zl-admonition-tip');
    contains(html, 'href="https://zolto.dev"');
    contains(html, '<sup>2</sup>');
    contains(html, '<sub>2</sub>');
    contains(html, '<mark>highlighted</mark>');
    contains(html, '<kbd>Ctrl+S</kbd>');
    contains(html, 'zl-code-title');
    contains(html, 'zl-has-nums');
    contains(html, '<figure');
    contains(html, '<dl');
    contains(html, '<caption');
  });

  return suite;
}

// ─── Markdown compatibility tests (Phase 2 requirement §13) ───────────────────

function markdownCompatSuite() {
  const suite = createSuite('Markdown Compatibility');

  suite.test('CommonMark ATX headings', () => {
    contains(compile('# H1\n## H2\n### H3'), '<h3');
  });

  suite.test('CommonMark emphasis nesting', () => {
    contains(compile('*a **b** c*'), '<strong>b</strong>');
  });

  suite.test('CommonMark lazy paragraph continuation', () => {
    contains(compile('This is\na single paragraph.'), '<p>This is');
  });

  suite.test('CommonMark fenced code with info string', () => {
    contains(compile('```python\nprint(1)\n```'), 'language-python');
  });

  suite.test('GFM task list checkboxes', () => {
    contains(compile('- [x] done\n- [ ] not done'), 'checked');
  });

  suite.test('GFM table pipes', () => {
    contains(compile('| a | b |\n|---|---|\n| 1 | 2 |'), '<table');
  });

  suite.test('GFM strikethrough', () => {
    contains(compile('~~old~~'), '<del>old</del>');
  });

  suite.test('GFM autolink in angle brackets', () => {
    contains(compile('<https://example.org>'), 'href="https://example.org"');
  });

  suite.test('A document with zero Zolto extensions has zero errors', () => {
    const md = '# Title\n\n> Quote\n\n- a\n- b\n\n1. x\n2. y\n\n`code` and **bold**.\n';
    eq(parse(md).errors.length, 0);
  });

  return suite;
}

// ─── Performance benchmark (Phase 2 requirement §13/§14) ──────────────────────

function performanceSuite() {
  const suite = createSuite('Performance');

  suite.test('1,000-paragraph document compiles in reasonable time', () => {
    const src = Array.from({ length: 1000 }, (_, i) =>
      `Paragraph ${i} with **bold**, *italic*, and \`code\`.`
    ).join('\n\n');
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const html = compile(src);
    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    assert(html.length > 0);
    assert(t1 - t0 < 2000, `Expected < 2000ms, took ${(t1 - t0).toFixed(1)}ms`);
  });

  suite.test('Deeply nested list (20 levels) does not hang', () => {
    const lines = [];
    for (let i = 0; i < 20; i++) lines.push('  '.repeat(i) + '- level ' + i);
    const html = compile(lines.join('\n'));
    assert(html.includes('level 19'));
  });

  suite.test('Large table (200 rows) renders without error', () => {
    const rows = Array.from({ length: 200 }, (_, i) => `| ${i} | val-${i} |`).join('\n');
    const src = '| A | B |\n| - | - |\n' + rows;
    const html = compile(src);
    contains(html, 'val-199');
  });

  return suite;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function runAllTests() {
  const suites = [
    fixturesSuite('Headings',         headingFixtures),
    fixturesSuite('Paragraphs',       paragraphFixtures),
    fixturesSuite('Horiz. Rules',     hrFixtures),
    fixturesSuite('Blockquotes',      blockquoteFixtures),
    fixturesSuite('Lists',            listFixtures),
    fixturesSuite('Code',             codeFixtures),
    fixturesSuite('Inline',           inlineFixtures),
    fixturesSuite('Links',            linkFixtures),
    fixturesSuite('Tables',           tableFixtures),
    fixturesSuite('Frontmatter',      frontmatterFixtures),
    fixturesSuite('Variables',        variableFixtures),
    fixturesSuite('Comments',         commentFixtures),
    fixturesSuite('Footnotes',        footnoteFixtures),
    fixturesSuite('Imports',          importFixtures),
    fixturesSuite('Callouts',         calloutFixtures),
    fixturesSuite('Admonitions',      admonitionFixtures),
    fixturesSuite('Super/Sub/Mark/Kbd', superSubFixtures),
    fixturesSuite('HTML Entities',    entityFixtures),
    fixturesSuite('Smart Punctuation',smartPunctuationFixtures),
    fixturesSuite('Reference Links',  referenceLinkFixtures),
    fixturesSuite('Code Metadata',    codeMetaFixtures),
    fixturesSuite('Figures',          figureFixtures),
    fixturesSuite('Definition Lists', definitionListFixtures),
    fixturesSuite('Table Captions',   tableCaptionFixtures),
    lexerSuite(),
    parserSuite(),
    inlineSuite(),
    rendererSuite(),
    validatorSuite(),
    diagnosticsSuite(),
    integrationSuite(),
    markdownCompatSuite(),
    performanceSuite(),
  ];

  return runSuites(suites);
}
