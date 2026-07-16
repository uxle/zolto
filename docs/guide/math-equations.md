# Math Equations — Phase 4

Zolto ships a native, dependency-free mathematics engine — no external
library, no LaTeX installation required. It parses a LaTeX-like syntax
directly and renders semantic HTML/CSS plus hidden MathML for
accessibility.

## Inline Math

Wrap an expression in single dollar signs:

```
The kinetic energy formula is $KE = \frac{1}{2}mv^2$.
```

**Currency-safe:** Zolto uses the same delimiter-matching rule as Pandoc —
a closing `$` immediately followed by a digit is rejected, so prose like
`It costs $10 or $20` never triggers math mode. Escape a literal dollar
sign with `\$`.

## Display Math

Wrap a block in `@math … @/math`:

```
@math
E = mc^2
@/math
```

### Attributes

| Attribute | Example | Effect |
| :-------- | :------ | :----- |
| `name="…"` | `name="Newton's Law"` | Title shown above the equation |
| `label="…"` | `label="eq:newton"` | Anchor id for `@ref()` cross-references |
| `numbered` | `numbered=false` | Suppress the `(1)` number (default: numbered) |
| `env=` | `env=align` | Multi-line aligned equations (see below) |

### Equation Numbering & Cross-References

```
@math label="eq:newton"
F = ma
@/math

As shown in @ref(eq:newton), force equals mass times acceleration.
```

Referencing an undefined label renders a visible broken-reference marker
and raises a validation warning — it never fails silently.

### Multi-line Equations

```
@math env=align label="eq:derivation"
F &= ma \\
W &= F \cdot d \\
P &= \frac{W}{t}
@/math
```

## Supported Constructs

| Construct | Syntax | 
| :-------- | :----- |
| Fraction | `\frac{a}{b}` |
| Square / nth root | `\sqrt{x}`, `\sqrt[3]{x}` |
| Power / subscript | `x^2`, `x_i`, `x_i^n` |
| Summation / product | `\sum_{i=1}^{n}`, `\prod_{i=1}^{n}` |
| Integral | `\int_{0}^{\infty}`, `\iint`, `\iiint`, `\oint` |
| Limit | `\lim_{x \to 0}` |
| Matrices | `\begin{matrix}`, `pmatrix`, `bmatrix`, `vmatrix`, `Vmatrix`, `Bmatrix` |
| Piecewise functions | `\begin{cases} … \end{cases}` |
| Absolute value | `\|x\|` (also bare `(x)`, `[a,b]` auto-pair) |
| Auto-sized delimiters | `\left( … \right)` |
| Vectors | `\vec{v}` |
| Accents | `\hat{x}`, `\bar{x}`, `\tilde{x}`, `\dot{x}` |
| Bold / blackboard | `\mathbf{v}`, `\mathbb{R}` |
| Functions | `\sin`, `\cos`, `\log`, `\ln`, `\gcd`, … |

## Symbols

Greek letters (`\alpha`…`\omega`, `\Gamma`…`\Omega`), operators (`\pm`,
`\times`, `\cdot`), relations (`\leq`, `\geq`, `\approx`, `\in`, `\subset`),
arrows (`\to`, `\Rightarrow`, `\mapsto`), and logic/set symbols (`\forall`,
`\exists`, `\emptyset`, `\cup`, `\cap`) are all supported — see
`src/math-symbols.js` for the complete table.

## Accessibility

Every equation renders two representations simultaneously: a hand-tuned
visual HTML/CSS layout, and a visually-hidden semantic MathML annotation
with an `aria-label` plain-text fallback (e.g. "a over b" for a fraction).
Screen readers with native MathML support (Firefox, Safari) get the
richest experience; every other combination still gets an accurate,
readable description.

## Error Recovery

Malformed math never breaks the rest of the document — an unknown command
or unclosed brace renders a small red inline marker at the error site and
the document continues rendering normally.

```
@math
\notarealcommand{x}
@/math

# The rest of the document still renders fine
```
