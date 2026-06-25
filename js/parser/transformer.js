/**
 * js/parser/transformer.js
 * Zolto v8.1.0 — AST Transformer & Component Runtime
 *
 * The final stage of the parser pipeline. Takes a validated
 * Document AST and performs 8 sequential passes to produce
 * a fully-resolved Document ready for the renderer.
 *
 * Passes (in order):
 *  1. Variable expansion      — {$name} → resolved value
 *  2. Import resolution       — @import merged in
 *  3. Component registration  — ComponentDef → registry
 *  4. Inline parsing          — text → InlineNode[]
 *  5. Math AST building       — LaTeX → MathAST
 *  6. Equation numbering      — numbered:true → sequential (n)
 *  7. Footnote resolution     — collect, number, backlink
 *  8. Heading anchor dedup    — ensure unique anchors
 *
 * Also exports ZoltoComponentRuntime — the component registry
 * used by both the transformer and the renderer.
 */

'use strict';

import { ASTFactory, ZOLTONodeTypes,
         InlineParser, MathASTBuilder } from './ast.js';
import { createLogger }                 from '../utils/logger.js';
import { slugify }                      from '../utils/helpers.js';

const logger = createLogger('Transformer');

// ─────────────────────────────────────────────────────────────
// 1. Component Registry (ZoltoComponentRuntime)
// ─────────────────────────────────────────────────────────────

/**
 * Module-level singleton component registry.
 * Both the transformer (registration) and renderer (lookup) use this.
 */
export const ZoltoComponentRuntime = (() => {
  /** @type {Map<string, object>} name → ComponentDef node */
  const _registry = new Map();

  /** @type {Map<string, Set<string>>} name → set of names it uses */
  const _deps = new Map();

  return {
    /**
     * Register a component definition.
     * @param {string} name
     * @param {object} defNode — ComponentDef AST node
     */
    register(name, defNode) {
      _registry.set(name, defNode);
      logger.debug('Component registered:', name);
    },

    /**
     * Check if a component is registered.
     * @param {string} name
     * @returns {boolean}
     */
    has(name) { return _registry.has(name); },

    /**
     * Get a component definition by name.
     * @param {string} name
     * @returns {object | null}
     */
    get(name) { return _registry.get(name) ?? null; },

    /**
     * List all registered component names.
     * @returns {string[]}
     */
    list() { return [..._registry.keys()]; },

    /**
     * Clear all registered components.
     * Used by tests and document close.
     */
    clear() { _registry.clear(); _deps.clear(); },

    /**
     * Check for circular dependencies (A uses B which uses A).
     * @param {string}   name
     * @param {string[]} chain — call chain for cycle detection
     * @returns {string[] | null} null if OK, array of cycle participants if cyclic
     */
    checkCycle(name, chain = []) {
      if (chain.includes(name)) return [...chain, name];
      const uses = _deps.get(name) ?? new Set();
      for (const dep of uses) {
        const result = this.checkCycle(dep, [...chain, name]);
        if (result) return result;
      }
      return null;
    },

    /**
     * Register a dependency relationship (name uses dep).
     * @param {string} name
     * @param {string} dep
     */
    addDep(name, dep) {
      if (!_deps.has(name)) _deps.set(name, new Set());
      _deps.get(name).add(dep);
    },
  };
})();


// ─────────────────────────────────────────────────────────────
// 2. Transformer Class
// ─────────────────────────────────────────────────────────────

export class ZoltoTransformer {
  constructor() {
    /** @type {Record<string, string>} resolved variables */
    this._vars = {};

    /** @type {number} global equation counter */
    this._eqCounter = 0;

    /** @type {number} global footnote counter */
    this._fnCounter = 0;

    /** @type {Map<string, object>} label → footnote node */
    this._footnotes = new Map();

    /** @type {Set<string>} anchors seen so far */
    this._anchors = new Set();
  }

  /**
   * Transform a validated Document AST.
   * All 8 passes run sequentially in dependency order.
   *
   * @param {object} doc — validated Document AST
   * @returns {object}   — fully resolved Document
   */
  transform(doc) {
    // Reset per-document state
    this._vars      = {};
    this._eqCounter = 0;
    this._fnCounter = 0;
    this._footnotes = new Map();
    this._anchors   = new Set();
    ZoltoComponentRuntime.clear();

    // Extract variables from frontmatter
    if (doc.frontmatter) {
      Object.assign(this._vars, doc.frontmatter);
    }

    // Pass 1 — Variable expansion
    logger.measure('Pass 1: Variable expansion', () => {
      doc.nodes = this._pass1_variables(doc.nodes);
      doc.variables = { ...this._vars };
    });

    // Pass 2 — Import resolution (async not supported here — handled by app.js)
    logger.measure('Pass 2: Variable declarations', () => {
      doc.nodes = this._pass2_extractVars(doc.nodes);
    });

    // Pass 3 — Component registration
    logger.measure('Pass 3: Component registration', () => {
      this._pass3_registerComponents(doc.nodes);
    });

    // Pass 4 — Inline parsing
    logger.measure('Pass 4: Inline parsing', () => {
      doc.nodes = this._pass4_inline(doc.nodes);
    });

    // Pass 5 — Math AST building
    logger.measure('Pass 5: Math AST', () => {
      doc.nodes = this._pass5_mathAST(doc.nodes);
    });

    // Pass 6 — Equation numbering
    logger.measure('Pass 6: Equation numbering', () => {
      doc.nodes = this._pass6_equationNumbers(doc.nodes);
      doc.mathIndex = this._buildMathIndex(doc.nodes);
    });

    // Pass 7 — Footnote resolution
    logger.measure('Pass 7: Footnotes', () => {
      doc.nodes = this._pass7_footnotes(doc.nodes);
      doc.footnotes = Object.fromEntries(this._footnotes);
    });

    // Pass 8 — Heading anchors
    logger.measure('Pass 8: Heading anchors', () => {
      doc.nodes = this._pass8_anchors(doc.nodes);
      doc.references = this._buildReferenceIndex(doc.nodes);
    });

    return doc;
  }

  // ─────────────────────────────────────────────────────────
  // Pass 1 — Variable expansion in text fields
  // ─────────────────────────────────────────────────────────

  _pass1_variables(nodes) {
    return nodes.map(node => {
      if (!node) return node;

      // Expand {$var} in text fields
      if (typeof node.text === 'string') {
        node.text = this._expandVars(node.text);
      }
      if (typeof node.title === 'string') {
        node.title = this._expandVars(node.title);
      }
      if (typeof node.content === 'string') {
        node.content = this._expandVars(node.content);
      }
      if (typeof node.question === 'string') {
        node.question = this._expandVars(node.question);
      }

      // Recurse into children
      if (Array.isArray(node.children)) node.children = this._pass1_variables(node.children);
      if (Array.isArray(node.slides))   node.slides   = this._pass1_variables(node.slides);
      if (Array.isArray(node.tabs))     node.tabs     = this._pass1_variables(node.tabs);
      if (Array.isArray(node.items))    node.items    = this._pass1_variables(node.items);
      if (Array.isArray(node.options))  node.options  = this._pass1_variables(node.options);

      return node;
    });
  }

  /** Replace {$name} references with resolved variable values. */
  _expandVars(text) {
    return text.replace(/\{\$(\w+)\}/g, (_, name) => {
      return this._vars[name] !== undefined ? String(this._vars[name]) : `{$${name}}`;
    });
  }

  // ─────────────────────────────────────────────────────────
  // Pass 2 — Extract variable declarations from nodes
  // ─────────────────────────────────────────────────────────

  _pass2_extractVars(nodes) {
    const result = [];
    for (const node of nodes) {
      if (!node) continue;
      // Variable declaration nodes have _var metadata from parser
      if (node._var) {
        this._vars[node._var.name] = node._var.value;
        continue; // Remove from node list
      }
      result.push(node);
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────
  // Pass 3 — Register component definitions
  // ─────────────────────────────────────────────────────────

  _pass3_registerComponents(nodes) {
    for (const node of nodes) {
      if (!node) continue;

      if (node.type === ZOLTONodeTypes.COMPONENT_DEF && node.name) {
        // Parse props string into defaults map
        node.parsedProps = this._parsePropsString(node.propsString ?? '');

        // Check for circular dependency before registering
        const cycle = ZoltoComponentRuntime.checkCycle(node.name);
        if (cycle) {
          logger.warn('Circular component dependency detected:', cycle.join(' → '));
          node.type    = ZOLTONodeTypes.ERROR_NODE;
          node.code    = 'V006';
          node.message = `Circular component dependency: ${cycle.join(' → ')}`;
          continue;
        }

        ZoltoComponentRuntime.register(node.name, node);

        // Collect which components this def uses
        this._collectComponentUses(node.children ?? [], node.name);
      }

      // Recurse
      if (Array.isArray(node.children)) this._pass3_registerComponents(node.children);
    }
  }

  /** Collect component uses within a component def body for cycle detection. */
  _collectComponentUses(nodes, defName) {
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === ZOLTONodeTypes.COMPONENT_USE && node.componentName) {
        ZoltoComponentRuntime.addDep(defName, node.componentName);
      }
      if (Array.isArray(node.children)) this._collectComponentUses(node.children, defName);
    }
  }

  /**
   * Parse a props definition string into a map of { name: defaultValue }.
   * e.g. 'title value trend="neutral"' → { title: '', value: '', trend: 'neutral' }
   * @param {string} propsString
   * @returns {Record<string, string>}
   */
  _parsePropsString(propsString) {
    const props = {};
    const regex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s,]+)))?/g;
    let match;
    while ((match = regex.exec(propsString)) !== null) {
      const name = match[1];
      const val  = match[2] ?? match[3] ?? match[4] ?? '';
      props[name] = val;
    }
    return props;
  }

  // ─────────────────────────────────────────────────────────
  // Pass 4 — Inline parsing
  // ─────────────────────────────────────────────────────────

  _pass4_inline(nodes) {
    return nodes.map(node => {
      if (!node) return node;
      this._parseInlineFields(node);
      if (Array.isArray(node.children)) node.children = this._pass4_inline(node.children);
      if (Array.isArray(node.slides))   node.slides   = this._pass4_inline(node.slides);
      if (Array.isArray(node.tabs))     node.tabs     = this._pass4_inline(node.tabs);
      if (Array.isArray(node.items))    node.items    = this._pass4_inline(node.items);
      if (Array.isArray(node.options))  node.options  = this._pass4_inline(node.options);
      return node;
    });
  }

  _parseInlineFields(node) {
    // Only parse nodes that have an inline field (set to null by factory)
    if (!('inline' in node)) return;
    if (node.inline !== null) return; // Already parsed

    const text  = typeof node.text === 'string' ? node.text : '';
    const flags = typeof node.flags === 'number' ? node.flags : 0;
    node.inline = InlineParser.parse(text, flags);
  }

  // ─────────────────────────────────────────────────────────
  // Pass 5 — Math AST building
  // ─────────────────────────────────────────────────────────

  _pass5_mathAST(nodes) {
    return nodes.map(node => {
      if (!node) return node;

      if (node.type === ZOLTONodeTypes.MATH_BLOCK ||
          node.type === ZOLTONodeTypes.MATH_INLINE) {
        if (node.ast === null && node.content) {
          node.ast = MathASTBuilder.parse(node.content);
          // If math is invalid, emit warning but don't replace node
          if (!node.ast.valid) {
            logger.warn(`Math parse warning: ${node.ast.error} at line ${node.line}`);
          }
        }
      }

      if (Array.isArray(node.children)) node.children = this._pass5_mathAST(node.children);
      if (Array.isArray(node.slides))   node.slides   = this._pass5_mathAST(node.slides);
      return node;
    });
  }

  // ─────────────────────────────────────────────────────────
  // Pass 6 — Equation numbering
  // ─────────────────────────────────────────────────────────

  _pass6_equationNumbers(nodes) {
    return nodes.map(node => {
      if (!node) return node;

      if (node.type === ZOLTONodeTypes.MATH_BLOCK && node.numbered === true) {
        this._eqCounter++;
        node.number = this._eqCounter;
      }

      if (Array.isArray(node.children)) node.children = this._pass6_equationNumbers(node.children);
      if (Array.isArray(node.slides))   node.slides   = this._pass6_equationNumbers(node.slides);
      return node;
    });
  }

  _buildMathIndex(nodes, index = {}) {
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === ZOLTONodeTypes.MATH_BLOCK && node.label && node.number) {
        index[node.label] = node.number;
      }
      if (Array.isArray(node.children)) this._buildMathIndex(node.children, index);
      if (Array.isArray(node.slides))   this._buildMathIndex(node.slides,   index);
    }
    return index;
  }

  // ─────────────────────────────────────────────────────────
  // Pass 7 — Footnote resolution
  // ─────────────────────────────────────────────────────────

  _pass7_footnotes(nodes) {
    // First sub-pass: collect all FootnoteDef nodes
    this._collectFootnoteDefs(nodes);

    // Second sub-pass: number footnote refs in order of appearance
    return this._numberFootnoteRefs(nodes);
  }

  _collectFootnoteDefs(nodes) {
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === ZOLTONodeTypes.FOOTNOTE && node.label) {
        if (!this._footnotes.has(node.label)) {
          this._fnCounter++;
          node.number = this._fnCounter;
          this._footnotes.set(node.label, node);
        }
      }
      if (Array.isArray(node.children)) this._collectFootnoteDefs(node.children);
    }
  }

  _numberFootnoteRefs(nodes) {
    return nodes.map(node => {
      if (!node) return node;

      // Resolve inline footnote references
      if (Array.isArray(node.inline)) {
        for (const inline of node.inline) {
          if (inline.type === 'footnoteRef' && inline.label) {
            const def = this._footnotes.get(inline.label);
            if (def) inline.number = def.number;
          }
        }
      }

      if (Array.isArray(node.children)) node.children = this._numberFootnoteRefs(node.children);
      if (Array.isArray(node.slides))   node.slides   = this._numberFootnoteRefs(node.slides);
      return node;
    });
  }

  // ─────────────────────────────────────────────────────────
  // Pass 8 — Heading anchor deduplication
  // ─────────────────────────────────────────────────────────

  _pass8_anchors(nodes) {
    return nodes.map(node => {
      if (!node) return node;

      if (node.type === ZOLTONodeTypes.HEADING) {
        const base = node.anchor ?? slugify(node.text ?? '');
        node.anchor = this._uniqueAnchor(base);
      }

      if (Array.isArray(node.children)) node.children = this._pass8_anchors(node.children);
      if (Array.isArray(node.slides))   node.slides   = this._pass8_anchors(node.slides);
      return node;
    });
  }

  _uniqueAnchor(base) {
    if (!this._anchors.has(base)) {
      this._anchors.add(base);
      return base;
    }
    let n = 2;
    while (this._anchors.has(`${base}-${n}`)) n++;
    const unique = `${base}-${n}`;
    this._anchors.add(unique);
    return unique;
  }

  _buildReferenceIndex(nodes, refs = {}) {
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === ZOLTONodeTypes.HEADING && node.anchor) {
        refs[node.anchor] = node.id;
      }
      if (node.type === ZOLTONodeTypes.MATH_BLOCK && node.label) {
        refs[node.label] = node.id;
      }
      if (Array.isArray(node.children)) this._buildReferenceIndex(node.children, refs);
      if (Array.isArray(node.slides))   this._buildReferenceIndex(node.slides,   refs);
    }
    return refs;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Convenience: transform a Document AST through all 8 passes.
 * @param {object} doc
 * @returns {object}
 */
export function transform(doc) {
  return new ZoltoTransformer().transform(doc);
}
