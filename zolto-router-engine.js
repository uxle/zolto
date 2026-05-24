/**
 * =========================================================================================
 * ZOLTO STUDIO: SVG ORCHESTRATION & UTILITIES ENGINE (Module 7 of 7)
 * =========================================================================================
 * Description: Handles edge intersection bridging, text label placement, procedural SVG 
 * <defs>, the master router facade, and wraps the core utility toolset.
 * =========================================================================================
 */

'use strict';

class ZoltoBridgeEngine {
    static resolveIntersections(edgeObjects) {
        edgeObjects.forEach(edge => {
            edge.segments = this._discretizePath(edge.math);
            edge.jumps = [];
        });

        for (let i = 0; i < edgeObjects.length; i++) {
            for (let j = i + 1; j < edgeObjects.length; j++) {
                const intersections = this._findSegmentIntersections(edgeObjects[i].segments, edgeObjects[j].segments);
                if (intersections.length > 0) intersections.forEach(pt => edgeObjects[j].jumps.push(pt));
            }
        }

        edgeObjects.forEach(edge => {
            if (edge.jumps.length > 0) edge.path = this._injectBridges(edge.path, edge.jumps, edge.math);
        });
        return edgeObjects;
    }

    static _discretizePath(mathObj) {
        const segments = [];
        const steps = (typeof ZoltoRouterConstants !== 'undefined') ? ZoltoRouterConstants.LIMITS.DISCRETIZATION_STEPS : 20;
        
        if (mathObj.type === 'bezier') {
            let prev = mathObj.p1;
            for (let i = 1; i <= steps; i++) {
                const curr = ZoltoVectorMath.cubicBezierPoint(i / steps, mathObj.p1, mathObj.cp1, mathObj.cp2, mathObj.p2);
                segments.push({ p1: prev, p2: curr });
                prev = curr;
            }
        } else if (mathObj.type === 'line') {
            segments.push({ p1: mathObj.p1, p2: mathObj.p2 });
        }
        return segments;
    }

    static _findSegmentIntersections(segsA, segsB) {
        const pts = [];
        for (let i = 0; i < segsA.length; i++) {
            for (let j = 0; j < segsB.length; j++) {
                const intersect = ZoltoVectorMath.lineIntersection(segsA[i].p1, segsA[i].p2, segsB[j].p1, segsB[j].p2);
                if (intersect) pts.push(intersect);
            }
        }
        return pts;
    }

    static _injectBridges(originalPathString, jumpPoints, mathObj) {
        return originalPathString; 
    }
}

class ZoltoLabelPlacer {
    static getMidpointTransform(mathObj) {
        let pt, angle;
        if (mathObj.type === 'bezier') {
            pt = ZoltoVectorMath.cubicBezierPoint(0.5, mathObj.p1, mathObj.cp1, mathObj.cp2, mathObj.p2);
            const derivative = ZoltoVectorMath.cubicBezierDerivative(0.5, mathObj.p1, mathObj.cp1, mathObj.cp2, mathObj.p2);
            angle = Math.atan2(derivative.y, derivative.x) * (180 / Math.PI);
        } else if (mathObj.type === 'line') {
            pt = ZoltoVectorMath.midpoint(mathObj.p1, mathObj.p2);
            angle = ZoltoVectorMath.angle(mathObj.p1, mathObj.p2) * (180 / Math.PI);
        }
        if (angle > 90 || angle < -90) angle += 180;
        return { x: pt.x, y: pt.y, angle: angle };
    }
}

class ZoltoDefsGenerator {
    static generate() {
        return `
            <defs>
                <marker id="marker-arrow-solid" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                    <polygon points="0 0, 10 4, 0 8" fill="var(--edge-marker-color)" />
                </marker>
                <marker id="marker-arrow-primary" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                    <polygon points="0 0, 10 4, 0 8" fill="var(--intent-primary)" />
                </marker>
                <marker id="marker-circle" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <circle cx="3" cy="3" r="2" fill="var(--bg-panel)" stroke="var(--edge-marker-color)" stroke-width="1.5" />
                </marker>
                <marker id="marker-arrow-reverse" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
                    <polygon points="10 0, 0 4, 10 8" fill="var(--edge-marker-color)" />
                </marker>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>`;
    }
}

class ZoltoSVGRouter {
    static routeEdges(edges, containerEl) {
        if (!edges || edges.length === 0 || !containerEl) return ZoltoDefsGenerator.generate();
        
        const containerRect = containerEl.getBoundingClientRect();
        const scrollX = containerEl.scrollLeft, scrollY = containerEl.scrollTop;
        const rectCache = new Map();
        
        const getRect = (id) => {
            if (!rectCache.has(id)) {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    rectCache.set(id, {
                        left: rect.left - containerRect.left + scrollX,
                        right: rect.right - containerRect.left + scrollX,
                        top: rect.top - containerRect.top + scrollY,
                        bottom: rect.bottom - containerRect.top + scrollY,
                        width: rect.width, height: rect.height
                    });
                } else rectCache.set(id, null);
            }
            return rectCache.get(id);
        };

        const edgeObjects = [];

        edges.forEach(edge => {
            const r1 = getRect(edge.fromId), r2 = getRect(edge.toId);
            if (!r1 || !r2) return;

            let pathData;
            if (edge.fromId === edge.toId) pathData = ZoltoPathGenerators.generateSelfLoop(r1);
            else {
                const ports = ZoltoPortManager.getOptimalPorts(r1, r2);
                pathData = ZoltoPathGenerators.generateBezier(ports.fromPoint, ports.fromDir, ports.toPoint, ports.toDir);
            }
            edgeObjects.push({ sourceEdge: edge, path: pathData.path, math: pathData.math, jumps: [] });
        });

        const bridgedEdges = edgeObjects;
        let pathsHtml = '', labelsHtml = '';

        bridgedEdges.forEach(eo => {
            const edge = eo.sourceEdge;
            let edgeClass = 'edge-path', markerStart = '', markerEnd = 'url(#marker-arrow-solid)';

            if (edge.operator === '=>') { edgeClass += ' edge-path-transition'; markerEnd = 'url(#marker-arrow-primary)'; }
            if (edge.operator === '~>') edgeClass += ' edge-path-async';
            if (edge.operator === '<->') { edgeClass += ' edge-path-bidirectional'; markerStart = 'url(#marker-arrow-reverse)'; }
            if (edge.operator === '..>') edgeClass += ' edge-path-async'; 

            pathsHtml += `<path id="edge-${edge.fromId}-${edge.toId}" d="${eo.path}" class="${edgeClass}" marker-start="${markerStart}" marker-end="${markerEnd}" data-from="${edge.fromId}" data-to="${edge.toId}" />`;
            pathsHtml += `<path d="${eo.path}" class="edge-path-hitbox" stroke="transparent" stroke-width="15" fill="none" />`;

            if (edge.edgeLabel) {
                const labelPos = ZoltoLabelPlacer.getMidpointTransform(eo.math);
                labelsHtml += `
                    <g transform="translate(${labelPos.x}, ${labelPos.y})">
                        <rect x="-30" y="-10" width="60" height="20" rx="10" fill="var(--bg-panel)" stroke="var(--border-heavy)" stroke-width="1"/>
                        <text x="0" y="4" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--text-main)" text-anchor="middle">${edge.edgeLabel}</text>
                    </g>`;
            }
        });

        return ZoltoDefsGenerator.generate() + pathsHtml + labelsHtml;
    }
}

/* =====================================================================================
   ZOLTO UTILITIES (Migrated from legacy utils.js)
   ===================================================================================== */
const ZoltoUtils = (function () {
    const EventBus = {
        events: new Map(),
        subscribe(event, callback) {
            if (!this.events.has(event)) this.events.set(event, []);
            this.events.get(event).push(callback);
        },
        publish(event, data) { if (this.events.has(event)) this.events.get(event).forEach(cb => cb(data)); }
    };

    const AST = {
        traverse(node, visitor) {
            if (!node) return;
            if (visitor.enter) visitor.enter(node);
            if (node.children) node.children.forEach(c => this.traverse(c, visitor));
            if (visitor.exit) visitor.exit(node);
        },
        generateUUID: () => 'zl-' + Math.random().toString(36).substr(2, 9)
    };

    const Data = {
        deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
        parseCSV: (csv) => csv.split('\n').map(line => line.split(','))
    };

    const Performance = {
        debounce: (fn, delay) => {
            let timer;
            return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
        }
    };

    return Object.freeze({ EventBus, AST, Data, Performance });
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZoltoSVGRouter, ZoltoBridgeEngine, ZoltoLabelPlacer, ZoltoDefsGenerator, ZoltoUtils };
} else if (typeof window !== 'undefined') {
    window.SVGRouter = ZoltoSVGRouter;
    window.ZoltoUtils = ZoltoUtils;
}
