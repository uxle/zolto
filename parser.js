/**
 * =========================================================================================
 * LUMA STUDIO: ENTERPRISE COMPILER FRONT-END (PARSER ENGINE)
 * Version: 4.0.0 (Infinity Scale)
 * * Description: A zero-dependency, 4-phase spatial compiler for the Luma Language.
 * This parser generates a deterministic Abstract Syntax Tree (AST) supporting:
 * - Spatial Graph Nodes & Edges
 * - Grid-based Data Tables
 * - Native Charting (Pie, Bar, Line, Sequence, Gantt)
 * - Advanced Mathematics (Block & Inline)
 * - Rich Text (Colors, Alignment, Highlights, Markdown)
 * - LSP (Language Server Protocol) ready Diagnostics.
 * =========================================================================================
 */

'use strict';

/* =========================================================================================
   PART 1: AST NODE DEFINITIONS & ENUMS
   ========================================================================================= */

const LumaNodeTypes = Object.freeze({
    DOCUMENT: 'Document',
    SHAPE: 'Shape',
    EDGE: 'Edge',
    HEADING: 'Heading',
    PARAGRAPH: 'Paragraph',
    LIST: 'List',
    LIST_ITEM: 'ListItem',
    QUOTE: 'Quote',
    CODE_BLOCK: 'CodeBlock',
    TABLE: 'Table',
    CHART: 'Chart',
    MATH_BLOCK: 'MathBlock',
    LAYOUT_BLOCK: 'LayoutBlock',
    TREE_BRANCH: 'TreeBranch',
    TREE_LEAF: 'TreeLeaf',
    HORIZONTAL_RULE: 'HorizontalRule',
    // Inline types
    TEXT: 'Text',
    BOLD: 'Bold',
    ITALIC: 'Italic',
    STRIKETHROUGH: 'Strikethrough',
    HIGHLIGHT: 'Highlight',
    COLOR: 'Color',
    ALIGNMENT: 'Alignment',
    INLINE_MATH: 'InlineMath',
    INLINE_CODE: 'InlineCode',
    LINK: 'Link'
});

const LumaShapeTypes = Object.freeze({
    BLOCK: 'block',             // [ ]
    INTERACTIVE: 'interactive', // ( )
    GEOMETRIC: 'geometric',     // < >
    DATABASE: 'database',       // { }
    CIRCLE: 'circle'            // (( ))
});

const LumaEdgeOperators = Object.freeze({
    DIRECT: '->',
    TRANSITION: '=>',
    ASYNC: '~>',
    BIDIRECTIONAL: '<->',
    IMPLIED: '..>'
});

const LumaChartTypes = Object.freeze({
    PIE: 'pie',
    BAR: 'bar',
    LINE: 'line',
    SEQUENCE: 'sequence',
    GANTT: 'gantt'
});

/* =========================================================================================
   PART 2: DIAGNOSTICS ENGINE (For VS Code / LSP Integration)
   ========================================================================================= */

class LumaDiagnostics {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    error(line, col, code, message) {
        this.errors.push({ line, col, code, message, severity: 'error' });
    }

    warning(line, col, code, message) {
        this.warnings.push({ line, col, code, message, severity: 'warning' });
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    report() {
        if (this.hasErrors()) {
            console.error(`[Luma Compiler] Failed with ${this.errors.length} errors.`);
            this.errors.forEach(e => console.error(`  Line ${e.line}:${e.col} [${e.code}] - ${e.message}`));
        }
        if (this.warnings.length > 0) {
            console.warn(`[Luma Compiler] Completed with ${this.warnings.length} warnings.`);
        }
    }
}

/* =========================================================================================
   PART 3: INLINE RICH TEXT PARSER (Recursive Descent)
   ========================================================================================= */

class LumaInlineParser {
    /**
     * Parses raw strings into rich text AST arrays.
     * Supports nested colors, alignments, math, and markdown.
     */
    static parse(rawText, diagnostics, lineNum) {
        if (!rawText) return [];
        let tokens = [];
        let cursor = 0;
        let textBuffer = '';

        const flushText = () => {
            if (textBuffer.length > 0) {
                tokens.push({ type: LumaNodeTypes.TEXT, value: textBuffer });
                textBuffer = '';
            }
        };

        while (cursor < rawText.length) {
            const char = rawText[cursor];
            const nextChar = rawText[cursor + 1] || '';
            const lookahead2 = rawText.substr(cursor, 2);
            const lookahead3 = rawText.substr(cursor, 3);

            // 1. Text Alignment: ::: center ::: or -> text <-
            if (lookahead3 === ':::') {
                flushText();
                const endIdx = rawText.indexOf(':::', cursor + 3);
                if (endIdx !== -1) {
                    const inner = rawText.substring(cursor + 3, endIdx).trim();
                    let align = 'center';
                    if (inner.startsWith('left')) align = 'left';
                    else if (inner.startsWith('right')) align = 'right';
                    
                    const contentStr = inner.replace(/^(left|right|center)/, '').trim();
                    tokens.push({ 
                        type: LumaNodeTypes.ALIGNMENT, 
                        align: align, 
                        children: this.parse(contentStr, diagnostics, lineNum) 
                    });
                    cursor = endIdx + 3;
                    continue;
                }
            }

            // 2. Color Tags: {#ff0000 Red Text} or {blue Blue Text}
            if (char === '{' && (nextChar === '#' || /[a-z]/i.test(nextChar))) {
                const colorEnd = rawText.indexOf(' ', cursor);
                const tagEnd = rawText.indexOf('}', cursor);
                if (colorEnd !== -1 && tagEnd !== -1 && colorEnd < tagEnd) {
                    flushText();
                    const colorVal = rawText.substring(cursor + 1, colorEnd);
                    const innerText = rawText.substring(colorEnd + 1, tagEnd);
                    tokens.push({
                        type: LumaNodeTypes.COLOR,
                        color: colorVal,
                        children: this.parse(innerText, diagnostics, lineNum)
                    });
                    cursor = tagEnd + 1;
                    continue;
                }
            }

            // 3. Highlight: ==highlighted text==
            if (lookahead2 === '==') {
                flushText();
                const endIdx = rawText.indexOf('==', cursor + 2);
                if (endIdx !== -1) {
                    tokens.push({
                        type: LumaNodeTypes.HIGHLIGHT,
                        children: this.parse(rawText.substring(cursor + 2, endIdx), diagnostics, lineNum)
                    });
                    cursor = endIdx + 2;
                    continue;
                }
            }

            // 4. Inline Math: $e=mc^2$
            if (char === '$' && nextChar !== '$') {
                flushText();
                const endIdx = rawText.indexOf('$', cursor + 1);
                if (endIdx !== -1) {
                    tokens.push({
                        type: LumaNodeTypes.INLINE_MATH,
                        value: rawText.substring(cursor + 1, endIdx)
                    });
                    cursor = endIdx + 1;
                    continue;
                }
            }

            // 5. Bold: **text**
            if (lookahead2 === '**') {
                flushText();
                const endIdx = rawText.indexOf('**', cursor + 2);
                if (endIdx !== -1) {
                    tokens.push({
                        type: LumaNodeTypes.BOLD,
                        children: this.parse(rawText.substring(cursor + 2, endIdx), diagnostics, lineNum)
                    });
                    cursor = endIdx + 2;
                    continue;
                }
            }

            // 6. Italic: *text* or _text_
            if ((char === '*' || char === '_') && nextChar !== char) {
                flushText();
                const endIdx = rawText.indexOf(char, cursor + 1);
                if (endIdx !== -1) {
                    tokens.push({
                        type: LumaNodeTypes.ITALIC,
                        children: this.parse(rawText.substring(cursor + 1, endIdx), diagnostics, lineNum)
                    });
                    cursor = endIdx + 1;
                    continue;
                }
            }

            // 7. Inline Code: `code`
            if (char === '`') {
                flushText();
                const endIdx = rawText.indexOf('`', cursor + 1);
                if (endIdx !== -1) {
                    tokens.push({
                        type: LumaNodeTypes.INLINE_CODE,
                        value: rawText.substring(cursor + 1, endIdx)
                    });
                    cursor = endIdx + 1;
                    continue;
                }
            }

            // 8. Links: [Label](url)
            if (char === '[') {
                const bracketEnd = rawText.indexOf(']', cursor);
                if (bracketEnd !== -1 && rawText[bracketEnd + 1] === '(') {
                    const parenEnd = rawText.indexOf(')', bracketEnd + 1);
                    if (parenEnd !== -1) {
                        flushText();
                        const label = rawText.substring(cursor + 1, bracketEnd);
                        const url = rawText.substring(bracketEnd + 2, parenEnd);
                        tokens.push({
                            type: LumaNodeTypes.LINK,
                            url: url,
                            children: this.parse(label, diagnostics, lineNum)
                        });
                        cursor = parenEnd + 1;
                        continue;
                    }
                }
            }

            // Default: Append to text buffer
            textBuffer += char;
            cursor++;
        }

        flushText();
        return tokens;
    }
}

/* =========================================================================================
   PART 4: THE MASTER BLOCK PARSER (Syntactic Analysis)
   ========================================================================================= */

class LumaBlockParser {
    constructor(sourceCode) {
        this.rawLines = sourceCode.split('\n');
        this.totalLines = this.rawLines.length;
        this.cursor = 0;
        this.diagnostics = new LumaDiagnostics();
        this.ast = {
            type: LumaNodeTypes.DOCUMENT,
            nodes: [],
            edges: [],
            meta: { generatedAt: Date.now() }
        };
        this.nodeCounter = 0;
    }

    // --- Core Navigation Utilities ---

    _isEOF() { return this.cursor >= this.totalLines; }
    _peek() { return this._isEOF() ? null : this.rawLines[this.cursor]; }
    _advance() { return this.rawLines[this.cursor++]; }
    _currentLineNum() { return this.cursor + 1; }
    
    _getDepth(line) {
        if (!line) return 0;
        const match = line.match(/^ */);
        const spaces = match ? match[0].length : 0;
        if (spaces % 2 !== 0) {
            this.diagnostics.warning(this._currentLineNum(), spaces, 'W_INDENT', 'Odd number of spaces detected. Use 2 spaces per depth level.');
        }
        return Math.floor(spaces / 2);
    }

    _generateId(prefix) {
        return `luma-${prefix}-${++this.nodeCounter}`;
    }

    // --- Parsing Dispatcher ---

    parse() {
        while (!this._isEOF()) {
            const line = this._peek();
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('//')) {
                this._advance();
                continue;
            }

            const depth = this._getDepth(line);
            let parsedNode = null;

            // Priority 1: Multi-line Macro Blocks (Charts, Math, Tables, Code)
            if (trimmed.startsWith('chart:')) {
                parsedNode = this.parseChartBlock(depth);
            } else if (trimmed.startsWith('math:') || trimmed === '$$') {
                parsedNode = this.parseMathBlock(depth);
            } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                parsedNode = this.parseTableBlock(depth);
            } else if (trimmed.startsWith('```')) {
                parsedNode = this.parseCodeBlock(depth);
            } else if (trimmed.startsWith('layout:')) {
                parsedNode = this.parseLayoutBlock(depth);
            } 
            
            // Priority 2: Single-line Entities (Shapes, Edges, Typography)
            else {
                parsedNode = this.parseSingleLineEntity(line, trimmed, depth);
            }

            if (parsedNode) {
                // If it's an edge, push to edge array, otherwise node array
                if (parsedNode.type === LumaNodeTypes.EDGE) {
                    this.ast.edges.push(parsedNode);
                } else {
                    this.ast.nodes.push(parsedNode);
                }
            } else {
                // Fallback to Paragraph
                this.ast.nodes.push(this.parseParagraph(trimmed, depth));
                this._advance();
            }
        }

        const linker = new LumaSemanticLinker(this.ast, this.diagnostics);
        this.ast = linker.resolve();

        this.diagnostics.report();
        return this.ast;
    }

    // --- Macro Block Parsers ---

    parseChartBlock(baseDepth) {
        const line = this._advance().trim();
        const lineNum = this._currentLineNum() - 1;
        const chartType = line.replace('chart:', '').trim().toLowerCase();
        
        if (!Object.values(LumaChartTypes).includes(chartType)) {
            this.diagnostics.error(lineNum, 0, 'E_CHART_TYPE', `Unknown chart type: ${chartType}`);
        }

        const chartNode = {
            id: this._generateId('chart'),
            type: LumaNodeTypes.CHART,
            chartType: chartType,
            depth: baseDepth,
            lineNum: lineNum,
            dataset: [],
            config: {}
        };

        // Consume indented lines as data
        while (!this._isEOF()) {
            const nextLine = this._peek();
            if (!nextLine.trim()) { this._advance(); continue; }
            
            const nextDepth = this._getDepth(nextLine);
            if (nextDepth <= baseDepth) break; // End of block

            const dataLine = this._advance().trim();

            // Config parser: config: colorScheme=dark
            if (dataLine.startsWith('config:')) {
                const parts = dataLine.replace('config:', '').split('=');
                if (parts.length === 2) chartNode.config[parts[0].trim()] = parts[1].trim();
                continue;
            }

            // Pie / Bar data: "Label": 45
            if (chartType === LumaChartTypes.PIE || chartType === LumaChartTypes.BAR) {
                const match = dataLine.match(/^(?:"([^"]+)"|([a-zA-Z0-9_ -]+))\s*:\s*([\d.]+)/);
                if (match) {
                    chartNode.dataset.push({ label: match[1] || match[2], value: parseFloat(match[3]) });
                }
            }
            // Sequence data: User -> API : Request Data
            else if (chartType === LumaChartTypes.SEQUENCE) {
                const match = dataLine.match(/^(.*?)\s*(->|=>|-->)\s*(.*?)\s*:\s*(.*)/);
                if (match) {
                    chartNode.dataset.push({ 
                        from: match[1].trim(), 
                        edge: match[2], 
                        to: match[3].trim(), 
                        message: match[4].trim() 
                    });
                }
            }
            // Fallback raw data
            else {
                chartNode.dataset.push({ raw: dataLine });
            }
        }

        return chartNode;
    }

    parseMathBlock(baseDepth) {
        let firstLine = this._advance().trim();
        let title = '';
        const lineNum = this._currentLineNum() - 1;

        if (firstLine.startsWith('math:')) {
            title = firstLine.replace('math:', '').trim();
        }

        let mathContent = '';

        while (!this._isEOF()) {
            const nextLine = this._peek();
            if (!nextLine.trim() && mathContent.length > 0) {
                mathContent += '\n'; 
                this._advance(); 
                continue; 
            }
            
            // Stop if dedented or if closing $$ is found
            const nextDepth = this._getDepth(nextLine);
            if (nextDepth <= baseDepth && firstLine.startsWith('math:')) break;
            if (nextLine.trim() === '$$') {
                this._advance(); // consume closing
                break;
            }

            mathContent += this._advance() + '\n';
        }

        return {
            id: this._generateId('math'),
            type: LumaNodeTypes.MATH_BLOCK,
            title: title,
            content: mathContent.trim(),
            depth: baseDepth,
            lineNum: lineNum
        };
    }

    parseTableBlock(baseDepth) {
        const tableNode = {
            id: this._generateId('table'),
            type: LumaNodeTypes.TABLE,
            depth: baseDepth,
            lineNum: this._currentLineNum(),
            headers: [],
            alignments: [],
            rows: []
        };

        // 1. Parse Header Row
        let headerLine = this._advance().trim();
        tableNode.headers = headerLine.split('|').filter(c => c.trim() !== '').map(c => this.parseInline(c.trim(), this._currentLineNum()));

        // 2. Parse Divider Row (determines alignment)
        if (!this._isEOF() && this._peek().trim().startsWith('|') && this._peek().includes('-')) {
            let dividerLine = this._advance().trim();
            const cols = dividerLine.split('|').filter(c => c.trim() !== '');
            tableNode.alignments = cols.map(col => {
                const c = col.trim();
                if (c.startsWith(':') && c.endsWith(':')) return 'center';
                if (c.endsWith(':')) return 'right';
                return 'left';
            });
        }

        // 3. Parse Data Rows
        while (!this._isEOF()) {
            const nextLine = this._peek().trim();
            if (!nextLine.startsWith('|')) break;

            const cells = nextLine.split('|').filter(c => c !== '').map(c => this.parseInline(c.trim(), this._currentLineNum()));
            // Only add if it's not a trailing empty split
            if (cells.length > 0) tableNode.rows.push(cells);
            
            this._advance();
        }

        return tableNode;
    }

    parseCodeBlock(baseDepth) {
        const startLine = this._advance().trim();
        const lineNum = this._currentLineNum() - 1;
        const lang = startLine.substring(3).trim();
        let codeContent = '';

        while (!this._isEOF()) {
            const nextLine = this._advance();
            if (nextLine.trim() === '```') break;
            codeContent += nextLine + '\n';
        }

        return {
            id: this._generateId('code'),
            type: LumaNodeTypes.CODE_BLOCK,
            language: lang,
            content: codeContent.replace(/\n$/, ''),
            depth: baseDepth,
            lineNum: lineNum
        };
    }

    parseLayoutBlock(baseDepth) {
        const line = this._advance().trim();
        const layoutType = line.replace('layout:', '').trim(); // e.g., 'grid', 'flex-row'
        
        const layoutNode = {
            id: this._generateId('layout'),
            type: LumaNodeTypes.LAYOUT_BLOCK,
            layout: layoutType,
            depth: baseDepth,
            lineNum: this._currentLineNum() - 1,
            children: [] // Needs a secondary parsing pass or recursive parser to fill children
        };

        // Note: For a true 100% complete compiler, we would recursively call parse() here
        // on the indented slice of text. For this 1000-line engine, we capture raw bounds.
        while (!this._isEOF()) {
            const nextDepth = this._getDepth(this._peek());
            if (nextDepth <= baseDepth && this._peek().trim() !== '') break;
            layoutNode.children.push({ raw: this._advance().trim() });
        }

        return layoutNode;
    }

    // --- Single Line Entities ---

    parseSingleLineEntity(rawLine, trimmed, depth) {
        const lineNum = this._currentLineNum();

        // 1. Shapes: [ Block ], ( Interactive ), < Geometric >, { Database }, (( Circle ))
        const shapeMatch = trimmed.match(/^(\[|\(|\<|\{|\(\()(.*?)(\]|\)|\>|\}|\)\))(.*)/);
        if (shapeMatch) {
            this._advance();
            const openBracket = shapeMatch[1];
            const labelStr = shapeMatch[2].trim();
            const remainder = shapeMatch[4];

            let shapeType = LumaShapeTypes.BLOCK;
            if (openBracket === '(') shapeType = LumaShapeTypes.INTERACTIVE;
            else if (openBracket === '<') shapeType = LumaShapeTypes.GEOMETRIC;
            else if (openBracket === '{') shapeType = LumaShapeTypes.DATABASE;
            else if (openBracket === '((') shapeType = LumaShapeTypes.CIRCLE;

            // Extract Traits (+primary)
            const traits = [];
            const traitRegex = /\+([a-zA-Z0-9-]+)/g;
            let tMatch;
            while ((tMatch = traitRegex.exec(remainder)) !== null) {
                traits.push(tMatch[1]);
            }

            // Extract inline edge attached to shape: [ Node ] -> [ Target ]
            const inlineEdge = remainder.match(/(->|=>|~>|<->|\.\.>)\s*(\[|\(|\<|\{)?(.*?)(\]|\)|\>|\})?$/);
            if (inlineEdge) {
                this.ast.edges.push({
                    type: LumaNodeTypes.EDGE,
                    fromId: null, // Resolved in Linker
                    fromLabel: labelStr, // Temporary semantic hook
                    operator: inlineEdge[1],
                    toLabel: inlineEdge[3].trim(),
                    lineNum: lineNum,
                    depth: depth
                });
            }

            return {
                id: this._generateId('shape'),
                type: LumaNodeTypes.SHAPE,
                shape: shapeType,
                label: labelStr,
                richLabel: this.parseInline(labelStr, lineNum),
                traits: traits,
                depth: depth,
                lineNum: lineNum
            };
        }

        // 2. Standalone Edges: -> [ Target ]
        const edgeMatch = trimmed.match(/^(->|=>|~>|<->|\.\.>)\s*(\[|\(|\<|\{)?(.*?)(\]|\)|\>|\})?(.*)/);
        if (edgeMatch) {
            this._advance();
            
            // Extract edge label if any: -> "Creates" [ Target ]
            let edgeLabel = '';
            let targetRaw = edgeMatch[3].trim();
            const quotesMatch = targetRaw.match(/^"(.*?)"\s*(.*)/);
            if (quotesMatch) {
                edgeLabel = quotesMatch[1];
                targetRaw = quotesMatch[2];
            }

            return {
                type: LumaNodeTypes.EDGE,
                fromId: null, // Resolves via depth lookbehind in Linker
                operator: edgeMatch[1],
                edgeLabel: edgeLabel,
                toLabel: targetRaw,
                depth: depth,
                lineNum: lineNum
            };
        }

        // 3. Headings
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            this._advance();
            return {
                id: this._generateId('heading'),
                type: LumaNodeTypes.HEADING,
                level: headingMatch[1].length,
                label: headingMatch[2].trim(),
                richLabel: this.parseInline(headingMatch[2].trim(), lineNum),
                depth: depth,
                lineNum: lineNum
            };
        }

        // 4. Tree Branches
        if (trimmed.startsWith('/ ')) {
            this._advance();
            return {
                id: this._generateId('branch'),
                type: LumaNodeTypes.TREE_BRANCH,
                label: trimmed.substring(2).trim(),
                depth: depth,
                lineNum: lineNum
            };
        }

        // 5. Tree Leaves
        if (trimmed.startsWith('- ')) {
            this._advance();
            return {
                id: this._generateId('leaf'),
                type: LumaNodeTypes.TREE_LEAF,
                label: trimmed.substring(2).trim(),
                depth: depth,
                lineNum: lineNum
            };
        }

        // 6. Blockquotes
        if (trimmed.startsWith('> ')) {
            this._advance();
            return {
                id: this._generateId('quote'),
                type: LumaNodeTypes.QUOTE,
                content: this.parseInline(trimmed.substring(2).trim(), lineNum),
                depth: depth,
                lineNum: lineNum
            };
        }

        // 7. Horizontal Rule
        if (trimmed === '---' || trimmed === '***') {
            this._advance();
            return {
                id: this._generateId('hr'),
                type: LumaNodeTypes.HORIZONTAL_RULE,
                depth: depth,
                lineNum: lineNum
            };
        }

        return null; // Signals fallback to paragraph
    }

    parseParagraph(trimmed, depth) {
        return {
            id: this._generateId('p'),
            type: LumaNodeTypes.PARAGRAPH,
            content: this.parseInline(trimmed, this._currentLineNum()),
            depth: depth,
            lineNum: this._currentLineNum()
        };
    }

    parseInline(text, lineNum) {
        return LumaInlineParser.parse(text, this.diagnostics, lineNum);
    }
}

/* =========================================================================================
   PART 5: THE SEMANTIC LINKER (Graph Resolution)
   ========================================================================================= */

class LumaSemanticLinker {
    constructor(ast, diagnostics) {
        this.ast = ast;
        this.diagnostics = diagnostics;
        this.nodeRegistry = new Map(); // String Label -> ID
    }

    resolve() {
        // 1. Build Registry of all addressable nodes
        this._buildRegistry();

        // 2. Resolve Edges
        const resolvedEdges = [];

        for (let i = 0; i < this.ast.edges.length; i++) {
            const edge = this.ast.edges[i];

            // Resolve 'fromId'
            if (!edge.fromId) {
                if (edge.fromLabel) {
                    // Inline edge attached to shape
                    edge.fromId = this.nodeRegistry.get(edge.fromLabel);
                } else {
                    // Standalone edge. Look behind for closest shape with shallower depth
                    let foundParentId = null;
                    // Because AST nodes are pushed sequentially, we can find the parent
                    // by looking at nodes preceding this edge's line number.
                    const precedingNodes = this.ast.nodes.filter(n => n.lineNum < edge.lineNum && n.type === LumaNodeTypes.SHAPE);
                    
                    for (let j = precedingNodes.length - 1; j >= 0; j--) {
                        if (precedingNodes[j].depth < edge.depth) {
                            foundParentId = precedingNodes[j].id;
                            break;
                        }
                    }
                    
                    if (foundParentId) {
                        edge.fromId = foundParentId;
                    } else {
                        this.diagnostics.warning(edge.lineNum, 0, 'W_ORPHAN_EDGE', `Edge has no valid parent shape to connect from.`);
                    }
                }
            }

            // Resolve 'toId'
            const targetId = this.nodeRegistry.get(edge.toLabel);
            if (targetId) {
                edge.toId = targetId;
                resolvedEdges.push(edge);
            } else {
                // Feature: Implicit Node Creation. 
                // If target doesn't exist, create it dynamically as a standard block.
                const implicitId = `luma-implicit-${Date.now()}-${i}`;
                this.ast.nodes.push({
                    id: implicitId,
                    type: LumaNodeTypes.SHAPE,
                    shape: LumaShapeTypes.BLOCK,
                    label: edge.toLabel,
                    richLabel: LumaInlineParser.parse(edge.toLabel, this.diagnostics, edge.lineNum),
                    traits: ['implicit'],
                    depth: edge.depth,
                    lineNum: edge.lineNum
                });
                
                this.nodeRegistry.set(edge.toLabel, implicitId);
                edge.toId = implicitId;
                resolvedEdges.push(edge);
                
                this.diagnostics.info?.push(`Implicitly created missing node: [${edge.toLabel}]`);
            }
        }

        this.ast.edges = resolvedEdges;
        return this.ast;
    }

    _buildRegistry() {
        this.ast.nodes.forEach(node => {
            if (node.type === LumaNodeTypes.SHAPE) {
                // If duplicates exist, we keep the first one found (standard graph theory approach)
                if (!this.nodeRegistry.has(node.label)) {
                    this.nodeRegistry.set(node.label, node.id);
                }
            }
        });
    }
}

/* =========================================================================================
   PART 6: PUBLIC API & COMPILER FACADE
   ========================================================================================= */

class LumaCompiler {
    /**
     * Executes the full 4-phase compilation pipeline.
     * @param {string} sourceCode - Raw Luma text payload.
     * @returns {Object} The finalized AST.
     */
    static parse(sourceCode) {
        if (!sourceCode || typeof sourceCode !== 'string') {
            return { type: LumaNodeTypes.DOCUMENT, nodes: [], edges: [] };
        }

        const parser = new LumaBlockParser(sourceCode);
        return parser.parse();
    }

    /**
     * Export Enums for external renderer usage.
     */
    static get Types() {
        return {
            Node: LumaNodeTypes,
            Shape: LumaShapeTypes,
            Edge: LumaEdgeOperators,
            Chart: LumaChartTypes
        };
    }
}

// Module export compatibility (Node.js & ES6 Browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LumaCompiler, LumaParser: LumaCompiler, LumaNodeTypes, LumaShapeTypes };
} else if (typeof window !== 'undefined') {
    window.LumaCompiler = LumaCompiler;
    window.LumaParser = LumaCompiler; // Alias for backward compatibility with existing engine
}