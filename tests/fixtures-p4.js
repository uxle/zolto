/**
 * Zolto Phase 4 Test Fixtures — Native Mathematics Engine
 *
 * Each fixture is:  { input, contains?, notContains?, description }
 */

// ─── Inline math ──────────────────────────────────────────────────────────────

export const inlineMathFixtures = [
  { description: 'Basic inline math renders', input: 'The formula $E = mc^2$ is famous.',
    contains: ['zl-math-inline', 'zl-mi'] },
  { description: 'Inline math with fraction', input: 'Simplify $\\frac{a}{b}$ please.',
    contains: ['zl-frac', 'zl-frac-num', 'zl-frac-den'] },
  { description: 'Inline math with square root', input: 'Compute $\\sqrt{x}$ now.',
    contains: ['zl-sqrt', 'zl-sqrt-body'] },
  { description: 'Inline math with summation', input: 'The sum $\\sum_{i=1}^{n}x_i$ converges.',
    contains: ['zl-bigop', '\u2211'] },
  { description: 'Currency is not treated as math', input: 'It costs $10 or $20 tomorrow.',
    notContains: ['zl-math-inline'] },
  { description: 'Decimal currency is not treated as math', input: 'Price: $5.99 total.',
    notContains: ['zl-math-inline'] },
  { description: 'Escaped dollar renders literally', input: 'Price is \\$10 exactly.',
    contains: ['$10'], notContains: ['zl-math-inline'] },
  { description: 'Two separate inline math spans on one line', input: '$a+b$ and $c+d$ both work.',
    contains: ['zl-math-inline'] },
  { description: 'Inline math does not cross paragraph boundary', input: 'Text with $unclosed\n\nNew paragraph.',
    notContains: ['zl-math-inline'] },
  { description: 'Nested braces inside inline math', input: 'Value is $x^{2+3}$ here.',
    contains: ['zl-sup'] },
];

// ─── Display / block math ───────────────────────────────────────────────────────

export const blockMathFixtures = [
  { description: 'Basic display math block', input: '@math\n  E = mc^2\n@/math',
    contains: ['zl-math-block-wrap', 'zl-math-display'] },
  { description: 'Display math with title', input: '@math name="Energy"\n  E = mc^2\n@/math',
    contains: ['zl-math-title', 'Energy'] },
  { description: 'Display math with label gets an anchor id', input: '@math label="eq:test"\n  x = y\n@/math',
    contains: ['data-label="eq:test"', 'id="eq-'] },
  { description: 'Numbered equation shows (1)', input: '@math\n  a = b\n@/math',
    contains: ['zl-math-number', '(1)'] },
  { description: 'Unnumbered equation with numbered=false', input: '@math numbered=false\n  a = b\n@/math',
    notContains: ['<span class="zl-math-number">'] },
  { description: 'Multiple equations number sequentially', input: '@math\nfirst\n@/math\n\n@math\nsecond\n@/math',
    contains: ['(1)', '(2)'] },
  { description: 'Multi-line align environment renders with line breaks', input: '@math env=align\n  F &= ma \\\\\n  W &= F \\cdot d\n@/math',
    contains: ['<br>'] },
  { description: 'Unclosed @math block reports an error', input: '@math\n  E = mc^2', contains: [] },
];

// ─── Equation references ────────────────────────────────────────────────────────

export const equationRefFixtures = [
  { description: 'Reference to a defined label resolves', input: '@math label="eq:a"\nx=y\n@/math\n\nSee @ref(eq:a).',
    contains: ['zl-math-ref', 'href="#eq-'] },
  { description: 'Reference shows the correct equation number', input: '@math label="eq:a"\nx=y\n@/math\n\n@ref(eq:a)',
    contains: ['>(1)</a>'] },
  { description: 'Reference to an undefined label renders a broken-ref marker', input: 'See @ref(eq:missing) here.',
    contains: ['zl-math-ref-broken'] },
];

// ─── Mathematical expressions (constructs) ──────────────────────────────────────

export const expressionFixtures = [
  { description: 'Fraction', input: '@math\n\\frac{a}{b}\n@/math', contains: ['zl-frac'] },
  { description: 'Square root', input: '@math\n\\sqrt{x}\n@/math', contains: ['zl-sqrt'] },
  { description: 'Nth root', input: '@math\n\\sqrt[3]{x}\n@/math', contains: ['zl-sqrt-idx'] },
  { description: 'Power/superscript', input: '@math\nx^2\n@/math', contains: ['zl-sup'] },
  { description: 'Subscript', input: '@math\nx_i\n@/math', contains: ['zl-sub'] },
  { description: 'Combined sub and superscript', input: '@math\nx_i^n\n@/math', contains: ['zl-subsup-stack'] },
  { description: 'Summation with bounds', input: '@math\n\\sum_{i=1}^{n} x\n@/math', contains: ['zl-bigop', '\u2211'] },
  { description: 'Product with bounds', input: '@math\n\\prod_{i=1}^{n} x\n@/math', contains: ['\u220F'] },
  { description: 'Integral with bounds', input: '@math\n\\int_{0}^{\\infty} x\n@/math', contains: ['\u222B'] },
  { description: 'Double integral', input: '@math\n\\iint x\n@/math', contains: ['\u222C'] },
  { description: 'Limit', input: '@math\n\\lim_{x \\to 0} f\n@/math', contains: ['zl-limit', 'lim'] },
  { description: 'Matrix (plain)', input: '@math\n\\begin{matrix} a & b \\\\ c & d \\end{matrix}\n@/math',
    contains: ['zl-matrix'] },
  { description: 'Parenthesis matrix', input: '@math\n\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}\n@/math',
    contains: ['zl-matrix-delim-open', 'zl-matrix-delim-close'] },
  { description: 'Bracket matrix', input: '@math\n\\begin{bmatrix} 1 & 2 \\end{bmatrix}\n@/math',
    contains: ['zl-matrix'] },
  { description: 'Cases (piecewise function)', input: '@math\nf(x) = \\begin{cases} 1 & x > 0 \\\\ 0 & x \\leq 0 \\end{cases}\n@/math',
    contains: ['zl-matrix-cases'] },
  { description: 'Absolute value bars', input: '@math\n|x|\n@/math', contains: ['zl-delim'] },
  { description: 'Vector notation', input: '@math\n\\vec{F} = m\\vec{a}\n@/math', contains: ['zl-vec'] },
  { description: 'Set membership', input: '@math\nx \\in \\mathbb{R}\n@/math', contains: ['zl-blackboard'] },
  { description: 'Auto-sized delimiters', input: '@math\n\\left( x + y \\right)\n@/math', contains: ['zl-delim-stretchy'] },
  { description: 'Overline accent', input: '@math\n\\overline{AB}\n@/math', contains: ['zl-overline-body'] },
  { description: 'Hat accent', input: '@math\n\\hat{x}\n@/math', contains: ['zl-accent'] },
  { description: 'Bold vector via mathbf', input: '@math\n\\mathbf{v}\n@/math', contains: ['zl-bold'] },
];

// ─── Symbols ──────────────────────────────────────────────────────────────────

export const symbolFixtures = [
  { description: 'Greek lowercase alpha', input: '@math\n\\alpha\n@/math', contains: ['\u03B1'] },
  { description: 'Greek uppercase Omega', input: '@math\n\\Omega\n@/math', contains: ['\u03A9'] },
  { description: 'Infinity symbol', input: '@math\n\\infty\n@/math', contains: ['\u221E'] },
  { description: 'Nabla operator', input: '@math\n\\nabla\n@/math', contains: ['\u2207'] },
  { description: 'Plus-minus operator', input: '@math\n\\pm\n@/math', contains: ['\u00B1'] },
  { description: 'Less-than-or-equal relation', input: '@math\nx \\leq y\n@/math', contains: ['\u2264'] },
  { description: 'Rightarrow', input: '@math\nx \\to y\n@/math', contains: ['\u2192'] },
  { description: 'Element-of relation', input: '@math\nx \\in S\n@/math', contains: ['\u2208'] },
  { description: 'Forall quantifier', input: '@math\n\\forall x\n@/math', contains: ['\u2200'] },
  { description: 'Cdot multiplication', input: '@math\na \\cdot b\n@/math', contains: ['\u22C5'] },
];

// ─── Functions ────────────────────────────────────────────────────────────────

export const functionFixtures = [
  { description: 'Sine function', input: '@math\n\\sin x\n@/math', contains: ['zl-fn', 'sin'] },
  { description: 'Natural log function', input: '@math\n\\ln x\n@/math', contains: ['ln'] },
  { description: 'Logarithm function', input: '@math\n\\log x\n@/math', contains: ['log'] },
  { description: 'Floor function', input: '@math\n\\floor x\n@/math', contains: ['floor'] },
  { description: 'Function applied to parenthesized argument', input: '@math\n\\cos(x)\n@/math', contains: ['cos'] },
];

// ─── Error recovery ───────────────────────────────────────────────────────────

export const errorRecoveryFixtures = [
  { description: 'Unknown command does not crash, shows error marker', input: '@math\n\\notarealcommand{x}\n@/math',
    contains: ['zl-merror'] },
  { description: 'Unclosed fraction argument recovers gracefully', input: '@math\n\\frac{a}\n@/math', contains: [] },
  { description: 'Document continues to render after a math error', input: '@math\n\\badcmd\n@/math\n\n# Still Works',
    contains: ['<h1'] },
];
