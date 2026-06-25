/**
 * js/renderer/renderer.js
 * Zolto v8.1.0 — ZoltoRenderer (Main Entry & Dispatcher)
 *
 * Pure function: given the same Document AST it always produces
 * the same HTML string. No DOM access, no mutable state.
 *
 * Architecture:
 *  - ZoltoRenderer.render(doc) → full HTML string
 *  - renderNode(node, ctx)     → per-node HTML fragment
 *  - Dispatches by node.type to sub-renderers
 *  - RenderContext threads theme tokens, component registry,
 *    equation counter, and footnotes through every call
 *
 * Sub-renderers (imported lazily to keep this file lean):
 *  - html-renderer.js     → Domain 1 (Markdown & typography)
 *  - math-renderer.js     → Domain 2 (MathBlock, MathInline)
 *  - diagram-renderer.js  → Domain 3 (all diagram types)
 *  - component-renderer.js → Domain 6 (ComponentUse)
 *
 * Charts, vector, and layout nodes are rendered inline here
 * (they share no complex sub-renderer state).
 */

'use strict';

import { ZOLTONodeTypes }          from '../parser/ast.js';
import { ZoltoComponentRuntime }   from '../parser/transformer.js';
import { escapeHtml, escapeAttr }  from '../utils/dom.js';
import { createLogger }            from '../utils/logger.js';

const logger = createLogger('Renderer');

// ─────────────────────────────────────────────────────────────
// 1. RenderContext
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} RenderContext
 * @property {string}   theme
 * @property {Record<string,string>} tokens    — CSS custom property overrides
 * @property {object}   componentRegistry      — ZoltoComponentRuntime ref
 * @property {Record<string,number>} mathIndex — label → equation number
 * @property {Record<string,object>} footnotes
 * @property {Record<string,string>} variables
 * @property {{ value: number }}     equationCounter — mutable, by reference
 * @property {Map<string,object>}    animationDefs
 * @property {number}                depth           — nesting guard
 * @property {ZoltoRenderer}         renderer        — back-reference
 */

/**
 * Create a fresh RenderContext for a document render.
 * @param {object} doc
 * @param {object} options
 * @returns {RenderContext}
 */
function createContext(doc, options) {
  return {
    theme:             options.theme             ?? 'dark',
    tokens:            doc.frontmatter?.tokens   ?? {},
    componentRegistry: ZoltoComponentRuntime,
    mathIndex:         doc.mathIndex             ?? {},
    footnotes:         doc.footnotes             ?? {},
    variables:         doc.variables             ?? {},
    equationCounter:   { value: 0 },
    animationDefs:     new Map(),
    depth:             0,
    renderer:          null, // set after construction
  };
}

// ─────────────────────────────────────────────────────────────
// 2. Custom Renderer Registry
//    Plugins can register custom node renderers here.
// ─────────────────────────────────────────────────────────────

/** @type {Map<string, (node: object, ctx: RenderContext) => string>} */
const _customRenderers = new Map();

// ─────────────────────────────────────────────────────────────
// 3. ZoltoRenderer
// ─────────────────────────────────────────────────────────────

export class ZoltoRenderer {
  /**
   * @param {object} [options]
   * @param {string}  [options.theme='dark']
   * @param {string}  [options.mathBackend='katex']
   * @param {boolean} [options.codeHighlight=true]
   * @param {boolean} [options.sanitize=true]
   * @param {string}  [options.footnoteMode='bottom']
   * @param {string}  [options.baseUrl='']
   * @param {object}  [options.hooks]
   */
  constructor(options = {}) {
    this.options = {
      theme:          options.theme          ?? 'dark',
      mathBackend:    options.mathBackend    ?? 'katex',
      codeHighlight:  options.codeHighlight  ?? true,
      sanitize:       options.sanitize       ?? true,
      footnoteMode:   options.footnoteMode   ?? 'bottom',
      baseUrl:        options.baseUrl        ?? '',
      hooks:          options.hooks          ?? {},
    };
  }

  // ── Static plugin API ────────────────────────────────────

  /**
   * Register a custom renderer for a node type.
   * @param {string}   type
   * @param {Function} fn   — (node, ctx) => string
   */
  static registerRenderer(type, fn) {
    _customRenderers.set(type, fn);
    logger.debug('Custom renderer registered for:', type);
  }

  /**
   * Unregister a custom renderer.
   * @param {string} type
   */
  static unregisterRenderer(type) {
    _customRenderers.delete(type);
  }

  // ── Public render methods ────────────────────────────────

  /**
   * Render a complete Document AST to an HTML string.
   * @param {object} doc — fully-transformed Document AST
   * @returns {string}
   */
  render(doc) {
    const ctx = createContext(doc, this.options);
    ctx.renderer = this;

    const parts = [];

    // Inject theme tokens as <style> block
    parts.push(this._renderThemeTokens(doc, ctx));

    // Render all document nodes
    for (const node of (doc.nodes ?? [])) {
      const html = this.renderNode(node, ctx);
      if (html) parts.push(html);
    }

    // Render footnotes at bottom
    if (this.options.footnoteMode === 'bottom' &&
        Object.keys(ctx.footnotes).length > 0) {
      parts.push(this._renderFootnotes(ctx));
    }

    return parts.join('\n');
  }

  /**
   * Render an array of nodes.
   * @param {object[]} nodes
   * @param {RenderContext} ctx
   * @returns {string}
   */
  renderNodes(nodes, ctx) {
    if (!Array.isArray(nodes)) return '';
    return nodes.map(n => this.renderNode(n, ctx)).filter(Boolean).join('\n');
  }

  /**
   * Render a single AST node to an HTML string.
   * @param {object}        node
   * @param {RenderContext} ctx
   * @returns {string}
   */
  renderNode(node, ctx) {
    if (!node) return '';

    // Depth guard
    if (ctx.depth > 32) {
      return this._errorNode('R007', node.line ?? 0,
        `Max nesting depth exceeded`, node.id);
    }

    // Before-render hook
    if (this.options.hooks.beforeRenderNode) {
      this.options.hooks.beforeRenderNode(node, ctx);
    }

    // Custom renderer override
    if (_customRenderers.has(node.type)) {
      try {
        return _customRenderers.get(node.type)(node, ctx);
      } catch (e) {
        logger.error('Custom renderer error for', node.type, e);
        return this._errorNode('R001', node.line ?? 0, e.message, node.id);
      }
    }

    let html = '';
    ctx.depth++;

    try {
      html = this._dispatch(node, ctx);
    } catch (e) {
      logger.error('Render error for node', node.type, e);
      html = this._errorNode('R001', node.line ?? 0, e.message, node.id);
    }

    ctx.depth--;

    // After-render hook
    if (this.options.hooks.afterRenderNode) {
      html = this.options.hooks.afterRenderNode(node, html, ctx) ?? html;
    }

    return html;
  }

  /**
   * Render to a live DOM container (incremental patching via virtual DOM).
   * @param {object}      doc
   * @param {HTMLElement} container
   */
  renderToCanvas(doc, container) {
    import('../preview/virtual-dom.js').then(({ patch }) => {
      const html = this.render(doc);
      patch(container, html);
    });
  }

  // ─────────────────────────────────────────────────────────
  // 4. Node Dispatcher
  // ─────────────────────────────────────────────────────────

  _dispatch(node, ctx) {
    switch (node.type) {

      // ── Domain 1: Markdown & Typography ──────────────────
      case ZOLTONodeTypes.HEADING:        return this._html().renderHeading(node, ctx);
      case ZOLTONodeTypes.PARAGRAPH:      return this._html().renderParagraph(node, ctx);
      case ZOLTONodeTypes.BLOCKQUOTE:     return this._html().renderBlockquote(node, ctx);
      case ZOLTONodeTypes.HORIZONTAL_RULE: return this._html().renderHR(node, ctx);
      case ZOLTONodeTypes.LIST:           return this._html().renderList(node, ctx);
      case ZOLTONodeTypes.TABLE:          return this._html().renderTable(node, ctx);
      case ZOLTONodeTypes.CODE_BLOCK:     return this._html().renderCodeBlock(node, ctx);
      case ZOLTONodeTypes.CALLOUT:        return this._html().renderCallout(node, ctx);
      case ZOLTONodeTypes.ADMONITION:     return this._html().renderAdmonition(node, ctx);
      case ZOLTONodeTypes.DETAILS:        return this._html().renderDetails(node, ctx);
      case ZOLTONodeTypes.ACCORDION:      return this._html().renderAccordion(node, ctx);
      case ZOLTONodeTypes.TABS:           return this._html().renderTabs(node, ctx);
      case ZOLTONodeTypes.CARD:           return this._html().renderCard(node, ctx);
      case ZOLTONodeTypes.CARD_GROUP:     return this._html().renderCardGroup(node, ctx);
      case ZOLTONodeTypes.STEPS:          return this._html().renderSteps(node, ctx);
      case ZOLTONodeTypes.HERO:           return this._html().renderHero(node, ctx);
      case ZOLTONodeTypes.EMBED:          return this._html().renderEmbed(node, ctx);
      case ZOLTONodeTypes.BANNER:         return this._html().renderBanner(node, ctx);
      case ZOLTONodeTypes.COLUMNS:        return this._html().renderColumns(node, ctx);

      // ── Domain 2: Mathematics ─────────────────────────────
      case ZOLTONodeTypes.MATH_BLOCK:     return this._math().renderMathBlock(node, ctx);
      case ZOLTONodeTypes.MATH_INLINE:    return this._math().renderMathInline(node, ctx);

      // ── Domain 3: Diagrams ────────────────────────────────
      case ZOLTONodeTypes.DIAGRAM:        return this._diagram().render(node, ctx);

      // ── Domain 4: Vector ──────────────────────────────────
      case ZOLTONodeTypes.VECTOR_SCENE:   return this._renderVectorScene(node, ctx);

      // ── Domain 5: Layouts ─────────────────────────────────
      case ZOLTONodeTypes.GRID:           return this._renderGrid(node, ctx);
      case ZOLTONodeTypes.FLEX:           return this._renderFlex(node, ctx);
      case ZOLTONodeTypes.CANVAS:         return this._renderCanvas(node, ctx);
      case ZOLTONodeTypes.WHITEBOARD:     return this._renderWhiteboard(node, ctx);
      case ZOLTONodeTypes.PRESENTATION:   return this._renderPresentation(node, ctx);
      case ZOLTONodeTypes.SPLIT:          return this._renderSplit(node, ctx);
      case ZOLTONodeTypes.PANEL:          return this._renderPanel(node, ctx);

      // ── Domain 6: Components ──────────────────────────────
      case ZOLTONodeTypes.COMPONENT_USE:  return this._component().render(node, ctx);
      case ZOLTONodeTypes.COMPONENT_DEF:  return ''; // Definitions don't render

      // ── Assessment ────────────────────────────────────────
      case ZOLTONodeTypes.MCQ:            return this._renderMCQ(node, ctx);
      case ZOLTONodeTypes.FLASHCARD:      return this._renderFlashcard(node, ctx);
      case ZOLTONodeTypes.QUIZ:           return this._renderQuiz(node, ctx);

      // ── Charts ────────────────────────────────────────────
      case ZOLTONodeTypes.CHART:          return this._renderChartWrapper(node, ctx);

      // ── Invisible / meta ──────────────────────────────────
      case ZOLTONodeTypes.COMMENT:        return '';
      case ZOLTONodeTypes.IMPORT:         return '';
      case ZOLTONodeTypes.THEME_BLOCK:    return '';
      case ZOLTONodeTypes.FOOTNOTE:       return ''; // Rendered at bottom

      // ── Error ─────────────────────────────────────────────
      case ZOLTONodeTypes.ERROR_NODE:     return this._renderErrorNode(node);

      default:
        logger.warn('Unknown node type:', node.type);
        return this._errorNode('R001', node.line ?? 0,
          `Unknown node type "${node.type}"`, node.id);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 5. Sub-Renderer Accessors (lazy singletons)
  // ─────────────────────────────────────────────────────────

  _html() {
    if (!this._htmlRenderer) {
      const { HTMLRenderer } = require('./html-renderer.js');
      this._htmlRenderer = new HTMLRenderer(this);
    }
    return this._htmlRenderer;
  }

  _math() {
    if (!this._mathRenderer) {
      const { MathRenderer } = require('./math-renderer.js');
      this._mathRenderer = new MathRenderer(this);
    }
    return this._mathRenderer;
  }

  _diagram() {
    if (!this._diagramRenderer) {
      const { DiagramRenderer } = require('./diagram-renderer.js');
      this._diagramRenderer = new DiagramRenderer(this);
    }
    return this._diagramRenderer;
  }

  _component() {
    if (!this._componentRenderer) {
      const { ComponentRenderer } = require('./component-renderer.js');
      this._componentRenderer = new ComponentRenderer(this);
    }
    return this._componentRenderer;
  }

  // ─────────────────────────────────────────────────────────
  // 6. Layout Renderers (inline — no separate sub-renderer)
  // ─────────────────────────────────────────────────────────

  _renderGrid(node, ctx) {
    const cfg      = node.config ?? {};
    const cols     = cfg.cols ?? 3;
    const gap      = cfg.gap  ?? '1rem';
    const children = this.renderNodes(node.children ?? [], ctx);
    const id       = escapeAttr(node.id);
    return `<div class="zolto-grid" data-id="${id}"
      style="--grid-cols:${cols}; --grid-gap:${escapeAttr(gap)}">${children}</div>`;
  }

  _renderFlex(node, ctx) {
    const cfg  = node.config ?? {};
    const id   = escapeAttr(node.id);
    const body = this.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-flex" data-id="${id}"
      style="--flex-direction:${escapeAttr(cfg.direction ?? 'row')};
             --flex-gap:${escapeAttr(cfg.gap ?? '1rem')};
             --flex-align:${escapeAttr(cfg.align ?? 'flex-start')};
             --flex-justify:${escapeAttr(cfg.justify ?? 'flex-start')}">${body}</div>`;
  }

  _renderCanvas(node, ctx) {
    const cfg  = node.config ?? {};
    const id   = escapeAttr(node.id);
    const body = this.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-canvas" data-id="${id}"
      data-grid="${cfg.grid ? 'true' : 'false'}"
      data-snap="${cfg.snap ? 'true' : 'false'}"
      style="--canvas-width:${escapeAttr(cfg.width ?? '100%')};
             --canvas-height:${escapeAttr(cfg.height ?? '480px')}">${body}</div>`;
  }

  _renderWhiteboard(node, ctx) {
    const id   = escapeAttr(node.id);
    const body = this.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-whiteboard" data-id="${id}" data-infinite="true">
      <div class="zolto-whiteboard-viewport">
        <div class="zolto-whiteboard-content">${body}</div>
      </div>
    </div>`;
  }

  _renderPresentation(node, ctx) {
    const cfg    = node.config ?? {};
    const id     = escapeAttr(node.id);
    const total  = (node.slides ?? []).length;
    const slides = (node.slides ?? []).map((slide, i) => {
      const slideHtml = this.renderNodes(slide.children ?? [], ctx);
      const isActive  = i === 0;
      return `<section class="zolto-slide${isActive ? ' zolto-slide-active' : ' zolto-slide-hidden'}"
               data-slide="${i}" data-layout="${escapeAttr(slide.layout ?? 'default')}"
               id="slide-${escapeAttr(id)}-${i}"
               aria-label="Slide ${i + 1} of ${total}"
               ${isActive ? '' : 'hidden'}>${slideHtml}</section>`;
    }).join('\n');

    return `<div class="zolto-presentation" data-id="${id}"
              data-theme="${escapeAttr(cfg.theme ?? '')}"
              data-total-slides="${total}">
      <div class="zolto-slide-deck">${slides}</div>
      <nav class="zolto-slide-nav" aria-label="Slide navigation">
        <button class="zolto-slide-prev" aria-label="Previous slide">‹</button>
        <span class="zolto-slide-counter" aria-live="polite">1 / ${total}</span>
        <button class="zolto-slide-next" aria-label="Next slide">›</button>
      </nav>
    </div>`;
  }

  _renderSplit(node, ctx) {
    const cfg      = node.config ?? {};
    const id       = escapeAttr(node.id);
    const ratio    = cfg.ratio ?? '50%';
    const dir      = cfg.direction === 'vertical' ? 'vertical' : 'horizontal';
    const children = node.children ?? [];
    const paneA    = this.renderNodes(children.slice(0, Math.floor(children.length / 2)), ctx);
    const paneB    = this.renderNodes(children.slice(Math.floor(children.length / 2)), ctx);
    return `<div class="zolto-split zolto-split-${dir}" data-id="${id}"
              style="--split-ratio:${escapeAttr(String(ratio))}">
      <div class="zolto-split-pane zolto-split-pane-a">${paneA}</div>
      <div class="zolto-split-handle" role="separator"
           aria-label="Resize panels" tabindex="0"></div>
      <div class="zolto-split-pane zolto-split-pane-b">${paneB}</div>
    </div>`;
  }

  _renderPanel(node, ctx) {
    const id       = escapeAttr(node.id);
    const title    = node.title ? escapeHtml(node.title) : '';
    const collapsed = node.collapsed ?? false;
    const body     = this.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-panel" data-id="${id}"
              data-collapsible="true"
              data-collapsed="${collapsed}">
      ${title ? `<div class="zolto-panel-header">
        <span class="zolto-panel-title">${title}</span>
        <button class="zolto-panel-toggle"
                aria-expanded="${!collapsed}"
                aria-label="${collapsed ? 'Expand' : 'Collapse'} panel">
          ${collapsed ? '+' : '−'}
        </button>
      </div>` : ''}
      <div class="zolto-panel-body">${body}</div>
    </div>`;
  }

  _renderVectorScene(node, ctx) {
    const id     = escapeAttr(node.id);
    const width  = node.width  ?? 800;
    const height = node.height ?? 600;
    return `<div class="zolto-vector" data-id="${id}"
              style="width:${width}px; height:${height}px">
      <svg class="zolto-vector-svg"
           width="${width}" height="${height}"
           viewBox="0 0 ${width} ${height}"
           xmlns="http://www.w3.org/2000/svg">
        <!-- Vector scene content rendered by vector-renderer -->
      </svg>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 7. Assessment Renderers
  // ─────────────────────────────────────────────────────────

  _renderMCQ(node, ctx) {
    const id          = escapeAttr(node.id);
    const question    = escapeHtml(node.question ?? '');
    const difficulty  = node.config?.difficulty ?? null;
    const diffBadge   = difficulty
      ? `<span class="zolto-mcq-difficulty" data-level="${escapeAttr(difficulty)}">${escapeHtml(difficulty)}</span>`
      : '';

    const options = (node.options ?? []).map((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      return `<div class="zolto-mcq-option" data-option="${i}" role="radio" aria-checked="false" tabindex="0">
        <span class="zolto-mcq-option-marker">${letter}</span>
        <span class="zolto-mcq-option-text">${escapeHtml(opt.text ?? '')}</span>
      </div>`;
    }).join('');

    const explanation = node.explanation
      ? `<div class="zolto-mcq-explanation">${escapeHtml(node.explanation)}</div>`
      : '';

    return `<div class="zolto-mcq" data-id="${id}">
      <div class="zolto-mcq-header">
        <div class="zolto-mcq-question">${question}</div>
        ${diffBadge}
      </div>
      <div class="zolto-mcq-options">${options}</div>
      ${explanation}
    </div>`;
  }

  _renderFlashcard(node, ctx) {
    const id    = escapeAttr(node.id);
    const front = escapeHtml(String(node.front ?? ''));
    const back  = escapeHtml(String(node.back  ?? ''));
    return `<div class="zolto-flashcard" data-id="${id}" role="button"
              aria-label="Flashcard — click to flip" tabindex="0">
      <div class="zolto-flashcard-inner">
        <div class="zolto-flashcard-front" aria-label="Front">${front}</div>
        <div class="zolto-flashcard-back"  aria-label="Back">${back}
          <span class="zolto-flashcard-hint" aria-hidden="true">Click to flip back</span>
        </div>
      </div>
    </div>`;
  }

  _renderQuiz(node, ctx) {
    const id       = escapeAttr(node.id);
    const children = this.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-quiz" data-id="${id}">${children}</div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 8. Chart Wrapper (SVG body provided by chart-renderer.js)
  // ─────────────────────────────────────────────────────────

  _renderChartWrapper(node, ctx) {
    const id    = escapeAttr(node.id);
    const type  = escapeAttr(node.chartType ?? 'bar');
    const title = node.config?.title ? escapeHtml(String(node.config.title)) : '';

    return `<figure class="zolto-chart zolto-chart-${type}" data-id="${id}">
      ${title ? `<div class="zolto-chart-title">${title}</div>` : ''}
      <svg class="zolto-chart-svg" viewBox="0 0 560 320" role="img"
           aria-label="${type} chart${title ? ': ' + title : ''}">
        <!-- Chart rendered by chart-renderer.js at runtime -->
        <text x="280" y="160" text-anchor="middle" class="zolto-tick-label">
          ${escapeHtml(type)} chart
        </text>
      </svg>
    </figure>`;
  }

  // ─────────────────────────────────────────────────────────
  // 9. Theme Token Injection
  // ─────────────────────────────────────────────────────────

  _renderThemeTokens(doc, ctx) {
    const tokens = ctx.tokens;
    if (!tokens || Object.keys(tokens).length === 0) return '';
    const vars = Object.entries(tokens)
      .map(([k, v]) => `  ${escapeHtml(k)}: ${escapeHtml(v)};`)
      .join('\n');
    return `<style id="zolto-document-tokens">:root {\n${vars}\n}</style>`;
  }

  // ─────────────────────────────────────────────────────────
  // 10. Footnotes Section
  // ─────────────────────────────────────────────────────────

  _renderFootnotes(ctx) {
    const footnotes = Object.values(ctx.footnotes);
    if (footnotes.length === 0) return '';

    const items = footnotes
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      .map(fn => {
        const num  = fn.number ?? '';
        const id   = escapeAttr(fn.id ?? '');
        const text = escapeHtml(fn.text ?? '');
        return `<li id="fn-${id}" class="zolto-footnote">
          ${text}
          <a href="#fnref-${id}" class="zolto-footnote-backref"
             aria-label="Back to content">↩</a>
        </li>`;
      }).join('\n');

    return `<aside class="zolto-footnotes" aria-label="Footnotes">
      <h2 class="zolto-footnotes-title" id="footnote-label">Footnotes</h2>
      <ol class="zolto-footnotes-list">${items}</ol>
    </aside>`;
  }

  // ─────────────────────────────────────────────────────────
  // 11. Error Node Rendering
  // ─────────────────────────────────────────────────────────

  _renderErrorNode(node) {
    return this._errorNode(node.code ?? 'R001', node.line ?? 0, node.message ?? 'Unknown error', node.id);
  }

  _errorNode(code, line, message, nodeId) {
    logger.warn(`[${code}] Line ${line}: ${message}`);
    return `<div class="zolto-error-node" role="alert" aria-live="assertive"
              data-code="${escapeAttr(code)}"
              data-node-id="${escapeAttr(nodeId ?? '')}"
              data-line="${line}">
      <span class="zolto-error-icon" aria-hidden="true">⚠</span>
      <span class="zolto-error-message">[${escapeHtml(code)}] ${escapeHtml(message)}</span>
      <code class="zolto-error-source">Line ${line} · ${escapeHtml(nodeId ?? '')}</code>
    </div>`;
  }
}

// ─────────────────────────────────────────────────────────────
// 12. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Convenience: render a Document AST to HTML.
 * @param {object} doc
 * @param {object} [options]
 * @returns {string}
 */
export function render(doc, options = {}) {
  return new ZoltoRenderer(options).render(doc);
}
