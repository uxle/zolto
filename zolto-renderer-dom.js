/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE DOM RENDERER ENGINE (Module 4 of 7)
 * =========================================================================================
 * Description: Converts the Zolto AST into high-performance HTML/DOM elements.
 * Handles the core pipeline, typography, spatial shapes, data tables, and layout grids.
 * =========================================================================================
 */

'use strict';

class ZoltoRenderer {
    
    static render(ast) {
        if (!ast || !Array.isArray(ast.nodes) || ast.nodes.length === 0) {
            return '<div class="zolto-empty-state">Empty AST</div>';
        }
        try {
            const htmlBuffer = ast.nodes.map(node => this.renderNode(node));
            return htmlBuffer.join('');
        } catch (error) {
            console.error("[Zolto Renderer] Fatal Render Error:", error);
            return `<div class="zolto-error-block">Fatal Render Error: ${this.escapeHtml(error.message)}</div>`;
        }
    }

    static renderNode(node) {
        if (!node || typeof node !== 'object') return '';
        const indentRem = (typeof ZOLTO_CONFIG_BASE !== 'undefined' && ZOLTO_CONFIG_BASE.SPATIAL) ? ZOLTO_CONFIG_BASE.SPATIAL.INDENT_REM : 2.5;
        const depth = Math.max(0, parseInt(node.depth, 10) || 0);
        const marginStyle = depth > 0 ? `margin-left: ${depth * indentRem}rem;` : '';

        try {
            switch (node.type) {
                case 'Heading': return this.renderHeading(node, marginStyle);
                case 'Paragraph': return this.renderParagraph(node, marginStyle);
                case 'Quote': return this.renderQuote(node, marginStyle);
                case 'HorizontalRule': return this.renderHorizontalRule(marginStyle);
                case 'TreeBranch': return this.renderTreeBranch(node, marginStyle);
                case 'TreeLeaf': return this.renderTreeLeaf(node, marginStyle);
                case 'Shape': return this.renderShape(node, marginStyle);
                case 'Table': return this.renderTable(node, marginStyle);
                case 'CodeBlock': return this.renderCodeBlock(node, marginStyle);
                case 'MathBlock': return this.renderMathBlock(node, marginStyle);
                case 'Chart': return this.renderChart(node, marginStyle);
                case 'LayoutBlock': return this.renderLayoutBlock(node, marginStyle);
                default: 
                    return `<div class="zolto-line" style="${marginStyle}"><span class="text-mute">Unsupported: ${this.escapeHtml(node.type)}</span></div>`;
            }
        } catch (err) {
            console.error(`[Zolto Renderer] Error rendering node ${node.id}:`, err);
            return `<div class="zolto-error-inline" style="${marginStyle}">Error rendering ${this.escapeHtml(node.type)}</div>`;
        }
    }

    static renderInline(tokens) {
        if (!tokens) return '';
        if (!Array.isArray(tokens)) return this.escapeHtml(String(tokens));
        
        return tokens.map(token => {
            if (!token || typeof token !== 'object') return '';
            switch (token.type) {
                case 'Text': return this.escapeHtml(token.value);
                case 'Bold': return `<strong>${this.renderInline(token.children)}</strong>`;
                case 'Italic': return `<em>${this.renderInline(token.children)}</em>`;
                case 'Strikethrough': return `<del>${this.renderInline(token.children)}</del>`;
                case 'Highlight': return `<mark class="zolto-highlight">${this.renderInline(token.children)}</mark>`;
                case 'InlineCode': return `<code class="zolto-inline-code">${this.escapeHtml(token.value)}</code>`;
                case 'Link': 
                    const safeUrl = this.sanitizeUrl(token.url);
                    return `<a href="${safeUrl}" target="_blank" rel="noopener" class="zolto-link">${this.renderInline(token.children)}</a>`;
                case 'InlineMath': return this.renderInlineMath ? this.renderInlineMath(token.value) : '';
                case 'Color': 
                    const safeColor = this.sanitizeCssColor(token.color);
                    return `<span style="color: ${safeColor};">${this.renderInline(token.children)}</span>`;
                case 'Alignment': 
                    const safeAlign = /^(left|right|center|justify)$/.test(token.align) ? token.align : 'center';
                    return `<div style="text-align: ${safeAlign}; width: 100%; display: block;">${this.renderInline(token.children)}</div>`;
                default: return this.escapeHtml(String(token.value || ''));
            }
        }).join('');
    }

    static renderHeading(node, marginStyle) {
        const level = Math.max(1, Math.min(6, parseInt(node.level, 10) || 1));
        const className = level === 1 ? 'zolto-heading' : `zolto-subheading zolto-h${level}`;
        return `<div class="zolto-line" style="${marginStyle}"><h${level} id="${this.escapeHtml(node.id)}" class="${className}">${this.renderInline(node.richLabel || node.label)}</h${level}></div>`;
    }

    static renderParagraph(node, marginStyle) {
        return `<div class="zolto-line-tight" style="${marginStyle}"><p id="${this.escapeHtml(node.id)}" class="zolto-paragraph">${this.renderInline(node.content)}</p></div>`;
    }

    static renderQuote(node, marginStyle) {
        return `<div class="zolto-line" style="${marginStyle}"><blockquote id="${this.escapeHtml(node.id)}" class="zolto-quote">${this.renderInline(node.content)}</blockquote></div>`;
    }

    static renderHorizontalRule(marginStyle) {
        return `<div class="zolto-line" style="${marginStyle} width: 100%;"><hr class="zolto-hr" /></div>`;
    }

    static renderTreeBranch(node, marginStyle) {
        return `<div class="zolto-line-tight" style="${marginStyle}"><div id="${this.escapeHtml(node.id)}" class="zolto-tree-branch">${this.escapeHtml(node.label)}</div></div>`;
    }

    static renderTreeLeaf(node, marginStyle) {
        return `<div class="zolto-line-tight" style="${marginStyle}"><div id="${this.escapeHtml(node.id)}" class="zolto-tree-leaf">${this.escapeHtml(node.label)}</div></div>`;
    }

    static renderShape(node, marginStyle) {
        const shape = /^[a-z]+$/.test(node.shape) ? node.shape : 'block';
        const shapeClass = `zolto-shape-${shape}`;
        const traitClasses = (Array.isArray(node.traits) ? node.traits : [])
            .map(t => typeof t === 'string' ? `zolto-trait-${t.replace(/[^a-zA-Z0-9-]/g, '')}` : '').filter(Boolean).join(' ');
        
        let innerHTML = this.renderInline(node.richLabel || node.label);
        if (shape === 'geometric') innerHTML = `<span>${innerHTML}</span>`;
        else if (shape === 'database') innerHTML = `<div class="db-top"></div><div class="db-body">${innerHTML}</div>`;

        let inlineStyle = marginStyle;
        if (node.traits && node.traits.includes('implicit')) inlineStyle += ' opacity: 0.7; border-style: dashed;';

        return `<div class="zolto-line" style="${inlineStyle}"><div id="${this.escapeHtml(node.id)}" class="zolto-node ${shapeClass} ${traitClasses}" data-depth="${node.depth}">${innerHTML}</div></div>`;
    }

    static renderTable(node, marginStyle) {
        const aligns = Array.isArray(node.alignments) ? node.alignments : [];
        let html = `<div class="zolto-line" style="${marginStyle} width: 100%;"><div class="zolto-table-wrapper"><table id="${this.escapeHtml(node.id)}" class="zolto-table">`;
        
        if (Array.isArray(node.headers) && node.headers.length > 0) {
            html += `<thead><tr>`;
            node.headers.forEach((headerTokens, i) => {
                const align = /^(left|center|right)$/.test(aligns[i]) ? aligns[i] : 'left';
                html += `<th style="text-align: ${align};">${this.renderInline(headerTokens)}</th>`;
            });
            html += `</tr></thead>`;
        }

        if (Array.isArray(node.rows) && node.rows.length > 0) {
            html += `<tbody>`;
            node.rows.forEach(rowTokens => {
                if (!Array.isArray(rowTokens)) return;
                html += `<tr>`;
                rowTokens.forEach((cellTokens, i) => {
                    const align = /^(left|center|right)$/.test(aligns[i]) ? aligns[i] : 'left';
                    html += `<td style="text-align: ${align};">${this.renderInline(cellTokens)}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody>`;
        }
        return html + `</table></div></div>`;
    }

    static renderLayoutBlock(node, marginStyle) {
        let layoutClass = 'zolto-layout-block';
        const type = node.layout || '';
        if (type === 'flex-row') layoutClass += ' d-flex flex-row gap-4 flex-wrap';
        if (type === 'flex-col') layoutClass += ' d-flex flex-col gap-4';
        if (/^grid-\d$/.test(type)) layoutClass += ` d-grid grid-cols-${type.split('-')[1]} gap-4`;
        
        let childrenHtml = '';
        if (Array.isArray(node.children)) {
            node.children.forEach(child => {
                if (child.raw) childrenHtml += `<div class="zolto-layout-item">${this.escapeHtml(child.raw)}</div>`;
            });
        }
        return `<div class="zolto-line" style="${marginStyle} width: 100%;"><div id="${this.escapeHtml(node.id)}" class="${layoutClass}">${childrenHtml}</div></div>`;
    }

    static escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        if (!/[&<>"']/.test(unsafe)) return unsafe;
        return unsafe.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
    }

    static sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '#';
        const safeUrl = this.escapeHtml(url.trim());
        if (/^(javascript|vbscript|data):/i.test(safeUrl)) return '#';
        return safeUrl;
    }

    static sanitizeCssColor(color) {
        if (!color || typeof color !== 'string') return 'inherit';
        if (/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,\.]+\)|hsla?\([\d\s,%,\.]+\)|[a-zA-Z]+)$/.test(color.trim())) return this.escapeHtml(color.trim());
        return 'inherit';
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { ZoltoRenderer };
else if (typeof window !== 'undefined') window.ZoltoRenderer = ZoltoRenderer;
