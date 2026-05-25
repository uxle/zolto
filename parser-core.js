/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE COMPILER — PARSER & RESOLUTION ENGINE
 * Version: 8.0.0 (Infinity Architecture · Unified Block Parser)
 *
 * Architecture Highlights:
 *  · V8/Bun/JSC Arena-Inspired Allocation — zero hot-path closures
 *  · Single-Pass O(N) Linear Block Parser + O(N) Resolution Phase
 *  · High-Performance Stack Machine — unlimited nesting depth
 *  · Domain-Specific Sub-Parsers for all 8 Diagram types
 *  · InlineParser integration in resolution (keeps hot-path clean)
 *  · MathASTBuilder for semantic math trees + auto equation numbering
 *  · Simplified YAML frontmatter reader
 *  · Multi-Column layout engine with separate tracking context
 *  · Full backward-compatibility with parser-core.js v7 AST surface
 * =========================================================================================
 */

'use strict';

import { ZOLTOTokenizer, TokenTypes }                    from './tokenizer.js';
import {
    ASTFactory,
    ZOLTONodeTypes,
    ZOLTOShapeTypes,
    ZOLTOEdgeOperators,
    ZOLTODiagramTypes,
    ZOLTOCalloutTypes,
    InlineParser,
    MathASTBuilder,
}                                                         from './ast.js';

/* =========================================================================================
   §1  PUBLIC COMPILER API
   ========================================================================================= */

export class ZOLTOCompiler {

    /**
     * Full document parse — returns a resolved AST Document node.
     * @param {string} sourceCode
     * @returns {Object} AST Document
     */
    static parse(sourceCode) {
        if (!sourceCode || typeof sourceCode !== 'string') return ASTFactory.createDocument();
        return new ZOLTOBlockParser(sourceCode).parse();
    }

    /**
     * Parse a fragment (no frontmatter, no resolution phase for speed).
     * Useful for live preview of a partial document.
     * @param {string} fragment
     * @returns {Object} AST Document (partially resolved)
     */
    static parseFragment(fragment) {
        if (!fragment) return ASTFactory.createDocument();
        return new ZOLTOBlockParser(fragment, { fragmentMode: true }).parse();
    }

    /**
     * Parse a single inline text string.
     * @param {string} text
     * @returns {Array} Inline AST node array
     */
    static parseInline(text) {
        return InlineParser.parse(text || '');
    }

    /**
     * Build a semantic math AST from a math expression string.
     * @param {string} expr
     * @returns {Object} Math AST root
     */
    static parseMath(expr) {
        return MathASTBuilder.build(expr || '');
    }
}

/* =========================================================================================
   §2  INTERNAL BLOCK PARSER
   ========================================================================================= */

class ZOLTOBlockParser {

    constructor(source, opts = {}) {
        this.source      = source;
        this.fragmentMode = opts.fragmentMode || false;
        this.tokenizer   = new ZOLTOTokenizer(source);
        this.ast         = ASTFactory.createDocument();

        /* ── Verbatim block state ────────────────────────────────────────────────────── */
        this.ctx = {
            // Verbatim mode flags
            inCode:        false,
            inMath:        false,
            inFrontmatter: false,

            // Code block
            codeLang:      '',
            codeConfig:    '',

            // Math block
            mathConfig:    '',
            mathLabel:     null,

            // Diagram
            inDiagram:          false,
            diagramType:        '',
            currentDiagram:     null,    // The DIAGRAM / GRAPH / SEQUENCE / etc. node
            currentEREntity:    null,    // ER entity under construction
            currentGanttSection: null,   // Gantt section under construction
            currentPeriod:      null,    // Timeline period under construction
            mindmapStack:       [],      // [{node, indent}] for mindmap hierarchy
            seqGroupStack:      [],      // Sequence loop/alt group stack

            // Multi-column layout (tracked separately from main stack)
            activeColumnLayout: null,
            currentColumn:      null,

            // Vector scene (artboard / group / layer nesting)
            vectorStack: [],             // stack of current vector container nodes

            // Accumulation buffers — cleared via .length = 0 (V8 fast-clear)
            mathBuf:  [],
            codeBuf:  [],
            textBuf:  [],
            listBuf:  [],
            tableBuf: [],
            frontBuf: [],
            quoteBuf: [],
            defBuf:   [],
        };

        /* ── Nesting stack machine ───────────────────────────────────────────────────── */
        this.stack      = [];   // Active open block nodes
        this.stackDepth = 0;
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §3  MAIN PARSE LOOP — O(N) single pass
    ───────────────────────────────────────────────────────────────────────────────────── */

    parse() {
        const tokens = this.tokenizer.tokenize();
        const len    = tokens.length;

        for (let i = 0; i < len; i++) {
            const t = tokens[i];

            /* ── §3.1  VERBATIM BLOCK FAST PATHS ────────────────────────────────────── */

            if (this.ctx.inMath) {
                if (t.type === TokenTypes.MATH_BLOCK_END) this._flushMath(t.line);
                else this.ctx.mathBuf.push(t.raw);
                continue;
            }

            if (this.ctx.inCode) {
                if (t.type === TokenTypes.CODE_BLOCK_END) this._flushCode(t.line);
                else this.ctx.codeBuf.push(t.raw);
                continue;
            }

            if (this.ctx.inFrontmatter) {
                if (t.type === TokenTypes.FRONTMATTER_END) this._flushFrontmatter(t.line);
                else this.ctx.frontBuf.push(t.raw);
                continue;
            }

            /* ── §3.2  DIAGRAM CONTENT ROUTING ─────────────────────────────────────── */

            if (this.ctx.inDiagram) {
                if (t.type === TokenTypes.DIAGRAM_END) {
                    this._closeDiagram(t.line);
                } else if (t.type === TokenTypes.BLANK) {
                    // Blanks inside diagrams are visual separators — ignore
                } else {
                    this._handleDiagramToken(t);
                }
                continue;
            }

            /* ── §3.3  O(1) TOKEN ROUTER ─────────────────────────────────────────────
               Grouped by domain for readability. Each group is tightly sequenced.
            ──────────────────────────────────────────────────────────────────────────── */
            this._routeToken(t);
        }

        /* Final buffer flush + unclosed block recovery */
        this._flushStandard();
        while (this.stackDepth > 0) this._closeStack();
        if (this.ctx.activeColumnLayout) this._closeColumnLayout();

        return this.fragmentMode ? this.ast : this._resolveAll();
    }

    /* ─────────────────────────────────────────────────────────────────────────────────────
       §4  TOKEN ROUTER
    ───────────────────────────────────────────────────────────────────────────────────── */

    _routeToken(t) {
        switch (t.type) {

            /* ══ CORE DOCUMENT ══════════════════════════════════════════════════════════ */

            case TokenTypes.BLANK:
                this._flushStandard();
                break;

            case TokenTypes.FRONTMATTER_START:
                this._flushStandard();
                this.ctx.inFrontmatter = true;
                break;

            case TokenTypes.COMMENT:
            case TokenTypes.BLOCK_COMMENT_START:
            case TokenTypes.BLOCK_COMMENT_END:
                // Comments are stripped from the output AST by default
                // (Could be preserved as COMMENT nodes if needed)
                break;

            case TokenTypes.IMPORT_STMT:
                this._flushStandard();
                this.ast.imports.push(ASTFactory.createImport(t.line, t.url, t.name));
                break;

            case TokenTypes.VARIABLE_DEF:
                this._flushStandard();
                this.ast.variables[t.key] = t.value;
                this._pushNode(ASTFactory.createVariable(t.line, t.key, t.value));
                break;

            case TokenTypes.THEME_VAR:
                this._flushStandard();
                this._pushNode(ASTFactory.createThemeToken(t.line, t.key, t.value));
                break;

            /* ══ §1  MARKDOWN & TYPOGRAPHY ══════════════════════════════════════════════ */

            case TokenTypes.HEADING:
                this._flushStandard();
                this._pushNode(ASTFactory.createHeading(t.line, t.level, t.text, null));
                break;

            case TokenTypes.HORIZONTAL_RULE:
                this._flushStandard();
                this._pushNode(ASTFactory.createHorizontalRule(t.line));
                break;

            case TokenTypes.TEXT:
                this._flushGroup('text');
                this.ctx.textBuf.push(t.value || t.raw);
                break;

            case TokenTypes.QUOTE:
                this._flushGroup('quote');
                this.ctx.quoteBuf.push(t.text || '');
                break;

            case TokenTypes.CALLOUT:
                this._flushStandard();
                this._pushNode(ASTFactory.createCallout(t.line, t.calloutType, t.text));
                break;

            /* ══ §1  LISTS ══════════════════════════════════════════════════════════════ */

            case TokenTypes.LIST_ITEM:
            case TokenTypes.CHECKLIST_ITEM:
            case TokenTypes.ORDERED_LIST_ITEM:
                this._flushGroup('list');
                this.ctx.listBuf.push(t);
                break;

            case TokenTypes.DEFINITION_TERM:
                this._flushGroup('def');
                this.ctx.defBuf.push({ term: t.text, def: null, line: t.line, flags: t.flags });
                break;

            case TokenTypes.DEFINITION_DEF: {
                this._flushGroup('def');
                const last = this.ctx.defBuf[this.ctx.defBuf.length - 1];
                if (last && last.def === null) {
                    last.def = t.text;
                } else {
                    this.ctx.defBuf.push({ term: '', def: t.text, line: t.line, flags: t.flags });
                }
                break;
            }

            /* ══ §1  TABLES ════════════════════════════════════════════════════════════ */

            case TokenTypes.TABLE_ROW:
            case TokenTypes.TABLE_DIVIDER:
                this._flushGroup('table');
                this.ctx.tableBuf.push(t);
                break;

            /* ══ §1  MEDIA & REFERENCES ════════════════════════════════════════════════ */

            case TokenTypes.EMBED:
                this._flushStandard();
                this._pushNode(ASTFactory.createEmbed(t.line, t.embedType, t.label, t.url, t.config));
                break;

            case TokenTypes.FOOTNOTE_DEF:
                this._flushStandard();
                {
                    const fn = ASTFactory.createFootnote(t.line, t.id, t.text);
                    this.ast.footnotes[t.id] = fn;
                }
                break;

            case TokenTypes.REFERENCE_DEF:
                this._flushStandard();
                this.ast.references[t.id] = t.url;
                break;

            case TokenTypes.TREE_BRANCH:
                this._flushStandard();
                this._pushNode(ASTFactory.createTreeBranch(t.line, t.prefix, t.text));
                break;

            /* ══ §2  MATH ═══════════════════════════════════════════════════════════════ */

            case TokenTypes.MATH_BLOCK_START:
                this._flushStandard();
                this.ctx.inMath    = true;
                this.ctx.mathConfig = t.config || '';
                this.ctx.mathLabel  = t.diagramType === 'math' ? (t.lang || null) : null;
                break;

            case TokenTypes.MATH_EQUATION:
                this._flushStandard();
                this._pushNode(ASTFactory.createMathEquation(t.line, t.id, t.value));
                break;

            /* ══ §2  CODE ════════════════════════════════════════════════════════════════ */

            case TokenTypes.CODE_BLOCK_START:
                this._flushStandard();
                this.ctx.inCode    = true;
                this.ctx.codeLang  = t.lang   || 'text';
                this.ctx.codeConfig = t.config || '';
                break;

            /* ══ §3  DIAGRAMS ════════════════════════════════════════════════════════════ */

            case TokenTypes.DIAGRAM_START:
                this._flushStandard();
                this._openDiagram(t);
                break;

            case TokenTypes.CHART:
                this._flushStandard();
                this._pushNode(ASTFactory.createChart(t.line, t.chartType, t.config));
                break;

            /* ══ §4  VECTORS & GRAPHICS ══════════════════════════════════════════════════ */

            case TokenTypes.VECTOR_ARTBOARD: {
                this._flushStandard();
                const ab = ASTFactory.createVectorArtboard(t.line, t.name,
                    t.value ? parseInt(t.value.split('x')[0], 10) : null,
                    t.value ? parseInt(t.value.split('x')[1], 10) : null);
                this.ast.vectors.push(ab);
                this.ctx.vectorStack.push(ab);
                break;
            }

            case TokenTypes.VECTOR_LAYER: {
                this._flushStandard();
                const vl = ASTFactory.createVectorLayer(t.line, t.name, t.trait);
                this._pushToVectorContainer(vl);
                this.ctx.vectorStack.push(vl);
                break;
            }

            case TokenTypes.VECTOR_GROUP_START: {
                this._flushStandard();
                const vg = ASTFactory.createVectorGroup(t.line, t.name);
                this._pushToVectorContainer(vg);
                this.ctx.vectorStack.push(vg);
                break;
            }

            case TokenTypes.VECTOR_GROUP_END:
                this._flushStandard();
                if (this.ctx.vectorStack.length > 0) this.ctx.vectorStack.pop();
                break;

            case TokenTypes.VECTOR_SHAPE: {
                const vs = ASTFactory.createVectorShape(t.line, t.vectorType, t.vectorData);
                this._pushToVectorContainer(vs);
                break;
            }

            case TokenTypes.VECTOR_PATH: {
                const vp = ASTFactory.createVectorPath(t.line, t.vectorData);
                this._pushToVectorContainer(vp);
                break;
            }

            /* ══ §3  LEGACY SPATIAL CONNECTORS ══════════════════════════════════════════ */

            case TokenTypes.SHAPE:
                this._flushStandard();
                this._pushNode(ASTFactory.createShape(t.line, t.id, t.label, t.trait,
                    this._inferShapeType(t.raw)));
                break;

            case TokenTypes.EDGE:
                this._flushStandard();
                this.ast.edges.push(ASTFactory.createEdge(t.line, t.operator, t.label,
                    null, null, t.target));
                break;

            case TokenTypes.PORT_DEF:
                this._flushStandard();
                this._pushNode({ type: ZOLTONodeTypes.PORT_DEF, line: t.line, name: t.name });
                break;

            /* ══ §5  SPATIAL LAYOUT ══════════════════════════════════════════════════════ */

            case TokenTypes.DIRECTIVE_START:
                this._flushStandard();
                this._handleDirectiveOpen(t);
                break;

            case TokenTypes.DIRECTIVE_END:
                this._flushStandard();
                this._handleDirectiveClose(t);
                break;

            case TokenTypes.COLUMN_BREAK:
                this._flushStandard();
                if (this.ctx.activeColumnLayout) {
                    const newCol = ASTFactory.createColumn(t.line);
                    this.ctx.activeColumnLayout.columns.push(newCol);
                    this.ctx.currentColumn = newCol;
                }
                // Outside a column layout: treat as a thematic break
                else this._pushNode(ASTFactory.createHorizontalRule(t.line));
                break;

            /* ══ §6  COMPONENT & TEMPLATE SYSTEM ════════════════════════════════════════ */

            case TokenTypes.COMPONENT_USE:
                this._flushStandard();
                if (t.raw && t.raw.trimEnd().endsWith('/>')) {
                    // Self-closing component
                    this._pushNode(ASTFactory.createComponentUse(t.line, t.componentName, t.props));
                } else {
                    this._openStack(ASTFactory.createComponentUse(t.line, t.componentName, t.props));
                }
                break;

            case TokenTypes.SLOT_DEF:
                this._flushStandard();
                this._openStack(ASTFactory.createSlotDef(t.line, t.slotName));
                break;

            case TokenTypes.TEMPLATE_START:
                this._flushStandard();
                this._openStack(ASTFactory.createTemplateDef(t.line, t.name, t.params));
                break;

            case TokenTypes.TEMPLATE_END:
                this._flushStandard();
                // Pop the template off the stack and register it as a component
                if (this.stackDepth > 0) {
                    const tmpl = this.stack[this.stackDepth - 1];
                    if (tmpl.type === ZOLTONodeTypes.TEMPLATE_DEF) {
                        this._closeStack();
                        this.ast.components.push(tmpl);
                        return; // already pushed via closeStack, don't double-push
                    }
                }
                this._closeStack();
                break;

            case TokenTypes.MACRO_DEF:
                this._flushStandard();
                this._pushNode(ASTFactory.createMacroDef(t.line, t.name, t.params));
                break;

            case TokenTypes.ANIMATION_DEF:
                this._flushStandard();
                this._pushNode(ASTFactory.createAnimation(t.line, t.name, t.args, t.config));
                break;

            /* ══ EXTENDED MARKDOWN BLOCKS ════════════════════════════════════════════════ */

            case TokenTypes.MD_BLOCK_START:
                this._flushStandard();
                this._handleMDBlockOpen(t);
                break;

            case TokenTypes.MD_BLOCK_END:
                this._flushStandard();
                this._handleMDBlockClose(t);
                break;

            /* ── RAW_LINE outside any tracked context → treat as plain text ─────────── */
            case TokenTypes.RAW_LINE:
                if (t.value && t.value.trim()) {
                    this._flushGroup('text');
                    this.ctx.textBuf.push(t.value);
                }
                break;

            default:
                break;
        }
    }

    /* =========================================================================================
       §5  DIRECTIVE OPEN/CLOSE (Spatial Layout)
       ========================================================================================= */

    _handleDirectiveOpen(t) {
        const d  = (t.directive || '').toLowerCase();
        const args = t.args || '';

        if (d === 'artboard') {
            this._openStack(ASTFactory.createArtboard(t.line, args, t.config));

        } else if (d === 'canvas') {
            this._openStack(ASTFactory.createCanvas(t.line, null, null, true));

        } else if (d === 'whiteboard') {
            this._openStack(ASTFactory.createWhiteboard(t.line, t.config));

        } else if (d === 'presentation') {
            this._openStack(ASTFactory.createPresentation(t.line, t.config));

        } else if (d === 'slide') {
            this._openStack(ASTFactory.createSlide(t.line, args, t.config));

        } else if (d === 'panel') {
            this._openStack(ASTFactory.createPanel(t.line, args || null, t.config));

        } else if (d === 'layer') {
            this._openStack(ASTFactory.createLayer(t.line, args, t.config));

        } else if (d === 'split' || d === 'split-view' || d === 'split-vertical') {
            this._openStack(ASTFactory.createSplitView(t.line,
                d.includes('vertical') ? 'vertical' : 'horizontal', t.config));

        } else if (d === 'component') {
            this._openStack(ASTFactory.createComponentDef(t.line, args, null));

        } else if (d === 'template') {
            this._openStack(ASTFactory.createTemplateDef(t.line, args, null));

        } else if (d.startsWith('column') || d.startsWith('col')) {
            const count = parseInt(d.replace(/\D/g, '') || args || '2', 10);
            this._openColumnLayout(t.line, isNaN(count) ? 2 : count);

        } else if (d.startsWith('grid')) {
            const cols = parseInt(d.replace(/\D/g, '') || args || '3', 10);
            this._openStack(ASTFactory.createGridLayout(t.line, isNaN(cols) ? 3 : cols, null, t.config));

        } else if (d.startsWith('flex')) {
            const dir = d.includes('row') ? 'row' : 'col';
            this._openStack(ASTFactory.createFlexLayout(t.line, dir, d.includes('wrap'), t.config));

        } else if (d === 'masonry') {
            this._openStack(ASTFactory.createLayoutBlock(t.line, 'masonry', t.config));

        } else {
            // Generic @directive → LayoutBlock fallback
            this._openStack(ASTFactory.createLayoutBlock(t.line, d || 'block', args));
        }
    }

    _handleDirectiveClose(t) {
        // Column layout special close
        if (this.ctx.activeColumnLayout) {
            this._closeColumnLayout();
            return;
        }
        // Template registration on close
        if (this.stackDepth > 0) {
            const top = this.stack[this.stackDepth - 1];
            if (top.type === ZOLTONodeTypes.TEMPLATE_DEF ||
                top.type === ZOLTONodeTypes.COMPONENT_DEF) {
                const node = this.stack.pop();
                this.stackDepth--;
                this.ast.components.push(node);
                return;
            }
        }
        this._closeStack();
    }

    /* =========================================================================================
       §6  EXTENDED MARKDOWN BLOCK OPEN/CLOSE (:::type ... :::)
       ========================================================================================= */

    _handleMDBlockOpen(t) {
        const bt = (t.blockType || '').toLowerCase();
        const params = t.params || '';

        /* ── Tabs ────────────────────────────────────────────────────────────────────── */
        if (bt === 'tab') {
            // If a TAB is already open (sibling tab), close it first
            const top = this._topOfStack();
            if (top && top.type === ZOLTONodeTypes.TAB) {
                const tab = this.stack.pop();
                this.stackDepth--;
                // Tab already in TAB_GROUP.tabs via _openStack → it gets pushed on _closeStack
                // But we popped without calling _pushNode → need to add manually
                const parent = this._topOfStack();
                if (parent && parent.tabs) parent.tabs.push(tab);
                else if (parent && parent.children) parent.children.push(tab);
            }
            // Auto-create TAB_GROUP if not on stack
            const groupTop = this._topOfStack();
            if (!groupTop || groupTop.type !== ZOLTONodeTypes.TAB_GROUP) {
                this._openStack(ASTFactory.createTabGroup(t.line));
            }
            this._openStack(ASTFactory.createTab(t.line, params || 'Tab'));
            return;
        }

        if (bt === 'tabs') {
            this._openStack(ASTFactory.createTabGroup(t.line));
            return;
        }

        /* ── Cards ───────────────────────────────────────────────────────────────────── */
        if (bt === 'card') {
            // Detect card group context
            const top = this._topOfStack();
            if (!top || top.type !== ZOLTONodeTypes.CARD_GROUP) {
                this._openStack(ASTFactory.createCardGroup(t.line, 3));
            }
            this._openStack(ASTFactory.createCard(t.line, params || ''));
            return;
        }

        if (bt === 'cards') {
            const cols = parseInt(params || '3', 10);
            this._openStack(ASTFactory.createCardGroup(t.line, isNaN(cols) ? 3 : cols));
            return;
        }

        /* ── Steps ───────────────────────────────────────────────────────────────────── */
        if (bt === 'steps') {
            this._openStack(ASTFactory.createSteps(t.line));
            return;
        }

        if (bt === 'step') {
            const top = this._topOfStack();
            if (!top || top.type !== ZOLTONodeTypes.STEPS) {
                this._openStack(ASTFactory.createSteps(t.line));
            }
            const stepNum = (this._topOfStack().children || []).length + 1;
            this._openStack(ASTFactory.createStep(t.line, stepNum, params));
            return;
        }

        /* ── Accordion ───────────────────────────────────────────────────────────────── */
        if (bt === 'accordion') {
            this._openStack(ASTFactory.createAccordion(t.line, params, false));
            return;
        }

        /* ── Details / Spoiler ───────────────────────────────────────────────────────── */
        if (bt === 'details' || bt === 'spoiler') {
            this._openStack(ASTFactory.createDetails(t.line, params || 'Details', false));
            return;
        }

        /* ── Column Layout ───────────────────────────────────────────────────────────── */
        if (bt.startsWith('column') || bt.startsWith('col')) {
            const count = parseInt(bt.replace(/\D/g, '') || params || '2', 10);
            this._openColumnLayout(t.line, isNaN(count) ? 2 : count);
            return;
        }

        /* ── Quote block ─────────────────────────────────────────────────────────────── */
        if (bt === 'quote' || bt === 'blockquote') {
            this._openStack(ASTFactory.createQuote(t.line, params));
            return;
        }

        /* ── API docs structures ─────────────────────────────────────────────────────── */
        if (bt === 'api' || bt === 'param' || bt === 'return' || bt === 'throws') {
            this._openStack(ASTFactory.createAdmonition(t.line, bt, params));
            return;
        }

        /* ── Default → Admonition/Callout block ──────────────────────────────────────── */
        this._openStack(ASTFactory.createAdmonition(t.line, bt || 'info', params));
    }

    _handleMDBlockClose(_t) {
        // If a TAB is on top but so is a TAB_GROUP below, closing the TAB
        // also closes the TAB_GROUP (user writes ::: only once for the pair).
        const top = this._topOfStack();

        if (top && top.type === ZOLTONodeTypes.TAB) {
            this._closeStack();   // close TAB, push to TAB_GROUP
            // Close TAB_GROUP as well
            const newTop = this._topOfStack();
            if (newTop && newTop.type === ZOLTONodeTypes.TAB_GROUP) {
                this._closeStack();
            }
            return;
        }

        // Column layout close
        if (this.ctx.activeColumnLayout) {
            this._closeColumnLayout();
            return;
        }

        this._closeStack();
    }

    /* =========================================================================================
       §7  DIAGRAM OPEN / CLOSE / CONTENT
       ========================================================================================= */

    _openDiagram(t) {
        const dtype = (t.diagramType || 'flowchart').toLowerCase();
        let node;

        switch (dtype) {
            case 'sequence':
            case 'sequencediagram':
            case 'seq':
                node = ASTFactory.createSequence(t.line, t.name);
                break;
            case 'statechart':
            case 'state':
            case 'statemachine':
                node = ASTFactory.createStateMachine(t.line, t.name);
                break;
            case 'erd':
            case 'entityrelationship':
            case 'erdiagram':
                node = ASTFactory.createERDiagram(t.line, t.name);
                break;
            case 'mindmap':
            case 'mind':
                node = ASTFactory.createMindmap(t.line, null);
                this.ctx.mindmapStack = [];
                break;
            case 'gantt':
                node = ASTFactory.createGantt(t.line, t.name || '', '');
                break;
            case 'timeline':
                node = ASTFactory.createTimeline(t.line, t.name || '');
                break;
            case 'flowchart':
            case 'flow':
            case 'graph':
            case 'digraph':
                node = ASTFactory.createGraph(t.line, t.dir || 'LR', t.name);
                break;
            default:
                // Generic diagram container for network, architecture, dependency, etc.
                node = ASTFactory.createDiagram(t.line,
                    (dtype || 'flowchart').toUpperCase(),
                    t.name, t.dir, t.config);
        }

        this.ctx.inDiagram      = true;
        this.ctx.diagramType    = dtype;
        this.ctx.currentDiagram = node;
        this.ctx.currentEREntity    = null;
        this.ctx.currentGanttSection = null;
        this.ctx.currentPeriod  = null;
        this.ctx.seqGroupStack  = [];
        this.ctx.mindmapStack   = [];

        // Push diagram to regular output so it can be nested in layouts
        this._pushNode(node);
    }

    _closeDiagram(line) {
        this.ctx.inDiagram      = false;
        this.ctx.diagramType    = '';
        this.ctx.currentDiagram = null;
        this.ctx.currentEREntity = null;
        this.ctx.currentGanttSection = null;
        this.ctx.currentPeriod  = null;
        this.ctx.seqGroupStack  = [];
        this.ctx.mindmapStack   = [];
    }

    /**
     * Route a token to the correct diagram sub-parser.
     */
    _handleDiagramToken(t) {
        const dtype = this.ctx.diagramType;

        if (dtype === 'flowchart' || dtype === 'flow' ||
            dtype === 'graph'     || dtype === 'digraph') {
            this._handleFlowchartToken(t);
        } else if (dtype === 'sequence' || dtype === 'sequencediagram' || dtype === 'seq') {
            this._handleSequenceToken(t);
        } else if (dtype === 'statechart' || dtype === 'state' || dtype === 'statemachine') {
            this._handleStateToken(t);
        } else if (dtype === 'erd' || dtype === 'entityrelationship' || dtype === 'erdiagram') {
            this._handleERToken(t);
        } else if (dtype === 'mindmap' || dtype === 'mind') {
            this._handleMindmapToken(t);
        } else if (dtype === 'gantt') {
            this._handleGanttToken(t);
        } else if (dtype === 'timeline') {
            this._handleTimelineToken(t);
        } else {
            // Generic: accumulate graph nodes and edges
            this._handleGenericDiagramToken(t);
        }
    }

    /* ── §7a  FLOWCHART / GRAPH ──────────────────────────────────────────────────────── */

    _handleFlowchartToken(t) {
        const diagram = this.ctx.currentDiagram;
        if (!diagram) return;

        switch (t.type) {
            case TokenTypes.GRAPH_NODE: {
                const node = ASTFactory.createGraphNode(t.line, t.id, t.label, t.kind, t.cssClass);
                // Route to current subgraph if one is active, else to root diagram
                const target = this._currentSubgraph() || diagram;
                (target.nodes || target.children || []).push(node);
                break;
            }
            case TokenTypes.GRAPH_EDGE: {
                const edge = ASTFactory.createGraphEdge(t.line, t.from, t.to, t.operator, t.edgeLabel);
                const target = this._currentSubgraph() || diagram;
                (target.edges || []).push(edge);
                break;
            }
            case TokenTypes.GRAPH_SUBGRAPH_START: {
                const sg = ASTFactory.createGraphSubgraph(t.line, t.id, t.label);
                const parent = this._currentSubgraph() || diagram;
                (parent.groups || parent.nodes || []).push(sg);
                this._diagramSubgraphStack = this._diagramSubgraphStack || [];
                this._diagramSubgraphStack.push(sg);
                break;
            }
            case TokenTypes.GRAPH_SUBGRAPH_END:
                if (this._diagramSubgraphStack && this._diagramSubgraphStack.length > 0) {
                    this._diagramSubgraphStack.pop();
                }
                break;
            case TokenTypes.GRAPH_CLASS_DEF:
                if (!diagram.styles) diagram.styles = {};
                diagram.styles[t.name] = t.config;
                break;
            case TokenTypes.GRAPH_STYLE:
                // Apply style to a named node
                if (!diagram.styles) diagram.styles = {};
                diagram.styles[`@${t.id}`] = t.config;
                break;
            case TokenTypes.RAW_LINE:
                // Ignore raw lines inside diagram (comments, blank lines caught earlier)
                break;
            default:
                break;
        }
    }

    _currentSubgraph() {
        const stack = this._diagramSubgraphStack;
        return (stack && stack.length > 0) ? stack[stack.length - 1] : null;
    }

    /* ── §7b  SEQUENCE DIAGRAM ───────────────────────────────────────────────────────── */

    _handleSequenceToken(t) {
        const seq = this.ctx.currentDiagram;
        if (!seq) return;
        const groupStack = this.ctx.seqGroupStack;

        switch (t.type) {
            case TokenTypes.SEQUENCE_ACTOR: {
                const actor = ASTFactory.createSequenceActor(t.line, t.id, t.alias, t.kind);
                actor.order = seq.actors.length;
                seq.actors.push(actor);
                break;
            }
            case TokenTypes.SEQUENCE_MSG: {
                const msg = ASTFactory.createSequenceMessage(t.line, t.from, t.to, t.operator, t.text);
                msg.flags = t.flags || 0;
                const target = groupStack.length > 0
                    ? groupStack[groupStack.length - 1].children
                    : seq.messages;
                target.push(msg);
                break;
            }
            case TokenTypes.SEQUENCE_NOTE: {
                const note = ASTFactory.createSequenceNote(t.line, t.kind, t.id, t.text);
                seq.notes.push(note);
                break;
            }
            case TokenTypes.SEQUENCE_LOOP: {
                const grp = ASTFactory.createSequenceGroup(t.line, t.kind, t.text);
                if (groupStack.length > 0) {
                    groupStack[groupStack.length - 1].children.push(grp);
                } else {
                    seq.groups.push(grp);
                }
                groupStack.push(grp);
                break;
            }
            case TokenTypes.SEQUENCE_LOOP_END:
                if (groupStack.length > 0) groupStack.pop();
                break;
            case TokenTypes.SEQUENCE_ACTIVATE:
                // Activation/deactivation markers — stored as metadata on actor
                {
                    const actor = seq.actors.find(a => a.id === t.id);
                    if (actor) actor.active = t.kind === 'activate';
                }
                break;
            default:
                break;
        }
    }

    /* ── §7c  STATE MACHINE ─────────────────────────────────────────────────────────── */

    _handleStateToken(t) {
        const fsm = this.ctx.currentDiagram;
        if (!fsm) return;

        switch (t.type) {
            case TokenTypes.STATE_DEF: {
                const s = ASTFactory.createStateNode(t.line, t.id, t.text, t.kind || 'normal');
                if (t.id === '[*]') { s.kind = 'start'; fsm.initial = s.id; }
                fsm.states.push(s);
                break;
            }
            case TokenTypes.STATE_TRANS: {
                const tr = ASTFactory.createStateTransition(t.line, t.from, t.to, t.config, null);
                tr.event = t.edgeLabel;
                fsm.transitions.push(tr);
                // Track initial/final states
                if (t.from === '[*]') fsm.initial = t.to;
                if (t.to   === '[*]') fsm.final.push(t.from);
                break;
            }
            case TokenTypes.STATE_NOTE: {
                const note = ASTFactory.createStateNote(t.line, t.kind, t.id, t.text);
                fsm.notes.push(note);
                break;
            }
            default:
                break;
        }
    }

    /* ── §7d  ER DIAGRAM ────────────────────────────────────────────────────────────── */

    _handleERToken(t) {
        const erd = this.ctx.currentDiagram;
        if (!erd) return;

        switch (t.type) {
            case TokenTypes.ER_ENTITY: {
                const entity = ASTFactory.createEREntity(t.line, t.name);
                erd.entities.push(entity);
                this.ctx.currentEREntity = entity;
                break;
            }
            case TokenTypes.ER_ATTR: {
                if (this.ctx.currentEREntity) {
                    this.ctx.currentEREntity.attributes.push(
                        ASTFactory.createERAttribute(t.line, t.attrType, t.attrName, t.attrKey, t.attrComment)
                    );
                }
                break;
            }
            case TokenTypes.ER_RELATION: {
                const rel = ASTFactory.createERRelation(t.line, t.from, t.to, t.operator, t.edgeLabel);
                erd.relations.push(rel);
                this.ctx.currentEREntity = null; // Relations close any open entity
                break;
            }
            case TokenTypes.RAW_LINE:
                // '}'.raw → close current entity
                if (t.value && t.value.trim() === '}') this.ctx.currentEREntity = null;
                break;
            default:
                break;
        }
    }

    /* ── §7e  MINDMAP ───────────────────────────────────────────────────────────────── */

    _handleMindmapToken(t) {
        const mm  = this.ctx.currentDiagram;
        const stk = this.ctx.mindmapStack;
        if (!mm) return;

        if (t.type !== TokenTypes.MINDMAP_NODE && t.type !== TokenTypes.RAW_LINE) return;
        if (t.type === TokenTypes.RAW_LINE) return;

        const indent = t.indent || 0;
        const node   = ASTFactory.createMindmapNode(t.line, indent, t.bullet, t.text);

        if (!mm.root || t.kind === 'root') {
            mm.root = node;
            stk.length = 0;
            stk.push({ node, indent });
            return;
        }

        // Pop stack to find the right parent level
        while (stk.length > 1 && indent <= stk[stk.length - 1].indent) stk.pop();

        const parent = stk[stk.length - 1];
        if (parent) parent.node.children.push(node);
        stk.push({ node, indent });
    }

    /* ── §7f  GANTT ─────────────────────────────────────────────────────────────────── */

    _handleGanttToken(t) {
        const gantt = this.ctx.currentDiagram;
        if (!gantt) return;

        switch (t.type) {
            case TokenTypes.GANTT_SECTION: {
                const sec = ASTFactory.createGanttSection(t.line, t.text);
                gantt.sections.push(sec);
                this.ctx.currentGanttSection = sec;
                break;
            }
            case TokenTypes.GANTT_TASK: {
                const task = ASTFactory.createGanttTask(
                    t.line, t.text, t.id, t.modifier, t.value, t.config);
                const target = this.ctx.currentGanttSection || gantt;
                (target.tasks || target.sections || []).push(task);
                break;
            }
            case TokenTypes.RAW_LINE:
                // title: / dateFormat: / axisFormat: raw directives
                if (t.kind === 'title') gantt.title = t.value;
                break;
            default:
                break;
        }
    }

    /* ── §7g  TIMELINE ─────────────────────────────────────────────────────────────── */

    _handleTimelineToken(t) {
        const tl = this.ctx.currentDiagram;
        if (!tl) return;

        switch (t.type) {
            case TokenTypes.TIMELINE_PERIOD: {
                const period = ASTFactory.createTimelinePeriod(t.line, t.period);
                tl.periods.push(period);
                this.ctx.currentPeriod = period;
                break;
            }
            case TokenTypes.TIMELINE_EVENT: {
                const event = ASTFactory.createTimelineEvent(t.line, t.text, t.label);
                const target = this.ctx.currentPeriod || tl;
                (target.events || []).push(event);
                break;
            }
            case TokenTypes.RAW_LINE:
                if (t.kind === 'title') tl.title = t.value;
                break;
            default:
                break;
        }
    }

    /* ── §7h  GENERIC DIAGRAM (network, architecture, dependency, etc.) ──────────────── */

    _handleGenericDiagramToken(t) {
        const diagram = this.ctx.currentDiagram;
        if (!diagram) return;

        if (t.type === TokenTypes.GRAPH_NODE) {
            const n = ASTFactory.createGraphNode(t.line, t.id, t.label, t.kind, t.cssClass);
            (diagram.nodes || []).push(n);
        } else if (t.type === TokenTypes.GRAPH_EDGE) {
            const e = ASTFactory.createGraphEdge(t.line, t.from, t.to, t.operator, t.edgeLabel);
            (diagram.edges || []).push(e);
        }
        // All other sub-tokens accumulate silently for future-proofing
    }

    /* =========================================================================================
       §8  BUFFER FLUSHERS — V8 arena-style: .length = 0 for fast-clear
       ========================================================================================= */

    /**
     * Flush ALL active buffers (called on BLANK and before major structural tokens).
     */
    _flushStandard() {
        if (this.ctx.textBuf.length  > 0) this._flushText();
        if (this.ctx.listBuf.length  > 0) this._flushList();
        if (this.ctx.tableBuf.length > 0) this._flushTable();
        if (this.ctx.quoteBuf.length > 0) this._flushQuote();
        if (this.ctx.defBuf.length   > 0) this._flushDefinitionList();
    }

    /**
     * Flush everything EXCEPT the specified active buffer type.
     * Avoids premature flushing while accumulating consecutive tokens of the same type.
     */
    _flushGroup(keep) {
        if (keep !== 'text'  && this.ctx.textBuf.length  > 0) this._flushText();
        if (keep !== 'list'  && this.ctx.listBuf.length  > 0) this._flushList();
        if (keep !== 'table' && this.ctx.tableBuf.length > 0) this._flushTable();
        if (keep !== 'quote' && this.ctx.quoteBuf.length > 0) this._flushQuote();
        if (keep !== 'def'   && this.ctx.defBuf.length   > 0) this._flushDefinitionList();
    }

    _flushText() {
        const text = this.ctx.textBuf.join('\n').trim();
        if (text) this._pushNode(ASTFactory.createParagraph(-1, text));
        this.ctx.textBuf.length = 0;
    }

    /**
     * Enhanced list flusher with full nesting support (ordered, unordered, checklist).
     * Uses an indent-aware stack to build a nested tree in O(N).
     */
    _flushList() {
        const buf = this.ctx.listBuf;
        if (!buf.length) return;

        const firstTok = buf[0];
        const rootIsOrdered = firstTok.type === TokenTypes.ORDERED_LIST_ITEM;
        const root = ASTFactory.createList(firstTok.line, rootIsOrdered);

        // Stack entries: { list, indent }
        const listStack = [{ list: root, indent: -1 }];

        for (let i = 0; i < buf.length; i++) {
            const tok       = buf[i];
            const isOrdered  = tok.type === TokenTypes.ORDERED_LIST_ITEM;
            const isChecklist = tok.type === TokenTypes.CHECKLIST_ITEM;
            const indent     = tok.indent || 0;

            // Build the item node
            let item;
            if (isOrdered) {
                item = ASTFactory.createOrderedListItem(tok.line, indent, tok.number || (i + 1),
                    tok.modifier || '.', tok.text || '');
            } else {
                item = ASTFactory.createListItem(tok.line, indent, tok.bullet || '-',
                    tok.text || '', isChecklist, tok.checked || false);
                if (isChecklist) item.modifier = tok.modifier || ' ';
            }
            item.flags = tok.flags || 0;

            // Find the correct nesting level: pop until we find parent with smaller indent
            while (listStack.length > 1 &&
                   indent <= listStack[listStack.length - 1].indent) {
                listStack.pop();
            }

            const top = listStack[listStack.length - 1];

            // If this item is deeper, nest it in the last item of current list
            if (top.list.items.length > 0 && indent > top.indent) {
                const lastItem = top.list.items[top.list.items.length - 1];
                // Find or create a child list on the last item
                let childList = lastItem.children.find(n =>
                    n.type === ZOLTONodeTypes.LIST ||
                    n.type === ZOLTONodeTypes.ORDERED_LIST);
                if (!childList) {
                    childList = ASTFactory.createList(tok.line, isOrdered);
                    lastItem.children.push(childList);
                }
                childList.items.push(item);
                listStack.push({ list: childList, indent });
            } else {
                top.list.items.push(item);
            }
        }

        this._pushNode(root);
        buf.length = 0;
    }

    /**
     * Table flusher with full alignment + caption support.
     */
    _flushTable() {
        const buf = this.ctx.tableBuf;
        if (!buf.length) return;

        const table = ASTFactory.createTable(buf[0].line);
        let headerDone = false;

        for (let i = 0; i < buf.length; i++) {
            const tok = buf[i];

            if (tok.type === TokenTypes.TABLE_DIVIDER) {
                // Parse column alignments from |:---|:---:|---:|
                const cells = tok.raw.split('|').slice(1, -1);
                table.alignments = cells.map(c => {
                    const s = c.trim();
                    if (s.startsWith(':') && s.endsWith(':')) return 'center';
                    if (s.endsWith(':'))                       return 'right';
                    return 'left';
                });
                headerDone = true;

            } else if (!headerDone) {
                // First non-divider row = headers
                table.headers = (tok.content || '').split('|').map(s => s.trim()).filter(Boolean);

            } else {
                // Data row
                const cells = (tok.content || '').split('|').map(s => s.trim());
                table.rows.push(cells);
            }
        }

        this._pushNode(table);
        buf.length = 0;
    }

    _flushQuote(line) {
        const buf = this.ctx.quoteBuf;
        if (!buf.length) return;
        const text  = buf.join('\n');
        const node  = ASTFactory.createQuote(line != null ? line : -1, text);
        this._pushNode(node);
        buf.length = 0;
    }

    _flushDefinitionList() {
        const buf = this.ctx.defBuf;
        if (!buf.length) return;
        const list = ASTFactory.createDefinitionList(buf[0].line);
        for (let i = 0; i < buf.length; i++) {
            const { term, def, line } = buf[i];
            const item = ASTFactory.createDefinitionItem(line, term || '', def || '');
            list.items.push(item);
        }
        this._pushNode(list);
        buf.length = 0;
    }

    _flushCode(line) {
        this.ctx.inCode = false;
        const content = this.ctx.codeBuf.join('\n');
        this._pushNode(ASTFactory.createCodeBlock(line, this.ctx.codeLang,
            this.ctx.codeConfig, content));
        this.ctx.codeBuf.length = 0;
    }

    _flushMath(line) {
        this.ctx.inMath = false;
        const content = this.ctx.mathBuf.join('\n');
        const node    = ASTFactory.createMathBlock(line, this.ctx.mathConfig, content);
        if (this.ctx.mathLabel) {
            node.label    = this.ctx.mathLabel;
            node.numbered = true;
        }
        this._pushNode(node);
        this.ctx.mathBuf.length = 0;
        this.ctx.mathLabel      = null;
    }

    _flushFrontmatter(line) {
        this.ctx.inFrontmatter = false;
        const raw = this.ctx.frontBuf.join('\n');
        this.ast.frontmatter = ASTFactory.createFrontmatter(line, raw);
        this.ctx.frontBuf.length = 0;
    }

    /* =========================================================================================
       §9  COLUMN LAYOUT (separate from main stack)
       ========================================================================================= */

    _openColumnLayout(line, count) {
        const layout = ASTFactory.createColumnLayout(line, count);
        const firstCol = ASTFactory.createColumn(line);
        layout.columns.push(firstCol);
        this.ctx.activeColumnLayout = layout;
        this.ctx.currentColumn      = firstCol;
    }

    _closeColumnLayout() {
        const layout = this.ctx.activeColumnLayout;
        this.ctx.activeColumnLayout = null;
        this.ctx.currentColumn      = null;
        if (layout) this._pushNodeDirect(layout);
    }

    /* =========================================================================================
       §10  STACK MACHINE — high-performance infinite nesting
       ========================================================================================= */

    _openStack(node) {
        this.stack.push(node);
        this.stackDepth++;
    }

    _closeStack() {
        if (!this.stackDepth) return;
        const node = this.stack.pop();
        this.stackDepth--;
        this._pushNode(node);
    }

    _topOfStack() {
        return this.stackDepth > 0 ? this.stack[this.stackDepth - 1] : null;
    }

    /**
     * Route a node to the correct parent container.
     * Priority: stack > column layout > root document
     */
    _pushNode(node) {
        if (this.stackDepth > 0) {
            const parent = this.stack[this.stackDepth - 1];
            // Try all known container arrays in specificity order
            if (parent.children !== undefined)  { parent.children.push(node);  return; }
            if (parent.tabs     !== undefined)  { parent.tabs.push(node);      return; }
            if (parent.layers   !== undefined)  { parent.layers.push(node);    return; }
            if (parent.nodes    !== undefined)  { parent.nodes.push(node);     return; }
            if (parent.items    !== undefined)  { parent.items.push(node);     return; }
            if (parent.cards    !== undefined)  { parent.cards.push(node);     return; }
            if (parent.slides   !== undefined)  { parent.slides.push(node);    return; }
            if (parent.panes    !== undefined)  { parent.panes.push(node);     return; }
        }
        if (this.ctx.currentColumn) {
            this.ctx.currentColumn.children.push(node);
            return;
        }
        this.ast.nodes.push(node);
    }

    /** Push directly to root/parent — bypasses column layout routing. */
    _pushNodeDirect(node) {
        if (this.stackDepth > 0) {
            const parent = this.stack[this.stackDepth - 1];
            const arr = parent.children ?? parent.layers ?? parent.nodes ?? null;
            if (arr) { arr.push(node); return; }
        }
        this.ast.nodes.push(node);
    }

    /** Push a vector element to the active vector container (scene/layer/group). */
    _pushToVectorContainer(node) {
        const stk = this.ctx.vectorStack;
        if (stk.length > 0) {
            const top = stk[stk.length - 1];
            const arr = top.children ?? top.layers ?? null;
            if (arr) { arr.push(node); return; }
        }
        this.ast.vectors.push(node);
    }

    /* =========================================================================================
       §11  RESOLUTION PHASE — post-parse semantic enrichment
       ========================================================================================= */

    _resolveAll() {
        this._resolveFrontmatter();
        this._resolveReferences();
        this._resolveFootnotes();
        this._resolveMathNumbers();
        this._resolveEdges();
        this._resolveInline(this.ast.nodes);
        this._resolveComponentProps(this.ast.nodes);
        return this.ast;
    }

    /* ── §11a  FRONTMATTER — simple YAML reader ─────────────────────────────────────── */

    _resolveFrontmatter() {
        if (!this.ast.frontmatter) return;
        const raw = this.ast.frontmatter.rawConfig;
        this.ast.frontmatter.parsedMeta = this._parseYAML(raw);
        // Merge top-level meta into document.meta
        Object.assign(this.ast.meta, this.ast.frontmatter.parsedMeta);
    }

    _parseYAML(raw) {
        const meta = {};
        if (!raw) return meta;
        const lines = raw.split('\n');
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const kv   = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
            if (!kv) { i++; continue; }

            const key   = kv[1];
            let   value = kv[2].trim();

            // Array (inline): key: [a, b, c]
            if (value.startsWith('[') && value.endsWith(']')) {
                meta[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
                i++; continue;
            }

            // Multi-line list: key:\n  - item
            if (value === '' && i + 1 < lines.length && lines[i + 1].match(/^\s+-\s/)) {
                const items = [];
                i++;
                while (i < lines.length && lines[i].match(/^\s+-\s/)) {
                    items.push(lines[i].replace(/^\s+-\s/, '').trim());
                    i++;
                }
                meta[key] = items;
                continue;
            }

            // Boolean
            if (value === 'true')  { meta[key] = true;  i++; continue; }
            if (value === 'false') { meta[key] = false; i++; continue; }
            if (value === 'null' || value === '~') { meta[key] = null; i++; continue; }

            // Number
            if (/^-?\d+(\.\d+)?$/.test(value)) {
                meta[key] = Number(value); i++; continue;
            }

            // Quoted string
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                meta[key] = value.slice(1, -1); i++; continue;
            }

            meta[key] = value || null;
            i++;
        }
        return meta;
    }

    /* ── §11b  REFERENCE & FOOTNOTE RESOLUTION ──────────────────────────────────────── */

    _resolveReferences() {
        // Already populated into this.ast.references during parse
    }

    _resolveFootnotes() {
        // Assign sequential numbers to footnotes
        let num = 1;
        for (const id in this.ast.footnotes) {
            this.ast.footnotes[id].number = num++;
        }
    }

    /* ── §11c  MATH EQUATION NUMBERING ─────────────────────────────────────────────── */

    _resolveMathNumbers() {
        let counter = 1;
        const walkForMath = (nodes) => {
            if (!nodes || !nodes.length) return;
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (n.type === ZOLTONodeTypes.MATH_EQUATION && n.label) {
                    n.number = counter;
                    this.ast.mathIndex[n.label] = counter++;
                }
                if (n.type === ZOLTONodeTypes.MATH_BLOCK && n.numbered) {
                    n.number = counter;
                    if (n.label) this.ast.mathIndex[n.label] = counter;
                    counter++;
                }
                // Build semantic math AST lazily
                if ((n.type === ZOLTONodeTypes.MATH_BLOCK ||
                     n.type === ZOLTONodeTypes.MATH_EQUATION) && n.content && !n.ast) {
                    n.ast = MathASTBuilder.build(n.content);
                }
                // Recurse
                if (n.children) walkForMath(n.children);
                if (n.layers)   walkForMath(n.layers);
                if (n.nodes)    walkForMath(n.nodes);
                if (n.tabs)     walkForMath(n.tabs);
                if (n.items)    walkForMath(n.items);
            }
        };
        walkForMath(this.ast.nodes);
    }

    /* ── §11d  SPATIAL EDGE RESOLUTION ─────────────────────────────────────────────── */

    _resolveEdges() {
        // Build shape ID index (O(N) depth-first)
        const shapeMap = new Map();
        const indexNodes = (nodes) => {
            if (!nodes) return;
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (n.type === ZOLTONodeTypes.SHAPE) {
                    if (n.id)    shapeMap.set(n.id,    n.id);
                    if (n.label) shapeMap.set(n.label, n.id);
                }
                if (n.type === ZOLTONodeTypes.GRAPH_NODE) {
                    if (n.id)    shapeMap.set(n.id,    n.id);
                    if (n.label) shapeMap.set(n.label, n.id);
                }
                indexNodes(n.children);
                indexNodes(n.layers);
                indexNodes(n.nodes);
            }
        };
        indexNodes(this.ast.nodes);

        // Resolve raw-target edges (O(E))
        const resolved = [];
        for (let i = 0; i < this.ast.edges.length; i++) {
            const e = this.ast.edges[i];
            e.toId = shapeMap.get(e.rawTarget) || e.rawTarget;
            if (!e.fromId) e.fromId = this._findImplicitParentId(e.line, shapeMap);
            if (e.fromId && e.toId) resolved.push(e);
        }
        this.ast.edges = resolved;

        // Resolve diagram-internal edges
        this._resolveDiagramEdgesInTree(this.ast.nodes);
    }

    _resolveDiagramEdgesInTree(nodes) {
        if (!nodes) return;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.type === ZOLTONodeTypes.GRAPH || n.type === ZOLTONodeTypes.DIAGRAM) {
                this._resolveDiagramEdges(n);
            }
            this._resolveDiagramEdgesInTree(n.children);
            this._resolveDiagramEdgesInTree(n.layers);
            this._resolveDiagramEdgesInTree(n.nodes);
        }
    }

    _resolveDiagramEdges(diagram) {
        // Build local node ID map
        const map = new Map();
        const nodeArr = diagram.nodes || diagram.children || [];
        for (let i = 0; i < nodeArr.length; i++) {
            const n = nodeArr[i];
            if (n.id)    map.set(n.id,    n.id);
            if (n.label) map.set(n.label, n.id);
        }
        // Also recurse into subgraphs
        const grpArr = diagram.groups || [];
        for (let g = 0; g < grpArr.length; g++) {
            const sg = grpArr[g];
            const sgNodes = sg.nodes || [];
            for (let k = 0; k < sgNodes.length; k++) {
                if (sgNodes[k].id)    map.set(sgNodes[k].id,    sgNodes[k].id);
                if (sgNodes[k].label) map.set(sgNodes[k].label, sgNodes[k].id);
            }
        }
        // Resolve edge IDs
        const edges = diagram.edges || [];
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            if (!e.fromId) e.fromId = map.get(e.from) || e.from;
            if (!e.toId)   e.toId   = map.get(e.to)   || e.to;
        }
    }

    _findImplicitParentId(edgeLine, shapeMap) {
        let nearestId = null, nearestLine = -1;
        const search = (nodes) => {
            if (!nodes) return;
            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];
                if ((n.type === ZOLTONodeTypes.SHAPE ||
                     n.type === ZOLTONodeTypes.GRAPH_NODE) &&
                    n.line < edgeLine && n.line > nearestLine) {
                    nearestLine = n.line;
                    nearestId   = n.id;
                }
                search(n.children);
                search(n.layers);
                search(n.nodes);
            }
        };
        search(this.ast.nodes);
        return nearestId;
    }

    /* ── §11e  INLINE PARSING — walks AST and populates .inline fields ──────────────── */

    _resolveInline(nodes) {
        if (!nodes || !nodes.length) return;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            this._resolveInlineNode(n);
        }
    }

    _resolveInlineNode(n) {
        if (!n) return;

        // Nodes that carry inline text
        if (n.type === ZOLTONodeTypes.PARAGRAPH && n.text && !n.inline) {
            n.inline = InlineParser.parse(n.text, n.flags || 0);
        }
        if (n.type === ZOLTONodeTypes.HEADING && n.text && !n.inline) {
            n.inline = InlineParser.parse(n.text, n.flags || 0);
        }
        if ((n.type === ZOLTONodeTypes.QUOTE ||
             n.type === ZOLTONodeTypes.CALLOUT) && n.text && !n.inline) {
            n.inline = InlineParser.parse(n.text, n.flags || 0);
        }
        if ((n.type === ZOLTONodeTypes.LIST_ITEM ||
             n.type === ZOLTONodeTypes.CHECKLIST_ITEM ||
             n.type === ZOLTONodeTypes.ORDERED_LIST_ITEM) && n.text && !n.inline) {
            n.inline = InlineParser.parse(n.text, n.flags || 0);
        }
        if (n.type === ZOLTONodeTypes.TREE_BRANCH && n.text && !n.inline) {
            n.inline = InlineParser.parse(n.text, 0);
        }
        if (n.type === ZOLTONodeTypes.FOOTNOTE && n.content && !n.inline) {
            n.inline = InlineParser.parse(n.content, 0);
        }
        if (n.type === ZOLTONodeTypes.SEQUENCE_MESSAGE && n.text && !n.inline) {
            n.inline = InlineParser.parse(n.text, n.flags || 0);
        }

        // Recurse into container arrays
        this._resolveInline(n.children);
        this._resolveInline(n.layers);
        this._resolveInline(n.nodes);
        this._resolveInline(n.tabs);
        this._resolveInline(n.items);
        this._resolveInline(n.cards);
        this._resolveInline(n.messages);
        this._resolveInline(n.columns);
        this._resolveInline(n.panes);
        this._resolveInline(n.slides);
    }

    /* ── §11f  COMPONENT PROP PARSING ──────────────────────────────────────────────── */

    _resolveComponentProps(nodes) {
        if (!nodes) return;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.type === ZOLTONodeTypes.COMPONENT_USE && n.propsString && !Object.keys(n.parsedProps).length) {
                n.parsedProps = this._parsePropsString(n.propsString);
            }
            this._resolveComponentProps(n.children);
            this._resolveComponentProps(n.layers);
            this._resolveComponentProps(n.nodes);
            this._resolveComponentProps(n.tabs);
        }
    }

    /* =========================================================================================
       §12  UTILITY METHODS
       ========================================================================================= */

    /**
     * Parse a props string into an object: `theme="dark" size={12} active`
     */
    _parsePropsString(str) {
        if (!str || !str.trim()) return {};
        const props = {};
        // Match: key="value" | key='value' | key={expr} | key=bare | key (boolean true)
        const re = /([a-zA-Z_:][a-zA-Z0-9_:\-.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|([^\s>]+)))?/g;
        let m;
        while ((m = re.exec(str)) !== null) {
            const key = m[1];
            const val = m[2] ?? m[3] ?? m[4] ?? m[5] ?? true;
            // Type coercion
            if (val === 'true')  { props[key] = true;  continue; }
            if (val === 'false') { props[key] = false; continue; }
            if (val !== true && /^-?\d+(\.\d+)?$/.test(val)) { props[key] = Number(val); continue; }
            props[key] = val;
        }
        return props;
    }

    /**
     * Legacy shape-type inference from raw token string (v7 compat).
     */
    _inferShapeType(raw) {
        if (!raw) return ZOLTOShapeTypes.RECTANGLE;
        if (raw.includes('(('))  return ZOLTOShapeTypes.CIRCLE;
        if (raw.includes('(['))  return ZOLTOShapeTypes.PILL;
        if (raw.includes('{{'))  return ZOLTOShapeTypes.HEXAGON;
        if (raw.includes('[['))  return ZOLTOShapeTypes.SUBROUTINE;
        if (raw.includes('{'))   return ZOLTOShapeTypes.DIAMOND;
        if (raw.includes('/'))   return ZOLTOShapeTypes.CYLINDER;
        if (raw.includes('>'))   return ZOLTOShapeTypes.NOTE;
        if (raw.includes('('))   return ZOLTOShapeTypes.ROUND;
        return ZOLTOShapeTypes.RECTANGLE;
    }
}