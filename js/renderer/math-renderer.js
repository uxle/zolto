/**
 * js/renderer/math-renderer.js
 * Zolto v8.1.0 — Math Renderer (Domain 2: Mathematics)
 *
 * Renders MathBlock and MathInline AST nodes to HTML.
 * Primary backend: KaTeX (fast, browser-native MathML output)
 * Fallback backend: MathJax (slower, better compatibility)
 *
 * Also handles:
 *  - Function plot rendering (env=plot) → SVG via math.js sampling
 *  - Equation numbering display
 *  - Cross-reference \ref{label} resolution
 *  - Custom macro expansion (pre-registered with KaTeX)
 */

'use strict';

import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { createLogger }           from '../utils/logger.js';
import { clamp }                  from '../utils/helpers.js';

const logger = createLogger('Math');

// ─────────────────────────────────────────────────────────────
// 1. Custom Macro Definitions
// ─────────────────────────────────────────────────────────────

const ZOLTO_MACROS = {
  '\\bra':    '\\langle #1 \\rvert',
  '\\ket':    '\\lvert #1 \\rangle',
  '\\braket': '\\langle #1 \\mid #2 \\rangle',
  '\\prob':   '\\mathrm{P}',
  '\\expect': '\\mathbb{E}',
  '\\var':    '\\mathrm{Var}',
  '\\cov':    '\\mathrm{Cov}',
  '\\std':    '\\mathrm{Std}',
  '\\N':      '\\mathcal{N}',
};

// ─────────────────────────────────────────────────────────────
// 2. Plot Configuration
// ─────────────────────────────────────────────────────────────

const PLOT_DEFAULTS = Object.freeze({
  width:    580,
  height:   320,
  samples:  200,
  padding:  48,
  colours:  ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'],
});

// ─────────────────────────────────────────────────────────────
// 3. MathRenderer Class
// ─────────────────────────────────────────────────────────────

export class MathRenderer {
  /**
   * @param {import('./renderer.js').ZoltoRenderer} parent
   */
  constructor(parent) {
    this._r       = parent;
    this._backend = parent.options.mathBackend ?? 'katex';
    this._katex   = null; // lazy-loaded
  }

  // ─────────────────────────────────────────────────────────
  // Public: MathBlock
  // ─────────────────────────────────────────────────────────

  /**
   * @param {object}        node — MathBlock AST node
   * @param {object}        ctx  — RenderContext
   * @returns {string}
   */
  renderMathBlock(node, ctx) {
    const id      = escapeAttr(node.id);
    const label   = node.label  ? escapeAttr(node.label) : '';
    const title   = node.title  ? escapeHtml(node.title) : '';
    const num     = node.number ?? null;
    const env     = node.env    ?? 'equation';
    const content = node.content ?? '';

    // Function plot — special SVG rendering
    if (env === 'plot') {
      return this._renderPlot(node, ctx);
    }

    // Standard LaTeX rendering
    const mathHtml = this._renderLatex(content, true, env);

    return `<figure class="zolto-math-block" data-id="${id}"${label ? ` data-label="${label}"` : ''}>
      ${title ? `<div class="zolto-math-title">${title}</div>` : ''}
      <div class="zolto-math-equation"
           aria-label="${escapeAttr(this._latexToSpeech(content))}">${mathHtml}</div>
      ${num !== null ? `<figcaption class="zolto-math-number">(${num})</figcaption>` : ''}
    </figure>`;
  }

  // ─────────────────────────────────────────────────────────
  // Public: MathInline
  // ─────────────────────────────────────────────────────────

  /**
   * @param {object} node — MathInline AST node
   * @param {object} ctx
   * @returns {string}
   */
  renderMathInline(node, ctx) {
    const content  = node.content ?? '';
    const mathHtml = this._renderLatex(content, false, 'inline');
    return `<span class="zolto-math-inline"
               aria-label="${escapeAttr(this._latexToSpeech(content))}">${mathHtml}</span>`;
  }

  // ─────────────────────────────────────────────────────────
  // KaTeX / MathJax rendering
  // ─────────────────────────────────────────────────────────

  /**
   * Render a LaTeX string to HTML via KaTeX or MathJax.
   * @param {string}  latex
   * @param {boolean} displayMode
   * @param {string}  env
   * @returns {string}
   */
  _renderLatex(latex, displayMode, env) {
    // Wrap in appropriate LaTeX environment
    const wrapped = this._wrapInEnvironment(latex, env);

    if (this._backend === 'katex') {
      return this._renderKaTeX(wrapped, displayMode);
    }
    return this._renderMathJaxFallback(wrapped, displayMode);
  }

  /**
   * Wrap LaTeX content in the appropriate environment for display.
   * @param {string} content
   * @param {string} env
   * @returns {string}
   */
  _wrapInEnvironment(content, env) {
    const trimmed = content.trim();

    // Already has \begin...\end
    if (trimmed.startsWith('\\begin')) return trimmed;
    // Inline or plain equation — no wrapper
    if (env === 'inline' || env === 'equation') return trimmed;
    // Named multi-line environments
    if (['align', 'align*', 'gather', 'multline', 'cases'].includes(env)) {
      return `\\begin{${env}}\n${trimmed}\n\\end{${env}}`;
    }
    return trimmed;
  }

  /**
   * Render with KaTeX (synchronous, browser-native).
   * @param {string}  latex
   * @param {boolean} displayMode
   * @returns {string}
   */
  _renderKaTeX(latex, displayMode) {
    try {
      // Access window.katex loaded from CDN in index.html
      const katex = (typeof window !== 'undefined' && window.katex)
        ? window.katex
        : null;

      if (!katex) {
        return this._katexFallbackSpan(latex, displayMode);
      }

      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output:       'mathml',
        macros:       ZOLTO_MACROS,
        trust:        false,
      });
    } catch (err) {
      logger.warn('KaTeX render error:', err.message);
      return this._errorMath(latex, err.message);
    }
  }

  /**
   * Fallback when KaTeX isn't loaded yet — returns a placeholder
   * that the browser will hydrate once KaTeX loads.
   */
  _katexFallbackSpan(latex, displayMode) {
    const cls = displayMode ? 'katex-display' : 'katex-inline';
    return `<span class="zolto-math-loading ${cls}"
               data-latex="${escapeAttr(latex)}">${escapeHtml(latex)}</span>`;
  }

  /**
   * MathJax fallback — outputs a span that MathJax will typeset.
   * MathJax processes all [data-mathjax] elements after page load.
   */
  _renderMathJaxFallback(latex, displayMode) {
    const delim = displayMode ? ['\\[', '\\]'] : ['\\(', '\\)'];
    return `<span class="zolto-math-mathjax" data-mathjax="true">
      ${escapeHtml(delim[0] + latex + delim[1])}
    </span>`;
  }

  /**
   * Error display when math can't be rendered.
   */
  _errorMath(latex, message) {
    return `<span class="zolto-math-error" title="${escapeAttr(message)}"
               style="color:var(--intent-danger);font-family:var(--font-mono)">
      ${escapeHtml(latex)}
    </span>`;
  }

  // ─────────────────────────────────────────────────────────
  // Function Plot Rendering
  // ─────────────────────────────────────────────────────────

  /**
   * Render a math block with env=plot as an SVG function plot.
   * @param {object} node
   * @param {object} ctx
   * @returns {string}
   */
  _renderPlot(node, ctx) {
    const id      = escapeAttr(node.id);
    const title   = node.title ? escapeHtml(node.title) : '';
    const cfg     = node.config ?? {};
    const content = (node.content ?? '').trim();

    // Parse function expressions from content
    const fns = content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('y =') || l.startsWith('y='));

    if (fns.length === 0) {
      return `<figure class="zolto-math-plot" data-id="${id}">
        ${title ? `<div class="zolto-math-title">${title}</div>` : ''}
        <div class="zolto-error-node">No function expressions found (expected: y = ...)</div>
      </figure>`;
    }

    const xMin = cfg.xrange?.[0] ?? -5;
    const xMax = cfg.xrange?.[1] ?? 5;
    const yMin = cfg.yrange?.[0] ?? null;
    const yMax = cfg.yrange?.[1] ?? null;
    const grid  = cfg.grid !== false;
    const roots = cfg.highlight_roots === true || cfg.highlight_roots === 'true';

    const svg = this._buildPlotSVG(fns, { xMin, xMax, yMin, yMax, grid, roots });

    return `<figure class="zolto-math-plot" data-id="${id}">
      ${title ? `<div class="zolto-math-title">${title}</div>` : ''}
      ${svg}
    </figure>`;
  }

  /**
   * Build an SVG plot from parsed function expressions.
   * @param {string[]} fns
   * @param {object}   opts
   * @returns {string}
   */
  _buildPlotSVG(fns, opts) {
    const W  = PLOT_DEFAULTS.width;
    const H  = PLOT_DEFAULTS.height;
    const P  = PLOT_DEFAULTS.padding;
    const N  = PLOT_DEFAULTS.samples;
    const iW = W - P * 2;
    const iH = H - P * 2;

    // Sample all functions
    const series = fns.map((fn, fi) => {
      const expr   = fn.replace(/^y\s*=\s*/, '');
      const colour = PLOT_DEFAULTS.colours[fi % PLOT_DEFAULTS.colours.length];
      const points = [];

      for (let i = 0; i <= N; i++) {
        const x = opts.xMin + (i / N) * (opts.xMax - opts.xMin);
        const y = this._evalExpr(expr, x);
        if (y !== null && isFinite(y)) points.push({ x, y });
      }

      return { expr, colour, points };
    });

    // Compute y range from samples
    const allY  = series.flatMap(s => s.points.map(p => p.y));
    const dataYMin = opts.yMin ?? (allY.length ? Math.min(...allY) : -5);
    const dataYMax = opts.yMax ?? (allY.length ? Math.max(...allY) : 5);
    const yRange   = dataYMax - dataYMin || 1;

    // Coordinate mappers
    const toSvgX = (x) => P + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * iW;
    const toSvgY = (y) => P + iH - ((y - dataYMin) / yRange) * iH;

    // ── Grid ──────────────────────────────────────────────
    let gridLines = '';
    if (opts.grid) {
      const xStep = this._niceStep((opts.xMax - opts.xMin) / 5);
      const yStep = this._niceStep(yRange / 5);

      for (let x = Math.ceil(opts.xMin / xStep) * xStep; x <= opts.xMax; x += xStep) {
        const sx = toSvgX(x).toFixed(1);
        gridLines += `<line class="zolto-grid-line" x1="${sx}" y1="${P}" x2="${sx}" y2="${P + iH}" />`;
      }
      for (let y = Math.ceil(dataYMin / yStep) * yStep; y <= dataYMax; y += yStep) {
        const sy = toSvgY(y).toFixed(1);
        gridLines += `<line class="zolto-grid-line" x1="${P}" y1="${sy}" x2="${P + iW}" y2="${sy}" />`;
      }
    }

    // ── Axes ──────────────────────────────────────────────
    const axisX = clamp(toSvgY(0), P, P + iH).toFixed(1);
    const axisY = clamp(toSvgX(0), P, P + iW).toFixed(1);
    const axes  = `
      <line class="zolto-axis-x" x1="${P}" y1="${axisX}" x2="${P + iW}" y2="${axisX}" />
      <line class="zolto-axis-y" x1="${axisY}" y1="${P}" x2="${axisY}" y2="${P + iH}" />
      <text class="zolto-tick-label" x="${P + iW + 4}" y="${parseFloat(axisX) + 4}">x</text>
      <text class="zolto-tick-label" x="${parseFloat(axisY) - 4}" y="${P - 4}" text-anchor="middle">y</text>
    `;

    // ── Axis tick labels ──────────────────────────────────
    let ticks = '';
    const xStep = this._niceStep((opts.xMax - opts.xMin) / 5);
    for (let x = Math.ceil(opts.xMin / xStep) * xStep; x <= opts.xMax; x += xStep) {
      if (Math.abs(x) < 0.001) continue;
      const sx = toSvgX(x).toFixed(1);
      ticks += `<text class="zolto-tick-label" x="${sx}" y="${parseFloat(axisX) + 14}"
                  text-anchor="middle">${this._fmt(x)}</text>`;
    }

    // ── Curve polylines ───────────────────────────────────
    const curves = series.map((s, si) => {
      if (s.points.length < 2) return '';

      // Break polyline at discontinuities (large jumps)
      const segments = [];
      let   current  = [];

      for (let i = 0; i < s.points.length; i++) {
        const p    = s.points[i];
        const prev = s.points[i - 1];
        const jump = prev && Math.abs(p.y - prev.y) > yRange * 0.5;

        if (jump && current.length > 1) {
          segments.push(current);
          current = [];
        }
        current.push(p);
      }
      if (current.length > 1) segments.push(current);

      return segments.map(seg => {
        const pts = seg
          .map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`)
          .join(' ');
        return `<polyline class="zolto-plot-curve zolto-plot-curve-${si}"
                  points="${pts}"
                  style="stroke:${s.colour}"
                  fill="none" stroke-width="2"
                  stroke-linejoin="round" stroke-linecap="round" />`;
      }).join('');
    }).join('');

    // ── Root markers ──────────────────────────────────────
    let rootDots = '';
    if (opts.roots) {
      for (const s of series) {
        for (let i = 1; i < s.points.length; i++) {
          const a = s.points[i - 1];
          const b = s.points[i];
          if (a.y * b.y < 0) {
            // Linear interpolation to root
            const rx = a.x - a.y * (b.x - a.x) / (b.y - a.y);
            const sx = toSvgX(rx).toFixed(1);
            const sy = toSvgY(0).toFixed(1);
            rootDots += `<circle class="zolto-plot-root" cx="${sx}" cy="${sy}" r="4"
                           style="fill:${s.colour}" />`;
          }
        }
      }
    }

    return `<svg class="zolto-plot-svg" viewBox="0 0 ${W} ${H}"
               xmlns="http://www.w3.org/2000/svg" role="img">
      <g class="zolto-plot-grid">${gridLines}</g>
      <g class="zolto-plot-axes">${axes}${ticks}</g>
      <g class="zolto-plot-curves">${curves}</g>
      <g class="zolto-plot-roots">${rootDots}</g>
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // Expression Evaluator (safe subset)
  // ─────────────────────────────────────────────────────────

  /**
   * Evaluate a simple math expression for a given x.
   * Uses a whitelist of safe functions.
   * Returns null on error.
   * @param {string} expr
   * @param {number} x
   * @returns {number | null}
   */
  _evalExpr(expr, x) {
    try {
      // Replace common math notation with JS equivalents
      const js = expr
        .replace(/\^/g, '**')
        .replace(/(\d)(x)/g, '$1*x')
        .replace(/Math\./g, '')          // strip existing Math. prefix
        .replace(/\bsin\b/g,   'Math.sin')
        .replace(/\bcos\b/g,   'Math.cos')
        .replace(/\btan\b/g,   'Math.tan')
        .replace(/\bsqrt\b/g,  'Math.sqrt')
        .replace(/\babs\b/g,   'Math.abs')
        .replace(/\bexp\b/g,   'Math.exp')
        .replace(/\bln\b/g,    'Math.log')
        .replace(/\blog\b/g,   'Math.log10')
        .replace(/\bpi\b/g,    'Math.PI')
        .replace(/\be\b/g,     'Math.E');

      // Security: only allow safe characters
      if (/[^0-9x+\-*/().Math_\s,]/.test(js.replace(/Math\.\w+/g, ''))) {
        return null;
      }

      // eslint-disable-next-line no-new-func
      const fn = new Function('x', `'use strict'; return ${js};`);
      const y  = fn(x);
      return typeof y === 'number' && isFinite(y) ? y : null;
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────

  /** Compute a "nice" step size for axis ticks. */
  _niceStep(rough) {
    const exponent = Math.floor(Math.log10(Math.abs(rough) || 1));
    const fraction = rough / Math.pow(10, exponent);
    const niceFrac = fraction < 1.5 ? 1
                   : fraction < 3   ? 2
                   : fraction < 7   ? 5
                   : 10;
    return niceFrac * Math.pow(10, exponent);
  }

  /** Format a number for axis labels. */
  _fmt(n) {
    if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)) {
      return n.toExponential(1);
    }
    return parseFloat(n.toPrecision(4)).toString();
  }

  /**
   * Produce a simple speech-friendly description of LaTeX.
   * Used for aria-label on math elements.
   * @param {string} latex
   * @returns {string}
   */
  _latexToSpeech(latex) {
    return latex
      .replace(/\\mathbf\{([^}]+)\}/g, 'bold $1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
      .replace(/\^(\w)/g, ' to the power $1')
      .replace(/\^{([^}]+)}/g, ' to the power $1')
      .replace(/_(\w)/g, ' subscript $1')
      .replace(/_{([^}]+)}/g, ' subscript $1')
      .replace(/\\([a-zA-Z]+)/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200); // truncate very long expressions
  }
}
