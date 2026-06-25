/**
 * js/parser/validator.js
 * Zolto v8.1.0 — AST Validator
 *
 * Walks the raw Document AST produced by parser.js and:
 *  1. Type-checks every node against its expected schema
 *  2. Validates required fields and allowed values
 *  3. Replaces invalid nodes with ErrorNode instances
 *  4. Collects diagnostics for the editor error panel
 *
 * Guarantees:
 *  - Never throws — all errors produce ErrorNodes
 *  - Document remains renderable even after validation errors
 *  - All ErrorNodes carry a code, line, and human-readable message
 */

'use strict';

import { ASTFactory, ZOLTONodeTypes,
         ZOLTODiagramTypes, ZOLTOChartTypes } from './ast.js';
import { createLogger }                       from '../utils/logger.js';

const logger = createLogger('Validator');

// ─────────────────────────────────────────────────────────────
// 1. Validator Error Codes
// ─────────────────────────────────────────────────────────────

export const ValidationCode = Object.freeze({
  V001: 'V001', // Unknown node type
  V002: 'V002', // Required field missing
  V003: 'V003', // Field value has wrong type
  V004: 'V004', // Diagram edge references unknown node id
  V005: 'V005', // Component use before definition
  V006: 'V006', // Circular component dependency
  V007: 'V007', // Nesting depth exceeds maximum
  V008: 'V008', // Invalid diagram type
  V009: 'V009', // Invalid chart type
  V010: 'V010', // Empty required content
  V011: 'V011', // Invalid attribute value
  V012: 'V012', // Duplicate heading anchor
  V013: 'V013', // Math content is empty
  V014: 'V014', // Import src is missing or empty
  V015: 'V015', // Presentation has no slides
});

// ─────────────────────────────────────────────────────────────
// 2. Diagnostic Type
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} Diagnostic
 * @property {string} code     — ValidationCode
 * @property {number} line     — source line
 * @property {string} message  — human-readable description
 * @property {string} nodeId   — id of the affected node
 * @property {'error' | 'warning'} severity
 */

// ─────────────────────────────────────────────────────────────
// 3. Validator Class
// ─────────────────────────────────────────────────────────────

export class ZoltoValidator {
  constructor() {
    /** @type {Diagnostic[]} */
    this.diagnostics = [];

    /** @type {Set<string>} */
    this._anchorsSeen = new Set();

    /** @type {Set<string>} */
    this._componentsDefined = new Set();
  }

  /**
   * Validate a Document AST in place.
   * Returns the (potentially modified) document with ErrorNodes
   * substituted for invalid nodes.
   *
   * @param {object} doc — Document AST from parser.js
   * @returns {object}   — same document, with invalid nodes replaced
   */
  validate(doc) {
    this.diagnostics       = [];
    this._anchorsSeen      = new Set();
    this._componentsDefined = new Set();

    // Pre-scan for component definitions
    this._prescanComponents(doc.nodes);

    // Walk and validate
    doc.nodes = this._walkNodes(doc.nodes);

    if (this.diagnostics.length > 0) {
      logger.debug(`Validation: ${this.diagnostics.length} diagnostic(s)`);
    }

    return doc;
  }

  // ─────────────────────────────────────────────────────────
  // 4. Pre-scan — collect component definition names
  // ─────────────────────────────────────────────────────────

  _prescanComponents(nodes) {
    for (const node of nodes) {
      if (node?.type === ZOLTONodeTypes.COMPONENT_DEF && node.name) {
        this._componentsDefined.add(node.name);
      }
      if (Array.isArray(node?.children)) {
        this._prescanComponents(node.children);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // 5. Node Walker
  // ─────────────────────────────────────────────────────────

  /**
   * Validate an array of nodes, replacing invalid ones with ErrorNodes.
   * @param {object[]} nodes
   * @returns {object[]}
   */
  _walkNodes(nodes) {
    return nodes.map(node => {
      if (!node) return null;
      const validated = this._validateNode(node);
      return validated;
    }).filter(Boolean);
  }

  /**
   * Validate a single node. Returns the node (possibly mutated)
   * or an ErrorNode if it is fundamentally invalid.
   * @param {object} node
   * @returns {object}
   */
  _validateNode(node) {
    if (!node.type) {
      return this._error(ValidationCode.V001, node.line ?? 0,
        'Node is missing a type field', node.id);
    }

    switch (node.type) {

      case ZOLTONodeTypes.HEADING:
        return this._validateHeading(node);

      case ZOLTONodeTypes.PARAGRAPH:
        return this._validateParagraph(node);

      case ZOLTONodeTypes.LIST:
        return this._validateList(node);

      case ZOLTONodeTypes.TABLE:
        return this._validateTable(node);

      case ZOLTONodeTypes.CODE_BLOCK:
        return this._validateCodeBlock(node);

      case ZOLTONodeTypes.CALLOUT:
      case ZOLTONodeTypes.ADMONITION:
        return this._validateCallout(node);

      case ZOLTONodeTypes.MATH_BLOCK:
        return this._validateMathBlock(node);

      case ZOLTONodeTypes.MATH_INLINE:
        return this._validateMathInline(node);

      case ZOLTONodeTypes.DIAGRAM:
        return this._validateDiagram(node);

      case ZOLTONodeTypes.CHART:
        return this._validateChart(node);

      case ZOLTONodeTypes.GRID:
      case ZOLTONodeTypes.FLEX:
      case ZOLTONodeTypes.CANVAS:
      case ZOLTONodeTypes.WHITEBOARD:
        return this._validateLayout(node);

      case ZOLTONodeTypes.PRESENTATION:
        return this._validatePresentation(node);

      case ZOLTONodeTypes.COMPONENT_DEF:
        return this._validateComponentDef(node);

      case ZOLTONodeTypes.COMPONENT_USE:
        return this._validateComponentUse(node);

      case ZOLTONodeTypes.IMPORT:
        return this._validateImport(node);

      case ZOLTONodeTypes.MCQ:
        return this._validateMCQ(node);

      case ZOLTONodeTypes.FLASHCARD:
        return this._validateFlashcard(node);

      // Nodes that pass through without validation
      case ZOLTONodeTypes.BLOCKQUOTE:
      case ZOLTONodeTypes.HORIZONTAL_RULE:
      case ZOLTONodeTypes.DETAILS:
      case ZOLTONodeTypes.ACCORDION:
      case ZOLTONodeTypes.TABS:
      case ZOLTONodeTypes.TAB:
      case ZOLTONodeTypes.CARD:
      case ZOLTONodeTypes.CARD_GROUP:
      case ZOLTONodeTypes.STEPS:
      case ZOLTONodeTypes.STEP:
      case ZOLTONodeTypes.HERO:
      case ZOLTONodeTypes.BANNER:
      case ZOLTONodeTypes.EMBED:
      case ZOLTONodeTypes.FOOTNOTE:
      case ZOLTONodeTypes.SLIDE:
      case ZOLTONodeTypes.SPLIT:
      case ZOLTONodeTypes.PANEL:
      case ZOLTONodeTypes.VECTOR_SCENE:
      case ZOLTONodeTypes.THEME_BLOCK:
      case ZOLTONodeTypes.COMMENT:
      case ZOLTONodeTypes.ERROR_NODE:
        return this._validateChildren(node);

      default:
        // Unknown node type — warn but pass through
        this._warn(ValidationCode.V001, node.line ?? 0,
          `Unknown node type "${node.type}"`, node.id);
        return node;
    }
  }

  // ─────────────────────────────────────────────────────────
  // 6. Per-Type Validators
  // ─────────────────────────────────────────────────────────

  _validateHeading(node) {
    if (typeof node.level !== 'number' || node.level < 1 || node.level > 6) {
      return this._error(ValidationCode.V003, node.line,
        `Heading level must be 1–6, got ${node.level}`, node.id);
    }
    if (!node.text && !node.inline) {
      this._warn(ValidationCode.V010, node.line, 'Empty heading', node.id);
    }
    // Deduplicate anchors
    if (node.anchor) {
      if (this._anchorsSeen.has(node.anchor)) {
        let suffix = 2;
        while (this._anchorsSeen.has(`${node.anchor}-${suffix}`)) suffix++;
        node.anchor = `${node.anchor}-${suffix}`;
        this._warn(ValidationCode.V012, node.line,
          `Duplicate heading anchor — renamed to "${node.anchor}"`, node.id);
      }
      this._anchorsSeen.add(node.anchor);
    }
    return node;
  }

  _validateParagraph(node) {
    if (typeof node.text !== 'string') {
      node.text = '';
      this._warn(ValidationCode.V003, node.line,
        'Paragraph text must be a string', node.id);
    }
    return node;
  }

  _validateList(node) {
    if (!Array.isArray(node.children)) {
      node.children = [];
      this._warn(ValidationCode.V003, node.line, 'List children must be an array', node.id);
    }
    node.children = this._walkNodes(node.children);
    return node;
  }

  _validateTable(node) {
    if (!Array.isArray(node.headers)) node.headers = [];
    if (!Array.isArray(node.rows))    node.rows    = [];
    if (!Array.isArray(node.align))   node.align   = [];
    return node;
  }

  _validateCodeBlock(node) {
    if (typeof node.code !== 'string') {
      node.code = '';
      this._warn(ValidationCode.V003, node.line,
        'CodeBlock code must be a string', node.id);
    }
    return node;
  }

  _validateCallout(node) {
    if (!node.calloutType && !node.admonitionType) {
      this._warn(ValidationCode.V002, node.line,
        'Callout/Admonition is missing a type', node.id);
    }
    node.children = this._walkNodes(node.children ?? []);
    return node;
  }

  _validateMathBlock(node) {
    if (typeof node.content !== 'string' || node.content.trim() === '') {
      return this._error(ValidationCode.V013, node.line,
        'Math block content cannot be empty', node.id);
    }
    const validEnvs = ['equation', 'equation*', 'align', 'align*',
                       'gather', 'multline', 'cases', 'plot'];
    if (!validEnvs.includes(node.env)) {
      this._warn(ValidationCode.V011, node.line,
        `Unknown math environment "${node.env}" — defaulting to "equation"`, node.id);
      node.env = 'equation';
    }
    return node;
  }

  _validateMathInline(node) {
    if (typeof node.content !== 'string' || node.content.trim() === '') {
      return this._error(ValidationCode.V013, node.line,
        'Inline math content cannot be empty', node.id);
    }
    return node;
  }

  _validateDiagram(node) {
    const validTypes = Object.values(ZOLTODiagramTypes);
    if (!validTypes.includes(node.diagramType)) {
      return this._error(ValidationCode.V008, node.line,
        `Unknown diagram type "${node.diagramType}". Valid: ${validTypes.join(', ')}`, node.id);
    }
    // Validate edge references
    if (Array.isArray(node.edges) && Array.isArray(node.nodes)) {
      const nodeIds = new Set(node.nodes.map(n => n.nodeId));
      for (const edge of node.edges) {
        if (edge.from && !nodeIds.has(edge.from)) {
          this._warn(ValidationCode.V004, node.line,
            `Diagram edge references unknown node id "${edge.from}"`, node.id);
        }
        if (edge.to && !nodeIds.has(edge.to)) {
          this._warn(ValidationCode.V004, node.line,
            `Diagram edge references unknown node id "${edge.to}"`, node.id);
        }
      }
    }
    return node;
  }

  _validateChart(node) {
    const validTypes = Object.values(ZOLTOChartTypes);
    if (!validTypes.includes(node.chartType)) {
      return this._error(ValidationCode.V009, node.line,
        `Unknown chart type "${node.chartType}". Valid: ${validTypes.join(', ')}`, node.id);
    }
    return node;
  }

  _validateLayout(node) {
    node.children = this._walkNodes(node.children ?? []);
    return node;
  }

  _validatePresentation(node) {
    if (!Array.isArray(node.slides) || node.slides.length === 0) {
      this._warn(ValidationCode.V015, node.line,
        'Presentation has no slides', node.id);
      node.slides = [];
    }
    node.slides = this._walkNodes(node.slides);
    return node;
  }

  _validateComponentDef(node) {
    if (!node.name || typeof node.name !== 'string') {
      return this._error(ValidationCode.V002, node.line,
        'Component definition is missing a name attribute', node.id);
    }
    this._componentsDefined.add(node.name);
    node.children = this._walkNodes(node.children ?? []);
    return node;
  }

  _validateComponentUse(node) {
    if (!node.componentName) {
      return this._error(ValidationCode.V002, node.line,
        'ComponentUse is missing a component name', node.id);
    }
    if (!this._componentsDefined.has(node.componentName)) {
      return this._error(ValidationCode.V005, node.line,
        `Component "${node.componentName}" is not defined. Did you forget to import its definition?`,
        node.id);
    }
    node.children = this._walkNodes(node.children ?? []);
    return node;
  }

  _validateImport(node) {
    if (!node.src || typeof node.src !== 'string' || node.src.trim() === '') {
      return this._error(ValidationCode.V014, node.line,
        'Import is missing a src attribute', node.id);
    }
    return node;
  }

  _validateMCQ(node) {
    if (!node.question || node.question.trim() === '') {
      this._warn(ValidationCode.V010, node.line,
        'MCQ is missing a question', node.id);
    }
    if (!Array.isArray(node.options) || node.options.length < 2) {
      this._warn(ValidationCode.V010, node.line,
        'MCQ should have at least 2 options', node.id);
    }
    const hasCorrect = Array.isArray(node.options) &&
                       node.options.some(o => o.correct === true);
    if (!hasCorrect) {
      this._warn(ValidationCode.V010, node.line,
        'MCQ has no correct option marked', node.id);
    }
    return node;
  }

  _validateFlashcard(node) {
    if (!node.front || String(node.front).trim() === '') {
      this._warn(ValidationCode.V010, node.line,
        'Flashcard is missing front content', node.id);
    }
    if (!node.back || String(node.back).trim() === '') {
      this._warn(ValidationCode.V010, node.line,
        'Flashcard is missing back content', node.id);
    }
    return node;
  }

  /** Recursively validate children of a pass-through node. */
  _validateChildren(node) {
    if (Array.isArray(node.children)) {
      node.children = this._walkNodes(node.children);
    }
    if (Array.isArray(node.slides)) {
      node.slides = this._walkNodes(node.slides);
    }
    if (Array.isArray(node.tabs)) {
      node.tabs = this._walkNodes(node.tabs);
    }
    if (Array.isArray(node.options)) {
      node.options = this._walkNodes(node.options);
    }
    return node;
  }

  // ─────────────────────────────────────────────────────────
  // 7. Error / Warning Helpers
  // ─────────────────────────────────────────────────────────

  /**
   * Create an ErrorNode and record a diagnostic.
   * @param {string} code
   * @param {number} line
   * @param {string} message
   * @param {string} [nodeId]
   * @returns {object} ErrorNode
   */
  _error(code, line, message, nodeId) {
    this.diagnostics.push({ code, line, message, nodeId, severity: 'error' });
    logger.warn(`[${code}] Line ${line}: ${message}`);
    return ASTFactory.createErrorNode(code, line, message, nodeId ?? null);
  }

  /**
   * Record a warning diagnostic (node is not replaced).
   * @param {string} code
   * @param {number} line
   * @param {string} message
   * @param {string} [nodeId]
   */
  _warn(code, line, message, nodeId) {
    this.diagnostics.push({ code, line, message, nodeId, severity: 'warning' });
    logger.debug(`[${code}] Warning Line ${line}: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 8. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Convenience: validate a Document AST and return it.
 * @param {object} doc
 * @returns {{ doc: object, diagnostics: Diagnostic[] }}
 */
export function validate(doc) {
  const validator  = new ZoltoValidator();
  const validated  = validator.validate(doc);
  return { doc: validated, diagnostics: validator.diagnostics };
}
