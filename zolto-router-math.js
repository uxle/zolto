/**
 * =========================================================================================
 * ZOLTO STUDIO: UNIFIED MATHEMATICAL FOUNDATION ENGINE
 * Version: 8.0.0 (Infinity Architecture · Pure-Math Module)
 *
 * This module is the mathematical bedrock for all six Zolto capability domains.
 * Zero external dependencies. Zero DOM access. Pure computation only.
 * Designed for V8/Bun/JSC JIT optimisation and tree-shaking.
 *
 * §1  ZoltoRouterConstants   — Frozen config: math, routing, limits, physics, colors
 * §2  ZoltoVectorMath        — Complete 2D vector algebra + arc + transform helpers
 * §3  ZoltoMatrix2D          — 3×3 affine transform matrices (translate, rotate, scale, skew)
 * §4  ZoltoGeometry          — Polygon, convex hull, area, winding, clip, spatial queries
 * §5  ZoltoBezierMath        — Cubic/quadratic Bézier, Catmull-Rom, arc-length, split, LUT
 * §6  ZoltoPortManager       — 8-directional optimal port selection + multi-port queries
 * §7  ZoltoPathGenerators    — SVG path-string builders: Bézier · Ortho · Step · Spline · Arc
 * §8  ZoltoGraphLayoutMath   — Auto-layout: force-directed · hierarchical · radial · circular · mind-map
 * §9  ZoltoStatsMath         — Statistics for charts: mean · regression · histogram · pie · scale
 * §10 ZoltoColorMath         — Color spaces (RGB/HSL/HSV/Lab/LCh) · mixing · contrast · palette
 * §11 ZoltoPhysicsMath       — Spring simulation · Verlet · collision · constraint satisfaction
 * §12 ZoltoMathExpr          — Math expression tokeniser + layout-box model (LaTeX-lite)
 * §13 ZoltoSymbols           — Full Unicode symbol tables: Greek · operators · physics · chemistry
 * =========================================================================================
 */

'use strict';

/* =========================================================================================
   §1  ROUTER CONSTANTS — single frozen source of truth for all math parameters
   ========================================================================================= */

const ZoltoRouterConstants = Object.freeze({

    ROUTING_MODE: Object.freeze({
        BEZIER:      'bezier',
        ORTHOGONAL:  'orthogonal',
        STEP:        'step',
        STRAIGHT:    'straight',
        SPLINE:      'spline',
        ARC:         'arc',
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
        PI:          Math.PI,
        TAU:         Math.PI * 2,
        HALF_PI:     Math.PI / 2,
        QUARTER_PI:  Math.PI / 4,
        INV_PI:      1 / Math.PI,
        SQRT2:       Math.SQRT2,
        SQRT3:       Math.sqrt(3),
        PHI:         1.6180339887498948,   // Golden ratio
        E:           Math.E,
        LN2:         Math.LN2,
        LOG2E:       Math.LOG2E,
        DEG_TO_RAD:  Math.PI / 180,
        RAD_TO_DEG:  180 / Math.PI,
        EPSILON:     1e-10,
        NEAR_ZERO:   1e-6,
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
        SNAP_THRESHOLD_PX:     8,
        ZOOM_MIN:              0.05,
        ZOOM_MAX:              64.0,
        ZOOM_STEP:             0.1,
        INERTIA_DECAY:         0.88,
        FIT_PADDING:           48,
    }),

    PHYSICS: Object.freeze({
        SPRING_STIFFNESS:      0.08,
        SPRING_DAMPING:        0.75,
        REPULSION_STRENGTH:    4500,
        GRAVITY_STRENGTH:      0.01,
        MIN_DISTANCE:          10,
        TIME_STEP:             0.016,
        MAX_VELOCITY:          8,
        COOL_RATE:             0.95,
        ITERATIONS_DEFAULT:    300,
    }),

    LAYOUT: Object.freeze({
        FORCE_LAYER_GAP:       100,
        FORCE_NODE_GAP:        60,
        HIER_LAYER_GAP:        100,
        HIER_NODE_GAP:         60,
        RADIAL_RING_GAP:       120,
        MINDMAP_LEVEL_GAP:     140,
        MINDMAP_MIN_ANGLE:     0.4,
        CIRCULAR_START_ANGLE:  -Math.PI / 2,
        GRID_CELL_W:           120,
        GRID_CELL_H:           80,
    }),

    OPERATOR_CLASS: Object.freeze({
        '->':   'edge-solid',
        '=>':   'edge-transition',
        '~>':   'edge-async',
        '..>':  'edge-dotted',
        '<->':  'edge-bidirectional',
        '===':  'edge-thick',
        '-->':  'edge-dashed',
        '~~>':  'edge-wavy',
        '->>':  'edge-double',
        '-->>': 'edge-async-return',
    }),

    DIAGRAM_THEMES: Object.freeze({
        DEFAULT:   { nodeFill: 'var(--bg-panel)',  nodeStroke: 'var(--border-heavy)', text: 'var(--text-main)',  edge: 'var(--text-mute)' },
        DARK:      { nodeFill: 'var(--bg-deep)',   nodeStroke: 'var(--border-heavy)', text: 'var(--text-main)',  edge: 'var(--text-mute)' },
        FOREST:    { nodeFill: '#1a2e1a',          nodeStroke: '#2d5a27',             text: '#c8f7c5',           edge: '#4a9e43'          },
        OCEAN:     { nodeFill: '#0a1628',          nodeStroke: '#1e3a5f',             text: '#c5dff8',           edge: '#3d87cc'          },
        SUNSET:    { nodeFill: '#2a1520',          nodeStroke: '#7b2d42',             text: '#ffd6e0',           edge: '#e85d7b'          },
        MONO:      { nodeFill: '#f8f8f8',          nodeStroke: '#222',                text: '#111',              edge: '#666'             },
        BLUEPRINT: { nodeFill: '#1a2744',          nodeStroke: '#2756b0',             text: '#c8d8f0',           edge: '#4e89e0'          },
        PASTEL:    { nodeFill: '#fef9f0',          nodeStroke: '#d4a96a',             text: '#3d2b1f',           edge: '#a07850'          },
    }),
});

/* =========================================================================================
   §2  VECTOR MATH — complete 2D vector algebra
   ========================================================================================= */

class ZoltoVectorMath {

    // ── Primitives ────────────────────────────────────────────────────────────────────

    static distance(p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distanceSq(p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        return dx * dx + dy * dy;
    }

    static angle(p1, p2) { return Math.atan2(p2.y - p1.y, p2.x - p1.x); }

    static midpoint(p1, p2) { return { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 }; }

    static lerp(p1, p2, t) { return { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t }; }

    static project(point, angle, distance) {
        return { x: point.x + Math.cos(angle) * distance, y: point.y + Math.sin(angle) * distance };
    }

    static normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        if (len < ZoltoRouterConstants.MATH.EPSILON) return { x: 0, y: 0 };
        return { x: v.x / len, y: v.y / len };
    }

    static magnitude(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }

    static scale(v, s)   { return { x: v.x * s, y: v.y * s }; }
    static add(a, b)     { return { x: a.x + b.x, y: a.y + b.y }; }
    static sub(a, b)     { return { x: a.x - b.x, y: a.y - b.y }; }
    static negate(v)     { return { x: -v.x, y: -v.y }; }
    static dot(v1, v2)   { return v1.x * v2.x + v1.y * v2.y; }
    static cross(v1, v2) { return v1.x * v2.y - v1.y * v2.x; }
    static perp(v)       { return { x: -v.y, y: v.x }; }  // 90° CCW

    // Alias kept for backward compat
    static dotProduct(v1, v2)   { return this.dot(v1, v2); }
    static crossProduct(v1, v2) { return this.cross(v1, v2); }

    static rotatePoint(p, origin, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const dx = p.x - origin.x, dy = p.y - origin.y;
        return { x: origin.x + dx * cos - dy * sin, y: origin.y + dx * sin + dy * cos };
    }

    static clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    static smoothstep(t) { return t * t * (3 - 2 * t); }

    static angleBetween(v1, v2) {
        const d = this.dot(this.normalize(v1), this.normalize(v2));
        return Math.acos(this.clamp(d, -1, 1));
    }

    static reflect(v, normal) {
        const d = 2 * this.dot(v, normal);
        return { x: v.x - d * normal.x, y: v.y - d * normal.y };
    }

    // ── Line & segment operations ─────────────────────────────────────────────────────

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
        const t = this.clamp(this.dot(ap, ab) / (this.dot(ab, ab) || 1), 0, 1);
        return this.add(a, this.scale(ab, t));
    }

    static distanceToSegment(p, a, b) {
        return this.distance(p, this.closestPointOnSegment(p, a, b));
    }

    static pointOnLine(p1, p2, t) { return this.lerp(p1, p2, t); }

    // ── AABB (axis-aligned bounding box) ─────────────────────────────────────────────

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
        return {
            left: rect.left - margin, right: rect.right + margin,
            top: rect.top - margin,   bottom: rect.bottom + margin,
            width: (rect.width  || rect.right - rect.left) + margin * 2,
            height: (rect.height || rect.bottom - rect.top) + margin * 2,
        };
    }

    static rectUnion(a, b) {
        return {
            left: Math.min(a.left, b.left), right: Math.max(a.right, b.right),
            top:  Math.min(a.top,  b.top),  bottom: Math.max(a.bottom, b.bottom),
        };
    }

    static rectIntersection(a, b) {
        const left = Math.max(a.left, b.left), right = Math.min(a.right, b.right);
        const top  = Math.max(a.top,  b.top),  bottom = Math.min(a.bottom, b.bottom);
        if (left >= right || top >= bottom) return null;
        return { left, right, top, bottom, width: right - left, height: bottom - top };
    }

    // ── Arc helper ────────────────────────────────────────────────────────────────────

    static arcPath(cx, cy, rx, ry, startDeg, endDeg, sweep = 1) {
        const DTR  = ZoltoRouterConstants.MATH.DEG_TO_RAD;
        const x1   = cx + rx * Math.cos(startDeg * DTR);
        const y1   = cy + ry * Math.sin(startDeg * DTR);
        const x2   = cx + rx * Math.cos(endDeg   * DTR);
        const y2   = cy + ry * Math.sin(endDeg   * DTR);
        const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
        return `M ${_f(x1)},${_f(y1)} A ${_f(rx)},${_f(ry)} 0 ${large},${sweep} ${_f(x2)},${_f(y2)}`;
    }

    // ── Affine transform ──────────────────────────────────────────────────────────────

    static applyTransform(p, tx, ty, scale) {
        return { x: p.x * scale + tx, y: p.y * scale + ty };
    }

    static invertTransform(p, tx, ty, scale) {
        return { x: (p.x - tx) / scale, y: (p.y - ty) / scale };
    }
}

/* =========================================================================================
   §3  MATRIX 2D — 3×3 affine transform matrices for 2D space
   Stored as [a, b, c, d, e, f] where the matrix is:
     | a  c  e |
     | b  d  f |
     | 0  0  1 |
   ========================================================================================= */

class ZoltoMatrix2D {

    /** Identity matrix */
    static identity() { return [1, 0, 0, 1, 0, 0]; }

    static translate(tx, ty) { return [1, 0, 0, 1, tx, ty]; }

    static rotate(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [c, s, -s, c, 0, 0];
    }

    static scale(sx, sy = sx) { return [sx, 0, 0, sy, 0, 0]; }

    static skewX(angle) { return [1, 0, Math.tan(angle), 1, 0, 0]; }

    static skewY(angle) { return [1, Math.tan(angle), 0, 1, 0, 0]; }

    /** Multiply two 2D affine matrices m1 × m2 */
    static multiply(m1, m2) {
        const [a1, b1, c1, d1, e1, f1] = m1;
        const [a2, b2, c2, d2, e2, f2] = m2;
        return [
            a1 * a2 + c1 * b2,
            b1 * a2 + d1 * b2,
            a1 * c2 + c1 * d2,
            b1 * c2 + d1 * d2,
            a1 * e2 + c1 * f2 + e1,
            b1 * e2 + d1 * f2 + f1,
        ];
    }

    /** Apply a matrix to a 2D point */
    static applyToPoint(m, p) {
        const [a, b, c, d, e, f] = m;
        return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
    }

    /** Apply a matrix to an array of points */
    static applyToPoints(m, pts) { return pts.map(p => this.applyToPoint(m, p)); }

    /** Determinant of a 2D affine matrix */
    static determinant(m) { return m[0] * m[3] - m[1] * m[2]; }

    /** Inverse of a 2D affine matrix (returns null if singular) */
    static inverse(m) {
        const [a, b, c, d, e, f] = m;
        const det = a * d - b * c;
        if (Math.abs(det) < ZoltoRouterConstants.MATH.EPSILON) return null;
        const id = 1 / det;
        return [ d * id, -b * id, -c * id, a * id,
                 (c * f - d * e) * id, (b * e - a * f) * id ];
    }

    /** Compose: translate → rotate (around origin) → scale */
    static compose(tx, ty, angle, sx, sy = sx) {
        return this.multiply(this.multiply(this.translate(tx, ty), this.rotate(angle)), this.scale(sx, sy));
    }

    /** CSS transform string for a 2D affine matrix */
    static toCSSTransform(m) {
        return `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${m[5]})`;
    }

    /** SVG transform attribute string */
    static toSVGTransform(m) { return `matrix(${m.map(v => _f(v)).join(' ')})`; }

    /** Decompose a matrix into { tx, ty, rotation, scaleX, scaleY, skewX } */
    static decompose(m) {
        const [a, b, c, d, e, f] = m;
        const scaleX   = Math.sqrt(a * a + b * b);
        const scaleY   = Math.sqrt(c * c + d * d);
        const rotation = Math.atan2(b, a);
        return { tx: e, ty: f, rotation, scaleX, scaleY, skewX: Math.atan2(a * c + b * d, scaleX * scaleX) };
    }
}

/* =========================================================================================
   §4  GEOMETRY — polygon operations, convex hull, area, winding, clipping
   ========================================================================================= */

class ZoltoGeometry {

    /** Signed area of a polygon (positive = CCW, negative = CW) */
    static signedArea(pts) {
        let area = 0;
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        }
        return area * 0.5;
    }

    static area(pts) { return Math.abs(this.signedArea(pts)); }

    static centroid(pts) {
        const n = pts.length;
        let cx = 0, cy = 0, A = 0;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const a = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
            cx += (pts[i].x + pts[j].x) * a;
            cy += (pts[i].y + pts[j].y) * a;
            A  += a;
        }
        A *= 3;
        if (Math.abs(A) < ZoltoRouterConstants.MATH.EPSILON) {
            return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n };
        }
        return { x: cx / A, y: cy / A };
    }

    /** Point-in-polygon (ray casting, O(n)) */
    static pointInPolygon(point, polygon) {
        const { x, y } = point;
        let inside = false;
        const n = polygon.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /** Graham scan convex hull — O(n log n) */
    static convexHull(pts) {
        if (pts.length < 3) return pts.slice();
        const sorted = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        const cross  = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        const lower  = [], upper = [];
        for (const p of sorted) {
            while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
            lower.push(p);
        }
        for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i];
            while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
            upper.push(p);
        }
        upper.pop(); lower.pop();
        return lower.concat(upper);
    }

    /** Sutherland-Hodgman polygon clipping against a rectangle */
    static clipPolygonToRect(poly, rect) {
        const edges = [
            { a: { x: rect.left,  y: rect.top    }, b: { x: rect.right, y: rect.top    } },
            { a: { x: rect.right, y: rect.top    }, b: { x: rect.right, y: rect.bottom } },
            { a: { x: rect.right, y: rect.bottom }, b: { x: rect.left,  y: rect.bottom } },
            { a: { x: rect.left,  y: rect.bottom }, b: { x: rect.left,  y: rect.top    } },
        ];
        let output = poly.slice();
        for (const edge of edges) {
            if (!output.length) return [];
            const input = output;
            output = [];
            for (let i = 0; i < input.length; i++) {
                const S = input[i], E = input[(i + 1) % input.length];
                const inside = (p) => {
                    return (edge.b.x - edge.a.x) * (p.y - edge.a.y) - (edge.b.y - edge.a.y) * (p.x - edge.a.x) >= 0;
                };
                if (inside(E)) {
                    if (!inside(S)) {
                        const pt = ZoltoVectorMath.lineIntersection(S, E, edge.a, edge.b);
                        if (pt) output.push(pt);
                    }
                    output.push(E);
                } else if (inside(S)) {
                    const pt = ZoltoVectorMath.lineIntersection(S, E, edge.a, edge.b);
                    if (pt) output.push(pt);
                }
            }
        }
        return output;
    }

    /** Axis-aligned bounding box of a point array */
    static aabb(pts) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        }
        return { left: minX, top: minY, right: maxX, bottom: maxY, width: maxX - minX, height: maxY - minY };
    }

    /** Expand a polygon outward by `amount` (approximate, per-vertex offset) */
    static offsetPolygon(pts, amount) {
        const n = pts.length;
        return pts.map((p, i) => {
            const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
            const d1 = ZoltoVectorMath.normalize(ZoltoVectorMath.sub(p, prev));
            const d2 = ZoltoVectorMath.normalize(ZoltoVectorMath.sub(next, p));
            const normal = ZoltoVectorMath.normalize({ x: -(d1.y + d2.y), y: d1.x + d2.x });
            return { x: p.x + normal.x * amount, y: p.y + normal.y * amount };
        });
    }

    /** Check if two circles overlap */
    static circlesOverlap(c1, c2) {
        return ZoltoVectorMath.distanceSq(c1, c2) < (c1.r + c2.r) ** 2;
    }

    /** Circle-rectangle intersection test */
    static circleRectOverlap(cx, cy, r, rect) {
        const nearX = Math.max(rect.left, Math.min(cx, rect.right));
        const nearY = Math.max(rect.top,  Math.min(cy, rect.bottom));
        return (cx - nearX) ** 2 + (cy - nearY) ** 2 <= r * r;
    }
}

/* =========================================================================================
   §5  BEZIER MATH — curves, splines, arc-length parameterisation, splitting
   ========================================================================================= */

class ZoltoBezierMath {

    // ── Cubic Bézier ─────────────────────────────────────────────────────────────────

    static cubicPoint(t, p0, p1, p2, p3) {
        const u = 1 - t, uu = u * u, uuu = uu * u, tt = t * t, ttt = tt * t;
        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
        };
    }

    static cubicDerivative(t, p0, p1, p2, p3) {
        const u = 1 - t;
        return {
            x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
            y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
        };
    }

    static cubicLength(p0, p1, p2, p3, steps = 16) {
        let len = 0, prev = p0;
        for (let i = 1; i <= steps; i++) {
            const curr = this.cubicPoint(i / steps, p0, p1, p2, p3);
            len += ZoltoVectorMath.distance(prev, curr);
            prev = curr;
        }
        return len;
    }

    /** Build an arc-length LUT for uniform-speed parameterisation */
    static buildCubicLUT(p0, p1, p2, p3, steps = 64) {
        const lut = [{ t: 0, len: 0 }];
        let totalLen = 0, prev = p0;
        for (let i = 1; i <= steps; i++) {
            const t    = i / steps;
            const curr = this.cubicPoint(t, p0, p1, p2, p3);
            totalLen  += ZoltoVectorMath.distance(prev, curr);
            lut.push({ t, len: totalLen });
            prev = curr;
        }
        return { lut, totalLen };
    }

    /** Map arc-length distance to curve parameter t using a LUT */
    static lutGetT(lut, totalLen, targetLen) {
        if (targetLen <= 0) return 0;
        if (targetLen >= totalLen) return 1;
        let lo = 0, hi = lut.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (lut[mid].len < targetLen) lo = mid; else hi = mid;
        }
        const t0 = lut[lo].t,   l0 = lut[lo].len;
        const t1 = lut[hi].t,   l1 = lut[hi].len;
        const frac = l1 > l0 ? (targetLen - l0) / (l1 - l0) : 0;
        return t0 + frac * (t1 - t0);
    }

    /** De Casteljau split at t — returns [left, right] cubic Bézier */
    static splitCubic(t, p0, p1, p2, p3) {
        const lerp = ZoltoVectorMath.lerp;
        const q0 = lerp(p0, p1, t), q1 = lerp(p1, p2, t), q2 = lerp(p2, p3, t);
        const r0 = lerp(q0, q1, t), r1 = lerp(q1, q2, t);
        const s0 = lerp(r0, r1, t);
        return [
            [p0, q0, r0, s0],
            [s0, r1, q2, p3],
        ];
    }

    /** Elevate a quadratic to cubic Bézier */
    static elevateToCubic(p0, p1, p2) {
        return [
            p0,
            { x: p0.x + (2/3) * (p1.x - p0.x), y: p0.y + (2/3) * (p1.y - p0.y) },
            { x: p2.x + (2/3) * (p1.x - p2.x), y: p2.y + (2/3) * (p1.y - p2.y) },
            p2,
        ];
    }

    // ── Quadratic Bézier ─────────────────────────────────────────────────────────────

    static quadPoint(t, p0, p1, p2) {
        const u = 1 - t;
        return {
            x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
            y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
        };
    }

    // ── Catmull-Rom spline → array of cubic Bézier segments ──────────────────────────

    static catmullRomToBezier(points, alpha = 0.5) {
        if (points.length < 2) return [];
        const pts      = [points[0], ...points, points[points.length - 1]];
        const segments = [];
        for (let i = 1; i < pts.length - 2; i++) {
            const [p0, p1, p2, p3] = [pts[i-1], pts[i], pts[i+1], pts[i+2]];
            const d1 = Math.pow(ZoltoVectorMath.distanceSq(p0, p1), alpha * 0.5);
            const d2 = Math.pow(ZoltoVectorMath.distanceSq(p1, p2), alpha * 0.5);
            const d3 = Math.pow(ZoltoVectorMath.distanceSq(p2, p3), alpha * 0.5);
            const cp1 = {
                x: p1.x + (p2.x - p0.x) / 6 * (d1 > 0 ? d2 / d1 : 0),
                y: p1.y + (p2.y - p0.y) / 6 * (d1 > 0 ? d2 / d1 : 0),
            };
            const cp2 = {
                x: p2.x - (p3.x - p1.x) / 6 * (d3 > 0 ? d2 / d3 : 0),
                y: p2.y - (p3.y - p1.y) / 6 * (d3 > 0 ? d2 / d3 : 0),
            };
            segments.push({ p1, cp1, cp2, p2 });
        }
        return segments;
    }

    /** Discretise a cubic Bézier into a polyline (for collision/intersection) */
    static discretizeCubic(p0, p1, p2, p3, steps = 32) {
        const pts = [];
        for (let i = 0; i <= steps; i++) pts.push(this.cubicPoint(i / steps, p0, p1, p2, p3));
        return pts;
    }
}

/* =========================================================================================
   §6  PORT MANAGER — optimal exit/entry port selection with 8-directional awareness
   ========================================================================================= */

class ZoltoPortManager {

    static getOptimalPorts(rectA, rectB, mode = ZoltoRouterConstants.ROUTING_MODE.BEZIER) {
        const cA = ZoltoVectorMath.rectCenter(rectA);
        const cB = ZoltoVectorMath.rectCenter(rectB);
        const dx = cB.x - cA.x, dy = cB.y - cA.y;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        const D = ZoltoRouterConstants.DIRECTION;
        let portA, portB;

        const isOrtho = mode === ZoltoRouterConstants.ROUTING_MODE.ORTHOGONAL;
        if (isOrtho) {
            if (absDx > absDy * 1.5) { portA = dx > 0 ? D.RIGHT : D.LEFT;  portB = dx > 0 ? D.LEFT : D.RIGHT; }
            else if (absDy > absDx * 1.5) { portA = dy > 0 ? D.BOTTOM : D.TOP; portB = dy > 0 ? D.TOP : D.BOTTOM; }
            else { portA = absDx > absDy ? (dx > 0 ? D.RIGHT : D.LEFT) : (dy > 0 ? D.BOTTOM : D.TOP); portB = absDx > absDy ? (dx > 0 ? D.LEFT : D.RIGHT) : (dy > 0 ? D.TOP : D.BOTTOM); }
        } else {
            if (absDx > absDy) { portA = dx > 0 ? D.RIGHT : D.LEFT; portB = dx > 0 ? D.LEFT : D.RIGHT; }
            else { portA = dy > 0 ? D.BOTTOM : D.TOP; portB = dy > 0 ? D.TOP : D.BOTTOM; }
        }

        return { fromDir: portA, toDir: portB,
                 fromPoint: this.getPortCoordinate(rectA, portA),
                 toPoint:   this.getPortCoordinate(rectB, portB) };
    }

    static getPortCoordinate(rect, direction) {
        const D  = ZoltoRouterConstants.DIRECTION;
        const mx = rect.left + (rect.width  || rect.right  - rect.left) * 0.5;
        const my = rect.top  + (rect.height || rect.bottom - rect.top)  * 0.5;
        switch (direction) {
            case D.TOP:          return { x: mx,         y: rect.top    };
            case D.BOTTOM:       return { x: mx,         y: rect.bottom };
            case D.LEFT:         return { x: rect.left,  y: my          };
            case D.RIGHT:        return { x: rect.right, y: my          };
            case D.TOP_LEFT:     return { x: rect.left,  y: rect.top    };
            case D.TOP_RIGHT:    return { x: rect.right, y: rect.top    };
            case D.BOTTOM_LEFT:  return { x: rect.left,  y: rect.bottom };
            case D.BOTTOM_RIGHT: return { x: rect.right, y: rect.bottom };
            default:             return { x: mx,         y: my          };
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

    static getAllPorts(rect) {
        return Object.values(ZoltoRouterConstants.DIRECTION)
            .filter(d => d !== ZoltoRouterConstants.DIRECTION.CENTER)
            .map(d => ({ direction: d, point: this.getPortCoordinate(rect, d) }));
    }

    static getClosestPortPair(rectA, rectB) {
        const pa = this.getAllPorts(rectA), pb = this.getAllPorts(rectB);
        let bestDist = Infinity, bestA = pa[0], bestB = pb[0];
        for (const a of pa) for (const b of pb) {
            const d = ZoltoVectorMath.distanceSq(a.point, b.point);
            if (d < bestDist) { bestDist = d; bestA = a; bestB = b; }
        }
        return { fromDir: bestA.direction, toDir: bestB.direction, fromPoint: bestA.point, toPoint: bestB.point };
    }
}

/* =========================================================================================
   §7  PATH GENERATORS — SVG path-string builders for every routing mode
   ========================================================================================= */

class ZoltoPathGenerators {

    static generateBezier(p1, dir1, p2, dir2) {
        const n1   = ZoltoPortManager.getPortNormal(dir1);
        const n2   = ZoltoPortManager.getPortNormal(dir2);
        const dist = Math.max(ZoltoRouterConstants.LIMITS.MIN_CONTROL_OFFSET,
            Math.min(ZoltoRouterConstants.LIMITS.MAX_CONTROL_OFFSET, ZoltoVectorMath.distance(p1, p2) * 0.42));
        const cp1 = { x: p1.x + n1.x * dist, y: p1.y + n1.y * dist };
        const cp2 = { x: p2.x + n2.x * dist, y: p2.y + n2.y * dist };
        return {
            path: `M ${_f(p1.x)},${_f(p1.y)} C ${_f(cp1.x)},${_f(cp1.y)} ${_f(cp2.x)},${_f(cp2.y)} ${_f(p2.x)},${_f(p2.y)}`,
            math: { type: 'bezier', p1, cp1, cp2, p2 },
        };
    }

    static generateOrthogonal(p1, dir1, p2, dir2, radius = ZoltoRouterConstants.LIMITS.ORTHO_CORNER_RADIUS) {
        const D  = ZoltoRouterConstants.DIRECTION;
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const pts = [p1];

        if (dir1 === D.RIGHT && dir2 === D.LEFT)   { const mx = p1.x + dx * 0.5; pts.push({ x: mx, y: p1.y }, { x: mx, y: p2.y }); }
        else if (dir1 === D.LEFT && dir2 === D.RIGHT)  { const mx = p1.x + dx * 0.5; pts.push({ x: mx, y: p1.y }, { x: mx, y: p2.y }); }
        else if (dir1 === D.BOTTOM && dir2 === D.TOP)  { const my = p1.y + dy * 0.5; pts.push({ x: p1.x, y: my }, { x: p2.x, y: my }); }
        else if (dir1 === D.TOP && dir2 === D.BOTTOM)  { const my = p1.y + dy * 0.5; pts.push({ x: p1.x, y: my }, { x: p2.x, y: my }); }
        else pts.push({ x: p1.x, y: p2.y });

        pts.push(p2);
        return { path: this._roundedPolyline(pts, radius), math: { type: 'polyline', points: pts } };
    }

    static generateStep(p1, p2) {
        const midX = (p1.x + p2.x) * 0.5;
        const pts  = [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
        return { path: this._roundedPolyline(pts, ZoltoRouterConstants.LIMITS.ORTHO_CORNER_RADIUS), math: { type: 'step', points: pts } };
    }

    static generateStraight(p1, p2) {
        return { path: `M ${_f(p1.x)},${_f(p1.y)} L ${_f(p2.x)},${_f(p2.y)}`, math: { type: 'line', p1, p2 } };
    }

    static generateSpline(waypoints) {
        if (!Array.isArray(waypoints) || waypoints.length < 2) return this.generateStraight(waypoints[0], waypoints[1]);
        const segs = ZoltoBezierMath.catmullRomToBezier(waypoints);
        if (!segs.length) return this.generateStraight(waypoints[0], waypoints[waypoints.length - 1]);
        let path = `M ${_f(segs[0].p1.x)},${_f(segs[0].p1.y)}`;
        for (const s of segs) path += ` C ${_f(s.cp1.x)},${_f(s.cp1.y)} ${_f(s.cp2.x)},${_f(s.cp2.y)} ${_f(s.p2.x)},${_f(s.p2.y)}`;
        return { path, math: { type: 'spline', waypoints, segments: segs } };
    }

    static generateSelfLoop(rect) {
        const L   = ZoltoRouterConstants.LIMITS.SELF_LOOP_SIZE;
        const p1  = ZoltoPortManager.getPortCoordinate(rect, ZoltoRouterConstants.DIRECTION.RIGHT);
        const p2  = ZoltoPortManager.getPortCoordinate(rect, ZoltoRouterConstants.DIRECTION.TOP);
        const cp1 = { x: p1.x + L,         y: p1.y        };
        const cp2 = { x: p2.x + L * 0.3,   y: p2.y - L    };
        return {
            path: `M ${_f(p1.x)},${_f(p1.y)} C ${_f(cp1.x)},${_f(cp1.y)} ${_f(cp2.x)},${_f(cp2.y)} ${_f(p2.x)},${_f(p2.y)}`,
            math: { type: 'bezier', p1, cp1, cp2, p2 },
        };
    }

    static generateArc(p1, p2, sweepLarge = false) {
        const dist = ZoltoVectorMath.distance(p1, p2);
        const rx = dist * 0.6, ry = dist * 0.6;
        return {
            path: `M ${_f(p1.x)},${_f(p1.y)} A ${_f(rx)},${_f(ry)} 0 ${sweepLarge ? 1 : 0},1 ${_f(p2.x)},${_f(p2.y)}`,
            math: { type: 'arc', p1, p2 },
        };
    }

    /** Build an SVG polygon path string from a point array */
    static pointsToPolygonPath(pts, closed = true) {
        if (!pts.length) return '';
        let d = `M ${_f(pts[0].x)},${_f(pts[0].y)}`;
        for (let i = 1; i < pts.length; i++) d += ` L ${_f(pts[i].x)},${_f(pts[i].y)}`;
        return closed ? d + ' Z' : d;
    }

    static _roundedPolyline(pts, radius) {
        if (pts.length < 2) return '';
        let d = `M ${_f(pts[0].x)},${_f(pts[0].y)}`;
        for (let i = 1; i < pts.length - 1; i++) {
            const prev = pts[i-1], curr = pts[i], next = pts[i+1];
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
   §8  GRAPH LAYOUT MATH — auto-layout algorithms for all diagram types
   ========================================================================================= */

class ZoltoGraphLayoutMath {

    /**
     * Force-directed (Fruchterman-Reingold) — general purpose, produces organic layouts.
     * @param {Array<{id,w?,h?}>} nodes
     * @param {Array<{source,target}>} edges
     * @param {object} opts  { width, height, iterations, idealLen }
     * @returns {Map<id,{x,y}>}
     */
    static forceDirected(nodes, edges, opts = {}) {
        const W     = opts.width      || 800;
        const H     = opts.height     || 600;
        const ITER  = opts.iterations || ZoltoRouterConstants.PHYSICS.ITERATIONS_DEFAULT;
        const K     = opts.idealLen   || Math.sqrt(W * H / Math.max(nodes.length, 1));
        const COOL  = opts.coolRate   || ZoltoRouterConstants.PHYSICS.COOL_RATE;

        const pos = new Map();
        for (const n of nodes) {
            pos.set(n.id, {
                x: W * 0.15 + Math.random() * W * 0.7,
                y: H * 0.15 + Math.random() * H * 0.7,
            });
        }

        const adj = new Map();
        for (const n of nodes) adj.set(n.id, []);
        for (const e of edges) {
            adj.get(e.source || '')?.push(e.target);
            adj.get(e.target || '')?.push(e.source);
        }

        let temp = W / 10;

        for (let iter = 0; iter < ITER; iter++) {
            const disp = new Map();
            for (const n of nodes) disp.set(n.id, { x: 0, y: 0 });

            // Repulsion: all pairs O(n²) — optimise with grid-cell partition for large graphs
            const arr = nodes;
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    const pa = pos.get(arr[i].id), pb = pos.get(arr[j].id);
                    const dx = pa.x - pb.x || 0.01, dy = pa.y - pb.y || 0.01;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
                    const force = (K * K) / dist;
                    const fx = (dx / dist) * force, fy = (dy / dist) * force;
                    const da = disp.get(arr[i].id), db = disp.get(arr[j].id);
                    da.x += fx; da.y += fy;
                    db.x -= fx; db.y -= fy;
                }
            }

            // Attraction: edges
            for (const e of edges) {
                const pa = pos.get(e.source), pb = pos.get(e.target);
                if (!pa || !pb) continue;
                const dx = pa.x - pb.x, dy = pa.y - pb.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
                const force = (dist * dist) / K;
                const fx = (dx / dist) * force, fy = (dy / dist) * force;
                const da = disp.get(e.source), db = disp.get(e.target);
                if (da) { da.x -= fx; da.y -= fy; }
                if (db) { db.x += fx; db.y += fy; }
            }

            // Apply with temperature cap + boundary
            for (const n of nodes) {
                const p = pos.get(n.id), d = disp.get(n.id);
                const dl = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
                const dx = (d.x / dl) * Math.min(dl, temp);
                const dy = (d.y / dl) * Math.min(dl, temp);
                pos.set(n.id, {
                    x: Math.max(0, Math.min(W, p.x + dx)),
                    y: Math.max(0, Math.min(H, p.y + dy)),
                });
            }

            temp *= COOL;
        }

        return pos;
    }

    /**
     * Hierarchical layout (Sugiyama-style BFS layering).
     * @returns {Map<id,{x,y}>}
     */
    static hierarchical(nodes, edges, opts = {}) {
        const dir      = opts.direction || 'TB';
        const layerGap = opts.layerGap  || ZoltoRouterConstants.LAYOUT.HIER_LAYER_GAP;
        const nodeGap  = opts.nodeGap   || ZoltoRouterConstants.LAYOUT.HIER_NODE_GAP;
        const W        = opts.width     || 800;
        const H        = opts.height    || 600;

        // Assign layers via BFS from roots (nodes with no incoming edges)
        const inDeg = new Map();
        for (const n of nodes) inDeg.set(n.id, 0);
        for (const e of edges) if (inDeg.has(e.target)) inDeg.set(e.target, inDeg.get(e.target) + 1);

        const roots   = nodes.filter(n => inDeg.get(n.id) === 0).map(n => n.id);
        if (!roots.length && nodes.length) roots.push(nodes[0].id);

        const layer   = new Map();
        const queue   = roots.map(id => ({ id, d: 0 }));
        const visited = new Set();
        let   maxL    = 0;

        while (queue.length) {
            const { id, d } = queue.shift();
            if (visited.has(id)) { if (d > (layer.get(id) || 0)) layer.set(id, d); continue; }
            visited.add(id); layer.set(id, d); maxL = Math.max(maxL, d);
            for (const e of edges) if (e.source === id) queue.push({ id: e.target, d: d + 1 });
        }

        for (const n of nodes) if (!layer.has(n.id)) { layer.set(n.id, ++maxL); }

        // Group by layer
        const groups = new Map();
        for (const [id, l] of layer) {
            if (!groups.has(l)) groups.set(l, []);
            groups.get(l).push(id);
        }

        const pos = new Map();
        for (const [l, ids] of groups) {
            const main  = l * layerGap + layerGap;
            ids.forEach((id, i) => {
                const cross = (i - (ids.length - 1) / 2) * nodeGap;
                pos.set(id, dir === 'LR'
                    ? { x: main, y: cross + H / 2 }
                    : { x: cross + W / 2, y: main });
            });
        }

        return pos;
    }

    /**
     * Circular layout — all nodes equidistant on a circle.
     * @returns {Map<id,{x,y}>}
     */
    static circular(nodes, opts = {}) {
        const cx = opts.cx || 400, cy = opts.cy || 300;
        const r  = opts.radius || Math.min(cx, cy) * 0.8;
        const startAngle = opts.startAngle || ZoltoRouterConstants.LAYOUT.CIRCULAR_START_ANGLE;
        const pos = new Map();
        nodes.forEach((n, i) => {
            const angle = startAngle + (i / nodes.length) * ZoltoRouterConstants.MATH.TAU;
            pos.set(n.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
        });
        return pos;
    }

    /**
     * Radial tree — root at centre, children on concentric rings.
     * @returns {Map<id,{x,y}>}
     */
    static radialTree(nodes, edges, rootId, opts = {}) {
        const cx      = opts.cx || 400, cy = opts.cy || 400;
        const ringGap = opts.ringGap || ZoltoRouterConstants.LAYOUT.RADIAL_RING_GAP;

        const adj = new Map();
        for (const n of nodes) adj.set(n.id, []);
        for (const e of edges) adj.get(e.source || '')?.push(e.target);

        const rings = new Map(), visited = new Set([rootId]);
        const q = [{ id: rootId, depth: 0 }];
        while (q.length) {
            const { id, depth } = q.shift();
            if (!rings.has(depth)) rings.set(depth, []);
            rings.get(depth).push(id);
            for (const c of (adj.get(id) || [])) {
                if (!visited.has(c)) { visited.add(c); q.push({ id: c, depth: depth + 1 }); }
            }
        }

        const pos = new Map();
        for (const [d, ids] of rings) {
            if (d === 0) { pos.set(ids[0], { x: cx, y: cy }); continue; }
            const r = d * ringGap;
            ids.forEach((id, i) => {
                const angle = (i / ids.length) * ZoltoRouterConstants.MATH.TAU - ZoltoRouterConstants.MATH.HALF_PI;
                pos.set(id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
            });
        }
        return pos;
    }

    /**
     * Grid layout — nodes in a rectangular grid pattern.
     * @returns {Map<id,{x,y}>}
     */
    static grid(nodes, opts = {}) {
        const cols    = opts.cols   || Math.ceil(Math.sqrt(nodes.length));
        const cellW   = opts.cellW  || ZoltoRouterConstants.LAYOUT.GRID_CELL_W;
        const cellH   = opts.cellH  || ZoltoRouterConstants.LAYOUT.GRID_CELL_H;
        const originX = opts.x || 0, originY = opts.y || 0;
        const pos = new Map();
        nodes.forEach((n, i) => pos.set(n.id, {
            x: originX + (i % cols) * cellW + cellW / 2,
            y: originY + Math.floor(i / cols) * cellH + cellH / 2,
        }));
        return pos;
    }

    /**
     * Mind-map layout — root in centre, branches radiate outward recursively.
     * @param {object} rootNode  — must have .id and .children[]
     * @returns {Map<id,{x,y}>}
     */
    static mindMap(rootNode, opts = {}) {
        const cx       = opts.cx       || 400;
        const cy       = opts.cy       || 300;
        const levelGap = opts.levelGap || ZoltoRouterConstants.LAYOUT.MINDMAP_LEVEL_GAP;
        const minAngle = opts.minAngle || ZoltoRouterConstants.LAYOUT.MINDMAP_MIN_ANGLE;
        const pos = new Map();

        const _place = (node, x, y, startAngle, spread, depth) => {
            pos.set(node.id, { x, y });
            const children = node.children || [];
            if (!children.length) return;
            const step = Math.max(minAngle, spread / children.length);
            children.forEach((child, i) => {
                const angle = startAngle + (i - (children.length - 1) / 2) * step;
                _place(child, x + levelGap * Math.cos(angle), y + levelGap * Math.sin(angle), angle, step * 0.7, depth + 1);
            });
        };

        _place(rootNode, cx, cy, 0, ZoltoRouterConstants.MATH.TAU, 0);
        return pos;
    }

    /**
     * Sequence diagram layout — assigns x-positions to actors and
     * computes y-positions for messages in order.
     * @returns {{ actors: Map<id,{x,y}>, messages: Array<{y, fromX, toX}> }}
     */
    static sequenceLayout(actors, messages, opts = {}) {
        const actorGap = opts.actorGap  || 160;
        const topY     = opts.topY      || 80;
        const msgGap   = opts.msgGap    || 40;
        const startX   = opts.startX    || 120;

        const actorPos = new Map();
        actors.forEach((actor, i) => {
            actorPos.set(actor.id || actor, { x: startX + i * actorGap, y: topY });
        });

        let currentY = topY + 60;
        const messagePts = messages.map(msg => {
            const fromX = actorPos.get(msg.fromId || msg.from)?.x ?? startX;
            const toX   = actorPos.get(msg.toId   || msg.to)?.x   ?? startX;
            const y     = currentY;
            currentY   += msgGap;
            return { y, fromX, toX, self: fromX === toX };
        });

        return { actors: actorPos, messages: messagePts };
    }
}

/* =========================================================================================
   §9  STATS MATH — statistical computations for all chart types
   ========================================================================================= */

class ZoltoStatsMath {

    static sum(values) { return values.reduce((s, v) => s + v, 0); }

    static mean(values) {
        if (!values.length) return 0;
        return this.sum(values) / values.length;
    }

    static median(values) {
        if (!values.length) return 0;
        const s = [...values].sort((a, b) => a - b);
        const m = s.length >> 1;
        return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2;
    }

    static mode(values) {
        const freq = new Map();
        for (const v of values) freq.set(v, (freq.get(v) || 0) + 1);
        let max = 0, mode = values[0];
        for (const [v, f] of freq) if (f > max) { max = f; mode = v; }
        return mode;
    }

    static variance(values) {
        const m = this.mean(values);
        return this.mean(values.map(v => (v - m) ** 2));
    }

    static stddev(values) { return Math.sqrt(this.variance(values)); }

    static quartiles(values) {
        const s = [...values].sort((a, b) => a - b), n = s.length;
        const q1 = this.median(s.slice(0, n >> 1));
        const q2 = this.median(s);
        const q3 = this.median(s.slice((n + 1) >> 1));
        const iqr = q3 - q1;
        return { q1, q2, q3, iqr, lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
    }

    static outliers(values) {
        const { lower, upper } = this.quartiles(values);
        return values.filter(v => v < lower || v > upper);
    }

    static pearsonR(xs, ys) {
        const n = Math.min(xs.length, ys.length);
        if (n < 2) return 0;
        const mx = this.mean(xs.slice(0, n)), my = this.mean(ys.slice(0, n));
        let num = 0, dx2 = 0, dy2 = 0;
        for (let i = 0; i < n; i++) {
            const dx = xs[i] - mx, dy = ys[i] - my;
            num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
        }
        const denom = Math.sqrt(dx2 * dy2);
        return denom < 1e-10 ? 0 : num / denom;
    }

    static linearRegression(points) {
        const n = points.length;
        if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
        const sumX = this.sum(points.map(p => p.x));
        const sumY = this.sum(points.map(p => p.y));
        const sumXY = this.sum(points.map(p => p.x * p.y));
        const sumX2 = this.sum(points.map(p => p.x * p.x));
        const denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 1e-10) return { slope: 0, intercept: sumY / n, r2: 0 };
        const slope     = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        const meanY = sumY / n;
        const ssTot = this.sum(points.map(p => (p.y - meanY) ** 2));
        const ssRes = this.sum(points.map(p => (p.y - (slope * p.x + intercept)) ** 2));
        return { slope, intercept, r2: ssTot < 1e-10 ? 1 : 1 - ssRes / ssTot };
    }

    static histogramBins(values, binCount) {
        if (!values.length) return [];
        const lo = Math.min(...values), hi = Math.max(...values), range = hi - lo || 1;
        const bins = binCount || Math.max(2, Math.ceil(Math.sqrt(values.length)));
        const w    = range / bins;
        const result = Array.from({ length: bins }, (_, i) => ({
            lo: lo + i * w, hi: lo + (i + 1) * w, count: 0, density: 0,
        }));
        for (const v of values) result[Math.min(bins - 1, Math.floor((v - lo) / w))].count++;
        const total = values.length;
        for (const b of result) b.density = b.count / (total * b.hi - b.lo || 1);
        return result;
    }

    static pieAngles(values) {
        const total = this.sum(values.map(Math.abs)) || 1;
        let startAngle = -Math.PI / 2;
        return values.map(v => {
            const sweep = (Math.abs(v) / total) * ZoltoRouterConstants.MATH.TAU;
            const s = startAngle;
            startAngle += sweep;
            return { startAngle: s, endAngle: startAngle, sweep, value: v,
                     midAngle: s + sweep / 2 };
        });
    }

    static normalise(values, lo = 0, hi = 1) {
        const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
        return values.map(v => lo + ((v - min) / range) * (hi - lo));
    }

    static niceScale(min, max, ticks = 5) {
        const range = max - min || 1;
        const rough = range / ticks;
        const mag   = Math.pow(10, Math.floor(Math.log10(rough)));
        const step  = [1, 2, 2.5, 5, 10].find(s => s * mag >= rough) * mag;
        const nMin  = Math.floor(min / step) * step;
        const nMax  = Math.ceil(max  / step) * step;
        const pts   = [];
        for (let t = nMin; t <= nMax + step * 0.01; t = +(t + step).toFixed(12)) pts.push(+t.toFixed(10));
        return { min: nMin, max: nMax, step, ticks: pts };
    }

    static movingAverage(values, window) {
        if (window < 1 || !values.length) return values.slice();
        return values.map((_, i) => {
            const lo = Math.max(0, i - Math.floor(window / 2));
            const hi = Math.min(values.length, lo + window);
            return this.mean(values.slice(lo, hi));
        });
    }

    static cdf(values, x) {
        return values.filter(v => v <= x).length / values.length;
    }
}

/* =========================================================================================
   §10  COLOR MATH — RGB · HSL · HSV · Lab · LCh · mixing · contrast · palette
   ========================================================================================= */

class ZoltoColorMath {

    // ── Parsing ───────────────────────────────────────────────────────────────────────

    static parseHex(hex) {
        const h = hex.replace('#', '');
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        return {
            r: parseInt(full.slice(0, 2), 16),
            g: parseInt(full.slice(2, 4), 16),
            b: parseInt(full.slice(4, 6), 16),
        };
    }

    static toHex(r, g, b) {
        const h = v => Math.round(v).toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }

    // ── RGB ↔ HSL ─────────────────────────────────────────────────────────────────────

    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    static hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
        const hue = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        return {
            r: Math.round(hue(p, q, h + 1/3) * 255),
            g: Math.round(hue(p, q, h)       * 255),
            b: Math.round(hue(p, q, h - 1/3) * 255),
        };
    }

    // ── RGB ↔ HSV ─────────────────────────────────────────────────────────────────────

    static rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        let h = 0;
        if (d > 0) {
            switch (max) {
                case r: h = ((g - b) / d) % 6; break;
                case g: h = (b - r) / d + 2;   break;
                case b: h = (r - g) / d + 4;   break;
            }
            h = h / 6;
        }
        return { h: h * 360, s: max > 0 ? d / max * 100 : 0, v: max * 100 };
    }

    // ── WCAG Contrast ─────────────────────────────────────────────────────────────────

    static relativeLuminance(r, g, b) {
        const lin = v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    }

    static contrastRatio(r1, g1, b1, r2, g2, b2) {
        const l1 = this.relativeLuminance(r1, g1, b1);
        const l2 = this.relativeLuminance(r2, g2, b2);
        const lo = Math.min(l1, l2), hi = Math.max(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
    }

    static wcagAA(r1, g1, b1, r2, g2, b2)  { return this.contrastRatio(r1, g1, b1, r2, g2, b2) >= 4.5; }
    static wcagAAA(r1, g1, b1, r2, g2, b2) { return this.contrastRatio(r1, g1, b1, r2, g2, b2) >= 7.0; }

    // ── Color mixing ──────────────────────────────────────────────────────────────────

    static mixRgb(c1, c2, t = 0.5) {
        return {
            r: c1.r + (c2.r - c1.r) * t,
            g: c1.g + (c2.g - c1.g) * t,
            b: c1.b + (c2.b - c1.b) * t,
        };
    }

    static mixHsl(h1, s1, l1, h2, s2, l2, t = 0.5) {
        // Shortest path on hue wheel
        let dh = h2 - h1;
        if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
        return { h: h1 + dh * t, s: s1 + (s2 - s1) * t, l: l1 + (l2 - l1) * t };
    }

    // ── Palette generation ────────────────────────────────────────────────────────────

    static complementary(h) { return [(h + 180) % 360]; }
    static analogous(h, step = 30) { return [(h - step + 360) % 360, (h + step) % 360]; }
    static triadic(h)         { return [(h + 120) % 360, (h + 240) % 360]; }
    static splitComplementary(h, split = 30) { return [(h + 180 - split + 360) % 360, (h + 180 + split) % 360]; }
    static tetradic(h)        { return [(h + 90) % 360, (h + 180) % 360, (h + 270) % 360]; }

    /** Generate N perceptually even steps between two hues */
    static gradientStops(h1, s, l1, h2, l2, steps = 5) {
        return Array.from({ length: steps }, (_, i) => {
            const t   = i / (steps - 1);
            let   dh  = h2 - h1;
            if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
            return { h: (h1 + dh * t + 360) % 360, s, l: l1 + (l2 - l1) * t };
        });
    }

    /** Darken an HSL color by `amount` percentage points */
    static darken(h, s, l, amount) { return { h, s, l: Math.max(0, l - amount) }; }

    /** Lighten an HSL color by `amount` percentage points */
    static lighten(h, s, l, amount) { return { h, s, l: Math.min(100, l + amount) }; }

    /** Compute the perceptual "brightness" of an RGB colour (0-255) */
    static brightness(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
}

/* =========================================================================================
   §11  PHYSICS MATH — spring simulation, Verlet integration, collision, constraints
   ========================================================================================= */

class ZoltoPhysicsMath {

    /**
     * Hooke spring force: F = -k × (len - restLen) along the connection vector.
     * @returns {{ x, y }} force on particle A (equal and opposite on B)
     */
    static springForce(pA, pB, restLen, stiffness) {
        const dx = pB.x - pA.x, dy = pB.y - pA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1e-10;
        const stretch = dist - restLen;
        const mag = stiffness * stretch;
        return { x: (dx / dist) * mag, y: (dy / dist) * mag };
    }

    /**
     * Coulomb repulsion: F = k / dist² away from pB.
     */
    static repulsionForce(pA, pB, strength) {
        const dx = pA.x - pB.x, dy = pA.y - pB.y;
        const dist2 = dx * dx + dy * dy || 1e-10;
        const dist  = Math.sqrt(dist2);
        const mag   = strength / dist2;
        return { x: (dx / dist) * mag, y: (dy / dist) * mag };
    }

    /**
     * Gravity pull toward a centre point.
     */
    static gravity(p, centre, strength) {
        const dx = centre.x - p.x, dy = centre.y - p.y;
        return { x: dx * strength, y: dy * strength };
    }

    /**
     * Verlet integration step: new position from current, previous, acceleration.
     * @param {{ x, y }} cur  — current position
     * @param {{ x, y }} prev — previous position (stores velocity implicitly)
     * @param {{ x, y }} acc  — acceleration
     * @param {number}   dt   — time step
     * @param {number}   damping  — velocity damping factor (0–1)
     * @returns {{ cur: {x,y}, prev: {x,y} }}
     */
    static verletStep(cur, prev, acc, dt = 0.016, damping = 0.98) {
        const vx = (cur.x - prev.x) * damping;
        const vy = (cur.y - prev.y) * damping;
        const nx = cur.x + vx + acc.x * dt * dt;
        const ny = cur.y + vy + acc.y * dt * dt;
        return { cur: { x: nx, y: ny }, prev: cur };
    }

    /** Clamp velocity to MAX_VELOCITY for stability */
    static clampVelocity(vel, max = ZoltoRouterConstants.PHYSICS.MAX_VELOCITY) {
        const len = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        if (len <= max) return vel;
        return { x: vel.x / len * max, y: vel.y / len * max };
    }

    /**
     * Circle-circle elastic collision response.
     * Returns the velocity adjustments for each circle post-collision.
     */
    static circleCollisionResponse(pA, vA, rA, mA, pB, vB, rB, mB) {
        const dx = pB.x - pA.x, dy = pB.y - pA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1e-10;
        const nx = dx / dist, ny = dy / dist;
        const dvx = vA.x - vB.x, dvy = vA.y - vB.y;
        const dot = dvx * nx + dvy * ny;
        if (dot >= 0) return { vA, vB }; // Already separating
        const imp = (2 * dot) / (1 / mA + 1 / mB);
        return {
            vA: { x: vA.x - (imp / mA) * nx, y: vA.y - (imp / mA) * ny },
            vB: { x: vB.x + (imp / mB) * nx, y: vB.y + (imp / mB) * ny },
        };
    }

    /** Distance constraint: keep two particles at exactly `restLen` apart. */
    static distanceConstraint(pA, pB, restLen, stiffness = 1) {
        const dx = pB.x - pA.x, dy = pB.y - pA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1e-10;
        const correction = (dist - restLen) / dist * stiffness * 0.5;
        return {
            dA: { x:  dx * correction, y:  dy * correction },
            dB: { x: -dx * correction, y: -dy * correction },
        };
    }

    /** Contain a point within a rectangle boundary (elastic bounce). */
    static boundaryConstraint(p, v, rect) {
        const np = { ...p }, nv = { ...v };
        if (p.x < rect.left)   { np.x = rect.left;   nv.x = Math.abs(v.x); }
        if (p.x > rect.right)  { np.x = rect.right;  nv.x = -Math.abs(v.x); }
        if (p.y < rect.top)    { np.y = rect.top;    nv.y = Math.abs(v.y); }
        if (p.y > rect.bottom) { np.y = rect.bottom; nv.y = -Math.abs(v.y); }
        return { p: np, v: nv };
    }
}

/* =========================================================================================
   §12  MATH EXPR — expression tokeniser, operator precedence parser, layout box model
   Provides the mathematical rendering infrastructure for LaTeX-lite Zolto math syntax.
   ========================================================================================= */

class ZoltoMathExpr {

    /* ── Tokeniser ───────────────────────────────────────────────────────────────────── */

    static tokenize(src) {
        if (!src || typeof src !== 'string') return [];
        const tokens = [];
        let i = 0;
        while (i < src.length) {
            const c = src[i];
            if (/\s/.test(c)) { i++; continue; }
            if (c === '\\') {
                const m = src.slice(i).match(/^\\([a-zA-Z]+|[^a-zA-Z])/);
                if (m) { tokens.push({ kind: 'cmd', value: m[0] }); i += m[0].length; continue; }
            }
            if (/[0-9]/.test(c)) {
                const m = src.slice(i).match(/^[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
                tokens.push({ kind: 'num', value: m[0] }); i += m[0].length; continue;
            }
            if (/[a-zA-Z]/.test(c)) { tokens.push({ kind: 'var', value: c }); i++; continue; }
            if ('{}()[]'.includes(c)) { tokens.push({ kind: 'delim', value: c }); i++; continue; }
            if ('^_&'.includes(c)) { tokens.push({ kind: c, value: c }); i++; continue; }
            tokens.push({ kind: 'op', value: c }); i++;
        }
        return tokens;
    }

    /* ── Layout Box Model ────────────────────────────────────────────────────────────── */

    /**
     * Build a layout-box tree from a math token array.
     * Each box has: { type, width, height, depth, children, value }
     * Used by the SVG math renderer to position glyphs.
     */
    static buildLayoutTree(tokens, fontSize = 16) {
        const ctx = { tokens, pos: 0, fontSize };
        return this._parseExprTree(ctx);
    }

    static _parseExprTree(ctx) {
        const children = [];
        while (ctx.pos < ctx.tokens.length) {
            const tok = ctx.tokens[ctx.pos];
            if (!tok || tok.value === '}' || tok.value === ')' || tok.value === ']') break;
            const box = this._parseAtom(ctx);
            if (box) children.push(box);
        }
        return { type: 'hbox', children, width: this._sumW(children), height: ctx.fontSize };
    }

    static _parseAtom(ctx) {
        const tok = ctx.tokens[ctx.pos];
        if (!tok) return null;
        ctx.pos++;

        if (tok.kind === 'cmd') return this._parseCommand(ctx, tok.value);

        if (tok.kind === 'delim' && tok.value === '{') {
            const inner = this._parseExprTree(ctx);
            if (ctx.tokens[ctx.pos]?.value === '}') ctx.pos++;
            return { type: 'group', children: [inner], width: inner.width, height: inner.height };
        }

        if (tok.kind === 'num' || tok.kind === 'var' || tok.kind === 'op') {
            const w = ctx.fontSize * 0.55 * (tok.value.length || 1);
            return { type: 'glyph', value: tok.value, width: w, height: ctx.fontSize };
        }

        // Superscript
        if (tok.kind === '^') {
            const base   = ctx._lastBox;
            const expCtx = { ...ctx, fontSize: ctx.fontSize * 0.7 };
            const sup    = this._parseGroupOrAtom(expCtx);
            ctx.pos = expCtx.pos;
            return { type: 'sup', base, sup, width: (base?.width || 0) + (sup?.width || 0), height: ctx.fontSize };
        }

        // Subscript
        if (tok.kind === '_') {
            const base   = ctx._lastBox;
            const subCtx = { ...ctx, fontSize: ctx.fontSize * 0.7 };
            const sub    = this._parseGroupOrAtom(subCtx);
            ctx.pos = subCtx.pos;
            return { type: 'sub', base, sub, width: (base?.width || 0) + (sub?.width || 0), height: ctx.fontSize };
        }

        return { type: 'glyph', value: tok.value, width: ctx.fontSize * 0.5, height: ctx.fontSize };
    }

    static _parseCommand(ctx, cmd) {
        const fs = ctx.fontSize;
        switch (cmd) {
            case '\\frac': {
                const num = this._parseGroupOrAtom(ctx);
                const den = this._parseGroupOrAtom(ctx);
                const w   = Math.max(num?.width || 0, den?.width || 0) + 8;
                return { type: 'frac', num, den, width: w, height: fs * 2.2 };
            }
            case '\\sqrt': {
                const inner = this._parseGroupOrAtom(ctx);
                const w     = (inner?.width || 0) + fs * 0.8;
                return { type: 'sqrt', inner, width: w, height: fs * 1.3 };
            }
            case '\\sum':  return { type: 'bigop', op: '∑', width: fs * 0.9, height: fs * 1.6 };
            case '\\prod': return { type: 'bigop', op: '∏', width: fs * 0.9, height: fs * 1.6 };
            case '\\int':  return { type: 'bigop', op: '∫', width: fs * 0.7, height: fs * 1.8 };
            case '\\oint': return { type: 'bigop', op: '∮', width: fs * 0.7, height: fs * 1.8 };
            case '\\lim':  return { type: 'func', name: 'lim', width: fs * 1.5, height: fs };
            case '\\text': {
                const g = this._parseGroupOrAtom(ctx);
                return { type: 'text', inner: g, width: g?.width || 0, height: fs };
            }
            case '\\begin': {
                const envName = this._parseGroupText(ctx);
                return { type: 'env', env: envName, width: fs * 4, height: fs * 3 };
            }
            default: {
                const sym = ZoltoSymbols.LATEX[cmd];
                return { type: 'symbol', value: sym || cmd, width: fs * 0.7, height: fs };
            }
        }
    }

    static _parseGroupOrAtom(ctx) {
        const tok = ctx.tokens[ctx.pos];
        if (!tok) return null;
        if (tok.kind === 'delim' && tok.value === '{') {
            ctx.pos++;
            const inner = this._parseExprTree(ctx);
            if (ctx.tokens[ctx.pos]?.value === '}') ctx.pos++;
            return inner;
        }
        return this._parseAtom(ctx);
    }

    static _parseGroupText(ctx) {
        const tok = ctx.tokens[ctx.pos];
        if (!tok || tok.value !== '{') return '';
        ctx.pos++;
        let text = '';
        while (ctx.pos < ctx.tokens.length && ctx.tokens[ctx.pos].value !== '}') {
            text += ctx.tokens[ctx.pos].value; ctx.pos++;
        }
        if (ctx.tokens[ctx.pos]?.value === '}') ctx.pos++;
        return text;
    }

    static _sumW(children) { return children.reduce((s, c) => s + (c?.width || 0), 0); }

    /**
     * Evaluate a simple numeric math expression safely.
     * Supports: +, -, *, /, **, ^, parentheses, sqrt, abs, sin, cos, tan, log, ln, pi, e
     */
    static evaluate(expr) {
        if (!expr || typeof expr !== 'string') return NaN;
        try {
            const cleaned = expr
                .replace(/\^/g, '**')
                .replace(/\\sqrt\{([^}]+)\}/g, 'Math.sqrt($1)')
                .replace(/\\sqrt\s+(\S+)/g, 'Math.sqrt($1)')
                .replace(/\\sin/g, 'Math.sin').replace(/\\cos/g, 'Math.cos')
                .replace(/\\tan/g, 'Math.tan').replace(/\\log/g, 'Math.log10')
                .replace(/\\ln/g,  'Math.log').replace(/\\pi/g, 'Math.PI')
                .replace(/\\e\b/g, 'Math.E')
                .replace(/\\abs\{([^}]+)\}/g, 'Math.abs($1)');
            // Safety: only allow safe math characters
            if (/[^0-9+\-*/().\sMathsqinoctalePIE,]/.test(cleaned.replace(/Math\.\w+/g, ''))) return NaN;
            // eslint-disable-next-line no-new-func
            return Function(`"use strict"; return (${cleaned})`)();
        } catch (_) { return NaN; }
    }
}

/* =========================================================================================
   §13  SYMBOLS — comprehensive Unicode tables: Greek · operators · physics · chemistry
   ========================================================================================= */

class ZoltoSymbols {

    /** LaTeX command → Unicode character */
    static LATEX = Object.freeze({
        // Greek lowercase
        '\\alpha': 'α',   '\\beta': 'β',    '\\gamma': 'γ',   '\\delta': 'δ',
        '\\epsilon': 'ε', '\\varepsilon': 'ε','\\zeta': 'ζ',  '\\eta': 'η',
        '\\theta': 'θ',   '\\vartheta': 'ϑ', '\\iota': 'ι',  '\\kappa': 'κ',
        '\\lambda': 'λ',  '\\mu': 'μ',       '\\nu': 'ν',    '\\xi': 'ξ',
        '\\pi': 'π',      '\\varpi': 'ϖ',    '\\rho': 'ρ',   '\\varrho': 'ϱ',
        '\\sigma': 'σ',   '\\varsigma': 'ς', '\\tau': 'τ',   '\\upsilon': 'υ',
        '\\phi': 'φ',     '\\varphi': 'φ',   '\\chi': 'χ',   '\\psi': 'ψ',
        '\\omega': 'ω',
        // Greek uppercase
        '\\Gamma': 'Γ',   '\\Delta': 'Δ',   '\\Theta': 'Θ',  '\\Lambda': 'Λ',
        '\\Xi': 'Ξ',      '\\Pi': 'Π',      '\\Sigma': 'Σ',  '\\Upsilon': 'Υ',
        '\\Phi': 'Φ',     '\\Psi': 'Ψ',     '\\Omega': 'Ω',
        // Math operators
        '\\infty': '∞',   '\\partial': '∂', '\\nabla': '∇',  '\\sum': '∑',
        '\\prod': '∏',    '\\coprod': '∐',  '\\int': '∫',    '\\iint': '∬',
        '\\iiint': '∭',   '\\oint': '∮',    '\\oiint': '∯',  '\\oiiint': '∰',
        '\\forall': '∀',  '\\exists': '∃',  '\\nexists': '∄','\\emptyset': '∅',
        '\\varnothing': '∅',
        // Set theory
        '\\in': '∈',      '\\notin': '∉',   '\\ni': '∋',     '\\notni': '∌',
        '\\subset': '⊂',  '\\supset': '⊃',  '\\subseteq': '⊆','\\supseteq': '⊇',
        '\\cup': '∪',     '\\cap': '∩',     '\\setminus': '∖','\\complement': '∁',
        // Logic
        '\\land': '∧',    '\\lor': '∨',     '\\lnot': '¬',   '\\neg': '¬',
        '\\implies': '⇒', '\\iff': '⟺',    '\\therefore': '∴','\\because': '∵',
        '\\top': '⊤',     '\\bot': '⊥',
        // Arrows
        '\\to': '→',      '\\gets': '←',    '\\leftrightarrow': '↔',
        '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⟺',
        '\\rightarrow': '→', '\\leftarrow': '←', '\\uparrow': '↑', '\\downarrow': '↓',
        '\\nearrow': '↗', '\\searrow': '↘', '\\nwarrow': '↖', '\\swarrow': '↙',
        '\\longmapsto': '↦', '\\mapsto': '↦', '\\xrightarrow': '→',
        // Relations
        '\\leq': '≤',     '\\geq': '≥',     '\\neq': '≠',    '\\approx': '≈',
        '\\equiv': '≡',   '\\sim': '∼',     '\\simeq': '≃',  '\\cong': '≅',
        '\\propto': '∝',  '\\perp': '⊥',    '\\parallel': '∥','\\asymp': '≍',
        '\\prec': '≺',    '\\succ': '≻',    '\\preceq': '⪯', '\\succeq': '⪰',
        '\\ll': '≪',      '\\gg': '≫',      '\\lll': '⋘',    '\\ggg': '⋙',
        // Arithmetic
        '\\pm': '±',      '\\mp': '∓',      '\\times': '×',  '\\div': '÷',
        '\\cdot': '·',    '\\circ': '∘',    '\\bullet': '•', '\\ast': '∗',
        '\\star': '⋆',    '\\oplus': '⊕',   '\\ominus': '⊖', '\\otimes': '⊗',
        '\\odot': '⊙',    '\\oslash': '⊘',
        // Brackets and delimiters
        '\\langle': '⟨',  '\\rangle': '⟩',  '\\lfloor': '⌊', '\\rfloor': '⌋',
        '\\lceil': '⌈',   '\\rceil': '⌉',   '\\lvert': '|',  '\\rvert': '|',
        '\\lVert': '‖',   '\\rVert': '‖',   '\\{': '{',      '\\}': '}',
        // Calculus / analysis
        '\\sqrt': '√',    '\\cbrt': '∛',    '\\ldots': '…',  '\\cdots': '⋯',
        '\\vdots': '⋮',   '\\ddots': '⋱',   '\\prime': '′',  '\\dprime': '″',
        // Physics
        '\\hbar': 'ℏ',    '\\ell': 'ℓ',     '\\Re': 'ℜ',     '\\Im': 'ℑ',
        '\\aleph': 'ℵ',   '\\beth': 'ℶ',    '\\wp': '℘',     '\\bra': '⟨',
        '\\ket': '⟩',     '\\braket': '⟨⟩',
        // Chemistry
        '\\degree': '°',  '\\celsius': '℃', '\\fahrenheit': '℉',
        '\\ohm': 'Ω',     '\\micro': 'μ',   '\\angstrom': 'Å',
        '\\rightleftharpoons': '⇌', '\\leftrightharpoons': '⇋',
        // Typefaces
        '\\infin': '∞',   '\\ell': 'ℓ',
        // Misc
        '\\checkmark': '✓','\\times': '×',  '\\dag': '†',    '\\ddag': '‡',
        '\\S': '§',        '\\P': '¶',       '\\copyright': '©','\\trademark': '™',
    });

    /** Zolto shorthand → LaTeX/Unicode (for the simpler Zolto math syntax) */
    static ZOLTO_SHORT = Object.freeze({
        // Greek shortcuts (no backslash)
        'alpha': 'α', 'beta': 'β',   'gamma': 'γ',  'delta': 'δ',
        'eps': 'ε',   'zeta': 'ζ',   'theta': 'θ',  'lambda': 'λ',
        'mu': 'μ',    'pi': 'π',     'sigma': 'σ',  'tau': 'τ',
        'phi': 'φ',   'chi': 'χ',    'psi': 'ψ',    'omega': 'ω',
        'Sigma': 'Σ', 'Pi': 'Π',     'Omega': 'Ω',  'Delta': 'Δ',
        // Operators
        'inf': '∞',   'sqrt': '√',   'sum': '∑',    'prod': '∏',
        'int': '∫',   'oint': '∮',   'grad': '∇',   'partial': '∂',
        'forall': '∀','exists': '∃', 'empty': '∅',  'in': '∈',
        // Arrows
        '->': '→',    '<-': '←',     '<->': '↔',    '=>': '⇒',
        '<=': '⇐',    '<=>': '⟺',   '|->': '↦',
        // Comparison
        '<=': '≤',    '>=': '≥',     '!=': '≠',     '~=': '≈',
        '===': '≡',
        // Physics
        'hbar': 'ℏ',  'ell': 'ℓ',
    });

    /** Element symbols for chemistry notation */
    static ELEMENTS = Object.freeze({
        H: 'Hydrogen',    He: 'Helium',     Li: 'Lithium',    Be: 'Beryllium',
        B: 'Boron',       C: 'Carbon',      N: 'Nitrogen',    O: 'Oxygen',
        F: 'Fluorine',    Ne: 'Neon',       Na: 'Sodium',     Mg: 'Magnesium',
        Al: 'Aluminium',  Si: 'Silicon',    P: 'Phosphorus',  S: 'Sulfur',
        Cl: 'Chlorine',   Ar: 'Argon',      K: 'Potassium',   Ca: 'Calcium',
        Fe: 'Iron',       Cu: 'Copper',     Zn: 'Zinc',       Ag: 'Silver',
        Au: 'Gold',       Hg: 'Mercury',    Pb: 'Lead',       Pt: 'Platinum',
        U: 'Uranium',     Ra: 'Radium',     Rn: 'Radon',
    });

    /** Physics quantity symbols with units (SI) */
    static PHYSICS_QUANTITIES = Object.freeze({
        c:   { name: 'speed of light',    value: 2.998e8,   unit: 'm/s'      },
        G:   { name: 'gravitational const',value: 6.674e-11, unit: 'N·m²/kg²'},
        h:   { name: 'Planck constant',   value: 6.626e-34, unit: 'J·s'      },
        hbar:{ name: 'reduced Planck',    value: 1.055e-34, unit: 'J·s'      },
        e:   { name: 'elementary charge', value: 1.602e-19, unit: 'C'        },
        me:  { name: 'electron mass',     value: 9.109e-31, unit: 'kg'       },
        mp:  { name: 'proton mass',       value: 1.673e-27, unit: 'kg'       },
        k:   { name: 'Boltzmann const',   value: 1.381e-23, unit: 'J/K'      },
        Na:  { name: 'Avogadro number',   value: 6.022e23,  unit: 'mol⁻¹'   },
        R:   { name: 'gas constant',      value: 8.314,     unit: 'J/(mol·K)'},
        eps0:{ name: 'vacuum permittivity',value: 8.854e-12, unit: 'F/m'     },
        mu0: { name: 'vacuum permeability',value: 1.257e-6,  unit: 'H/m'     },
    });

    /**
     * Resolve a Zolto math symbol string to its Unicode rendering.
     * Checks ZOLTO_SHORT first, then LATEX.
     */
    static resolve(sym) {
        if (!sym) return sym;
        return this.ZOLTO_SHORT[sym]
            || this.LATEX[`\\${sym}`]
            || this.LATEX[sym]
            || sym;
    }
}

/* =========================================================================================
   PRIVATE MICRO-HELPERS — module-internal, not exported
   ========================================================================================= */

/** Format a number to max 3 decimal places — prevents SVG path bloat */
function _f(n) { return +n.toFixed(3); }

/* =========================================================================================
   EXPORT — ESM · CommonJS · Browser global (all three modes)
   ========================================================================================= */

const _exports = {
    ZoltoRouterConstants,
    ZoltoVectorMath,
    ZoltoMatrix2D,
    ZoltoGeometry,
    ZoltoBezierMath,
    ZoltoPortManager,
    ZoltoPathGenerators,
    ZoltoGraphLayoutMath,
    ZoltoStatsMath,
    ZoltoColorMath,
    ZoltoPhysicsMath,
    ZoltoMathExpr,
    ZoltoSymbols,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = _exports;
} else if (typeof window !== 'undefined') {
    // Expose all classes to window for browser script-tag usage
    for (const [k, v] of Object.entries(_exports)) window[k] = v;
}

// ESM named exports (for bundler/module-aware environments)
/* export {
    ZoltoRouterConstants, ZoltoVectorMath, ZoltoMatrix2D, ZoltoGeometry,
    ZoltoBezierMath, ZoltoPortManager, ZoltoPathGenerators,
    ZoltoGraphLayoutMath, ZoltoStatsMath, ZoltoColorMath,
    ZoltoPhysicsMath, ZoltoMathExpr, ZoltoSymbols,
}; */