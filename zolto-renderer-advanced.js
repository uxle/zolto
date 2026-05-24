/**
 * =========================================================================================
 * ZOLTO STUDIO: ADVANCED RENDERER ENGINE (Module 5 of 7)
 * =========================================================================================
 * Description: Dynamically extends the base ZoltoRenderer class with heavy compute 
 * modules for Native SVG Charting, Lexical Syntax Highlighting, and LaTeX Math.
 * =========================================================================================
 */

'use strict';

const ZoltoAdvancedEngines = {

    renderCodeBlock(node, marginStyle) {
        const lang = (node.language || 'text').toLowerCase().replace(/[^a-z0-9-]/g, '');
        const highlightedCode = this.highlightSyntax(node.content, lang);
        return `
            <div class="zolto-line" style="${marginStyle} width: 100%;">
                <div id="${this.escapeHtml(node.id)}" class="zolto-code-block" data-lang="${lang}">
                    <div class="zolto-code-header">
                        <span class="zolto-code-lang">${lang}</span>
                        <button class="zolto-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText)" aria-label="Copy Code">Copy</button>
                    </div>
                    <pre><code class="language-${lang}">${highlightedCode}</code></pre>
                </div>
            </div>`;
    },

    highlightSyntax(code, lang) {
        if (!code) return '';
        let html = this.escapeHtml(code);
        if (['javascript', 'js', 'ts', 'typescript'].includes(lang)) {
            html = html.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|`[\s\S]*?`)/g, '<span class="editor-string">$1</span>')
                       .replace(/\b(const|let|var|function|class|return|if|else|for|while|import|export|from|new|this|await|async|switch|case|break|try|catch|finally|throw|yield)\b/g, '<span class="editor-keyword">$1</span>')
                       .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="editor-number">$1</span>')
                       .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="editor-comment">$1</span>')
                       .replace(/\b(true|false|null|undefined)\b/g, '<span class="editor-boolean">$1</span>')
                       .replace(/\b([a-zA-Z0-9_]+)(?=\()/g, '<span class="editor-function">$1</span>');
        } else if (lang === 'css') {
            html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="editor-comment">$1</span>')
                       .replace(/([a-zA-Z0-9_-]+)(?=:)/g, '<span class="editor-keyword">$1</span>')
                       .replace(/(#[0-9a-fA-F]+|\b\d+(?:px|em|rem|vh|vw|%)\b)/g, '<span class="editor-number">$1</span>')
                       .replace(/([\.#][a-zA-Z0-9_-]+)/g, '<span class="editor-function">$1</span>');
        } else if (['html', 'xml', 'svg'].includes(lang)) {
            html = html.replace(/(&lt;\/?)([a-zA-Z0-9_-]+)/g, '$1<span class="editor-keyword">$2</span>')
                       .replace(/([a-zA-Z0-9_-]+)=(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="editor-function">$1</span>=<span class="editor-string">$2</span>')
                       .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="editor-comment">$1</span>');
        }
        return html;
    },

    renderMathBlock(node, marginStyle) {
        let titleHtml = node.title ? `<div class="zolto-math-title">${this.escapeHtml(node.title)}</div>` : '';
        const mathHtml = this.parseMathExpression(node.content);
        return `
            <div class="zolto-line" style="${marginStyle}">
                <div id="${this.escapeHtml(node.id)}" class="zolto-math-block">
                    ${titleHtml}
                    <div class="zolto-math-content">${mathHtml}</div>
                </div>
            </div>`;
    },

    renderInlineMath(expression) {
        return `<span class="zolto-math-inline">${this.parseMathExpression(expression)}</span>`;
    },

    parseMathExpression(expr) {
        if (!expr) return '';
        let html = this.escapeHtml(expr.trim());
        let prev;
        do {
            prev = html;
            html = html.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>');
        } while (html !== prev);
        html = html.replace(/(?<!<[^>]*)\b([a-zA-Z0-9_]+)\s*\/\s*([a-zA-Z0-9_]+)\b(?![^<]*>)/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>');
        do {
            prev = html;
            html = html.replace(/\\sqrt\{([^{}]+)\}/g, '<span class="math-sqrt"><span class="math-sqrt-sign">&radic;</span><span class="math-sqrt-inner">$1</span></span>');
        } while (html !== prev);
        html = html.replace(/root\(([^\(\)]+)\)/g, '<span class="math-sqrt"><span class="math-sqrt-sign">&radic;</span><span class="math-sqrt-inner">$1</span></span>');
        html = html.replace(/\^\{([^{}]+)\}/g, '<sup class="math-sup">$1</sup>');
        html = html.replace(/(?<!<[^>]*)\^([a-zA-Z0-9])(?![^<]*>)/g, '<sup class="math-sup">$1</sup>');
        html = html.replace(/_\{([^{}]+)\}/g, '<sub class="math-sub">$1</sub>');
        html = html.replace(/(?<!<[^>]*)_([a-zA-Z0-9])(?![^<]*>)/g, '<sub class="math-sub">$1</sub>');
        
        const symbols = {
            '\\\\pi': '&pi;', '\\\\sum': '&sum;', '\\\\int': '&int;', '\\\\infty': '&infin;',
            '\\\\approx': '&asymp;', '\\\\neq': '&ne;', '\\\\pm': '&plusmn;', '\\+-': '&plusmn;',
            '&lt;=': '&le;', '&gt;=': '&ge;', '\\\\cdot': '&sdot;', '\\*': '&times;',
            '\\\\alpha': '&alpha;', '\\\\beta': '&beta;', '\\\\gamma': '&gamma;',
            '\\\\theta': '&theta;', '\\\\Delta': '&Delta;', '\\\\nabla': '&nabla;'
        };
        for (const [key, val] of Object.entries(symbols)) html = html.replace(new RegExp(key, 'g'), `<span class="math-sym">${val}</span>`);
        return html.replace(/(?<!<[^>]*)\b([a-zA-Z])\b(?![^<]*>)/g, '<i class="math-var">$1</i>');
    },

    renderChart(node, marginStyle) {
        if (!Array.isArray(node.dataset) || node.dataset.length === 0) {
            return `<div class="zolto-line" style="${marginStyle}"><div class="zolto-error-block">Chart Error: Empty Dataset</div></div>`;
        }
        let chartHtml = '';
        const width = Math.max(200, Math.min(2000, parseInt(node.config.width, 10) || 600));
        const height = Math.max(100, Math.min(2000, parseInt(node.config.height, 10) || 400));
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
            chartHtml = `<div class="zolto-error-block">Failed to render chart: ${this.escapeHtml(err.message)}</div>`;
        }
        return `<div class="zolto-line" style="${marginStyle} width: 100%; max-width: ${width}px;"><div id="${this.escapeHtml(node.id)}" class="zolto-chart-container zolto-chart-${this.escapeHtml(node.chartType)}">${chartHtml}</div></div>`;
    },

    renderBarChart(dataset, width, height, config) {
        const padding = 40, chartW = width - (padding * 2), chartH = height - (padding * 2);
        const maxValue = Math.max(1, ...dataset.map(d => Number(d.value) || 0));
        const barWidth = chartW / Math.max(1, dataset.length);
        let svg = `<svg viewBox="0 0 ${width} ${height}" class="zolto-svg-chart" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--border-heavy)" stroke-width="2"/>
                <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-heavy)" stroke-width="2"/>`;
        const color = this.sanitizeCssColor(config.color) || 'var(--intent-primary)';
        dataset.forEach((data, index) => {
            const val = Math.max(0, Number(data.value) || 0), barH = (val / maxValue) * chartH;
            const x = padding + (index * barWidth) + (barWidth * 0.1), y = height - padding - barH, bWidth = Math.max(1, barWidth * 0.8);
            const safeLabel = this.escapeHtml(data.label || '');
            svg += `<rect x="${x}" y="${y}" width="${bWidth}" height="${barH}" fill="${color}" rx="4" class="zolto-chart-bar"><title>${safeLabel}: ${val}</title></rect>`;
            const truncLabel = safeLabel.length > 10 ? safeLabel.substring(0, 8) + '..' : safeLabel;
            svg += `<text x="${x + (bWidth/2)}" y="${height - padding + 20}" font-family="var(--font-sans)" font-size="12" fill="var(--text-main)" text-anchor="middle">${truncLabel}</text>`;
        });
        return svg + `</svg>`;
    },

    renderPieChart(dataset, width, height, config) {
        const radius = Math.max(10, Math.min(width, height) / 2 - 40), cx = width / 2, cy = height / 2;
        const total = dataset.reduce((sum, d) => sum + Math.max(0, Number(d.value) || 0), 0);
        if (total <= 0) throw new Error("Pie chart total value must be greater than 0");
        const colors = ['var(--intent-primary)', 'var(--intent-success)', 'var(--intent-warning)', 'var(--intent-danger)', 'var(--intent-info)', 'var(--p-purple-500)', 'var(--p-pink-500)'];
        let svg = `<svg viewBox="0 0 ${width} ${height}" class="zolto-svg-chart" xmlns="http://www.w3.org/2000/svg">`, startAngle = 0, legendHtml = `<g class="zolto-pie-legend">`;
        dataset.forEach((data, index) => {
            const val = Math.max(0, Number(data.value) || 0);
            if (val === 0) return;
            const sliceAngle = (val / total) * 2 * Math.PI, endAngle = startAngle + sliceAngle;
            const x1 = cx + radius * Math.cos(startAngle), y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle), y2 = cy + radius * Math.sin(endAngle);
            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0, color = colors[index % colors.length], safeLabel = this.escapeHtml(data.label || '');
            if (sliceAngle < 2 * Math.PI - 0.001) {
                const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                svg += `<path d="${pathData}" fill="${color}" stroke="var(--bg-panel)" stroke-width="2" class="zolto-chart-pie-slice"><title>${safeLabel}: ${val}</title></path>`;
            } else {
                svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" class="zolto-chart-pie-slice"><title>${safeLabel}: ${val}</title></circle>`;
            }
            const legY = 20 + (index * 20);
            legendHtml += `<rect x="${width - 120}" y="${legY - 10}" width="12" height="12" fill="${color}" rx="2"/>
                           <text x="${width - 100}" y="${legY}" font-family="var(--font-sans)" font-size="12" fill="var(--text-main)">${safeLabel}</text>`;
            startAngle = endAngle;
        });
        return svg + legendHtml + `</g></svg>`;
    },

    renderLineChart(dataset, width, height, config) {
        const padding = 40, chartW = width - (padding * 2), chartH = height - (padding * 2);
        if (dataset.length < 2) throw new Error("Line chart requires at least 2 data points");
        const maxValue = Math.max(1, ...dataset.map(d => Number(d.value) || 0)), stepX = chartW / (dataset.length - 1);
        let svg = `<svg viewBox="0 0 ${width} ${height}" class="zolto-svg-chart" xmlns="http://www.w3.org/2000/svg">`;
        let pathData = '', pointsHtml = '', color = this.sanitizeCssColor(config.color) || 'var(--intent-primary)';
        dataset.forEach((data, index) => {
            const val = Math.max(0, Number(data.value) || 0), x = padding + (index * stepX), y = height - padding - ((val / maxValue) * chartH);
            const safeLabel = this.escapeHtml(data.label || ''), truncLabel = safeLabel.length > 8 ? safeLabel.substring(0, 6) + '..' : safeLabel;
            pathData += (index === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
            pointsHtml += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="var(--bg-panel)" stroke-width="2" class="zolto-chart-point"><title>${safeLabel}: ${val}</title></circle>`;
            svg += `<text x="${x}" y="${height - padding + 20}" font-family="var(--font-sans)" font-size="12" fill="var(--text-main)" text-anchor="middle">${truncLabel}</text>`;
        });
        svg += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="zolto-chart-line"/>`;
        return svg + pointsHtml + `</svg>`;
    },

    renderSequenceChart(dataset, width, height, config) {
        const actors = Array.from(new Set(dataset.flatMap(d => [d.from, d.to]).filter(Boolean)));
        if (actors.length === 0) return '';
        const actorWidth = 120, actorSpacing = width / actors.length, headerH = 60, messageSpacing = 50;
        const finalHeight = Math.max(height, headerH + (dataset.length * messageSpacing) + 60);
        let svg = `<svg viewBox="0 0 ${width} ${finalHeight}" class="zolto-svg-chart" xmlns="http://www.w3.org/2000/svg">`;
        actors.forEach((actor, index) => {
            const cx = (actorSpacing * index) + (actorSpacing / 2);
            svg += `<line x1="${cx}" y1="${headerH}" x2="${cx}" y2="${finalHeight - 30}" stroke="var(--border-heavy)" stroke-width="2" stroke-dasharray="6,6"/>
                    <rect x="${cx - (actorWidth/2)}" y="10" width="${actorWidth}" height="40" rx="4" fill="var(--bg-panel)" stroke="var(--border-heavy)" stroke-width="2"/>
                    <text x="${cx}" y="35" font-family="var(--font-sans)" font-size="14" font-weight="bold" fill="var(--text-main)" text-anchor="middle">${this.escapeHtml(actor)}</text>`;
        });
        let currentY = headerH + 30;
        dataset.forEach(msg => {
            if (!msg.from || !msg.to) return;
            const fromX = (actorSpacing * actors.indexOf(msg.from)) + (actorSpacing / 2), toX = (actorSpacing * actors.indexOf(msg.to)) + (actorSpacing / 2);
            let stroke = 'var(--text-main)', dash = '', marker = 'url(#seq-arrow)', strokeW = '2';
            if (msg.edge === '-->') { dash = 'stroke-dasharray="5,5"'; stroke = 'var(--text-mute)'; marker = 'url(#seq-arrow-dashed)'; }
            if (msg.edge === '=>') { strokeW = '4'; stroke = 'var(--intent-primary)'; }
            svg += `<line x1="${fromX}" y1="${currentY}" x2="${toX}" y2="${currentY}" stroke="${stroke}" stroke-width="${strokeW}" ${dash} marker-end="${marker}"/>`;
            const textX = Math.min(fromX, toX) + (Math.abs(toX - fromX) / 2);
            svg += `<text x="${textX}" y="${currentY - 10}" font-family="var(--font-sans)" font-size="12" fill="var(--text-body)" text-anchor="middle">${this.escapeHtml(msg.message)}</text>`;
            currentY += messageSpacing;
        });
        return svg + `</svg>`;
    },

    renderGanttChart(dataset, width, height, config) {
        if (!dataset || dataset.length === 0) return '<div class="zolto-error-block">Empty Gantt Data</div>';
        const padding = 20, rowH = 30, finalHeight = Math.max(height, (dataset.length * rowH) + (padding * 2));
        let svg = `<svg viewBox="0 0 ${width} ${finalHeight}" class="zolto-svg-chart" xmlns="http://www.w3.org/2000/svg">`;
        let maxVal = 1;
        dataset.forEach(d => { const val = Number(d.value) || 0; if (val > maxVal) maxVal = val; });
        const usableW = width - 150 - padding;
        dataset.forEach((data, i) => {
            const y = padding + (i * rowH), val = Math.max(0, Number(data.value) || 0), barW = (val / maxVal) * usableW;
            const safeLabel = this.escapeHtml(data.label || data.raw || 'Task'), color = 'var(--intent-primary)';
            svg += `<text x="140" y="${y + 15}" font-family="var(--font-sans)" font-size="12" fill="var(--text-main)" text-anchor="end">${safeLabel}</text>
                    <rect x="150" y="${y}" width="${barW}" height="${rowH - 4}" fill="${color}" rx="4" class="zolto-chart-bar"><title>${val} units</title></rect>
                    <text x="${150 + barW + 5}" y="${y + 15}" font-family="var(--font-sans)" font-size="10" fill="var(--text-mute)" dominant-baseline="central">${val}</text>`;
        });
        return svg + `</svg>`;
    }
};

// Inject advanced engines into the base class if it exists
if (typeof ZoltoRenderer !== 'undefined') {
    Object.assign(ZoltoRenderer, ZoltoAdvancedEngines);
}
