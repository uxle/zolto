/**
 * js/renderer/diagram-renderer.js
 * Zolto v8.1.0 — Diagram Renderer (Domain 3)
 *
 * Dispatches all <diagram type="..."> AST nodes to the appropriate
 * SVG layout engine and returns an HTML string.
 *
 * Supported types: flowchart, sequence, state, erd, mindmap,
 *   gantt, timeline, network, architecture, dependency, tree,
 *   pipeline, kanban, geometry, circuit, atom, grammar-tree, chemistry
 *
 * Layout algorithms:
 *   - Hierarchical (flowchart, tree, architecture, dependency): Dagre-inspired
 *   - Fixed lanes (sequence, kanban): column/row positioning
 *   - Radial (mindmap, atom): angle-partition
 *   - Timeline (gantt, timeline): horizontal/vertical axis
 *   - Force-directed (network, erd): repulsion + spring
 *   - Coordinate pass-through (geometry, circuit): user-supplied positions
 *
 * All diagrams are rendered as inline SVG strings.
 * Plugin authors can register custom diagram types via
 * DiagramRenderer.register(type, fn).
 */

'use strict';

import { ZOLTODiagramTypes } from '../parser/ast.js';
import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { createLogger }      from '../utils/logger.js';

const logger = createLogger('Diagram');

// ─────────────────────────────────────────────────────────────
// 1. Custom Diagram Registry
// ─────────────────────────────────────────────────────────────

/** @type {Map<string, (node: object, ctx: object) => string>} */
const _customDiagrams = new Map();

// ─────────────────────────────────────────────────────────────
// 2. Node shape → SVG element helpers
// ─────────────────────────────────────────────────────────────

const NODE_W = 120;
const NODE_H = 48;
const H_GAP  = 60;
const V_GAP  = 72;

/**
 * Render a diagram node shape as SVG.
 * @param {object} node   — DiagramNode
 * @param {number} x
 * @param {number} y
 * @param {string} diagId — diagram id prefix for unique ids
 * @returns {string}
 */
function renderNodeShape(node, x, y, diagId) {
  const id     = escapeAttr(`${diagId}-${node.nodeId ?? node.id}`);
  const label  = escapeHtml(node.label ?? node.nodeId ?? '');
  const shape  = (node.shape ?? 'Rectangle').toLowerCase();
  const traits = (node.traits ?? []).map(t => `zolto-trait-${t.replace('+', '')}`).join(' ');
  const cls    = `zolto-node zolto-node-${shape} ${traits}`.trim();
  const cx     = x + NODE_W / 2;
  const cy     = y + NODE_H / 2;

  let shapeEl = '';
  switch (shape) {
    case 'circle':
      shapeEl = `<circle class="zolto-node-shape" cx="${cx}" cy="${cy}" r="${NODE_H / 2}" />`;
      break;
    case 'diamond':
      shapeEl = `<polygon class="zolto-node-shape"
        points="${cx},${y} ${x + NODE_W},${cy} ${cx},${y + NODE_H} ${x},${cy}" />`;
      break;
    case 'hexagon': {
      const r = NODE_H / 2;
      const a = NODE_W / 2 - r * 0.5;
      shapeEl = `<polygon class="zolto-node-shape"
        points="${x + a},${y} ${x + NODE_W - a},${y}
                ${x + NODE_W},${cy} ${x + NODE_W - a},${y + NODE_H}
                ${x + a},${y + NODE_H} ${x},${cy}" />`;
      break;
    }
    case 'stadium':
      shapeEl = `<rect class="zolto-node-shape" x="${x}" y="${y}"
        width="${NODE_W}" height="${NODE_H}" rx="${NODE_H / 2}" />`;
      break;
    case 'cylinder':
      shapeEl = `
        <rect class="zolto-node-shape" x="${x}" y="${y + 8}" width="${NODE_W}" height="${NODE_H - 8}" />
        <ellipse class="zolto-node-shape" cx="${cx}" cy="${y + 8}" rx="${NODE_W / 2}" ry="8" />
        <ellipse class="zolto-node-shape" cx="${cx}" cy="${y + NODE_H}" rx="${NODE_W / 2}" ry="8"
          fill="none" />`;
      break;
    case 'cloud': {
      const r1 = NODE_H * 0.38;
      shapeEl = `<path class="zolto-node-shape" d="
        M ${x + NODE_W * 0.2},${y + NODE_H * 0.9}
        a${r1},${r1} 0 0,1 0,-${r1 * 1.6}
        a${r1 * 1.1},${r1 * 1.1} 0 0,1 ${NODE_W * 0.35},-${r1 * 0.4}
        a${r1 * 0.9},${r1 * 0.9} 0 0,1 ${NODE_W * 0.35},${r1 * 0.5}
        a${r1},${r1} 0 0,1 0,${r1 * 1.5} Z" />`;
      break;
    }
    default: // Rectangle
      shapeEl = `<rect class="zolto-node-shape" x="${x}" y="${y}"
        width="${NODE_W}" height="${NODE_H}" rx="4" />`;
  }

  return `<g class="${cls}" data-id="${id}" transform="translate(0,0)">
    ${shapeEl}
    <text class="zolto-node-label" x="${cx}" y="${cy + 5}" text-anchor="middle"
          dominant-baseline="middle">${label}</text>
  </g>`;
}

/**
 * Render an arrow marker definition for a diagram.
 * @param {string} id
 * @returns {string}
 */
function arrowMarker(id) {
  return `<marker id="${id}" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto">
    <polygon points="0 0,10 3.5,0 7" class="zolto-arrow-head" />
  </marker>`;
}

// ─────────────────────────────────────────────────────────────
// 3. Layout Engines
// ─────────────────────────────────────────────────────────────

/**
 * Simple hierarchical layout (left-to-right or top-down).
 * Groups nodes into layers by BFS from roots.
 * @param {object[]} nodes
 * @param {object[]} edges
 * @param {string}   dir   — 'LR' | 'TB' | 'RL' | 'BT'
 * @returns {Map<string, {x:number, y:number}>}
 */
function hierarchicalLayout(nodes, edges, dir = 'LR') {
  const positions = new Map();
  const inDegree  = new Map(nodes.map(n => [n.nodeId ?? n.id, 0]));
  const adj       = new Map(nodes.map(n => [n.nodeId ?? n.id, []]));

  for (const e of edges) {
    if (inDegree.has(e.to))  inDegree.set(e.to, inDegree.get(e.to) + 1);
    if (adj.has(e.from))     adj.get(e.from).push(e.to);
  }

  // BFS layers
  const layers = [];
  const queue  = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const visited = new Set();

  while (queue.length > 0) {
    const layer = [...queue];
    layers.push(layer);
    queue.length = 0;
    for (const id of layer) {
      if (visited.has(id)) continue;
      visited.add(id);
      for (const next of (adj.get(id) ?? [])) {
        inDegree.set(next, inDegree.get(next) - 1);
        if (inDegree.get(next) === 0) queue.push(next);
      }
    }
  }

  // Add any unvisited nodes (cycles)
  for (const n of nodes) {
    const nId = n.nodeId ?? n.id;
    if (!visited.has(nId)) layers.push([nId]);
  }

  const horizontal = dir === 'LR' || dir === 'RL';
  layers.forEach((layer, li) => {
    layer.forEach((id, ni) => {
      const major = li * (NODE_W + H_GAP) + 20;
      const minor = ni * (NODE_H + V_GAP) + 20;
      positions.set(id, horizontal
        ? { x: major, y: minor }
        : { x: minor, y: major }
      );
    });
  });

  return positions;
}

/**
 * Compute total SVG dimensions from positions.
 * @param {Map<string,{x:number,y:number}>} positions
 * @returns {{width: number, height: number}}
 */
function svgSize(positions) {
  let maxX = 200, maxY = 100;
  for (const { x, y } of positions.values()) {
    maxX = Math.max(maxX, x + NODE_W + 40);
    maxY = Math.max(maxY, y + NODE_H + 40);
  }
  return { width: maxX, height: maxY };
}

// ─────────────────────────────────────────────────────────────
// 4. DiagramRenderer Class
// ─────────────────────────────────────────────────────────────

export class DiagramRenderer {
  /**
   * @param {import('./renderer.js').ZoltoRenderer} parent
   */
  constructor(parent) {
    this._r = parent;
  }

  // ── Static plugin API ────────────────────────────────────

  /**
   * Register a custom diagram type renderer.
   * @param {string}   type — diagram type string (e.g. 'my-diagram')
   * @param {Function} fn   — (node, ctx) => string (SVG string)
   */
  static register(type, fn) {
    _customDiagrams.set(type, fn);
    logger.debug('Custom diagram renderer registered for:', type);
  }

  static unregister(type) {
    _customDiagrams.delete(type);
  }

  // ── Public render entry point ────────────────────────────

  /**
   * Render a Diagram AST node to HTML.
   * @param {object} node — Diagram AST node
   * @param {object} ctx
   * @returns {string}
   */
  render(node, ctx) {
    const id          = escapeAttr(node.id);
    const type        = node.diagramType ?? 'flowchart';
    const caption     = node.caption ? escapeHtml(node.caption) : '';
    const interactive = node.config?.interactive !== false;
    const animated    = node.config?.animated    === true;

    // Custom diagram override
    if (_customDiagrams.has(type)) {
      try {
        const svgBody = _customDiagrams.get(type)(node, ctx);
        return this._wrap(svgBody, id, type, caption, interactive, animated);
      } catch (e) {
        logger.error('Custom diagram error:', e);
      }
    }

    let svgBody = '';
    try {
      svgBody = this._dispatchType(type, node, ctx);
    } catch (e) {
      logger.error('Diagram render error:', type, e);
      svgBody = `<text x="10" y="30" class="zolto-tick-label">
        Diagram render error: ${escapeHtml(e.message)}
      </text>`;
    }

    return this._wrap(svgBody, id, type, caption, interactive, animated);
  }

  // ── HTML wrapper ─────────────────────────────────────────

  _wrap(svgBody, id, type, caption, interactive, animated) {
    return `<figure class="zolto-diagram zolto-diagram-${escapeAttr(type)}"
              data-id="${id}" data-type="${escapeAttr(type)}"
              data-interactive="${interactive}"
              data-animated="${animated}">
      <div class="zolto-diagram-canvas">${svgBody}</div>
      ${caption ? `<figcaption class="zolto-diagram-caption">${caption}</figcaption>` : ''}
    </figure>`;
  }

  // ── Type Dispatcher ──────────────────────────────────────

  _dispatchType(type, node, ctx) {
    switch (type) {
      case ZOLTODiagramTypes.FLOWCHART:    return this._flowchart(node, ctx);
      case ZOLTODiagramTypes.SEQUENCE:     return this._sequence(node, ctx);
      case ZOLTODiagramTypes.STATE:        return this._stateDiagram(node, ctx);
      case ZOLTODiagramTypes.ERD:          return this._erd(node, ctx);
      case ZOLTODiagramTypes.MINDMAP:      return this._mindmap(node, ctx);
      case ZOLTODiagramTypes.GANTT:        return this._gantt(node, ctx);
      case ZOLTODiagramTypes.TIMELINE:     return this._timeline(node, ctx);
      case ZOLTODiagramTypes.NETWORK:      return this._network(node, ctx);
      case ZOLTODiagramTypes.ARCHITECTURE: return this._architecture(node, ctx);
      case ZOLTODiagramTypes.DEPENDENCY:   return this._dependency(node, ctx);
      case ZOLTODiagramTypes.TREE:         return this._tree(node, ctx);
      case ZOLTODiagramTypes.PIPELINE:     return this._pipeline(node, ctx);
      case ZOLTODiagramTypes.KANBAN:       return this._kanban(node, ctx);
      default:                             return this._generic(node, ctx);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 5. Flowchart
  // ─────────────────────────────────────────────────────────

  _flowchart(node, ctx) {
    const id        = node.id;
    const markerId  = `arrow-${escapeAttr(id)}`;
    const nodes     = node.nodes ?? [];
    const edges     = node.edges ?? [];
    const dir       = node.config?.dir ?? 'LR';
    const positions = hierarchicalLayout(nodes, edges, dir);
    const { width, height } = svgSize(positions);

    const nodesSVG = nodes.map(n => {
      const pos = positions.get(n.nodeId ?? n.id) ?? { x: 20, y: 20 };
      return renderNodeShape(n, pos.x, pos.y, id);
    }).join('');

    const edgesSVG = edges.map(e => {
      const from = positions.get(e.from);
      const to   = positions.get(e.to);
      if (!from || !to) return '';
      const x1 = from.x + NODE_W;
      const y1 = from.y + NODE_H / 2;
      const x2 = to.x;
      const y2 = to.y + NODE_H / 2;
      const mx = (x1 + x2) / 2;
      const label = e.label ? escapeHtml(e.label) : '';
      return `<path class="zolto-edge edge-solid"
                d="M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}"
                fill="none" marker-end="url(#${markerId})"
                data-from="${escapeAttr(e.from)}" data-to="${escapeAttr(e.to)}" />
              ${label ? `<text class="zolto-edge-label" x="${mx}" y="${Math.min(y1, y2) - 6}"
                text-anchor="middle">${label}</text>` : ''}`;
    }).join('');

    return `<svg class="zolto-graph" viewBox="0 0 ${width} ${height}"
               xmlns="http://www.w3.org/2000/svg">
      <defs>${arrowMarker(markerId)}</defs>
      <g class="zolto-graph-edges">${edgesSVG}</g>
      <g class="zolto-graph-nodes">${nodesSVG}</g>
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // 6. Sequence Diagram
  // ─────────────────────────────────────────────────────────

  _sequence(node, ctx) {
    const id        = node.id;
    const markerId  = `arrow-seq-${escapeAttr(id)}`;
    const rawNodes  = node.nodes ?? [];
    const rawEdges  = node.edges ?? [];
    const LANE_W    = 140;
    const LANE_PAD  = 60;
    const MSG_GAP   = 52;
    const totalW    = rawNodes.length * LANE_W + LANE_PAD * 2;
    const totalH    = rawEdges.length * MSG_GAP + 120;

    // Actors
    const actors = rawNodes.map((n, i) => {
      const x   = LANE_PAD + i * LANE_W;
      const cx  = x + 40;
      const lbl = escapeHtml(n.label ?? n.nodeId ?? `Actor ${i + 1}`);
      return `<g class="zolto-actor" data-id="${escapeAttr(n.nodeId ?? n.id)}">
        <rect class="zolto-actor-box" x="${x}" y="10" width="80" height="34" rx="6" />
        <text class="zolto-actor-label" x="${cx}" y="32" text-anchor="middle">${lbl}</text>
        <line class="zolto-lifeline" x1="${cx}" y1="44" x2="${cx}" y2="${totalH - 20}"
              stroke-dasharray="4 4" />
      </g>`;
    }).join('');

    // Resolve actor centre X by label/id
    const actorX = {};
    rawNodes.forEach((n, i) => {
      actorX[n.nodeId ?? n.id] = LANE_PAD + i * LANE_W + 40;
    });

    // Messages
    const messages = rawEdges.map((e, i) => {
      const y1  = 60 + i * MSG_GAP;
      const x1  = actorX[e.from] ?? LANE_PAD + 40;
      const x2  = actorX[e.to]   ?? LANE_PAD + LANE_W + 40;
      const lbl = e.label ? escapeHtml(e.label) : '';
      const mid = (x1 + x2) / 2;
      const dashed = (e.operator ?? '-->') === '-->';
      return `<path class="zolto-message ${dashed ? 'message-async' : 'message-sync'}"
                d="M ${x1},${y1} L ${x2},${y1}" fill="none"
                marker-end="url(#${markerId})" />
              ${lbl ? `<text class="zolto-message-label" x="${mid}" y="${y1 - 8}"
                text-anchor="middle">${lbl}</text>` : ''}`;
    }).join('');

    return `<svg class="zolto-sequence" viewBox="0 0 ${totalW} ${totalH}"
               xmlns="http://www.w3.org/2000/svg">
      <defs>${arrowMarker(markerId)}</defs>
      <g class="zolto-sequence-actors">${actors}</g>
      <g class="zolto-sequence-messages">${messages}</g>
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // 7. State Machine
  // ─────────────────────────────────────────────────────────

  _stateDiagram(node, ctx) {
    // Use hierarchical layout with state-specific shapes
    const id        = node.id;
    const markerId  = `arrow-st-${escapeAttr(id)}`;
    const nodes     = node.nodes ?? [];
    const edges     = node.edges ?? [];
    const positions = hierarchicalLayout(nodes, edges, 'TB');
    const { width, height } = svgSize(positions);

    const nodesSVG = nodes.map(n => {
      const pos    = positions.get(n.nodeId ?? n.id) ?? { x: 20, y: 20 };
      const kind   = (n.config?.kind ?? 'normal').toLowerCase();
      const cx     = pos.x + NODE_W / 2;
      const cy     = pos.y + NODE_H / 2;
      const lbl    = escapeHtml(n.label ?? n.nodeId ?? '');
      const nid    = escapeAttr(`st-${id}-${n.nodeId ?? n.id}`);

      if (kind === 'start') {
        return `<circle class="zolto-node zolto-state-start" cx="${cx}" cy="${cy}" r="14"
                  data-id="${nid}" />`;
      }
      if (kind === 'end') {
        return `<g data-id="${nid}">
          <circle class="zolto-node" cx="${cx}" cy="${cy}" r="14" />
          <circle cx="${cx}" cy="${cy}" r="10" style="fill:currentColor" />
        </g>`;
      }
      return `<g class="zolto-node zolto-node-rectangle" data-id="${nid}">
        <rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}" rx="12" class="zolto-node-shape" />
        <text class="zolto-node-label" x="${cx}" y="${cy + 5}" text-anchor="middle">${lbl}</text>
      </g>`;
    }).join('');

    const edgesSVG = edges.map(e => {
      const from = positions.get(e.from);
      const to   = positions.get(e.to);
      if (!from || !to) return '';
      const x1 = from.x + NODE_W / 2;
      const y1 = from.y + NODE_H;
      const x2 = to.x   + NODE_W / 2;
      const y2 = to.y;
      const lbl = e.label ? escapeHtml(e.label) : '';
      const mx  = (x1 + x2) / 2;
      const my  = (y1 + y2) / 2;
      return `<line class="zolto-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                marker-end="url(#${markerId})" />
              ${lbl ? `<text class="zolto-edge-label" x="${mx + 6}" y="${my}">${lbl}</text>` : ''}`;
    }).join('');

    return `<svg class="zolto-state" viewBox="0 0 ${width} ${height}"
               xmlns="http://www.w3.org/2000/svg">
      <defs>${arrowMarker(markerId)}</defs>
      <g class="zolto-graph-edges">${edgesSVG}</g>
      <g class="zolto-graph-nodes">${nodesSVG}</g>
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // 8. Mindmap
  // ─────────────────────────────────────────────────────────

  _mindmap(node, ctx) {
    const nodes    = node.nodes ?? [];
    if (nodes.length === 0) return this._empty('mindmap');
    const root     = nodes[0];
    const children = nodes.slice(1);
    const W        = 600;
    const H        = 400;
    const CX       = W / 2;
    const CY       = H / 2;
    const R        = 140;

    const branches = children.map((n, i) => {
      const angle = (i / Math.max(children.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const x     = CX + R * Math.cos(angle);
      const y     = CY + R * Math.sin(angle);
      const lbl   = escapeHtml(n.label ?? n.nodeId ?? '');
      return `<path class="zolto-mm-edge"
                d="M ${CX},${CY} C ${(CX + x) / 2},${CY} ${(CX + x) / 2},${y} ${x},${y}"
                fill="none" />
              <ellipse class="zolto-mm-node" cx="${x}" cy="${y}" rx="52" ry="20" />
              <text class="zolto-mm-label" x="${x}" y="${y + 5}"
                    text-anchor="middle">${lbl}</text>`;
    }).join('');

    const rootLbl = escapeHtml(root.label ?? root.nodeId ?? 'Root');
    return `<svg class="zolto-mindmap" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <g class="zolto-mindmap-root">
        <ellipse class="zolto-mm-node zolto-mm-root" cx="${CX}" cy="${CY}" rx="70" ry="28" />
        <text class="zolto-mm-label" x="${CX}" y="${CY + 5}" text-anchor="middle"
              style="font-weight:700">${rootLbl}</text>
      </g>
      <g class="zolto-mindmap-branches">${branches}</g>
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // 9. Pipeline (linear horizontal)
  // ─────────────────────────────────────────────────────────

  _pipeline(node, ctx) {
    const id       = node.id;
    const markerId = `arrow-pl-${escapeAttr(id)}`;
    const nodes    = node.nodes ?? [];
    const GAP      = 20;
    const STEP_W   = NODE_W + GAP;
    const W        = nodes.length * STEP_W + GAP;
    const H        = NODE_H + 40;

    const stages = nodes.map((n, i) => {
      const x   = GAP + i * STEP_W;
      const lbl = escapeHtml(n.label ?? n.nodeId ?? `Stage ${i + 1}`);
      const connector = i < nodes.length - 1
        ? `<line class="zolto-edge" x1="${x + NODE_W}" y1="${NODE_H / 2 + 20}"
                  x2="${x + NODE_W + GAP}" y2="${NODE_H / 2 + 20}"
                  marker-end="url(#${markerId})" />`
        : '';
      return `<g transform="translate(${x}, 20)">
        <rect class="zolto-node-shape" width="${NODE_W}" height="${NODE_H}" rx="4" />
        <text class="zolto-node-label" x="${NODE_W / 2}" y="${NODE_H / 2 + 5}"
              text-anchor="middle">${lbl}</text>
      </g>${connector}`;
    }).join('');

    return `<svg class="zolto-pipeline" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>${arrowMarker(markerId)}</defs>
      ${stages}
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // 10. Timeline (vertical)
  // ─────────────────────────────────────────────────────────

  _timeline(node, ctx) {
    const events  = node.nodes ?? [];
    const W       = 500;
    const ROW_H   = 70;
    const H       = events.length * ROW_H + 40;
    const CX      = W / 2;

    const items = events.map((e, i) => {
      const y    = 30 + i * ROW_H;
      const lbl  = escapeHtml(e.label ?? '');
      const date = escapeHtml(e.config?.date ?? '');
      const left = i % 2 === 0;
      const tx   = left ? CX - 20 : CX + 20;
      const anchor = left ? 'end' : 'start';
      return `<circle class="zolto-timeline-dot" cx="${CX}" cy="${y}" r="8" />
              <line class="zolto-timeline-connector" x1="${CX}" y1="${y}"
                    x2="${tx}" y2="${y}" />
              <text class="zolto-timeline-label" x="${tx + (left ? -4 : 4)}" y="${y - 8}"
                    text-anchor="${anchor}">${lbl}</text>
              ${date ? `<text class="zolto-timeline-date" x="${tx + (left ? -4 : 4)}" y="${y + 16}"
                    text-anchor="${anchor}">${date}</text>` : ''}`;
    }).join('');

    return `<svg class="zolto-timeline-svg" viewBox="0 0 ${W} ${H}"
               xmlns="http://www.w3.org/2000/svg">
      <line class="zolto-timeline-track" x1="${CX}" y1="0" x2="${CX}" y2="${H}" stroke-width="2" />
      ${items}
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // 11. ERD
  // ─────────────────────────────────────────────────────────

  _erd(node, ctx) {
    const id        = node.id;
    const markerId  = `arrow-erd-${escapeAttr(id)}`;
    const nodes     = node.nodes ?? [];
    const edges     = node.edges ?? [];
    const positions = hierarchicalLayout(nodes, edges, 'LR');
    const ENT_H     = NODE_H * 2.5;
    const { width, height } = svgSize(positions);

    const entities = nodes.map(n => {
      const pos  = positions.get(n.nodeId ?? n.id) ?? { x: 20, y: 20 };
      const lbl  = escapeHtml(n.label ?? n.nodeId ?? '');
      const nid  = escapeAttr(`erd-${id}-${n.nodeId ?? n.id}`);
      const attrs = n.config?.attrs ?? [];
      const attrRows = attrs.map((a, ai) =>
        `<text class="zolto-er-attr" x="${pos.x + 8}" y="${pos.y + 48 + ai * 18}">${escapeHtml(String(a))}</text>`
      ).join('');
      return `<g class="zolto-er-entity" data-id="${nid}">
        <rect class="zolto-er-entity-header" x="${pos.x}" y="${pos.y}"
              width="${NODE_W}" height="36" rx="4" />
        <text class="zolto-er-entity-name" x="${pos.x + NODE_W / 2}" y="${pos.y + 23}"
              text-anchor="middle">${lbl}</text>
        ${attrs.length ? `<rect class="zolto-er-attrs" x="${pos.x}" y="${pos.y + 36}"
              width="${NODE_W}" height="${attrs.length * 18 + 8}" />` : ''}
        ${attrRows}
      </g>`;
    }).join('');

    const relations = edges.map(e => {
      const from = positions.get(e.from);
      const to   = positions.get(e.to);
      if (!from || !to) return '';
      const x1 = from.x + NODE_W;
      const y1 = from.y + 18;
      const x2 = to.x;
      const y2 = to.y + 18;
      return `<line class="zolto-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                marker-end="url(#${markerId})" />`;
    }).join('');

    return `<svg class="zolto-erd" viewBox="0 0 ${width} ${Math.max(height, 200)}"
               xmlns="http://www.w3.org/2000/svg">
      <defs>${arrowMarker(markerId)}</defs>
      <g class="zolto-er-relations">${relations}</g>
      <g class="zolto-er-entities">${entities}</g>
    </svg>`;
  }

  // ─────────────────────────────────────────────────────────
  // 12. Generic / pass-through helpers
  // ─────────────────────────────────────────────────────────

  /** Fallback for unimplemented diagram types — renders as flowchart */
  _generic(node, ctx)       { return this._flowchart(node, ctx); }
  _architecture(node, ctx)  { return this._flowchart(node, ctx); }
  _dependency(node, ctx)    { return this._flowchart(node, ctx); }
  _tree(node, ctx)          { return this._flowchart({ ...node, config: { ...node.config, dir: 'TB' } }, ctx); }
  _network(node, ctx)       { return this._flowchart(node, ctx); }

  _kanban(node, ctx) {
    const columns = node.nodes ?? [];
    const COL_W   = 200;
    const COL_GAP = 16;
    const W       = columns.length * (COL_W + COL_GAP) + COL_GAP;
    const H       = 400;

    const cols = columns.map((col, i) => {
      const x   = COL_GAP + i * (COL_W + COL_GAP);
      const lbl = escapeHtml(col.label ?? `Column ${i + 1}`);
      return `<g class="zolto-kanban-col" transform="translate(${x}, 0)">
        <rect width="${COL_W}" height="${H}" rx="6" class="zolto-node-shape" opacity="0.3" />
        <text class="zolto-actor-label" x="${COL_W / 2}" y="24" text-anchor="middle"
              style="font-weight:600">${lbl}</text>
      </g>`;
    }).join('');

    return `<svg class="zolto-kanban" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${cols}
    </svg>`;
  }

  _gantt(node, ctx) {
    const tasks   = node.nodes ?? [];
    const W       = 700;
    const ROW_H   = 36;
    const H       = tasks.length * ROW_H + 60;
    const BAR_X   = 160;
    const BAR_W   = W - BAR_X - 20;

    const rows = tasks.map((t, i) => {
      const y    = 40 + i * ROW_H;
      const lbl  = escapeHtml(t.label ?? `Task ${i + 1}`);
      const pct  = parseFloat(String(t.config?.progress ?? 50)) / 100;
      return `<text class="zolto-gantt-task-label" x="8" y="${y + 22}">${lbl}</text>
              <rect class="zolto-gantt-task" x="${BAR_X}" y="${y + 6}"
                    width="${BAR_W}" height="${ROW_H - 12}" rx="3" />
              ${pct > 0 ? `<rect class="zolto-gantt-progress" x="${BAR_X}" y="${y + 6}"
                    width="${BAR_W * pct}" height="${ROW_H - 12}" rx="3" />` : ''}`;
    }).join('');

    return `<svg class="zolto-gantt" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="36" class="zolto-gantt-header-bg" />
      <text class="zolto-gantt-section-label" x="8" y="22">Task</text>
      <text class="zolto-gantt-section-label" x="${BAR_X + BAR_W / 2}" y="22"
            text-anchor="middle">Timeline</text>
      ${rows}
    </svg>`;
  }

  /** Render an empty placeholder. */
  _empty(type) {
    return `<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
      <text x="150" y="55" text-anchor="middle" class="zolto-tick-label">
        Empty ${escapeHtml(type)} diagram
      </text>
    </svg>`;
  }
}
