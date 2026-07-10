/**
 * Zolto — Public API
 * ════════════════════════════════════════════════════════════════════════════
 * Phase 2 · "Extended Markdown" — production-quality Markdown superset.
 *
 *   import { parse, render, compile } from './zolto.js';
 *
 *   const { ast, errors, warnings } = parse(src);
 *   const html = render(ast, { xhtml: false });
 *   const html2 = compile(src);   // parse + render in one call
 *
 * Backward compatible with the Phase 1 API surface — every Phase 1 call site
 * continues to work unchanged. Phase 2 only adds new optional behaviour.
 */

import { tokenize }      from './lexer.js';
import { parseTokens }   from './parser.js';
import { validate }      from './validator.js';
import { render as renderAst, renderInline, inlineToText } from './renderer.js';
import { Diagnostics }   from './diagnostics.js';

export const VERSION = '3.0.0';
export const PHASE   = 3;

// ─── parse() ──────────────────────────────────────────────────────────────────

/**
 * Parse Zolto/Markdown source into an AST plus diagnostics.
 *
 * @param {string} src  Raw source text
 * @returns {{
 *   ast: DocumentNode,
 *   errors: string[],
 *   warnings: string[],
 *   diagnostics: Diagnostics
 * }}
 */
export function parse(src) {
  if (typeof src !== 'string') {
    throw new TypeError(`Zolto.parse: expected string, got ${typeof src}`);
  }

  const { tokens, errors: lexErrors } = tokenize(src);
  const ast = parseTokens(tokens);

  const { errors: valErrors, warnings, diagnostics } = validate(ast);

  // Merge lexer errors (unclosed fences/comments/admonitions) into diagnostics
  const d = new Diagnostics();
  for (const e of lexErrors) d.error('E001', e.message, { line: e.line });
  d.merge(diagnostics);

  return {
    ast,
    errors:   [...lexErrors.map(e => `${e.message} (line ${e.line})`), ...valErrors],
    warnings,
    diagnostics: d,
  };
}

// ─── render() ─────────────────────────────────────────────────────────────────

/**
 * Render a Document AST to an HTML string.
 *
 * @param {DocumentNode} ast
 * @param {object}  [opts]
 * @param {boolean} [opts.xhtml=false]           Self-close void elements (<br />)
 * @param {boolean} [opts.footnoteSection=true]   Append <section class="zl-footnotes">
 * @returns {string}
 */
export function render(ast, opts = {}) {
  if (!ast || ast.type !== 'document') {
    throw new TypeError('Zolto.render: expected a Document AST node (ast.type === "document")');
  }
  return renderAst(ast, opts);
}

// ─── compile() ────────────────────────────────────────────────────────────────

/**
 * Parse + render in a single call. Throws if the source contains fatal
 * structural errors (unclosed fences are tolerated — see parse()).
 *
 * @param {string} src
 * @param {object} [opts]  Same options as render()
 * @returns {string} HTML
 */
export function compile(src, opts = {}) {
  const { ast } = parse(src);
  return render(ast, opts);
}

// ─── Utility re-exports ───────────────────────────────────────────────────────

export { renderInline, inlineToText };

/**
 * Library metadata banner — useful for console.log(about()).
 * @returns {string}
 */
export function about() {
  return `Zolto v${VERSION} · Phase ${PHASE} · Native Block Directives engine\n` +
         `  parse(src) → { ast, errors, warnings, diagnostics }\n` +
         `  render(ast, opts?) → html\n` +
         `  compile(src, opts?) → html`;
}
