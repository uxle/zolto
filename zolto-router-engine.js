/**
 * =========================================================================================
 * ZOLTO STUDIO: SVG ORCHESTRATION & UTILITIES ENGINE (Module 7 of 7)
 * Version: 8.0.0-infinity (Supernova Architecture)
 * =========================================================================================
 *
 * Covers all 6 Zolto capability domains:
 *  §1  ZoltoRouterConstants   — Frozen config: routing modes, directions, limits, themes
 *  §2  ZoltoVectorMath        — Complete vector math: bezier, spline, affine, AABB, ray
 *  §3  ZoltoPortManager       — Optimal port selection, 8-directional, multi-port
 *  §4  ZoltoPathGenerators    — Bezier · Orthogonal · Step · Straight · Self-loop · Spline
 *  §5  ZoltoBridgeEngine      — Edge/bridge intersection detection and arc injection
 *  §6  ZoltoLabelPlacer       — Mid-curve label positions with anti-overlap nudging
 *  §7  ZoltoDefsGenerator     — Full SVG <defs>: markers, filters, gradients, patterns
 *  §8  ZoltoDiagramThemer     — All diagram themes + per-node trait colour resolution
 *  §9  ZoltoSVGRouter         — Master edge routing facade (all operator types)
 *  §10 ZoltoLayoutEngine      — Flex · Grid · Absolute · Canvas · Whiteboard runtimes
 *  §11 ZoltoComponentRuntime  — Component registry, slot resolution, prop injection
 *  §12 ZoltoAnimationSystem   — Keyframe, flow-pulse, entrance, path-draw animations
 *  §13 ZoltoSnappingSystem    — Smart snapping: grid, object, guide, magnetic, distribute
 *  §14 ZoltoViewportManager   — Camera, zoom, pan, inertia, fit-to-content
 *  §15 ZoltoUtils             — EventBus, AST traversal, performance, UUID, data tools
 * =========================================================================================
 */

'use strict';

/* =========================================================================================
   §1  ROUTER CONSTANTS — single frozen source of truth for all routing parameters
   ========================================================================================= */
const ZoltoRouterConstants = Object.freeze({

    ROUTING_MODE: Object.freeze({
        BEZIER:       'bezier',
        ORTHOGONAL:   'orthogonal',
        STEP:         'step',
        STRAIGHT:     'straight',
        SPLINE:       'spline',
        ARC:          'arc',
    }),

    DIRECTION: Object.freeze({
        TOP:          'top',
        RIGHT:        'right',
        BOTTOM:       'bottom',
        LEFT:         'left',
        CENTER:       'center',
        TOP_RIGHT:    'top-right',
        TOP_LEFT:     'top-left',
        BOTTOM_RIGHT: 'bottom-right',
        BOTTOM_LEFT:  'bottom-left',
    }),

    MATH: Object.freeze({
        PI:           Math.PI,
        HALF_PI:      Math.PI / 2,
        TWO_PI:       Math.PI * 2,
        DEG_TO_RAD:   Math.PI / 180,
        RAD_TO_DEG:   180 / Math.PI,
        EPSILON:      1e-10,
        GOLDEN:       1.6180339887,
    }),

    LIMITS: Object.freeze({
        MIN_CONTROL_OFFSET:    40,
        MAX_CONTROL_OFFSET:    240,
        ORTHO_CORNER_RADIUS:   10,
        BRIDGE_JUMP_RADIUS:    7,
        DISCRETIZATION_STEPS:  32,
        SELF_LOOP_SIZE:        56,
        MIN_EDGE_CLEARANCE:    12,
        MAX_LABEL_WIDTH:       120,
        LABEL_PADDING_H:       10,
        LABEL_PADDING_V:       6,
        SNAP_THRESHOLD_PX:     8,
        MAX_SNAP_CANDIDATES:   64,
        ZOOM_MIN:              0.05,
        ZOOM_MAX:              64.0,
        ZOOM_STEP:             0.1,
        INERTIA_DECAY:         0.88,
        PAN_SPEED:             1.0,
        FIT_PADDING:           48,
    }),

    // Edge operator → visual class mapping
    OPERATOR_CLASS: Object.freeze({
        '->':   'edge-solid',
        '=>':   'edge-transition',
        '~>':   'edge-async',
        '..>':  'edge-dotted',
        '<->':  'edge-bidirectional',
        '===':  'edge-thick',
        '-->':  'edge-dashed',
        '--->': 'edge-long',
        '~~>':  'edge-wavy',
    }),

    // Edge operator → marker configuration
    OPERATOR_MARKER: Object.freeze({
        '->':   { start: '',                          end: 'url(#arrow-solid)'     },
        '=>':   { start: '',                          end: 'url(#arrow-primary)'   },
        '~>':   { start: '',                          end: 'url(#arrow-async)'     },
        '..>':  { start: '',                          end: 'url(#arrow-dotted)'    },
        '<->':  { start: 'url(#arrow-reverse)',       end: 'url(#arrow-solid)'     },
        '===':  { start: '',                          end: 'url(#arrow-thick)'     },
        '-->':  { start: '',                          end: 'url(#arrow-dashed)'    },
    }),

    // Diagram theme tokens (resolved at render-time against CSS vars)
    DIAGRAM_THEMES: Object.freeze({
        DEFAULT:   { nodeFill: 'var(--bg-panel)',   nodeStroke: 'var(--border-heavy)', text: 'var(--text-main)',  edge: 'var(--text-mute)'    },
        DARK:      { nodeFill: 'var(--bg-deep)',    nodeStroke: 'var(--border-heavy)', text: 'var(--text-main)',  edge: 'var(--text-mute)'    },
        FOREST:    { nodeFill: '#1a2e1a',           nodeStroke: '#2d5a27',             text: '#c8f7c5',           edge: '#4a9e43'              },
        OCEAN:     { nodeFill: '#0a1628',           nodeStroke: '#1e3a5f',             text: '#c5dff8',           edge: '#3d87cc'              },
        SUNSET:    { nodeFill: '#2a1520',           nodeStroke: '#7b2d42',             text: '#ffd6e0',           edge: '#e85d7b'              },
        MONO:      { nodeFill: '#f8f8f8',           nodeStroke: '#222',                text: '#111',              edge: '#666'                 },
        BLUEPRINT: { nodeFill: '#1a2744',           nodeStroke: '#2756b0',             text: '#c8d8f0',           edge: '#4e89e0'              },
    }),
});

/* =========================================================================================
   §2  VECTOR MATH ENGINE
   Complete 2D vector math: bezier, spline, affine transforms, AABB, ray-casting
   ========================================================================================= */
class ZoltoVectorMath {

    // ── Primitive operations ───────────────────────────────────────────────────────────

    static distance(p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distanceSq(p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        return dx * dx + dy * dy;
    }

    static angle(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    static midpoint(p1, p2) {
        return { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };
    }

    static lerp(p1, p2, t) {
        return { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
    }

    static project(point, angle, distance) {
        return { x: point.x + Math.cos(angle) * distance, y: point.y + Math.sin(angle) * distance };
    }

    static normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        if (len < ZoltoRouterConstants.MATH.EPSILON) return { x: 0, y: 0 };
        return { x: v.x / len, y: v.y / len };
    }

    static scale(v, s) { return { x: v.x * s, y: v.y * s }; }

    static add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }

    static sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }

    static dotProduct(v1, v2) { return v1.x * v2.x + v1.y * v2.y; }

    static crossProduct(v1, v2) { return v1.x * v2.y - v1.y * v2.x; }

    static perpendicular(v) { return { x: -v.y, y: v.x }; }

    static rotatePoint(p, origin, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const dx = p.x - origin.x, dy = p.y - origin.y;
        return { x: origin.x + dx * cos - dy * sin, y: origin.y + dx * sin + dy * cos };
    }

    // ── Segment & line intersection ────────────────────────────────────────────────────

    static lineIntersection(p1, p2, p3, p4) {
        const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (Math.abs(denom) < ZoltoRouterConstants.MATH.EPSILON) return null;
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return { x: p1.x + ua * (p2.x - p1.x), y: p1.y + ua * (p2.y - p1.y), t: ua };
        }
        return null;
    }

    static closestPointOnSegment(p, a, b) {
        const ab = this.sub(b, a), ap = this.sub(p, a);
        const t = Math.max(0, Math.min(1, this.dotProduct(ap, ab) / (this.dotProduct(ab, ab) || 1)));
        return this.add(a, this.scale(ab, t));
    }

    // ── Cubic Bézier ──────────────────────────────────────────────────────────────────

    static cubicBezierPoint(t, p0, p1, p2, p3) {
        const u = 1 - t, uu = u * u, uuu = uu * u;
        const tt = t * t, ttt = tt * t;
        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
        };
    }

    static cubicBezierDerivative(t, p0, p1, p2, p3) {
        const u = 1 - t;
        return {
            x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
            y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
        };
    }

    static cubicBezierLength(p0, p1, p2, p3, steps = 16) {
        let length = 0, prev = p0;
        for (let i = 1; i <= steps; i++) {
            const curr = this.cubicBezierPoint(i / steps, p0, p1, p2, p3);
            length += this.distance(prev, curr);
            prev = curr;
        }
        return length;
    }

    // ── Quadratic Bézier ─────────────────────────────────────────────────────────────

    static quadraticBezierPoint(t, p0, p1, p2) {
        const u = 1 - t;
        return {
            x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
            y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
        };
    }

    // ── Catmull-Rom spline through waypoints ─────────────────────────────────────────

    static catmullRomToBezier(points) {
        if (points.length < 2) return [];
        const segments = [];
        const pts = [points[0], ...points, points[points.length - 1]];
        for (let i = 1; i < pts.length - 2; i++) {
            const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
            const cp1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
            const cp2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
            segments.push({ p1, cp1, cp2, p2 });
        }
        return segments;
    }

    // ── AABB & bounding rectangles ────────────────────────────────────────────────────

    static rectsOverlap(a, b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    static rectContainsPoint(rect, p) {
        return p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
    }

    static rectCenter(rect) {
        return { x: (rect.left + rect.right) * 0.5, y: (rect.top + rect.bottom) * 0.5 };
    }

    static expandRect(rect, margin) {
        return { left: rect.left - margin, right: rect.right + margin, top: rect.top - margin, bottom: rect.bottom + margin, width: rect.width + margin * 2, height: rect.height + margin * 2 };
    }

    // ── Arc path helper for self-loops ─────────────────────────────────────────────────

    static arcPath(cx, cy, rx, ry, startAngleDeg, endAngleDeg, sweep = 1) {
        const start = startAngleDeg * ZoltoRouterConstants.MATH.DEG_TO_RAD;
        const end   = endAngleDeg   * ZoltoRouterConstants.MATH.DEG_TO_RAD;
        const x1 = cx + rx * Math.cos(start), y1 = cy + ry * Math.sin(start);
        const x2 = cx + rx * Math.cos(end),   y2 = cy + ry * Math.sin(end);
        const large = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0;
        return `M ${x1},${y1} A ${rx},${ry} 0 ${large},${sweep} ${x2},${y2}`;
    }

    // ── Affine transform helpers ──────────────────────────────────────────────────────

    static applyTransform(p, tx, ty, scale) {
        return { x: p.x * scale + tx, y: p.y * scale + ty };
    }

    static invertTransform(p, tx, ty, scale) {
        return { x: (p.x - tx) / scale, y: (p.y - ty) / scale };
    }
}

/* =========================================================================================
   §3  PORT MANAGER — optimal exit/entry port selection with 8-directional awareness
   ========================================================================================= */
class ZoltoPortManager {

    static getOptimalPorts(rectA, rectB, routingMode = ZoltoRouterConstants.ROUTING_MODE.BEZIER) {
        const cA = ZoltoVectorMath.rectCenter(rectA);
        const cB = ZoltoVectorMath.rectCenter(rectB);
        const dx = cB.x - cA.x, dy = cB.y - cA.y;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        const D = ZoltoRouterConstants.DIRECTION;
        let portA, portB;

        if (routingMode === ZoltoRouterConstants.ROUTING_MODE.ORTHOGONAL) {
            // For orthogonal routing, prefer horizontal connections when dx > dy * 1.5
            if (absDx > absDy * 1.5) {
                portA = dx > 0 ? D.RIGHT : D.LEFT;
                portB = dx > 0 ? D.LEFT  : D.RIGHT;
            } else if (absDy > absDx * 1.5) {
                portA = dy > 0 ? D.BOTTOM : D.TOP;
                portB = dy > 0 ? D.TOP    : D.BOTTOM;
            } else {
                // Diagonal — pick the longer axis
                portA = absDx > absDy ? (dx > 0 ? D.RIGHT : D.LEFT) : (dy > 0 ? D.BOTTOM : D.TOP);
                portB = absDx > absDy ? (dx > 0 ? D.LEFT : D.RIGHT)  : (dy > 0 ? D.TOP   : D.BOTTOM);
            }
        } else {
            if (absDx > absDy) {
                portA = dx > 0 ? D.RIGHT : D.LEFT;
                portB = dx > 0 ? D.LEFT  : D.RIGHT;
            } else {
                portA = dy > 0 ? D.BOTTOM : D.TOP;
                portB = dy > 0 ? D.TOP    : D.BOTTOM;
            }
        }

        return {
            fromDir:    portA,
            toDir:      portB,
            fromPoint:  this.getPortCoordinate(rectA, portA),
            toPoint:    this.getPortCoordinate(rectB, portB),
        };
    }

    static getPortCoordinate(rect, direction) {
        const D = ZoltoRouterConstants.DIRECTION;
        const mx = rect.left + rect.width  * 0.5;
        const my = rect.top  + rect.height * 0.5;
        switch (direction) {
            case D.TOP:          return { x: mx,         y: rect.top     };
            case D.BOTTOM:       return { x: mx,         y: rect.bottom  };
            case D.LEFT:         return { x: rect.left,  y: my           };
            case D.RIGHT:        return { x: rect.right, y: my           };
            case D.TOP_LEFT:     return { x: rect.left,  y: rect.top     };
            case D.TOP_RIGHT:    return { x: rect.right, y: rect.top     };
            case D.BOTTOM_LEFT:  return { x: rect.left,  y: rect.bottom  };
            case D.BOTTOM_RIGHT: return { x: rect.right, y: rect.bottom  };
            default:             return { x: mx,         y: my           };
        }
    }

    static getPortNormal(direction) {
        const D = ZoltoRouterConstants.DIRECTION;
        switch (direction) {
            case D.TOP:          return { x:  0, y: -1 };
            case D.BOTTOM:       return { x:  0, y:  1 };
            case D.LEFT:         return { x: -1, y:  0 };
            case D.RIGHT:        return { x:  1, y:  0 };
            case D.TOP_LEFT:     return { x: -1, y: -1 };
            case D.TOP_RIGHT:    return { x:  1, y: -1 };
            case D.BOTTOM_LEFT:  return { x: -1, y:  1 };
            case D.BOTTOM_RIGHT: return { x:  1, y:  1 };
            default:             return { x:  0, y:  0 };
        }
    }

    /** Get all 8 port positions for a rect — useful for smart routing */
    static getAllPorts(rect) {
        return Object.values(ZoltoRouterConstants.DIRECTION)
            .filter(d => d !== ZoltoRouterConstants.DIRECTION.CENTER)
            .map(d => ({ direction: d, point: this.getPortCoordinate(rect, d) }));
    }

    /** Choose the two closest ports between two rects (brute-force O(64)) */
    static getClosestPortPair(rectA, rectB) {
        const portsA = this.getAllPorts(rectA);
        const portsB = this.getAllPorts(rectB);
        let bestDist = Infinity, bestA = portsA[0], bestB = portsB[0];
        for (const a of portsA) {
            for (const b of portsB) {
                const d = ZoltoVectorMath.distanceSq(a.point, b.point);
                if (d < bestDist) { bestDist = d; bestA = a; bestB = b; }
            }
        }
        return { fromDir: bestA.direction, toDir: bestB.direction, fromPoint: bestA.point, toPoint: bestB.point };
    }
}

/* =========================================================================================
   §4  PATH GENERATORS
   Bezier · Orthogonal (with rounded corners) · Step · Straight · Self-loop · Spline
   ========================================================================================= */
class ZoltoPathGenerators {

    // ── Cubic Bézier ─────────────────────────────────────────────────────────────────

    static generateBezier(p1, dir1, p2, dir2) {
        const n1   = ZoltoPortManager.getPortNormal(dir1);
        const n2   = ZoltoPortManager.getPortNormal(dir2);
        const dist = Math.max(
            ZoltoRouterConstants.LIMITS.MIN_CONTROL_OFFSET,
            Math.min(ZoltoRouterConstants.LIMITS.MAX_CONTROL_OFFSET,
                ZoltoVectorMath.distance(p1, p2) * 0.42)
        );
        const cp1 = { x: p1.x + n1.x * dist, y: p1.y + n1.y * dist };
        const cp2 = { x: p2.x + n2.x * dist, y: p2.y + n2.y * dist };
        return {
            path: `M ${_f(p1.x)},${_f(p1.y)} C ${_f(cp1.x)},${_f(cp1.y)} ${_f(cp2.x)},${_f(cp2.y)} ${_f(p2.x)},${_f(p2.y)}`,
            math: { type: 'bezier', p1, cp1, cp2, p2 },
        };
    }

    // ── Orthogonal with arc-rounded corners ──────────────────────────────────────────

    static generateOrthogonal(p1, dir1, p2, dir2, radius = ZoltoRouterConstants.LIMITS.ORTHO_CORNER_RADIUS) {
        const D  = ZoltoRouterConstants.DIRECTION;
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const pts = [p1];

        if (dir1 === D.RIGHT && dir2 === D.LEFT) {
            const midX = p1.x + dx * 0.5;
            pts.push({ x: midX, y: p1.y }, { x: midX, y: p2.y });
        } else if (dir1 === D.LEFT && dir2 === D.RIGHT) {
            const midX = p1.x + dx * 0.5;
            pts.push({ x: midX, y: p1.y }, { x: midX, y: p2.y });
        } else if (dir1 === D.BOTTOM && dir2 === D.TOP) {
            const midY = p1.y + dy * 0.5;
            pts.push({ x: p1.x, y: midY }, { x: p2.x, y: midY });
        } else if (dir1 === D.TOP && dir2 === D.BOTTOM) {
            const midY = p1.y + dy * 0.5;
            pts.push({ x: p1.x, y: midY }, { x: p2.x, y: midY });
        } else {
            // L-shaped fallback
            pts.push({ x: p1.x, y: p2.y });
        }
        pts.push(p2);

        return {
            path:  this._roundedPolyline(pts, radius),
            math:  { type: 'polyline', points: pts },
        };
    }

    // ── Step (right-angle horizontal-first) ──────────────────────────────────────────

    static generateStep(p1, p2) {
        const midX = (p1.x + p2.x) * 0.5;
        const pts  = [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
        return {
            path: this._roundedPolyline(pts, ZoltoRouterConstants.LIMITS.ORTHO_CORNER_RADIUS),
            math: { type: 'step', points: pts },
        };
    }

    // ── Straight line ─────────────────────────────────────────────────────────────────

    static generateStraight(p1, p2) {
        return {
            path: `M ${_f(p1.x)},${_f(p1.y)} L ${_f(p2.x)},${_f(p2.y)}`,
            math: { type: 'line', p1, p2 },
        };
    }

    // ── Catmull-Rom spline ─────────────────────────────────────────────────────────────

    static generateSpline(waypoints) {
        if (!Array.isArray(waypoints) || waypoints.length < 2) return this.generateStraight(waypoints[0], waypoints[1]);
        const segments = ZoltoVectorMath.catmullRomToBezier(waypoints);
        if (segments.length === 0) return this.generateStraight(waypoints[0], waypoints[waypoints.length - 1]);
        let path = `M ${_f(segments[0].p1.x)},${_f(segments[0].p1.y)}`;
        for (const seg of segments) {
            path += ` C ${_f(seg.cp1.x)},${_f(seg.cp1.y)} ${_f(seg.cp2.x)},${_f(seg.cp2.y)} ${_f(seg.p2.x)},${_f(seg.p2.y)}`;
        }
        return { path, math: { type: 'spline', waypoints, segments } };
    }

    // ── Self-loop ─────────────────────────────────────────────────────────────────────

    static generateSelfLoop(rect) {
        const loopSize = ZoltoRouterConstants.LIMITS.SELF_LOOP_SIZE;
        const p1  = ZoltoPortManager.getPortCoordinate(rect, ZoltoRouterConstants.DIRECTION.RIGHT);
        const p2  = ZoltoPortManager.getPortCoordinate(rect, ZoltoRouterConstants.DIRECTION.TOP);
        const cp1 = { x: p1.x + loopSize,           y: p1.y              };
        const cp2 = { x: p2.x + loopSize * 0.3,     y: p2.y - loopSize   };
        return {
            path: `M ${_f(p1.x)},${_f(p1.y)} C ${_f(cp1.x)},${_f(cp1.y)} ${_f(cp2.x)},${_f(cp2.y)} ${_f(p2.x)},${_f(p2.y)}`,
            math: { type: 'bezier', p1, cp1, cp2, p2 },
        };
    }

    // ── Arc (for diagrams needing circular arcs between nodes) ────────────────────────

    static generateArc(p1, p2, sweepLarge = false) {
        const dist = ZoltoVectorMath.distance(p1, p2);
        const rx   = dist * 0.6, ry = dist * 0.6;
        const sweep = 1, large = sweepLarge ? 1 : 0;
        return {
            path: `M ${_f(p1.x)},${_f(p1.y)} A ${_f(rx)},${_f(ry)} 0 ${large},${sweep} ${_f(p2.x)},${_f(p2.y)}`,
            math: { type: 'arc', p1, p2 },
        };
    }

    // ── Rounded polyline helper ────────────────────────────────────────────────────────

    static _roundedPolyline(pts, radius) {
        if (pts.length < 2) return '';
        let d = `M ${_f(pts[0].x)},${_f(pts[0].y)}`;
        for (let i = 1; i < pts.length - 1; i++) {
            const prev = pts[i - 1], curr = pts[i], next = pts[i + 1];
            const d1 = ZoltoVectorMath.distance(prev, curr);
            const d2 = ZoltoVectorMath.distance(curr, next);
            const r  = Math.min(radius, d1 * 0.5, d2 * 0.5);
            const t1 = ZoltoVectorMath.lerp(prev, curr, 1 - r / Math.max(d1, 0.001));
            const t2 = ZoltoVectorMath.lerp(curr, next, r / Math.max(d2, 0.001));
            d += ` L ${_f(t1.x)},${_f(t1.y)} Q ${_f(curr.x)},${_f(curr.y)} ${_f(t2.x)},${_f(t2.y)}`;
        }
        const last = pts[pts.length - 1];
        d += ` L ${_f(last.x)},${_f(last.y)}`;
        return d;
    }
}

/* =========================================================================================
   §5  BRIDGE ENGINE — edge crossing detection and arc-bridge injection
   ========================================================================================= */
class ZoltoBridgeEngine {

    static resolveIntersections(edgeObjects) {
        // Phase 1: Discretize all paths into line segments
        for (const edge of edgeObjects) {
            edge.segments = this._discretizePath(edge.math);
            edge.jumps    = [];
        }

        // Phase 2: O(n²) intersection detection — skip same-endpoint edges
        const len = edgeObjects.length;
        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const eA = edgeObjects[i], eB = edgeObjects[j];
                if (this._shareEndpoint(eA, eB)) continue;
                const pts = this._findSegmentIntersections(eA.segments, eB.segments);
                if (pts.length > 0) pts.forEach(pt => eB.jumps.push(pt));
            }
        }

        // Phase 3: Inject arc bridges where jumps exist
        for (const edge of edgeObjects) {
            if (edge.jumps.length > 0) {
                edge.path = this._injectBridges(edge.path, edge.jumps, edge.math);
            }
        }
        return edgeObjects;
    }

    static _discretizePath(mathObj) {
        if (!mathObj) return [];
        const STEPS = ZoltoRouterConstants.LIMITS.DISCRETIZATION_STEPS;
        const segments = [];

        if (mathObj.type === 'bezier') {
            let prev = mathObj.p1;
            for (let i = 1; i <= STEPS; i++) {
                const t    = i / STEPS;
                const curr = ZoltoVectorMath.cubicBezierPoint(t, mathObj.p1, mathObj.cp1, mathObj.cp2, mathObj.p2);
                segments.push({ p1: prev, p2: curr });
                prev = curr;
            }
        } else if (mathObj.type === 'line') {
            segments.push({ p1: mathObj.p1, p2: mathObj.p2 });
        } else if (mathObj.type === 'polyline' || mathObj.type === 'step') {
            const pts = mathObj.points || [];
            for (let i = 0; i < pts.length - 1; i++) {
                segments.push({ p1: pts[i], p2: pts[i + 1] });
            }
        } else if (mathObj.type === 'spline' && Array.isArray(mathObj.segments)) {
            for (const seg of mathObj.segments) {
                let prev = seg.p1;
                for (let i = 1; i <= STEPS; i++) {
                    const curr = ZoltoVectorMath.cubicBezierPoint(i / STEPS, seg.p1, seg.cp1, seg.cp2, seg.p2);
                    segments.push({ p1: prev, p2: curr });
                    prev = curr;
                }
            }
        }
        return segments;
    }

    static _findSegmentIntersections(segsA, segsB) {
        const pts = [];
        for (const a of segsA) {
            for (const b of segsB) {
                const pt = ZoltoVectorMath.lineIntersection(a.p1, a.p2, b.p1, b.p2);
                if (pt) pts.push(pt);
            }
        }
        return pts;
    }

    static _shareEndpoint(eA, eB) {
        const src = eA.sourceEdge, tgt = eB.sourceEdge;
        if (!src || !tgt) return false;
        return src.fromId === tgt.fromId || src.fromId === tgt.toId ||
               src.toId   === tgt.fromId || src.toId   === tgt.toId;
    }

    /** Inject arc-over bridges at crossing points along the path string */
    static _injectBridges(originalPath, jumpPoints, mathObj) {
        // Bridge injection requires re-parameterizing the path — for v8 we use
        // the sorted-t approach on bezier paths; polyline paths get inline gaps.
        const R = ZoltoRouterConstants.LIMITS.BRIDGE_JUMP_RADIUS;
        if (!mathObj || jumpPoints.length === 0) return originalPath;

        if (mathObj.type !== 'bezier') return originalPath; // polyline bridges deferred

        // Sort jump points by parameter t along the curve
        const parameterized = jumpPoints.map(pt => {
            let bestT = 0, bestDist = Infinity;
            const STEPS = ZoltoRouterConstants.LIMITS.DISCRETIZATION_STEPS * 2;
            for (let i = 0; i <= STEPS; i++) {
                const t    = i / STEPS;
                const p    = ZoltoVectorMath.cubicBezierPoint(t, mathObj.p1, mathObj.cp1, mathObj.cp2, mathObj.p2);
                const dist = ZoltoVectorMath.distance(p, pt);
                if (dist < bestDist) { bestDist = dist; bestT = t; }
            }
            return { pt, t: bestT };
        }).sort((a, b) => a.t - b.t);

        const { p1, cp1, cp2, p2 } = mathObj;
        let d = `M ${_f(p1.x)},${_f(p1.y)}`;
        let prevT = 0;

        for (const { t } of parameterized) {
            const tBefore = Math.max(0, t - R / ZoltoVectorMath.cubicBezierLength(p1, cp1, cp2, p2));
            const tAfter  = Math.min(1, t + R / ZoltoVectorMath.cubicBezierLength(p1, cp1, cp2, p2));
            if (tBefore <= prevT) continue;

            // Draw bezier segment up to bridge start
            const pBefore = ZoltoVectorMath.cubicBezierPoint(tBefore, p1, cp1, cp2, p2);
            const pAfter  = ZoltoVectorMath.cubicBezierPoint(tAfter,  p1, cp1, cp2, p2);

            d += ` C ${_f(cp1.x)},${_f(cp1.y)} ${_f(cp2.x)},${_f(cp2.y)} ${_f(pBefore.x)},${_f(pBefore.y)}`;
            // Arc bridge over the crossing
            d += ` A ${R},${R} 0 0,1 ${_f(pAfter.x)},${_f(pAfter.y)}`;
            prevT = tAfter;
        }

        // Remaining segment to end
        d += ` C ${_f(cp1.x)},${_f(cp1.y)} ${_f(cp2.x)},${_f(cp2.y)} ${_f(p2.x)},${_f(p2.y)}`;
        return d;
    }
}

/* =========================================================================================
   §6  LABEL PLACER — midpoint + angle + anti-overlap nudging for edge labels
   ========================================================================================= */
class ZoltoLabelPlacer {

    /**
     * Returns { x, y, angle } for placing a label at the midpoint of an edge.
     * Angle is corrected so text always reads left-to-right.
     */
    static getMidpointTransform(mathObj) {
        let pt, angle;
        if (!mathObj) return { x: 0, y: 0, angle: 0 };

        switch (mathObj.type) {
            case 'bezier': {
                pt    = ZoltoVectorMath.cubicBezierPoint(0.5, mathObj.p1, mathObj.cp1, mathObj.cp2, mathObj.p2);
                const d = ZoltoVectorMath.cubicBezierDerivative(0.5, mathObj.p1, mathObj.cp1, mathObj.cp2, mathObj.p2);
                angle = Math.atan2(d.y, d.x) * ZoltoRouterConstants.MATH.RAD_TO_DEG;
                break;
            }
            case 'line': {
                pt    = ZoltoVectorMath.midpoint(mathObj.p1, mathObj.p2);
                angle = ZoltoVectorMath.angle(mathObj.p1, mathObj.p2) * ZoltoRouterConstants.MATH.RAD_TO_DEG;
                break;
            }
            case 'polyline':
            case 'step': {
                const pts = mathObj.points || [];
                if (pts.length >= 2) {
                    const mid = Math.floor(pts.length / 2);
                    pt    = ZoltoVectorMath.midpoint(pts[mid - 1], pts[mid]);
                    angle = ZoltoVectorMath.angle(pts[mid - 1], pts[mid]) * ZoltoRouterConstants.MATH.RAD_TO_DEG;
                } else {
                    pt = { x: 0, y: 0 }; angle = 0;
                }
                break;
            }
            default:
                pt = { x: 0, y: 0 }; angle = 0;
        }

        // Keep text readable — flip if upside-down
        if (angle > 90 || angle < -90) angle += 180;

        return { x: pt.x, y: pt.y, angle };
    }

    /**
     * Nudge a set of label positions so they don't overlap each other.
     * Simple gravity-repulsion single-pass (good enough for < 200 labels).
     */
    static deconflictLabels(labelPositions, passes = 3) {
        const MIN_DIST = 20;
        for (let p = 0; p < passes; p++) {
            for (let i = 0; i < labelPositions.length; i++) {
                for (let j = i + 1; j < labelPositions.length; j++) {
                    const a = labelPositions[i], b = labelPositions[j];
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
                    if (dist < MIN_DIST) {
                        const push = (MIN_DIST - dist) / 2;
                        const nx = (dx / dist) * push, ny = (dy / dist) * push;
                        a.x -= nx; a.y -= ny;
                        b.x += nx; b.y += ny;
                    }
                }
            }
        }
        return labelPositions;
    }
}

/* =========================================================================================
   §7  DEFS GENERATOR — SVG <defs>: markers, filters, gradients, patterns
   Covers all edge operator types, glow/shadow filters, dot/grid patterns, gradients
   ========================================================================================= */
class ZoltoDefsGenerator {

    static generate(options = {}) {
        return `<defs>
            ${this._markers()}
            ${this._sequenceMarkers()}
            ${this._filters(options)}
            ${this._gradients()}
            ${this._patterns()}
        </defs>`;
    }

    static _markers() {
        return `
            <!-- Solid arrow (default ->) -->
            <marker id="arrow-solid" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,10 4,0 8" fill="var(--edge-marker-color, var(--text-mute))"/>
            </marker>
            <!-- Primary filled arrow (=>) -->
            <marker id="arrow-primary" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,12 4.5,0 9" fill="var(--intent-primary)"/>
            </marker>
            <!-- Async dashed arrow (~>) -->
            <marker id="arrow-async" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,10 4,0 8" fill="var(--intent-warning)"/>
            </marker>
            <!-- Dotted arrow (..>) -->
            <marker id="arrow-dotted" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,10 4,0 8" fill="var(--text-mute)" opacity="0.7"/>
            </marker>
            <!-- Reverse arrow for bidirectional (<->) -->
            <marker id="arrow-reverse" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="10 0,0 4,10 8" fill="var(--edge-marker-color, var(--text-mute))"/>
            </marker>
            <!-- Thick filled arrow (===) -->
            <marker id="arrow-thick" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,12 5,0 10" fill="var(--text-main)"/>
            </marker>
            <!-- Dashed arrow (-->) -->
            <marker id="arrow-dashed" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,10 4,0 8" fill="var(--text-mute)" stroke-dasharray="none"/>
            </marker>
            <!-- Circle connector -->
            <marker id="marker-circle" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="3" fill="var(--bg-panel)" stroke="var(--edge-marker-color, var(--text-mute))" stroke-width="1.5"/>
            </marker>
            <!-- Diamond connector -->
            <marker id="marker-diamond" markerWidth="12" markerHeight="10" refX="6" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="6 0,12 5,6 10,0 5" fill="var(--bg-panel)" stroke="var(--text-mute)" stroke-width="1.5"/>
            </marker>
            <!-- ERD crow's foot (many) -->
            <marker id="marker-crow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L10,6 M0,12 L10,6 M0,6 L10,6" stroke="var(--text-mute)" stroke-width="1.5" fill="none"/>
            </marker>
            <!-- ERD one mark -->
            <marker id="marker-one" markerWidth="8" markerHeight="12" refX="6" refY="6" orient="auto" markerUnits="userSpaceOnUse">
                <line x1="6" y1="0" x2="6" y2="12" stroke="var(--text-mute)" stroke-width="1.5"/>
                <line x1="3" y1="0" x2="3" y2="12" stroke="var(--text-mute)" stroke-width="1.5"/>
            </marker>`;
    }

    static _sequenceMarkers() {
        return `
            <!-- Sequence diagram synchronous message -->
            <marker id="seq-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,8 4,0 8" fill="var(--text-main)"/>
            </marker>
            <!-- Sequence diagram async/return -->
            <marker id="seq-arrow-dashed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,8 4,0 8" fill="none" stroke="var(--text-mute)" stroke-width="1"/>
            </marker>
            <!-- Sequence diagram self-call -->
            <marker id="seq-arrow-self" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0,8 4,0 8" fill="var(--intent-primary)"/>
            </marker>`;
    }

    static _filters(options = {}) {
        return `
            <!-- Glow effect for highlighted nodes -->
            <filter id="filter-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="${options.glowBlur || 4}" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <!-- Drop shadow for nodes -->
            <filter id="filter-shadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.25)"/>
            </filter>
            <!-- Soft shadow for glass nodes -->
            <filter id="filter-glass-shadow" x="-20%" y="-20%" width="140%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <!-- Blur for frosted backgrounds -->
            <filter id="filter-blur-sm">
                <feGaussianBlur stdDeviation="2"/>
            </filter>`;
    }

    static _gradients() {
        return `
            <!-- Primary accent gradient (used on primary-trait nodes) -->
            <linearGradient id="grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="var(--intent-primary)" stop-opacity="1"/>
                <stop offset="100%" stop-color="var(--p-blue-600,#2563eb)" stop-opacity="1"/>
            </linearGradient>
            <!-- Success gradient -->
            <linearGradient id="grad-success" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="var(--intent-success)" stop-opacity="1"/>
                <stop offset="100%" stop-color="var(--p-green-600,#16a34a)" stop-opacity="1"/>
            </linearGradient>
            <!-- Danger gradient -->
            <linearGradient id="grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="var(--intent-danger)" stop-opacity="1"/>
                <stop offset="100%" stop-color="var(--p-red-600,#dc2626)" stop-opacity="1"/>
            </linearGradient>
            <!-- Warning gradient -->
            <linearGradient id="grad-warning" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="var(--intent-warning)" stop-opacity="1"/>
                <stop offset="100%" stop-color="var(--p-amber-600,#d97706)" stop-opacity="1"/>
            </linearGradient>
            <!-- Canvas background gradient -->
            <radialGradient id="grad-canvas-bg" cx="50%" cy="50%" r="70%">
                <stop offset="0%"   stop-color="var(--bg-canvas-center,var(--bg-deep))"/>
                <stop offset="100%" stop-color="var(--bg-canvas-edge,var(--bg-app))"/>
            </radialGradient>`;
    }

    static _patterns() {
        return `
            <!-- Dot-grid pattern for canvas/whiteboard -->
            <pattern id="pattern-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="1" fill="var(--border-subtle,rgba(128,128,128,0.2))"/>
            </pattern>
            <!-- Fine line grid -->
            <pattern id="pattern-line-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--border-subtle,rgba(128,128,128,0.12))" stroke-width="0.5"/>
            </pattern>
            <!-- Major grid every 8 cells (192px) -->
            <pattern id="pattern-major-grid" x="0" y="0" width="192" height="192" patternUnits="userSpaceOnUse">
                <rect width="192" height="192" fill="url(#pattern-line-grid)"/>
                <path d="M 192 0 L 0 0 0 192" fill="none" stroke="var(--border-subtle,rgba(128,128,128,0.22))" stroke-width="1"/>
            </pattern>`;
    }
}

/* =========================================================================================
   §8  DIAGRAM THEMER — resolves theme tokens for nodes by trait
   ========================================================================================= */
class ZoltoDiagramThemer {

    static resolveNodeStyle(traits = [], themeName = 'DEFAULT') {
        const theme = ZoltoRouterConstants.DIAGRAM_THEMES[themeName.toUpperCase()]
                   || ZoltoRouterConstants.DIAGRAM_THEMES.DEFAULT;

        // Base style from theme
        const style = {
            fill:        theme.nodeFill,
            stroke:      theme.nodeStroke,
            textColor:   theme.text,
            strokeWidth: 2,
            opacity:     1,
            strokeDash:  '',
            filter:      '',
            gradientId:  '',
        };

        // Apply trait overrides
        for (const trait of traits) {
            switch (trait) {
                case 'primary':   style.fill = 'url(#grad-primary)';  style.stroke = 'var(--intent-primary)'; style.textColor = '#fff'; break;
                case 'success':   style.fill = 'url(#grad-success)';  style.stroke = 'var(--intent-success)'; style.textColor = '#fff'; break;
                case 'danger':    style.fill = 'url(#grad-danger)';   style.stroke = 'var(--intent-danger)';  style.textColor = '#fff'; break;
                case 'warning':   style.fill = 'url(#grad-warning)';  style.stroke = 'var(--intent-warning)'; style.textColor = '#111'; break;
                case 'glass':     style.fill = 'rgba(255,255,255,0.06)'; style.stroke = 'rgba(255,255,255,0.2)'; style.filter = 'filter-glass-shadow'; break;
                case 'outline':   style.fill = 'transparent';         style.strokeWidth = 2; break;
                case 'dashed':    style.strokeDash = '6,4';           break;
                case 'implicit':  style.opacity = 0.6;                style.strokeDash = '4,4'; break;
                case 'elevated':  style.filter = 'filter-shadow';     break;
                case 'glow':      style.filter = 'filter-glow';       break;
                case 'muted':     style.opacity = 0.45;               break;
                case 'accent':    style.stroke = 'var(--intent-primary)'; style.strokeWidth = 3; break;
            }
        }

        return style;
    }

    static resolveEdgeStyle(operator = '->', traits = []) {
        const base = {
            class:       ZoltoRouterConstants.OPERATOR_CLASS[operator] || 'edge-solid',
            markerStart: ZoltoRouterConstants.OPERATOR_MARKER[operator]?.start || '',
            markerEnd:   ZoltoRouterConstants.OPERATOR_MARKER[operator]?.end   || 'url(#arrow-solid)',
            strokeDash:  '',
            strokeWidth: 2,
            opacity:     1,
            animated:    false,
        };

        if (operator === '~>'  || operator === '-->')  base.strokeDash = '6,4';
        if (operator === '..>') base.strokeDash = '3,4';
        if (operator === '===') base.strokeWidth = 4;

        for (const trait of traits) {
            if (trait === 'animated') base.animated = true;
            if (trait === 'thick')    base.strokeWidth = 4;
            if (trait === 'muted')    base.opacity = 0.45;
        }
        return base;
    }
}

/* =========================================================================================
   §9  SVG ROUTER — master edge routing facade
   Handles all edge operator types, routing modes, label placement, bridge injection
   ========================================================================================= */
class ZoltoSVGRouter {

    /**
     * Main entry: given an array of edge objects and the container element,
     * returns a full SVG string: defs + paths + labels.
     *
     * @param {Array}       edges        — edge objects from AST (fromId, toId, operator, edgeLabel, traits)
     * @param {HTMLElement} containerEl  — the scroll/pan container whose rect is the reference frame
     * @param {object}      options      — { routingMode, theme, bridges, animations }
     * @returns {string}  raw SVG inner HTML
     */
    static routeEdges(edges, containerEl, options = {}) {
        const defs = ZoltoDefsGenerator.generate(options);
        if (!edges || edges.length === 0 || !containerEl) return defs;

        const mode   = options.routingMode || ZoltoRouterConstants.ROUTING_MODE.BEZIER;
        const theme  = options.theme       || 'DEFAULT';
        const useBridges = options.bridges !== false;

        const containerRect = containerEl.getBoundingClientRect();
        const scrollX = containerEl.scrollLeft || 0;
        const scrollY = containerEl.scrollTop  || 0;
        const rectCache = new Map();

        const getRect = (id) => {
            if (rectCache.has(id)) return rectCache.get(id);
            const el = id ? document.getElementById(id) : null;
            if (!el) { rectCache.set(id, null); return null; }
            const r = el.getBoundingClientRect();
            const computed = {
                left:   r.left   - containerRect.left + scrollX,
                right:  r.right  - containerRect.left + scrollX,
                top:    r.top    - containerRect.top  + scrollY,
                bottom: r.bottom - containerRect.top  + scrollY,
                width:  r.width,
                height: r.height,
            };
            rectCache.set(id, computed);
            return computed;
        };

        // Build edge objects with path data
        const edgeObjects = [];
        for (const edge of edges) {
            const r1 = getRect(edge.fromId), r2 = getRect(edge.toId);
            if (!r1 || !r2) continue;

            let pathData;
            if (edge.fromId === edge.toId) {
                pathData = ZoltoPathGenerators.generateSelfLoop(r1);
            } else {
                const ports = ZoltoPortManager.getOptimalPorts(r1, r2, mode);
                switch (mode) {
                    case ZoltoRouterConstants.ROUTING_MODE.ORTHOGONAL:
                        pathData = ZoltoPathGenerators.generateOrthogonal(ports.fromPoint, ports.fromDir, ports.toPoint, ports.toDir);
                        break;
                    case ZoltoRouterConstants.ROUTING_MODE.STEP:
                        pathData = ZoltoPathGenerators.generateStep(ports.fromPoint, ports.toPoint);
                        break;
                    case ZoltoRouterConstants.ROUTING_MODE.STRAIGHT:
                        pathData = ZoltoPathGenerators.generateStraight(ports.fromPoint, ports.toPoint);
                        break;
                    default:
                        pathData = ZoltoPathGenerators.generateBezier(ports.fromPoint, ports.fromDir, ports.toPoint, ports.toDir);
                }
            }

            edgeObjects.push({
                sourceEdge: edge,
                path:       pathData.path,
                math:       pathData.math,
                jumps:      [],
                segments:   [],
            });
        }

        // Resolve intersections / bridges
        const finalEdges = useBridges && edgeObjects.length > 1
            ? ZoltoBridgeEngine.resolveIntersections(edgeObjects)
            : edgeObjects;

        // Gather label positions for de-confliction
        const labelPositions = [];
        for (const eo of finalEdges) {
            if (eo.sourceEdge.edgeLabel) {
                const lp = ZoltoLabelPlacer.getMidpointTransform(eo.math);
                labelPositions.push({ ...lp, label: eo.sourceEdge.edgeLabel, eo });
            }
        }
        ZoltoLabelPlacer.deconflictLabels(labelPositions);

        // Build SVG strings
        let pathsHtml = '', labelsHtml = '';
        const labelMap = new Map(labelPositions.map(lp => [lp.eo, lp]));

        for (const eo of finalEdges) {
            const edge      = eo.sourceEdge;
            const edgeStyle = ZoltoDiagramThemer.resolveEdgeStyle(edge.operator, edge.traits || []);
            const edgeId    = `edge-${_safe(edge.fromId)}-${_safe(edge.toId)}`;

            const animClass = edgeStyle.animated ? ' edge-animated' : '';
            const dashAttr  = edgeStyle.strokeDash ? ` stroke-dasharray="${edgeStyle.strokeDash}"` : '';
            const opacAttr  = edgeStyle.opacity < 1 ? ` opacity="${edgeStyle.opacity}"` : '';

            // Visible path
            pathsHtml += `<path id="${edgeId}" d="${eo.path}" class="edge-path ${edgeStyle.class}${animClass}"
                stroke-width="${edgeStyle.strokeWidth}"${dashAttr}${opacAttr}
                marker-start="${edgeStyle.markerStart}" marker-end="${edgeStyle.markerEnd}"
                data-from="${_safe(edge.fromId)}" data-to="${_safe(edge.toId)}"
                data-op="${_safe(edge.operator || '->')}"
                fill="none"/>`;

            // Fat invisible hitbox for mouse interaction
            pathsHtml += `<path d="${eo.path}" class="edge-hitbox" stroke="transparent" stroke-width="18" fill="none"
                data-from="${_safe(edge.fromId)}" data-to="${_safe(edge.toId)}"/>`;

            // Label
            const lp = labelMap.get(eo);
            if (lp) {
                const labelText = _escHtml(String(lp.label));
                const labelW    = Math.min(ZoltoRouterConstants.LIMITS.MAX_LABEL_WIDTH,
                                           labelText.length * 7 + ZoltoRouterConstants.LIMITS.LABEL_PADDING_H * 2);
                const labelH    = 20 + ZoltoRouterConstants.LIMITS.LABEL_PADDING_V;

                labelsHtml += `
                    <g class="edge-label" transform="translate(${_f(lp.x)},${_f(lp.y)}) rotate(${_f(lp.angle)})">
                        <rect x="${-labelW / 2}" y="${-labelH / 2}" width="${labelW}" height="${labelH}"
                              rx="${labelH / 2}" fill="var(--bg-panel)" stroke="var(--border-heavy)" stroke-width="1"/>
                        <text x="0" y="1" dominant-baseline="middle"
                              font-family="var(--font-sans)" font-size="11" font-weight="600"
                              fill="var(--text-main)" text-anchor="middle">${labelText}</text>
                    </g>`;
            }
        }

        return defs + pathsHtml + labelsHtml;
    }
}

/* =========================================================================================
   §10  LAYOUT ENGINE
   Flex · Grid · Absolute · Canvas · Whiteboard · Presentation · Split runtimes
   Each produces an HTML string consumed by ZoltoRenderer
   ========================================================================================= */
const ZoltoLayoutEngine = (function () {

    /**
     * Resolve a LayoutBlock AST node into HTML.
     * Supports all layout types defined in ast.js §5.
     */
    function renderLayout(node, renderChildFn, marginStyle = '') {
        if (!node) return '';
        switch (node.type) {
            case 'GridLayout':        return _renderGrid(node, renderChildFn, marginStyle);
            case 'FlexLayout':        return _renderFlex(node, renderChildFn, marginStyle);
            case 'ColumnLayout':      return _renderColumns(node, renderChildFn, marginStyle);
            case 'AbsoluteLayout':    return _renderAbsolute(node, renderChildFn, marginStyle);
            case 'Canvas':            return _renderCanvas(node, renderChildFn, marginStyle);
            case 'Whiteboard':        return _renderWhiteboard(node, renderChildFn, marginStyle);
            case 'Presentation':      return _renderPresentation(node, renderChildFn, marginStyle);
            case 'SplitView':         return _renderSplitView(node, renderChildFn, marginStyle);
            case 'Card':              return _renderCard(node, renderChildFn, marginStyle);
            case 'CardGroup':         return _renderCardGroup(node, renderChildFn, marginStyle);
            case 'TabGroup':          return _renderTabGroup(node, renderChildFn, marginStyle);
            case 'Accordion':         return _renderAccordion(node, renderChildFn, marginStyle);
            case 'Admonition':        return _renderAdmonition(node, renderChildFn, marginStyle);
            case 'Steps':             return _renderSteps(node, renderChildFn, marginStyle);
            case 'LayoutBlock':       return _renderLegacyLayout(node, renderChildFn, marginStyle);
            default:                  return '';
        }
    }

    // ── Grid ─────────────────────────────────────────────────────────────────────────

    function _renderGrid(node, render, marginStyle) {
        const cols    = _safeInt(node.cols, 3);
        const gap     = _safeCss(node.gap, '1.25rem');
        const minW    = node.autoFill ? `repeat(auto-fill, minmax(${_safeCss(node.minColWidth, '240px')}, 1fr))` : `repeat(${cols}, 1fr)`;
        const id      = _safeId(node.id);
        const children = _renderChildren(node, render);
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${id}" class="zolto-grid-layout" style="display:grid; grid-template-columns:${minW}; gap:${gap};">
                ${children}
            </div></div>`;
    }

    // ── Flex ──────────────────────────────────────────────────────────────────────────

    function _renderFlex(node, render, marginStyle) {
        const direction = /^(row|column|row-reverse|column-reverse)$/.test(node.direction) ? node.direction : 'row';
        const wrap      = node.wrap !== false ? 'wrap' : 'nowrap';
        const align     = _safeCss(node.align, 'flex-start');
        const justify   = _safeCss(node.justify, 'flex-start');
        const gap       = _safeCss(node.gap, '1rem');
        const children  = _renderChildren(node, render);
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-flex-layout"
                style="display:flex; flex-direction:${direction}; flex-wrap:${wrap}; align-items:${align}; justify-content:${justify}; gap:${gap};">
                ${children}
            </div></div>`;
    }

    // ── Multi-column ──────────────────────────────────────────────────────────────────

    function _renderColumns(node, render, marginStyle) {
        const count    = _safeInt(node.count, 2);
        const gap      = _safeCss(node.gap, '1.5rem');
        const children = Array.isArray(node.children) ? node.children : [];
        const cols     = children.map(child => {
            const colContent = typeof render === 'function' ? render(child) : '';
            return `<div class="zolto-column">${colContent}</div>`;
        }).join('');
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-column-layout"
                style="display:grid; grid-template-columns:repeat(${count},1fr); gap:${gap}; align-items:start;">
                ${cols || children.map(() => '<div class="zolto-column"></div>').join('')}
            </div></div>`;
    }

    // ── Absolute / canvas-positioned ─────────────────────────────────────────────────

    function _renderAbsolute(node, render, marginStyle) {
        const w = _safeCss(node.width, '100%'), h = _safeCss(node.height, '400px');
        const items = (Array.isArray(node.children) ? node.children : []).map(child => {
            const x = _safeCss(child.x, '0'), y = _safeCss(child.y, '0');
            const cW = child.width ? `width:${_safeCss(child.width, 'auto')};` : '';
            const content = typeof render === 'function' ? render(child) : '';
            return `<div class="zolto-absolute-item" style="position:absolute; left:${x}; top:${y}; ${cW}">${content}</div>`;
        }).join('');
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-absolute-layout"
                style="position:relative; width:${w}; height:${h}; overflow:hidden;">
                ${items}
            </div></div>`;
    }

    // ── Canvas block (finite-size drawing surface) ────────────────────────────────────

    function _renderCanvas(node, render, marginStyle) {
        const w = _safeDimension(node.width, 800), h = _safeDimension(node.height, 500);
        const bg = node.background ? `background:${_safeCss(node.background, 'var(--bg-deep)')};` : '';
        const grid = node.grid !== false ? `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='1' fill='rgba(128,128,128,0.2)'/%3E%3C/svg%3E");` : '';
        const children = _renderChildren(node, render);
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-canvas-block"
                style="position:relative; width:${w}px; height:${h}px; overflow:hidden; ${bg}${grid}">
                ${children}
            </div></div>`;
    }

    // ── Whiteboard (infinite pan/zoom) ────────────────────────────────────────────────

    function _renderWhiteboard(node, render, marginStyle) {
        const h = _safeDimension(node.height, 600);
        const children = _renderChildren(node, render);
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-whiteboard" data-zolto-whiteboard="true"
                style="position:relative; width:100%; height:${h}px; overflow:hidden; cursor:grab;
                       background-image:url(#pattern-dot-grid);">
                <div class="zolto-whiteboard-content" style="position:absolute; transform-origin:0 0; will-change:transform;">
                    ${children}
                </div>
            </div></div>`;
    }

    // ── Presentation (slide deck) ─────────────────────────────────────────────────────

    function _renderPresentation(node, render, marginStyle) {
        const slides = Array.isArray(node.children) ? node.children : [];
        const slideHtml = slides.map((slide, idx) => {
            const content = typeof render === 'function' ? render(slide) : '';
            const hidden  = idx > 0 ? ' hidden' : '';
            return `<div class="zolto-slide${hidden}" data-slide-index="${idx}" style="width:100%; height:100%; flex:0 0 100%;">
                <div class="zolto-slide-content">${content}</div>
            </div>`;
        }).join('');

        const total = slides.length;
        const id    = _safeId(node.id);
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${id}" class="zolto-presentation" data-total="${total}"
                style="position:relative; width:100%; aspect-ratio:16/9; overflow:hidden; background:var(--bg-deep);">
                <div class="zolto-slide-track" style="display:flex; width:${total * 100}%; height:100%; transition:transform 0.4s cubic-bezier(.4,0,.2,1);">
                    ${slideHtml}
                </div>
                <div class="zolto-slide-controls" style="position:absolute; bottom:1rem; left:50%; transform:translateX(-50%); display:flex; gap:0.5rem; align-items:center;">
                    <button class="zolto-slide-btn" onclick="ZoltoLayoutEngine.prevSlide('${id}')" aria-label="Previous slide">‹</button>
                    <span class="zolto-slide-counter" id="${id}-counter">1 / ${total}</span>
                    <button class="zolto-slide-btn" onclick="ZoltoLayoutEngine.nextSlide('${id}')" aria-label="Next slide">›</button>
                </div>
            </div></div>`;
    }

    // ── Split view ────────────────────────────────────────────────────────────────────

    function _renderSplitView(node, render, marginStyle) {
        const children = Array.isArray(node.children) ? node.children.slice(0, 2) : [];
        const ratio    = (node.ratio && /^\d+:\d+$/.test(node.ratio)) ? node.ratio : '1:1';
        const [r1, r2] = ratio.split(':').map(Number);
        const total    = r1 + r2;
        const panes    = children.map((child, i) => {
            const flex = i === 0 ? r1 / total : r2 / total;
            const content = typeof render === 'function' ? render(child) : '';
            return `<div class="zolto-split-pane" style="flex:${flex}; min-width:0; overflow:auto;">${content}</div>`;
        }).join('');
        const divider = node.resizable !== false
            ? `<div class="zolto-split-divider" style="width:4px; cursor:col-resize; flex:0 0 4px; background:var(--border-heavy); transition:background 0.15s;" onmouseenter="this.style.background='var(--intent-primary)'" onmouseleave="this.style.background='var(--border-heavy)'"></div>`
            : `<div style="width:1px; background:var(--border-heavy); flex:0 0 1px;"></div>`;
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-split-view" style="display:flex; width:100%; height:${_safeCss(node.height,'400px')}; gap:0;">
                ${panes.split('</div>').join('</div>' + divider).replace(divider + divider, divider)}
            </div></div>`;
    }

    // ── Card ──────────────────────────────────────────────────────────────────────────

    function _renderCard(node, render, marginStyle) {
        const width   = node.width ? `flex:0 0 ${_safeCss(node.width,'auto')}; max-width:${_safeCss(node.width,'auto')};` : 'flex:1 1 240px;';
        const content = _renderChildren(node, render);
        const elev    = _safeInt(node.elevation, 1);
        return `<div id="${_safeId(node.id)}" class="zolto-card zolto-card-elev-${elev}" style="${width} ${marginStyle}">
            ${node.title ? `<div class="zolto-card-title">${_escHtml(node.title)}</div>` : ''}
            <div class="zolto-card-body">${content}</div>
        </div>`;
    }

    function _renderCardGroup(node, render, marginStyle) {
        const children = _renderChildren(node, render);
        const gap      = _safeCss(node.gap, '1rem');
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-card-group" style="display:flex; flex-wrap:wrap; gap:${gap}; align-items:stretch;">
                ${children}
            </div></div>`;
    }

    // ── Tabs ─────────────────────────────────────────────────────────────────────────

    function _renderTabGroup(node, render, marginStyle) {
        const tabs = Array.isArray(node.children) ? node.children : [];
        const id   = _safeId(node.id);

        const tabNav = tabs.map((tab, idx) => {
            const active = idx === 0 ? ' zolto-tab-active' : '';
            const label  = _escHtml(tab.label || `Tab ${idx + 1}`);
            return `<button class="zolto-tab-btn${active}" role="tab" aria-selected="${idx === 0}"
                data-tab-target="${id}-panel-${idx}"
                onclick="ZoltoLayoutEngine.switchTab('${id}', ${idx})">${label}</button>`;
        }).join('');

        const panels = tabs.map((tab, idx) => {
            const hidden  = idx > 0 ? ' hidden' : '';
            const content = typeof render === 'function' ? render(tab) : '';
            return `<div id="${id}-panel-${idx}" class="zolto-tab-panel${hidden}" role="tabpanel">${content}</div>`;
        }).join('');

        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${id}" class="zolto-tab-group">
                <div class="zolto-tab-nav" role="tablist">${tabNav}</div>
                <div class="zolto-tab-panels">${panels}</div>
            </div></div>`;
    }

    // ── Accordion ─────────────────────────────────────────────────────────────────────

    function _renderAccordion(node, render, marginStyle) {
        const items = Array.isArray(node.children) ? node.children : [];
        const id    = _safeId(node.id);

        const itemsHtml = items.map((item, idx) => {
            const itemId  = `${id}-acc-${idx}`;
            const title   = _escHtml(item.title || item.label || `Section ${idx + 1}`);
            const content = typeof render === 'function' ? render(item) : '';
            const open    = node.defaultOpenIndex === idx;
            return `<div class="zolto-accordion-item${open ? ' open' : ''}">
                <button class="zolto-accordion-header" aria-expanded="${open}" aria-controls="${itemId}-body"
                    onclick="ZoltoLayoutEngine.toggleAccordion('${itemId}')">
                    <span>${title}</span>
                    <span class="zolto-accordion-icon" aria-hidden="true">${open ? '▾' : '▸'}</span>
                </button>
                <div id="${itemId}-body" class="zolto-accordion-body"${open ? '' : ' hidden'}>
                    <div class="zolto-accordion-content">${content}</div>
                </div>
            </div>`;
        }).join('');

        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${id}" class="zolto-accordion">${itemsHtml}</div>
        </div>`;
    }

    // ── Admonition (callouts: important/tip/warning/info/note/etc.) ───────────────────

    function _renderAdmonition(node, render, marginStyle) {
        const TYPE_META = {
            important:  { icon: '❗', cls: 'adm-important' },
            warning:    { icon: '⚠️', cls: 'adm-warning'   },
            tip:        { icon: '💡', cls: 'adm-tip'       },
            info:       { icon: 'ℹ️', cls: 'adm-info'      },
            note:       { icon: '📝', cls: 'adm-note'      },
            success:    { icon: '✅', cls: 'adm-success'   },
            danger:     { icon: '🚫', cls: 'adm-danger'    },
            example:    { icon: '📖', cls: 'adm-example'   },
            definition: { icon: '📐', cls: 'adm-definition'},
            theorem:    { icon: '∴',  cls: 'adm-theorem'   },
            proof:      { icon: '∎',  cls: 'adm-proof'     },
        };
        const adType  = (node.admonitionType || node.calloutType || 'info').toLowerCase();
        const meta    = TYPE_META[adType] || TYPE_META.info;
        const title   = node.title || (adType.charAt(0).toUpperCase() + adType.slice(1));
        const content = _renderChildren(node, render);

        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-admonition ${meta.cls}" role="note">
                <div class="zolto-adm-header">
                    <span class="zolto-adm-icon" aria-hidden="true">${meta.icon}</span>
                    <span class="zolto-adm-title">${_escHtml(title)}</span>
                </div>
                <div class="zolto-adm-body">${content}</div>
            </div></div>`;
    }

    // ── Steps / numbered procedure ────────────────────────────────────────────────────

    function _renderSteps(node, render, marginStyle) {
        const steps = Array.isArray(node.children) ? node.children : [];
        const stepsHtml = steps.map((step, idx) => {
            const title   = step.title ? `<div class="zolto-step-title">${_escHtml(step.title)}</div>` : '';
            const content = typeof render === 'function' ? render(step) : '';
            return `<div class="zolto-step">
                <div class="zolto-step-number" aria-hidden="true">${idx + 1}</div>
                <div class="zolto-step-body">${title}${content}</div>
            </div>`;
        }).join('');
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="zolto-steps">${stepsHtml}</div>
        </div>`;
    }

    // ── Legacy layout block (backwards compat) ────────────────────────────────────────

    function _renderLegacyLayout(node, render, marginStyle) {
        const type = node.layout || '';
        let cls = 'zolto-layout-block';
        if (type === 'flex-row')          cls += ' d-flex flex-row gap-4 flex-wrap';
        else if (type === 'flex-col')     cls += ' d-flex flex-col gap-4';
        else if (/^grid-\d$/.test(type)) cls += ` d-grid grid-cols-${type.split('-')[1]} gap-4`;
        const children = _renderChildren(node, render);
        return `<div class="zolto-line" style="${marginStyle} width:100%;">
            <div id="${_safeId(node.id)}" class="${cls}">${children}</div>
        </div>`;
    }

    // ── Interactive runtime helpers (attached to window for onclick) ──────────────────

    function switchTab(groupId, targetIdx) {
        const group  = document.getElementById(groupId);
        if (!group) return;
        const btns   = group.querySelectorAll('.zolto-tab-btn');
        const panels = group.querySelectorAll('.zolto-tab-panel');
        btns.forEach((btn, i) => {
            const active = i === targetIdx;
            btn.classList.toggle('zolto-tab-active', active);
            btn.setAttribute('aria-selected', active);
        });
        panels.forEach((panel, i) => {
            panel.hidden = i !== targetIdx;
        });
    }

    function toggleAccordion(itemId) {
        const body   = document.getElementById(itemId + '-body');
        const header = body ? body.previousElementSibling : null;
        if (!body || !header) return;
        const isOpen = !body.hidden;
        body.hidden  = isOpen;
        header.setAttribute('aria-expanded', !isOpen);
        const icon = header.querySelector('.zolto-accordion-icon');
        if (icon) icon.textContent = isOpen ? '▸' : '▾';
        header.closest('.zolto-accordion-item')?.classList.toggle('open', !isOpen);
    }

    function nextSlide(presentationId) {
        _navigateSlide(presentationId, 1);
    }

    function prevSlide(presentationId) {
        _navigateSlide(presentationId, -1);
    }

    function _navigateSlide(id, delta) {
        const pres  = document.getElementById(id);
        if (!pres) return;
        const total = parseInt(pres.dataset.total, 10) || 1;
        const track = pres.querySelector('.zolto-slide-track');
        const counter = document.getElementById(id + '-counter');
        if (!track) return;
        let curr = parseInt(pres.dataset.currentSlide || '0', 10);
        curr = Math.max(0, Math.min(total - 1, curr + delta));
        pres.dataset.currentSlide = curr;
        track.style.transform = `translateX(-${(curr / total) * 100}%)`;
        if (counter) counter.textContent = `${curr + 1} / ${total}`;
    }

    // ── Shared helpers ────────────────────────────────────────────────────────────────

    function _renderChildren(node, render) {
        if (!Array.isArray(node.children)) return '';
        return node.children.map(child => typeof render === 'function' ? render(child) : '').join('');
    }

    function _safeInt(v, fallback) {
        const n = parseInt(v, 10);
        return isNaN(n) ? fallback : Math.max(1, n);
    }

    function _safeCss(v, fallback) {
        if (!v || typeof v !== 'string') return fallback;
        // Allow CSS length values and CSS variable references
        if (/^[0-9a-zA-Z%.()\-,\s_]+$/.test(v.trim()) || /^var\(--/.test(v.trim())) return v.trim();
        return fallback;
    }

    function _safeDimension(v, fallback) {
        const n = parseInt(v, 10);
        return isNaN(n) || n <= 0 ? fallback : Math.min(n, 8000);
    }

    return Object.freeze({ renderLayout, switchTab, toggleAccordion, nextSlide, prevSlide });
})();

/* =========================================================================================
   §11  COMPONENT RUNTIME
   Registry, slot resolution, prop injection, variant merging, style inheritance
   ========================================================================================= */
const ZoltoComponentRuntime = (function () {

    /** Internal registry: name → ComponentDef AST node */
    const _registry = new Map();

    /** Register a component definition */
    function register(name, def) {
        if (!name || typeof name !== 'string' || !/^[A-Z]/.test(name)) {
            console.warn('[ZoltoComponent] Name must start with uppercase:', name);
            return;
        }
        _registry.set(name, def);
    }

    /** Check if a component is registered */
    function has(name) { return _registry.has(name); }

    /** Retrieve a component definition */
    function get(name) { return _registry.get(name) || null; }

    /** List all registered component names */
    function list() { return Array.from(_registry.keys()); }

    /** Clear all registered components (useful between document reloads) */
    function clear() { _registry.clear(); }

    /**
     * Instantiate a component: merge props with defaults, resolve slots, return render tree.
     *
     * @param {object} useNode   — ComponentUse AST node (name, props, slotContent)
     * @param {object} def       — ComponentDef AST node (defaultProps, template, slots)
     * @param {Function} render  — ZoltoRenderer.renderNode for child rendering
     * @returns {string}  rendered HTML
     */
    function instantiate(useNode, def, render) {
        if (!def) return `<div class="zolto-error-inline">Component "${_escHtml(useNode.name)}" not found.</div>`;

        // 1. Merge props: defaults → definition defaults → use-site props
        const props = Object.assign({}, def.defaultProps || {}, useNode.props || {});

        // 2. Resolve variant classes
        const variantClasses = _resolveVariants(props, def.variants || {});

        // 3. Build slot map
        const slotMap = _buildSlotMap(useNode.slotContent, def.slots || []);

        // 4. Render the template, substituting slots
        const templateNodes = Array.isArray(def.template) ? def.template : [];
        const body = templateNodes.map(node => {
            if (node.type === 'SlotOutlet') {
                const slotName = node.name || 'default';
                const slotNodes = slotMap[slotName];
                if (slotNodes) return slotNodes.map(n => typeof render === 'function' ? render(n) : '').join('');
                if (node.fallback) return node.fallback.map(n => typeof render === 'function' ? render(n) : '').join('');
                return '';
            }
            return typeof render === 'function' ? render(node) : '';
        }).join('');

        // 5. Apply theme & style inheritance
        const themeClass = props.theme ? `zolto-theme-${_escAttr(String(props.theme))}` : '';
        const styleVars  = _propsToStyleVars(props, def.propStyleMap || {});

        return `<div id="${_safeId(useNode.id)}" class="zolto-component zolto-cmp-${_escAttr(useNode.name)} ${variantClasses} ${themeClass}"
            style="${styleVars}" data-component="${_escAttr(useNode.name)}">
            ${body}
        </div>`;
    }

    function _resolveVariants(props, variantDefs) {
        const classes = [];
        for (const [key, map] of Object.entries(variantDefs)) {
            const val = props[key];
            if (val && map[val]) classes.push(map[val]);
        }
        return classes.join(' ');
    }

    function _buildSlotMap(slotContent, slotDefs) {
        const map = { default: [] };
        for (const name of slotDefs) map[name] = [];
        if (!Array.isArray(slotContent)) return map;
        for (const node of slotContent) {
            const target = node.slot || 'default';
            if (!map[target]) map[target] = [];
            map[target].push(node);
        }
        return map;
    }

    function _propsToStyleVars(props, propStyleMap) {
        const parts = [];
        for (const [prop, cssVar] of Object.entries(propStyleMap)) {
            if (props[prop] != null) {
                const val = String(props[prop]).replace(/[^a-zA-Z0-9#%\.,\s\-_()]/g, '');
                parts.push(`${cssVar}: ${val}`);
            }
        }
        return parts.join('; ');
    }

    return Object.freeze({ register, has, get, list, clear, instantiate });
})();

/* =========================================================================================
   §12  ANIMATION SYSTEM
   Keyframe, flow-pulse, entrance, path-draw, stagger, timeline
   ========================================================================================= */
const ZoltoAnimationSystem = (function () {

    const _active  = new Map();   // animId → { rafId, cancel }
    const _css     = new Set();   // injected CSS rule keys

    // Inject CSS keyframes once into <head>
    function _injectKeyframes() {
        if (typeof document === 'undefined') return;
        const id = 'zolto-animation-styles';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            @keyframes zolto-fade-in      { from { opacity:0; }               to { opacity:1; } }
            @keyframes zolto-slide-up     { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
            @keyframes zolto-slide-down   { from { opacity:0; transform:translateY(-12px);} to { opacity:1; transform:translateY(0); } }
            @keyframes zolto-scale-in     { from { opacity:0; transform:scale(0.88); }     to { opacity:1; transform:scale(1); } }
            @keyframes zolto-pulse-ring   { 0%,100% { box-shadow:0 0 0 0 var(--intent-primary); } 50% { box-shadow:0 0 0 8px rgba(99,102,241,0); } }
            @keyframes zolto-dash-flow    { from { stroke-dashoffset:100%; } to { stroke-dashoffset:0; } }
            @keyframes zolto-path-draw    { from { stroke-dashoffset:1000; } to { stroke-dashoffset:0; } }
            @keyframes zolto-dot-blink    { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
            @keyframes zolto-spin         { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
            @keyframes zolto-shimmer      { 0% { background-position:-200% center; } 100% { background-position:200% center; } }

            .edge-animated { stroke-dasharray: 8 4; animation: zolto-dash-flow 1.6s linear infinite; }
            .edge-draw      { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: zolto-path-draw 0.6s ease forwards; }
            .node-enter     { animation: zolto-slide-up 0.3s ease forwards; }
            .node-pulse     { animation: zolto-pulse-ring 1.2s ease-in-out infinite; }
        `;
        document.head.appendChild(style);
    }

    /**
     * Animate entrance of all .zolto-node elements in a container with staggered delay.
     * @param {string} containerId
     * @param {object} options  { type, duration, stagger }
     */
    function animateEntrance(containerId, options = {}) {
        _injectKeyframes();
        if (typeof document === 'undefined') return;
        const container = document.getElementById(containerId);
        if (!container) return;

        const type     = options.type     || 'slide-up';
        const duration = options.duration || 300;
        const stagger  = options.stagger  || 40;
        const keyframe = `zolto-${type}`;
        const nodes    = container.querySelectorAll('.zolto-node, .zolto-card, .zolto-admonition');

        nodes.forEach((el, idx) => {
            el.style.opacity    = '0';
            el.style.animation  = `${keyframe} ${duration}ms ease forwards`;
            el.style.animationDelay = `${idx * stagger}ms`;
        });
    }

    /**
     * Animate path-draw effect on all .edge-path elements in an SVG.
     * @param {SVGElement} svgEl
     * @param {number}     duration   ms per edge
     * @param {number}     stagger    ms between edges
     */
    function animateEdgeDraw(svgEl, duration = 500, stagger = 60) {
        _injectKeyframes();
        if (!svgEl) return;
        const paths = svgEl.querySelectorAll('.edge-path');
        paths.forEach((path, idx) => {
            const len = path.getTotalLength ? path.getTotalLength() : 400;
            path.style.strokeDasharray  = `${len}`;
            path.style.strokeDashoffset = `${len}`;
            path.style.animation = `zolto-path-draw ${duration}ms ease forwards`;
            path.style.animationDelay   = `${idx * stagger}ms`;
        });
    }

    /**
     * Create a looping dash-flow animation on a specific SVG path.
     * @param {string} pathId
     * @param {number} speed   seconds per cycle
     */
    function flowPulse(pathId, speed = 1.6) {
        _injectKeyframes();
        if (typeof document === 'undefined') return;
        const el = document.getElementById(pathId);
        if (!el) return;
        el.style.strokeDasharray = '8 4';
        el.style.animation       = `zolto-dash-flow ${speed}s linear infinite`;
    }

    /**
     * Schedule a JS-driven animation (rAF loop) with cancel support.
     * @param {string}   id       unique animation ID
     * @param {Function} tick     called each frame with (elapsedMs, totalMs)
     * @param {number}   duration total ms (0 = infinite until cancelled)
     * @param {Function} onDone
     */
    function schedule(id, tick, duration = 0, onDone) {
        cancel(id);
        const startTime = performance.now();
        let rafId;

        const loop = (now) => {
            const elapsed = now - startTime;
            tick(elapsed, duration);
            if (duration > 0 && elapsed >= duration) {
                _active.delete(id);
                if (onDone) onDone();
                return;
            }
            rafId = requestAnimationFrame(loop);
            _active.set(id, { rafId, cancel: () => cancelAnimationFrame(rafId) });
        };

        rafId = requestAnimationFrame(loop);
        _active.set(id, { rafId, cancel: () => cancelAnimationFrame(rafId) });
    }

    /** Cancel a running scheduled animation */
    function cancel(id) {
        const anim = _active.get(id);
        if (anim) { anim.cancel(); _active.delete(id); }
    }

    /** Cancel all running animations */
    function cancelAll() {
        _active.forEach(anim => anim.cancel());
        _active.clear();
    }

    return Object.freeze({ animateEntrance, animateEdgeDraw, flowPulse, schedule, cancel, cancelAll });
})();

/* =========================================================================================
   §13  SNAPPING SYSTEM
   Grid snap · Object snap · Guide snap · Magnetic · Smart distribute
   ========================================================================================= */
const ZoltoSnappingSystem = (function () {

    const L = ZoltoRouterConstants.LIMITS;

    /**
     * Snap a point to the nearest grid intersection.
     * @param {{ x, y }} pt
     * @param {number}   gridSize
     */
    function snapToGrid(pt, gridSize = 24) {
        return {
            x: Math.round(pt.x / gridSize) * gridSize,
            y: Math.round(pt.y / gridSize) * gridSize,
        };
    }

    /**
     * Snap a point to the nearest of a set of candidate snapping values on each axis.
     * Candidates are { x: number | null, y: number | null } objects.
     * Returns the snapped point and { snappedX, snappedY, guideX, guideY }.
     */
    function snapToObjects(pt, candidates, threshold = L.SNAP_THRESHOLD_PX) {
        let bestX = null, bestDX = threshold, bestXSrc = null;
        let bestY = null, bestDY = threshold, bestYSrc = null;

        for (const c of candidates) {
            if (c.x != null) {
                const dx = Math.abs(pt.x - c.x);
                if (dx < bestDX) { bestDX = dx; bestX = c.x; bestXSrc = c; }
            }
            if (c.y != null) {
                const dy = Math.abs(pt.y - c.y);
                if (dy < bestDY) { bestDY = dy; bestY = c.y; bestYSrc = c; }
            }
        }

        return {
            x:          bestX != null ? bestX : pt.x,
            y:          bestY != null ? bestY : pt.y,
            snappedX:   bestX != null,
            snappedY:   bestY != null,
            guideX:     bestX,
            guideY:     bestY,
            srcX:       bestXSrc,
            srcY:       bestYSrc,
        };
    }

    /**
     * Build a list of snap candidates from an array of bounding rects.
     * Candidates include left edges, right edges, centres, top, bottom, mid-Y.
     * @param {Array<{left,right,top,bottom}>} rects
     * @returns {Array<{x?,y?}>}
     */
    function buildCandidates(rects) {
        const candidates = [];
        for (const r of rects) {
            const mx = (r.left + r.right)  * 0.5;
            const my = (r.top  + r.bottom) * 0.5;
            candidates.push(
                { x: r.left  }, { x: r.right  }, { x: mx },
                { y: r.top   }, { y: r.bottom }, { y: my  },
            );
        }
        return candidates;
    }

    /**
     * Compute equal-distribution positions for an array of items along an axis.
     * Used for "smart distribute" alignment nudging.
     */
    function distributeEqual(positions, sizes, axis = 'x') {
        if (positions.length < 3) return positions;
        const sorted = positions.slice().sort((a, b) => a[axis] - b[axis]);
        const first  = sorted[0][axis];
        const last   = sorted[sorted.length - 1][axis] + (sizes[positions.length - 1] || 0);
        const totalSize = sizes.reduce((s, sz) => s + sz, 0);
        const gap    = (last - first - totalSize) / (positions.length - 1);
        let cursor   = first;
        return sorted.map((p, i) => {
            const result = { ...p, [axis]: cursor };
            cursor += (sizes[i] || 0) + gap;
            return result;
        });
    }

    /**
     * Angle-snap a rotation value to the nearest snap angle.
     * @param {number}   angleDeg
     * @param {number[]} snapAngles  e.g. [0, 45, 90, 135, 180, 225, 270, 315]
     * @param {number}   threshold  degrees
     */
    function snapAngle(angleDeg, snapAngles = [0, 45, 90, 135, 180, 225, 270, 315], threshold = 8) {
        let normalized = ((angleDeg % 360) + 360) % 360;
        for (const snap of snapAngles) {
            if (Math.abs(normalized - snap) < threshold) return snap;
        }
        return normalized;
    }

    return Object.freeze({ snapToGrid, snapToObjects, buildCandidates, distributeEqual, snapAngle });
})();

/* =========================================================================================
   §14  VIEWPORT MANAGER
   Camera, zoom, pan, inertia, fit-to-content, minimap sync
   ========================================================================================= */
class ZoltoViewportManager {

    constructor(containerEl, contentEls = [], options = {}) {
        this.container = containerEl;
        this.contents  = Array.isArray(contentEls) ? contentEls : [contentEls];
        this.opts      = Object.assign({
            minZoom:        ZoltoRouterConstants.LIMITS.ZOOM_MIN,
            maxZoom:        ZoltoRouterConstants.LIMITS.ZOOM_MAX,
            zoomStep:       ZoltoRouterConstants.LIMITS.ZOOM_STEP,
            inertia:        true,
            inertiaDecay:   ZoltoRouterConstants.LIMITS.INERTIA_DECAY,
            panSpeed:       ZoltoRouterConstants.LIMITS.PAN_SPEED,
            fitPadding:     ZoltoRouterConstants.LIMITS.FIT_PADDING,
            onTransform:    null,
            minimapEl:      null,
        }, options);

        this.transform   = { x: 0, y: 0, scale: 1 };
        this.isDragging  = false;
        this.lastMouse   = { x: 0, y: 0 };
        this.velocity    = { x: 0, y: 0 };
        this._rafPending = false;
        this._inertiaId  = null;

        this._onPointerDown  = this._handlePointerDown.bind(this);
        this._onPointerMove  = this._handlePointerMove.bind(this);
        this._onPointerUp    = this._handlePointerUp.bind(this);
        this._onWheel        = this._handleWheel.bind(this);
        this._onKeyDown      = this._handleKeyDown.bind(this);

        if (this.container) this._attach();
    }

    // ── Public API ────────────────────────────────────────────────────────────────────

    zoomIn()  { this._applyZoom(1 + this.opts.zoomStep, this._viewportCenter()); }
    zoomOut() { this._applyZoom(1 - this.opts.zoomStep, this._viewportCenter()); }

    zoomTo(scale, origin) {
        const center = origin || this._viewportCenter();
        const clamped = Math.max(this.opts.minZoom, Math.min(this.opts.maxZoom, scale));
        const old = this.transform.scale;
        this.transform.x     = center.x - (center.x - this.transform.x) * (clamped / old);
        this.transform.y     = center.y - (center.y - this.transform.y) * (clamped / old);
        this.transform.scale = clamped;
        this._commit();
    }

    panBy(dx, dy) {
        this.transform.x += dx * this.opts.panSpeed;
        this.transform.y += dy * this.opts.panSpeed;
        this._commit();
    }

    reset() {
        this.transform = { x: 0, y: 0, scale: 1 };
        this._commit();
    }

    /** Fit all content elements into the viewport with padding */
    fitToContent() {
        if (!this.container || this.contents.length === 0) return;
        const cRect = this.container.getBoundingClientRect();

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const el of this.contents) {
            if (!el) continue;
            const r = el.getBoundingClientRect();
            minX = Math.min(minX, r.left);
            minY = Math.min(minY, r.top);
            maxX = Math.max(maxX, r.right);
            maxY = Math.max(maxY, r.bottom);
        }

        if (minX === Infinity) return;
        const contentW = maxX - minX, contentH = maxY - minY;
        const pad      = this.opts.fitPadding;
        const scaleX   = (cRect.width  - pad * 2) / contentW;
        const scaleY   = (cRect.height - pad * 2) / contentH;
        const scale    = Math.max(this.opts.minZoom, Math.min(this.opts.maxZoom, Math.min(scaleX, scaleY)));

        this.transform.scale = scale;
        this.transform.x     = pad - (minX - cRect.left) * scale;
        this.transform.y     = pad - (minY - cRect.top)  * scale;
        this._commit();
    }

    getTransform() { return { ...this.transform }; }

    destroy() {
        if (this.container) {
            this.container.removeEventListener('mousedown',   this._onPointerDown);
            this.container.removeEventListener('touchstart',  this._onPointerDown);
            this.container.removeEventListener('wheel',       this._onWheel);
        }
        window.removeEventListener('mousemove',  this._onPointerMove);
        window.removeEventListener('mouseup',    this._onPointerUp);
        window.removeEventListener('touchmove',  this._onPointerMove);
        window.removeEventListener('touchend',   this._onPointerUp);
        window.removeEventListener('keydown',    this._onKeyDown);
        if (this._inertiaId) cancelAnimationFrame(this._inertiaId);
    }

    // ── Event handling ────────────────────────────────────────────────────────────────

    _attach() {
        this.container.addEventListener('mousedown',  this._onPointerDown);
        this.container.addEventListener('touchstart', this._onPointerDown, { passive: false });
        this.container.addEventListener('wheel',      this._onWheel,       { passive: false });
        window.addEventListener('mousemove',  this._onPointerMove, { passive: true });
        window.addEventListener('mouseup',    this._onPointerUp,   { passive: true });
        window.addEventListener('touchmove',  this._onPointerMove, { passive: false });
        window.addEventListener('touchend',   this._onPointerUp,   { passive: true });
        window.addEventListener('keydown',    this._onKeyDown);
    }

    _handlePointerDown(e) {
        const isTouch = e.type === 'touchstart';
        if (!isTouch && e.button !== 0 && e.button !== 1) return;
        const target = e.target;
        // Don't pan if the user is interacting with an input, button, or selectable node
        if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.closest('button, a, select'))) return;
        // Space+drag panning also initiates here
        this.isDragging = true;
        this.velocity   = { x: 0, y: 0 };
        if (this._inertiaId) { cancelAnimationFrame(this._inertiaId); this._inertiaId = null; }
        const pos = isTouch ? e.touches[0] : e;
        this.lastMouse = { x: pos.clientX, y: pos.clientY };
        if (this.container) this.container.style.cursor = 'grabbing';
    }

    _handlePointerMove(e) {
        if (!this.isDragging) return;
        const isTouch = e.type === 'touchmove';
        if (isTouch) e.preventDefault();
        const pos = isTouch ? e.touches[0] : e;
        const dx  = pos.clientX - this.lastMouse.x;
        const dy  = pos.clientY - this.lastMouse.y;
        this.velocity    = { x: dx, y: dy };
        this.transform.x += dx;
        this.transform.y += dy;
        this.lastMouse   = { x: pos.clientX, y: pos.clientY };
        this._commit();
    }

    _handlePointerUp() {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (this.container) this.container.style.cursor = '';
        if (this.opts.inertia && (Math.abs(this.velocity.x) > 1 || Math.abs(this.velocity.y) > 1)) {
            this._startInertia();
        }
    }

    _handleWheel(e) {
        e.preventDefault();
        const rect    = this.container.getBoundingClientRect();
        const origin  = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        // Pinch-to-zoom on trackpads uses ctrlKey
        const isMeta  = e.ctrlKey || e.metaKey;
        if (isMeta || e.type === 'wheel') {
            const factor  = e.deltaY > 0 ? (1 / 1.12) : 1.12;
            this._applyZoom(factor, origin);
        } else {
            // Plain scroll → pan
            this.transform.x -= e.deltaX;
            this.transform.y -= e.deltaY;
            this._commit();
        }
    }

    _handleKeyDown(e) {
        if (!this.container || document.activeElement !== this.container) return;
        const step = 32;
        switch (e.key) {
            case '+': case '=': this.zoomIn();  e.preventDefault(); break;
            case '-':           this.zoomOut(); e.preventDefault(); break;
            case '0':           this.reset();   e.preventDefault(); break;
            case 'ArrowLeft':   this.panBy( step, 0);  e.preventDefault(); break;
            case 'ArrowRight':  this.panBy(-step, 0);  e.preventDefault(); break;
            case 'ArrowUp':     this.panBy(0,  step);  e.preventDefault(); break;
            case 'ArrowDown':   this.panBy(0, -step);  e.preventDefault(); break;
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────────────

    _applyZoom(factor, origin) {
        const oldScale = this.transform.scale;
        const newScale = Math.max(this.opts.minZoom, Math.min(this.opts.maxZoom, oldScale * factor));
        if (newScale === oldScale) return;
        this.transform.x     = origin.x - (origin.x - this.transform.x) * (newScale / oldScale);
        this.transform.y     = origin.y - (origin.y - this.transform.y) * (newScale / oldScale);
        this.transform.scale = newScale;
        this._commit();
    }

    _viewportCenter() {
        if (!this.container) return { x: 400, y: 300 };
        const r = this.container.getBoundingClientRect();
        return { x: r.width * 0.5, y: r.height * 0.5 };
    }

    _startInertia() {
        const tick = () => {
            this.velocity.x *= this.opts.inertiaDecay;
            this.velocity.y *= this.opts.inertiaDecay;
            this.transform.x += this.velocity.x;
            this.transform.y += this.velocity.y;
            this._commit();
            if (Math.abs(this.velocity.x) > 0.3 || Math.abs(this.velocity.y) > 0.3) {
                this._inertiaId = requestAnimationFrame(tick);
            } else {
                this._inertiaId = null;
            }
        };
        this._inertiaId = requestAnimationFrame(tick);
    }

    _commit() {
        if (this._rafPending) return;
        this._rafPending = true;
        requestAnimationFrame(() => {
            const { x, y, scale } = this.transform;
            const t = `translate(${_f(x)}px, ${_f(y)}px) scale(${scale})`;
            for (const el of this.contents) {
                if (!el) continue;
                el.style.transform       = t;
                el.style.transformOrigin = '0 0';
                el.style.willChange      = 'transform';
            }
            this._syncMinimap();
            if (this.opts.onTransform) this.opts.onTransform({ ...this.transform });
            this._rafPending = false;
        });
    }

    _syncMinimap() {
        const minimap = this.opts.minimapEl;
        if (!minimap || !this.container) return;
        const cRect = this.container.getBoundingClientRect();
        const { x, y, scale } = this.transform;
        // Viewport rectangle in content-space coordinates
        const vpX = -x / scale, vpY = -y / scale;
        const vpW = cRect.width  / scale, vpH = cRect.height / scale;
        const vpRect = minimap.querySelector('.minimap-viewport');
        if (vpRect) {
            vpRect.style.left   = `${vpX * 0.1}px`;
            vpRect.style.top    = `${vpY * 0.1}px`;
            vpRect.style.width  = `${vpW * 0.1}px`;
            vpRect.style.height = `${vpH * 0.1}px`;
        }
    }
}

/* =========================================================================================
   §15  ZOLTO UTILS — EventBus · AST traversal · Performance · UUID · Data tools
   ========================================================================================= */
const ZoltoUtils = (function () {

    // ── EventBus ──────────────────────────────────────────────────────────────────────

    const EventBus = (function () {
        const _map = new Map();

        function subscribe(event, callback, once = false) {
            if (!_map.has(event)) _map.set(event, []);
            _map.get(event).push({ cb: callback, once });
            return () => unsubscribe(event, callback);  // returns unsubscriber
        }

        function once(event, callback) {
            return subscribe(event, callback, true);
        }

        function unsubscribe(event, callback) {
            if (!_map.has(event)) return;
            _map.set(event, _map.get(event).filter(h => h.cb !== callback));
        }

        function publish(event, data) {
            if (!_map.has(event)) return;
            const handlers = _map.get(event).slice();
            const remaining = [];
            for (const h of handlers) {
                try { h.cb(data); } catch (e) { console.error('[EventBus]', e); }
                if (!h.once) remaining.push(h);
            }
            _map.set(event, remaining);
        }

        function clear(event) {
            if (event) _map.delete(event);
            else _map.clear();
        }

        function topics() { return Array.from(_map.keys()); }

        return Object.freeze({ subscribe, once, unsubscribe, publish, clear, topics });
    })();

    // ── AST traversal ─────────────────────────────────────────────────────────────────

    const AST = Object.freeze({
        /**
         * Depth-first traversal with enter/exit visitor hooks.
         * @param {object}   node
         * @param {{ enter?, exit? }} visitor
         */
        traverse(node, visitor) {
            if (!node || typeof node !== 'object') return;
            if (visitor.enter) visitor.enter(node);
            const children = node.children || node.nodes;
            if (Array.isArray(children)) children.forEach(c => this.traverse(c, visitor));
            if (visitor.exit)  visitor.exit(node);
        },

        /** Collect all nodes matching a predicate */
        findAll(root, predicate) {
            const results = [];
            this.traverse(root, { enter: node => { if (predicate(node)) results.push(node); } });
            return results;
        },

        /** Find first node matching a predicate */
        findFirst(root, predicate) {
            let found = null;
            this.traverse(root, { enter: node => { if (!found && predicate(node)) found = node; } });
            return found;
        },

        /** Count nodes of a given type */
        countType(root, type) {
            let count = 0;
            this.traverse(root, { enter: node => { if (node.type === type) count++; } });
            return count;
        },

        /** Generate a collision-resistant UUID with 'zl-' prefix */
        generateUUID() {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return 'zl-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
            }
            return 'zl-' + Math.random().toString(36).slice(2, 11) +
                            Math.random().toString(36).slice(2, 5);
        },

        /** Clone a node (shallow on non-child fields, deep on children array) */
        cloneNode(node) {
            const clone = { ...node };
            if (Array.isArray(node.children)) clone.children = node.children.map(c => this.cloneNode(c));
            return clone;
        },
    });

    // ── Data utilities ────────────────────────────────────────────────────────────────

    const Data = Object.freeze({
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
            const clone = {};
            for (const key of Object.keys(obj)) clone[key] = this.deepClone(obj[key]);
            return clone;
        },

        parseCSV(csv) {
            if (typeof csv !== 'string') return [];
            return csv.trim().split('\n').map(line => {
                const cells = [];
                let inQ = false, cell = '';
                for (const ch of line) {
                    if (ch === '"') { inQ = !inQ; }
                    else if (ch === ',' && !inQ) { cells.push(cell.trim()); cell = ''; }
                    else cell += ch;
                }
                cells.push(cell.trim());
                return cells;
            });
        },

        parseTSV(tsv) {
            if (typeof tsv !== 'string') return [];
            return tsv.trim().split('\n').map(line => line.split('\t').map(c => c.trim()));
        },

        groupBy(arr, key) {
            return arr.reduce((acc, item) => {
                const k = item[key];
                if (!acc[k]) acc[k] = [];
                acc[k].push(item);
                return acc;
            }, {});
        },

        sortBy(arr, key, dir = 'asc') {
            return [...arr].sort((a, b) => {
                const va = a[key], vb = b[key];
                if (va < vb) return dir === 'asc' ? -1 :  1;
                if (va > vb) return dir === 'asc' ?  1 : -1;
                return 0;
            });
        },
    });

    // ── Performance utilities ─────────────────────────────────────────────────────────

    const Performance = Object.freeze({
        debounce(fn, delay, immediate = false) {
            let timer;
            return function (...args) {
                const callNow = immediate && !timer;
                clearTimeout(timer);
                timer = setTimeout(() => { timer = null; if (!immediate) fn.apply(this, args); }, delay);
                if (callNow) fn.apply(this, args);
            };
        },

        throttle(fn, interval) {
            let last = 0, timer;
            return function (...args) {
                const now = Date.now();
                const remaining = interval - (now - last);
                if (remaining <= 0) {
                    clearTimeout(timer);
                    last = now;
                    fn.apply(this, args);
                } else {
                    clearTimeout(timer);
                    timer = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, remaining);
                }
            };
        },

        /** Measure the time a synchronous callback takes in milliseconds */
        measure(label, fn) {
            const start = performance.now();
            const result = fn();
            const elapsed = performance.now() - start;
            if (elapsed > 16) console.warn(`[ZoltoPerf] ${label}: ${elapsed.toFixed(2)}ms`);
            return result;
        },

        /** Returns a memoized version of a pure function (shallow key) */
        memoize(fn) {
            const cache = new Map();
            return function (...args) {
                const key = JSON.stringify(args);
                if (cache.has(key)) return cache.get(key);
                const result = fn.apply(this, args);
                cache.set(key, result);
                return result;
            };
        },
    });

    // ── DOM utilities ─────────────────────────────────────────────────────────────────

    const DOM = Object.freeze({
        /** Safely query a selector within a root element */
        qs(selector, root = document) {
            try { return root.querySelector(selector); } catch { return null; }
        },

        /** Query all matching elements */
        qsa(selector, root = document) {
            try { return Array.from(root.querySelectorAll(selector)); } catch { return []; }
        },

        /** Create an element with optional attributes and children */
        el(tag, attrs = {}, ...children) {
            const el = document.createElement(tag);
            for (const [k, v] of Object.entries(attrs)) {
                if (k === 'class')  el.className = v;
                else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
                else el.setAttribute(k, v);
            }
            for (const child of children) {
                if (typeof child === 'string') el.appendChild(document.createTextNode(child));
                else if (child instanceof Node) el.appendChild(child);
            }
            return el;
        },

        /** Insert raw HTML safely (no script tags) */
        setHTML(el, html) {
            if (!el) return;
            const safe = html.replace(/<script[\s\S]*?<\/script>/gi, '');
            el.innerHTML = safe;
        },

        /** Get or set a CSS custom property on the document root */
        cssVar(name, value) {
            if (value === undefined) {
                return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            }
            document.documentElement.style.setProperty(name, value);
        },
    });

    return Object.freeze({ EventBus, AST, Data, Performance, DOM });
})();

/* =========================================================================================
   PRIVATE MICRO-HELPERS (module-internal, not exported)
   ========================================================================================= */

/** Format a number to max 3 decimal places (avoids SVG bloat) */
function _f(n) { return +n.toFixed(3); }

/** Escape HTML special chars */
function _escHtml(s) {
    if (typeof s !== 'string') return '';
    if (!/[&<>"']/.test(s)) return s;
    return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

/** Escape attribute value (tighter than escHtml) */
function _escAttr(s) {
    return _escHtml(String(s || '')).replace(/[^a-zA-Z0-9\-_:.]/g, c => `&#${c.charCodeAt(0)};`);
}

/** Safe HTML id: strip anything that would break an id="" attribute */
function _safeId(id) {
    if (!id || typeof id !== 'string') return '';
    return id.replace(/[^a-zA-Z0-9\-_:.]/g, '-').slice(0, 128);
}

/** Safe string for data-* attribute values */
function _safe(s) { return _escHtml(String(s || '')); }

/* =========================================================================================
   EXPORT — ESM · CommonJS · Browser global (compatible with all three)
   ========================================================================================= */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ZoltoRouterConstants,
        ZoltoVectorMath,
        ZoltoPortManager,
        ZoltoPathGenerators,
        ZoltoBridgeEngine,
        ZoltoLabelPlacer,
        ZoltoDefsGenerator,
        ZoltoDiagramThemer,
        ZoltoSVGRouter,
        ZoltoLayoutEngine,
        ZoltoComponentRuntime,
        ZoltoAnimationSystem,
        ZoltoSnappingSystem,
        ZoltoViewportManager,
        ZoltoUtils,
    };
} else if (typeof window !== 'undefined') {
    window.ZoltoRouterConstants  = ZoltoRouterConstants;
    window.ZoltoVectorMath       = ZoltoVectorMath;
    window.ZoltoPortManager      = ZoltoPortManager;
    window.ZoltoPathGenerators   = ZoltoPathGenerators;
    window.ZoltoBridgeEngine     = ZoltoBridgeEngine;
    window.ZoltoLabelPlacer      = ZoltoLabelPlacer;
    window.ZoltoDefsGenerator    = ZoltoDefsGenerator;
    window.ZoltoDiagramThemer    = ZoltoDiagramThemer;
    window.SVGRouter             = ZoltoSVGRouter;      // legacy name alias
    window.ZoltoSVGRouter        = ZoltoSVGRouter;
    window.ZoltoLayoutEngine     = ZoltoLayoutEngine;   // needed by onclick handlers
    window.ZoltoComponentRuntime = ZoltoComponentRuntime;
    window.ZoltoAnimationSystem  = ZoltoAnimationSystem;
    window.ZoltoSnappingSystem   = ZoltoSnappingSystem;
    window.ZoltoViewportManager  = ZoltoViewportManager;
    window.ZoltoUtils            = ZoltoUtils;
}
