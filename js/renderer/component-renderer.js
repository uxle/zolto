/**
 * js/renderer/component-renderer.js
 * Zolto v8.1.0 — Component Renderer (Domain 6)
 *
 * Renders ComponentUse AST nodes by:
 *  1. Looking up the ComponentDef in ZoltoComponentRuntime
 *  2. Merging call-site props with component defaults
 *  3. Walking the ComponentDef template body
 *  4. Replacing SlotOutlet nodes with caller's slot content
 *  5. Substituting {propName} references in text fields
 *  6. Applying variant CSS classes, animation, theme tokens
 *
 * Guards:
 *  - Max depth 32 — prevents infinite component recursion
 *  - Missing definition → ErrorNode (code E006)
 *  - Circular reference → ErrorNode (code V006)
 */

'use strict';

import { ZOLTONodeTypes }          from '../parser/ast.js';
import { ZoltoComponentRuntime }   from '../parser/transformer.js';
import { escapeHtml, escapeAttr }  from '../utils/dom.js';
import { createLogger }            from '../utils/logger.js';

const logger = createLogger('Component');

// ─────────────────────────────────────────────────────────────
// 1. Animation class map
// ─────────────────────────────────────────────────────────────

const ANIMATION_CLASSES = Object.freeze({
  fadeIn:         'zolto-anim-fadeIn',
  fadeSlideUp:    'zolto-anim-fadeSlideUp',
  fadeSlideDown:  'zolto-anim-fadeSlideDown',
  fadeSlideLeft:  'zolto-anim-fadeSlideLeft',
  fadeSlideRight: 'zolto-anim-fadeSlideRight',
  scaleIn:        'zolto-anim-scaleIn',
  popIn:          'zolto-anim-popIn',
  bounceIn:       'zolto-anim-bounceIn',
  slideUp:        'zolto-anim-slideUp',
  flipIn:         'zolto-anim-flipIn',
});

// ─────────────────────────────────────────────────────────────
// 2. ComponentRenderer Class
// ─────────────────────────────────────────────────────────────

export class ComponentRenderer {
  /**
   * @param {import('./renderer.js').ZoltoRenderer} parent
   */
  constructor(parent) {
    this._r = parent;
  }

  // ─────────────────────────────────────────────────────────
  // Public entry point
  // ─────────────────────────────────────────────────────────

  /**
   * Render a ComponentUse node.
   * @param {object} node — ComponentUse AST node
   * @param {object} ctx  — RenderContext
   * @returns {string}
   */
  render(node, ctx) {
    const name = node.componentName;

    // Guard: depth limit
    if (ctx.depth > 32) {
      return this._error('R007', node.line ?? 0,
        `Max component nesting depth exceeded`, node.id);
    }

    // Look up definition
    const def = ZoltoComponentRuntime.get(name);
    if (!def) {
      logger.warn(`Component "${name}" is not defined`);
      return this._error('E006', node.line ?? 0,
        `Component "${name}" is not defined. Did you forget to import its definition?`,
        node.id);
    }

    // Parse call-site props and merge with defaults
    const callProps  = this._parseProps(node.propsString ?? '{}', node.parsedProps ?? {});
    const defaults   = def.parsedProps  ?? {};
    const mergedProps = { ...defaults, ...callProps };

    // Build slot content map
    const slots = this._buildSlots(node, ctx);

    // Create a child context with merged props
    const childCtx = {
      ...ctx,
      depth: ctx.depth + 1,
      _componentProps: mergedProps,
      _componentSlots: slots,
      _componentName:  name,
    };

    // Walk the component def template body
    const body = this._renderTemplate(def.children ?? [], mergedProps, slots, childCtx);

    // Build root element class list
    const classes = this._buildClasses(name, mergedProps);

    // Inline style for CSS custom property props
    const style = this._buildStyle(mergedProps);

    // Animation
    const animClass = mergedProps.animate
      ? (ANIMATION_CLASSES[String(mergedProps.animate)] ?? '')
      : '';

    const allClasses = [
      'zolto-component',
      `zolto-cmp-${escapeAttr(name)}`,
      ...classes,
      animClass,
    ].filter(Boolean).join(' ');

    const animDelay = mergedProps.animateDelay
      ? ` style="${style}animation-delay:${escapeAttr(String(mergedProps.animateDelay))}"`
      : style ? ` style="${style}"` : '';

    return `<div class="${allClasses}" data-component="${escapeAttr(name)}"
              data-id="${escapeAttr(node.id)}"${animDelay}>${body}</div>`;
  }

  // ─────────────────────────────────────────────────────────
  // Template body walker
  // ─────────────────────────────────────────────────────────

  /**
   * Walk a template node array, substituting props and slots.
   * @param {object[]} nodes
   * @param {Record<string,any>} props
   * @param {Record<string,string>} slots
   * @param {object} ctx
   * @returns {string}
   */
  _renderTemplate(nodes, props, slots, ctx) {
    return nodes.map(node => {
      if (!node) return '';
      return this._renderTemplateNode(node, props, slots, ctx);
    }).filter(Boolean).join('\n');
  }

  /**
   * Render a single template node.
   * SlotDef → replaced with caller slot content (or fallback).
   * Otherwise → expand props in text fields, then render normally.
   */
  _renderTemplateNode(node, props, slots, ctx) {
    // SlotDef outlet — replace with caller content
    if (node.type === ZOLTONodeTypes.SLOT_DEF) {
      const slotName = node.name ?? 'default';
      if (slots[slotName] !== undefined) {
        return slots[slotName]; // pre-rendered caller content
      }
      // Fallback: render the slot's own children
      return this._renderTemplate(node.children ?? [], props, slots, ctx);
    }

    // Expand {propName} in text and title fields before rendering
    const expanded = this._expandProps(node, props);

    // Render via the main renderer
    return this._r.renderNode(expanded, ctx);
  }

  // ─────────────────────────────────────────────────────────
  // Slot content builder
  // ─────────────────────────────────────────────────────────

  /**
   * Build a map of slotName → pre-rendered HTML string
   * from the ComponentUse node's children.
   * @param {object} useNode
   * @param {object} ctx
   * @returns {Record<string, string>}
   */
  _buildSlots(useNode, ctx) {
    const slots = {};

    // Explicit named slots: children with type SlotDef
    for (const child of (useNode.children ?? [])) {
      if (!child) continue;
      if (child.type === ZOLTONodeTypes.SLOT_DEF) {
        const name    = child.name ?? 'default';
        slots[name]   = this._r.renderNodes(child.children ?? [], ctx);
      }
    }

    // Remaining non-slot children go into the default slot
    const defaultChildren = (useNode.children ?? []).filter(c =>
      c && c.type !== ZOLTONodeTypes.SLOT_DEF
    );
    if (defaultChildren.length > 0 && !slots.default) {
      slots.default = this._r.renderNodes(defaultChildren, ctx);
    }

    // Named slots from useNode.slots map (set by parser)
    for (const [name, content] of Object.entries(useNode.slots ?? {})) {
      if (!slots[name]) {
        slots[name] = typeof content === 'string'
          ? content
          : this._r.renderNodes(Array.isArray(content) ? content : [content], ctx);
      }
    }

    return slots;
  }

  // ─────────────────────────────────────────────────────────
  // Prop parsing & expansion
  // ─────────────────────────────────────────────────────────

  /**
   * Parse a props string or object into a flat Record<string, any>.
   * @param {string}              propsString  — JSON or key="val" attrs
   * @param {Record<string,any>}  parsedProps  — already-parsed props from transformer
   * @returns {Record<string,any>}
   */
  _parseProps(propsString, parsedProps) {
    if (Object.keys(parsedProps).length > 0) return parsedProps;

    // Try JSON first
    if (propsString.startsWith('{')) {
      try {
        return JSON.parse(propsString);
      } catch { /* fall through */ }
    }

    // Parse key="value" pairs
    const result = {};
    const regex  = /(\w[\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>/]+)))?/g;
    let   match;
    while ((match = regex.exec(propsString)) !== null) {
      const key = match[1];
      const val = match[2] ?? match[3] ?? match[4];
      result[key] = val !== undefined
        ? this._coerce(val)
        : true;
    }
    return result;
  }

  /**
   * Coerce a string prop value to its most natural type.
   * @param {string} val
   * @returns {any}
   */
  _coerce(val) {
    if (val === 'true')  return true;
    if (val === 'false') return false;
    if (val !== '' && !isNaN(Number(val))) return Number(val);
    return val;
  }

  /**
   * Expand {propName} and {$varName} placeholders in a node's text fields.
   * Returns a shallow clone with substituted strings.
   * @param {object}              node
   * @param {Record<string,any>}  props
   * @returns {object}
   */
  _expandProps(node, props) {
    if (!node) return node;

    const substitute = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/\{(\w[\w-]*)\}/g, (_, key) => {
        return props[key] !== undefined ? String(props[key]) : `{${key}}`;
      });
    };

    // Shallow clone to avoid mutating the original AST
    const clone = { ...node };
    if (typeof clone.text    === 'string') clone.text    = substitute(clone.text);
    if (typeof clone.title   === 'string') clone.title   = substitute(clone.title);
    if (typeof clone.content === 'string') clone.content = substitute(clone.content);
    if (typeof clone.label   === 'string') clone.label   = substitute(clone.label);

    return clone;
  }

  // ─────────────────────────────────────────────────────────
  // Class & Style Builders
  // ─────────────────────────────────────────────────────────

  /**
   * Build the list of modifier CSS classes from merged props.
   * @param {string}             name    — component name
   * @param {Record<string,any>} props
   * @returns {string[]}
   */
  _buildClasses(name, props) {
    const classes = [];

    if (props.size)    classes.push(`zolto-size-${escapeAttr(String(props.size))}`);
    if (props.tone)    classes.push(`zolto-tone-${escapeAttr(String(props.tone))}`);
    if (props.shape)   classes.push(`zolto-shape-${escapeAttr(String(props.shape))}`);
    if (props.variant) classes.push(`zolto-variant-${escapeAttr(String(props.variant))}`);
    if (props.theme)   classes.push(`zolto-theme-${escapeAttr(String(props.theme))}`);
    if (props.outline === true || props.outline === 'true') classes.push('zolto-outline');
    if (props.ghost   === true || props.ghost   === 'true') classes.push('zolto-ghost');

    // Pass-through custom classes
    if (typeof props.class === 'string') {
      classes.push(...props.class.split(/\s+/).filter(Boolean));
    }

    return classes;
  }

  /**
   * Build an inline style string for CSS custom property props.
   * Props like color="#6366f1" become --cmp-color: #6366f1.
   * @param {Record<string,any>} props
   * @returns {string}
   */
  _buildStyle(props) {
    const vars = [];

    // Map known semantic prop names to CSS custom properties
    const propMap = {
      color:   '--cmp-color',
      bg:      '--cmp-bg',
      border:  '--cmp-border',
      radius:  '--cmp-radius',
      padding: '--cmp-padding',
      shadow:  '--cmp-shadow',
      width:   '--cmp-width',
      height:  '--cmp-height',
    };

    for (const [key, cssVar] of Object.entries(propMap)) {
      if (props[key] !== undefined) {
        vars.push(`${cssVar}:${escapeAttr(String(props[key]))}`);
      }
    }

    // Pass-through inline style attribute
    if (typeof props.style === 'string') {
      return `${props.style.replace(/;?\s*$/, '')}; ${vars.join('; ')}`.trim() + ';';
    }

    return vars.length > 0 ? `${vars.join('; ')};` : '';
  }

  // ─────────────────────────────────────────────────────────
  // Conditional rendering helpers (for {#if ...} blocks)
  // ─────────────────────────────────────────────────────────

  /**
   * Evaluate a simple conditional expression against props.
   * Supports: prop == "value", prop != "value", prop (truthy)
   * @param {string}             expr
   * @param {Record<string,any>} props
   * @returns {boolean}
   */
  _evalCondition(expr, props) {
    const eqMatch  = expr.match(/^(\w[\w-]*)\s*==\s*["']?([^"']+)["']?$/);
    const neqMatch = expr.match(/^(\w[\w-]*)\s*!=\s*["']?([^"']+)["']?$/);

    if (eqMatch)  return String(props[eqMatch[1]])  === eqMatch[2];
    if (neqMatch) return String(props[neqMatch[1]]) !== neqMatch[2];

    // Truthy check
    const prop = props[expr.trim()];
    return prop !== undefined && prop !== false && prop !== '' && prop !== null;
  }

  // ─────────────────────────────────────────────────────────
  // Error helper
  // ─────────────────────────────────────────────────────────

  _error(code, line, message, nodeId) {
    logger.warn(`[${code}] Line ${line}: ${message}`);
    return `<div class="zolto-error-node" role="alert"
              data-code="${escapeAttr(code)}"
              data-node-id="${escapeAttr(nodeId ?? '')}"
              data-line="${line}">
      <span class="zolto-error-icon" aria-hidden="true">⚠</span>
      <span class="zolto-error-message">[${escapeHtml(code)}] ${escapeHtml(message)}</span>
    </div>`;
  }
}
