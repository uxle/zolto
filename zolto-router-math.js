/**
 * =========================================================================================
 * ZOLTO STUDIO: SVG VECTOR MATH ENGINE (Module 6 of 7)
 * =========================================================================================
 * Description: An infinity-scale mathematical engine for computing vector paths, 
 * dynamic port mapping, and routing algorithms (Bezier, Orthogonal, Step, Straight).
 * =========================================================================================
 */

'use strict';

const ZoltoRouterConstants = Object.freeze({
    ROUTING_MODE: {
        BEZIER: 'bezier',
        ORTHOGONAL: 'orthogonal',
        STEP: 'step',
        STRAIGHT: 'straight'
    },
    DIRECTION: {
        TOP: 'top',
        RIGHT: 'right',
        BOTTOM: 'bottom',
        LEFT: 'left',
        CENTER: 'center'
    },
    MATH: {
        PI: Math.PI,
        HALF_PI: Math.PI / 2,
        TWO_PI: Math.PI * 2,
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI
    },
    LIMITS: {
        MIN_CONTROL_OFFSET: 40,
        MAX_CONTROL_OFFSET: 200,
        ORTHO_CORNER_RADIUS: 8,
        BRIDGE_JUMP_RADIUS: 6,
        DISCRETIZATION_STEPS: 20 
    }
});

class ZoltoVectorMath {
    static distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static angle(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    static midpoint(p1, p2) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }

    static project(point, angle, distance) {
        return { x: point.x + Math.cos(angle) * distance, y: point.y + Math.sin(angle) * distance };
    }

    static normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: v.x / len, y: v.y / len };
    }

    static dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    static lineIntersection(p1, p2, p3, p4) {
        const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (denom === 0) return null; 

        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return { x: p1.x + ua * (p2.x - p1.x), y: p1.y + ua * (p2.y - p1.y) };
        }
        return null;
    }

    static cubicBezierPoint(t, p0, p1, p2, p3) {
        const u = 1 - t, tt = t * t, uu = u * u, uuu = uu * u, ttt = tt * t;
        let p = { x: uuu * p0.x, y: uuu * p0.y };
        p.x += 3 * uu * t * p1.x;
        p.y += 3 * uu * t * p1.y;
        p.x += 3 * u * tt * p2.x;
        p.y += 3 * u * tt * p2.y;
        p.x += ttt * p3.x;
        p.y += ttt * p3.y;
        return p;
    }

    static cubicBezierDerivative(t, p0, p1, p2, p3) {
        const u = 1 - t, val1 = 3 * u * u, val2 = 6 * u * t, val3 = 3 * t * t;
        return {
            x: val1 * (p1.x - p0.x) + val2 * (p2.x - p1.x) + val3 * (p3.x - p2.x),
            y: val1 * (p1.y - p0.y) + val2 * (p2.y - p1.y) + val3 * (p3.y - p2.y)
        };
    }
}

class ZoltoPortManager {
    static getOptimalPorts(rectA, rectB) {
        const centerA = { x: rectA.left + rectA.width / 2, y: rectA.top + rectA.height / 2 };
        const centerB = { x: rectB.left + rectB.width / 2, y: rectB.top + rectB.height / 2 };
        const dx = centerB.x - centerA.x, dy = centerB.y - centerA.y;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        let portA, portB;

        if (absDx > absDy) {
            if (dx > 0) { portA = ZoltoRouterConstants.DIRECTION.RIGHT; portB = ZoltoRouterConstants.DIRECTION.LEFT; } 
            else { portA = ZoltoRouterConstants.DIRECTION.LEFT; portB = ZoltoRouterConstants.DIRECTION.RIGHT; }
        } else {
            if (dy > 0) { portA = ZoltoRouterConstants.DIRECTION.BOTTOM; portB = ZoltoRouterConstants.DIRECTION.TOP; } 
            else { portA = ZoltoRouterConstants.DIRECTION.TOP; portB = ZoltoRouterConstants.DIRECTION.BOTTOM; }
        }

        return { 
            fromDir: portA, toDir: portB,
            fromPoint: this.getPortCoordinate(rectA, portA),
            toPoint: this.getPortCoordinate(rectB, portB)
        };
    }

    static getPortCoordinate(rect, direction) {
        switch (direction) {
            case ZoltoRouterConstants.DIRECTION.TOP: return { x: rect.left + rect.width / 2, y: rect.top };
            case ZoltoRouterConstants.DIRECTION.BOTTOM: return { x: rect.left + rect.width / 2, y: rect.bottom };
            case ZoltoRouterConstants.DIRECTION.LEFT: return { x: rect.left, y: rect.top + rect.height / 2 };
            case ZoltoRouterConstants.DIRECTION.RIGHT: return { x: rect.right, y: rect.top + rect.height / 2 };
            default: return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
    }

    static getPortNormal(direction) {
        switch (direction) {
            case ZoltoRouterConstants.DIRECTION.TOP: return { x: 0, y: -1 };
            case ZoltoRouterConstants.DIRECTION.BOTTOM: return { x: 0, y: 1 };
            case ZoltoRouterConstants.DIRECTION.LEFT: return { x: -1, y: 0 };
            case ZoltoRouterConstants.DIRECTION.RIGHT: return { x: 1, y: 0 };
            default: return { x: 0, y: 0 };
        }
    }
}

class ZoltoPathGenerators {
    static generateBezier(p1, dir1, p2, dir2) {
        const n1 = ZoltoPortManager.getPortNormal(dir1), n2 = ZoltoPortManager.getPortNormal(dir2);
        const dist = Math.max(ZoltoRouterConstants.LIMITS.MIN_CONTROL_OFFSET, ZoltoVectorMath.distance(p1, p2) * 0.4);
        const cp1 = { x: p1.x + n1.x * dist, y: p1.y + n1.y * dist };
        const cp2 = { x: p2.x + n2.x * dist, y: p2.y + n2.y * dist };

        return {
            path: `M ${p1.x},${p1.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`,
            math: { type: 'bezier', p1, cp1, cp2, p2 }
        };
    }

    static generateOrthogonal(p1, dir1, p2, dir2, radius = ZoltoRouterConstants.LIMITS.ORTHO_CORNER_RADIUS) {
        const pts = [p1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;

        if (dir1 === ZoltoRouterConstants.DIRECTION.RIGHT && dir2 === ZoltoRouterConstants.DIRECTION.LEFT) {
            const midX = p1.x + dx / 2; pts.push({ x: midX, y: p1.y }); pts.push({ x: midX, y: p2.y });
        } else if (dir1 === ZoltoRouterConstants.DIRECTION.BOTTOM && dir2 === ZoltoRouterConstants.DIRECTION.TOP) {
            const midY = p1.y + dy / 2; pts.push({ x: p1.x, y: midY }); pts.push({ x: p2.x, y: midY });
        } else {
            pts.push({ x: p1.x, y: p2.y });
        }
        pts.push(p2);

        let path = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) path += ` L ${pts[i].x},${pts[i].y}`;
        return { path, math: { type: 'polyline', points: pts } };
    }

    static generateStraight(p1, p2) {
        return { path: `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`, math: { type: 'line', p1, p2 } };
    }

    static generateSelfLoop(rect) {
        const p1 = ZoltoPortManager.getPortCoordinate(rect, ZoltoRouterConstants.DIRECTION.RIGHT);
        const p2 = ZoltoPortManager.getPortCoordinate(rect, ZoltoRouterConstants.DIRECTION.TOP);
        const loopSize = 50;
        const cp1 = { x: p1.x + loopSize, y: p1.y }, cp2 = { x: p2.x, y: p2.y - loopSize };

        return {
            path: `M ${p1.x},${p1.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`,
            math: { type: 'bezier', p1, cp1, cp2, p2 }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZoltoRouterConstants, ZoltoVectorMath, ZoltoPortManager, ZoltoPathGenerators };
} else if (typeof window !== 'undefined') {
    // Crucial: Expose to the browser window so the Router Engine can find them
    window.ZoltoRouterConstants = ZoltoRouterConstants;
    window.ZoltoVectorMath = ZoltoVectorMath;
    window.ZoltoPortManager = ZoltoPortManager;
    window.ZoltoPathGenerators = ZoltoPathGenerators;
}
