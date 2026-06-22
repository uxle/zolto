/**
 * js/export/json-export.js
 * Zolto v8.1.0 — AST JSON Exporter
 *
 * Exports the fully-transformed Document AST as a JSON string.
 * Useful for:
 *  - Debugging the parser/transformer pipeline
 *  - Building external tooling that consumes Zolto documents
 *  - Persisting documents as structured data (not just raw source)
 *  - Migration and format conversion pipelines
 *
 * The exported JSON includes:
 *  - Full Document AST (all nodes, with inline arrays)
 *  - Frontmatter, variables, equation index, reference index
 *  - Export metadata (version, timestamp, word count)
 *
 * Circular references are impossible in Zolto's AST because
 * it is a strict tree (no back-pointers). JSON.stringify is safe.
 */

'use strict';

import { downloadFile, wordCount } from '../utils/helpers.js';
import { createLogger }            from '../utils/logger.js';

const logger = createLogger('Export');

// ─────────────────────────────────────────────────────────────
// JSON Exporter
// ─────────────────────────────────────────────────────────────

export const JSONExporter = {

  /**
   * Export a Document AST as a formatted JSON string.
   * @param {object}  doc       — transformed Document AST
   * @param {object}  [options]
   * @param {boolean} [options.pretty=true]   — pretty-print with 2-space indent
   * @param {boolean} [options.omitInline=false] — omit inline arrays (reduce file size)
   * @param {boolean} [options.omitAST=false]    — omit MathAST nodes (reduce size)
   * @returns {string}
   */
  export(doc, options = {}) {
    const {
      pretty      = true,
      omitInline  = false,
      omitAST     = false,
    } = options;

    logger.info('Exporting JSON AST');

    // Build export envelope
    const exported = {
      _meta: {
        generator:  'Zolto',
        version:    '8.1.0',
        exportedAt: new Date().toISOString(),
        wordCount:  _countWords(doc),
        nodeCount:  _countNodes(doc.nodes ?? []),
      },
      frontmatter: doc.frontmatter ?? {},
      variables:   doc.variables   ?? {},
      mathIndex:   doc.mathIndex   ?? {},
      footnotes:   _serializeFootnotes(doc.footnotes ?? {}),
      references:  doc.references  ?? {},
      nodes:       omitInline || omitAST
        ? _stripNodes(doc.nodes ?? [], { omitInline, omitAST })
        : doc.nodes ?? [],
    };

    return pretty
      ? JSON.stringify(exported, _replacer, 2)
      : JSON.stringify(exported, _replacer);
  },

  /**
   * Export and trigger browser download.
   * @param {object} doc
   * @param {object} [options]
   */
  download(doc, options = {}) {
    const json     = this.export(doc, options);
    const title    = doc.frontmatter?.title ?? 'document';
    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-ast.json`;
    downloadFile(filename, json, 'application/json');
    logger.info('JSON download triggered:', filename);
  },

  /**
   * Export only specific node types (for partial AST inspection).
   * @param {object}   doc
   * @param {string[]} types — ZOLTONodeType values to include
   * @returns {string}
   */
  exportNodeTypes(doc, types) {
    const typeSet = new Set(types);
    const filtered = _filterByType(doc.nodes ?? [], typeSet);
    return JSON.stringify({
      _meta: {
        generator: 'Zolto',
        version:   '8.1.0',
        exportedAt: new Date().toISOString(),
        filter: types,
      },
      nodes: filtered,
    }, _replacer, 2);
  },

  /**
   * Parse a previously exported JSON string back into a Document object.
   * Note: the result is NOT re-validated or re-transformed — it is a
   * raw data structure. Pass through ZoltoValidator/ZoltoTransformer
   * if you need a fully resolved document.
   * @param {string} json
   * @returns {object}
   */
  parse(json) {
    try {
      const data = JSON.parse(json);
      if (!data.nodes) throw new Error('Missing "nodes" field — not a Zolto AST export');
      return {
        type:        'Document',
        frontmatter: data.frontmatter  ?? {},
        variables:   data.variables    ?? {},
        mathIndex:   data.mathIndex    ?? {},
        footnotes:   data.footnotes    ?? {},
        references:  data.references   ?? {},
        nodes:       data.nodes        ?? [],
        _imported:   true,
      };
    } catch (err) {
      logger.error('JSON parse failed:', err);
      throw err;
    }
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * JSON.stringify replacer — strips internal-only fields.
 * @param {string} key
 * @param {any}    value
 * @returns {any}
 */
function _replacer(key, value) {
  // Strip private transformer metadata
  if (key === '_var')      return undefined;
  if (key === '_mcqPart')  return undefined;
  if (key === '_slot')     return undefined;
  if (key === '_imported') return undefined;
  if (key === 'flags')     return undefined; // inline scanner flags (runtime only)
  return value;
}

/**
 * Count total words across all paragraph text in the document.
 * @param {object} doc
 * @returns {number}
 */
function _countWords(doc) {
  let count = 0;
  const walk = (nodes) => {
    for (const n of nodes ?? []) {
      if (!n) continue;
      if (typeof n.text === 'string') {
        count += n.text.trim() === '' ? 0 : n.text.trim().split(/\s+/).length;
      }
      if (Array.isArray(n.children)) walk(n.children);
      if (Array.isArray(n.slides))   walk(n.slides);
      if (Array.isArray(n.tabs))     walk(n.tabs);
    }
  };
  walk(doc.nodes);
  return count;
}

/**
 * Count total AST nodes.
 * @param {object[]} nodes
 * @returns {number}
 */
function _countNodes(nodes) {
  let count = 0;
  const walk = (ns) => {
    for (const n of ns ?? []) {
      if (!n) continue;
      count++;
      if (Array.isArray(n.children)) walk(n.children);
      if (Array.isArray(n.slides))   walk(n.slides);
      if (Array.isArray(n.tabs))     walk(n.tabs);
      if (Array.isArray(n.options))  walk(n.options);
    }
  };
  walk(nodes);
  return count;
}

/**
 * Serialize footnote map to an array for cleaner JSON output.
 * @param {Record<string, object>} footnotes
 * @returns {object[]}
 */
function _serializeFootnotes(footnotes) {
  return Object.values(footnotes)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    .map(fn => ({
      label:  fn.label,
      number: fn.number,
      text:   fn.text ?? '',
      id:     fn.id,
    }));
}

/**
 * Recursively strip inline arrays and/or Math AST from nodes.
 * Used when `omitInline` or `omitAST` options are set.
 * @param {object[]} nodes
 * @param {{ omitInline: boolean, omitAST: boolean }} opts
 * @returns {object[]}
 */
function _stripNodes(nodes, opts) {
  return nodes.map(node => {
    if (!node) return node;
    const stripped = { ...node };

    if (opts.omitInline && 'inline' in stripped) {
      delete stripped.inline;
    }
    if (opts.omitAST && 'ast' in stripped) {
      delete stripped.ast;
    }

    if (Array.isArray(stripped.children)) {
      stripped.children = _stripNodes(stripped.children, opts);
    }
    if (Array.isArray(stripped.slides)) {
      stripped.slides = _stripNodes(stripped.slides, opts);
    }
    if (Array.isArray(stripped.tabs)) {
      stripped.tabs = _stripNodes(stripped.tabs, opts);
    }
    if (Array.isArray(stripped.options)) {
      stripped.options = _stripNodes(stripped.options, opts);
    }

    return stripped;
  });
}

/**
 * Filter nodes (and their descendants) by type.
 * @param {object[]} nodes
 * @param {Set<string>} types
 * @returns {object[]}
 */
function _filterByType(nodes, types) {
  const result = [];
  const walk = (ns) => {
    for (const n of ns ?? []) {
      if (!n) continue;
      if (types.has(n.type)) result.push(n);
      if (Array.isArray(n.children)) walk(n.children);
      if (Array.isArray(n.slides))   walk(n.slides);
      if (Array.isArray(n.tabs))     walk(n.tabs);
    }
  };
  walk(nodes);
  return result;
}
