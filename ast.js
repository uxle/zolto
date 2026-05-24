/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE COMPILER - AST DEFINITIONS (Infinity Level)
 * Version: 7.0.0 (Unified Spatial Architecture)
 * Architecture:
 * - Strict Monomorphic Object Shapes per Node Type (V8 Hidden Class Optimization)
 * - Deeply Frozen Enums to prevent runtime de-optimization
 * - Memory-efficient Data Structures spanning 6 Domains:
 * (Markdown, LaTeX, Diagrams, Vectors, Spatial UI, Components)
 * =========================================================================================
 */

'use strict';

/* =========================================================================================
   1. STRICT ENUMS & CONSTANTS (Infinity Scope)
   ========================================================================================= */

export const ZOLTONodeTypes = Object.freeze({
    // Core Document & Metadata
    DOCUMENT: 'Document',
    FRONTMATTER: 'Frontmatter',
    
    // 1. Rich Markdown & Typography
    HEADING: 'Heading',
    PARAGRAPH: 'Paragraph',
    LIST: 'List',
    LIST_ITEM: 'ListItem',
    CHECKLIST_ITEM: 'ChecklistItem',
    QUOTE: 'Quote',
    CODE_BLOCK: 'CodeBlock',
    TABLE: 'Table',
    FOOTNOTE: 'Footnote',
    REFERENCE: 'Reference',
    EMBED: 'Embed',
    
    // Extended Markdown / Documentation Structures
    ADMONITION: 'Admonition',
    TAB_GROUP: 'TabGroup',
    ACCORDION: 'Accordion',
    CARD: 'Card',

    // 2. Advanced Mathematics
    MATH_BLOCK: 'MathBlock',
    
    // 3. Diagramming & Spatial Graphs
    SHAPE: 'Shape',
    EDGE: 'Edge',
    PORT_DEF: 'PortDef',
    CHART: 'Chart',
    TREE_BRANCH: 'TreeBranch',
    
    // 4. Native Vector & Graphics
    VECTOR_SCENE: 'VectorScene',
    VECTOR_SHAPE: 'VectorShape',
    
    // 5. Spatial Layout System
    LAYOUT_BLOCK: 'LayoutBlock',
    ARTBOARD: 'Artboard',
    LAYER: 'Layer',
    
    // 6. Component System
    COMPONENT_USE: 'ComponentUse',
    SLOT_DEF: 'SlotDef'
});

export const ZOLTOShapeTypes = Object.freeze({
    // Basic Geometry
    RECTANGLE: 'Rectangle',
    CIRCLE: 'Circle',
    PILL: 'Pill',
    DIAMOND: 'Diamond',
    HEXAGON: 'Hexagon',
    
    // System & Architecture
    DATABASE: 'Database',
    CYLINDER: 'Cylinder',
    CLOUD: 'Cloud',
    ACTOR: 'Actor',
    NOTE: 'Note',
    FOLDER: 'Folder',
    COMPONENT: 'Component',
    INTERFACE: 'Interface'
});

export const ZOLTOEdgeOperators = Object.freeze({
    // Standard Directed
    SOLID_ARROW: '->',
    DASHED_ARROW: '.->',
    THICK_ARROW: '=>',
    
    // Bidirectional & Undirected
    BIDIRECTIONAL: '<->',
    SOLID_LINE: '--',
    THICK_LINE: '==',
    DASHED_LINE: '.-.',
    
    // UML & Architecture specific
    AGGREGATION: '<>-',
    COMPOSITION: '*->',
    DEPENDENCY: '..>'
});

export const ZOLTOChartTypes = Object.freeze({
    // Standard Data
    PIE: 'PIE',
    BAR: 'BAR',
    LINE: 'LINE',
    
    // Process & System
    SEQUENCE: 'SEQUENCE',
    GANTT: 'GANTT',
    STATE: 'STATE',
    FLOWCHART: 'FLOWCHART',
    TIMELINE: 'TIMELINE',
    
    // Architecture & Data Modeling
    MINDMAP: 'MINDMAP',
    ER: 'ER',
    NETWORK: 'NETWORK',
    ARCHITECTURE: 'ARCHITECTURE'
});

export const ZOLTOVectorTypes = Object.freeze({
    PATH: 'path',
    CIRCLE: 'circle',
    RECT: 'rect',
    POLYGON: 'polygon',
    GROUP: 'group'
});

/* =========================================================================================
   2. MONOMORPHIC AST NODE FACTORY
   Ensures properties are instantiated in the exact same order for a given node type.
   ========================================================================================= */

export class ASTFactory {
    
    /* --- CORE DOCUMENT --- */
    
    static createDocument() {
        return {
            type: ZOLTONodeTypes.DOCUMENT,
            frontmatter: null,
            nodes: [],
            edges: [],
            components: [],
            vectors: []
        };
    }

    static createFrontmatter(line, configString) {
        return {
            type: ZOLTONodeTypes.FRONTMATTER,
            line: line,
            rawConfig: configString || '',
            parsedMeta: {} // Computed later in pipeline
        };
    }

    /* --- 1. RICH MARKDOWN & TYPOGRAPHY --- */

    static createHeading(line, level, text) {
        return {
            type: ZOLTONodeTypes.HEADING,
            line: line,
            level: level || 1,
            text: text || '',
            id: `h_${Math.random().toString(36).substr(2, 6)}` // Auto-anchoring
        };
    }

    static createParagraph(line, text) {
        return {
            type: ZOLTONodeTypes.PARAGRAPH,
            line: line,
            text: text || ''
        };
    }

    static createQuote(line, text) {
        return {
            type: ZOLTONodeTypes.QUOTE,
            line: line,
            text: text || ''
        };
    }

    static createList(line, isOrdered = false) {
        return {
            type: ZOLTONodeTypes.LIST,
            line: line,
            isOrdered: isOrdered,
            items: []
        };
    }

    static createListItem(line, indent, bullet, text, isChecklist = false, checked = false) {
        return {
            type: isChecklist ? ZOLTONodeTypes.CHECKLIST_ITEM : ZOLTONodeTypes.LIST_ITEM,
            line: line,
            indent: indent || 0,
            bullet: bullet || '-',
            text: text || '',
            checked: checked // Only evaluated if isChecklist is true
        };
    }

    static createCodeBlock(line, lang, config, content) {
        return {
            type: ZOLTONodeTypes.CODE_BLOCK,
            line: line,
            lang: lang || 'text',
            config: config || '',
            content: content || ''
        };
    }

    static createTable(line) {
        return {
            type: ZOLTONodeTypes.TABLE,
            line: line,
            headers: [],
            rows: [],
            alignments: []
        };
    }

    static createEmbed(line, embedType, label, url) {
        return {
            type: ZOLTONodeTypes.EMBED,
            line: line,
            embedType: embedType || 'image', // image, youtube, figma, etc.
            label: label || '',
            url: url || ''
        };
    }

    static createAdmonition(line, blockType, params) {
        return {
            type: ZOLTONodeTypes.ADMONITION,
            line: line,
            blockType: blockType || 'info', // warning, danger, success, info, note
            title: params || '',
            children: []
        };
    }

    /* --- 2. ADVANCED MATHEMATICS --- */

    static createMathBlock(line, config, content) {
        return {
            type: ZOLTONodeTypes.MATH_BLOCK,
            line: line,
            config: config || '',
            content: content || '',
            ast: null // Placeholder for semantic math AST generation in pipeline
        };
    }

    /* --- 3. DIAGRAMMING & SPATIAL GRAPHS --- */

    static createShape(line, id, label, trait = 'base', shapeType = ZOLTOShapeTypes.RECTANGLE) {
        return {
            type: ZOLTONodeTypes.SHAPE,
            line: line,
            id: id || `shape_${Math.random().toString(36).substr(2, 9)}`,
            label: label || '',
            trait: trait || 'base',
            shapeType: shapeType,
            metadata: {} // For runtime injection (tooltips, click actions)
        };
    }

    static createEdge(line, operator, edgeLabel, fromId, toId, rawTarget) {
        return {
            type: ZOLTONodeTypes.EDGE,
            line: line,
            operator: operator || ZOLTOEdgeOperators.SOLID_ARROW,
            edgeLabel: edgeLabel || null,
            fromId: fromId || null,
            toId: toId || null,
            rawTarget: rawTarget || '' // Used for deferred graph resolution
        };
    }

    static createChart(line, chartType, config) {
        return {
            type: ZOLTONodeTypes.CHART,
            line: line,
            chartType: chartType || ZOLTOChartTypes.PIE,
            config: config || '',
            data: [] // Handled by block parser
        };
    }

    static createTreeBranch(line, prefix, text) {
        return {
            type: ZOLTONodeTypes.TREE_BRANCH,
            line: line,
            prefix: prefix || '',
            text: text || '',
            children: []
        };
    }

    /* --- 4. NATIVE VECTOR & GRAPHICS --- */

    static createVectorShape(line, vectorType, vectorData) {
        return {
            type: ZOLTONodeTypes.VECTOR_SHAPE,
            line: line,
            vectorType: vectorType || ZOLTOVectorTypes.PATH,
            vectorData: vectorData || '',
            attributes: {} // Fill, stroke, transforms
        };
    }

    /* --- 5. SPATIAL LAYOUT SYSTEM --- */

    static createLayoutBlock(line, directive, config) {
        return {
            type: ZOLTONodeTypes.LAYOUT_BLOCK,
            line: line,
            directive: directive || 'flex-col', // grid-3, flex-row, masonry, absolute
            config: config || '',
            children: [] // Nested AST Nodes
        };
    }

    static createArtboard(line, name, config) {
        return {
            type: ZOLTONodeTypes.ARTBOARD,
            line: line,
            name: name || 'Canvas',
            config: config || '',
            layers: []
        };
    }

    /* --- 6. COMPONENT SYSTEM --- */

    static createComponentUse(line, componentName, propsString) {
        return {
            type: ZOLTONodeTypes.COMPONENT_USE,
            line: line,
            componentName: componentName || 'Fragment',
            propsString: propsString || '',
            parsedProps: {}, // Computed in AST resolution phase
            children: []
        };
    }

    static createSlotDef(line, slotName) {
        return {
            type: ZOLTONodeTypes.SLOT_DEF,
            line: line,
            slotName: slotName || 'default',
            children: []
        };
    }
}
