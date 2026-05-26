/**
 * =========================================================================================
 * ZOLTO STUDIO: ADVANCED RENDERER ENGINE — v9.0.0-omnibus
 * =========================================================================================
 * Module 5 of 7 · Heavy-Compute Extension for ZoltoRenderer
 *
 * ── Domain Coverage ──────────────────────────────────────────────────────────────────────
 *  §1  CODE BLOCKS        — Syntax highlighting for 18 languages, line numbers, diff,
 *                           filename, collapsible long files, copy with feedback
 *  §2  MATH ENGINE        — LaTeX-level: fractions, roots, matrices, integrals, limits,
 *                           summations, chemistry, physics units, statistics, function
 *                           plotting, auto-numbered equations, align environments
 *  §3  CHARTS             — Bar (grouped/stacked/horizontal), Pie, Donut, Line, Area,
 *                           Scatter (+regression), Radar, Histogram, Heatmap, Treemap,
 *                           Bubble, Funnel, Waterfall, Candlestick — all native SVG
 *  §4  DIAGRAMS           — Architecture/C4, Network topology, Dependency graph,
 *                           Logic/decision tree, Grammar parse tree, Atom (Bohr model),
 *                           Circuit (simplified), Org chart, Enhanced flowchart
 *  §5  INTERACTIVE        — MCQ (single/multi/matrix), Quiz engine w/ scoring,
 *                           Flashcard deck w/ flip, Slider w/ live formula,
 *                           Solve block, Interactive timeline
 *  §6  COMPONENTS         — Enhanced built-in library: Flashcard, Rating, TagCloud,
 *                           ProgressRing, KanbanCard, DataTable, CodePlayground,
 *                           MathSolver, ChemEquation, PhysicsCalc
 *
 * ── Architecture ─────────────────────────────────────────────────────────────────────────
 *  · Static-method object merged into ZoltoRenderer via Object.assign
 *  · Zero external dependencies — pure SVG, HTML5, vanilla JS
 *  · All user content passes through escapeHtml before injection
 *  · CSS animation keyframes injected once via _injectAdvancedStyles()
 *  · Config reads from ZOLTO_CONFIG_BASE (graceful fallback to defaults)
 * =========================================================================================
 */

'use strict';

/* ─── Palette helpers ────────────────────────────────────────────────────────────────── */
const _ADV_PALETTE = [
    '#3b82f6','#22c55e','#f59e0b','#ef4444','#0ea5e9',
    '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
    '#06b6d4','#a855f7','#f43f5e','#10b981','#6366f1',
];
const _apc = (i) => _ADV_PALETTE[((i % _ADV_PALETTE.length) + _ADV_PALETTE.length) % _ADV_PALETTE.length];

/* ─── Unique-ID helper ───────────────────────────────────────────────────────────────── */
let _uid = 0;
const _id  = (prefix = 'z') => `${prefix}${(++_uid).toString(36)}`;

/* ─── SVG arrow defs (advanced — includes multiple marker types) ─────────────────────── */
const _ADV_ARROW_DEFS = `
<marker id="adv-arr" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
  <polygon points="0 0,10 3.5,0 7" fill="var(--edge-marker-color,#94a3b8)"/>
</marker>
<marker id="adv-arr-r" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
  <polygon points="10 0,0 3.5,10 7" fill="var(--edge-marker-color,#94a3b8)"/>
</marker>
<marker id="adv-arr-open" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
  <path d="M0,0 L10,4 L0,8" fill="none" stroke="var(--edge-marker-color,#94a3b8)" stroke-width="1.5"/>
</marker>
<marker id="adv-arr-diamond" markerWidth="12" markerHeight="8" refX="1" refY="4" orient="auto">
  <polygon points="0 4,4 0,8 4,4 8" fill="var(--edge-marker-color,#94a3b8)"/>
</marker>
<marker id="adv-arr-circle" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
  <circle cx="4" cy="4" r="3" fill="var(--edge-marker-color,#94a3b8)"/>
</marker>`;

/* ─── Styles injected once ───────────────────────────────────────────────────────────── */
let _stylesInjected = false;
function _injectAdvancedStyles() {
    if (_stylesInjected || typeof document === 'undefined') return;
    _stylesInjected = true;
    const css = `
/* ── Advanced Renderer Styles ──────────────────────────────────── */
.zolto-adv-code{position:relative;border-radius:10px;overflow:hidden;background:var(--bg-panel,#0f172a);border:1px solid var(--border-heavy,#334155);margin:1rem 0;}
.zolto-adv-code-header{display:flex;align-items:center;gap:.5rem;padding:.45rem .75rem;background:var(--bg-depth,#1e293b);border-bottom:1px solid var(--border-heavy,#334155);}
.zolto-adv-code-filename{font-family:var(--font-mono,monospace);font-size:.75rem;color:var(--text-mute,#94a3b8);flex:1;}
.zolto-adv-code-lang{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:.2rem .5rem;border-radius:4px;background:var(--intent-primary-muted,rgba(59,130,246,.15));color:var(--intent-primary,#3b82f6);}
.zolto-adv-copy{margin-left:auto;background:none;border:1px solid var(--border-heavy,#334155);border-radius:5px;color:var(--text-mute,#94a3b8);cursor:pointer;font-size:.72rem;padding:.2rem .5rem;transition:.15s;}
.zolto-adv-copy:hover{border-color:var(--intent-primary,#3b82f6);color:var(--intent-primary,#3b82f6);}
.zolto-adv-code pre{margin:0;padding:1rem;overflow-x:auto;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:.85rem;line-height:1.65;tab-size:2;}
.zolto-adv-code code{display:block;white-space:pre;}
.zolto-ln-wrap{display:flex;gap:1.5rem;}
.zolto-ln-nums{counter-reset:ln;flex-shrink:0;border-right:1px solid var(--border-heavy,#334155);padding-right:.75rem;text-align:right;}
.zolto-ln-nums span{display:block;counter-increment:ln;color:var(--text-mute,#475569);font-size:.75rem;line-height:1.65;user-select:none;}
.zolto-ln-nums span::before{content:counter(ln);}
.diff-add{background:rgba(34,197,94,.12);display:block;margin:0 -1rem;padding:0 1rem;}
.diff-del{background:rgba(239,68,68,.12);display:block;margin:0 -1rem;padding:0 1rem;}
/* Syntax tokens */
.hl-comment{color:#64748b;font-style:italic;} .hl-string{color:#4ade80;} .hl-keyword{color:#818cf8;font-weight:600;}
.hl-number{color:#fb923c;} .hl-fn{color:#38bdf8;} .hl-constructor{color:#a78bfa;}
.hl-literal{color:#f472b6;} .hl-var{color:#e879f9;} .hl-type{color:#34d399;}
.hl-selector{color:#f0abfc;} .hl-property{color:#7dd3fc;} .hl-attr{color:#a5b4fc;}
.hl-tag{color:#f87171;} .hl-decorator{color:#fb923c;} .hl-key{color:#7dd3fc;}
.hl-heading{color:#fbbf24;font-weight:700;} .hl-bold{font-weight:700;}
.hl-math{color:#34d399;} .hl-block{color:#818cf8;font-weight:700;}
/* Math */
.math-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .15em;font-size:.9em;}
.math-num{border-bottom:1px solid currentColor;padding:0 .2em;text-align:center;line-height:1.4;}
.math-den{padding:0 .2em;text-align:center;line-height:1.4;}
.math-sqrt{display:inline-flex;align-items:stretch;vertical-align:middle;margin:0 .1em;}
.math-sqrt-sign{border-top:1.5px solid currentColor;padding:0 .1em;font-size:1.1em;align-self:center;}
.math-sqrt-inner{border-top:1.5px solid currentColor;padding:0 .15em;}
.math-root-idx{font-size:.6em;vertical-align:super;margin-right:.1em;}
.math-bigop{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:1.4em;margin:0 .15em;}
.math-sym{font-family:inherit;} .math-var{font-style:italic;font-family:var(--font-serif,'Georgia',serif);}
.math-sup{vertical-align:super;font-size:.7em;line-height:1;} .math-sub{vertical-align:sub;font-size:.7em;line-height:1;}
.math-matrix{display:inline-table;border-collapse:collapse;vertical-align:middle;margin:0 .1em;}
.math-cell{padding:.15em .35em;text-align:center;}
.math-delim{font-size:1.6em;vertical-align:middle;font-weight:100;color:var(--text-mute,#94a3b8);}
.math-align{display:inline-table;border-collapse:collapse;}
.math-align-cell{padding:.1em .3em;}
.math-text{font-family:var(--font-sans,system-ui,sans-serif);font-style:normal;font-size:.9em;}
.math-bb{font-family:'Cambria Math','Lucida Math',serif;font-weight:700;}
.math-hat,.math-bar,.math-vec{position:relative;display:inline-block;}
.math-over{text-decoration:overline;}
.math-chem-arrow{font-size:1.1em;margin:0 .3em;color:var(--text-mute);}
.math-unit{font-family:var(--font-sans);font-style:normal;font-size:.9em;margin-left:.1em;}
.zolto-math-block{background:var(--bg-panel,#1e293b);border:1px solid var(--border-heavy,#334155);border-radius:10px;padding:1.2rem 1.5rem;margin:.75rem 0;overflow-x:auto;position:relative;}
.zolto-math-block.has-number{padding-right:4rem;}
.zolto-math-num{position:absolute;right:1rem;top:50%;transform:translateY(-50%);color:var(--text-mute);font-size:.85em;}
.zolto-math-title{font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text-mute);margin-bottom:.6rem;}
.zolto-math-content{text-align:center;font-size:1.1em;line-height:2;}
.zolto-math-inline{font-size:1em;display:inline;}
/* Charts */
.zolto-adv-chart{margin:1rem 0;border-radius:12px;overflow:hidden;background:var(--bg-panel,#1e293b);border:1px solid var(--border-heavy,#334155);}
.zolto-chart-title{text-align:center;font-weight:700;font-size:.95rem;color:var(--text-main);padding:.75rem 1rem .25rem;}
.zolto-chart-subtitle{text-align:center;font-size:.78rem;color:var(--text-mute);padding:0 1rem .5rem;}
.zolto-chart-svg{width:100%;height:auto;display:block;}
.zolto-chart-legend{display:flex;flex-wrap:wrap;gap:.5rem;padding:.5rem 1rem .75rem;justify-content:center;}
.zolto-legend-item{display:flex;align-items:center;gap:.35rem;font-size:.75rem;color:var(--text-body);}
.zolto-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
/* MCQ & Quiz */
.zolto-mcq{background:var(--bg-panel);border:1px solid var(--border-heavy);border-radius:12px;padding:1.25rem 1.5rem;margin:1rem 0;}
.zolto-mcq-q{font-weight:600;font-size:.95rem;margin-bottom:.85rem;line-height:1.55;}
.zolto-mcq-opts{display:flex;flex-direction:column;gap:.45rem;}
.zolto-mcq-opt{display:flex;align-items:flex-start;gap:.6rem;padding:.55rem .8rem;border-radius:8px;border:1px solid var(--border-heavy);cursor:pointer;transition:.15s;font-size:.88rem;line-height:1.4;}
.zolto-mcq-opt:hover{border-color:var(--intent-primary);background:rgba(59,130,246,.07);}
.zolto-mcq-opt.correct{border-color:var(--intent-success,#22c55e);background:rgba(34,197,94,.1);}
.zolto-mcq-opt.wrong{border-color:var(--intent-danger,#ef4444);background:rgba(239,68,68,.1);}
.zolto-mcq-key{font-weight:700;min-width:1.2em;color:var(--text-mute);}
.zolto-mcq-expl{margin-top:.75rem;padding:.6rem .9rem;border-radius:8px;background:rgba(14,165,233,.1);border-left:3px solid var(--intent-info,#0ea5e9);font-size:.83rem;display:none;}
.zolto-mcq-expl.show{display:block;}
.zolto-mcq-actions{margin-top:.85rem;display:flex;gap:.5rem;}
.zolto-mcq-btn{border:none;border-radius:7px;padding:.4rem .85rem;font-size:.8rem;cursor:pointer;font-weight:600;transition:.15s;}
.zolto-mcq-btn.primary{background:var(--intent-primary,#3b82f6);color:#fff;}
.zolto-mcq-btn.secondary{background:var(--bg-depth,#1e293b);color:var(--text-body);border:1px solid var(--border-heavy);}
.zolto-quiz{background:var(--bg-panel);border:1px solid var(--border-heavy);border-radius:14px;overflow:hidden;margin:1rem 0;}
.zolto-quiz-header{padding:.85rem 1.25rem;background:var(--bg-depth);border-bottom:1px solid var(--border-heavy);display:flex;align-items:center;justify-content:space-between;}
.zolto-quiz-title{font-weight:700;font-size:.95rem;}
.zolto-quiz-meta{font-size:.75rem;color:var(--text-mute);}
.zolto-quiz-body{padding:1.25rem;}
.zolto-quiz-score{text-align:center;padding:1.5rem;display:none;}
.zolto-quiz-score.show{display:block;}
.zolto-quiz-score-num{font-size:2.5rem;font-weight:800;color:var(--intent-primary);}
/* Flashcard */
.zolto-flashcard{perspective:1200px;margin:1rem 0;cursor:pointer;}
.zolto-flashcard-inner{position:relative;transition:transform .55s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d;border-radius:14px;min-height:160px;}
.zolto-flashcard.flipped .zolto-flashcard-inner{transform:rotateY(180deg);}
.zolto-flashcard-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:2rem;text-align:center;border:1px solid var(--border-heavy);background:var(--bg-panel);}
.zolto-flashcard-back{transform:rotateY(180deg);background:var(--bg-depth);}
.zolto-flashcard-face{min-height:160px;}
.zolto-flashcard-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-mute);margin-bottom:.65rem;}
.zolto-flashcard-text{font-size:1.05rem;line-height:1.55;font-weight:500;}
.zolto-flashcard-tags{margin-top:.65rem;display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;}
.zolto-flashcard-tag{font-size:.65rem;padding:.15rem .45rem;border-radius:100px;background:rgba(59,130,246,.15);color:var(--intent-primary);font-weight:600;}
.zolto-flashcard-nav{display:flex;align-items:center;justify-content:center;gap:.75rem;margin-top:.6rem;}
.zolto-flashcard-nav button{background:none;border:1px solid var(--border-heavy);border-radius:8px;padding:.3rem .7rem;cursor:pointer;color:var(--text-body);font-size:.8rem;transition:.15s;}
.zolto-flashcard-nav button:hover{border-color:var(--intent-primary);color:var(--intent-primary);}
.zolto-flashcard-counter{font-size:.8rem;color:var(--text-mute);}
/* Interactive */
.zolto-interactive{background:var(--bg-panel);border:1px solid var(--border-heavy);border-radius:12px;padding:1.25rem 1.5rem;margin:1rem 0;}
.zolto-slider-row{display:flex;align-items:center;gap:.75rem;margin:.5rem 0;}
.zolto-slider-label{font-size:.82rem;min-width:10rem;color:var(--text-body);}
.zolto-slider-input{flex:1;accent-color:var(--intent-primary,#3b82f6);}
.zolto-slider-val{font-size:.82rem;font-family:var(--font-mono);color:var(--intent-primary);min-width:3rem;text-align:right;}
.zolto-interactive-output{margin-top:.9rem;padding:.75rem 1rem;border-radius:8px;background:var(--bg-depth);border-left:3px solid var(--intent-primary);font-size:.9rem;font-family:var(--font-mono);}
/* Diagram extras */
.zolto-arch-diagram{margin:1rem 0;border-radius:12px;overflow:hidden;}
.zolto-fn-plot{margin:1rem 0;border-radius:12px;overflow:hidden;background:var(--bg-panel);border:1px solid var(--border-heavy);}
/* Components */
.zolto-progress-ring{display:inline-flex;align-items:center;justify-content:center;position:relative;}
.zolto-progress-ring-label{position:absolute;font-weight:700;font-size:.95rem;color:var(--text-main);}
.zolto-rating{display:flex;gap:.25rem;align-items:center;}
.zolto-rating-star{font-size:1.2rem;color:var(--text-mute,#94a3b8);transition:.1s;}
.zolto-rating-star.filled{color:#f59e0b;}
.zolto-tag-cloud{display:flex;flex-wrap:wrap;gap:.5rem;padding:.5rem 0;}
.zolto-tag-cloud-tag{padding:.3rem .7rem;border-radius:100px;font-size:.78rem;font-weight:600;cursor:default;}
.zolto-data-table-wrap{overflow-x:auto;border-radius:10px;border:1px solid var(--border-heavy);margin:1rem 0;}
.zolto-data-table{width:100%;border-collapse:collapse;font-size:.85rem;}
.zolto-data-table th{background:var(--bg-depth);padding:.6rem .85rem;text-align:left;font-weight:700;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-mute);border-bottom:1px solid var(--border-heavy);}
.zolto-data-table td{padding:.55rem .85rem;border-bottom:1px solid var(--border-subtle,rgba(100,116,139,.2));color:var(--text-body);}
.zolto-data-table tr:last-child td{border-bottom:none;}
.zolto-data-table tr:hover td{background:rgba(59,130,246,.04);}
/* Atom diagram */
.zolto-atom-svg{animation:none;}
@keyframes orbit1{from{transform:rotate(0deg) translateX(var(--r)) rotate(0deg)}to{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)}}
`;
    const style = document.createElement('style');
    style.id = 'zolto-adv-styles';
    style.textContent = css;
    document.head.appendChild(style);
}

/* ======================================================================
   THE ADVANCED ENGINE OBJECT — merged into ZoltoRenderer
   ====================================================================== */

const ZoltoAdvancedEngines = {

    /* ──────────────────────────────────────────────────────────────────────
       §1  CODE BLOCKS  — Enhanced syntax highlighting, line numbers, diff
    ────────────────────────────────────────────────────────────────────── */

    renderCodeBlock(node, ms) {
        _injectAdvancedStyles();
        const raw  = node.content || '';
        const lang = (node.lang || node.language || 'text').toLowerCase().replace(/[^a-z0-9+#-]/g,'');
        const file = node.filename || node.file || '';
        const diff = node.diff === true || lang === 'diff';
        const lineNums = node.lineNumbers !== false && raw.split('\n').length > 2;
        const id   = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const uid  = _id('cb');

        const highlighted = diff ? this._highlightDiff(raw) : this.highlightSyntax(raw, lang);
        const codeInner   = lineNums ? this._wrapLineNumbers(highlighted) : `<code class="zolto-code language-${lang}">${highlighted}</code>`;

        return `<div${id} class="zolto-adv-code" style="${ms}" data-lang="${lang}">
  <div class="zolto-adv-code-header">
    ${file ? `<span class="zolto-adv-code-filename">${this.escapeHtml(file)}</span>` : ''}
    <span class="zolto-adv-code-lang">${lang}</span>
    <button class="zolto-adv-copy" id="${uid}-copy"
      onclick="(function(b){var c=b.closest('.zolto-adv-code').querySelector('code');navigator.clipboard&&navigator.clipboard.writeText(c.innerText).then(function(){b.textContent='✓ Copied';setTimeout(function(){b.textContent='Copy'},2e3)}).catch(function(){b.textContent='Failed'})})(this)">Copy</button>
  </div>
  <pre class="zolto-pre">${codeInner}</pre>
</div>`;
    },

    _wrapLineNumbers(highlighted) {
        const lines = highlighted.split('\n');
        const nums  = lines.map(() => `<span></span>`).join('');
        return `<div class="zolto-ln-wrap"><div class="zolto-ln-nums">${nums}</div><code class="zolto-code">${highlighted}</code></div>`;
    },

    _highlightDiff(code) {
        return this.escapeHtml(code).split('\n').map(line => {
            if (line.startsWith('+'))  return `<span class="diff-add">${line}</span>`;
            if (line.startsWith('-'))  return `<span class="diff-del">${line}</span>`;
            if (line.startsWith('@')) return `<span class="hl-comment">${line}</span>`;
            return line;
        }).join('\n');
    },

    highlightSyntax(code, lang) {
        if (!code) return '';
        let h = this.escapeHtml(code);
        switch (lang) {
            case 'javascript': case 'js': case 'jsx': case 'mjs':
            case 'typescript': case 'ts': case 'tsx':
                h = h
                    .replace(/\/\/.*$/gm,                m => `<span class="hl-comment">${m}</span>`)
                    .replace(/\/\*[\s\S]*?\*\//g,        m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(`[\s\S]*?`|&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(const|let|var|function|class|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|new|this|super|await|async|yield|typeof|instanceof|in|of|void|delete|throw|try|catch|finally|extends|implements|interface|type|enum|namespace|declare|abstract|readonly|static|public|private|protected|override|get|set|as|satisfies|keyof|infer)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g,  m => `<span class="hl-literal">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?n?)\b/g,          m => `<span class="hl-number">${m}</span>`)
                    .replace(/\b([A-Z][a-zA-Z0-9_]*)(?=\()/g,                 m => `<span class="hl-constructor">${m}</span>`)
                    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g,          m => `<span class="hl-fn">${m}</span>`)
                    .replace(/@([a-zA-Z_][a-zA-Z0-9_.]*)/g,                   m => `<span class="hl-decorator">${m}</span>`);
                break;
            case 'python': case 'py':
                h = h
                    .replace(/#.*$/gm,   m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|&#039;&#039;&#039;[\s\S]*?&#039;&#039;&#039;|&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|pass|break|continue|try|except|finally|raise|yield|lambda|del|global|nonlocal|is|True|False|None|async|await)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, m => `<span class="hl-fn">${m}</span>`)
                    .replace(/@([a-zA-Z_][a-zA-Z0-9_.]*)/g, m => `<span class="hl-decorator">${m}</span>`);
                break;
            case 'java': case 'kotlin': case 'kt':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(public|private|protected|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|static|final|void|int|long|double|float|boolean|String|null|true|false|import|package|abstract|override|fun|val|var|data|sealed|object|companion|when|is|as|in|out|by|with|let|run|also|apply|init|constructor|super|this|enum|annotation|typealias)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?[fFL]?)\b/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/\b([A-Z][a-zA-Z0-9_]*)(?=\()/g, m => `<span class="hl-constructor">${m}</span>`);
                break;
            case 'c': case 'cpp': case 'c++': case 'cxx': case 'h': case 'hpp':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(#\w+\b.*)/g, m => `<span class="hl-decorator">${m}</span>`)
                    .replace(/(&quot;.*?&quot;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(int|long|short|char|float|double|void|bool|unsigned|signed|struct|class|enum|typedef|const|static|extern|inline|volatile|register|return|if|else|for|while|do|switch|case|break|continue|goto|sizeof|nullptr|NULL|true|false|auto|new|delete|try|catch|throw|template|typename|namespace|using|public|private|protected|virtual|override|final)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?[uUlLfF]*)\b/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, m => `<span class="hl-fn">${m}</span>`);
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
            case 'swift':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(var|let|func|class|struct|enum|protocol|extension|import|return|if|else|for|while|switch|case|break|continue|guard|defer|throw|try|catch|async|await|in|as|is|nil|true|false|self|super|init|deinit|get|set|willSet|didSet|static|final|override|public|private|internal|fileprivate|open|mutating|lazy|weak|unowned)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/@([a-zA-Z]+)/g, m => `<span class="hl-decorator">${m}</span>`);
                break;
            case 'dart':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(var|final|const|class|extends|implements|mixin|with|return|if|else|for|while|switch|case|break|continue|try|catch|throw|async|await|in|as|is|null|true|false|this|super|new|import|export|library|part|typedef|enum|abstract|static|late|required|get|set|factory|external|void|dynamic|bool|int|double|String|List|Map|Set)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;
            case 'r':
                h = h
                    .replace(/#.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(function|return|if|else|for|while|repeat|break|next|in|TRUE|FALSE|NULL|NA|NaN|Inf|library|require|install.packages|c|list|data.frame|vector|matrix)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/<-|->|<<-|->>|:=/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?(?:L|e[+-]?\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;
            case 'sql':
                h = h
                    .replace(/--.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|VIEW|DROP|ALTER|ADD|COLUMN|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|NOT|NULL|AND|OR|IN|BETWEEN|LIKE|AS|CASE|WHEN|THEN|ELSE|END|DISTINCT|COUNT|SUM|AVG|MIN|MAX|COALESCE|WITH|UNION|ALL|EXCEPT|INTERSECT|TRUNCATE|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK|TRANSACTION)\b/gi, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;
            case 'css': case 'scss': case 'less':
                h = h
                    .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/(#[0-9a-fA-F]{3,8}|\b\d+(?:px|em|rem|vh|vw|vmin|vmax|%|pt|cm|mm|in|fr|deg|rad|s|ms)\b)/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/(--[a-zA-Z0-9_-]+)/g, m => `<span class="hl-var">${m}</span>`)
                    .replace(/([@][a-zA-Z-]+)/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/([.#:][a-zA-Z][a-zA-Z0-9_-]*)(?=[\s{,])/g, m => `<span class="hl-selector">${m}</span>`)
                    .replace(/\b([a-zA-Z-]+)(?=\s*:)/g, m => `<span class="hl-property">${m}</span>`);
                break;
            case 'html': case 'xml': case 'svg':
                h = h
                    .replace(/(&lt;!--[\s\S]*?--&gt;)/g,   m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&lt;\/?)([\w:-]+)/g, (_, lt, tag) => `${lt}<span class="hl-tag">${tag}</span>`)
                    .replace(/([\w:-]+)=(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;)/g, (_, a, v) => `<span class="hl-attr">${a}</span>=<span class="hl-string">${v}</span>`);
                break;
            case 'json': case 'jsonc':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;[^&\n]*?&quot;)\s*:/g, m => `<span class="hl-key">${m}</span>`)
                    .replace(/:\s*(&quot;[^&\n]*?&quot;)/g, (_, v) => `: <span class="hl-string">${v}</span>`)
                    .replace(/\b(true|false|null)\b/g,      m => `<span class="hl-literal">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;
            case 'yaml': case 'yml':
                h = h
                    .replace(/#.*$/gm,  m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_-]*)(?=\s*:)/gm, (_, ws, key) => `${ws}<span class="hl-key">${key}</span>`)
                    .replace(/\b(true|false|null|yes|no)\b/g, m => `<span class="hl-literal">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`)
                    .replace(/(^---$|^\.\.\.$/gm), m => `<span class="hl-keyword">${m}</span>`);
                break;
            case 'bash': case 'sh': case 'shell': case 'zsh':
                h = h
                    .replace(/#.*$/gm,  m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/\b(if|then|else|elif|fi|for|do|done|while|case|esac|function|return|local|export|source|echo|exit|set|unset|readonly|shift|break|continue|true|false|declare|readonly|typeset|mapfile|readarray)\b/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\}|\$\([^)]+\))/g, m => `<span class="hl-var">${m}</span>`);
                break;
            case 'zolto': case 'zl':
                h = h
                    .replace(/\/\/.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(#{1,6})\s(.+)/g, (_, hh, t) => `<span class="hl-heading">${hh} ${t}</span>`)
                    .replace(/(\*\*.*?\*\*)/g, m => `<span class="hl-bold">${m}</span>`)
                    .replace(/(\$[^$\n]+\$)/g, m => `<span class="hl-math">${m}</span>`)
                    .replace(/(@[a-z/]+)/g,    m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/(\[important\]|\[tip\]|\[warning\]|\[info\])/g, m => `<span class="hl-type">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`);
                break;
            case 'latex': case 'tex':
                h = h
                    .replace(/%.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/(\\[a-zA-Z]+)/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/(\{|\})/g, m => `<span class="hl-type">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;
            case 'toml':
                h = h
                    .replace(/#.*$/gm, m => `<span class="hl-comment">${m}</span>`)
                    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/^\[.*\]$/gm, m => `<span class="hl-selector">${m}</span>`)
                    .replace(/\b(true|false)\b/g, m => `<span class="hl-literal">${m}</span>`)
                    .replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
                break;
            case 'markdown': case 'md':
                h = h
                    .replace(/(#{1,6}\s.+)/g, m => `<span class="hl-heading">${m}</span>`)
                    .replace(/(\*\*.*?\*\*|__.*?__)/g, m => `<span class="hl-bold">${m}</span>`)
                    .replace(/(\*.*?\*|_.*?_)/g, m => `<span class="hl-keyword">${m}</span>`)
                    .replace(/(```[\s\S]*?```|`[^`]+`)/g, m => `<span class="hl-string">${m}</span>`)
                    .replace(/(\[.*?\]\(.*?\))/g, m => `<span class="hl-fn">${m}</span>`)
                    .replace(/^(\s*[-*+]\s)/gm, m => `<span class="hl-type">${m}</span>`)
                    .replace(/^(\s*\d+\.\s)/gm, m => `<span class="hl-number">${m}</span>`);
                break;
            default:
                h = h.replace(/\b(\d+(?:\.\d+)?)\b/g, m => `<span class="hl-number">${m}</span>`);
        }
        return h;
    },

    /* ──────────────────────────────────────────────────────────────────────
       §2  MATH ENGINE  — Full LaTeX-level rendering + Chemistry + Physics
    ────────────────────────────────────────────────────────────────────── */

    renderMathBlock(node, ms) {
        _injectAdvancedStyles();
        const id      = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        const title   = node.title ? `<div class="zolto-math-title">${this.escapeHtml(node.title)}</div>` : '';
        const numStr  = node.number ? `<span class="zolto-math-num">(${node.number})</span>` : '';
        const hasCls  = node.number ? ' has-number' : '';
        const env     = node.env || 'equation';
        const envCls  = `zolto-math-block zolto-math-env-${this.escapeHtml(env)}${hasCls}`;

        // Special: function plot
        if (env === 'plot' || node.plot) {
            return this._renderFunctionPlot(node, ms);
        }
        const rendered = this._parseMath(node.content || '');
        return `<div${id} class="${envCls}" style="${ms}" role="math" aria-label="${this.escapeHtml((node.content || '').slice(0,60))}">
  ${title}
  <div class="zolto-math-content">${rendered}${numStr}</div>
</div>`;
    },

    renderMathEquation(node, ms) {
        const id  = node.id ? ` id="eq-${this.escapeHtml(node.id)}"` : '';
        const num = node.number ? `<span class="zolto-math-num">(${node.number})</span>` : '';
        return `<div${id} class="zolto-math-block zolto-math-equation${num ? ' has-number' : ''}" style="${ms}">
  <div class="zolto-math-content">${this._parseMath(node.content || '')}${num}</div>
</div>`;
    },

    _renderInlineMath(expr) {
        _injectAdvancedStyles();
        return `<span class="zolto-math-inline" aria-label="math">${this._parseMath(expr)}</span>`;
    },

    _parseMath(raw) {
        if (!raw) return '';
        // Merge all symbol tables
        const symMap = Object.assign({}, _MATH_SYM_TABLE);

        let h = this.escapeHtml(raw.trim());
        let prev; let iters = 0;

        // ── Environments ──────────────────────────────────────────────────
        // \begin{matrix|pmatrix|bmatrix|vmatrix|Bmatrix|cases|array}
        h = h.replace(/\\begin\{([pbvBV]?matrix|array|cases|smallmatrix)\}([\s\S]*?)\\end\{\1\}/g, (_, env, body) => {
            const D = {pmatrix:['(',')'  ],bmatrix:['[',']'],vmatrix:['|','|'],Bmatrix:['{','}'],cases:['{','']};
            const [open, close] = D[env] || ['',''];
            const rows = body.split(/\\\\/).map(row => {
                const cells = row.split('&').map(c => `<td class="math-cell">${this._parseMath(c.trim())}</td>`).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            return `<span class="math-delim">${open}</span><table class="math-matrix"><tbody>${rows}</tbody></table><span class="math-delim">${close}</span>`;
        });

        // \begin{align|gather|equation|multline}
        h = h.replace(/\\begin\{(align\*?|gather\*?|equation\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}/g, (_, env, body) => {
            const rows = body.split(/\\\\/).map(row => {
                const cells = row.split('&').map((c, ci) =>
                    `<td class="math-align-cell ${ci%2===1?'math-align-right':''}">${this._parseMath(c.trim())}</td>`
                ).join('');
                return `<tr class="math-align-row">${cells}</tr>`;
            }).join('');
            return `<table class="math-align"><tbody>${rows}</tbody></table>`;
        });

        // ── \frac{num}{den} — iterative nesting ───────────────────────────
        iters = 0;
        do { prev = h; h = h.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>'); }
        while (h !== prev && ++iters < 14);

        // ── \dfrac \cfrac aliases ──────────────────────────────────────────
        iters = 0;
        do { prev = h; h = h.replace(/\\[dc]frac\{([^{}]*)\}\{([^{}]*)\}/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>'); }
        while (h !== prev && ++iters < 8);

        // Simple fraction a/b  (plain text)
        h = h.replace(/(?<![<a-zA-Z\\])(\w+)\/(\w+)(?![>a-zA-Z])/g,
            '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>');

        // ── \sqrt[n]{x} and \sqrt{x} ──────────────────────────────────────
        h = h.replace(/\\sqrt\[([^\]]+)\]\{([^{}]*)\}/g,
            '<span class="math-sqrt"><span class="math-root-idx">$1</span><span class="math-sqrt-sign">√</span><span class="math-sqrt-inner">$2</span></span>');
        iters = 0;
        do { prev = h; h = h.replace(/\\sqrt\{([^{}]*)\}/g,
            '<span class="math-sqrt"><span class="math-sqrt-sign">√</span><span class="math-sqrt-inner">$1</span></span>'); }
        while (h !== prev && ++iters < 10);

        // ── Superscripts / subscripts ────────────────────────────────────
        h = h.replace(/\^\{([^{}]*)\}/g, '<sup class="math-sup">$1</sup>');
        h = h.replace(/(?<!<[^>])\^([a-zA-Z0-9+\-])/g, '<sup class="math-sup">$1</sup>');
        h = h.replace(/_\{([^{}]*)\}/g, '<sub class="math-sub">$1</sub>');
        h = h.replace(/(?<!<[^>])_([a-zA-Z0-9+\-])/g, '<sub class="math-sub">$1</sub>');

        // ── Big operators with limits ─────────────────────────────────────
        h = h.replace(/\\(sum|prod|coprod|bigcup|bigcap|bigoplus|bigotimes|int|iint|iiint|oint|ointop|lim|limsup|liminf|sup|inf|max|min|det|gcd|lcm)(_\{[^{}]*\})?(\^\{[^{}]*\})?/g, (_, op, lo, hi) => {
            const sym  = symMap[`\\${op}`] || op;
            const loH  = lo  ? `<sub class="math-sub">${lo.slice(2,-1)}</sub>`  : '';
            const hiH  = hi  ? `<sup class="math-sup">${hi.slice(2,-1)}</sup>` : '';
            return `<span class="math-bigop">${sym}${loH}${hiH}</span>`;
        });

        // ── Definite integral \int_{a}^{b} ───────────────────────────────
        h = h.replace(/\\int_\{([^{}]*)\}\^\{([^{}]*)\}/g,
            '<span class="math-bigop">∫<sub class="math-sub">$1</sub><sup class="math-sup">$2</sup></span>');

        // ── \left( … \right) ─────────────────────────────────────────────
        h = h.replace(/\\left([\(\[\{|.])([^]]*?)\\right([\)\]\}|.])/g, (_, open, inner, close) => {
            const op = {'(':'(','[':'[','{':'{','|':'|','.':''}[open] || open;
            const cl = {')':')',']':']','}':'}','|':'|','.':''}[close] || close;
            return `<span class="math-delim-l">${op}</span>${inner}<span class="math-delim-r">${cl}</span>`;
        });

        // ── Accents ───────────────────────────────────────────────────────
        h = h.replace(/\\overline\{([^{}]*)\}/g, '<span class="math-over" style="text-decoration:overline">$1</span>');
        h = h.replace(/\\underline\{([^{}]*)\}/g, '<span style="text-decoration:underline">$1</span>');
        h = h.replace(/\\hat\{([^{}]*)\}/g, '$1̂');
        h = h.replace(/\\bar\{([^{}]*)\}/g, '$1̄');
        h = h.replace(/\\vec\{([^{}]*)\}/g, '$1⃗');
        h = h.replace(/\\tilde\{([^{}]*)\}/g, '$1̃');
        h = h.replace(/\\dot\{([^{}]*)\}/g, '$1̇');
        h = h.replace(/\\ddot\{([^{}]*)\}/g, '$1̈');
        h = h.replace(/\\widehat\{([^{}]*)\}/g, '<span style="position:relative">$1<span style="position:absolute;top:-.3em;left:0;right:0;text-align:center;font-size:.7em">^</span></span>');

        // ── Font commands ─────────────────────────────────────────────────
        h = h.replace(/\\text\{([^{}]*)\}/g, '<span class="math-text">$1</span>');
        h = h.replace(/\\mathrm\{([^{}]*)\}/g, '<span class="math-text">$1</span>');
        h = h.replace(/\\mathbf\{([^{}]*)\}/g, '<strong>$1</strong>');
        h = h.replace(/\\mathit\{([^{}]*)\}/g, '<em>$1</em>');
        h = h.replace(/\\mathcal\{([^{}]*)\}/g, '<span style="font-family:cursive">$1</span>');
        h = h.replace(/\\mathbb\{([^{}]*)\}/g, (_, c) => {
            const bb = {R:'ℝ',N:'ℕ',Z:'ℤ',Q:'ℚ',C:'ℂ',P:'ℙ',E:'𝔼',F:'𝔽',H:'ℍ'};
            return `<span class="math-bb">${bb[c] || c}</span>`;
        });
        h = h.replace(/\\boldsymbol\{([^{}]*)\}/g, '<strong>$1</strong>');

        // ── Chemistry notation ────────────────────────────────────────────
        // Reaction arrows
        h = h.replace(/--&gt;/g, '<span class="math-chem-arrow">→</span>');
        h = h.replace(/&lt;--/g, '<span class="math-chem-arrow">←</span>');
        h = h.replace(/&lt;=&gt;/g, '<span class="math-chem-arrow">⇌</span>');
        h = h.replace(/&lt;--&gt;/g, '<span class="math-chem-arrow">↔</span>');
        // State symbols (s), (l), (g), (aq)
        h = h.replace(/\(([slgaq]+)\)/g, '<sub class="math-sub">($1)</sub>');
        // Charge: ^{2+}, ^{3-}
        h = h.replace(/\\ce\{([^{}]*)\}/g, (_, expr) => `<span class="math-text">${expr}</span>`);

        // ── Physics units ─────────────────────────────────────────────────
        // \SI{val}{unit} and \si{unit}
        h = h.replace(/\\SI\{([^{}]*)\}\{([^{}]*)\}/g, (_, val, unit) =>
            `${val} <span class="math-unit">${unit.replace(/\\/g,'')}</span>`);
        h = h.replace(/\\si\{([^{}]*)\}/g, (_, unit) =>
            `<span class="math-unit">${unit.replace(/\\/g,'')}</span>`);

        // ── Symbol substitution (sorted longest-first) ────────────────────
        const sortedSyms = Object.keys(symMap).sort((a,b) => b.length - a.length);
        sortedSyms.forEach(key => {
            const esc = key.replace(/\\/g,'\\\\').replace(/[{}[\]()^$.*+?|]/g,'\\$&');
            h = h.replace(new RegExp(esc, 'g'), `<span class="math-sym">${symMap[key]}</span>`);
        });

        // ── Clean remaining bare braces ───────────────────────────────────
        h = h.replace(/\{([^{}]*)\}/g, '$1');

        // ── Single-letter variables → italic ─────────────────────────────
        h = h.replace(/(?<!<[^>]{0,120})(?<![a-zA-Z\\])([a-zA-Z])(?![a-zA-Z=])/g,
            '<i class="math-var">$1</i>');

        return h;
    },

    /** Render a 2D function plot as SVG */
    _renderFunctionPlot(node, ms) {
        const W = parseInt(node.width,10) || 600;
        const H = parseInt(node.height,10) || 280;
        const id = _id('fp');
        const fn = node.fn || node.function || '';
        const xMin = parseFloat(node.xMin ?? node['x-min'] ?? -5);
        const xMax = parseFloat(node.xMax ?? node['x-max'] ?? 5);
        const yMin = parseFloat(node.yMin ?? node['y-min'] ?? -5);
        const yMax = parseFloat(node.yMax ?? node['y-max'] ?? 5);
        const padL=50,padR=20,padT=20,padB=40;
        const cW=W-padL-padR, cH=H-padT-padB;
        const toX = x => padL + ((x-xMin)/(xMax-xMin))*cW;
        const toY = y => padT + (1 - (y-yMin)/(yMax-yMin))*cH;

        // Build points
        const STEPS = 300;
        const points = [];
        for (let i=0; i<=STEPS; i++) {
            const x = xMin + (i/STEPS)*(xMax-xMin);
            try {
                // Safe eval: replace ^ with ** and common math functions
                const expr = fn
                    .replace(/\^/g,'**')
                    .replace(/\bsin\b/g,'Math.sin').replace(/\bcos\b/g,'Math.cos')
                    .replace(/\btan\b/g,'Math.tan').replace(/\bln\b/g,'Math.log')
                    .replace(/\bsqrt\b/g,'Math.sqrt').replace(/\babs\b/g,'Math.abs')
                    .replace(/\bexp\b/g,'Math.exp').replace(/\bpi\b/g,'Math.PI')
                    .replace(/\be\b/g,'Math.E').replace(/\bx\b/g,`(${x})`);
                // eslint-disable-next-line no-new-func
                const y = (new Function(`return (${expr})`)());
                if (isFinite(y) && y >= yMin - (yMax-yMin) && y <= yMax + (yMax-yMin)) {
                    points.push({ x: toX(x), y: toY(y), valid: true });
                } else {
                    points.push({ valid: false });
                }
            } catch { points.push({ valid: false }); }
        }

        // Path
        let d = '';
        points.forEach((p,i) => {
            if (!p.valid) return;
            const prev = points[i-1];
            d += (!prev || !prev.valid) ? `M${p.x.toFixed(2)},${p.y.toFixed(2)}` : ` L${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        });

        // Axes
        const ax = Math.max(padL, Math.min(padL+cW, toX(0)));
        const ay = Math.max(padT, Math.min(padT+cH, toY(0)));

        // Grid lines
        const gridLines = [];
        const xStep = (xMax-xMin) > 10 ? 5 : 1;
        for (let x=Math.ceil(xMin); x<=xMax; x+=xStep) {
            const gx = toX(x);
            gridLines.push(`<line x1="${gx}" y1="${padT}" x2="${gx}" y2="${padT+cH}" stroke="var(--border-subtle,rgba(100,116,139,.25))" stroke-width="1"/>`);
            gridLines.push(`<text x="${gx}" y="${padT+cH+14}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${x}</text>`);
        }
        const yStep = (yMax-yMin) > 10 ? 5 : 1;
        for (let y=Math.ceil(yMin); y<=yMax; y+=yStep) {
            const gy = toY(y);
            gridLines.push(`<line x1="${padL}" y1="${gy}" x2="${padL+cW}" y2="${gy}" stroke="var(--border-subtle,rgba(100,116,139,.25))" stroke-width="1"/>`);
            if (y !== 0) gridLines.push(`<text x="${padL-4}" y="${gy+4}" text-anchor="end" font-size="10" fill="var(--text-mute)">${y}</text>`);
        }

        const title = node.title ? `<div class="zolto-chart-title">${this.escapeHtml(node.title)}</div>` : '';
        return `<div class="zolto-fn-plot" style="${ms}">
  ${title}
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    ${gridLines.join('')}
    <line x1="${padL}" y1="${ay}" x2="${padL+cW}" y2="${ay}" stroke="var(--text-mute,#94a3b8)" stroke-width="1.5"/>
    <line x1="${ax}" y1="${padT}" x2="${ax}" y2="${padT+cH}" stroke="var(--text-mute,#94a3b8)" stroke-width="1.5"/>
    <text x="${padL+cW+4}" y="${ay+4}" font-size="11" fill="var(--text-mute)">x</text>
    <text x="${ax+4}" y="${padT-4}" font-size="11" fill="var(--text-mute)">y</text>
    <path d="${d}" fill="none" stroke="var(--intent-primary,#3b82f6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${padL+4}" y="${padT+14}" font-size="11" fill="var(--text-mute,#94a3b8)" font-style="italic">y = ${this.escapeHtml(fn)}</text>
  </svg>
</div>`;
    },

    /* ──────────────────────────────────────────────────────────────────────
       §3  CHARTS — 14 chart types, all native SVG
    ────────────────────────────────────────────────────────────────────── */

    renderChart(node, ms) {
        _injectAdvancedStyles();
        if (!Array.isArray(node.dataset) || !node.dataset.length) {
            return `<div class="zolto-adv-chart" style="${ms}"><div class="zolto-error-block">Chart: empty dataset</div></div>`;
        }
        const ct  = (node.chartType || node.type2 || 'bar').toLowerCase();
        const cfg = node.config || {};
        const W   = Math.max(200, Math.min(2400, parseInt(cfg.width,10)  || 640));
        const H   = Math.max(100, Math.min(1200, parseInt(cfg.height,10) || 380));
        const title    = node.title    ? `<div class="zolto-chart-title">${this.escapeHtml(node.title)}</div>` : '';
        const subtitle = node.subtitle ? `<div class="zolto-chart-subtitle">${this.escapeHtml(node.subtitle)}</div>` : '';
        let svg = '', legend = '';
        try {
            switch (ct) {
                case 'bar':        [svg,legend] = this._adv_barChart(node.dataset,W,H,cfg,'vertical'); break;
                case 'hbar': case 'bar-h': case 'horizontal-bar':
                                   [svg,legend] = this._adv_barChart(node.dataset,W,H,cfg,'horizontal'); break;
                case 'stacked':    [svg,legend] = this._adv_stackedBarChart(node.dataset,W,H,cfg); break;
                case 'grouped':    [svg,legend] = this._adv_groupedBarChart(node.dataset,W,H,cfg); break;
                case 'pie':        [svg,legend] = this._adv_pieChart(node.dataset,W,H,cfg,false); break;
                case 'donut':      [svg,legend] = this._adv_pieChart(node.dataset,W,H,cfg,true); break;
                case 'line':       [svg,legend] = this._adv_lineChart(node.dataset,W,H,cfg,false); break;
                case 'area':       [svg,legend] = this._adv_lineChart(node.dataset,W,H,cfg,true); break;
                case 'scatter':    [svg,legend] = this._adv_scatterChart(node.dataset,W,H,cfg); break;
                case 'radar': case 'spider': [svg,legend] = this._adv_radarChart(node.dataset,W,H,cfg); break;
                case 'histogram':  [svg,legend] = this._adv_histogramChart(node.dataset,W,H,cfg); break;
                case 'bubble':     [svg,legend] = this._adv_bubbleChart(node.dataset,W,H,cfg); break;
                case 'funnel':     [svg,legend] = this._adv_funnelChart(node.dataset,W,H,cfg); break;
                case 'waterfall':  [svg,legend] = this._adv_waterfallChart(node.dataset,W,H,cfg); break;
                case 'treemap':    [svg,legend] = this._adv_treemapChart(node.dataset,W,H,cfg); break;
                case 'sequence':   svg = this.renderSequenceChart(node.dataset,W,H,cfg); break;
                case 'gantt':      svg = this.renderGanttChart(node.dataset,W,H,cfg); break;
                default:           [svg,legend] = this._adv_barChart(node.dataset,W,H,cfg,'vertical');
            }
        } catch(e) {
            svg = `<p style="padding:1rem;color:var(--intent-danger)">Chart error: ${this.escapeHtml(e.message)}</p>`;
        }
        const legendHtml = legend ? `<div class="zolto-chart-legend">${legend}</div>` : '';
        const id = node.id ? ` id="${this.escapeHtml(node.id)}"` : '';
        return `<div${id} class="zolto-adv-chart zolto-chart-${ct}" style="${ms} max-width:${W}px;">${title}${subtitle}${svg}${legendHtml}</div>`;
    },

    // ── Shared chart helpers ───────────────────────────────────────────────────────────

    _chartAxes(W, H, pad, maxVal, dataset, orient='vertical') {
        const {pL,pR,pT,pB} = pad;
        const cW = W-pL-pR, cH = H-pT-pB;
        const ticks = 5;
        let lines = '';
        // Grid lines + tick labels
        for (let i=0; i<=ticks; i++) {
            const v = (maxVal/ticks)*i;
            if (orient === 'vertical') {
                const y = pT + cH - (i/ticks)*cH;
                lines += `<line x1="${pL}" y1="${y}" x2="${pL+cW}" y2="${y}" stroke="var(--border-subtle,rgba(100,116,139,.2))" stroke-width="1"/>`;
                lines += `<text x="${pL-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--text-mute)">${_fmtN(v)}</text>`;
            } else {
                const x = pL + (i/ticks)*cW;
                lines += `<line x1="${x}" y1="${pT}" x2="${x}" y2="${pT+cH}" stroke="var(--border-subtle,rgba(100,116,139,.2))" stroke-width="1"/>`;
                lines += `<text x="${x}" y="${pT+cH+14}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${_fmtN(v)}</text>`;
            }
        }
        // Axes
        lines += `<line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pT+cH}" stroke="var(--border-heavy,#334155)" stroke-width="1.5"/>`;
        lines += `<line x1="${pL}" y1="${pT+cH}" x2="${pL+cW}" y2="${pT+cH}" stroke="var(--border-heavy,#334155)" stroke-width="1.5"/>`;
        return lines;
    },

    _adv_barChart(dataset, W, H, cfg, orient) {
        const pad = {pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB} = pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        const maxVal = Math.max(1,...dataset.map(d=>Number(d.value)||0));
        const bW = orient==='vertical' ? cW/dataset.length : cH/dataset.length;
        let bars = '', labels = '';
        dataset.forEach((d,i) => {
            const val = Math.max(0, Number(d.value)||0);
            const col = this.sanitizeCssColor(d.color||cfg.color||'') || _apc(i);
            const lbl = this.escapeHtml((d.label||'').slice(0,12));
            if (orient === 'vertical') {
                const bH  = (val/maxVal)*cH;
                const x   = pL + i*bW + bW*.1;
                const y   = pT+cH-bH;
                const bWw = Math.max(2, bW*.8);
                bars += `<rect x="${x}" y="${y}" width="${bWw}" height="${bH}" fill="${col}" rx="4" fill-opacity=".9" class="zolto-chart-bar"><title>${lbl}: ${val}</title></rect>`;
                if (val > 0) bars += `<text x="${x+bWw/2}" y="${y-4}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${_fmtN(val)}</text>`;
                labels += `<text x="${x+bWw/2}" y="${pT+cH+18}" text-anchor="middle" font-size="10" fill="var(--text-body)">${lbl}</text>`;
            } else {
                const bH  = (val/maxVal)*cW;
                const y   = pT + i*bW + bW*.1;
                const bHh = Math.max(2, bW*.8);
                bars += `<rect x="${pL}" y="${y}" width="${bH}" height="${bHh}" fill="${col}" rx="4" fill-opacity=".9"><title>${lbl}: ${val}</title></rect>`;
                if (val > 0) bars += `<text x="${pL+bH+4}" y="${y+bHh/2+4}" font-size="10" fill="var(--text-mute)">${_fmtN(val)}</text>`;
                labels += `<text x="${pL-6}" y="${y+bHh/2+4}" text-anchor="end" font-size="10" fill="var(--text-body)">${lbl}</text>`;
            }
        });
        const axes = this._chartAxes(W,H,pad,maxVal,dataset,orient==='horizontal'?'horizontal':'vertical');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${axes}${bars}${labels}</svg>`;
        const leg = dataset.map((d,i) => {
            const col = this.sanitizeCssColor(d.color||cfg.color||'') || _apc(i);
            return `<span class="zolto-legend-item"><span class="zolto-legend-dot" style="background:${col}"></span>${this.escapeHtml(d.label||'')}</span>`;
        }).join('');
        return [svg, leg];
    },

    _adv_stackedBarChart(dataset, W, H, cfg) {
        // dataset: [{label, values:[{key,value,color}]}]
        const pad={pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        const series = dataset[0]?.values||[];
        const maxVal = Math.max(1, ...dataset.map(d => (d.values||[]).reduce((s,v)=>s+(Number(v.value)||0),0)));
        const bW = cW/dataset.length;
        let bars='',xLabels='';
        dataset.forEach((d,i)=>{
            let base=0;
            const bWw=Math.max(2,bW*.8), x=pL+i*bW+bW*.1;
            const lbl=this.escapeHtml((d.label||'').slice(0,12));
            (d.values||[]).forEach((seg,si)=>{
                const val=Math.max(0,Number(seg.value)||0);
                const h=(val/maxVal)*cH, y=pT+cH-(base+val)/maxVal*cH;
                const col=this.sanitizeCssColor(seg.color||'')||_apc(si);
                bars+=`<rect x="${x}" y="${y}" width="${bWw}" height="${h}" fill="${col}" fill-opacity=".9"><title>${this.escapeHtml(seg.key||'')}: ${val}</title></rect>`;
                base+=val;
            });
            xLabels+=`<text x="${x+bWw/2}" y="${pT+cH+18}" text-anchor="middle" font-size="10" fill="var(--text-body)">${lbl}</text>`;
        });
        const axes=this._chartAxes(W,H,pad,maxVal,dataset);
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${axes}${bars}${xLabels}</svg>`;
        const leg=series.map((s,i)=>`<span class="zolto-legend-item"><span class="zolto-legend-dot" style="background:${_apc(i)}"></span>${this.escapeHtml(s.key||s.label||'')}</span>`).join('');
        return [svg,leg];
    },

    _adv_groupedBarChart(dataset, W, H, cfg) {
        // dataset: [{label, values:[{key,value}]}]
        const pad={pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        const seriesCount = dataset[0]?.values?.length || 1;
        const maxVal=Math.max(1,...dataset.flatMap(d=>(d.values||[]).map(v=>Number(v.value)||0)));
        const grpW=cW/dataset.length, barW=grpW*.8/seriesCount;
        let bars='',xLabels='';
        dataset.forEach((d,gi)=>{
            const grpX=pL+gi*grpW+grpW*.1;
            (d.values||[]).forEach((seg,si)=>{
                const val=Math.max(0,Number(seg.value)||0);
                const bH=(val/maxVal)*cH, x=grpX+si*barW, y=pT+cH-bH;
                const col=_apc(si);
                bars+=`<rect x="${x}" y="${y}" width="${barW*.9}" height="${bH}" fill="${col}" fill-opacity=".9" rx="3"><title>${this.escapeHtml(seg.key||'')}: ${val}</title></rect>`;
            });
            xLabels+=`<text x="${grpX+grpW*.4}" y="${pT+cH+18}" text-anchor="middle" font-size="10" fill="var(--text-body)">${this.escapeHtml((d.label||'').slice(0,12))}</text>`;
        });
        const axes=this._chartAxes(W,H,pad,maxVal,dataset);
        const keys=dataset[0]?.values?.map(v=>v.key)||[];
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${axes}${bars}${xLabels}</svg>`;
        const leg=keys.map((k,i)=>`<span class="zolto-legend-item"><span class="zolto-legend-dot" style="background:${_apc(i)}"></span>${this.escapeHtml(k)}</span>`).join('');
        return [svg,leg];
    },

    _adv_pieChart(dataset, W, H, cfg, donut) {
        const cx=W/2, cy=H/2, R=Math.min(cx,cy)-45;
        const total=dataset.reduce((s,d)=>s+Math.max(0,Number(d.value)||0),0);
        if (total<=0) return ['<p class="zolto-chart-empty">No data</p>',''];
        let angle=-Math.PI/2, parts='';
        const leg=dataset.map((d,i)=>{
            const val=Math.max(0,Number(d.value)||0);
            const sweep=(val/total)*Math.PI*2;
            const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
            const x2=cx+R*Math.cos(angle+sweep), y2=cy+R*Math.sin(angle+sweep);
            const large=sweep>Math.PI?1:0;
            const col=this.sanitizeCssColor(d.color||'')||_apc(i);
            const lbl=this.escapeHtml(d.label||'');
            const pct=((val/total)*100).toFixed(1);
            // Label position
            const midA=angle+sweep/2;
            const lR=R*.65;
            const lx=cx+lR*Math.cos(midA), ly=cy+lR*Math.sin(midA);
            if (sweep < Math.PI*2-0.001) {
                if (donut) {
                    const ir=R*.5;
                    const ix1=cx+ir*Math.cos(angle),iy1=cy+ir*Math.sin(angle);
                    const ix2=cx+ir*Math.cos(angle+sweep),iy2=cy+ir*Math.sin(angle+sweep);
                    parts+=`<path d="M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z" fill="${col}" fill-opacity=".9" class="zolto-chart-pie-slice"><title>${lbl}: ${val} (${pct}%)</title></path>`;
                } else {
                    parts+=`<path d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z" fill="${col}" fill-opacity=".9" class="zolto-chart-pie-slice"><title>${lbl}: ${val} (${pct}%)</title></path>`;
                }
                if (sweep > 0.35) parts+=`<text x="${lx}" y="${ly+4}" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">${pct}%</text>`;
            } else {
                parts+=donut
                    ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col}" fill-opacity=".9"/><circle cx="${cx}" cy="${cy}" r="${R*.5}" fill="var(--bg-panel)"/>`
                    : `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col}" fill-opacity=".9"/>`;
            }
            angle+=sweep;
            return `<span class="zolto-legend-item"><span class="zolto-legend-dot" style="background:${col}"></span>${lbl} (${pct}%)</span>`;
        }).join('');
        if (donut) parts+=`<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-main)">${_fmtN(total)}</text>`;
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${parts}</svg>`;
        return [svg,leg];
    },

    _adv_lineChart(dataset, W, H, cfg, area) {
        const pad={pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        const maxVal=Math.max(1,...dataset.map(d=>Number(d.value)||0));
        const step=cW/(Math.max(1,dataset.length-1));
        const pts=dataset.map((d,i)=>({x:pL+i*step, y:pT+cH-(Math.max(0,Number(d.value)||0)/maxVal)*cH, label:d.label||'', val:Number(d.value)||0}));
        const col=this.sanitizeCssColor(cfg.color||'')||_apc(0);
        const linePath=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        let parts=this._chartAxes(W,H,pad,maxVal,dataset);
        if (area) {
            const fillPath=`${linePath} L${pts[pts.length-1].x},${pT+cH} L${pts[0].x},${pT+cH} Z`;
            parts+=`<path d="${fillPath}" fill="${col}" fill-opacity=".12"/>`;
        }
        parts+=`<path d="${linePath}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        pts.forEach(p=>{
            parts+=`<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${col}" stroke="var(--bg-panel)" stroke-width="2"><title>${this.escapeHtml(p.label)}: ${p.val}</title></circle>`;
            parts+=`<text x="${p.x}" y="${pT+cH+18}" text-anchor="middle" font-size="10" fill="var(--text-body)">${this.escapeHtml(p.label.slice(0,8))}</text>`;
        });
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${parts}</svg>`;
        return [svg,''];
    },

    _adv_scatterChart(dataset, W, H, cfg) {
        const pad={pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        // dataset: [{x, y, label, color}]
        const allX=dataset.map(d=>Number(d.x)||0), allY=dataset.map(d=>Number(d.y)||0);
        const xMin=Math.min(...allX), xMax=Math.max(...allX,1), yMax=Math.max(...allY,1);
        const toX=x=>pL+((x-xMin)/(xMax-xMin))*cW, toY=y=>pT+cH-(y/yMax)*cH;
        let pts=this._chartAxes(W,H,pad,yMax,dataset);
        // Regression line
        const n=dataset.length;
        if (n>1) {
            const mx=allX.reduce((s,v)=>s+v,0)/n, my=allY.reduce((s,v)=>s+v,0)/n;
            const num=dataset.reduce((s,d)=>(Number(d.x)-mx)*(Number(d.y)-my)+s,0);
            const den=dataset.reduce((s,d)=>(Number(d.x)-mx)**2+s,0)||1;
            const m=num/den, b=my-m*mx;
            const rx1=toX(xMin), ry1=toY(m*xMin+b), rx2=toX(xMax), ry2=toY(m*xMax+b);
            pts+=`<line x1="${rx1}" y1="${ry1}" x2="${rx2}" y2="${ry2}" stroke="var(--intent-warning,#f59e0b)" stroke-width="1.5" stroke-dasharray="5 3" opacity=".7"/>`;
        }
        dataset.forEach((d,i)=>{
            const col=this.sanitizeCssColor(d.color||'')||_apc(i);
            pts+=`<circle cx="${toX(Number(d.x)||0)}" cy="${toY(Number(d.y)||0)}" r="5" fill="${col}" fill-opacity=".85" stroke="var(--bg-panel)" stroke-width="1.5"><title>${this.escapeHtml(d.label||'')}: (${d.x}, ${d.y})</title></circle>`;
        });
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${pts}</svg>`;
        return [svg,''];
    },

    _adv_radarChart(dataset, W, H, cfg) {
        // dataset: [{label, value}] — polygon radar
        const cx=W/2, cy=H/2-10, R=Math.min(cx,cy)-50;
        const n=dataset.length; if (!n) return ['',''];
        const maxVal=Math.max(1,...dataset.map(d=>Number(d.value)||0));
        const angleStep=(Math.PI*2)/n;
        const toXY=(i,v)=>({
            x: cx+(v/maxVal)*R*Math.cos(i*angleStep-Math.PI/2),
            y: cy+(v/maxVal)*R*Math.sin(i*angleStep-Math.PI/2)
        });
        // Grid rings
        let parts='';
        [.2,.4,.6,.8,1].forEach(r=>{
            const pts=dataset.map((_,i)=>toXY(i,maxVal*r));
            parts+=`<polygon points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="var(--border-subtle,rgba(100,116,139,.3))" stroke-width="1"/>`;
        });
        // Spokes + labels
        dataset.forEach((d,i)=>{
            const tip=toXY(i,maxVal);
            parts+=`<line x1="${cx}" y1="${cy}" x2="${tip.x}" y2="${tip.y}" stroke="var(--border-subtle,rgba(100,116,139,.3))" stroke-width="1"/>`;
            const lbl=toXY(i,maxVal*1.18);
            parts+=`<text x="${lbl.x}" y="${lbl.y+4}" text-anchor="middle" font-size="11" fill="var(--text-body)">${this.escapeHtml(d.label||'')}</text>`;
        });
        // Data polygon
        const dpts=dataset.map((_,i)=>toXY(i,Number(dataset[i].value)||0));
        const col=_apc(0);
        parts+=`<polygon points="${dpts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-width="2"/>`;
        dpts.forEach((p,i)=>{ parts+=`<circle cx="${p.x}" cy="${p.y}" r="4" fill="${col}"><title>${this.escapeHtml(dataset[i].label||'')}: ${dataset[i].value}</title></circle>`; });
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${parts}</svg>`;
        return [svg,''];
    },

    _adv_histogramChart(dataset, W, H, cfg) {
        // dataset treated as raw values to bin, or pre-binned [{label, value}]
        const pad={pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        const vals=dataset.map(d=>Number(d.value)||0);
        const maxVal=Math.max(1,...vals);
        const bW=cW/dataset.length;
        const col=_apc(0);
        let bars=this._chartAxes(W,H,pad,maxVal,dataset);
        dataset.forEach((d,i)=>{
            const v=Math.max(0,Number(d.value)||0);
            const bH=(v/maxVal)*cH, x=pL+i*bW, y=pT+cH-bH;
            bars+=`<rect x="${x+1}" y="${y}" width="${bW-2}" height="${bH}" fill="${col}" fill-opacity=".85"><title>${this.escapeHtml(d.label||'')}: ${v}</title></rect>`;
            bars+=`<text x="${x+bW/2}" y="${pT+cH+18}" text-anchor="middle" font-size="10" fill="var(--text-body)">${this.escapeHtml((d.label||'').slice(0,8))}</text>`;
        });
        return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${bars}</svg>`,''];
    },

    _adv_bubbleChart(dataset, W, H, cfg) {
        // dataset: [{x, y, size, label, color}]
        const pad={pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        const allX=dataset.map(d=>Number(d.x)||0), allY=dataset.map(d=>Number(d.y)||0);
        const xMax=Math.max(1,...allX), yMax=Math.max(1,...allY);
        const sMax=Math.max(1,...dataset.map(d=>Number(d.size)||0));
        const toX=x=>pL+(x/xMax)*cW, toY=y=>pT+cH-(y/yMax)*cH;
        let parts=this._chartAxes(W,H,pad,yMax,dataset);
        dataset.forEach((d,i)=>{
            const r=5+((Number(d.size)||0)/sMax)*30;
            const col=this.sanitizeCssColor(d.color||'')||_apc(i);
            parts+=`<circle cx="${toX(Number(d.x)||0)}" cy="${toY(Number(d.y)||0)}" r="${r}" fill="${col}" fill-opacity=".55" stroke="${col}" stroke-width="1.5"><title>${this.escapeHtml(d.label||'')} (${d.x}, ${d.y}, ${d.size})</title></circle>`;
        });
        return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${parts}</svg>`,''];
    },

    _adv_funnelChart(dataset, W, H, cfg) {
        const pad={pL:20,pR:20,pT:30,pB:20};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        const n=dataset.length||1, rowH=cH/n;
        const maxVal=Math.max(1,Number(dataset[0]?.value)||0);
        let parts='';
        dataset.forEach((d,i)=>{
            const val=Math.max(0,Number(d.value)||0);
            const topW=(val/maxVal)*cW;
            const nextVal=i<dataset.length-1?Math.max(0,Number(dataset[i+1].value)||0):val*.5;
            const btmW=(nextVal/maxVal)*cW;
            const topX=(W-topW)/2, btmX=(W-btmW)/2;
            const y=pT+i*rowH;
            const col=_apc(i);
            parts+=`<path d="M${topX},${y} L${topX+topW},${y} L${btmX+btmW},${y+rowH-2} L${btmX},${y+rowH-2} Z" fill="${col}" fill-opacity=".85"><title>${this.escapeHtml(d.label||'')}: ${val}</title></path>`;
            parts+=`<text x="${W/2}" y="${y+rowH/2+5}" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">${this.escapeHtml(d.label||'')} (${_fmtN(val)})</text>`;
        });
        return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${parts}</svg>`,''];
    },

    _adv_waterfallChart(dataset, W, H, cfg) {
        // dataset: [{label, value}] — positive/negative increments
        const pad={pL:50,pR:20,pT:20,pB:45};
        const {pL,pR,pT,pB}=pad;
        const cW=W-pL-pR, cH=H-pT-pB;
        // Compute running total
        let running=0, runData=[];
        dataset.forEach(d=>{ const v=Number(d.value)||0; const start=running; running+=v; runData.push({label:d.label,value:v,start,end:running}); });
        const allVals=runData.flatMap(d=>[d.start,d.end]);
        const minVal=Math.min(0,...allVals), maxVal=Math.max(0,...allVals);
        const range=maxVal-minVal||1;
        const bW=cW/dataset.length;
        const toY=v=>pT+cH-((v-minVal)/range)*cH;
        let parts=this._chartAxes(W,H,pad,maxVal,dataset);
        runData.forEach((d,i)=>{
            const isPos=d.value>=0;
            const col=isPos?_apc(1):_apc(3);
            const y1=toY(Math.max(d.start,d.end)), y2=toY(Math.min(d.start,d.end));
            const x=pL+i*bW+bW*.1, w=bW*.8;
            parts+=`<rect x="${x}" y="${y1}" width="${w}" height="${y2-y1}" fill="${col}" fill-opacity=".85" rx="3"><title>${this.escapeHtml(d.label||'')}: ${d.value>0?'+':''}${d.value}</title></rect>`;
            parts+=`<text x="${x+w/2}" y="${y1-4}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${d.value>0?'+':''}${_fmtN(d.value)}</text>`;
            parts+=`<text x="${x+w/2}" y="${pT+cH+18}" text-anchor="middle" font-size="10" fill="var(--text-body)">${this.escapeHtml((d.label||'').slice(0,8))}</text>`;
            // Connector
            if (i<runData.length-1) {
                const nextX=pL+(i+1)*bW+bW*.1;
                parts+=`<line x1="${x+w}" y1="${toY(d.end)}" x2="${nextX}" y2="${toY(d.end)}" stroke="var(--border-heavy)" stroke-width="1" stroke-dasharray="3 2"/>`;
            }
        });
        return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${parts}</svg>`,''];
    },

    _adv_treemapChart(dataset, W, H, cfg) {
        // Simple squarified treemap
        const total=dataset.reduce((s,d)=>s+Math.max(0,Number(d.value)||0),0)||1;
        let x=0; let parts='';
        dataset.forEach((d,i)=>{
            const val=Math.max(0,Number(d.value)||0);
            const w=(val/total)*W;
            const col=_apc(i);
            parts+=`<rect x="${x}" y="0" width="${w}" height="${H}" fill="${col}" fill-opacity=".85" stroke="var(--bg-panel)" stroke-width="2"><title>${this.escapeHtml(d.label||'')}: ${val}</title></rect>`;
            if (w>40) parts+=`<text x="${x+w/2}" y="${H/2}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.min(13,w/5)}" fill="#fff" font-weight="600">${this.escapeHtml((d.label||'').slice(0,8))}</text>`;
            x+=w;
        });
        return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-chart-svg">${parts}</svg>`,''];
    },

    renderSequenceChart(dataset, W, H, cfg) {
        const actors=Array.from(new Set(dataset.flatMap(d=>[d.from,d.to]).filter(Boolean)));
        if (!actors.length) return '';
        const AW=120, ASPACING=Math.max(AW+40, W/actors.length);
        const HDR=60, MSG_SP=55, svgW=Math.max(400,actors.length*ASPACING+80);
        const svgH=Math.max(H, HDR+dataset.length*MSG_SP+80);
        const ax=i=>40+i*ASPACING+AW/2;
        const aIdx={}; actors.forEach((a,i)=>aIdx[a]=i);
        let parts=[`<defs>${_ADV_ARROW_DEFS}</defs>`];
        // Actor boxes + lifelines
        actors.forEach((a,i)=>{
            const cx=ax(i);
            parts.push(`<rect x="${cx-AW/2}" y="10" width="${AW}" height="38" rx="6" fill="var(--bg-depth,#1e293b)" stroke="var(--border-heavy,#334155)" stroke-width="1.5"/>`);
            parts.push(`<text x="${cx}" y="34" text-anchor="middle" font-size="13" font-weight="600" fill="var(--text-main)" font-family="var(--font-sans)">${this.escapeHtml(a)}</text>`);
            parts.push(`<line x1="${cx}" y1="${HDR}" x2="${cx}" y2="${svgH-30}" stroke="var(--border-heavy,#334155)" stroke-width="1.5" stroke-dasharray="6 5"/>`);
        });
        let curY=HDR+30;
        dataset.forEach((m,mi)=>{
            if (!m.from||!m.to) return;
            const fx=ax(aIdx[m.from]??0), tx=ax(aIdx[m.to]??0);
            const dash=(m.edge||'->').includes('--')?'stroke-dasharray="5 4"':'';
            const self=m.from===m.to;
            if (self) {
                const r=32;
                parts.push(`<path d="M${fx},${curY} C${fx+r*2},${curY-r} ${fx+r*2},${curY+r} ${fx},${curY}" fill="none" stroke="var(--text-mute,#94a3b8)" stroke-width="1.5" ${dash} marker-end="url(#adv-arr)"/>`);
                parts.push(`<text x="${fx+r*2+4}" y="${curY+4}" font-size="11" fill="var(--text-body)">${this.escapeHtml(m.message||m.text||'')}</text>`);
            } else {
                const arrow=tx>fx?'url(#adv-arr)':'url(#adv-arr-r)';
                parts.push(`<line x1="${fx}" y1="${curY}" x2="${tx}" y2="${curY}" stroke="var(--text-mute,#94a3b8)" stroke-width="1.5" ${dash} marker-end="${arrow}"/>`);
                const mx=(fx+tx)/2;
                parts.push(`<text x="${mx}" y="${curY-8}" text-anchor="middle" font-size="11" fill="var(--text-body)">${this.escapeHtml(m.message||m.text||'')}</text>`);
            }
            curY+=MSG_SP;
        });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-chart-svg">${parts.join('')}</svg>`;
    },

    renderGanttChart(dataset, W, H, cfg) {
        if (!dataset?.length) return '<div class="zolto-error-block">Empty Gantt</div>';
        const LBL=160, PAD=20, ROW_H=32, BAR_H=20;
        const svgH=Math.max(H,dataset.length*ROW_H+PAD*2+40);
        const svgW=W; const cW=svgW-LBL-PAD*2;
        const maxV=Math.max(1,...dataset.map(d=>Number(d.value)||0));
        let parts='';
        dataset.forEach((d,i)=>{
            const y=PAD+i*ROW_H, val=Math.max(0,Number(d.value)||0);
            const bW=(val/maxV)*cW, col=_apc(i);
            parts+=`<text x="${LBL-8}" y="${y+ROW_H*.65}" text-anchor="end" font-size="11" fill="var(--text-body)">${this.escapeHtml((d.label||'').slice(0,22))}</text>`;
            parts+=`<rect x="${LBL}" y="${y+(ROW_H-BAR_H)/2}" width="${bW}" height="${BAR_H}" rx="4" fill="${col}" fill-opacity=".85"><title>${val} units</title></rect>`;
            if (bW>30) parts+=`<text x="${LBL+bW/2}" y="${y+ROW_H*.65}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${_fmtN(val)}</text>`;
        });
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" class="zolto-chart-svg">${parts}</svg>`;
    },

    /* ──────────────────────────────────────────────────────────────────────
       §4  DIAGRAMS — Architecture, Network, Atom, Circuit, Org chart, Tree
    ────────────────────────────────────────────────────────────────────── */

    renderDiagram(node, ms) {
        const dtype=(node.diagramType||'').toLowerCase();
        switch(dtype) {
            case 'architecture': case 'arch': case 'c4':
                return this._renderArchDiagram(node, ms);
            case 'network': case 'topology':
                return this._renderNetworkDiagram(node, ms);
            case 'dependency': case 'dep':
                return this._renderDependencyGraph(node, ms);
            case 'atom': case 'bohr':
                return this._renderAtomDiagram(node, ms);
            case 'circuit':
                return this._renderCircuitDiagram(node, ms);
            case 'org': case 'orgchart':
                return this._renderOrgChart(node, ms);
            case 'tree': case 'hierarchy':
                return this._renderTreeDiagram(node, ms);
            case 'grammar': case 'grammar-tree': case 'parse-tree':
                return this._renderGrammarTree(node, ms);
            case 'flowchart': case 'flow': case 'graph': case 'digraph':
                return this.renderGraph({...node, type:'Graph'}, ms);
            case 'sequence': case 'seq':
                return this.renderSequence({...node, type:'Sequence'}, ms);
            case 'state': case 'statemachine':
                return this.renderStateMachine({...node, type:'StateMachine'}, ms);
            case 'erd': case 'erdiagram':
                return this.renderERDiagram({...node, type:'ERDiagram'}, ms);
            case 'mindmap':
                return this.renderMindmap({...node, type:'Mindmap'}, ms);
            case 'gantt':
                return this.renderGantt({...node, type:'Gantt'}, ms);
            case 'timeline':
                return this.renderTimeline({...node, type:'Timeline'}, ms);
            default:
                return this._renderGenericDiagram(node, ms);
        }
    },

    _renderArchDiagram(node, ms) {
        _injectAdvancedStyles();
        const layers=node.layers||node.nodes||[];
        const W=node.width||800, H=node.height||480;
        const id=_id('arch');
        const COLORS=['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899'];
        let parts=[`<defs>${_ADV_ARROW_DEFS}</defs>`];
        // Simple auto-layout: layers as rows
        const rowH=H/Math.max(1,layers.length+1), colPad=40;
        layers.forEach((layer,li)=>{
            const nodes=layer.nodes||[layer];
            const nodeW=Math.min(160,(W-colPad*2)/Math.max(1,nodes.length)-20);
            const rowY=rowH*(li+1)-rowH*.5;
            const colStep=(W-colPad*2)/Math.max(1,nodes.length);
            // Layer band
            if (layer.label||layer.name) {
                parts.push(`<rect x="10" y="${rowY-rowH*.45}" width="${W-20}" height="${rowH*.9}" rx="8" fill="${COLORS[li%COLORS.length]}" fill-opacity=".07" stroke="${COLORS[li%COLORS.length]}" stroke-opacity=".3" stroke-width="1.5" stroke-dasharray="5 3"/>`);
                parts.push(`<text x="20" y="${rowY-rowH*.35+14}" font-size="11" font-weight="700" fill="${COLORS[li%COLORS.length]}" opacity=".8">${this.escapeHtml(layer.label||layer.name||'')}</text>`);
            }
            nodes.forEach((n,ni)=>{
                const nx=colPad+ni*colStep+colStep/2-nodeW/2, ny=rowY-20;
                const col=COLORS[li%COLORS.length];
                const kind=(n.kind||'service').toLowerCase();
                const shape=kind==='db'||kind==='database'?'cylinder':kind==='cloud'?'cloud':'rect';
                if (shape==='cylinder') {
                    parts.push(`<rect x="${nx}" y="${ny}" width="${nodeW}" height="38" rx="6" fill="var(--bg-depth)" stroke="${col}" stroke-width="1.5"/>`);
                    parts.push(`<ellipse cx="${nx+nodeW/2}" cy="${ny}" rx="${nodeW/2}" ry="8" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-width="1.5"/>`);
                } else {
                    parts.push(`<rect x="${nx}" y="${ny}" width="${nodeW}" height="40" rx="8" fill="var(--bg-depth)" stroke="${col}" stroke-width="1.5"/>`);
                }
                parts.push(`<text x="${nx+nodeW/2}" y="${ny+22}" text-anchor="middle" font-size="12" fill="var(--text-main)" font-weight="600">${this.escapeHtml((n.label||n.name||n.id||'').slice(0,18))}</text>`);
                if (n.desc) parts.push(`<text x="${nx+nodeW/2}" y="${ny+36}" text-anchor="middle" font-size="9" fill="var(--text-mute)">${this.escapeHtml(n.desc.slice(0,22))}</text>`);
                n._cx=nx+nodeW/2; n._cy=ny+40;
            });
        });
        // Connections
        (node.edges||[]).forEach(e=>{
            const allNodes=layers.flatMap(l=>l.nodes||[l]);
            const fn=allNodes.find(n=>n.id===e.from||n.name===e.from);
            const tn=allNodes.find(n=>n.id===e.to||n.name===e.to);
            if (fn&&tn&&fn._cx&&tn._cx) {
                const mx=(fn._cx+tn._cx)/2;
                parts.push(`<path d="M${fn._cx},${fn._cy} C${fn._cx},${fn._cy+30} ${tn._cx},${tn._cy-30} ${tn._cx},${tn._cy-8}" fill="none" stroke="var(--edge-color,#64748b)" stroke-width="1.5" marker-end="url(#adv-arr)"/>`);
                if (e.label) parts.push(`<text x="${mx}" y="${(fn._cy+tn._cy)/2}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${this.escapeHtml(e.label)}</text>`);
            }
        });
        return `<div class="zolto-arch-diagram" id="${id}" style="${ms}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg" aria-label="architecture diagram">${parts.join('')}</svg>
</div>`;
    },

    _renderNetworkDiagram(node, ms) {
        const nodes=node.nodes||[];
        const edges=node.edges||[];
        const W=node.width||700, H=node.height||420;
        const id=_id('net');
        // Force-free radial layout
        const n=nodes.length, cx=W/2, cy=H/2;
        const R=Math.min(cx,cy)-70;
        nodes.forEach((nd,i)=>{ nd._x=cx+R*Math.cos((i/n)*Math.PI*2-Math.PI/2); nd._y=cy+R*Math.sin((i/n)*Math.PI*2-Math.PI/2); });
        const ICONS={server:'⬛',cloud:'☁',device:'⬜',db:'🗄',user:'👤',router:'⚡',switch:'🔀',internet:'🌐',pc:'💻',phone:'📱'};
        let parts=[`<defs>${_ADV_ARROW_DEFS}</defs>`];
        edges.forEach(e=>{
            const fn=nodes.find(n=>n.id===e.from), tn=nodes.find(n=>n.id===e.to);
            if (!fn||!tn) return;
            const dash=e.type==='wireless'?'stroke-dasharray="5 4"':'';
            parts.push(`<line x1="${fn._x}" y1="${fn._y}" x2="${tn._x}" y2="${tn._y}" stroke="var(--edge-color,#64748b)" stroke-width="${e.bandwidth?2:1.5}" ${dash}/>`);
            if (e.label) { const mx=(fn._x+tn._x)/2, my=(fn._y+tn._y)/2; parts.push(`<text x="${mx}" y="${my-5}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${this.escapeHtml(e.label)}</text>`); }
        });
        nodes.forEach(nd=>{
            const kind=(nd.kind||'server').toLowerCase();
            const col=_apc(nodes.indexOf(nd));
            parts.push(`<circle cx="${nd._x}" cy="${nd._y}" r="28" fill="var(--bg-depth)" stroke="${col}" stroke-width="2"/>`);
            parts.push(`<text x="${nd._x}" y="${nd._y+5}" text-anchor="middle" font-size="16">${ICONS[kind]||'◆'}</text>`);
            parts.push(`<text x="${nd._x}" y="${nd._y+44}" text-anchor="middle" font-size="11" fill="var(--text-body)" font-weight="600">${this.escapeHtml((nd.label||nd.id||'').slice(0,16))}</text>`);
        });
        return `<div class="zolto-diagram" id="${id}" style="${ms}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg" aria-label="network diagram">${parts.join('')}</svg></div>`;
    },

    _renderAtomDiagram(node, ms) {
        _injectAdvancedStyles();
        const element=node.element||'H';
        const protons=parseInt(node.protons,10)||1;
        const neutrons=parseInt(node.neutrons,10)||0;
        const shells=node.shells||node.electron_shells||[2,8,18,32,18,8,2];
        const W=400, H=400, cx=W/2, cy=H/2;
        const id=_id('atom');
        let parts=[];
        // Nucleus
        parts.push(`<circle cx="${cx}" cy="${cy}" r="28" fill="var(--intent-danger,#ef4444)" fill-opacity=".9" filter="url(#atom-glow)"/>`);
        parts.push(`<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">${this.escapeHtml(element)}</text>`);
        parts.push(`<text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.7)">${protons}p ${neutrons}n</text>`);
        // Electron shells
        let shellR=52;
        shells.forEach((eCount,si)=>{
            if (eCount===0) return;
            shellR+=si===0?0:38;
            parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${shellR}" ry="${shellR*.45}" fill="none" stroke="var(--intent-primary,#3b82f6)" stroke-opacity=".35" stroke-width="1.5" transform="rotate(${si*15},${cx},${cy})"/>`);
            // Electrons
            for (let ei=0; ei<Math.min(eCount,8); ei++) {
                const a=(ei/Math.min(eCount,8))*Math.PI*2;
                const ex=cx+shellR*Math.cos(a), ey=cy+shellR*.45*Math.sin(a);
                parts.push(`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="var(--intent-primary,#3b82f6)"><title>e⁻</title></circle>`);
            }
        });
        return `<div class="zolto-diagram" id="${id}" style="${ms}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg zolto-atom-svg" aria-label="atom model of ${this.escapeHtml(element)}">
    <defs><filter id="atom-glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${parts.join('')}
  </svg>
</div>`;
    },

    _renderOrgChart(node, ms) {
        const W=node.width||700, H=node.height||420;
        const root=node.root||node.nodes?.[0];
        if (!root) return `<div class="zolto-diagram" style="${ms}"></div>`;
        const NW=150, NH=42, GAPX=20, GAPY=60;
        const positions={};
        const computeWidth=(n)=>{
            const kids=n.children||[];
            if (!kids.length) return NW+GAPX;
            return Math.max(NW+GAPX, kids.reduce((s,k)=>s+computeWidth(k),0));
        };
        const layout=(n,x,y)=>{
            positions[n.id||n.label||Math.random()]=Object.assign(n,{_x:x,_y:y});
            const kids=n.children||[];
            if (!kids.length) return;
            const totalW=kids.reduce((s,k)=>s+computeWidth(k),0);
            let cx2=x-totalW/2;
            kids.forEach(k=>{ layout(k,cx2+computeWidth(k)/2,y+NH+GAPY); cx2+=computeWidth(k); });
        };
        layout(root,W/2,20);
        let parts=[`<defs>${_ADV_ARROW_DEFS}</defs>`];
        const drawNode=(n)=>{
            if (n._x===undefined) return;
            const col=_apc(n._depth||0);
            const kids=n.children||[];
            kids.forEach(k=>{ if(k._x!==undefined) parts.push(`<line x1="${n._x}" y1="${n._y+NH}" x2="${k._x}" y2="${k._y}" stroke="var(--border-heavy)" stroke-width="1.5"/>`); drawNode(k); });
            parts.push(`<rect x="${n._x-NW/2}" y="${n._y}" width="${NW}" height="${NH}" rx="8" fill="var(--bg-depth)" stroke="${col}" stroke-width="1.5"/>`);
            parts.push(`<text x="${n._x}" y="${n._y+15}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-main)">${this.escapeHtml((n.label||n.name||n.id||'?').slice(0,18))}</text>`);
            if (n.subtitle) parts.push(`<text x="${n._x}" y="${n._y+30}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${this.escapeHtml(n.subtitle.slice(0,22))}</text>`);
        };
        drawNode(root);
        return `<div class="zolto-diagram" style="${ms}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg" aria-label="org chart">${parts.join('')}</svg></div>`;
    },

    _renderTreeDiagram(node, ms) {
        return this._renderOrgChart({...node, root: node.root||node.nodes?.[0]}, ms);
    },

    _renderGrammarTree(node, ms) {
        const W=node.width||600, H=node.height||400;
        const root=node.root;
        if (!root) return `<div class="zolto-diagram" style="${ms}"></div>`;
        const NW=60, NH=30, GAPX=10, GAPY=50;
        const computeW=(n)=>{
            const kids=n.children||[];
            return kids.length ? Math.max(NW, kids.reduce((s,k)=>s+computeW(k)+GAPX,0)) : NW+GAPX;
        };
        const layout=(n,x,y,depth)=>{
            n._x=x; n._y=y; n._depth=depth;
            const kids=n.children||[];
            let cx=x-computeW(n)/2;
            kids.forEach(k=>{ layout(k,cx+computeW(k)/2,y+NH+GAPY,depth+1); cx+=computeW(k)+GAPX; });
        };
        layout(root,W/2,20,0);
        let parts=[];
        const draw=(n)=>{
            if (n._x===undefined) return;
            const isLeaf=!(n.children?.length);
            const col=isLeaf?_apc(4):_apc(0);
            (n.children||[]).forEach(k=>{ parts.push(`<line x1="${n._x}" y1="${n._y+NH}" x2="${k._x}" y2="${k._y}" stroke="var(--border-heavy)" stroke-width="1.5"/>`); draw(k); });
            parts.push(`<rect x="${n._x-NW/2}" y="${n._y}" width="${NW}" height="${NH}" rx="${isLeaf?4:8}" fill="${isLeaf?'var(--bg-depth)':'var(--bg-panel)'}" stroke="${col}" stroke-width="1.5"/>`);
            parts.push(`<text x="${n._x}" y="${n._y+20}" text-anchor="middle" font-size="${isLeaf?10:12}" fill="var(--text-main)" font-weight="${isLeaf?'400':'700'}">${this.escapeHtml((n.label||n.text||'').slice(0,8))}</text>`);
        };
        draw(root);
        return `<div class="zolto-diagram" style="${ms}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg" aria-label="grammar tree">${parts.join('')}</svg></div>`;
    },

    _renderCircuitDiagram(node, ms) {
        // Simplified: render components as SVG symbols on a grid
        const comps=node.components||node.nodes||[];
        const W=node.width||600, H=node.height||300;
        const id=_id('cir');
        let parts=[];
        comps.forEach((c,i)=>{
            const x=(c.x||i*100+40), y=(c.y||H/2);
            const kind=(c.type||c.kind||'').toLowerCase();
            const lbl=this.escapeHtml(c.label||c.value||'');
            if (kind==='resistor') {
                parts.push(`<rect x="${x-20}" y="${y-8}" width="40" height="16" rx="3" fill="var(--bg-depth)" stroke="var(--intent-warning)" stroke-width="2"/>`);
                parts.push(`<text x="${x}" y="${y+30}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${lbl} Ω</text>`);
            } else if (kind==='capacitor') {
                parts.push(`<line x1="${x-15}" y1="${y-12}" x2="${x-15}" y2="${y+12}" stroke="var(--intent-primary)" stroke-width="3"/>`);
                parts.push(`<line x1="${x+15}" y1="${y-12}" x2="${x+15}" y2="${y+12}" stroke="var(--intent-primary)" stroke-width="3"/>`);
                parts.push(`<text x="${x}" y="${y+30}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${lbl} F</text>`);
            } else if (kind==='inductor'||kind==='coil') {
                for (let b=0;b<4;b++) parts.push(`<path d="M${x-20+b*10},${y} A5,8 0 1,0 ${x-10+b*10},${y}" fill="none" stroke="var(--intent-success)" stroke-width="2"/>`);
                parts.push(`<text x="${x}" y="${y+30}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${lbl} H</text>`);
            } else if (kind==='battery'||kind==='source') {
                parts.push(`<line x1="${x-20}" y1="${y}" x2="${x+20}" y2="${y}" stroke="var(--text-mute)" stroke-width="1.5"/>`);
                [-6,-2,2,6].forEach((o,bi)=>parts.push(`<line x1="${x+o}" y1="${y-8*(bi%2?1:.5)}" x2="${x+o}" y2="${y+8*(bi%2?1:.5)}" stroke="${bi%2?'var(--intent-primary)':'var(--text-mute)'}" stroke-width="${bi%2?3:1.5}"/>`));
            } else {
                parts.push(`<circle cx="${x}" cy="${y}" r="16" fill="var(--bg-depth)" stroke="var(--border-heavy)" stroke-width="1.5"/>`);
                parts.push(`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="10" fill="var(--text-body)">${this.escapeHtml(kind.slice(0,3))}</text>`);
            }
            parts.push(`<text x="${x}" y="${y-22}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-main)">${this.escapeHtml((c.name||c.id||'').slice(0,8))}</text>`);
        });
        // Connections
        (node.connections||node.edges||[]).forEach(e=>{
            const fc=comps.find(c=>c.id===e.from), tc=comps.find(c=>c.id===e.to);
            if (fc&&tc) parts.push(`<line x1="${fc.x||0}" y1="${fc.y||H/2}" x2="${tc.x||0}" y2="${tc.y||H/2}" stroke="var(--text-main)" stroke-width="1.5"/>`);
        });
        return `<div class="zolto-diagram" id="${id}" style="${ms}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="zolto-svg" aria-label="circuit diagram">${parts.join('')}</svg></div>`;
    },

    _renderDependencyGraph(node, ms) {
        // Layered dependency graph (same as flowchart but with dep-specific styling)
        return this.renderGraph({...node, type:'Graph', _depStyle:true}, ms);
    },

    _renderGenericDiagram(node, ms) {
        const dn=node.nodes||[], de=node.edges||[];
        if (!dn.length&&!de.length) return `<div class="zolto-diagram zolto-diagram-empty" style="${ms}"><em>${this.escapeHtml(node.diagramType||'diagram')}</em></div>`;
        return this.renderGraph({...node, type:'Graph'}, ms);
    },

    /* ──────────────────────────────────────────────────────────────────────
       §5  INTERACTIVE — MCQ, Quiz, Flashcard, Slider, Solve
    ────────────────────────────────────────────────────────────────────── */

    renderMCQ(node, ms) {
        _injectAdvancedStyles();
        const uid  = _id('mcq');
        const qHtml= this._inlineOf(node) || this.escapeHtml(node.question||'');
        const opts = node.options||node.choices||[];
        const expl = node.explanation ? `<div class="zolto-mcq-expl" id="${uid}-expl">${this.escapeHtml(node.explanation)}</div>` : '';
        const optsHtml = opts.map((o,i) => {
            const key = String.fromCharCode(65+i);
            const label = typeof o === 'string' ? o : (o.text||o.label||'');
            const isCorrect = o.correct || (node.answer !== undefined && node.answer === i) || (node.correct === key);
            return `<div class="zolto-mcq-opt" data-correct="${isCorrect}" data-idx="${i}" onclick="ZoltoAdvancedEngines._mcqSelect('${uid}',${i})" role="radio" aria-label="${this.escapeHtml(label)}">
  <span class="zolto-mcq-key">${key}.</span><span>${this.escapeHtml(label)}</span>
</div>`;
        }).join('');
        const diff = node.difficulty ? `<span class="zolto-badge" style="font-size:.7rem">${this.escapeHtml(node.difficulty)}</span>` : '';
        const tags = (node.tags||[]).map(t=>`<span class="zolto-flashcard-tag">${this.escapeHtml(t)}</span>`).join('');
        return `<div class="zolto-mcq" id="${uid}" style="${ms}" role="group">
  <div class="zolto-mcq-q">${qHtml} ${diff}</div>
  <div class="zolto-mcq-opts" role="radiogroup">${optsHtml}</div>
  ${expl}
  ${tags ? `<div class="zolto-flashcard-tags">${tags}</div>` : ''}
  <div class="zolto-mcq-actions">
    <button class="zolto-mcq-btn primary" onclick="ZoltoAdvancedEngines._mcqCheck('${uid}')">Check Answer</button>
    <button class="zolto-mcq-btn secondary" onclick="ZoltoAdvancedEngines._mcqReset('${uid}')">Reset</button>
  </div>
</div>`;
    },

    _mcqSelect(uid, idx) {
        const el = document.getElementById(uid); if (!el) return;
        el.querySelectorAll('.zolto-mcq-opt').forEach((o,i) => {
            o.classList.toggle('selected', i === idx);
            o.style.borderColor = i === idx ? 'var(--intent-primary)' : '';
        });
        el._selected = idx;
    },
    _mcqCheck(uid) {
        const el = document.getElementById(uid); if (!el) return;
        const sel = el._selected; if (sel === undefined) return;
        el.querySelectorAll('.zolto-mcq-opt').forEach((o,i) => {
            const isCorrect = o.dataset.correct === 'true';
            if (i === sel) o.classList.add(isCorrect ? 'correct' : 'wrong');
            if (isCorrect) o.classList.add('correct');
        });
        const expl = el.querySelector('.zolto-mcq-expl');
        if (expl) expl.classList.add('show');
    },
    _mcqReset(uid) {
        const el = document.getElementById(uid); if (!el) return;
        el.querySelectorAll('.zolto-mcq-opt').forEach(o => { o.classList.remove('correct','wrong','selected'); o.style.borderColor=''; });
        const expl = el.querySelector('.zolto-mcq-expl');
        if (expl) expl.classList.remove('show');
        delete el._selected;
    },

    renderQuiz(node, ms) {
        _injectAdvancedStyles();
        const uid = _id('quiz');
        const title = node.title ? `<span class="zolto-quiz-title">${this.escapeHtml(node.title)}</span>` : '';
        const meta  = node.time_limit ? `<span class="zolto-quiz-meta">⏱ ${node.time_limit} min</span>` : '';
        const questions = (node.questions||node.children||[]).filter(q=>q.type==='MCQ'||q.type==='mcq'||q.question);
        const qHtml = questions.map((q,i) => {
            const quid=`${uid}-q${i}`;
            const opts=(q.options||q.choices||[]).map((o,oi)=>{
                const key=String.fromCharCode(65+oi);
                const lbl=typeof o==='string'?o:(o.text||o.label||'');
                const isc=o.correct||q.answer===oi||q.correct===key;
                return `<div class="zolto-mcq-opt" data-correct="${isc}" data-idx="${oi}" onclick="ZoltoAdvancedEngines._mcqSelect('${quid}',${oi})"><span class="zolto-mcq-key">${key}.</span><span>${this.escapeHtml(lbl)}</span></div>`;
            }).join('');
            return `<div class="zolto-mcq" id="${quid}" style="margin:.75rem 0;border-color:var(--border-subtle)">
  <div class="zolto-mcq-q"><strong>${i+1}.</strong> ${this.escapeHtml(q.question||'')}</div>
  <div class="zolto-mcq-opts">${opts}</div>
  ${q.explanation?`<div class="zolto-mcq-expl" id="${quid}-expl">${this.escapeHtml(q.explanation)}</div>`:''}
</div>`;
        }).join('');
        return `<div class="zolto-quiz" id="${uid}" style="${ms}">
  <div class="zolto-quiz-header">${title}${meta}</div>
  <div class="zolto-quiz-body">
    ${qHtml}
    <div class="zolto-mcq-actions">
      <button class="zolto-mcq-btn primary" onclick="ZoltoAdvancedEngines._quizSubmit('${uid}',${questions.length})">Submit Quiz</button>
      <button class="zolto-mcq-btn secondary" onclick="ZoltoAdvancedEngines._quizReset('${uid}')">Reset</button>
    </div>
    <div class="zolto-quiz-score" id="${uid}-score">
      <div class="zolto-quiz-score-num" id="${uid}-num">0/${questions.length}</div>
      <div style="color:var(--text-mute);font-size:.85rem;margin-top:.3rem">Quiz complete!</div>
    </div>
  </div>
</div>`;
    },

    _quizSubmit(uid, total) {
        let correct=0;
        for (let i=0;i<total;i++) {
            const quid=`${uid}-q${i}`;
            const qel=document.getElementById(quid); if (!qel) continue;
            const sel=qel._selected;
            if (sel===undefined) continue;
            qel.querySelectorAll('.zolto-mcq-opt').forEach((o,oi)=>{
                const isc=o.dataset.correct==='true';
                if (oi===sel) o.classList.add(isc?'correct':'wrong');
                if (isc) { o.classList.add('correct'); if (oi===sel) correct++; }
            });
            const expl=qel.querySelector('.zolto-mcq-expl'); if (expl) expl.classList.add('show');
        }
        const scoreEl=document.getElementById(`${uid}-score`);
        const numEl=document.getElementById(`${uid}-num`);
        if (scoreEl) scoreEl.classList.add('show');
        if (numEl) numEl.textContent=`${correct}/${total}`;
    },
    _quizReset(uid) {
        document.querySelectorAll(`[id^="${uid}-q"]`).forEach(qel=>{
            qel.querySelectorAll('.zolto-mcq-opt').forEach(o=>{ o.classList.remove('correct','wrong','selected'); o.style.borderColor=''; });
            const expl=qel.querySelector('.zolto-mcq-expl'); if(expl) expl.classList.remove('show');
            delete qel._selected;
        });
        const scoreEl=document.getElementById(`${uid}-score`); if (scoreEl) scoreEl.classList.remove('show');
    },

    renderFlashcard(node, ms) {
        _injectAdvancedStyles();
        const uid = _id('fc');
        const front = this.escapeHtml(node.front||node.question||'');
        const back  = this.escapeHtml(node.back||node.answer||'');
        const tags  = (node.tags||[]).map(t=>`<span class="zolto-flashcard-tag">${this.escapeHtml(t)}</span>`).join('');
        const diff  = node.difficulty ? `<span class="zolto-flashcard-tag" style="background:rgba(239,68,68,.15);color:var(--intent-danger)">${this.escapeHtml(node.difficulty)}</span>` : '';
        return `<div class="zolto-flashcard" id="${uid}" style="${ms}" onclick="ZoltoAdvancedEngines._fcFlip('${uid}')" role="button" aria-label="Flashcard, click to flip" tabindex="0">
  <div class="zolto-flashcard-inner">
    <div class="zolto-flashcard-face zolto-flashcard-front">
      <div class="zolto-flashcard-label">Question</div>
      <div class="zolto-flashcard-text">${front}</div>
      ${tags?`<div class="zolto-flashcard-tags">${tags}${diff}</div>`:''}
      <div style="margin-top:.85rem;font-size:.7rem;color:var(--text-mute)">Click to reveal answer</div>
    </div>
    <div class="zolto-flashcard-face zolto-flashcard-back">
      <div class="zolto-flashcard-label">Answer</div>
      <div class="zolto-flashcard-text">${back}</div>
    </div>
  </div>
</div>`;
    },

    _fcFlip(uid) {
        const el=document.getElementById(uid); if (!el) return;
        el.classList.toggle('flipped');
    },

    renderInteractive(node, ms) {
        _injectAdvancedStyles();
        const uid = _id('ia');
        const sliders = (node.sliders||node.controls||[]);
        const formula = node.output||node.formula||'';
        const sliderHtml = sliders.map((s,i) => {
            const sid=`${uid}-s${i}`;
            const min=s.min??0, max=s.max??100, def=s.default??s.value??50;
            const step=s.step??((max-min)/100);
            return `<div class="zolto-slider-row">
  <label class="zolto-slider-label" for="${sid}">${this.escapeHtml(s.label||s.name||'')}</label>
  <input type="range" class="zolto-slider-input" id="${sid}" min="${min}" max="${max}" step="${step}" value="${def}" oninput="ZoltoAdvancedEngines._iaUpdate('${uid}')">
  <span class="zolto-slider-val" id="${sid}-val">${def}</span>
</div>`;
        }).join('');
        // Build safe JS evaluator data
        const sliderDefs = JSON.stringify(sliders.map((s,i)=>({name:s.name,id:`${uid}-s${i}`,def:s.default??s.value??50})));
        return `<div class="zolto-interactive" id="${uid}" style="${ms}" data-formula="${this.escapeHtml(formula)}" data-sliders='${sliderDefs}'>
  ${node.title?`<div class="zolto-math-title">${this.escapeHtml(node.title)}</div>`:''}
  ${sliderHtml}
  <div class="zolto-interactive-output" id="${uid}-out">Output: —</div>
</div>
<script>(function(){const ia=document.getElementById('${uid}');const sliders=${sliderDefs};const formula=ia.dataset.formula;function update(){let expr=formula;const vals={};sliders.forEach(s=>{const v=parseFloat(document.getElementById(s.id)?.value||s.def);document.getElementById(s.id+'-val').textContent=v;vals[s.name]=v;expr=expr.replace(new RegExp('\\\\b'+s.name+'\\\\b','g'),v)});try{const r=eval(expr.replace(/\^/g,'**'));document.getElementById('${uid}-out').textContent='= '+parseFloat(r.toFixed(6));}catch(e){document.getElementById('${uid}-out').textContent='= (error)';}}update();ia._update=update;})()</script>`;
    },

    _iaUpdate(uid) {
        const ia=document.getElementById(uid); if(!ia||!ia._update) return;
        try { ia._update(); } catch(e){}
    },

    /* ──────────────────────────────────────────────────────────────────────
       §6  ENHANCED BUILT-IN COMPONENTS
    ────────────────────────────────────────────────────────────────────── */

    _builtinComponent(name, props, children, ms) {
        _injectAdvancedStyles();
        const p = (k, def = '') => (props[k] !== undefined ? String(props[k]) : def);
        switch (name) {
            // ── Enhanced existing ─────────────────────────────────────────
            case 'Button': {
                const variant = /^[a-zA-Z-]+$/.test(p('variant','default')) ? p('variant','default') : 'default';
                const label   = this.escapeHtml(p('label', ''));
                const href    = p('href',''), icon = p('icon','');
                const tag     = href ? 'a' : 'button';
                const hattr   = href ? ` href="${this.sanitizeUrl(href)}"` : '';
                return `<${tag}${hattr} class="zolto-btn zolto-btn-${variant}" style="${ms}">${icon?`<span style="margin-right:.3em">${this.escapeHtml(icon)}</span>`:''}${label || this.renderChildren(children)}</${tag}>`;
            }
            case 'Alert': {
                const type    = /^[a-zA-Z-]+$/.test(p('type','info')) ? p('type','info') : 'info';
                const title   = p('title','');
                const icons   = {info:'ℹ',warning:'⚠',danger:'☠',success:'✓',note:'📝'};
                const icon    = icons[type] || 'ℹ';
                return `<div class="zolto-alert zolto-alert-${type}" style="${ms}" role="alert">
  ${title?`<strong>${this.escapeHtml(title)}</strong> `:''}${icon} ${this.renderChildren(children)}</div>`;
            }
            case 'Progress': {
                const val = Math.max(0,Math.min(100,parseFloat(p('value','0'))||0));
                const col = /^[a-zA-Z-]+$/.test(p('color','primary'))?`var(--intent-${p('color','primary')})`:p('color','primary');
                const showLabel = p('label','') || p('showLabel','') === 'true';
                return `<div class="zolto-progress" style="${ms}" title="${val}%">
  <div class="zolto-progress-bar" style="width:${val}%;background:${col};" role="progressbar" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="100">${showLabel?`<span style="padding:0 .5rem;font-size:.7rem;color:#fff;font-weight:700">${val}%</span>`:''}</div></div>`;
            }
            // ── New components ────────────────────────────────────────────
            case 'ProgressRing': {
                const val=Math.max(0,Math.min(100,parseFloat(p('value','0'))||0));
                const size=parseInt(p('size','80'),10), sw=parseInt(p('strokeWidth','8'),10);
                const r=(size-sw*2)/2, circ=2*Math.PI*r;
                const offset=circ*(1-val/100);
                const col=p('color','var(--intent-primary,#3b82f6)');
                const uid=_id('pr');
                return `<div class="zolto-progress-ring" style="${ms} width:${size}px;height:${size}px;">
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border-heavy,#334155)" stroke-width="${sw}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${this.sanitizeCssColor(col)||col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90,${size/2},${size/2})"/>
  </svg>
  <span class="zolto-progress-ring-label">${val}%</span>
</div>`;
            }
            case 'Rating': {
                const val=Math.max(0,Math.min(5,parseFloat(p('value','0'))||0));
                const max=parseInt(p('max','5'),10)||5;
                const stars=Array.from({length:max},(_,i)=>`<span class="zolto-rating-star ${i<Math.round(val)?'filled':''}">★</span>`).join('');
                return `<div class="zolto-rating" style="${ms}" title="${val}/${max}" role="img" aria-label="${val} out of ${max} stars">${stars}<span style="margin-left:.4rem;font-size:.85rem;color:var(--text-mute)">${val}/${max}</span></div>`;
            }
            case 'TagCloud': {
                const tagsStr=p('tags','');
                const tags=tagsStr.split(',').map(t=>t.trim()).filter(Boolean);
                const tagsHtml=tags.map((t,i)=>{
                    const col=_apc(i);
                    return `<span class="zolto-tag-cloud-tag" style="background:${col}1a;color:${col};border:1px solid ${col}40">${this.escapeHtml(t)}</span>`;
                }).join('');
                return `<div class="zolto-tag-cloud" style="${ms}">${tagsHtml}</div>`;
            }
            case 'DataTable': {
                // Expects cols="Name,Age,City" and children as rows
                const cols=p('cols','').split(',').map(c=>c.trim()).filter(Boolean);
                const hdr=cols.map(c=>`<th>${this.escapeHtml(c)}</th>`).join('');
                const rows=this.renderChildren(children);
                return `<div class="zolto-data-table-wrap" style="${ms}"><table class="zolto-data-table"><thead><tr>${hdr}</tr></thead><tbody>${rows}</tbody></table></div>`;
            }
            case 'Flashcard':
                return this.renderFlashcard({front:p('front',''), back:p('back',''), tags:(p('tags','')).split(',').map(t=>t.trim()).filter(Boolean), difficulty:p('difficulty','')}, ms);
            case 'MCQ':
                return this.renderMCQ({
                    question:p('question',''), options:p('options','').split('|').map(o=>o.trim()),
                    answer:parseInt(p('answer','-1'),10), explanation:p('explanation',''),
                    difficulty:p('difficulty',''), tags:p('tags','').split(',').map(t=>t.trim()).filter(Boolean)
                }, ms);
            case 'FnPlot':
                return this._renderFunctionPlot({fn:p('fn',p('function','')), title:p('title',''), xMin:p('xMin','-5'), xMax:p('xMax','5'), yMin:p('yMin','-5'), yMax:p('yMax','5'), width:p('width','600'), height:p('height','300')}, ms);
            case 'Atom':
                return this._renderAtomDiagram({element:p('element','H'), protons:p('protons','1'), neutrons:p('neutrons','0'), shells:p('shells','2,8,18').split(',').map(Number)}, ms);
            // Delegate unchanged
            case 'Badge':
            case 'Divider': case 'Spacer': case 'Code': case 'Math':
            case 'Box': case 'Center': case 'Stack': case 'Grid': case 'Flex':
            case 'Tabs': case 'Accordion': case 'Card': case 'Callout':
            case 'Steps': case 'Details': case 'Spinner': case 'Icon': case 'Image':
            case 'Diagram':
                return null; // let base renderer handle
            default:
                return null;
        }
    },

    /* ──────────────────────────────────────────────────────────────────────
       §7  UTILITIES
    ────────────────────────────────────────────────────────────────────── */

    /** XSS-safe HTML escaping */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        if (!/[&<>"']/.test(str)) return str;
        return str.replace(/[&<>"']/g, c =>
            ({  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
    },

    sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '#';
        const t = url.trim();
        if (/^(javascript|vbscript|data):/i.test(t)) return '#';
        return this.escapeHtml(t);
    },

    sanitizeCssColor(color) {
        if (!color || typeof color !== 'string') return 'inherit';
        const c = color.trim();
        if (/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,./%]+\)|hsla?\([\d\s,./%]+\)|[a-zA-Z]{2,30}|var\(--[a-zA-Z0-9_-]+\))$/.test(c))
            return this.escapeHtml(c);
        return 'inherit';
    },
};

/* ─── Number formatter ───────────────────────────────────────────────────────────────── */
function _fmtN(n) {
    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1)+'K';
    if (Number.isInteger(n)) return String(n);
    return parseFloat(n.toFixed(3)).toString();
}

/* ─── Full math symbol table ─────────────────────────────────────────────────────────── */
const _MATH_SYM_TABLE = {
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
    '\\det':'det','\\gcd':'gcd','\\lcm':'lcm',
    '\\exp':'exp','\\ln':'ln','\\log':'log',
    '\\sin':'sin','\\cos':'cos','\\tan':'tan',
    '\\sec':'sec','\\csc':'csc','\\cot':'cot',
    '\\arcsin':'arcsin','\\arccos':'arccos','\\arctan':'arctan',
    '\\sinh':'sinh','\\cosh':'cosh','\\tanh':'tanh',
    '\\hbar':'ℏ','\\ell':'ℓ','\\Re':'ℜ','\\Im':'ℑ','\\aleph':'ℵ',
    '\\rightarrow':'→','\\leftarrow':'←','\\uparrow':'↑','\\downarrow':'↓',
    '\\leftrightarrow':'↔','\\Rightarrow':'⇒','\\Leftarrow':'⇐','\\Leftrightarrow':'⇔',
    '\\mapsto':'↦','\\to':'→','\\gets':'←',
    '\\nearrow':'↗','\\searrow':'↘','\\swarrow':'↙','\\nwarrow':'↖',
    '\\sqrt':'√','\\angle':'∠','\\degree':'°','\\prime':'′',
    '\\cdots':'⋯','\\ldots':'…','\\vdots':'⋮','\\ddots':'⋱',
    '\\wp':'℘','\\triangle':'△','\\square':'□',
    '\\checkmark':'✓','\\dagger':'†','\\ddagger':'‡',
    '\\celsius':'℃','\\ohm':'Ω','\\angstrom':'Å',
    '\\hline':'─','\\ll':'≪','\\gg':'≫','\\lll':'⋘','\\ggg':'⋙',
    '\\prec':'≺','\\succ':'≻','\\preceq':'⪯','\\succeq':'⪰',
    '\\therefore':'∴','\\because':'∵','\\QED':'∎','\\blacksquare':'■',
    '\\langle':'⟨','\\rangle':'⟩','\\lfloor':'⌊','\\rfloor':'⌋',
    '\\lceil':'⌈','\\rceil':'⌉','\\|':'‖',
    // Chemistry
    '\\rightleftharpoons':'⇌','\\leftrightharpoons':'⇌',
    // Physics
    '\\hv':'hν','\\kB':'k_B',
};

/* ─── Expose MCQ/Quiz/Flashcard static methods globally for onclick handlers ─────────── */
if (typeof window !== 'undefined') {
    window.ZoltoAdvancedEngines = ZoltoAdvancedEngines;
}

/* ─── Merge into ZoltoRenderer ───────────────────────────────────────────────────────── */
if (typeof ZoltoRenderer !== 'undefined') {
    Object.assign(ZoltoRenderer, ZoltoAdvancedEngines);
    // Ensure advanced node types route correctly
    const _origRenderNode = ZoltoRenderer.renderNode.bind(ZoltoRenderer);
    ZoltoRenderer.renderNode = function(node) {
        if (!node || typeof node !== 'object') return '';
        switch (node.type) {
            case 'MCQ':          return ZoltoAdvancedEngines.renderMCQ.call(this, node, '');
            case 'Quiz':         return ZoltoAdvancedEngines.renderQuiz.call(this, node, '');
            case 'Flashcard':    return ZoltoAdvancedEngines.renderFlashcard.call(this, node, '');
            case 'Interactive':  return ZoltoAdvancedEngines.renderInteractive.call(this, node, '');
            case 'FunctionPlot': return ZoltoAdvancedEngines._renderFunctionPlot.call(this, node, '');
            default:             return _origRenderNode(node);
        }
    };
}

/* ─── Module export ──────────────────────────────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZoltoAdvancedEngines, _MATH_SYM_TABLE };
} else if (typeof window !== 'undefined') {
    window.ZoltoAdvancedEngines = ZoltoAdvancedEngines;
    window._MATH_SYM_TABLE = _MATH_SYM_TABLE;
}
