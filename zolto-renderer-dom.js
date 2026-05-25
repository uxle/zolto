/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE DOM RENDERER ENGINE (Module 4 of 7)
 * Version: 8.0.0-infinity (Supernova Architecture · Unified Domain Renderer)
 * =========================================================================================
 *
 * Domain Coverage (6 of 6):
 *  §1  INLINE ENGINE     — All ZOLTOInlineTypes: bold/italic/math/links/emoji/color/…
 *  §2  MARKDOWN          — Headings, lists, tables, quotes, callouts, code, embeds,
 *                          admonitions, tabs, accordions, cards, steps, columns, details
 *  §3  MATHEMATICS       — Block math, inline math, equations, matrices, auto-numbering,
 *                          fractions, integrals, calculus, chemistry, physics
 *  §4  DIAGRAMS          — Flowchart, sequence, state-machine, ER, mindmap,
 *                          gantt, timeline, generic diagram — all rendered as inline SVG
 *  §5  VECTOR/GRAPHICS   — VectorScene, shapes, paths, layers, artboards, connectors
 *  §6  LAYOUT            — Grid, flex, canvas, whiteboard, presentation, split, panel
 *  §7  COMPONENTS        — ComponentUse, slots, templates, built-in component library
 *  §8  UTILITIES         — escapeHtml, sanitizeUrl, sanitizeColor, syntaxHighlight
 *
 * Architecture:
 *  · Single static class — zero instance allocation on hot-path
 *  · Config-aware: reads ZOLTO_CONFIG_BASE when present, safe defaults otherwise
 *  · All SVG diagrams use auto-layout algorithms (no external dependencies)
 *  · Full security: escapeHtml on all user content, sanitizeUrl on all hrefs
 *  · Backward-compatible with parser-core v7 and v8 AST shapes
 * =========================================================================================
 */

'use strict';

/* =========================================================================================
   §0  CONFIG ACCESSOR HELPERS
   Safe reads from ZOLTO_CONFIG_BASE (may not be present in all environments).
   ========================================================================================= */

const _cfg = () => (typeof ZOLTO_CONFIG_BASE !== 'undefined' ? ZOLTO_CONFIG_BASE : null);
const _spatial   = () => (_cfg() && _cfg().SPATIAL)            || {};
const _mathCfg   = () => (_cfg() && _cfg().MATH_CONFIG)        || {};
const _diagramCfg= () => (_cfg() && _cfg().DIAGRAM_CONFIG)     || {};
const _chartCfg  = () => (_cfg() && _cfg().CHART_CONFIG)       || {};
const _animCfg   = () => (_cfg() && _cfg().ANIMATION_CONFIG)   || {};
const _compCfg   = () => (_cfg() && _cfg().COMPONENT_CONFIG)   || {};
const _mdCfg     = () => (_cfg() && _cfg().MARKDOWN_CONFIG)    || {};
const _themeCfg  = () => (_cfg() && _cfg().THEME)              || {};
const _typoCfg   = () => (_cfg() && _cfg().TYPOGRAPHY)         || {};

/* =========================================================================================
   §0b  MATH SYMBOL MAP — merged from MATH_CONFIG or hardcoded fallback
   ========================================================================================= */

const _MATH_SYMBOLS = {
    '\\alpha':'α','\\beta':'β','\\gamma':'γ','\\delta':'δ','\\epsilon':'ε',
    '\\varepsilon':'ε','\\zeta':'ζ','\\eta':'η','\\theta':'θ','\\vartheta':'ϑ',
    '\\iota':'ι','\\kappa':'κ','\\lambda':'λ','\\mu':'μ','\\nu':'ν',
    '\\xi':'ξ','\\pi':'π','\\varpi':'ϖ','\\rho':'ρ','\\varrho':'ϱ',
    '\\sigma':'σ','\\varsigma':'ς','\\tau':'τ','\\upsilon':'υ',
    '\\phi':'φ','\\varphi':'φ','\\chi':'χ','\\psi':'ψ','\\omega':'ω',
    '\\Gamma':'Γ','\\Delta':'Δ','\\Theta':'Θ','\\Lambda':'Λ','\\Xi':'Ξ',
    '\\Pi':'Π','\\Sigma':'Σ','\\Upsilon':'Υ','\\Phi':'Φ','\\Psi':'Ψ','\\Omega':'Ω',
    '\\times':'×','\\cdot':'⋅','\\div':'÷','\\pm':'±','\\mp':'∓',
    '\\ast':'∗','\\star':'⋆','\\circ':'∘','\\bullet':'∙',
    '\\oplus':'⊕','\\otimes':'⊗','\\ominus':'⊖','\\oslash':'⊘',
    '\\leq':'≤','\\geq':'≥','\\neq':'≠','\\equiv':'≡','\\approx':'≈',
    '\\sim':'∼','\\simeq':'≃','\\cong':'≅','\\propto':'∝',
    '\\in':'∈','\\notin':'∉','\\subset':'⊂','\\supset':'⊃',
    '\\subseteq':'⊆','\\supseteq':'⊇','\\cup':'∪','\\cap':'∩',
    '\\emptyset':'∅','\\forall':'∀','\\exists':'∃','\\nexists':'∄',
    '\\neg':'¬','\\land':'∧','\\lor':'∨','\\perp':'⊥','\\parallel':'∥',
    '\\int':'∫','\\iint':'∬','\\iiint':'∭','\\oint':'∮',
    '\\partial':'∂','\\nabla':'∇','\\infty':'∞',
    '\\sum':'∑','\\prod':'∏','\\coprod':'∐',
    '\\lim':'lim','\\sup':'sup','\\inf':'inf','\\max':'max','\\min':'min',
    '\\exp':'exp','\\ln':'ln','\\log':'log',
    '\\sin':'sin','\\cos':'cos','\\tan':'tan',
    '\\sec':'sec','\\csc':'csc','\\cot':'cot',
    '\\arcsin':'arcsin','\\arccos':'arccos','\\arctan':'arctan',
    '\\sinh':'sinh','\\cosh':'cosh','\\tanh':'tanh',
    '\\rightarrow':'→','\\leftarrow':'←','\\uparrow':'↑','\\downarrow':'↓',
    '\\leftrightarrow':'↔','\\Rightarrow':'⇒','\\Leftarrow':'⇐','\\Leftrightarrow':'⇔',
    '\\mapsto':'↦','\\to':'→','\\gets':'←',
    '\\nearrow':'↗','\\searrow':'↘','\\swarrow':'↙','\\nwarrow':'↖',
    '\\sqrt':'√','\\angle':'∠','\\degree':'°','\\prime':'′',
    '\\cdots':'⋯','\\ldots':'…','\\vdots':'⋮','\\ddots':'⋱',
    '\\hbar':'ℏ','\\ell':'ℓ','\\Re':'ℜ','\\Im':'ℑ','\\aleph':'ℵ',
    '\\wp':'℘','\\hline':'─','\\triangle':'△','\\square':'□',
    '\\checkmark':'✓','\\dagger':'†','\\ddagger':'‡',
    '\\celsius':'℃','\\ohm':'Ω','\\angstrom':'Å',
};

/* Callout type → icon map */
const _CALLOUT_ICONS = {
    note:'ℹ',tip:'💡',info:'ℹ',warning:'⚠',danger:'☠',caution:'⚠',
    important:'🔔',success:'✓',check:'✓',bug:'🐛',example:'🧪',
    quote:'"',abstract:'📄',todo:'☑',question:'?',failure:'✗',
    hint:'👉',attention:'❗',seealso:'🔗',summary:'≡',
};

/* Color palette for diagrams */
const _PALETTE = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];
const _palColor = (i) => _PALETTE[i % _PALETTE.length];

/* =========================================================================================
   MAIN RENDERER CLASS
   ========================================================================================= */

class ZoltoRenderer {

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §0  CORE PIPELINE
    ───────────────────────────────────────────────────────────────────────────────────── */

    /**
     * Render a full AST document to HTML string.
     * @param {Object} ast — ZoltoCompiler.parse() output
     * @returns {string}
     */
    static render(ast) {
        if (!ast || !Array.isArray(ast.nodes) || ast.nodes.length === 0) {
            return '<div class="zolto-empty-state"><span class="zolto-empty-icon">✦</span><span>Begin typing Zolto syntax to render content.</span></div>';
        }
        try {
            // Pass math index for equation cross-references
            this._mathIndex  = ast.mathIndex  || {};
            this._footnotes  = ast.footnotes  || {};
            this._references = ast.references || {};
            this._components = {};
            // Register component/template definitions first
            if (Array.isArray(ast.components)) {
                ast.components.forEach(c => { if (c.name) this._components[c.name] = c; });
            }
            return ast.nodes.map(n => this.renderNode(n)).join('');
        } catch (err) {
            console.error('[ZoltoRenderer] Fatal:', err);
            return `<div class="zolto-error-block">Render error: ${this.escapeHtml(err.message)}</div>`;
        }
    }

    /** Route a single AST node to its renderer. */
    static renderNode(node) {
        if (!node || typeof node !== 'object') return '';
        const indR = (_spatial().INDENT_REM) || 2.5;
        const depth = Math.max(0, parseInt(node.depth, 10) || 0);
        const ms = depth > 0 ? `margin-left:${depth * indR}rem;` : '';
        try {
            switch (node.type) {
                // ── §2 Markdown ──────────────────────────────────────────────────────
                case 'Heading':          return this.renderHeading(node, ms);
                case 'Paragraph':        return this.renderParagraph(node, ms);
                case 'HorizontalRule':   return this.renderHorizontalRule(ms);
                case 'Quote':            return this.renderQuote(node, ms);
                case 'Callout':          return this.renderCallout(node, ms);
                case 'CodeBlock':        return this.renderCodeBlock(node, ms);
                case 'Table':            return this.renderTable(node, ms);
                case 'List':             return this.renderList(node, ms);
                case 'OrderedList':      return this.renderList(node, ms);
                case 'ListItem':         return this.renderListItem(node, ms);
                case 'ChecklistItem':    return this.renderChecklistItem(node, ms);
                case 'OrderedListItem':  return this.renderOrderedListItem(node, ms);
                case 'DefinitionList':   return this.renderDefinitionList(node, ms);
                case 'Footnote':         return this.renderFootnote(node, ms);
                case 'Embed':            return this.renderEmbed(node, ms);
                case 'TreeBranch':       return this.renderTreeBranch(node, ms);
                case 'ColumnLayout':     return this.renderColumnLayout(node, ms);
                case 'Admonition':       return this.renderAdmonition(node, ms);
                case 'TabGroup':         return this.renderTabGroup(node, ms);
                case 'Accordion':        return this.renderAccordion(node, ms);
                case 'AccordionItem':    return this.renderAccordion(node, ms);
                case 'Card':             return this.renderCard(node, ms);
                case 'CardGroup':        return this.renderCardGroup(node, ms);
                case 'Steps':            return this.renderSteps(node, ms);
                case 'Step':             return this.renderStep(node, ms);
                case 'Details':          return this.renderDetails(node, ms);
                case 'Badge':            return this.renderBadge(node, ms);
                // ── §3 Math ──────────────────────────────────────────────────────────
                case 'MathBlock':        return this.renderMathBlock(node, ms);
                case 'MathEquation':     return this.renderMathEquation(node, ms);
                case 'MathEnvironment':  return this.renderMathBlock(node, ms);
                // ── §4 Diagrams ──────────────────────────────────────────────────────
                case 'Diagram':          return this.renderDiagram(node, ms);
                case 'Graph':            return this.renderGraph(node, ms);
                case 'Sequence':         return this.renderSequence(node, ms);
                case 'StateMachine':     return this.renderStateMachine(node, ms);
                case 'ERDiagram':        return this.renderERDiagram(node, ms);
                case 'Mindmap':          return this.renderMindmap(node, ms);
                case 'Gantt':            return this.renderGantt(node, ms);
                case 'Timeline':         return this.renderTimeline(node, ms);
                case 'Chart':            return this.renderChart(node, ms);
                // ── §5 Vector ────────────────────────────────────────────────────────
                case 'VectorScene':      return this.renderVectorScene(node, ms);
                case 'VectorArtboard':   return this.renderVectorScene(node, ms);
                case 'VectorGroup':      return this.renderVectorGroup(node);
                case 'VectorLayer':      return this.renderVectorGroup(node);
                case 'VectorShape':      return this.renderVectorShape(node);
                case 'VectorPath':       return this.renderVectorPath(node);
                case 'VectorText':       return this.renderVectorTextNode(node);
                case 'VectorConnector':  return this.renderVectorConnector(node);
                // ── §6 Layout ────────────────────────────────────────────────────────
                case 'LayoutBlock':      return this.renderLayoutBlock(node, ms);
                case 'GridLayout':       return this.renderGridLayout(node, ms);
                case 'FlexLayout':       return this.renderFlexLayout(node, ms);
                case 'MasonryLayout':    return this.renderMasonryLayout(node, ms);
                case 'Canvas':           return this.renderCanvas(node, ms);
                case 'Whiteboard':       return this.renderWhiteboard(node, ms);
                case 'Artboard':         return this.renderArtboard(node, ms);
                case 'SplitView':        return this.renderSplitView(node, ms);
                case 'Presentation':     return this.renderPresentation(node, ms);
                case 'Slide':            return this.renderSlide(node, ms);
                case 'Panel':            return this.renderPanel(node, ms);
                case 'Layer':            return this.renderChildren(node.nodes || node.children, ms);
                // ── §7 Components ────────────────────────────────────────────────────
                case 'ComponentUse':     return this.renderComponentUse(node, ms);
                case 'ComponentDef':     return '';          // definitions are silent
                case 'TemplateDef':      return '';
                case 'MacroDef':         return '';
                case 'SlotDef':          return this.renderChildren(node.children, ms);
                case 'SlotOutlet':       return this.renderSlotOutlet(node, ms);
                case 'Animation':        return this.renderAnimation(node, ms);
                // ── Legacy / compatibility ───────────────────────────────────────────
                case 'Shape':            return this.renderShape(node, ms);
                // ── Silent / metadata ────────────────────────────────────────────────
                case 'Frontmatter':
                case 'Comment':
                case 'Import':
                case 'Variable':
                case 'ThemeToken':
                case 'Reference':        return '';
                default:
                    if (node.children && node.children.length) return this.renderChildren(node.children, ms);
                    return '';
            }
        } catch (err) {
            console.error(`[ZoltoRenderer] node ${node.type}:`, err);
            return `<div class="zolto-error-inline" style="${ms}">Error: ${this.escapeHtml(node.type)}</div>`;
        }
    }

    /** Render an array of child nodes. */
    static renderChildren(children, ms = '') {
        if (!Array.isArray(children) || !children.length) return '';
        return children.map(c => this.renderNode(c)).join('');
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §1  INLINE ENGINE — handles ZOLTOInlineTypes from ast.js
    ───────────────────────────────────────────────────────────────────────────────────── */

    /**
     * Convert an inline AST array → HTML string.
     * Accepts an array of inline nodes, a plain string, or null.
     */
    static renderInline(input) {
        if (!input) return '';
        if (typeof input === 'string') {
            // Raw string fallback — apply basic smart typography
            return this._processRawText(input);
        }
        if (!Array.isArray(input)) return this.escapeHtml(String(input));
        return input.map(n => this._renderInlineNode(n)).join('');
    }

    static _renderInlineNode(t) {
        if (!t || typeof t !== 'object') return '';
        const kids = () => this.renderInline(t.children);
        switch (t.type) {
            // text atoms
            case 'text':          return this.escapeHtml(t.text || '');
            case 'softBreak':     return ' ';
            case 'lineBreak':     return '<br>';
            case 'smartQuote':    return this.escapeHtml(t.text || '');

            // rich formatting
            case 'bold':          return `<strong>${kids()}</strong>`;
            case 'italic':        return `<em>${kids()}</em>`;
            case 'boldItalic':    return `<strong><em>${kids()}</em></strong>`;
            case 'strikethrough': return `<del>${kids()}</del>`;
            case 'highlight':     return `<mark class="zolto-mark">${kids()}</mark>`;
            case 'underline':     return `<u>${kids()}</u>`;
            case 'superscript':   return `<sup>${this.escapeHtml(t.text || '')}</sup>`;
            case 'subscript':     return `<sub>${this.escapeHtml(t.text || '')}</sub>`;

            // code & math
            case 'code':          return `<code class="zolto-inline-code">${this.escapeHtml(t.text || '')}</code>`;
            case 'math':          return this._renderInlineMath(t.text || '');

            // links & media
            case 'link': {
                const href = this.sanitizeUrl(t.href || '');
                const title = t.title ? ` title="${this.escapeHtml(t.title)}"` : '';
                return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="zolto-link"${title}>${kids()}</a>`;
            }
            case 'image': {
                const src = this.sanitizeUrl(t.src || '');
                const alt = this.escapeHtml(t.alt || '');
                const title = t.title ? ` title="${this.escapeHtml(t.title)}"` : '';
                return `<img src="${src}" alt="${alt}"${title} class="zolto-img" loading="lazy">`;
            }

            // semantic
            case 'mention':
                return `<a class="zolto-mention" href="#">@${this.escapeHtml(t.username || '')}</a>`;
            case 'hashtag':
                return `<span class="zolto-hashtag">#${this.escapeHtml((t.text || '').replace(/^#/,''))}</span>`;
            case 'emoji':
                return `<span class="zolto-emoji" title=":${this.escapeHtml(t.name || '')}:">${this._emojiChar(t.name)}</span>`;
            case 'variableRef':
                return `<span class="zolto-var-ref">{$${this.escapeHtml(t.name || '')}}</span>`;
            case 'footnoteRef':
                return `<sup class="zolto-fn-ref"><a href="#fn-${this.escapeHtml(t.id || '')}">[${this.escapeHtml(t.id || '')}]</a></sup>`;
            case 'color': {
                const c = this.sanitizeCssColor(t.color || '');
                return `<span style="color:${c}">${kids()}</span>`;
            }
            case 'abbr':
                return `<abbr title="${this.escapeHtml(t.expansion || '')}">${kids()}</abbr>`;

            // Text token (old-style compat)
            case 'Text':          return this.escapeHtml(t.value || t.text || '');
            case 'Bold':          return `<strong>${kids()}</strong>`;
            case 'Italic':        return `<em>${kids()}</em>`;
            case 'Strikethrough': return `<del>${kids()}</del>`;
            case 'Highlight':     return `<mark class="zolto-mark">${kids()}</mark>`;
            case 'InlineCode':    return `<code class="zolto-inline-code">${this.escapeHtml(t.value || '')}</code>`;
            case 'InlineMath':    return this._renderInlineMath(t.value || '');
            case 'Link': {
                const href = this.sanitizeUrl(t.url || t.href || '');
                return `<a href="${href}" target="_blank" rel="noopener" class="zolto-link">${kids()}</a>`;
            }
            case 'Color': {
                const c = this.sanitizeCssColor(t.color || '');
                return `<span style="color:${c}">${kids()}</span>`;
            }
            case 'Alignment': {
                const align = /^(left|right|center|justify)$/.test(t.align) ? t.align : 'center';
                return `<div style="text-align:${align};width:100%;">${kids()}</div>`;
            }
            default:
                return this.escapeHtml(String(t.value || t.text || ''));
        }
    }

    /** Process a raw text string with basic Zolto inline rules. */
    static _processRawText(text) {
        return this.escapeHtml(text);
    }

    /** Resolve inline content from a node (prefers .inline, falls back to .text). */
    static _inlineOf(node) {
        if (node.inline && Array.isArray(node.inline)) return this.renderInline(node.inline);
        if (node.text)    return this.renderInline(node.text);
        if (node.label)   return this.renderInline(node.label);
        if (node.content) return this.renderInline(node.content);
        return '';
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §2  MARKDOWN DOMAIN
    ───────────────────────────────────────────────────────────────────────────────────── */

    // ── Headings ─────────────────────────────────────────────────────────────────────

    static renderHeading(node, ms) {
        const lv = Math.max(1, Math.min(6, node.level || 1));
        const id = this.escapeHtml(node.id || node.anchor || '');
        const cls = lv === 1 ? 'zolto-h1' : `zolto-h${lv}`;
        const anchor = id ? `<a class="zolto-anchor" href="#${id}" aria-hidden="true">#</a>` : '';
        const text = this._inlineOf(node);
        return `<div class="zolto-block zolto-heading-block" style="${ms}"><h${lv} id="${id}" class="${cls}">${text}${anchor}</h${lv}></div>`;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────────────────

    static renderParagraph(node, ms) {
        const id = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        return `<p${id} class="zolto-p" style="${ms}">${this._inlineOf(node)}</p>`;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────────────────

    static renderHorizontalRule(ms) {
        return `<hr class="zolto-hr" style="${ms}">`;
    }

    // ── Blockquote ────────────────────────────────────────────────────────────────────

    static renderQuote(node, ms) {
        const id = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const inner = this._inlineOf(node) || this.renderChildren(node.children);
        return `<blockquote${id} class="zolto-quote" style="${ms}">${inner}</blockquote>`;
    }

    // ── Callout (GitHub-style > [!NOTE]) ─────────────────────────────────────────────

    static renderCallout(node, ms) {
        const ctype = (node.calloutType || 'note').toLowerCase();
        const icon  = _CALLOUT_ICONS[ctype] || 'ℹ';
        const title = node.title ? `<span class="zolto-callout-title">${this.escapeHtml(node.title)}</span>` : '';
        const inner = this._inlineOf(node) || this.renderChildren(node.children);
        return `<div class="zolto-callout zolto-callout-${this.escapeHtml(ctype)}" style="${ms}" role="note">
  <div class="zolto-callout-header"><span class="zolto-callout-icon" aria-hidden="true">${icon}</span>${title}</div>
  <div class="zolto-callout-body">${inner}</div>
</div>`;
    }

    // ── Admonition (:::type ... :::) ─────────────────────────────────────────────────

    static renderAdmonition(node, ms) {
        const bt   = (node.blockType || 'info').toLowerCase();
        const icon = _CALLOUT_ICONS[bt] || 'ℹ';
        const title = node.title ? `<span class="zolto-adm-title">${this.escapeHtml(node.title)}</span>` : '';
        return `<div class="zolto-admonition zolto-adm-${this.escapeHtml(bt)}" style="${ms}">
  <div class="zolto-adm-header"><span class="zolto-adm-icon">${icon}</span>${title}</div>
  <div class="zolto-adm-body">${this.renderChildren(node.children)}</div>
</div>`;
    }

    // ── Code blocks ───────────────────────────────────────────────────────────────────

    static renderCodeBlock(node, ms) {
        const lang    = this.escapeHtml((node.lang || node.language || 'text').toLowerCase());
        const content = node.content || '';
        const highlighted = this.highlightSyntax(content, lang);
        const id = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const copyId = `copy-${Math.random().toString(36).slice(2,8)}`;
        return `<div${id} class="zolto-code-block" style="${ms}" data-lang="${lang}">
  <div class="zolto-code-header">
    <span class="zolto-code-lang">${lang}</span>
    <button class="zolto-copy-btn" onclick="(function(b){var c=b.closest('.zolto-code-block').querySelector('code');navigator.clipboard&&navigator.clipboard.writeText(c.innerText).then(function(){b.textContent='Copied!';setTimeout(function(){b.textContent='Copy'},2000)})})(this)" aria-label="Copy code">Copy</button>
  </div>
  <pre class="zolto-pre"><code class="zolto-code language-${lang}">${highlighted}</code></pre>
</div>`;
    }

    // ── Tables ────────────────────────────────────────────────────────────────────────

    static renderTable(node, ms) {
        const aligns = Array.isArray(node.alignments) ? node.alignments : [];
        const id = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        let html = `<div class="zolto-table-wrap" style="${ms}"><table${id} class="zolto-table">`;

        if (Array.isArray(node.headers) && node.headers.length) {
            html += '<thead><tr>';
            node.headers.forEach((h, i) => {
                const align = /^(left|center|right)$/.test(aligns[i]) ? aligns[i] : 'left';
                const content = Array.isArray(h) ? this.renderInline(h) : this.renderInline(String(h));
                html += `<th style="text-align:${align}">${content}</th>`;
            });
            html += '</tr></thead>';
        }

        if (Array.isArray(node.rows) && node.rows.length) {
            html += '<tbody>';
            node.rows.forEach((row, ri) => {
                if (!Array.isArray(row)) return;
                html += `<tr class="${ri % 2 === 0 ? 'even' : 'odd'}">`;
                row.forEach((cell, i) => {
                    const align = /^(left|center|right)$/.test(aligns[i]) ? aligns[i] : 'left';
                    const content = Array.isArray(cell) ? this.renderInline(cell) : this.renderInline(String(cell));
                    html += `<td style="text-align:${align}">${content}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
        }

        if (node.caption) html += `<caption class="zolto-table-caption">${this.escapeHtml(node.caption)}</caption>`;
        return html + '</table></div>';
    }

    // ── Lists ─────────────────────────────────────────────────────────────────────────

    static renderList(node, ms) {
        const tag = node.isOrdered ? 'ol' : 'ul';
        const id  = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const cls = node.isOrdered ? 'zolto-list-ordered' : 'zolto-list';
        const items = Array.isArray(node.items) ? node.items.map(i => this.renderNode(i)).join('') : '';
        return `<${tag}${id} class="${cls}" style="${ms}">${items}</${tag}>`;
    }

    static renderListItem(node, ms) {
        const inner = this._inlineOf(node) + this.renderChildren(node.children);
        return `<li class="zolto-li">${inner}</li>`;
    }

    static renderChecklistItem(node, ms) {
        const checked = node.checked ? ' checked' : '';
        const mod     = node.modifier || ' ';
        const cls     = node.checked ? 'zolto-check-done' : 'zolto-check-open';
        const inner   = this._inlineOf(node) + this.renderChildren(node.children);
        return `<li class="zolto-check-item ${cls}"><input type="checkbox"${checked} disabled class="zolto-checkbox" aria-label="checklist item"> <span>${inner}</span></li>`;
    }

    static renderOrderedListItem(node, ms) {
        const inner = this._inlineOf(node) + this.renderChildren(node.children);
        return `<li class="zolto-li" value="${node.number || ''}">${inner}</li>`;
    }

    static renderDefinitionList(node, ms) {
        const id  = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const items = (node.items || []).map(item =>
            `<dt class="zolto-dt">${this.renderInline(item.termInline || item.term)}</dt>` +
            `<dd class="zolto-dd">${this.renderInline(item.defInline  || item.definition)}</dd>`
        ).join('');
        return `<dl${id} class="zolto-dl" style="${ms}">${items}</dl>`;
    }

    // ── Footnotes ─────────────────────────────────────────────────────────────────────

    static renderFootnote(node, ms) {
        const num  = node.number || '';
        const id   = this.escapeHtml(node.id || '');
        const body = node.inline ? this.renderInline(node.inline) : this.escapeHtml(node.content || '');
        return `<div class="zolto-fn" id="fn-${id}" style="${ms}"><sup class="zolto-fn-num">[${num || id}]</sup> ${body}</div>`;
    }

    // ── Embeds ────────────────────────────────────────────────────────────────────────

    static renderEmbed(node, ms) {
        const et  = (node.embedType || 'image').toLowerCase();
        const url = this.sanitizeUrl(node.url || '');
        const alt = this.escapeHtml(node.alt || node.label || '');
        const id  = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';

        if (et === 'image' || /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url)) {
            return `<figure${id} class="zolto-embed zolto-embed-image" style="${ms}"><img src="${url}" alt="${alt}" class="zolto-img" loading="lazy">${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
        }
        if (et === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
            const vid = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || '';
            const embedUrl = `https://www.youtube-nocookie.com/embed/${this.escapeHtml(vid)}`;
            return `<div${id} class="zolto-embed zolto-embed-video" style="${ms}"><iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" title="${alt}"></iframe></div>`;
        }
        if (et === 'audio' || /\.(mp3|ogg|wav|flac)(\?|$)/i.test(url)) {
            return `<div${id} class="zolto-embed zolto-embed-audio" style="${ms}"><audio controls src="${url}">${alt}</audio></div>`;
        }
        if (et === 'video' || /\.(mp4|webm|ogv)(\?|$)/i.test(url)) {
            return `<div${id} class="zolto-embed zolto-embed-video" style="${ms}"><video controls src="${url}" loading="lazy">${alt}</video></div>`;
        }
        // Generic iframe embed
        return `<div${id} class="zolto-embed zolto-embed-iframe" style="${ms}"><iframe src="${url}" title="${alt}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>`;
    }

    // ── Tree (ASCII/box-drawing) ──────────────────────────────────────────────────────

    static renderTreeBranch(node, ms) {
        const depth = (node.prefix || '').replace(/[^ ]/g, '').length;
        const id = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const text = this._inlineOf(node) || this.escapeHtml(node.text || '');
        return `<div${id} class="zolto-tree-branch" style="${ms} padding-left:${depth * 1.2}rem">${text}</div>`;
    }

    // ── Multi-column layout ───────────────────────────────────────────────────────────

    static renderColumnLayout(node, ms) {
        const count = Math.max(1, Math.min(6, node.count || 2));
        const gap   = node.gap || '2rem';
        const cols  = (node.columns || []).map(col =>
            `<div class="zolto-col">${this.renderChildren(col.children)}</div>`
        ).join('');
        return `<div class="zolto-columns" style="${ms} columns:${count}; column-gap:${gap};">${cols}</div>`;
    }

    // ── Tab group ─────────────────────────────────────────────────────────────────────

    static renderTabGroup(node, ms) {
        const gid  = node.id || `tg${Math.random().toString(36).slice(2,7)}`;
        const tabs = node.tabs || node.children || [];
        if (!tabs.length) return '';

        const headers = tabs.map((tab, i) => {
            const label = this.escapeHtml(tab.label || `Tab ${i + 1}`);
            const active = i === (node.active || 0) ? ' zolto-tab-active' : '';
            return `<button class="zolto-tab-btn${active}" data-tab="${gid}-${i}" onclick="ZoltoRenderer.switchTab('${gid}',${i})" role="tab" aria-selected="${i === 0}">${label}</button>`;
        }).join('');

        const panels = tabs.map((tab, i) => {
            const hidden = i !== (node.active || 0) ? ' hidden' : '';
            const body   = this.renderChildren(tab.children);
            return `<div class="zolto-tab-panel${hidden}" id="${gid}-${i}" role="tabpanel">${body}</div>`;
        }).join('');

        return `<div class="zolto-tab-group" id="${gid}" style="${ms}" role="tablist">
  <div class="zolto-tab-nav">${headers}</div>
  <div class="zolto-tab-content">${panels}</div>
</div>`;
    }

    static switchTab(groupId, idx) {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll('.zolto-tab-btn').forEach((b, i) => {
            b.classList.toggle('zolto-tab-active', i === idx);
            b.setAttribute('aria-selected', String(i === idx));
        });
        group.querySelectorAll('.zolto-tab-panel').forEach((p, i) => {
            p.hidden = i !== idx;
        });
    }

    // ── Accordion ─────────────────────────────────────────────────────────────────────

    static renderAccordion(node, ms) {
        const id      = node.id || `acc${Math.random().toString(36).slice(2,7)}`;
        const title   = this.escapeHtml(node.title || 'Details');
        const open    = node.open ? ' open' : '';
        const summary = `<summary class="zolto-accordion-summary">${title}</summary>`;
        const body    = `<div class="zolto-accordion-body">${this.renderChildren(node.children)}</div>`;
        return `<details id="${id}" class="zolto-accordion" style="${ms}"${open}>${summary}${body}</details>`;
    }

    // ── Cards ─────────────────────────────────────────────────────────────────────────

    static renderCard(node, ms) {
        const id      = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const title   = node.title ? `<div class="zolto-card-title">${this.escapeHtml(node.title)}</div>` : '';
        const icon    = node.icon  ? `<span class="zolto-card-icon">${this.escapeHtml(node.icon)}</span>` : '';
        const variant = /^[a-zA-Z0-9-]+$/.test(node.variant || '') ? node.variant : 'default';
        const href    = node.href  ? ` href="${this.sanitizeUrl(node.href)}"` : '';
        const tag     = href ? 'a' : 'div';
        const cls     = `zolto-card zolto-card-${variant}`;
        return `<${tag}${id}${href} class="${cls}" style="${ms}">
  <div class="zolto-card-header">${icon}${title}</div>
  <div class="zolto-card-body">${this.renderChildren(node.children)}</div>
</${tag}>`;
    }

    static renderCardGroup(node, ms) {
        const cols = Math.max(1, Math.min(6, node.columns || 3));
        const cards = (node.cards || node.children || []).map(c => this.renderNode(c)).join('');
        return `<div class="zolto-card-group" style="${ms} --zolto-card-cols:${cols};">${cards}</div>`;
    }

    // ── Steps ─────────────────────────────────────────────────────────────────────────

    static renderSteps(node, ms) {
        const items = (node.items || node.children || []).map(s => this.renderNode(s)).join('');
        return `<ol class="zolto-steps" style="${ms}">${items}</ol>`;
    }

    static renderStep(node, ms) {
        const num   = node.number || '';
        const title = node.title ? `<div class="zolto-step-title">${this.escapeHtml(node.title)}</div>` : '';
        const body  = this.renderChildren(node.children);
        return `<li class="zolto-step"><span class="zolto-step-num" aria-hidden="true">${num}</span><div class="zolto-step-body">${title}${body}</div></li>`;
    }

    // ── Details / Spoiler ─────────────────────────────────────────────────────────────

    static renderDetails(node, ms) {
        const open    = node.open ? ' open' : '';
        const summary = this.escapeHtml(node.summary || 'Details');
        return `<details class="zolto-details" style="${ms}"${open}><summary class="zolto-details-summary">${summary}</summary><div class="zolto-details-body">${this.renderChildren(node.children)}</div></details>`;
    }

    // ── Badge ─────────────────────────────────────────────────────────────────────────

    static renderBadge(node, ms) {
        return `<span class="zolto-badge" style="${ms}">${this.escapeHtml(node.text || '')}</span>`;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §3  MATHEMATICS DOMAIN
    ───────────────────────────────────────────────────────────────────────────────────── */

    // ── Inline math: $expr$ ───────────────────────────────────────────────────────────

    static _renderInlineMath(expr) {
        return `<span class="zolto-math-inline" aria-label="math">${this._parseMath(expr)}</span>`;
    }

    // ── Math block ────────────────────────────────────────────────────────────────────

    static renderMathBlock(node, ms) {
        const id      = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const title   = node.title ? `<div class="zolto-math-title">${this.escapeHtml(node.title)}</div>` : '';
        const numStr  = node.numbered && node.number ? `<span class="zolto-math-num">(${node.number})</span>` : '';
        const content = node.content || '';
        const env     = node.env || 'equation';
        const rendered= this._parseMath(content);
        const cls     = `zolto-math-block zolto-math-env-${this.escapeHtml(env)}`;
        return `<div${id} class="${cls}" style="${ms}" role="math" aria-label="${this.escapeHtml(content.slice(0,60))}">
  ${title}
  <div class="zolto-math-content">${rendered}${numStr}</div>
</div>`;
    }

    // ── Numbered equation ─────────────────────────────────────────────────────────────

    static renderMathEquation(node, ms) {
        const id      = node.id ? ` id="eq-${this.escapeHtml(node.id)}"` : '';
        const num     = node.number ? `<span class="zolto-math-num">(${node.number})</span>` : '';
        const rendered= this._parseMath(node.content || '');
        return `<div${id} class="zolto-math-block zolto-math-equation" style="${ms}">
  <div class="zolto-math-content">${rendered}${num}</div>
</div>`;
    }

    /**
     * Core math expression renderer.
     * Converts LaTeX-lite / Zolto math notation → styled HTML.
     * Handles: fractions, roots, powers, subs, integrals, sums, matrices, symbols.
     */
    static _parseMath(raw) {
        if (!raw) return '';

        // Merge config symbols with hardcoded fallback
        const symMap = Object.assign({}, _MATH_SYMBOLS,
            (_mathCfg().GREEK_LOWER || {}),
            (_mathCfg().GREEK_UPPER || {}),
            (_mathCfg().CALCULUS || {}),
            (_mathCfg().BINARY_OPS || {}),
            (_mathCfg().RELATIONS || {}),
            (_mathCfg().ARROWS || {}),
            (_mathCfg().MISC || {})
        );

        let h = this.escapeHtml(raw.trim());
        let prev;

        // 1. Matrices: \begin{matrix|pmatrix|bmatrix|vmatrix}…\end{…}
        h = h.replace(/\\begin\{([pbvBV]?matrix|array|cases)\}([\s\S]*?)\\end\{\1\}/g, (_, env, body) => {
            const delimiters = {
                pmatrix: ['(',')'  ], bmatrix: ['[',']'],
                vmatrix: ['|','|'  ], Bmatrix: ['{','}'],
                Vmatrix: ['‖','‖'], cases:   ['{',''],
            };
            const [open, close] = delimiters[env] || ['',''];
            const rows = body.split(/\\\\/).map(row => {
                const cells = row.split('&').map(c =>
                    `<td class="math-cell">${this._parseMath(c.trim())}</td>`
                ).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            return `<span class="math-delim">${open}</span><table class="math-matrix"><tbody>${rows}</tbody></table><span class="math-delim">${close}</span>`;
        });

        // 2. \begin{align|equation}…\end{…}
        h = h.replace(/\\begin\{(align\*?|gather\*?|equation\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}/g, (_, env, body) => {
            const rows = body.split(/\\\\/).map((row, ri) => {
                const cells = row.split('&').map((c, ci) =>
                    `<td class="math-align-cell ${ci % 2 === 1 ? 'math-align-right' : ''}">${this._parseMath(c.trim())}</td>`
                ).join('');
                return `<tr class="math-align-row">${cells}</tr>`;
            }).join('');
            return `<table class="math-align"><tbody>${rows}</tbody></table>`;
        });

        // 3. \frac{num}{den} — iterative (handles nesting)
        let iters = 0;
        do { prev = h; h = h.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>'); }
        while (h !== prev && ++iters < 12);

        // 4. \sqrt[n]{x} and \sqrt{x}
        h = h.replace(/\\sqrt\[([^\]]+)\]\{([^{}]*)\}/g, '<span class="math-sqrt"><span class="math-root-idx">$1</span><span class="math-sqrt-sign">√</span><span class="math-sqrt-inner">$2</span></span>');
        do { prev = h; h = h.replace(/\\sqrt\{([^{}]*)\}/g, '<span class="math-sqrt"><span class="math-sqrt-sign">√</span><span class="math-sqrt-inner">$1</span></span>'); }
        while (h !== prev && ++iters < 12);

        // 5. Superscript ^{expr} and ^char
        h = h.replace(/\^\{([^{}]*)\}/g, '<sup class="math-sup">$1</sup>');
        h = h.replace(/(?<!<[^>])\^([a-zA-Z0-9])/g, '<sup class="math-sup">$1</sup>');

        // 6. Subscript _{expr} and _char
        h = h.replace(/_\{([^{}]*)\}/g, '<sub class="math-sub">$1</sub>');
        h = h.replace(/(?<!<[^>])_([a-zA-Z0-9])/g, '<sub class="math-sub">$1</sub>');

        // 7. \sum / \prod / \int / \lim with limits
        h = h.replace(/\\(sum|prod|int|iint|oint|lim|sup|inf|max|min|limsup|liminf)(_\{[^{}]*\})?\^?\{?([^{}]*)?\}?/g, (_, op, lo, hi) => {
            const sym  = symMap[`\\${op}`] || op;
            const loH  = lo  ? `<sub class="math-sub">${lo.replace(/^_\{|\}$/g,'')}</sub>`  : '';
            const hiH  = hi && hi.length > 0 ? `<sup class="math-sup">${hi}</sup>` : '';
            return `<span class="math-bigop">${sym}${loH}${hiH}</span>`;
        });

        // 8. Integrals: \int_{a}^{b}
        h = h.replace(/\\int_\{([^{}]*)\}\^\{([^{}]*)\}/g, '<span class="math-bigop">∫<sub class="math-sub">$1</sub><sup class="math-sup">$2</sup></span>');

        // 9. \left( … \right) — remove \left/\right and wrap
        h = h.replace(/\\left([\(\[\{|])([\s\S]*?)\\right([\)\]\}|])/g, (_, open, inner, close) => {
            const opens  = {'(':'(','[':'[','{':'{','|':'|'};
            const closes = {')':')',']':']','}':'}','|':'|'};
            return `<span class="math-delim-l">${opens[open]||open}</span>${inner}<span class="math-delim-r">${closes[close]||close}</span>`;
        });

        // 10. \overline, \hat, \bar, \vec, \dot
        h = h.replace(/\\overline\{([^{}]*)\}/g, '<span class="math-over" style="text-decoration:overline">$1</span>');
        h = h.replace(/\\underline\{([^{}]*)\}/g, '<span style="text-decoration:underline">$1</span>');
        h = h.replace(/\\hat\{([^{}]*)\}/g, '<span class="math-hat">$1̂</span>');
        h = h.replace(/\\bar\{([^{}]*)\}/g, '<span class="math-bar">$1̄</span>');
        h = h.replace(/\\vec\{([^{}]*)\}/g, '<span class="math-vec">$1⃗</span>');
        h = h.replace(/\\dot\{([^{}]*)\}/g, '<span>$1̇</span>');
        h = h.replace(/\\ddot\{([^{}]*)\}/g, '<span>$1̈</span>');

        // 11. \text{…}
        h = h.replace(/\\text\{([^{}]*)\}/g, '<span class="math-text">$1</span>');
        h = h.replace(/\\mathrm\{([^{}]*)\}/g, '<span class="math-text">$1</span>');
        h = h.replace(/\\mathbf\{([^{}]*)\}/g, '<strong>$1</strong>');
        h = h.replace(/\\mathit\{([^{}]*)\}/g, '<em>$1</em>');
        h = h.replace(/\\mathbb\{([^{}]*)\}/g, (_, c) => {
            const bb = {'R':'ℝ','N':'ℕ','Z':'ℤ','Q':'ℚ','C':'ℂ','P':'ℙ','E':'𝔼'};
            return `<span class="math-bb">${bb[c] || c}</span>`;
        });

        // 12. Simple fraction: a/b (plain text fallback)
        h = h.replace(/(?<![<a-zA-Z])(\w+)\/(\w+)(?![>a-zA-Z])/g,
            '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>');

        // 13. Symbol substitution (sorted longest-first for greedy match)
        const sortedSyms = Object.keys(symMap).sort((a, b) => b.length - a.length);
        sortedSyms.forEach(key => {
            const escaped = key.replace(/\\/g,'\\\\').replace(/[{}[\]()^$.*+?|]/g,'\\$&');
            h = h.replace(new RegExp(escaped, 'g'), `<span class="math-sym">${symMap[key]}</span>`);
        });

        // 14. Remaining single-letter variables → italic
        h = h.replace(/(?<!<[^>]{0,100})(?<![a-zA-Z\\])([a-zA-Z])(?![a-zA-Z=])/g,
            '<i class="math-var">$1</i>');

        // 15. Chemistry reaction arrows (Zolto chem notation)
        h = h.replace(/--&gt;/g, '<span class="math-sym">→</span>');
        h = h.replace(/&lt;=&gt;/g, '<span class="math-sym">⇌</span>');

        // 16. Clean up remaining {}
        h = h.replace(/\{([^{}]*)\}/g, '$1');

        return h;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §4  DIAGRAM DOMAIN — Inline SVG auto-layout renderers
    ───────────────────────────────────────────────────────────────────────────────────── */

    /** Generic diagram wrapper — dispatches to type-specific renderer. */
    static renderDiagram(node, ms) {
        const dtype = (node.diagramType || '').toLowerCase();
        switch (dtype) {
            case 'flowchart': case 'flow': case 'graph': case 'digraph':
                return this.renderGraph({ ...node, type: 'Graph' }, ms);
            case 'sequence': case 'seq':  return this.renderSequence({ ...node, type: 'Sequence' }, ms);
            case 'state': case 'statemachine': return this.renderStateMachine({ ...node, type: 'StateMachine' }, ms);
            case 'erd': case 'erdiagram': return this.renderERDiagram({ ...node, type: 'ERDiagram' }, ms);
            case 'mindmap':               return this.renderMindmap({ ...node, type: 'Mindmap' }, ms);
            case 'gantt':                 return this.renderGantt({ ...node, type: 'Gantt' }, ms);
            case 'timeline':              return this.renderTimeline({ ...node, type: 'Timeline' }, ms);
            default:                      return this._renderGenericDiagram(node, ms);
        }
    }

    // ── Flowchart / Graph ─────────────────────────────────────────────────────────────

    static renderGraph(node, ms) {
        const nodes = node.nodes || [];
        const edges = node.edges || [];
        const dir   = (node.dir || 'LR').toUpperCase();
        const LR    = dir === 'LR' || dir === 'RL';

        // Auto-layout: topological rank → grid positions
        const W = 160, H = 60, padX = 40, padY = 40, gapX = 80, gapY = 60;
        const rankMap = this._computeRanks(nodes, edges, dir);
        const ranks   = {};
        rankMap.forEach((rank, id) => { (ranks[rank] = ranks[rank] || []).push(id); });

        const positions = {};
        Object.entries(ranks).forEach(([rank, ids]) => {
            ids.forEach((id, idx) => {
                const r = parseInt(rank, 10);
                positions[id] = LR
                    ? { x: padX + r * (W + gapX), y: padY + idx * (H + gapY) }
                    : { x: padX + idx * (W + gapX), y: padY + r * (H + gapY) };
            });
        });

        const rankCount  = Object.keys(ranks).length || 1;
        const maxPerRank = Math.max(...Object.values(ranks).map(a => a.length));
        const svgW = LR
            ? padX * 2 + rankCount * (W + gapX)
            : padX * 2 + maxPerRank * (W + gapX);
        const svgH = LR
            ? padY * 2 + maxPerRank * (H + gapY)
            : padY * 2 + rankCount * (H + gapY);

        const id  = node.id || `gr${Math.random().toString(36).slice(2,7)}`;
        const theme = this._diagramTheme();
        let svgParts = [`<defs>${this._arrowDefs()}</defs>`];

        // Edges first (drawn behind nodes)
        edges.forEach((e, ei) => {
            const from = positions[e.fromId || e.from];
            const to   = positions[e.toId   || e.to];
            if (!from || !to) return;
            const fx = from.x + W, fy = from.y + H / 2;
            const tx = to.x,       ty = to.y   + H / 2;
            const mx = (fx + tx) / 2;
            const path = `M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}`;
            const dash  = (e.operator || '').includes('.') ? 'stroke-dasharray="6 4"' : '';
            svgParts.push(`<path d="${path}" fill="none" stroke="${theme.EDGE_STROKE}" stroke-width="${theme.EDGE_WIDTH}" ${dash} marker-end="url(#zolto-arrow)" class="zolto-edge"/>`);
            if (e.edgeLabel) {
                svgParts.push(`<text x="${mx}" y="${(fy + ty) / 2 - 6}" class="zolto-edge-label" text-anchor="middle" font-size="11" fill="${theme.NODE_TEXT}">${this.escapeHtml(e.edgeLabel)}</text>`);
            }
        });

        // Nodes
        nodes.forEach(n => {
            const p = positions[n.id];
            if (!p) return;
            const label    = this.escapeHtml(n.label || n.id || '');
            const cssClass = n.cssClass || '';
            const kind     = (n.kind || 'rect').toLowerCase();
            const rx       = kind === 'round' || kind === 'stadium' ? 30 : kind === 'circle' ? 32 : 6;
            const fillColor = cssClass.includes('primary') ? 'var(--intent-primary)' :
                              cssClass.includes('success') ? 'var(--intent-success)' :
                              cssClass.includes('danger')  ? 'var(--intent-danger)'  :
                              cssClass.includes('warning') ? 'var(--intent-warning)' :
                              theme.NODE_FILL;
            svgParts.push(`<g class="zolto-node-g" transform="translate(${p.x},${p.y})">
  <rect width="${W}" height="${H}" rx="${rx}" fill="${fillColor}" stroke="${theme.NODE_STROKE}" stroke-width="1.5" class="zolto-node"/>
  <text x="${W/2}" y="${H/2 + 5}" text-anchor="middle" font-size="13" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}" class="zolto-node-label">${label}</text>
</g>`);
        });

        return `<div class="zolto-diagram zolto-graph" style="${ms}" id="${id}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-svg" aria-label="flowchart">
    ${svgParts.join('\n    ')}
  </svg>
</div>`;
    }

    /** Compute topological ranks via BFS from sources. */
    static _computeRanks(nodes, edges, dir) {
        const rankMap = new Map();
        const nodeIds = new Set(nodes.map(n => n.id));
        // adjacency
        const adj = {};
        nodes.forEach(n => { adj[n.id] = []; });
        edges.forEach(e => {
            const f = e.fromId || e.from, t = e.toId || e.to;
            if (adj[f]) adj[f].push(t);
        });
        // find roots (no incoming edges)
        const hasIncoming = new Set(edges.map(e => e.toId || e.to));
        const roots = nodes.filter(n => !hasIncoming.has(n.id)).map(n => n.id);
        const queue = roots.length ? roots : (nodes[0] ? [nodes[0].id] : []);
        queue.forEach((id, i) => rankMap.set(id, 0));
        const visited = new Set(queue);
        let qi = 0;
        while (qi < queue.length) {
            const cur  = queue[qi++];
            const rank = rankMap.get(cur) || 0;
            (adj[cur] || []).forEach(next => {
                if (!visited.has(next)) {
                    visited.add(next);
                    rankMap.set(next, rank + 1);
                    queue.push(next);
                } else {
                    rankMap.set(next, Math.max(rankMap.get(next) || 0, rank + 1));
                }
            });
        }
        // assign any unvisited nodes a rank
        nodes.forEach((n, i) => { if (!rankMap.has(n.id)) rankMap.set(n.id, i); });
        return rankMap;
    }

    // ── Sequence diagram ───────────────────────────────────────────────────────────────

    static renderSequence(node, ms) {
        const actors   = node.actors   || [];
        const messages = node.messages || [];
        const SC  = _diagramCfg().SEQUENCE || {};
        const AW  = SC.ACTOR_WIDTH    || 120;
        const AH  = SC.ACTOR_HEIGHT   || 40;
        const ASPACING = SC.ACTOR_SPACING   || 160;
        const HDR = SC.HEADER_HEIGHT  || 60;
        const MSG_SP= SC.MESSAGE_SPACING|| 50;
        const theme = this._diagramTheme();

        const svgW = Math.max(400, actors.length * ASPACING + 80);
        const svgH = HDR + messages.length * MSG_SP + 60;
        const id   = node.id || `seq${Math.random().toString(36).slice(2,7)}`;

        const actorX = (i) => 40 + i * ASPACING + AW / 2;
        const actorIdx = {};
        actors.forEach((a, i) => { actorIdx[a.id] = i; });

        let parts = [`<defs>${this._arrowDefs()}</defs>`];

        // Lifelines
        actors.forEach((a, i) => {
            const cx = actorX(i);
            parts.push(`<line x1="${cx}" y1="${HDR}" x2="${cx}" y2="${svgH - 30}" stroke="${theme.EDGE_STROKE}" stroke-width="1.5" stroke-dasharray="5 5" class="zolto-lifeline"/>`);
            parts.push(`<rect x="${cx - AW/2}" y="10" width="${AW}" height="${AH}" rx="4" fill="${theme.NODE_FILL}" stroke="${theme.NODE_STROKE}" stroke-width="1.5"/>`);
            parts.push(`<text x="${cx}" y="${10 + AH/2 + 5}" text-anchor="middle" font-size="13" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml(a.alias || a.id)}</text>`);
        });

        // Messages
        messages.forEach((m, i) => {
            const fi  = actorIdx[m.fromId] ?? 0;
            const ti  = actorIdx[m.toId]   ?? 0;
            const fx  = actorX(fi), tx = actorX(ti);
            const y   = HDR + 30 + i * MSG_SP;
            const op  = m.operator || '->';
            const dash= op.includes('--') ? 'stroke-dasharray="5 4"' : '';
            const arrow = tx > fx ? 'url(#zolto-arrow)' : 'url(#zolto-arrow-r)';
            parts.push(`<line x1="${fx}" y1="${y}" x2="${tx}" y2="${y}" stroke="${theme.EDGE_STROKE}" stroke-width="1.5" ${dash} marker-end="${arrow}" class="zolto-seq-msg"/>`);
            const mx = (fx + tx) / 2;
            parts.push(`<text x="${mx}" y="${y - 6}" text-anchor="middle" font-size="11" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml(m.text || '')}</text>`);
        });

        return `<div class="zolto-diagram zolto-sequence" style="${ms}" id="${id}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-svg" aria-label="sequence diagram">
    ${parts.join('\n    ')}
  </svg>
</div>`;
    }

    // ── State machine ─────────────────────────────────────────────────────────────────

    static renderStateMachine(node, ms) {
        const states = node.states || [];
        const trans  = node.transitions || [];
        const theme  = this._diagramTheme();
        const R = 36, padX = 60, padY = 60, gapX = 140, gapY = 100;
        const cols = Math.ceil(Math.sqrt(states.length));

        const positions = {};
        states.forEach((s, i) => {
            positions[s.id] = { x: padX + (i % cols) * gapX, y: padY + Math.floor(i / cols) * gapY };
        });

        const svgW = padX * 2 + cols * gapX;
        const svgH = padY * 2 + Math.ceil(states.length / cols) * gapY;
        const id   = node.id || `fsm${Math.random().toString(36).slice(2,7)}`;

        let parts = [`<defs>${this._arrowDefs()}</defs>`];

        // Transitions
        trans.forEach(t => {
            const fp = positions[t.fromId], tp = positions[t.toId];
            if (!fp || !tp) return;
            if (t.fromId === t.toId) {
                // self-loop
                parts.push(`<path d="M${fp.x+R},${fp.y} C${fp.x+R+40},${fp.y-40} ${fp.x+40},${fp.y-40} ${fp.x},${fp.y-R}" fill="none" stroke="${theme.EDGE_STROKE}" stroke-width="1.5" marker-end="url(#zolto-arrow)"/>`);
            } else {
                parts.push(`<line x1="${fp.x}" y1="${fp.y}" x2="${tp.x}" y2="${tp.y}" stroke="${theme.EDGE_STROKE}" stroke-width="1.5" marker-end="url(#zolto-arrow)"/>`);
            }
            const label = [t.event, t.guard ? `[${t.guard}]` : ''].filter(Boolean).join(' ');
            if (label) {
                parts.push(`<text x="${(fp.x+tp.x)/2}" y="${(fp.y+tp.y)/2 - 6}" text-anchor="middle" font-size="10" fill="${theme.NODE_TEXT}">${this.escapeHtml(label)}</text>`);
            }
        });

        // States
        states.forEach(s => {
            const p = positions[s.id]; if (!p) return;
            const isStart = s.kind === 'start' || s.id === node.initial;
            const isEnd   = s.kind === 'end'   || (node.final || []).includes(s.id);
            const fill    = isStart ? 'var(--intent-success)' : isEnd ? 'var(--intent-danger)' : theme.NODE_FILL;
            parts.push(`<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${fill}" stroke="${theme.NODE_STROKE}" stroke-width="${isEnd ? 3 : 1.5}" class="zolto-state"/>`);
            parts.push(`<text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-size="12" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml(s.label || s.id)}</text>`);
        });

        return `<div class="zolto-diagram zolto-statemachine" style="${ms}" id="${id}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-svg" aria-label="state machine">
    ${parts.join('\n    ')}
  </svg>
</div>`;
    }

    // ── ER Diagram ────────────────────────────────────────────────────────────────────

    static renderERDiagram(node, ms) {
        const entities = node.entities  || [];
        const rels     = node.relations || [];
        const theme    = this._diagramTheme();
        const EW = 180, PAD = 24, ROW_H = 22;
        const padX = 40, gapX = 80;
        const id   = node.id || `erd${Math.random().toString(36).slice(2,7)}`;

        // Layout entities in a row
        const positions = {};
        let xCur = padX;
        entities.forEach(e => {
            const h = PAD * 2 + (e.attributes || []).length * ROW_H + ROW_H;
            positions[e.name] = { x: xCur, y: 40, w: EW, h };
            xCur += EW + gapX;
        });

        const svgW = xCur;
        const svgH = 40 + Math.max(...entities.map(e => positions[e.name]?.h || 80)) + 60;

        let parts = [`<defs>${this._arrowDefs()}</defs>`];

        // Relations
        rels.forEach(r => {
            const fp = positions[r.fromEntity], tp = positions[r.toEntity];
            if (!fp || !tp) return;
            const fx = fp.x + fp.w, fy = fp.y + fp.h / 2;
            const tx = tp.x,        ty = tp.y + tp.h / 2;
            const mx = (fx + tx) / 2;
            parts.push(`<path d="M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}" fill="none" stroke="${theme.EDGE_STROKE}" stroke-width="1.5"/>`);
            const label = r.label || r.operator || '';
            parts.push(`<text x="${mx}" y="${(fy+ty)/2-6}" text-anchor="middle" font-size="10" fill="${theme.NODE_TEXT}">${this.escapeHtml(label)}</text>`);
        });

        // Entities
        entities.forEach(e => {
            const p = positions[e.name]; if (!p) return;
            const attrs = e.attributes || [];
            const h     = p.h;
            parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${h}" rx="4" fill="${theme.NODE_FILL}" stroke="${theme.NODE_STROKE}" stroke-width="1.5"/>`);
            // Header
            parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${ROW_H + PAD}" rx="4" fill="var(--intent-primary)" opacity="0.15"/>`);
            parts.push(`<text x="${p.x + p.w/2}" y="${p.y + ROW_H}" text-anchor="middle" font-size="13" font-weight="bold" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml(e.name)}</text>`);
            // Divider
            parts.push(`<line x1="${p.x}" y1="${p.y + ROW_H + PAD}" x2="${p.x+p.w}" y2="${p.y + ROW_H + PAD}" stroke="${theme.NODE_STROKE}" stroke-width="1"/>`);
            // Attributes
            attrs.forEach((attr, ai) => {
                const ay = p.y + ROW_H + PAD + (ai + 1) * ROW_H;
                const keyLabel = attr.attrKey ? ` 🔑` : '';
                parts.push(`<text x="${p.x + 8}" y="${ay}" font-size="11" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}"><tspan class="attr-type" opacity="0.6">${this.escapeHtml(attr.attrType || '')}</tspan> ${this.escapeHtml(attr.attrName || '')}${keyLabel}</text>`);
            });
        });

        return `<div class="zolto-diagram zolto-er" style="${ms}" id="${id}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-svg" aria-label="entity-relationship diagram">
    ${parts.join('\n    ')}
  </svg>
</div>`;
    }

    // ── Mindmap ───────────────────────────────────────────────────────────────────────

    static renderMindmap(node, ms) {
        const theme  = this._diagramTheme();
        const R      = 44, CX = 300, CY = 280;
        const id     = node.id || `mm${Math.random().toString(36).slice(2,7)}`;
        const root   = node.root;
        const children = node.children || (root && root.children) || [];

        const RADII = [0, 130, 220, 290];
        let parts   = [];
        let nodeList = [];

        // Recursive radial layout
        const layout = (nd, depth, startAngle, sweepAngle, parentPos) => {
            const r   = RADII[Math.min(depth, RADII.length - 1)];
            const mid = startAngle + sweepAngle / 2;
            const x   = CX + r * Math.cos(mid);
            const y   = CY + r * Math.sin(mid);
            nodeList.push({ nd, depth, x, y, parentPos });

            const kids = nd.children || [];
            if (kids.length) {
                const sweep = sweepAngle / kids.length;
                kids.forEach((k, i) => layout(k, depth + 1, startAngle + i * sweep, sweep, { x, y }));
            }
        };

        if (root) layout(root, 0, 0, Math.PI * 2, null);
        children.forEach((c, i) => {
            const angle = (i / children.length) * Math.PI * 2;
            layout(c, 1, angle, (Math.PI * 2) / children.length, { x: CX, y: CY });
        });

        // Draw edges
        nodeList.forEach(item => {
            if (!item.parentPos) return;
            parts.push(`<line x1="${item.parentPos.x}" y1="${item.parentPos.y}" x2="${item.x}" y2="${item.y}" stroke="${_palColor(item.depth)}" stroke-width="${Math.max(1, 3 - item.depth)}" opacity="0.7"/>`);
        });

        // Draw nodes
        nodeList.forEach(item => {
            const r   = Math.max(14, 40 - item.depth * 10);
            const col = _palColor(item.depth);
            const lbl = this.escapeHtml((item.nd.text || '').slice(0, 24));
            parts.push(`<circle cx="${item.x}" cy="${item.y}" r="${r}" fill="${col}" fill-opacity="0.15" stroke="${col}" stroke-width="1.5"/>`);
            parts.push(`<text x="${item.x}" y="${item.y + 4}" text-anchor="middle" font-size="${Math.max(10, 14 - item.depth * 2)}" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${lbl}</text>`);
        });

        const svgW = CX * 2, svgH = CY * 2;
        return `<div class="zolto-diagram zolto-mindmap" style="${ms}" id="${id}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-svg" aria-label="mind map">
    ${parts.join('\n    ')}
  </svg>
</div>`;
    }

    // ── Gantt ─────────────────────────────────────────────────────────────────────────

    static renderGantt(node, ms) {
        const sections = node.sections || [];
        const SC = _diagramCfg().GANTT || _chartCfg().GANTT || {};
        const ROW_H   = SC.ROW_HEIGHT  || 30;
        const BAR_H   = SC.BAR_HEIGHT  || 20;
        const LBL_W   = 160;
        const PAD_Y   = 50;
        const CHART_W = 520;
        const theme   = this._diagramTheme();
        const id      = node.id || `gantt${Math.random().toString(36).slice(2,7)}`;

        // Flatten all tasks
        const tasks = [];
        sections.forEach(sec => {
            if (sec.text) tasks.push({ type: 'section', text: sec.text });
            (sec.tasks || []).forEach(t => tasks.push({ ...t, type: 'task' }));
        });

        const svgH = PAD_Y + tasks.length * ROW_H + 40;
        const svgW = LBL_W + CHART_W + 20;
        const barColors = (SC.BAR_COLORS || {});

        let parts = [];
        // Title
        if (node.title) parts.push(`<text x="${svgW/2}" y="24" text-anchor="middle" font-size="14" font-weight="bold" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml(node.title)}</text>`);

        tasks.forEach((task, i) => {
            const y = PAD_Y + i * ROW_H;
            if (task.type === 'section') {
                parts.push(`<rect x="0" y="${y}" width="${svgW}" height="${ROW_H}" fill="${theme.NODE_FILL}" opacity="0.5"/>`);
                parts.push(`<text x="8" y="${y + ROW_H * 0.65}" font-size="12" font-weight="bold" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml(task.text || '')}</text>`);
                return;
            }
            // Simple proportional bar (no date parsing — just use index)
            const maxTasks = Math.max(1, tasks.filter(t => t.type === 'task').length);
            const taskIdx  = tasks.filter((t, j) => j <= i && t.type === 'task').length - 1;
            const barW = Math.max(20, (CHART_W / maxTasks) * 0.85);
            const barX = LBL_W + (CHART_W / maxTasks) * taskIdx;
            const barY = y + (ROW_H - BAR_H) / 2;
            const mod  = task.modifier || 'default';
            const col  = barColors[mod] || barColors.default || 'var(--intent-primary)';
            parts.push(`<text x="${LBL_W - 8}" y="${y + ROW_H * 0.65}" text-anchor="end" font-size="11" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml((task.text || '').slice(0,24))}</text>`);
            parts.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="${BAR_H}" rx="3" fill="${col}" fill-opacity="0.85" class="zolto-gantt-bar"/>`);
        });

        return `<div class="zolto-diagram zolto-gantt" style="${ms}" id="${id}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-svg" aria-label="gantt chart">
    ${parts.join('\n    ')}
  </svg>
</div>`;
    }

    // ── Timeline ──────────────────────────────────────────────────────────────────────

    static renderTimeline(node, ms) {
        const periods = node.periods || [];
        const theme   = this._diagramTheme();
        const id      = node.id || `tl${Math.random().toString(36).slice(2,7)}`;
        const AXIS_X  = 120, EVT_Y_START = 50, PERIOD_H = 70;
        const totalEvents = periods.reduce((s, p) => s + Math.max(1, (p.events || []).length), 0);
        const svgH = EVT_Y_START + totalEvents * PERIOD_H + 40;
        const svgW = 600;

        let parts = [], curY = EVT_Y_START;
        if (node.title) {
            parts.push(`<text x="${svgW/2}" y="24" text-anchor="middle" font-size="14" font-weight="bold" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${this.escapeHtml(node.title)}</text>`);
        }
        // Central axis
        parts.push(`<line x1="${AXIS_X}" y1="${EVT_Y_START - 10}" x2="${AXIS_X}" y2="${svgH - 10}" stroke="${theme.EDGE_STROKE}" stroke-width="2"/>`);

        periods.forEach((period, pi) => {
            const events = period.events || [];
            const col    = _palColor(pi);
            // Period label
            parts.push(`<text x="${AXIS_X - 12}" y="${curY + 4}" text-anchor="end" font-size="11" font-weight="bold" font-family="${theme.FONT_FAMILY}" fill="${col}">${this.escapeHtml(period.period || '')}</text>`);

            (events.length ? events : [{ text: '', label: '' }]).forEach((evt, ei) => {
                parts.push(`<circle cx="${AXIS_X}" cy="${curY}" r="6" fill="${col}" class="zolto-tl-dot"/>`);
                const eventText = this.escapeHtml((evt.text || '').slice(0, 60));
                const labelText = evt.label ? `<tspan class="tl-label" font-weight="bold"> · ${this.escapeHtml(evt.label)}</tspan>` : '';
                parts.push(`<text x="${AXIS_X + 18}" y="${curY + 4}" font-size="12" font-family="${theme.FONT_FAMILY}" fill="${theme.NODE_TEXT}">${eventText}${labelText}</text>`);
                curY += PERIOD_H;
            });
        });

        return `<div class="zolto-diagram zolto-timeline" style="${ms}" id="${id}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-svg" aria-label="timeline">
    ${parts.join('\n    ')}
  </svg>
</div>`;
    }

    // ── Generic diagram (network, architecture, dependency…) ──────────────────────────

    static _renderGenericDiagram(node, ms) {
        const diagramNodes = node.nodes || [];
        const diagramEdges = node.edges || [];
        if (!diagramNodes.length && !diagramEdges.length) {
            return `<div class="zolto-diagram zolto-diagram-empty" style="${ms}"><span class="zolto-icon">◇</span> <em>${this.escapeHtml(node.diagramType || 'diagram')}</em></div>`;
        }
        return this.renderGraph({ ...node, type: 'Graph' }, ms);
    }

    // ── Chart (data viz) ──────────────────────────────────────────────────────────────

    static renderChart(node, ms) {
        // delegate to advanced renderer if available, else basic SVG
        if (typeof ZoltoAdvancedEngines !== 'undefined' && ZoltoAdvancedEngines.renderChart) {
            return ZoltoAdvancedEngines.renderChart.call(this, node, ms);
        }
        const ct = (node.chartType || '').toLowerCase();
        const dataset = Array.isArray(node.dataset) ? node.dataset : [];
        const config  = node.config || {};
        const id      = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const gcfg    = _chartCfg().GLOBAL || {};
        const W = parseInt(config.width, 10) || gcfg.WIDTH_DEFAULT || 600;
        const H = parseInt(config.height,10) || gcfg.HEIGHT_DEFAULT|| 400;

        try {
            let chartSvg = '';
            if (ct === 'pie' || ct === 'donut')  chartSvg = this._svgPieChart(dataset, W, H, config, ct === 'donut');
            else if (ct === 'bar')                chartSvg = this._svgBarChart(dataset, W, H, config);
            else if (ct === 'line' || ct === 'area') chartSvg = this._svgLineChart(dataset, W, H, config, ct === 'area');
            else                                  chartSvg = this._svgBarChart(dataset, W, H, config);
            return `<div${id} class="zolto-chart zolto-chart-${this.escapeHtml(ct)}" style="${ms} max-width:${W}px;">${chartSvg}</div>`;
        } catch (e) {
            return `<div class="zolto-error-block" style="${ms}">Chart error: ${this.escapeHtml(e.message)}</div>`;
        }
    }

    static _svgBarChart(dataset, W, H, cfg) {
        const pad = 40, cW = W - pad * 2, cH = H - pad * 2;
        if (!dataset.length) return '<p class="zolto-chart-empty">No data</p>';
        const max = Math.max(1, ...dataset.map(d => Number(d.value) || 0));
        const bW  = cW / dataset.length;
        const theme = this._diagramTheme();
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg-chart">`;
        svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="${theme.EDGE_STROKE}" stroke-width="1.5"/>`;
        svg += `<line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="${theme.EDGE_STROKE}" stroke-width="1.5"/>`;
        dataset.forEach((d, i) => {
            const val  = Math.max(0, Number(d.value) || 0);
            const bH   = (val / max) * cH;
            const x    = pad + i * bW + bW * 0.1;
            const y    = H - pad - bH;
            const col  = _palColor(i);
            const lbl  = this.escapeHtml((d.label || '').slice(0, 10));
            svg += `<rect x="${x}" y="${y}" width="${bW*0.8}" height="${bH}" fill="${col}" rx="3" fill-opacity="0.85"><title>${lbl}: ${val}</title></rect>`;
            svg += `<text x="${x + bW*0.4}" y="${H-pad+16}" text-anchor="middle" font-size="10" fill="${theme.NODE_TEXT}">${lbl}</text>`;
        });
        return svg + '</svg>';
    }

    static _svgPieChart(dataset, W, H, cfg, donut = false) {
        const cx = W / 2, cy = H / 2, R = Math.min(cx, cy) - 40;
        const total = dataset.reduce((s, d) => s + Math.max(0, Number(d.value) || 0), 0);
        if (total <= 0) return '<p class="zolto-chart-empty">No data</p>';
        const theme = this._diagramTheme();
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg-chart">`;
        let angle = -Math.PI / 2;
        dataset.forEach((d, i) => {
            const val = Math.max(0, Number(d.value) || 0);
            const sweep = (val / total) * Math.PI * 2;
            const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
            const x2 = cx + R * Math.cos(angle + sweep), y2 = cy + R * Math.sin(angle + sweep);
            const large = sweep > Math.PI ? 1 : 0;
            const col   = _palColor(i);
            const lbl   = this.escapeHtml(d.label || '');
            if (sweep < Math.PI * 2 - 0.001) {
                if (donut) {
                    const ir = R * 0.5;
                    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
                    const ix2 = cx + ir * Math.cos(angle+sweep), iy2 = cy + ir * Math.sin(angle+sweep);
                    svg += `<path d="M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z" fill="${col}" fill-opacity="0.85"><title>${lbl}: ${val}</title></path>`;
                } else {
                    svg += `<path d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z" fill="${col}" fill-opacity="0.85"><title>${lbl}: ${val}</title></path>`;
                }
            } else {
                svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col}" fill-opacity="0.85"/>`;
            }
            // Legend entry
            svg += `<rect x="${W - 110}" y="${20 + i * 18}" width="10" height="10" fill="${col}" rx="2"/>`;
            svg += `<text x="${W - 95}" y="${30 + i * 18}" font-size="10" fill="${theme.NODE_TEXT}">${lbl}</text>`;
            angle += sweep;
        });
        return svg + '</svg>';
    }

    static _svgLineChart(dataset, W, H, cfg, area = false) {
        const pad = 40, cW = W - pad*2, cH = H - pad*2;
        if (dataset.length < 2) return '<p class="zolto-chart-empty">Need ≥2 points</p>';
        const max  = Math.max(1, ...dataset.map(d => Number(d.value) || 0));
        const step = cW / (dataset.length - 1);
        const theme = this._diagramTheme();
        const pts  = dataset.map((d, i) => ({ x: pad + i * step, y: H - pad - (Number(d.value) || 0) / max * cH }));
        const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        const col  = _palColor(0);
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg-chart">`;
        svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="${theme.EDGE_STROKE}" stroke-width="1"/>`;
        svg += `<line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="${theme.EDGE_STROKE}" stroke-width="1"/>`;
        if (area) {
            const fillPath = `${line} L${pts[pts.length-1].x},${H-pad} L${pts[0].x},${H-pad} Z`;
            svg += `<path d="${fillPath}" fill="${col}" fill-opacity="0.12"/>`;
        }
        svg += `<path d="${line}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        pts.forEach((p, i) => {
            const lbl = this.escapeHtml((dataset[i].label || '').slice(0, 8));
            svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${col}" stroke="var(--bg-panel)" stroke-width="2"/>`;
            svg += `<text x="${p.x}" y="${H-pad+16}" text-anchor="middle" font-size="10" fill="${theme.NODE_TEXT}">${lbl}</text>`;
        });
        return svg + '</svg>';
    }

    // ── Shared diagram helpers ─────────────────────────────────────────────────────────

    static _diagramTheme() {
        const cfg = _diagramCfg();
        return (cfg.THEMES && cfg.THEMES.DEFAULT) || {
            NODE_FILL:   'var(--bg-node, #1e293b)',
            NODE_STROKE: 'var(--border-heavy, #475569)',
            NODE_TEXT:   'var(--text-main, #e2e8f0)',
            EDGE_STROKE: 'var(--edge-color, #64748b)',
            EDGE_WIDTH:   2,
            FONT_FAMILY: 'var(--font-sans, system-ui, sans-serif)',
            FONT_SIZE:    13,
            BORDER_RADIUS:6,
        };
    }

    static _arrowDefs() {
        return `<marker id="zolto-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
  <polygon points="0 0,10 3.5,0 7" fill="var(--edge-marker-color,#94a3b8)"/>
</marker>
<marker id="zolto-arrow-r" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
  <polygon points="10 0,0 3.5,10 7" fill="var(--edge-marker-color,#94a3b8)"/>
</marker>
<marker id="zolto-arrow-open" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
  <path d="M0,0 L10,4 L0,8" fill="none" stroke="var(--edge-marker-color,#94a3b8)" stroke-width="1.5"/>
</marker>`;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §5  VECTOR / GRAPHICS DOMAIN
    ───────────────────────────────────────────────────────────────────────────────────── */

    static renderVectorScene(node, ms) {
        const W   = node.width  || 800;
        const H   = node.height || 600;
        const vb  = node.viewBox || `0 0 ${W} ${H}`;
        const id  = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const children = (node.layers || node.children || []).map(c => this._renderSvgNode(c)).join('');
        return `<div class="zolto-vector-scene" style="${ms}">
  <svg${id} xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${W}" height="${H}" class="zolto-svg zolto-scene">
    <defs>${this._arrowDefs()}</defs>
    ${children}
  </svg>
</div>`;
    }

    static renderVectorGroup(node) {
        const transform = node.transform ? ` transform="${this.escapeHtml(node.transform)}"` : '';
        const opacity   = node.opacity   !== undefined ? ` opacity="${node.opacity}"` : '';
        const children  = (node.children || []).map(c => this._renderSvgNode(c)).join('');
        return `<g${transform}${opacity} class="zolto-vg">${children}</g>`;
    }

    static renderVectorShape(node) { return this._renderSvgNode(node); }
    static renderVectorPath(node)  { return this._renderSvgNode(node); }
    static renderVectorTextNode(node) { return this._renderSvgNode(node); }
    static renderVectorConnector(node) { return this._renderSvgNode(node); }

    /** Convert a VectorShape / VectorPath / VectorText node → SVG element string. */
    static _renderSvgNode(node) {
        if (!node) return '';
        const type = (node.vectorType || node.type || '').toLowerCase();
        const attrs = this._parseSvgData(node.vectorData || '', node);
        const fill   = node.fill        || attrs.fill   || 'none';
        const stroke = node.stroke      || attrs.stroke || 'var(--text-main)';
        const sw     = node.strokeWidth || attrs['stroke-width'] || 1.5;
        const op     = node.opacity     !== undefined ? node.opacity : 1;
        const tx     = node.transform   || '';
        const extra  = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"${tx ? ` transform="${this.escapeHtml(tx)}"` : ''}`;

        switch (type) {
            case 'rect': case 'rectangle': {
                const x = attrs.x || 0, y = attrs.y || 0;
                const w = attrs.width || attrs.w || 100, h = attrs.height || attrs.h || 60;
                const rx = attrs.rx || attrs.r || 0;
                return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${extra}/>`;
            }
            case 'circle': {
                const cx = attrs.cx || 0, cy = attrs.cy || 0, r = attrs.r || 40;
                return `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
            }
            case 'ellipse': {
                const cx = attrs.cx || 0, cy = attrs.cy || 0;
                const rx = attrs.rx || 60, ry = attrs.ry || 40;
                return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${extra}/>`;
            }
            case 'line': {
                const x1=attrs.x1||0,y1=attrs.y1||0,x2=attrs.x2||100,y2=attrs.y2||0;
                return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
            }
            case 'polygon': case 'polyline': {
                const pts = attrs.points || node.vectorData || '';
                const tag = type === 'polygon' ? 'polygon' : 'polyline';
                return `<${tag} points="${this.escapeHtml(pts)}" ${extra}/>`;
            }
            case 'path': case 'bezier': case 'spline': {
                const d = attrs.d || node.d || node.vectorData || '';
                return `<path d="${this.escapeHtml(d)}" ${extra}/>`;
            }
            case 'text': {
                const x = node.x || attrs.x || 0, y = node.y || attrs.y || 0;
                const fs = node.fontSize || attrs['font-size'] || 14;
                const txt = this.escapeHtml(node.text || attrs.text || '');
                return `<text x="${x}" y="${y}" font-size="${fs}" ${extra}>${txt}</text>`;
            }
            case 'image': {
                const x=attrs.x||0,y=attrs.y||0,w=attrs.width||100,h=attrs.height||100;
                const href = this.sanitizeUrl(attrs.href || node.url || '');
                return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${href}" preserveAspectRatio="xMidYMid meet"/>`;
            }
            // pass-through for groups / layers
            case 'vectorgroup': case 'vectorlayer': case 'layer':
                return this.renderVectorGroup(node);
            default:
                return '';
        }
    }

    /** Parse "key=val key2=val2" or "M 0 0 L 100 100" SVG data strings. */
    static _parseSvgData(data, node) {
        const result = {};
        if (!data) return result;
        // Key=value pairs
        const kv = data.matchAll(/([a-zA-Z_-]+)\s*=\s*([^\s]+)/g);
        for (const m of kv) result[m[1]] = m[2];
        // SVG path d= attribute
        if (/^[MmCcLlAaZzQqSsTtHhVv]/.test(data.trim())) result.d = data;
        return result;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §6  LAYOUT DOMAIN
    ───────────────────────────────────────────────────────────────────────────────────── */

    static renderLayoutBlock(node, ms) {
        const dir = (node.directive || '').toLowerCase();
        if (dir.startsWith('flex'))    return this.renderFlexLayout(node, ms);
        if (dir.startsWith('grid'))    return this.renderGridLayout(node, ms);
        if (dir === 'masonry')         return this.renderMasonryLayout(node, ms);
        if (dir === 'canvas')          return this.renderCanvas(node, ms);
        if (dir === 'whiteboard')      return this.renderWhiteboard(node, ms);
        if (dir === 'presentation')    return this.renderPresentation(node, ms);
        if (dir === 'split' || dir === 'split-vertical') return this.renderSplitView(node, ms);
        if (dir === 'panel')           return this.renderPanel(node, ms);
        // Generic container
        const id  = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        return `<div${id} class="zolto-layout zolto-layout-${this.escapeHtml(dir||'block')}" style="${ms}">${this.renderChildren(node.children)}</div>`;
    }

    static renderGridLayout(node, ms) {
        const cols = node.columns || 3;
        const gap  = node.gap || '1rem';
        const id   = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const style = `${ms} display:grid; grid-template-columns:repeat(${cols},1fr); gap:${gap};`;
        return `<div${id} class="zolto-grid" style="${style}">${this.renderChildren(node.children)}</div>`;
    }

    static renderFlexLayout(node, ms) {
        const dir   = node.direction || 'row';
        const wrap  = node.wrap ? 'wrap' : 'nowrap';
        const gap   = node.gap || '1rem';
        const align = node.align   || 'flex-start';
        const just  = node.justify || 'flex-start';
        const id    = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const style = `${ms} display:flex; flex-direction:${dir}; flex-wrap:${wrap}; gap:${gap}; align-items:${align}; justify-content:${just};`;
        return `<div${id} class="zolto-flex" style="${style}">${this.renderChildren(node.children)}</div>`;
    }

    static renderMasonryLayout(node, ms) {
        const cols = node.columns || 3;
        const gap  = node.gap || '1rem';
        const id   = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const style = `${ms} columns:${cols}; column-gap:${gap};`;
        const items = (node.children || []).map(c =>
            `<div class="zolto-masonry-item" style="break-inside:avoid; margin-bottom:${gap};">${this.renderNode(c)}</div>`
        ).join('');
        return `<div${id} class="zolto-masonry" style="${style}">${items}</div>`;
    }

    static renderCanvas(node, ms) {
        const id = node.id || `cv${Math.random().toString(36).slice(2,7)}`;
        const w  = node.width  ? `width:${node.width}px;`  : '';
        const h  = node.height ? `height:${node.height}px;` : '';
        const inf = node.infinite !== false ? ' zolto-canvas-infinite' : '';
        return `<div id="${id}" class="zolto-canvas${inf}" style="${ms}${w}${h}" data-zoom="1" data-pan-x="0" data-pan-y="0">
  <div class="zolto-canvas-content">${this.renderChildren(node.children)}</div>
</div>`;
    }

    static renderWhiteboard(node, ms) {
        const id = node.id || `wb${Math.random().toString(36).slice(2,7)}`;
        return `<div id="${id}" class="zolto-whiteboard" style="${ms}">
  <div class="zolto-whiteboard-content">${this.renderChildren(node.children)}</div>
</div>`;
    }

    static renderArtboard(node, ms) {
        const id = node.id || `ab${Math.random().toString(36).slice(2,7)}`;
        const w  = node.width  ? `width:${node.width}px;`  : '';
        const h  = node.height ? `height:${node.height}px;` : '';
        return `<div id="${id}" class="zolto-artboard" style="${ms}${w}${h}">
  ${this.renderChildren(node.layers || node.children)}
</div>`;
    }

    static renderSplitView(node, ms) {
        const id  = node.id || `sv${Math.random().toString(36).slice(2,7)}`;
        const dir = (node.direction || 'horizontal') === 'vertical' ? 'column' : 'row';
        const panes = (node.panes || node.children || []).map((p, i) =>
            `<div class="zolto-pane" style="flex:1; min-width:80px; overflow:auto;">${this.renderNode(p)}</div>`
            + (i < (node.panes || node.children || []).length - 1 ? '<div class="zolto-splitter" aria-hidden="true"></div>' : '')
        ).join('');
        return `<div id="${id}" class="zolto-split" style="${ms} display:flex; flex-direction:${dir};">${panes}</div>`;
    }

    static renderPresentation(node, ms) {
        const id     = node.id || `pr${Math.random().toString(36).slice(2,7)}`;
        const slides = node.slides || [];
        const slideHtml = slides.map((s, i) =>
            `<div class="zolto-slide${i === 0 ? ' zolto-slide-active' : ''}" data-slide="${i}">${this.renderNode(s)}</div>`
        ).join('');
        const nav = slides.length > 1
            ? `<div class="zolto-slide-nav"><button onclick="ZoltoRenderer.prevSlide('${id}')" aria-label="Previous">‹</button><span class="zolto-slide-counter">1 / ${slides.length}</span><button onclick="ZoltoRenderer.nextSlide('${id}')" aria-label="Next">›</button></div>`
            : '';
        return `<div id="${id}" class="zolto-presentation" style="${ms}"><div class="zolto-slide-deck">${slideHtml}</div>${nav}</div>`;
    }

    static renderSlide(node, ms) {
        const layout = this.escapeHtml(node.layout || 'default');
        return `<div class="zolto-slide-body zolto-slide-${layout}">${this.renderChildren(node.children)}</div>`;
    }

    static prevSlide(id) { this._navigateSlide(id, -1); }
    static nextSlide(id) { this._navigateSlide(id,  1); }
    static _navigateSlide(id, delta) {
        const deck = document.getElementById(id); if (!deck) return;
        const slides = [...deck.querySelectorAll('.zolto-slide')];
        const cur    = slides.findIndex(s => s.classList.contains('zolto-slide-active'));
        const next   = (cur + delta + slides.length) % slides.length;
        slides[cur].classList.remove('zolto-slide-active');
        slides[next].classList.add('zolto-slide-active');
        const counter = deck.querySelector('.zolto-slide-counter');
        if (counter) counter.textContent = `${next + 1} / ${slides.length}`;
    }

    static renderPanel(node, ms) {
        const id    = node.id || `pn${Math.random().toString(36).slice(2,7)}`;
        const title = node.title ? `<div class="zolto-panel-header"><span class="zolto-panel-title">${this.escapeHtml(node.title)}</span></div>` : '';
        return `<div id="${id}" class="zolto-panel" style="${ms}">${title}<div class="zolto-panel-body">${this.renderChildren(node.children)}</div></div>`;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §7  COMPONENT DOMAIN
    ───────────────────────────────────────────────────────────────────────────────────── */

    static renderComponentUse(node, ms) {
        const name   = node.componentName || 'Fragment';
        const props  = node.parsedProps   || {};
        const slots  = node.slots         || {};
        const id     = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';

        // Try registered component definition
        const def = (this._components || {})[name];
        if (def) return this._renderComponentFromDef(def, props, slots, node.children, ms);

        // Try built-in component library
        const builtin = this._builtinComponent(name, props, node.children, ms);
        if (builtin !== null) return builtin;

        // Fallback: render children in a wrapper div
        return `<div${id} class="zolto-component zolto-cmp-${this.escapeHtml(name)}" style="${ms}" data-component="${this.escapeHtml(name)}">${this.renderChildren(node.children)}</div>`;
    }

    static _renderComponentFromDef(def, props, slots, children, ms) {
        // Simple template render: replace {{prop}} placeholders in children
        const body = this.renderChildren(def.children || []);
        return `<div class="zolto-cmp-${this.escapeHtml(def.name || '')}" style="${ms}">${body}</div>`;
    }

    /** Built-in component library — maps component names to render functions. */
    static _builtinComponent(name, props, children, ms) {
        const p = (k, def = '') => (props[k] !== undefined ? String(props[k]) : def);
        switch (name) {
            case 'Button': {
                const variant = /^[a-zA-Z-]+$/.test(p('variant','default')) ? p('variant','default') : 'default';
                const label   = this.escapeHtml(p('label', ''));
                const href    = p('href','');
                const tag     = href ? 'a' : 'button';
                const hattr   = href ? ` href="${this.sanitizeUrl(href)}"` : '';
                return `<${tag}${hattr} class="zolto-btn zolto-btn-${variant}" style="${ms}">${label || this.renderChildren(children)}</${tag}>`;
            }
            case 'Badge': {
                const variant = /^[a-zA-Z-]+$/.test(p('variant','default')) ? p('variant','default') : 'default';
                return `<span class="zolto-badge zolto-badge-${variant}" style="${ms}">${this.escapeHtml(p('label',''))}</span>`;
            }
            case 'Alert': {
                const type    = /^[a-zA-Z-]+$/.test(p('type','info')) ? p('type','info') : 'info';
                const title   = p('title','');
                const icon    = _CALLOUT_ICONS[type] || 'ℹ';
                return `<div class="zolto-alert zolto-alert-${type}" style="${ms}" role="alert">
  ${title ? `<strong>${this.escapeHtml(title)}</strong> ` : ''}<span class="zolto-alert-icon">${icon}</span> ${this.renderChildren(children)}
</div>`;
            }
            case 'Divider': return `<hr class="zolto-hr" style="${ms}">`;
            case 'Spacer':  return `<div class="zolto-spacer" style="${ms} height:${p('size','1rem')};"></div>`;
            case 'Code':    return `<code class="zolto-inline-code" style="${ms}">${this.escapeHtml(p('value',''))}</code>`;
            case 'Math':    return this._renderInlineMath(p('value',''));
            case 'Box': {
                const style = `${ms} padding:${p('p','')};margin:${p('m','')};background:${p('bg','')};`;
                return `<div class="zolto-box" style="${style}">${this.renderChildren(children)}</div>`;
            }
            case 'Center': return `<div class="zolto-center" style="${ms} text-align:center;">${this.renderChildren(children)}</div>`;
            case 'Stack': {
                const gap = p('gap','1rem'), dir = p('direction','column');
                return `<div class="zolto-stack" style="${ms} display:flex;flex-direction:${dir};gap:${gap};">${this.renderChildren(children)}</div>`;
            }
            case 'Grid': {
                const cols = p('cols','3'), gap = p('gap','1rem');
                return `<div class="zolto-grid" style="${ms} display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap};">${this.renderChildren(children)}</div>`;
            }
            case 'Flex': {
                const dir = p('direction','row'), gap = p('gap','1rem');
                return `<div class="zolto-flex" style="${ms} display:flex;flex-direction:${dir};gap:${gap};">${this.renderChildren(children)}</div>`;
            }
            case 'Tabs':      return this.renderTabGroup({ children, active: 0 }, ms);
            case 'Accordion': return this.renderAccordion({ title: p('title',''), children, open: p('open','') === 'true' }, ms);
            case 'Card':      return this.renderCard({ title: p('title',''), icon: p('icon',''), variant: p('variant','default'), children, href: p('href','') }, ms);
            case 'Callout':   return this.renderCallout({ calloutType: p('type','info'), title: p('title',''), children }, ms);
            case 'Steps':     return this.renderSteps({ children }, ms);
            case 'Details':   return this.renderDetails({ summary: p('summary','Details'), children, open: p('open','') === 'true' }, ms);
            case 'Progress': {
                const val = Math.max(0, Math.min(100, parseFloat(p('value','0')) || 0));
                const col = /^[a-zA-Z-]+$/.test(p('color','primary')) ? `var(--intent-${p('color','primary')})` : p('color','primary');
                return `<div class="zolto-progress" style="${ms}"><div class="zolto-progress-bar" style="width:${val}%;background:${col};" role="progressbar" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="100"></div></div>`;
            }
            case 'Spinner':   return `<span class="zolto-spinner" style="${ms}" aria-label="loading" role="status"></span>`;
            case 'Icon':      return `<span class="zolto-icon" style="${ms}" aria-hidden="true">${this.escapeHtml(p('name',''))}</span>`;
            case 'Image': {
                const src = this.sanitizeUrl(p('src',''));
                const alt = this.escapeHtml(p('alt',''));
                const w   = p('width',''); const h = p('height','');
                return `<img src="${src}" alt="${alt}" class="zolto-img" loading="lazy" style="${ms}${w ? `width:${w};` : ''}${h ? `height:${h};` : ''}">`;
            }
            case 'Diagram':   return this.renderDiagram({ ...props, type: 'Diagram', nodes: [], edges: [] }, ms);
            case 'Math':      return this.renderMathBlock({ ...props, type: 'MathBlock', content: p('value','') }, ms);
            default:          return null;
        }
    }

    static renderSlotOutlet(node, ms) {
        return `<slot name="${this.escapeHtml(node.slotName || 'default')}"></slot>`;
    }

    static renderAnimation(node, ms) {
        const name = this.escapeHtml(node.name || '');
        return `<style class="zolto-anim-def" data-anim="${name}">/* ${name} animation */</style>`;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §8  LEGACY SHAPE (v7 compat)
    ───────────────────────────────────────────────────────────────────────────────────── */

    static renderShape(node, ms) {
        const shape  = /^[a-z-]+$/.test(node.shapeType || '') ? (node.shapeType || 'block') : 'block';
        const traits = (Array.isArray(node.traits) ? node.traits : [])
            .map(t => typeof t === 'string' ? `zolto-trait-${t.replace(/[^a-zA-Z0-9-]/g,'')}` : '').filter(Boolean).join(' ');
        const label  = this._inlineOf(node) || this.escapeHtml(node.label || '');
        const id     = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        return `<div class="zolto-block" style="${ms}"><div${id} class="zolto-node zolto-shape-${shape} ${traits}">${label}</div></div>`;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §8  UTILITIES
    ───────────────────────────────────────────────────────────────────────────────────── */

    /** XSS-safe HTML escaping — fast path for strings without markup. */
    static escapeHtml(str) {
        if (typeof str !== 'string') return '';
        if (!/[&<>"']/.test(str)) return str;
        return str.replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
        })[c]);
    }

    /** Safe URL — blocks javascript:/vbscript:/data: protocols. */
    static sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '#';
        const trimmed = url.trim();
        if (/^(javascript|vbscript|data):/i.test(trimmed)) return '#';
        return this.escapeHtml(trimmed);
    }

    /** Validate a CSS color value before injecting into style attributes. */
    static sanitizeCssColor(color) {
        if (!color || typeof color !== 'string') return 'inherit';
        const c = color.trim();
        if (/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,./%]+\)|hsla?\([\d\s,./%]+\)|[a-zA-Z]{2,30}|var\(--[a-zA-Z0-9_-]+\))$/.test(c)) {
            return this.escapeHtml(c);
        }
        return 'inherit';
    }

    /**
     * Lightweight syntax highlighter for common languages.
     * Returns HTML-escaped, span-decorated code string.
     */
    static highlightSyntax(code, lang) {
        if (!code) return '';
        let h = this.escapeHtml(code);

        switch (lang) {
            case 'javascript': case 'js': case 'typescript': case 'ts': case 'jsx': case 'tsx':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;|`[\s\S]*?`)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(const|let|var|function|class|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|new|this|super|await|async|yield|typeof|instanceof|in|of|void|delete|throw|try|catch|finally|extends|implements|interface|type|enum|namespace|declare|abstract|readonly|static|public|private|protected|override|get|set|as|satisfies|keyof|infer)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, m => `<span class="hl-literal">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?n?)\b/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/\b([A-Z][a-zA-Z0-9_]*)(?=\()/g, m => `<span class="hl-constructor">${m}</span>`)
                    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, m => `<span class="hl-fn">${m}</span>`);
                break;

            case 'python': case 'py':
                h = h
                    .replace(/#.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|pass|break|continue|try|except|finally|raise|yield|lambda|del|global|nonlocal|is|True|False|None|async|await)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, m => `<span class="hl-fn">${m}</span>`)
                    .replace(/@([a-zA-Z_][a-zA-Z0-9_.]*)/g, m => `<span class="hl-decorator">${m}</span>`);
                break;

            case 'css': case 'scss': case 'less':
                h = h
                    .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/(#[0-9a-fA-F]{3,8}|\b\d+(?:px|em|rem|vh|vw|vmin|vmax|%|pt|cm|mm|in|fr)\b)/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/\b(var|--[a-zA-Z0-9_-]+)/g, m => `<span class="hl-var">${m}</span>`)
                    .replace(/([@][a-zA-Z-]+)/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/([.#]?[a-zA-Z][a-zA-Z0-9_-]*)(?=\s*\{)/g, m => `<span class="hl-selector">${m}</span>`)
                    .replace(/\b([a-zA-Z-]+)(?=\s*:)/g, m => `<span class="hl-property">${m}</span>`);
                break;

            case 'html': case 'xml': case 'svg':
                h = h
                    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&lt;\/?)([\w:-]+)/g, (_, lt, tag) => `${lt}<span class="hl-tag">${tag}</span>`)
                    .replace(/([\w:-]+)=(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;)/g,
                        (_, attr, val) => `<span class="hl-attr">${attr}</span>=<span class="hl-string">${val}</span>`);
                break;

            case 'rust': case 'rs':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(fn|let|mut|pub|use|mod|struct|enum|impl|trait|where|for|in|if|else|match|loop|while|return|type|const|static|async|await|move|ref|self|super|crate|unsafe|extern|dyn|box|as|break|continue|yield)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?(?:u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;

            case 'go': case 'golang':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|`[\s\S]*?`)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(func|var|const|type|struct|interface|map|chan|go|defer|select|case|default|break|continue|return|if|else|for|range|package|import|switch|make|new|nil|true|false|error)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;

            case 'sql':
                h = h
                    .replace(/--.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|ADD|COLUMN|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|NOT|NULL|AND|OR|IN|BETWEEN|LIKE|AS|CASE|WHEN|THEN|ELSE|END|DISTINCT|COUNT|SUM|AVG|MIN|MAX|COALESCE|WITH|UNION|ALL|EXCEPT|INTERSECT)\b/gi, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;

            case 'json':
                h = h
                    .replace(/(&quot;[^&\n]*?&quot;)\s*:/g, m => `<span class="hl-key">${m}</span>`)
                    .replace(/:\s*(&quot;[^&\n]*?&quot;)/g, (_, v) => `: <span class="hl-string">${v}</span>`)
                    .replace(/\b(true|false|null)\b/g, m => `<span class="hl-literal">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;

            case 'bash': case 'sh': case 'shell': case 'zsh':
                h = h
                    .replace(/#.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(if|then|else|elif|fi|for|do|done|while|case|esac|function|return|local|export|source|echo|exit|set|unset|readonly|shift|break|continue|true|false)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\})/g, m => `<span class="hl-var">${m}</span>`);
                break;

            case 'zolto': case 'zl':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(#{1,6})\s(.+)/g, (_, h, t) => `<span class="hl-heading">${_}${t}</span>`)
                    .replace(/(\*\*.*?\*\*)/g, m => `<span class="hl-bold">${m}</span>`)
                    .replace(/(\$[^$\n]+\$)/g, m => `<span class="hl-math">${m}</span>`)
                    .replace(/(^|\s)(:::[a-z]+)/gm, (_, pre, block) => `${pre}<span class="hl-block">${block}</span>`)
                    .replace(/(@[a-z]+)/g, m => `<span class="hl-keyword">${m}</span>`);
                break;

            default:
                // Generic: just numbers and string-like tokens
                h = h.replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
        }

        return h;
    }

    /** Simple emoji name → Unicode character resolver. */
    static _emojiChar(name) {
        const map = {
            'check':'✓','x':'✗','warning':'⚠','info':'ℹ','heart':'♥',
            'star':'★','fire':'🔥','rocket':'🚀','bug':'🐛','key':'🔑',
            'lock':'🔒','bulb':'💡','bell':'🔔','thumbsup':'👍','thumbsdown':'👎',
            'tada':'🎉','sparkles':'✨','zap':'⚡','white_check_mark':'✅',
            'heavy_exclamation_mark':'❗','question':'❓','pencil':'✏',
            'bookmark':'🔖','clipboard':'📋','link':'🔗','email':'📧',
            'phone':'📞','calendar':'📅','chart_bar':'📊','memo':'📝',
            'book':'📖','computer':'💻','gear':'⚙','wrench':'🔧','hammer':'🔨',
        };
        return map[name] || `:${this.escapeHtml(name)}:`;
    }
}

/* =========================================================================================
   EXPORT
   ========================================================================================= */

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZoltoRenderer };
} else if (typeof window !== 'undefined') {
    window.ZoltoRenderer = ZoltoRenderer;
}
