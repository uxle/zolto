/**
 * =========================================================================================
 * LUMA STUDIO: ENTERPRISE DOM RENDERER ENGINE (v4.0.0)
 * =========================================================================================
 * Description: An infinity-scale rendering engine that converts the Luma AST into 
 * high-performance, deterministic HTML and SVG. 
 * * Built-in Engines:
 * - Native SVG Chart Renderer (Bar, Line, Pie, Sequence, Gantt)
 * - Native Mathematical Typesetting Engine (LaTeX to HTML/CSS)
 * - Native Lexical Syntax Highlighter (Code Blocks)
 * - Spatial DOM Layout Engine (Shapes, Grids, Trees)
 * * Zero external dependencies.
 * =========================================================================================
 */

'use strict';

class LumaRenderer {
    
    /* =====================================================================================
       1. CORE RENDER PIPELINE
       ===================================================================================== */

    /**
     * Transforms the AST into an HTML payload.
     * @param {Object} ast - The compiled Luma Abstract Syntax Tree
     * @returns {string} The final HTML string for the canvas
     */
    static render(ast) {
        if (!ast || !ast.nodes) return '<div class="luma-empty-state">Empty AST</div>';
        
        let html = '';
        
        try {
            ast.nodes.forEach(node => {
                html += this.renderNode(node);
            });
        } catch (error) {
            console.error("[Luma Renderer] Fatal Render Error:", error);
            html += `<div class="luma-error-block">Fatal Render Error: ${error.message}</div>`;
        }
        
        return html;
    }

    /**
     * Master dispatcher for all AST Node types.
     */
    static renderNode(node) {
        if (!node) return '';

        // Calculate spatial indentation mapping
        const indentRem = (typeof CONFIG !== 'undefined' && CONFIG.SPATIAL) ? CONFIG.SPATIAL.INDENT_REM : 2.5;
        const marginStyle = node.depth > 0 ? `margin-left: ${node.depth * indentRem}rem;` : '';

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
                    // Fallback for unknown nodes
                    return `<div class="luma-line" style="${marginStyle}"><span class="text-mute">Unsupported Node: ${node.type}</span></div>`;
            }
        } catch (err) {
            console.error(`[Luma Renderer] Error rendering node ${node.id}:`, err);
            return `<div class="luma-error-inline" style="${marginStyle}">Error rendering ${node.type}</div>`;
        }
    }

    /* =====================================================================================
       2. INLINE RICH TEXT ENGINE (Recursive Descent)
       ===================================================================================== */

    /**
     * Renders an array of inline tokens into HTML.
     */
    static renderInline(tokens) {
        if (!tokens || !Array.isArray(tokens)) return this.escapeHtml(String(tokens || ''));
        
        let html = '';
        tokens.forEach(token => {
            switch (token.type) {
                case 'Text': 
                    html += this.escapeHtml(token.value); 
                    break;
                case 'Bold': 
                    html += `<strong>${this.renderInline(token.children)}</strong>`; 
                    break;
                case 'Italic': 
                    html += `<em>${this.renderInline(token.children)}</em>`; 
                    break;
                case 'Strikethrough': 
                    html += `<del>${this.renderInline(token.children)}</del>`; 
                    break;
                case 'Highlight': 
                    html += `<mark class="luma-highlight">${this.renderInline(token.children)}</mark>`; 
                    break;
                case 'InlineCode': 
                    html += `<code class="luma-inline-code">${this.escapeHtml(token.value)}</code>`; 
                    break;
                case 'Link': 
                    html += `<a href="${this.escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer" class="luma-link">${this.renderInline(token.children)}</a>`; 
                    break;
                case 'InlineMath': 
                    html += this.renderInlineMath(token.value); 
                    break;
                case 'Color': 
                    html += `<span style="color: ${this.escapeHtml(token.color)};">${this.renderInline(token.children)}</span>`; 
                    break;
                case 'Alignment': 
                    html += `<div style="text-align: ${token.align}; width: 100%; display: block;">${this.renderInline(token.children)}</div>`; 
                    break;
                default: 
                    html += this.escapeHtml(String(token.value || ''));
            }
        });
        return html;
    }

    /* =====================================================================================
       3. TYPOGRAPHY & BASIC BLOCKS
       ===================================================================================== */

    static renderHeading(node, marginStyle) {
        const tag = `h${Math.min(node.level, 6)}`;
        const className = node.level === 1 ? 'luma-heading' : `luma-subheading luma-h${node.level}`;
        return `
            <div class="luma-line" style="${marginStyle}">
                <${tag} id="${node.id}" class="${className}">${this.renderInline(node.richLabel || node.label)}</${tag}>
            </div>`;
    }

    static renderParagraph(node, marginStyle) {
        return `
            <div class="luma-line-tight" style="${marginStyle}">
                <p id="${node.id}" class="luma-paragraph">${this.renderInline(node.content)}</p>
            </div>`;
    }

    static renderQuote(node, marginStyle) {
        return `
            <div class="luma-line" style="${marginStyle}">
                <blockquote id="${node.id}" class="luma-quote">${this.renderInline(node.content)}</blockquote>
            </div>`;
    }

    static renderHorizontalRule(marginStyle) {
        return `
            <div class="luma-line" style="${marginStyle} width: 100%;">
                <hr class="luma-hr" />
            </div>`;
    }

    static renderTreeBranch(node, marginStyle) {
        return `
            <div class="luma-line-tight" style="${marginStyle}">
                <div id="${node.id}" class="luma-tree-branch">${this.escapeHtml(node.label)}</div>
            </div>`;
    }

    static renderTreeLeaf(node, marginStyle) {
        return `
            <div class="luma-line-tight" style="${marginStyle}">
                <div id="${node.id}" class="luma-tree-leaf">${this.escapeHtml(node.label)}</div>
            </div>`;
    }

    /* =====================================================================================
       4. SPATIAL SHAPES & NODES (The Core Graph Elements)
       ===================================================================================== */

    static renderShape(node, marginStyle) {
        const shapeClass = `luma-shape-${node.shape || 'block'}`;
        const traitClasses = (node.traits || []).map(t => `luma-trait-${t}`).join(' ');
        
        let innerHTML = this.renderInline(node.richLabel || node.label);

        // Geometric shapes skew the container, so we must un-skew the text wrapper
        if (node.shape === 'geometric') {
            innerHTML = `<span>${innerHTML}</span>`;
        }
        
        // Database shapes (Cylinders) require pseudo-elements for the 3D effect in advanced CSS
        if (node.shape === 'database') {
            innerHTML = `<div class="db-top"></div><div class="db-body">${innerHTML}</div>`;
        }

        // Implicit nodes are missing from the code but generated by edges
        if (node.traits && node.traits.includes('implicit')) {
            marginStyle += ' opacity: 0.7; border-style: dashed;';
        }

        return `
            <div class="luma-line" style="${marginStyle}">
                <div id="${node.id}" class="luma-node ${shapeClass} ${traitClasses}" data-depth="${node.depth}">
                    ${innerHTML}
                </div>
            </div>`;
    }

    /* =====================================================================================
       5. DATA TABLES ENGINE
       ===================================================================================== */

    static renderTable(node, marginStyle) {
        let html = `<div class="luma-line" style="${marginStyle} width: 100%;"><div class="luma-table-wrapper"><table id="${node.id}" class="luma-table">`;
        
        // Render Headers
        if (node.headers && node.headers.length > 0) {
            html += `<thead><tr>`;
            node.headers.forEach((headerTokens, i) => {
                const align = node.alignments[i] || 'left';
                html += `<th style="text-align: ${align};">${this.renderInline(headerTokens)}</th>`;
            });
            html += `</tr></thead>`;
        }

        // Render Body
        if (node.rows && node.rows.length > 0) {
            html += `<tbody>`;
            node.rows.forEach(rowTokens => {
                html += `<tr>`;
                rowTokens.forEach((cellTokens, i) => {
                    const align = node.alignments[i] || 'left';
                    html += `<td style="text-align: ${align};">${this.renderInline(cellTokens)}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody>`;
        }

        html += `</table></div></div>`;
        return html;
    }

    /* =====================================================================================
       6. LEXICAL SYNTAX HIGHLIGHTER ENGINE (Code Blocks)
       ===================================================================================== */

    static renderCodeBlock(node, marginStyle) {
        const lang = node.language || 'text';
        const highlightedCode = this.highlightSyntax(node.content, lang);

        return `
            <div class="luma-line" style="${marginStyle} width: 100%;">
                <div id="${node.id}" class="luma-code-block" data-lang="${this.escapeHtml(lang)}">
                    <div class="luma-code-header">
                        <span class="luma-code-lang">${this.escapeHtml(lang)}</span>
                        <button class="luma-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText)">Copy</button>
                    </div>
                    <pre><code class="language-${this.escapeHtml(lang)}">${highlightedCode}</code></pre>
                </div>
            </div>`;
    }

    static highlightSyntax(code, lang) {
        let html = this.escapeHtml(code);

        if (lang === 'javascript' || lang === 'js' || lang === 'ts' || lang === 'typescript') {
            // Strings
            html = html.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[\s\S]*?`)/g, '<span class="editor-string">$1</span>');
            // Keywords
            html = html.replace(/\b(const|let|var|function|class|return|if|else|for|while|import|export|from|new|this|await|async|switch|case|break)\b/g, '<span class="editor-keyword">$1</span>');
            // Numbers
            html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="editor-number">$1</span>');
            // Comments
            html = html.replace(/(\/\/.*$)/gm, '<span class="editor-comment">$1</span>');
            html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="editor-comment">$1</span>');
            // Booleans & Null
            html = html.replace(/\b(true|false|null|undefined)\b/g, '<span class="editor-boolean">$1</span>');
            // Functions
            html = html.replace(/([a-zA-Z0-9_]+)(?=\()/g, '<span class="editor-function">$1</span>');
        } 
        else if (lang === 'css') {
            html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="editor-comment">$1</span>');
            html = html.replace(/([a-zA-Z0-9_-]+)(?=:)/g, '<span class="editor-keyword">$1</span>');
            html = html.replace(/(#[0-9a-fA-F]+)/g, '<span class="editor-number">$1</span>');
            html = html.replace(/([\.#][a-zA-Z0-9_-]+)/g, '<span class="editor-function">$1</span>');
        }
        else if (lang === 'html' || lang === 'xml') {
            html = html.replace(/(&lt;\/?)([a-zA-Z0-9_-]+)/g, '$1<span class="editor-keyword">$2</span>');
            html = html.replace(/([a-zA-Z0-9_-]+)=(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="editor-function">$1</span>=<span class="editor-string">$2</span>');
            html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="editor-comment">$1</span>');
        }

        return html;
    }

    /* =====================================================================================
       7. MATHEMATICAL TYPESETTING ENGINE (LaTeX to HTML/CSS)
       ===================================================================================== */

    static renderMathBlock(node, marginStyle) {
        let titleHtml = node.title ? `<div class="luma-math-title">${this.escapeHtml(node.title)}</div>` : '';
        
        // Parse the block content into our native HTML math layout
        const mathHtml = this.parseMathExpression(node.content);

        return `
            <div class="luma-line" style="${marginStyle}">
                <div id="${node.id}" class="luma-math-block">
                    ${titleHtml}
                    <div class="luma-math-content">
                        ${mathHtml}
                    </div>
                </div>
            </div>`;
    }

    static renderInlineMath(expression) {
        return `<span class="luma-math-inline">${this.parseMathExpression(expression)}</span>`;
    }

    /**
     * A native engine to convert pseudo-LaTeX into Flexbox HTML layouts.
     * Supports fractions \frac{a}{b}, superscripts ^, subscripts _, roots \sqrt, integrals.
     */
    static parseMathExpression(expr) {
        let html = this.escapeHtml(expr.trim());

        // 1. Fractions: \frac{numerator}{denominator}
        // Uses a recursive regex approach to handle nested fractions
        while (html.includes('\\frac{')) {
            html = html.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (match, num, den) => {
                return `<span class="math-frac"><span class="math-num">${num}</span><span class="math-den">${den}</span></span>`;
            });
        }
        // Fallback for simple ASCII fractions: a / b (only if surrounded by spaces or isolated)
        html = html.replace(/\b([a-zA-Z0-9_]+)\s*\/\s*([a-zA-Z0-9_]+)\b/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>');

        // 2. Square Roots: \sqrt{expression}
        html = html.replace(/\\sqrt\{([^{}]+)\}/g, '<span class="math-sqrt"><span class="math-sqrt-sign">&radic;</span><span class="math-sqrt-inner">$1</span></span>');
        // Fallback: root(expression)
        html = html.replace(/root\(([^\(\)]+)\)/g, '<span class="math-sqrt"><span class="math-sqrt-sign">&radic;</span><span class="math-sqrt-inner">$1</span></span>');

        // 3. Superscripts & Subscripts: x^2 or y_1
        // Handles single characters or bracketed groups ^{12}
        html = html.replace(/\^\{([^{}]+)\}/g, '<sup class="math-sup">$1</sup>');
        html = html.replace(/\^([a-zA-Z0-9])/g, '<sup class="math-sup">$1</sup>');
        
        html = html.replace(/_\{([^{}]+)\}/g, '<sub class="math-sub">$1</sub>');
        html = html.replace(/_([a-zA-Z0-9])/g, '<sub class="math-sub">$1</sub>');

        // 4. Symbols & Operators Mapping
        const symbols = {
            '\\pi': '&pi;',
            '\\sum': '&sum;',
            '\\int': '&int;',
            '\\infty': '&infin;',
            '\\approx': '&asymp;',
            '\\neq': '&ne;',
            '\\pm': '&plusmn;',
            '+-': '&plusmn;',
            '<=': '&le;',
            '>=': '&ge;',
            '\\cdot': '&sdot;',
            '*': '&times;',
            '\\alpha': '&alpha;',
            '\\beta': '&beta;',
            '\\gamma': '&gamma;',
            '\\theta': '&theta;',
            '\\Delta': '&Delta;'
        };

        for (const [key, val] of Object.entries(symbols)) {
            // Replace globally, escaping the backslash for regex
            const regex = new RegExp(key.replace(/\\/g, '\\\\'), 'g');
            html = html.replace(regex, `<span class="math-sym">${val}</span>`);
        }

        // 5. Wrap variables in italics (standard math typography)
        // Matches lone letters not inside HTML tags
        html = html.replace(/(?<!<[^>]*)\b([a-zA-Z])\b(?![^<]*>)/g, '<i class="math-var">$1</i>');

        return html;
    }

    /* =====================================================================================
       8. NATIVE SVG CHARTING ENGINE (Mermaid Alternative)
       ===================================================================================== */

    static renderChart(node, marginStyle) {
        if (!node.dataset || node.dataset.length === 0) {
            return `<div class="luma-line" style="${marginStyle}"><div class="luma-error-block">Chart Error: Empty Dataset</div></div>`;
        }

        let chartHtml = '';
        const width = parseInt(node.config.width) || 600;
        const height = parseInt(node.config.height) || 400;

        try {
            switch (node.chartType) {
                case 'bar': chartHtml = this.renderBarChart(node.dataset, width, height, node.config); break;
                case 'pie': chartHtml = this.renderPieChart(node.dataset, width, height, node.config); break;
                case 'line': chartHtml = this.renderLineChart(node.dataset, width, height, node.config); break;
                case 'sequence': chartHtml = this.renderSequenceChart(node.dataset, width, height, node.config); break;
                case 'gantt': chartHtml = this.renderGanttChart(node.dataset, width, height, node.config); break;
                default: throw new Error(`Unsupported chart type: ${node.chartType}`);
            }
        } catch (err) {
            console.error(`[Luma Charting] Error generating ${node.chartType} chart:`, err);
            chartHtml = `<div class="luma-error-block">Failed to render chart: ${err.message}</div>`;
        }

        return `
            <div class="luma-line" style="${marginStyle} width: 100%; max-width: ${width}px;">
                <div id="${node.id}" class="luma-chart-container luma-chart-${node.chartType}">
                    ${chartHtml}
                </div>
            </div>`;
    }

    // --- 8.1 Bar Chart Generator ---
    static renderBarChart(dataset, width, height, config) {
        const padding = 40;
        const chartW = width - (padding * 2);
        const chartH = height - (padding * 2);
        
        const maxValue = Math.max(...dataset.map(d => d.value || 0)) || 1;
        const barWidth = chartW / dataset.length;
        
        let svg = `<svg viewBox="0 0 ${width} ${height}" class="luma-svg-chart" xmlns="http://www.w3.org/2000/svg">`;
        
        // Axes
        svg += `
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--border-heavy)" stroke-width="2"/>
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-heavy)" stroke-width="2"/>
        `;

        // Grid lines & Y-Axis Labels
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (chartH / gridLines) * i;
            const val = Math.round(maxValue - (maxValue / gridLines) * i);
            svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border-light)" stroke-width="1" stroke-dasharray="4,4"/>`;
            svg += `<text x="${padding - 10}" y="${y + 4}" font-family="var(--font-sans)" font-size="12" fill="var(--text-mute)" text-anchor="end">${val}</text>`;
        }

        // Bars & X-Axis Labels
        dataset.forEach((data, index) => {
            const barH = (data.value / maxValue) * chartH;
            const x = padding + (index * barWidth) + (barWidth * 0.1);
            const y = height - padding - barH;
            const bWidth = barWidth * 0.8; // 80% width for gap

            // Primary theme color fallback
            const color = config.color || 'var(--intent-primary)';

            svg += `<rect x="${x}" y="${y}" width="${bWidth}" height="${barH}" fill="${color}" rx="4" class="luma-chart-bar">
                        <title>${data.label}: ${data.value}</title>
                    </rect>`;
            
            // Truncate long labels
            let label = data.label;
            if (label.length > 10) label = label.substring(0, 8) + '..';

            svg += `<text x="${x + (bWidth/2)}" y="${height - padding + 20}" font-family="var(--font-sans)" font-size="12" fill="var(--text-main)" text-anchor="middle">${this.escapeHtml(label)}</text>`;
        });

        svg += `</svg>`;
        return svg;
    }

    // --- 8.2 Pie Chart Generator (Trigonometry Engine) ---
    static renderPieChart(dataset, width, height, config) {
        const radius = Math.min(width, height) / 2 - 40;
        const cx = width / 2;
        const cy = height / 2;
        
        const total = dataset.reduce((sum, d) => sum + (d.value || 0), 0);
        if (total === 0) throw new Error("Pie chart total value is 0");

        // Color palette generator
        const colors = ['var(--intent-primary)', 'var(--intent-success)', 'var(--intent-warning)', 'var(--intent-danger)', 'var(--intent-info)', 'var(--p-purple-500)', 'var(--p-pink-500)'];

        let svg = `<svg viewBox="0 0 ${width} ${height}" class="luma-svg-chart" xmlns="http://www.w3.org/2000/svg">`;
        
        let startAngle = 0;
        let legendHtml = `<g class="luma-pie-legend">`;

        dataset.forEach((data, index) => {
            const sliceAngle = (data.value / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;
            
            // Calculate SVG Arc coordinates
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);

            // Large arc flag (> 180 degrees)
            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
            const color = colors[index % colors.length];

            // Only draw path if it's not a full 360 circle
            if (sliceAngle < 2 * Math.PI) {
                const pathData = [
                    `M ${cx} ${cy}`,
                    `L ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    `Z`
                ].join(' ');

                svg += `<path d="${pathData}" fill="${color}" stroke="var(--bg-panel)" stroke-width="2" class="luma-chart-pie-slice">
                            <title>${data.label}: ${data.value} (${Math.round((data.value/total)*100)}%)</title>
                        </path>`;
            } else {
                // Full circle fallback
                svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" class="luma-chart-pie-slice"><title>${data.label}: ${data.value}</title></circle>`;
            }

            // Text Label positioned at the center of the slice
            const midAngle = startAngle + (sliceAngle / 2);
            const textRadius = radius * 0.65;
            const tx = cx + textRadius * Math.cos(midAngle);
            const ty = cy + textRadius * Math.sin(midAngle);
            
            // Only show text if slice is large enough (> 5%)
            if ((data.value / total) > 0.05) {
                svg += `<text x="${tx}" y="${ty}" font-family="var(--font-sans)" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${Math.round((data.value/total)*100)}%</text>`;
            }

            // Build Legend
            const legY = 20 + (index * 20);
            legendHtml += `
                <rect x="${width - 120}" y="${legY - 10}" width="12" height="12" fill="${color}" rx="2"/>
                <text x="${width - 100}" y="${legY}" font-family="var(--font-sans)" font-size="12" fill="var(--text-main)">${this.escapeHtml(data.label)}</text>
            `;

            startAngle = endAngle;
        });

        legendHtml += `</g>`;
        svg += legendHtml + `</svg>`;
        return svg;
    }

    // --- 8.3 Line Chart Generator ---
    static renderLineChart(dataset, width, height, config) {
        const padding = 40;
        const chartW = width - (padding * 2);
        const chartH = height - (padding * 2);
        
        const maxValue = Math.max(...dataset.map(d => d.value || 0)) || 1;
        const stepX = chartW / Math.max(1, dataset.length - 1);
        
        let svg = `<svg viewBox="0 0 ${width} ${height}" class="luma-svg-chart" xmlns="http://www.w3.org/2000/svg">`;
        
        // Axes
        svg += `
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--border-heavy)" stroke-width="2"/>
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-heavy)" stroke-width="2"/>
        `;

        // Grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (chartH / gridLines) * i;
            const val = Math.round(maxValue - (maxValue / gridLines) * i);
            svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border-light)" stroke-width="1" stroke-dasharray="4,4"/>`;
            svg += `<text x="${padding - 10}" y="${y + 4}" font-family="var(--font-sans)" font-size="12" fill="var(--text-mute)" text-anchor="end">${val}</text>`;
        }

        // Build Line Path
        let pathData = '';
        let pointsHtml = '';
        const color = config.color || 'var(--intent-primary)';

        dataset.forEach((data, index) => {
            const x = padding + (index * stepX);
            const y = height - padding - ((data.value / maxValue) * chartH);

            if (index === 0) pathData += `M ${x} ${y} `;
            else pathData += `L ${x} ${y} `;

            // Interactive Data Points
            pointsHtml += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="var(--bg-panel)" stroke-width="2" class="luma-chart-point">
                            <title>${data.label}: ${data.value}</title>
                           </circle>`;
            
            // X-Axis Label
            let label = data.label;
            if (label.length > 8) label = label.substring(0, 6) + '..';
            svg += `<text x="${x}" y="${height - padding + 20}" font-family="var(--font-sans)" font-size="12" fill="var(--text-main)" text-anchor="middle">${this.escapeHtml(label)}</text>`;
        });

        // Add the path and points
        svg += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="luma-chart-line"/>`;
        svg += pointsHtml;

        svg += `</svg>`;
        return svg;
    }

    // --- 8.4 Sequence Diagram Generator ---
    static renderSequenceChart(dataset, width, height, config) {
        if (!dataset || dataset.length === 0) return '<div class="luma-error-block">Empty Sequence</div>';

        // 1. Identify unique actors
        const actors = new Set();
        dataset.forEach(d => {
            if (d.from) actors.add(d.from);
            if (d.to) actors.add(d.to);
        });

        const actorArray = Array.from(actors);
        const numActors = actorArray.length;
        const actorWidth = 120;
        const actorSpacing = width / numActors;
        
        // Auto-calculate height based on number of messages
        const headerH = 60;
        const messageSpacing = 50;
        const calcHeight = headerH + (dataset.length * messageSpacing) + 60;
        const finalHeight = Math.max(height, calcHeight);

        let svg = `<svg viewBox="0 0 ${width} ${finalHeight}" class="luma-svg-chart" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <marker id="seq-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-main)" />
                        </marker>
                        <marker id="seq-arrow-dashed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-mute)" />
                        </marker>
                    </defs>`;

        // Render Actors & Lifelines
        actorArray.forEach((actor, index) => {
            const cx = (actorSpacing * index) + (actorSpacing / 2);
            
            // Lifeline
            svg += `<line x1="${cx}" y1="${headerH}" x2="${cx}" y2="${finalHeight - 30}" stroke="var(--border-heavy)" stroke-width="2" stroke-dasharray="6,6"/>`;
            
            // Actor Box
            svg += `
                <rect x="${cx - (actorWidth/2)}" y="10" width="${actorWidth}" height="40" rx="4" fill="var(--bg-panel)" stroke="var(--border-heavy)" stroke-width="2"/>
                <text x="${cx}" y="35" font-family="var(--font-sans)" font-size="14" font-weight="bold" fill="var(--text-main)" text-anchor="middle">${this.escapeHtml(actor)}</text>
            `;
        });

        // Render Messages
        let currentY = headerH + 30;
        dataset.forEach(msg => {
            if (!msg.from || !msg.to) return;

            const fromIdx = actorArray.indexOf(msg.from);
            const toIdx = actorArray.indexOf(msg.to);
            
            const fromX = (actorSpacing * fromIdx) + (actorSpacing / 2);
            const toX = (actorSpacing * toIdx) + (actorSpacing / 2);

            // Determine line style based on operator (-> vs ~> vs =>)
            let stroke = 'var(--text-main)';
            let dash = '';
            let marker = 'url(#seq-arrow)';
            let strokeW = '2';

            if (msg.edge === '-->') { dash = 'stroke-dasharray="5,5"'; stroke = 'var(--text-mute)'; marker = 'url(#seq-arrow-dashed)'; }
            if (msg.edge === '=>') { strokeW = '4'; stroke = 'var(--intent-primary)'; } // Thick transition

            // Draw line
            svg += `<line x1="${fromX}" y1="${currentY}" x2="${toX}" y2="${currentY}" stroke="${stroke}" stroke-width="${strokeW}" ${dash} marker-end="${marker}"/>`;
            
            // Draw Message Text (placed above the line)
            const textX = Math.min(fromX, toX) + (Math.abs(toX - fromX) / 2);
            svg += `<text x="${textX}" y="${currentY - 10}" font-family="var(--font-sans)" font-size="12" fill="var(--text-body)" text-anchor="middle">${this.escapeHtml(msg.message)}</text>`;

            currentY += messageSpacing;
        });

        svg += `</svg>`;
        return svg;
    }

    // --- 8.5 Gantt Chart Generator ---
    static renderGanttChart(dataset, width, height, config) {
        return `<div class="luma-error-block">Gantt engine initialized but awaiting date-parser integration in v4.1.</div>`;
    }

    /* =====================================================================================
       9. LAYOUT BLOCKS (Grid/Flexbox Mapping)
       ===================================================================================== */

    static renderLayoutBlock(node, marginStyle) {
        // Map Luma layout aliases to CSS classes
        let layoutClass = 'luma-layout-block';
        if (node.layout === 'flex-row') layoutClass += ' d-flex flex-row gap-4';
        if (node.layout === 'grid-2') layoutClass += ' d-grid grid-cols-2 gap-4';
        if (node.layout === 'grid-3') layoutClass += ' d-grid grid-cols-3 gap-4';

        // Render children
        let childrenHtml = '';
        if (node.children) {
            node.children.forEach(child => {
                // For this implementation, children inside layouts are parsed as raw strings in the parser.
                // A full recursive parser would call LumaRenderer.renderNode(child) here.
                if (child.raw) {
                    childrenHtml += `<div class="luma-layout-item">${this.escapeHtml(child.raw)}</div>`;
                }
            });
        }

        return `
            <div class="luma-line" style="${marginStyle} width: 100%;">
                <div id="${node.id}" class="${layoutClass}">
                    ${childrenHtml}
                </div>
            </div>`;
    }

    /* =====================================================================================
       10. SECURITY & UTILITIES
       ===================================================================================== */

    /**
     * Prevents XSS attacks by escaping HTML characters in user input.
     */
    static escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Module export compatibility (Node.js & ES6 Browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LumaRenderer };
} else if (typeof window !== 'undefined') {
    window.LumaRenderer = LumaRenderer;
}