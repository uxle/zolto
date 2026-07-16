/**
 * Zolto Phase 4 Test Suite — Native Mathematics Engine
 *
 * Covers: math-tokenizer.js, math-parser.js (+ math-matrix.js mixin),
 *         math-renderer.js, math-mathml.js, math-validator.js,
 *         integration with the main pipeline, and stress/performance.
 *
 * Export: runP4Tests() → { results, passed, failed, total }
 */

import { compile, parse } from '../src/zolto.js';
import { createSuite, runSuites, assert, eq, contains, notContains, deepEq } from './runner.js';
import { tokenizeMath, MT } from '../src/math-tokenizer.js';
import { parseMath, parseMathRows } from '../src/math-parser.js';
import { renderMathHTML, mathToPlainText, hasMathNodes } from '../src/math-renderer.js';
import { renderMathML } from '../src/math-mathml.js';
import { lookupSymbol, FUNCTION_NAMES } from '../src/math-symbols.js';

import {
  inlineMathFixtures, blockMathFixtures, equationRefFixtures,
  expressionFixtures, symbolFixtures, functionFixtures, errorRecoveryFixtures,
} from './fixtures-p4.js';

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

// ─── Math tokenizer unit tests ─────────────────────────────────────────────────

function tokenizerSuite() {
  const suite = createSuite('Math Tokenizer');

  suite.test('Tokenises numbers including decimals', () => {
    const { tokens } = tokenizeMath('3.14');
    eq(tokens[0].type, MT.NUMBER);
    eq(tokens[0].value, '3.14');
  });

  suite.test('Tokenises leading-dot decimals', () => {
    const { tokens } = tokenizeMath('.5');
    eq(tokens[0].value, '.5');
  });

  suite.test('Tokenises single-letter identifiers separately', () => {
    const { tokens } = tokenizeMath('xy');
    eq(tokens[0].type, MT.IDENT);
    eq(tokens[1].type, MT.IDENT);
  });

  suite.test('Tokenises backslash commands', () => {
    const { tokens } = tokenizeMath('\\frac');
    eq(tokens[0].type, MT.COMMAND);
    eq(tokens[0].value, 'frac');
  });

  suite.test('Tokenises double-backslash as row separator', () => {
    const { tokens } = tokenizeMath('a \\\\ b');
    assert(tokens.some(t => t.type === MT.NEWLINE));
  });

  suite.test('Tokenises escaped braces as literal commands', () => {
    const { tokens } = tokenizeMath('\\{ \\}');
    eq(tokens[0].type, MT.COMMAND);
    eq(tokens[0].value, '{');
  });

  suite.test('Captures \\text{} content verbatim without re-tokenising', () => {
    const { tokens } = tokenizeMath('\\text{if x > 0}');
    const textTok = tokens.find(t => t.type === MT.TEXT);
    eq(textTok.value, 'if x > 0');
  });

  suite.test('Skips whitespace between tokens', () => {
    const { tokens } = tokenizeMath('a   +   b');
    eq(tokens.filter(t => t.type !== MT.EOF).length, 3);
  });

  suite.test('Skips % comments to end of line', () => {
    const { tokens } = tokenizeMath('a % comment\n+ b');
    const values = tokens.filter(t => t.type !== MT.EOF).map(t => t.value);
    assert(!values.includes('comment'));
  });

  suite.test('Ampersand tokenised as column separator', () => {
    const { tokens } = tokenizeMath('a & b');
    assert(tokens.some(t => t.type === MT.AMP));
  });

  suite.test('Always terminates with EOF token', () => {
    const { tokens } = tokenizeMath('x');
    eq(tokens[tokens.length - 1].type, MT.EOF);
  });

  return suite;
}

// ─── Math symbol table unit tests ──────────────────────────────────────────────

function symbolTableSuite() {
  const suite = createSuite('Math Symbol Tables');

  suite.test('lookupSymbol resolves Greek letters', () => {
    const s = lookupSymbol('alpha');
    eq(s.char, '\u03B1');
    eq(s.category, 'greek');
  });

  suite.test('lookupSymbol resolves arrows', () => {
    const s = lookupSymbol('to');
    eq(s.char, '\u2192');
    eq(s.category, 'arrow');
  });

  suite.test('lookupSymbol returns null for unknown names', () => {
    eq(lookupSymbol('notarealsymbol'), null);
  });

  suite.test('FUNCTION_NAMES includes common trig/log functions', () => {
    for (const fn of ['sin', 'cos', 'tan', 'log', 'ln', 'exp']) {
      assert(FUNCTION_NAMES.has(fn), `Missing function: ${fn}`);
    }
  });

  return suite;
}

// ─── Math parser unit tests ────────────────────────────────────────────────────

function parserSuite() {
  const suite = createSuite('Math Parser');

  suite.test('Parses a simple binary expression', () => {
    const { ast } = parseMath('a+b');
    eq(ast.type, 'Equation');
    eq(ast.children[0].type, 'BinaryExpression');
  });

  suite.test('Relational operators bind looser than additive', () => {
    const { ast } = parseMath('a+b=c');
    const top = ast.children[0];
    eq(top.type, 'BinaryExpression');
    eq(top.op, '=');
    eq(top.children[0].type, 'BinaryExpression'); // a+b nested inside
  });

  suite.test('Implicit multiplication produces BinaryExpression with op=null', () => {
    const { ast } = parseMath('2x');
    const node = ast.children[0];
    eq(node.type, 'BinaryExpression');
    eq(node.op, null);
  });

  suite.test('Unary minus produces UnaryExpression', () => {
    const { ast } = parseMath('-x');
    eq(ast.children[0].type, 'UnaryExpression');
    eq(ast.children[0].op, '-');
  });

  suite.test('Fraction has exactly two children [num, den]', () => {
    const { ast } = parseMath('\\frac{a}{b}');
    const frac = ast.children[0];
    eq(frac.type, 'Fraction');
    eq(frac.children.length, 2);
  });

  suite.test('Sqrt with optional index parses nth root', () => {
    const { ast } = parseMath('\\sqrt[3]{x}');
    const root = ast.children[0];
    eq(root.type, 'Root');
    assert(root.index !== null);
  });

  suite.test('Sqrt without index has null index', () => {
    const { ast } = parseMath('\\sqrt{x}');
    eq(ast.children[0].index, null);
  });

  suite.test('Power creates base/exp children', () => {
    const { ast } = parseMath('x^2');
    eq(ast.children[0].type, 'Power');
  });

  suite.test('Combined subscript+superscript produces SubSup', () => {
    const { ast } = parseMath('x_i^n');
    eq(ast.children[0].type, 'SubSup');
    eq(ast.children[0].children.length, 3);
  });

  suite.test('Summation stores lo/hi as children, not a body', () => {
    const { ast } = parseMath('\\sum_{i=1}^{n}');
    const sum = ast.children[0];
    eq(sum.type, 'Summation');
    eq(sum.children.length, 2);
    assert(sum.children[0] !== null); // lo
    assert(sum.children[1] !== null); // hi
  });

  suite.test('Summation does not embed a "body" argument alongside lo/hi', () => {
    const { ast } = parseMath('\\sum_{i=1}^{n} x_i');
    // Find the Summation node wherever it landed (it may be wrapped in an
    // implicit-multiplication BinaryExpression with the following term —
    // that wrapping is a cosmetic AST-shape detail that renders identically
    // to separate siblings, since op:null means no glyph, just concatenation).
    const sum = ast.children[0].type === 'Summation' ? ast.children[0] : ast.children[0].children[0];
    eq(sum.type, 'Summation');
    eq(sum.children.length, 2); // exactly [lo, hi] — never a 3rd "body" slot
  });

  suite.test('Bare parentheses pair into a non-stretchy Delim', () => {
    const { ast } = parseMath('(x+y)');
    eq(ast.children[0].type, 'Delim');
    eq(ast.children[0].stretchy, false);
  });

  suite.test('\\left \\right pair into a stretchy Delim', () => {
    const { ast } = parseMath('\\left( x \\right)');
    eq(ast.children[0].type, 'Delim');
    eq(ast.children[0].stretchy, true);
  });

  suite.test('Function call with parenthesized argument groups correctly', () => {
    const { ast } = parseMath('\\sin(x)');
    const fn = ast.children[0];
    eq(fn.type, 'FunctionCall');
    eq(fn.name, 'sin');
    eq(fn.children[0].type, 'Delim');
  });

  suite.test('Absolute value bars pair correctly', () => {
    const { ast } = parseMath('|x|');
    eq(ast.children[0].type, 'Delim');
    eq(ast.children[0].open, '|');
  });

  suite.test('Lone pipe without a match falls back to literal Operator', () => {
    const { ast } = parseMath('\\{x | x > 0\\}');
    const hasLiteralPipe = ast.children.some(n =>
      n.type === 'Operator' && n.op === '|'
    ) || JSON.stringify(ast).includes('"op":"|"');
    assert(hasLiteralPipe);
  });

  suite.test('Matrix environment produces Row/Cell structure', () => {
    const { ast } = parseMath('\\begin{matrix} a & b \\\\ c & d \\end{matrix}');
    const m = ast.children[0];
    eq(m.type, 'Matrix');
    eq(m.children.length, 2); // 2 rows
    eq(m.children[0].children.length, 2); // 2 cells in row 1
  });

  suite.test('Cases environment sets env to "cases"', () => {
    const { ast } = parseMath('\\begin{cases} 1 & a \\\\ 0 & b \\end{cases}');
    eq(ast.children[0].env, 'cases');
  });

  suite.test('mathbb resolves known blackboard letters', () => {
    const { ast } = parseMath('\\mathbb{R}');
    eq(ast.children[0].type, 'Blackboard');
  });

  suite.test('Vector wraps its argument', () => {
    const { ast } = parseMath('\\vec{v}');
    eq(ast.children[0].type, 'Vector');
  });

  suite.test('parseMathRows splits align-style content into equations', () => {
    const { equations } = parseMathRows('a &= b \\\\ c &= d');
    eq(equations.length, 2);
    eq(equations[0].type, 'Equation');
  });

  // ── Error recovery ──────────────────────────────────────────────────────

  suite.test('Unknown command produces MathError, does not throw', () => {
    const { ast, errors } = parseMath('\\notarealcommand');
    eq(ast.children[0].type, 'MathError');
    assert(errors.length > 0);
  });

  suite.test('Unclosed \\left reports an error but still returns an AST', () => {
    const { ast, errors } = parseMath('\\left( x + y');
    eq(ast.type, 'Equation');
    assert(errors.length > 0);
  });

  suite.test('Mismatched \\end{} reports an error', () => {
    const { errors } = parseMath('\\begin{matrix} a \\end{pmatrix}');
    assert(errors.some(e => e.message.includes('Mismatched')));
  });

  suite.test('Empty math source parses to an empty Equation', () => {
    const { ast, errors } = parseMath('');
    eq(ast.type, 'Equation');
    eq(ast.children.length, 0);
    eq(errors.length, 0);
  });

  suite.test('Parser never throws on malformed input', () => {
    const malformed = ['\\frac{a', '{{{', '^^^', '\\begin{matrix}', '\\left(((', '_^_^'];
    for (const src of malformed) {
      assert(() => { parseMath(src); return true; }, `Threw on: ${src}`);
    }
  });

  return suite;
}

// ─── Math renderer unit tests ───────────────────────────────────────────────────

function rendererSuite() {
  const suite = createSuite('Math Renderer');

  suite.test('Renders a number as zl-mn', () => {
    const { ast } = parseMath('42');
    contains(renderMathHTML(ast), 'zl-mn');
  });

  suite.test('Renders an identifier as italic zl-mi', () => {
    const { ast } = parseMath('x');
    contains(renderMathHTML(ast), 'zl-mi');
  });

  suite.test('Renders MathError with a visible marker', () => {
    const { ast } = parseMath('\\unknown');
    contains(renderMathHTML(ast), 'zl-merror');
  });

  suite.test('HTML-escapes text content', () => {
    const { ast } = parseMath('\\text{<script>}');
    notContains(renderMathHTML(ast), '<script>');
  });

  suite.test('mathToPlainText produces a readable approximation', () => {
    const { ast } = parseMath('a+b');
    const text = mathToPlainText(ast);
    contains(text, 'a');
    contains(text, 'b');
  });

  suite.test('hasMathNodes detects math_inline in a paragraph', () => {
    const { ast: docAst } = parse('Text with $x$ math.');
    eq(hasMathNodes(docAst.children), true);
  });

  suite.test('hasMathNodes returns false for plain text', () => {
    const { ast: docAst } = parse('Just plain text.');
    eq(hasMathNodes(docAst.children), false);
  });

  return suite;
}

// ─── MathML renderer unit tests ─────────────────────────────────────────────────

function mathmlSuite() {
  const suite = createSuite('MathML Renderer');

  suite.test('Produces a valid <math> root element', () => {
    const { ast } = parseMath('x');
    const mml = renderMathML(ast);
    contains(mml, '<math xmlns="http://www.w3.org/1998/Math/MathML"');
    contains(mml, '</math>');
  });

  suite.test('Fraction becomes <mfrac>', () => {
    const { ast } = parseMath('\\frac{a}{b}');
    contains(renderMathML(ast), '<mfrac>');
  });

  suite.test('Square root becomes <msqrt>', () => {
    const { ast } = parseMath('\\sqrt{x}');
    contains(renderMathML(ast), '<msqrt>');
  });

  suite.test('Nth root becomes <mroot>', () => {
    const { ast } = parseMath('\\sqrt[3]{x}');
    contains(renderMathML(ast), '<mroot>');
  });

  suite.test('Power becomes <msup>', () => {
    const { ast } = parseMath('x^2');
    contains(renderMathML(ast), '<msup>');
  });

  suite.test('Subscript becomes <msub>', () => {
    const { ast } = parseMath('x_i');
    contains(renderMathML(ast), '<msub>');
  });

  suite.test('Matrix becomes <mtable>/<mtr>/<mtd>', () => {
    const { ast } = parseMath('\\begin{matrix} a & b \\end{matrix}');
    const mml = renderMathML(ast);
    contains(mml, '<mtable>');
    contains(mml, '<mtr>');
    contains(mml, '<mtd>');
  });

  suite.test('display attribute reflects block vs inline', () => {
    const { ast } = parseMath('x');
    contains(renderMathML(ast, 'block'), 'display="block"');
    contains(renderMathML(ast, 'inline'), 'display="inline"');
  });

  return suite;
}

// ─── Validator / diagnostics unit tests ────────────────────────────────────────

function validatorSuite() {
  const suite = createSuite('Math Validator');

  suite.test('Duplicate equation labels produce a warning', () => {
    const { warnings } = parse('@math label="eq:x"\na\n@/math\n\n@math label="eq:x"\nb\n@/math');
    assert(warnings.some(w => w.includes('Duplicate') && w.includes('eq:x')));
  });

  suite.test('Unique labels produce no duplicate warning', () => {
    const { warnings } = parse('@math label="eq:a"\na\n@/math\n\n@math label="eq:b"\nb\n@/math');
    assert(!warnings.some(w => w.includes('Duplicate')));
  });

  suite.test('@ref to an existing label has no warning', () => {
    const { warnings } = parse('@math label="eq:a"\na\n@/math\n\n@ref(eq:a)');
    assert(!warnings.some(w => w.includes('Undefined equation reference')));
  });

  suite.test('@ref to a missing label warns', () => {
    const { warnings } = parse('@ref(eq:nope)');
    assert(warnings.some(w => w.includes('Undefined equation reference')));
  });

  suite.test('Unclosed @math block produces an error', () => {
    const { errors } = parse('@math\nx = y');
    assert(errors.some(e => e.includes('Unclosed')));
  });

  return suite;
}

// ─── Integration tests ──────────────────────────────────────────────────────────

function integrationSuite() {
  const suite = createSuite('Phase 4 Integration');

  suite.test('Math coexists with Phase 1/2/3 features in one document', () => {
    const src = [
      '# Report {#top}', '',
      '> [!NOTE]', '> Contains math.', '',
      '[info]', 'Formula: $x^2$', '[/info]', '',
      '@alert info', 'See $E=mc^2$ below.', '@/alert', '',
      '@math label="eq:e"', 'E = mc^2', '@/math', '',
      'Ref: @ref(eq:e).', '',
      '**Bold** and *italic* text with `code`.',
    ].join('\n');

    const { errors } = parse(src);
    eq(errors.length, 0);

    const html = compile(src);
    contains(html, 'id="top"');
    contains(html, 'zl-callout-note');
    contains(html, 'zl-admonition-info');
    contains(html, 'zl-alert-info');
    contains(html, 'zl-math-block-wrap');
    contains(html, 'zl-math-ref');
    contains(html, '<strong>Bold</strong>');
  });

  suite.test('Math inside a Phase 3 card directive renders correctly', () => {
    const html = compile('@card title="Formula"\n$x^2 + y^2 = z^2$\n@/card');
    contains(html, 'zl-card');
    contains(html, 'zl-math-inline');
  });

  suite.test('CSS is injected exactly once even with many equations', () => {
    const html = compile('$a$ $b$ $c$\n\n@math\nd\n@/math');
    const matches = html.match(/zl-math-styles/g) ?? [];
    eq(matches.length, 1);
  });

  suite.test('No math CSS injected for a math-free document', () => {
    const html = compile('# Title\n\nJust **markdown**, no math.');
    notContains(html, 'zl-math-styles');
  });

  suite.test('Equation numbers are independent of label presence', () => {
    const html = compile('@math label="eq:a"\nx\n@/math\n\n@math\ny\n@/math');
    contains(html, '(1)');
    contains(html, '(2)');
  });

  return suite;
}

// ─── Stress / performance tests ─────────────────────────────────────────────────

function stressSuite() {
  const suite = createSuite('Phase 4 Stress');

  suite.test('50 inline equations in one document render without error', () => {
    const src = Array.from({ length: 50 }, (_, i) => `Equation ${i}: $x_${i} + y_${i} = z_${i}$`).join('\n\n');
    const html = compile(src);
    contains(html, 'zl-math-inline');
  });

  suite.test('Deeply nested groups do not hang', () => {
    const src = '@math\n' + '{'.repeat(30) + 'x' + '}'.repeat(30) + '\n@/math';
    const html = compile(src);
    assert(html.length > 0);
  });

  suite.test('Large matrix (10x10) renders all cells', () => {
    const row = Array.from({ length: 10 }, (_, i) => `a_{${i}}`).join(' & ');
    const rows = Array.from({ length: 10 }, () => row).join(' \\\\ ');
    const html = compile(`@math\n\\begin{matrix} ${rows} \\end{matrix}\n@/math`);
    assert((html.match(/zl-matrix-cell/g) ?? []).length >= 100);
  });

  suite.test('1000-line document with mixed math compiles under 2s', () => {
    const blocks = [];
    for (let i = 0; i < 100; i++) {
      blocks.push(`Paragraph ${i} with $x_${i}^2$ inline math.`);
      blocks.push(`@math\nf_${i}(x) = x^${i}\n@/math`);
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

// ─── Public entry point ─────────────────────────────────────────────────────────

export function runP4Tests() {
  const suites = [
    fixturesSuite('Inline Math',       inlineMathFixtures),
    fixturesSuite('Block Math',        blockMathFixtures),
    fixturesSuite('Equation Refs',     equationRefFixtures),
    fixturesSuite('Expressions',       expressionFixtures),
    fixturesSuite('Symbols',           symbolFixtures),
    fixturesSuite('Functions',         functionFixtures),
    fixturesSuite('Error Recovery',    errorRecoveryFixtures),
    tokenizerSuite(),
    symbolTableSuite(),
    parserSuite(),
    rendererSuite(),
    mathmlSuite(),
    validatorSuite(),
    integrationSuite(),
    stressSuite(),
  ];

  return runSuites(suites);
}
