/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE COMPILER - PRODUCTION ENGINE (Infinity Level)
 * Version: 7.0.0 (Unified Spatial Architecture)
 * Architecture:
 * - V8/Bun/JSC Optimized with Arena-inspired object allocation.
 * - Single-Pass O(N) Linear Resolution Engine with O(1) Dictionary Lookups.
 * - High-Performance Stack Machine for Infinite Nesting (Layouts, Components, Admonitions).
 * - Zero-Garbage Buffer Flushing via .length = 0 recycling.
 * =========================================================================================
 */

'use strict';

import { ZOLTOTokenizer, TokenTypes } from './tokenizer.js';
import { ASTFactory, ZOLTONodeTypes, ZOLTOShapeTypes } from './ast.js';

export class ZOLTOCompiler {
    /**
     * Main entry point for the compiler pipeline.
     * @param {string} sourceCode 
     * @returns {Object} Monomorphic AST Document
     */
    static parse(sourceCode) {
        if (!sourceCode || typeof sourceCode !== 'string') return ASTFactory.createDocument();
        return new ZOLTOBlockParser(sourceCode).parse();
    }
}

class ZOLTOBlockParser {
    constructor(source) {
        this.tokenizer = new ZOLTOTokenizer(source);
        this.ast = ASTFactory.createDocument();
        
        // Arena-like state management
        this.ctx = {
            inMath: false,
            inCode: false,
            inFrontmatter: false,
            codeLang: '',
            codeConfig: '',
            mathConfig: '',
            mathBuf: [],
            codeBuf: [],
            textBuf: [],
            listBuf: [],
            tableBuf: [],
            frontBuf: []
        };

        // High-Performance Stack for nested structures (Layouts, Components, Admonitions, Artboards)
        this.stack = []; 
        this.stackDepth = 0;
    }

    parse() {
        const tokens = this.tokenizer.tokenize();
        const len = tokens.length;

        for (let i = 0; i < len; i++) {
            const t = tokens[i];

            /* --- 1. VERBATIM BLOCK CAPTURE (Fast Path) --- */
            
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

            /* --- 2. O(1) TOKEN ROUTING --- */
            
            switch (t.type) {
                // Formatting & Structural
                case TokenTypes.BLANK: 
                    this._flushStandard(); 
                    break;
                case TokenTypes.HEADING: 
                    this._flushStandard(); 
                    this._pushNode(ASTFactory.createHeading(t.line, t.level, t.text)); 
                    break;
                case TokenTypes.TEXT: 
                    this._flushGroup('text'); 
                    this.ctx.textBuf.push(t.value); 
                    break;
                case TokenTypes.QUOTE: 
                    this._flushStandard(); 
                    this._pushNode(ASTFactory.createQuote(t.line, t.text)); 
                    break;

                // Lists & Tables
                case TokenTypes.LIST_ITEM:
                case TokenTypes.CHECKLIST_ITEM:
                    this._flushGroup('list'); 
                    this.ctx.listBuf.push(t); 
                    break;
                case TokenTypes.TABLE_ROW:
                case TokenTypes.TABLE_DIVIDER:
                    this._flushGroup('table'); 
                    this.ctx.tableBuf.push(t); 
                    break;

                // Verbatim Triggers
                case TokenTypes.MATH_BLOCK_START: 
                    this._flushStandard(); 
                    this.ctx.inMath = true; 
                    this.ctx.mathConfig = t.config; 
                    break;
                case TokenTypes.CODE_BLOCK_START: 
                    this._flushStandard(); 
                    this.ctx.inCode = true; 
                    this.ctx.codeLang = t.lang; 
                    this.ctx.codeConfig = t.config; 
                    break;
                case TokenTypes.FRONTMATTER_START:
                    this.ctx.inFrontmatter = true;
                    break;

                // Advanced Diagrams & Connectors
                case TokenTypes.SHAPE: 
                    this._flushStandard(); 
                    this._pushNode(ASTFactory.createShape(t.line, t.id, t.label, t.trait, this._inferShapeType(t.raw))); 
                    break;
                case TokenTypes.EDGE: 
                    this._flushStandard(); 
                    this.ast.edges.push(ASTFactory.createEdge(t.line, t.operator, t.label, null, null, t.target)); 
                    break;
                case TokenTypes.CHART: 
                    this._flushStandard(); 
                    this._pushNode(ASTFactory.createChart(t.line, t.chartType, t.config)); 
                    break;
                case TokenTypes.TREE_BRANCH: 
                    this._flushStandard(); 
                    this._pushNode(ASTFactory.createTreeBranch(t.line, t.prefix, t.text)); 
                    break;

                // Native Vectors
                case TokenTypes.VECTOR_SHAPE:
                    this._flushStandard();
                    this.ast.vectors.push(ASTFactory.createVectorShape(t.line, t.vectorType, t.vectorData));
                    break;

                // Media & References
                case TokenTypes.EMBED:
                    this._flushStandard();
                    this._pushNode(ASTFactory.createEmbed(t.line, t.embedType, t.label, t.url));
                    break;

                /* --- 3. SPATIAL STACK MANAGEMENT (Layouts, Components, MD Blocks) --- */
                
                case TokenTypes.DIRECTIVE_START:
                    this._flushStandard();
                    if (t.directive === 'artboard') {
                        this._openStack(ASTFactory.createArtboard(t.line, t.args, t.config));
                    } else {
                        this._openStack(ASTFactory.createLayoutBlock(t.line, t.directive, t.args));
                    }
                    break;

                case TokenTypes.MD_BLOCK_START:
                    this._flushStandard();
                    this._openStack(ASTFactory.createAdmonition(t.line, t.blockType, t.params));
                    break;

                case TokenTypes.COMPONENT_USE:
                    this._flushStandard();
                    if (t.raw.endsWith('/>')) {
                        // Self-closing component
                        this._pushNode(ASTFactory.createComponentUse(t.line, t.componentName, t.props));
                    } else {
                        // Open component block
                        this._openStack(ASTFactory.createComponentUse(t.line, t.componentName, t.props));
                    }
                    break;

                case TokenTypes.SLOT_DEF:
                    this._flushStandard();
                    this._openStack(ASTFactory.createSlotDef(t.line, t.slotName));
                    break;

                case TokenTypes.DIRECTIVE_END:
                case TokenTypes.MD_BLOCK_END:
                    this._flushStandard();
                    this._closeStack();
                    break;

                default: break;
            }
        }

        // Final cleanup & Compilation
        this._flushStandard();
        while (this.stackDepth > 0) this._closeStack(); 
        
        return this._resolveEdges();
    }

    /* =========================================================================================
       BUFFER FLUSHING (Memory Optimizations)
       ========================================================================================= */

    _flushStandard() {
        if (this.ctx.textBuf.length > 0) this._flushText();
        if (this.ctx.listBuf.length > 0) this._flushList();
        if (this.ctx.tableBuf.length > 0) this._flushTable();
    }

    _flushGroup(excludeType) {
        if (excludeType !== 'text' && this.ctx.textBuf.length > 0) this._flushText();
        if (excludeType !== 'list' && this.ctx.listBuf.length > 0) this._flushList();
        if (excludeType !== 'table' && this.ctx.tableBuf.length > 0) this._flushTable();
    }

    _flushText() {
        this._pushNode(ASTFactory.createParagraph(-1, this.ctx.textBuf.join('\n')));
        this.ctx.textBuf.length = 0; // V8 Fast Clear
    }

    _flushList() {
        const list = ASTFactory.createList(this.ctx.listBuf[0].line, false);
        for (let i = 0, len = this.ctx.listBuf.length; i < len; i++) {
            const item = this.ctx.listBuf[i];
            const isChecklist = item.type === TokenTypes.CHECKLIST_ITEM;
            list.items.push(ASTFactory.createListItem(item.line, item.indent, item.bullet, item.text, isChecklist, item.checked));
        }
        this._pushNode(list);
        this.ctx.listBuf.length = 0;
    }

    _flushTable() {
        if (this.ctx.tableBuf.length === 0) return;
        const table = ASTFactory.createTable(this.ctx.tableBuf[0].line);
        let headerParsed = false;

        for (let i = 0, len = this.ctx.tableBuf.length; i < len; i++) {
            const t = this.ctx.tableBuf[i];
            if (t.type === TokenTypes.TABLE_DIVIDER) {
                // Parse alignments: |:---|:---:|---:|
                const cells = t.raw.split('|').slice(1, -1).map(s => s.trim());
                table.alignments = cells.map(c => {
                    const left = c.startsWith(':');
                    const right = c.endsWith(':');
                    if (left && right) return 'center';
                    if (right) return 'right';
                    return 'left';
                });
                headerParsed = true;
            } else if (!headerParsed && i === 0) {
                table.headers = t.content.split('|').map(s => s.trim());
            } else {
                table.rows.push(t.content.split('|').map(s => s.trim()));
            }
        }
        this._pushNode(table);
        this.ctx.tableBuf.length = 0;
    }

    _flushCode(line) {
        this.ctx.inCode = false;
        this._pushNode(ASTFactory.createCodeBlock(line, this.ctx.codeLang, this.ctx.codeConfig, this.ctx.codeBuf.join('\n')));
        this.ctx.codeBuf.length = 0;
    }

    _flushMath(line) {
        this.ctx.inMath = false;
        this._pushNode(ASTFactory.createMathBlock(line, this.ctx.mathConfig, this.ctx.mathBuf.join('\n')));
        this.ctx.mathBuf.length = 0;
    }

    _flushFrontmatter(line) {
        this.ctx.inFrontmatter = false;
        this.ast.frontmatter = ASTFactory.createFrontmatter(line, this.ctx.frontBuf.join('\n'));
        this.ctx.frontBuf.length = 0;
    }

    /* =========================================================================================
       STACK & NODE MANAGEMENT
       ========================================================================================= */

    _openStack(node) {
        this.stack.push(node);
        this.stackDepth++;
    }

    _closeStack() {
        if (this.stackDepth === 0) return;
        const closedNode = this.stack.pop();
        this.stackDepth--;
        this._pushNode(closedNode);
    }

    _pushNode(node) {
        if (this.stackDepth > 0) {
            const parent = this.stack[this.stackDepth - 1];
            if (parent.children) {
                parent.children.push(node);
            } else if (parent.layers) {
                parent.layers.push(node);
            }
        } else {
            this.ast.nodes.push(node);
        }
    }

    /* =========================================================================================
       SPATIAL GRAPH RESOLUTION (O(n) Indexed Linking)
       ========================================================================================= */

    _resolveEdges() {
        const shapeMap = new Map();
        
        // Pass 1: O(N) Depth-First ID Indexing
        const indexNodes = (nodes) => {
            for (let i = 0, len = nodes.length; i < len; i++) {
                const n = nodes[i];
                if (n.type === ZOLTONodeTypes.SHAPE) {
                    if (n.id) shapeMap.set(n.id, n.id);
                    if (n.label) shapeMap.set(n.label, n.id);
                }
                if (n.children) indexNodes(n.children);
                if (n.layers) indexNodes(n.layers);
            }
        };
        indexNodes(this.ast.nodes);

        // Pass 2: O(E) Edge Linking & Orphan Resolution
        const resolved = [];
        for (let i = 0, len = this.ast.edges.length; i < len; i++) {
            const e = this.ast.edges[i];
            e.toId = shapeMap.get(e.rawTarget);
            
            // Implicit Spatial Parent Binding (Reverse Lookbehind)
            if (e.toId && !e.fromId) {
                e.fromId = this._findImplicitParentId(e.line);
            }
            
            // Only push valid edges to layout engine to prevent router crash
            if (e.fromId && e.toId) {
                resolved.push(e);
            }
        }
        
        this.ast.edges = resolved;
        return this.ast;
    }

    _findImplicitParentId(edgeLine) {
        // Deep search backwards for the nearest preceding Shape node
        let nearestId = null;
        let nearestLine = -1;

        const searchNodes = (nodes) => {
            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];
                if (n.type === ZOLTONodeTypes.SHAPE && n.line < edgeLine && n.line > nearestLine) {
                    nearestLine = n.line;
                    nearestId = n.id;
                }
                if (n.children) searchNodes(n.children);
            }
        };

        searchNodes(this.ast.nodes);
        return nearestId;
    }
    
    _inferShapeType(raw) {
        if (raw.includes('((')) return ZOLTOShapeTypes.CIRCLE;
        if (raw.includes('([')) return ZOLTOShapeTypes.PILL;
        if (raw.includes('{')) return ZOLTOShapeTypes.DIAMOND;
        if (raw.includes('/')) return ZOLTOShapeTypes.CYLINDER;
        if (raw.includes('>')) return ZOLTOShapeTypes.NOTE;
        return ZOLTOShapeTypes.RECTANGLE;
    }
}
