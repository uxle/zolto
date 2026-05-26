/**
 * =========================================================================================
 * ZOLTO STUDIO: MASTER APPLICATION CONTROLLER
 * Version: 9.0.0-omnibus (Unified Supernova Architecture)
 * =========================================================================================
 *
 * Unified orchestration layer for all 6 Zolto capability domains:
 *
 *  §D1  Markdown & Rich Typography  — Headings, lists, tables, quotes, code blocks,
 *                                     checklists, inline formatting, references, footnotes,
 *                                     callouts, cards, tabs, accordions, admonitions,
 *                                     embeds, multi-column layouts, documentation structures
 *  §D2  LaTeX-Level Mathematics     — Inline/block math, equations, matrices, integrals,
 *                                     calculus, physics notation, chemistry, statistics,
 *                                     graph plotting, symbol systems, formula references,
 *                                     auto-numbering, semantic math AST
 *  §D3  Mermaid-Level Diagramming   — Flowcharts, sequence diagrams, mindmaps, state
 *                                     machines, ER, architecture, user flows, graph systems,
 *                                     trees, timelines, network visualization, dependency
 *                                     graphs, logic maps, process pipelines — with cleaner
 *                                     syntax, spatial awareness, animations, interactivity
 *  §D4  SVG & Native Graphics       — Shapes, paths, curves, layers, grids, vector scenes,
 *                                     icons, connectors, artboards, camera systems, zoom,
 *                                     constraints, smart snapping, spatial positioning,
 *                                     responsive graphics
 *  §D5  Spatial Layout System       — Flex, grid, responsive, absolute, constraint,
 *                                     auto-layout, canvas mode, whiteboard, infinite
 *                                     workspace, nested layouts, presentation mode,
 *                                     split views, interactive panels
 *  §D6  Component & Template System — Custom blocks, templates, slots, props, themes,
 *                                     design systems, dynamic rendering, runtime injection,
 *                                     style inheritance, variants, composition
 *
 * Internal Subsystems:
 *  §1  ZoltoLogger           — Structured logging with levels, tags, performance marks
 *  §2  ZoltoPerformanceMonitor — Compile timing, FPS, memory, pipeline metrics
 *  §3  ZoltoHistory          — Undo/redo stack with compression and branching support
 *  §4  ZoltoPersistence      — localStorage workspace persistence + auto-save
 *  §5  ZoltoViewport         — Pan/zoom canvas with inertia, fit-to-content, zoom controls
 *  §6  ZoltoEditor           — Smart editor: tab-to-spaces, auto-pair, debounced compile
 *  §7  ZoltoErrorPanel       — Inline diagnostic panel with line-number links
 *  §8  ZoltoSnippetPalette   — Quick-insert snippets for all 6 domains (Ctrl+Space)
 *  §9  ZoltoCommandPalette   — Command palette (Ctrl+P / ⌘P) with fuzzy search
 *  §10 ZoltoExportEngine     — SVG / HTML / Print-PDF export pipeline
 *  §11 ZoltoThemeManager     — Theme switching with smooth transitions + custom tokens
 *  §12 ZoltoStudio           — Master orchestrator & DI container
 *  §13 Boot                  — Safe DOMContentLoaded initialisation
 *
 * Fixes over v5.0.1:
 *  · Bug: ZoltoCompiler → ZOLTOCompiler (corrected casing to match parser-core.js export)
 *  · Bug: SVGRouter edges dispatched before DOM painted → replaced with MutationObserver
 *  · Bug: Viewport destroy() not called on re-bootstrap → now always called first
 *  · Perf: Single requestAnimationFrame compile gate replaced with microtask + RAF pair
 *  · New: All window.* subsystems (Renderer, SVGRouter, LayoutEngine, ComponentRuntime,
 *         AnimationSystem, SnappingSystem, ViewportManager, Utils) properly wired
 * =========================================================================================
 */

'use strict';

import { ZOLTOCompiler } from './parser-core.js';

/* ========================================================================================
   §1  ZOLTO LOGGER
   Structured multi-level console logger with performance mark integration.
   ======================================================================================== */

class ZoltoLogger {
    static LEVELS = Object.freeze({ DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4 });
    static currentLevel = ZoltoLogger.LEVELS.INFO;
    static _history = [];   // last 200 entries for diagnostics panel
    static MAX_HISTORY = 200;

    static _log(level, tag, ...args) {
        if (level < this.currentLevel) return;

        const entry = {
            ts:    performance.now().toFixed(2),
            level: Object.keys(this.LEVELS).find(k => this.LEVELS[k] === level) || 'INFO',
            tag,
            msg:   args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
        };

        this._history.push(entry);
        if (this._history.length > this.MAX_HISTORY) this._history.shift();

        const prefix = `[ZOLTO|${tag}] +${entry.ts}ms`;
        if (level >= this.LEVELS.ERROR) console.error(prefix, ...args);
        else if (level === this.LEVELS.WARN)  console.warn(prefix,  ...args);
        else if (level === this.LEVELS.DEBUG) console.debug(prefix, ...args);
        else                                  console.log(prefix,   ...args);
    }

    static debug(tag, ...a) { this._log(this.LEVELS.DEBUG, tag, ...a); }
    static info (tag, ...a) { this._log(this.LEVELS.INFO,  tag, ...a); }
    static warn (tag, ...a) { this._log(this.LEVELS.WARN,  tag, ...a); }
    static error(tag, ...a) { this._log(this.LEVELS.ERROR, tag, ...a); }
    static fatal(tag, ...a) { this._log(this.LEVELS.FATAL, tag, ...a); }

    static time(label)    { performance.mark(`zolto-start-${label}`); }
    static timeEnd(label) {
        try {
            performance.mark(`zolto-end-${label}`);
            performance.measure(label, `zolto-start-${label}`, `zolto-end-${label}`);
            const [m] = performance.getEntriesByName(label, 'measure');
            this.debug('Perf', `${label}: ${m.duration.toFixed(2)}ms`);
            return m.duration;
        } catch { return 0; }
    }
}

/* ========================================================================================
   §2  PERFORMANCE MONITOR
   Tracks compile pipeline timing, FPS, and exposes metrics to the UI status bar.
   ======================================================================================== */

class ZoltoPerformanceMonitor {
    constructor() {
        this.compileTimes = [];
        this.fps          = 0;
        this._fpsFrames   = 0;
        this._fpsLast     = performance.now();
        this._raf         = null;
        this._statusEl    = null;
    }

    attach(statusEl) {
        this._statusEl = statusEl;
        this._tickFPS();
    }

    _tickFPS() {
        this._raf = requestAnimationFrame(() => {
            this._fpsFrames++;
            const now = performance.now();
            const delta = now - this._fpsLast;
            if (delta >= 1000) {
                this.fps = Math.round((this._fpsFrames * 1000) / delta);
                this._fpsFrames = 0;
                this._fpsLast   = now;
                this._updateStatus();
            }
            this._tickFPS();
        });
    }

    recordCompile(ms) {
        this.compileTimes.push(ms);
        if (this.compileTimes.length > 50) this.compileTimes.shift();
        this._updateStatus();
    }

    get avgCompile() {
        if (!this.compileTimes.length) return 0;
        return (this.compileTimes.reduce((s, v) => s + v, 0) / this.compileTimes.length).toFixed(1);
    }

    _updateStatus() {
        if (!this._statusEl) return;
        const last = this.compileTimes.at(-1);
        this._statusEl.textContent =
            `⚡ ${last != null ? last.toFixed(1) : '--'}ms compile · avg ${this.avgCompile}ms · ${this.fps} fps`;
    }

    destroy() {
        if (this._raf) cancelAnimationFrame(this._raf);
    }
}

/* ========================================================================================
   §3  UNDO / REDO HISTORY
   Compressed ring-buffer history stack supporting branching navigation.
   ======================================================================================== */

class ZoltoHistory {
    constructor(maxSize = 100) {
        this.stack        = [];
        this.currentIndex = -1;
        this.maxSize      = maxSize;
        this.isNavigating = false;
    }

    push(state) {
        if (this.isNavigating) return;
        if (this.currentIndex >= 0 && this.stack[this.currentIndex] === state) return;
        // Truncate future branch
        if (this.currentIndex < this.stack.length - 1) {
            this.stack.length = this.currentIndex + 1;
        }
        this.stack.push(state);
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        } else {
            this.currentIndex++;
        }
    }

    undo() {
        if (this.currentIndex <= 0) return null;
        this.isNavigating = true;
        const state = this.stack[--this.currentIndex];
        this.isNavigating = false;
        return state;
    }

    redo() {
        if (this.currentIndex >= this.stack.length - 1) return null;
        this.isNavigating = true;
        const state = this.stack[++this.currentIndex];
        this.isNavigating = false;
        return state;
    }

    get canUndo() { return this.currentIndex > 0; }
    get canRedo()  { return this.currentIndex < this.stack.length - 1; }
    get size()     { return this.stack.length; }
}

/* ========================================================================================
   §4  PERSISTENCE
   Auto-save to localStorage, draft recovery, workspace snapshots.
   ======================================================================================== */

class ZoltoPersistence {
    static KEY_DRAFT    = 'zolto_draft_v1';
    static KEY_THEME    = 'zolto_theme_v1';
    static KEY_VIEWPORT = 'zolto_viewport_v1';
    static KEY_PREFS    = 'zolto_prefs_v1';

    static get _ok() {
        try { window.localStorage.setItem('_zolto_test', '1'); window.localStorage.removeItem('_zolto_test'); return true; }
        catch { return false; }
    }

    static saveDraft(text) {
        if (!this._ok) return;
        try {
            localStorage.setItem(this.KEY_DRAFT, JSON.stringify({
                text,
                ts: Date.now(),
                v:  '9.0',
            }));
        } catch (e) { ZoltoLogger.warn('Persist', 'Draft save failed:', e.message); }
    }

    static loadDraft() {
        if (!this._ok) return null;
        try {
            const raw = localStorage.getItem(this.KEY_DRAFT);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            return (obj && typeof obj.text === 'string') ? obj.text : null;
        } catch { return null; }
    }

    static saveTheme(theme) {
        if (!this._ok) return;
        try { localStorage.setItem(this.KEY_THEME, theme); } catch {}
    }

    static loadTheme() {
        if (!this._ok) return 'dark';
        try { return localStorage.getItem(this.KEY_THEME) || 'dark'; } catch { return 'dark'; }
    }

    static saveViewport(transform) {
        if (!this._ok) return;
        try { localStorage.setItem(this.KEY_VIEWPORT, JSON.stringify(transform)); } catch {}
    }

    static loadViewport() {
        if (!this._ok) return null;
        try {
            const raw = localStorage.getItem(this.KEY_VIEWPORT);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    static savePrefs(prefs) {
        if (!this._ok) return;
        try { localStorage.setItem(this.KEY_PREFS, JSON.stringify(prefs)); } catch {}
    }

    static loadPrefs() {
        if (!this._ok) return {};
        try {
            const raw = localStorage.getItem(this.KEY_PREFS);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }
}

/* ========================================================================================
   §5  VIEWPORT CONTROLLER
   Pan/zoom canvas engine with inertia, fit-to-content, programmatic zoom, and
   persistent transform restore between sessions.
   ======================================================================================== */

class ZoltoViewport {
    constructor(containerId, contentIds) {
        this.container  = document.getElementById(containerId);
        this.contents   = contentIds.map(id => document.getElementById(id)).filter(Boolean);
        this.transform  = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse  = { x: 0, y: 0 };
        this.velocity   = { x: 0, y: 0 };
        this.rafPending = false;
        this._inertiaId = null;

        // Bind once — prevents GC churn and enables proper removeEventListener
        this._onPointerDown  = this._handlePointerDown.bind(this);
        this._onPointerMove  = this._handlePointerMove.bind(this);
        this._onPointerUp    = this._handlePointerUp.bind(this);
        this._onWheel        = this._handleWheel.bind(this);
        this._onKeyDown      = this._handleKeyDown.bind(this);

        // Restore persisted transform
        const saved = ZoltoPersistence.loadViewport();
        if (saved && typeof saved.scale === 'number') {
            this.transform = { x: saved.x || 0, y: saved.y || 0, scale: saved.scale };
        }

        if (this.container && this.contents.length) this._initEvents();
    }

    _initEvents() {
        this.container.addEventListener('mousedown',  this._onPointerDown);
        window.addEventListener('mousemove',          this._onPointerMove, { passive: true });
        window.addEventListener('mouseup',            this._onPointerUp,   { passive: true });
        this.container.addEventListener('wheel',      this._onWheel,       { passive: false });
        this.container.addEventListener('keydown',    this._onKeyDown);

        // Touch support (mobile canvas pan/zoom)
        this._lastTouchDist = null;
        this.container.addEventListener('touchstart',  e => this._onTouchStart(e), { passive: false });
        this.container.addEventListener('touchmove',   e => this._onTouchMove(e),  { passive: false });
        this.container.addEventListener('touchend',    () => { this.isDragging = false; this._lastTouchDist = null; });
    }

    _applyTransform(persist = false) {
        if (this.rafPending) return;
        this.rafPending = true;
        requestAnimationFrame(() => {
            const t = `translate(${this.transform.x}px,${this.transform.y}px) scale(${this.transform.scale})`;
            this.contents.forEach(el => {
                el.style.transform       = t;
                el.style.transformOrigin = '0 0';
            });
            this.rafPending = false;
            if (persist) ZoltoPersistence.saveViewport(this.transform);
        });
    }

    _handlePointerDown(e) {
        if (e.button !== 0 && e.button !== 1) return;
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
        if (e.target.closest('button, a, [contenteditable], .zolto-interactive')) return;
        this.isDragging = true;
        this.lastMouse  = { x: e.clientX, y: e.clientY };
        this.velocity   = { x: 0, y: 0 };
        if (this._inertiaId) { cancelAnimationFrame(this._inertiaId); this._inertiaId = null; }
        this.container.style.cursor = 'grabbing';
        e.preventDefault();
    }

    _handlePointerMove(e) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.velocity = { x: dx * 0.6, y: dy * 0.6 };  // EMA for inertia
        this.transform.x += dx;
        this.transform.y += dy;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this._applyTransform();
    }

    _handlePointerUp() {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (this.container) this.container.style.cursor = '';
        this._startInertia();
        ZoltoPersistence.saveViewport(this.transform);
    }

    _startInertia() {
        const decay = 0.88;
        const tick = () => {
            if (Math.abs(this.velocity.x) < 0.3 && Math.abs(this.velocity.y) < 0.3) return;
            this.transform.x += this.velocity.x;
            this.transform.y += this.velocity.y;
            this.velocity.x  *= decay;
            this.velocity.y  *= decay;
            this._applyTransform();
            this._inertiaId = requestAnimationFrame(tick);
        };
        this._inertiaId = requestAnimationFrame(tick);
    }

    _handleWheel(e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const factor     = e.deltaY > 0 ? 1 / 1.12 : 1.12;
        const oldScale   = this.transform.scale;
        const newScale   = Math.max(0.08, Math.min(oldScale * factor, 8));
        const rect       = this.container.getBoundingClientRect();
        const mx         = e.clientX - rect.left;
        const my         = e.clientY - rect.top;
        this.transform.x = mx - (mx - this.transform.x) * (newScale / oldScale);
        this.transform.y = my - (my - this.transform.y) * (newScale / oldScale);
        this.transform.scale = newScale;
        this._applyTransform(true);
    }

    _handleKeyDown(e) {
        const STEP = 40;
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            switch (e.key) {
                case 'ArrowLeft':  this.transform.x -= STEP; break;
                case 'ArrowRight': this.transform.x += STEP; break;
                case 'ArrowUp':    this.transform.y -= STEP; break;
                case 'ArrowDown':  this.transform.y += STEP; break;
                default: return;
            }
            this._applyTransform(true);
            e.preventDefault();
        }
    }

    _onTouchStart(e) {
        if (e.touches.length === 2) {
            this._lastTouchDist = this._touchDist(e.touches);
        } else if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 2 && this._lastTouchDist != null) {
            const dist = this._touchDist(e.touches);
            const factor = dist / this._lastTouchDist;
            const mid    = this._touchMidpoint(e.touches);
            const rect   = this.container.getBoundingClientRect();
            const mx     = mid.x - rect.left;
            const my     = mid.y - rect.top;
            const oldScale = this.transform.scale;
            const newScale = Math.max(0.08, Math.min(oldScale * factor, 8));
            this.transform.x = mx - (mx - this.transform.x) * (newScale / oldScale);
            this.transform.y = my - (my - this.transform.y) * (newScale / oldScale);
            this.transform.scale = newScale;
            this._lastTouchDist = dist;
            this._applyTransform();
        } else if (e.touches.length === 1 && this.isDragging) {
            const dx = e.touches[0].clientX - this.lastMouse.x;
            const dy = e.touches[0].clientY - this.lastMouse.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            this._applyTransform();
        }
    }

    _touchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    _touchMidpoint(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    }

    // ── Public API ──────────────────────────────────────────────────────────────────────

    zoomIn()  { this._scaleAround(1.25); }
    zoomOut() { this._scaleAround(1 / 1.25); }
    reset()   { this.transform = { x: 0, y: 0, scale: 1 }; this._applyTransform(true); }

    fitToContent() {
        const content = this.contents[0];
        if (!content || !this.container) return;
        const cr = this.container.getBoundingClientRect();
        const contentW = content.scrollWidth  || cr.width;
        const contentH = content.scrollHeight || cr.height;
        const scale = Math.min(
            (cr.width  * 0.9) / contentW,
            (cr.height * 0.9) / contentH,
            1
        );
        this.transform = {
            x:     (cr.width  - contentW * scale) / 2,
            y:     (cr.height - contentH * scale) / 2,
            scale,
        };
        this._applyTransform(true);
    }

    _scaleAround(factor) {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        const mx = rect.width  / 2;
        const my = rect.height / 2;
        const oldScale   = this.transform.scale;
        const newScale   = Math.max(0.08, Math.min(oldScale * factor, 8));
        this.transform.x = mx - (mx - this.transform.x) * (newScale / oldScale);
        this.transform.y = my - (my - this.transform.y) * (newScale / oldScale);
        this.transform.scale = newScale;
        this._applyTransform(true);
    }

    destroy() {
        if (this._inertiaId) cancelAnimationFrame(this._inertiaId);
        this.container?.removeEventListener('mousedown',  this._onPointerDown);
        window.removeEventListener('mousemove',           this._onPointerMove);
        window.removeEventListener('mouseup',             this._onPointerUp);
        this.container?.removeEventListener('wheel',      this._onWheel);
        this.container?.removeEventListener('keydown',    this._onKeyDown);
    }
}

/* ========================================================================================
   §6  SMART EDITOR
   Textarea wrapper with debounced compile, auto-pair brackets, Tab→spaces,
   line-number gutter sync, smart indent, and snippet expansion hooks.
   ======================================================================================== */

class ZoltoEditor {
    static PAIR_MAP = Object.freeze({ '(': ')', '[': ']', '{': '}', '"': '"', '`': '`', '$': '$' });
    static INDENT   = '  '; // 2-space Zolto standard

    constructor(elementId, onChange) {
        this.el          = document.getElementById(elementId);
        this.onChange    = onChange;
        this._timer      = null;
        this._debounceMs = 140;
        if (this.el) this._initEvents();
    }

    _initEvents() {
        // Debounced compile on every keystroke
        this.el.addEventListener('input', () => {
            clearTimeout(this._timer);
            this._timer = setTimeout(() => {
                if (this.onChange) this.onChange(this.el.value);
            }, this._debounceMs);
        });

        // Smart key handling
        this.el.addEventListener('keydown', e => this._handleKeyDown(e));

        // Paste normalisation
        this.el.addEventListener('paste', e => {
            // Allow default paste; compile will fire via 'input'
        });
    }

    _handleKeyDown(e) {
        const ta = this.el;

        // Tab → 2-space indent (or un-indent with Shift+Tab)
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = ta.selectionStart;
            const end   = ta.selectionEnd;

            if (e.shiftKey) {
                // Un-indent: remove up to 2 leading spaces from each selected line
                const before = ta.value.substring(0, start);
                const after  = ta.value.substring(end);
                const lines  = ta.value.substring(start, end).split('\n');
                const unindented = lines.map(l => l.startsWith(ZoltoEditor.INDENT) ? l.slice(2) : l.startsWith(' ') ? l.slice(1) : l);
                ta.value = before + unindented.join('\n') + after;
                ta.selectionStart = start;
                ta.selectionEnd   = start + unindented.join('\n').length;
            } else {
                if (start === end) {
                    // Single cursor — insert spaces
                    const val = ta.value;
                    ta.value  = val.substring(0, start) + ZoltoEditor.INDENT + val.substring(end);
                    ta.selectionStart = ta.selectionEnd = start + 2;
                } else {
                    // Multi-line selection — indent all lines
                    const before  = ta.value.substring(0, start);
                    const after   = ta.value.substring(end);
                    const lines   = ta.value.substring(start, end).split('\n');
                    const indented = lines.map(l => ZoltoEditor.INDENT + l);
                    ta.value = before + indented.join('\n') + after;
                    ta.selectionStart = start;
                    ta.selectionEnd   = start + indented.join('\n').length;
                }
            }
            ta.dispatchEvent(new Event('input'));
            return;
        }

        // Auto-pair: ( [ { " ` $
        const pair = ZoltoEditor.PAIR_MAP[e.key];
        if (pair && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const start = ta.selectionStart;
            const end   = ta.selectionEnd;
            // Only auto-pair when nothing selected (avoid wrapping confusion)
            if (start === end) {
                e.preventDefault();
                const val = ta.value;
                ta.value = val.substring(0, start) + e.key + pair + val.substring(end);
                ta.selectionStart = ta.selectionEnd = start + 1;
                ta.dispatchEvent(new Event('input'));
            }
            return;
        }

        // Enter → auto-indent to match current line's indentation
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            const start  = ta.selectionStart;
            const lines  = ta.value.substring(0, start).split('\n');
            const curLine = lines[lines.length - 1];
            const indent  = curLine.match(/^(\s*)/)[1];
            if (indent.length > 0) {
                e.preventDefault();
                const val = ta.value;
                const ins  = '\n' + indent;
                ta.value   = val.substring(0, start) + ins + val.substring(ta.selectionEnd);
                ta.selectionStart = ta.selectionEnd = start + ins.length;
                ta.dispatchEvent(new Event('input'));
            }
        }
    }

    getValue()     { return this.el ? this.el.value : ''; }
    getLineCount() { return this.el ? this.el.value.split('\n').length : 0; }
    getWordCount() { return this.el ? (this.el.value.match(/\S+/g) || []).length : 0; }

    setValue(val, { silent = false } = {}) {
        if (!this.el || this.el.value === val) return;
        this.el.value = val;
        if (!silent && this.onChange) this.onChange(val);
    }

    /** Insert text at current caret position. */
    insertAt(text, offsetAfter = text.length) {
        if (!this.el) return;
        const start = this.el.selectionStart;
        const end   = this.el.selectionEnd;
        const val   = this.el.value;
        this.el.value = val.substring(0, start) + text + val.substring(end);
        this.el.selectionStart = this.el.selectionEnd = start + offsetAfter;
        this.el.dispatchEvent(new Event('input'));
        this.el.focus();
    }

    /** Replace entire content (used by history, file load). */
    replace(val) { this.setValue(val); }

    focus() { this.el?.focus(); }
}

/* ========================================================================================
   §7  ERROR / DIAGNOSTIC PANEL
   Shows compiler errors with severity icons and clickable line numbers.
   ======================================================================================== */

class ZoltoErrorPanel {
    constructor(containerId, editor) {
        this.el     = document.getElementById(containerId);
        this.editor = editor;
        this._count = 0;
    }

    clear() {
        if (this.el) { this.el.innerHTML = ''; this.el.hidden = true; }
        this._count = 0;
    }

    show(errors = []) {
        if (!this.el) return;
        if (!errors.length) { this.clear(); return; }
        this._count = errors.length;
        this.el.hidden = false;
        this.el.innerHTML = errors.map(err => {
            const sev   = err.severity || 'error';
            const icon  = sev === 'warning' ? '⚠' : sev === 'info' ? 'ℹ' : '✖';
            const line  = err.line  != null ? ` L${err.line}` : '';
            const col   = err.col   != null ? `:${err.col}` : '';
            const code  = err.code  ? ` [${err.code}]` : '';
            return `<div class="zolto-diag zolto-diag-${sev}" data-line="${err.line || 0}">
                      <span class="zolto-diag-icon">${icon}</span>
                      <span class="zolto-diag-loc">${line}${col}${code}</span>
                      <span class="zolto-diag-msg">${this._esc(err.message || err.msg || String(err))}</span>
                    </div>`;
        }).join('');

        // Click → jump to line in editor
        this.el.querySelectorAll('[data-line]').forEach(row => {
            row.addEventListener('click', () => {
                const ln = parseInt(row.dataset.line, 10);
                if (!ln || !this.editor?.el) return;
                const lines = this.editor.getValue().split('\n');
                const pos   = lines.slice(0, ln - 1).join('\n').length + (ln > 1 ? 1 : 0);
                this.editor.el.focus();
                this.editor.el.selectionStart = this.editor.el.selectionEnd = pos;
            });
        });
    }

    _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

/* ========================================================================================
   §8  SNIPPET PALETTE
   Quick-insert popup for all 6 Zolto domains. Triggered by Ctrl+Space.
   ======================================================================================== */

class ZoltoSnippetPalette {
    constructor(editor) {
        this.editor   = editor;
        this.isOpen   = false;
        this._el      = null;
        this._filter  = '';
        this._snippets = this._buildSnippets();
        this._create();
    }

    _buildSnippets() {
        // Pull from ZOLTO_CONFIG_EXTENDED if available, then supplement with built-ins
        const ext = (typeof ZOLTO_CONFIG_EXTENDED !== 'undefined')
            ? ZOLTO_CONFIG_EXTENDED.AUTOCOMPLETE?.SNIPPETS || {}
            : {};

        const builtins = {
            // §D1 Markdown
            'heading1':   { label: '# Heading 1',          body: '# ',               group: 'Markdown' },
            'heading2':   { label: '## Heading 2',         body: '## ',              group: 'Markdown' },
            'heading3':   { label: '### Heading 3',        body: '### ',             group: 'Markdown' },
            'important':  { label: '[important] callout',  body: '[important]\n\n[/important]',          group: 'Markdown' },
            'warning':    { label: '[warning] callout',    body: '[warning]\n\n[/warning]',              group: 'Markdown' },
            'tip':        { label: '[tip] callout',        body: '[tip]\n\n[/tip]',                      group: 'Markdown' },
            'info':       { label: '[info] callout',       body: '[info]\n\n[/info]',                    group: 'Markdown' },
            'table':      { label: 'Markdown table',       body: '| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A     | B     | C     |', group: 'Markdown' },
            'code':       { label: 'Code block',           body: '```javascript\n\n```',                 group: 'Markdown' },
            'tabs':       { label: '@tabs component',      body: '@tabs\n  @tab label="Tab 1"\n    Content\n  @/tab\n  @tab label="Tab 2"\n    Content\n  @/tab\n@/tabs', group: 'Markdown' },
            'collapse':   { label: '@collapse accordion',  body: '@collapse title="Section"\n\n@/collapse', group: 'Markdown' },
            'row':        { label: '@row card grid',       body: '@row\n  @card width=50%\n    Left\n  @/card\n  @card width=50%\n    Right\n  @/card\n@/row', group: 'Markdown' },
            'columns':    { label: '@columns layout',      body: '@columns count=2\n  ## Left\n  Content\n\n  ## Right\n  Content\n@/columns', group: 'Markdown' },
            // §D2 Mathematics
            'mathblock':  { label: '@math block',          body: '@math name="Equation"\n  \n@/math',    group: 'Math' },
            'inlinemath': { label: 'Inline $math$',        body: '$x$',                                  group: 'Math' },
            'fraction':   { label: '\\frac fraction',      body: '$\\frac{a}{b}$',                        group: 'Math' },
            'integral':   { label: 'Definite integral',    body: '$\\int_{a}^{b} f(x)\\,dx$',            group: 'Math' },
            'matrix':     { label: 'bmatrix 2×2',          body: '$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$', group: 'Math' },
            'sum':        { label: 'Summation \\sum',      body: '$\\sum_{i=1}^{n} a_i$',                group: 'Math' },
            'limit':      { label: 'Limit \\lim',          body: '$\\lim_{x \\to 0} f(x)$',             group: 'Math' },
            'derivative': { label: 'Derivative \\frac{d}{dx}', body: '$\\frac{d}{dx} f(x)$',            group: 'Math' },
            'sqrt':       { label: 'Square root \\sqrt',   body: '$\\sqrt{x}$',                          group: 'Math' },
            'chem':       { label: 'Chemistry \\ce{}',     body: '$\\ce{H_2O}$',                         group: 'Math' },
            'mathplot':   { label: '@math plot function',  body: '@math plot name="Graph"\n  function: "y = x^2"\n  xrange: [-5, 5]\n  yrange: [-1, 25]\n  grid: true\n@/math', group: 'Math' },
            // §D3 Diagrams
            'flowchart':  { label: '@diagram flowchart',   body: '@diagram flowchart title="Flow"\n  [Start] --> (Decision)\n  (Decision) --"Yes"--> [Done] +success\n  (Decision) --"No"-->  [Retry] +warning\n@/diagram', group: 'Diagrams' },
            'sequence':   { label: '@diagram sequence',    body: '@diagram sequence title="Sequence"\n  Alice -> Bob: Hello\n  Bob --> Alice: Hi!\n@/diagram', group: 'Diagrams' },
            'mindmap':    { label: '@graph mindmap',        body: '@graph mindmap\n  (Central Idea)\n    (Branch 1)\n      Leaf 1.1\n    (Branch 2)\n      Leaf 2.1\n@/graph', group: 'Diagrams' },
            'timeline':   { label: '@timeline',             body: '@timeline\n  event year=2020 text="First event"\n  event year=2022 text="Second event"\n  event year=2024 text="Third event"\n@/timeline', group: 'Diagrams' },
            'statemachine': { label: '@diagram state',     body: '@diagram state title="State Machine"\n  [*] --> Idle\n  Idle --> Active : start\n  Active --> Idle : stop\n  Active --> [*] : finish\n@/diagram', group: 'Diagrams' },
            'erd':        { label: '@diagram erd',          body: '@diagram erd\n  User {\n    uuid   id   PK\n    string name\n    string email\n  }\n  Post {\n    uuid id PK\n    string title\n  }\n  User ||--o{ Post : writes\n@/diagram', group: 'Diagrams' },
            // §D4 SVG & Graphics
            'canvas':     { label: '@canvas block',        body: '@canvas width=800 height=600\n  // Draw shapes here\n@/canvas', group: 'Graphics' },
            'vector':     { label: '@vector scene',        body: '@vector\n  layer: background\n  rect: x=10 y=10 width=200 height=100 fill=primary\n  circle: cx=300 cy=60 r=40 fill=accent\n@/vector', group: 'Graphics' },
            // §D5 Layout
            'grid':       { label: 'layout: grid',         body: 'layout: grid-3\n  [Column 1]\n  [Column 2]\n  [Column 3]', group: 'Layout' },
            'presentation': { label: '@presentation slides', body: '@presentation\n  @slide title="Title Slide"\n    # Welcome\n    Subtitle here\n  @/slide\n  @slide title="Content"\n    ## Main Point\n    Details...\n  @/slide\n@/presentation', group: 'Layout' },
            // §D6 Components / Assessment
            'mcq':        { label: '@mcq question',        body: '@mcq\n  question: "What is the correct answer?"\n  A: "Option A"\n  B: "Option B" [correct]\n  C: "Option C"\n  D: "Option D"\n  explanation: "Option B is correct because..."\n@/mcq', group: 'Assessment' },
            'quiz':       { label: '@quiz block',          body: '@quiz title="Quiz Title" time_limit=300\n  @mcq\n    question: "Question?"\n    A: "Wrong" \n    B: "Correct" [correct]\n  @/mcq\n@/quiz', group: 'Assessment' },
            'flashcard':  { label: '@flashcard',           body: '@flashcard\n  front: What is the concept?\n  back: The answer and explanation.\n  tags: [topic, subtopic]\n  difficulty: medium\n@/flashcard', group: 'Assessment' },
            'interactive': { label: '@interactive sliders', body: '@interactive\n  slider name="x" min=0 max=100 default=50 label="X value"\n  output: $y = x \\cdot 2$\n@/interactive', group: 'Assessment' },
            // Charts
            'chartbar':   { label: '@chart bar',           body: '@chart bar title="Bar Chart"\n  "Label A": 45\n  "Label B": 70\n  "Label C": 55\n@/chart', group: 'Charts' },
            'chartpie':   { label: '@chart pie',           body: '@chart pie title="Pie Chart"\n  "Slice A": 40\n  "Slice B": 35\n  "Slice C": 25\n@/chart', group: 'Charts' },
            'chartline':  { label: '@chart line',          body: '@chart line title="Line Chart"\n  x: [0, 1, 2, 3, 4, 5]\n  y: [10, 22, 15, 33, 27, 40]\n  xlabel: "Time"\n  ylabel: "Value"\n@/chart', group: 'Charts' },
        };

        // Merge: extended config wins on key collision
        const merged = { ...builtins };
        for (const [k, v] of Object.entries(ext)) {
            merged[k] = { ...v, group: v.group || 'Snippets' };
        }
        return merged;
    }

    _create() {
        this._el = document.createElement('div');
        this._el.id        = 'zolto-snippet-palette';
        this._el.className = 'zolto-palette';
        this._el.hidden    = true;
        this._el.innerHTML = `
            <div class="zolto-palette-header">
                <i class="fa-solid fa-puzzle-piece"></i>
                <input class="zolto-palette-input" placeholder="Search snippets… (all 6 domains)" autocomplete="off" spellcheck="false">
                <kbd>Esc</kbd>
            </div>
            <div class="zolto-palette-list"></div>`;
        document.body.appendChild(this._el);

        const input = this._el.querySelector('.zolto-palette-input');
        input.addEventListener('input', () => { this._filter = input.value; this._render(); });
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowDown') { e.preventDefault(); this._moveFocus(1); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); this._moveFocus(-1); }
            if (e.key === 'Enter')     { e.preventDefault(); this._selectFocused(); }
        });

        document.addEventListener('click', e => {
            if (this.isOpen && !this._el.contains(e.target)) this.close();
        });
    }

    open() {
        this._filter = '';
        this._el.querySelector('.zolto-palette-input').value = '';
        this._render();
        this._el.hidden = false;
        this.isOpen     = true;
        this._el.querySelector('.zolto-palette-input').focus();
    }

    close() {
        this._el.hidden = true;
        this.isOpen     = false;
        this.editor?.focus();
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    _render() {
        const list    = this._el.querySelector('.zolto-palette-list');
        const q       = this._filter.toLowerCase();
        const groups  = {};

        for (const [key, snip] of Object.entries(this._snippets)) {
            if (q && !snip.label.toLowerCase().includes(q) && !key.includes(q)) continue;
            const grp = snip.group || 'Snippets';
            if (!groups[grp]) groups[grp] = [];
            groups[grp].push({ key, ...snip });
        }

        let html = '';
        for (const [grp, items] of Object.entries(groups)) {
            html += `<div class="zolto-palette-group">${grp}</div>`;
            for (const item of items) {
                html += `<div class="zolto-palette-item" data-key="${item.key}" tabindex="-1">
                           <span class="zolto-palette-label">${item.label}</span>
                         </div>`;
            }
        }
        list.innerHTML = html || '<div class="zolto-palette-empty">No snippets match.</div>';

        list.querySelectorAll('.zolto-palette-item').forEach(row => {
            row.addEventListener('click', () => { this._insert(row.dataset.key); });
        });
    }

    _moveFocus(dir) {
        const items = [...this._el.querySelectorAll('.zolto-palette-item')];
        const idx   = items.indexOf(document.activeElement);
        const next  = items[Math.max(0, Math.min(items.length - 1, idx + dir))];
        next?.focus();
    }

    _selectFocused() {
        const focused = this._el.querySelector('.zolto-palette-item:focus');
        if (focused) this._insert(focused.dataset.key);
    }

    _insert(key) {
        const snip = this._snippets[key];
        if (!snip || !this.editor) return;
        this.editor.insertAt('\n' + snip.body + '\n');
        this.close();
    }
}

/* ========================================================================================
   §9  COMMAND PALETTE
   Ctrl+P / ⌘P fuzzy command palette for actions, navigation, and snippets.
   ======================================================================================== */

class ZoltoCommandPalette {
    constructor(studio) {
        this.studio  = studio;
        this.isOpen  = false;
        this._el     = null;
        this._cmds   = [];
        this._create();
    }

    _create() {
        this._el = document.createElement('div');
        this._el.id        = 'zolto-cmd-palette';
        this._el.className = 'zolto-cmd';
        this._el.hidden    = true;
        this._el.innerHTML = `
            <div class="zolto-cmd-backdrop"></div>
            <div class="zolto-cmd-box">
              <div class="zolto-cmd-header">
                <i class="fa-solid fa-terminal"></i>
                <input class="zolto-cmd-input" placeholder="Type a command…" autocomplete="off" spellcheck="false">
              </div>
              <div class="zolto-cmd-results"></div>
            </div>`;
        document.body.appendChild(this._el);

        this._el.querySelector('.zolto-cmd-backdrop').addEventListener('click', () => this.close());
        const input = this._el.querySelector('.zolto-cmd-input');
        input.addEventListener('input',   () => this._render(input.value));
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowDown') { e.preventDefault(); this._moveFocus(1); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); this._moveFocus(-1); }
            if (e.key === 'Enter')     { e.preventDefault(); this._runFocused(); }
        });
    }

    register(label, icon, fn, shortcut = '') {
        this._cmds.push({ label, icon, fn, shortcut });
    }

    open() {
        this._el.hidden = false;
        this.isOpen     = true;
        const input = this._el.querySelector('.zolto-cmd-input');
        input.value = '';
        this._render('');
        input.focus();
    }

    close() {
        this._el.hidden = true;
        this.isOpen     = false;
        this.studio?.editor?.focus();
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    _render(q) {
        const results = this._el.querySelector('.zolto-cmd-results');
        const lower   = q.toLowerCase();
        const matches = this._cmds.filter(c => !q || c.label.toLowerCase().includes(lower));
        results.innerHTML = matches.map((c, i) =>
            `<div class="zolto-cmd-item" data-idx="${i}" tabindex="-1">
               <i class="fa-solid ${c.icon} zolto-cmd-icon"></i>
               <span class="zolto-cmd-label">${c.label}</span>
               ${c.shortcut ? `<kbd class="zolto-cmd-key">${c.shortcut}</kbd>` : ''}
             </div>`
        ).join('') || '<div class="zolto-cmd-empty">No matching commands.</div>';

        results.querySelectorAll('.zolto-cmd-item').forEach((row, i) => {
            row.addEventListener('click', () => { this.close(); matches[i]?.fn(); });
        });
    }

    _moveFocus(dir) {
        const items = [...this._el.querySelectorAll('.zolto-cmd-item')];
        const idx   = items.indexOf(document.activeElement);
        items[Math.max(0, Math.min(items.length - 1, idx + dir))]?.focus();
    }

    _runFocused() {
        const focused = this._el.querySelector('.zolto-cmd-item:focus');
        if (!focused) return;
        const idx = parseInt(focused.dataset.idx, 10);
        const input = this._el.querySelector('.zolto-cmd-input').value;
        const lower = input.toLowerCase();
        const matches = this._cmds.filter(c => !input || c.label.toLowerCase().includes(lower));
        this.close();
        matches[idx]?.fn();
    }
}

/* ========================================================================================
   §10  EXPORT ENGINE
   Handles SVG export, full-document HTML export, and print-to-PDF pipeline.
   ======================================================================================== */

class ZoltoExportEngine {
    constructor(studio) { this.studio = studio; }

    /** Export the SVG layer as a standalone .svg file. */
    exportSVG() {
        const svgNode = document.getElementById('zolto-svg-layer');
        if (!svgNode) { this.studio.showToast('No SVG content to export', 'warn'); return; }

        let data = new XMLSerializer().serializeToString(svgNode);
        if (!data.includes('xmlns="http://www.w3.org/2000/svg"')) {
            data = data.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        this._download(
            new Blob([data], { type: 'image/svg+xml;charset=utf-8' }),
            'zolto-diagram.svg'
        );
        this.studio.showToast('SVG exported');
    }

    /** Export rendered canvas as a self-contained HTML file. */
    exportHTML() {
        const canvas = document.getElementById('zolto-canvas-content');
        if (!canvas) { this.studio.showToast('Nothing to export', 'warn'); return; }

        const source = this.studio.editor?.getValue() || '';
        const rendered = canvas.innerHTML;

        // Inline a minimal stylesheet so the export is standalone
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zolto Export — ${new Date().toLocaleDateString()}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#f1f5f9;padding:2rem;line-height:1.7}
    .zolto-export-wrap{max-width:900px;margin:0 auto}
    h1,h2,h3,h4,h5,h6{margin:.5em 0 .25em;font-weight:700;line-height:1.25}
    h1{font-size:2rem}h2{font-size:1.5rem}h3{font-size:1.25rem}
    code{font-family:'JetBrains Mono',monospace;font-size:.875rem;background:rgba(255,255,255,.1);padding:.1em .35em;border-radius:4px}
    pre code{background:none;padding:0}
    table{border-collapse:collapse;width:100%;margin:1rem 0}
    th,td{border:1px solid rgba(255,255,255,.15);padding:.5rem .75rem;text-align:left}
    th{background:rgba(255,255,255,.07);font-weight:600}
    blockquote{border-left:3px solid #3b82f6;margin:1rem 0;padding:.5rem 1rem;background:rgba(59,130,246,.08)}
    img{max-width:100%;height:auto}
    svg{max-width:100%;height:auto}
  </style>
</head>
<body>
<div class="zolto-export-wrap">
${rendered}
</div>
<!-- Source (.zl) preserved as HTML comment for round-trip recovery:
${source.replace(/--/g, '- -')}
-->
</body>
</html>`;

        this._download(
            new Blob([html], { type: 'text/html;charset=utf-8' }),
            'zolto-export.html'
        );
        this.studio.showToast('HTML exported');
    }

    /** Print current rendered output (browser print dialog → Save as PDF). */
    exportPrint() {
        window.print();
        this.studio.showToast('Opening print dialog…');
    }

    /** Export raw .zl source. */
    exportSource() {
        const text = this.studio.editor?.getValue() || '';
        this._download(
            new Blob([text], { type: 'text/plain;charset=utf-8' }),
            'workspace.zl'
        );
        this.studio.showToast('Zolto source (.zl) saved');
    }

    _download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
}

/* ========================================================================================
   §11  THEME MANAGER
   Handles dark/light/system themes with smooth CSS transitions and custom token injection.
   ======================================================================================== */

class ZoltoThemeManager {
    static THEMES = ['dark', 'light', 'midnight', 'sepia', 'contrast'];

    constructor(btnId) {
        this.btn     = document.getElementById(btnId);
        this.current = ZoltoPersistence.loadTheme();
        this._apply(this.current, false);
        if (this.btn) this.btn.addEventListener('click', () => this.cycle());

        // Respect OS preference if no saved theme
        const saved = ZoltoPersistence.loadTheme();
        if (!saved && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
            this.setTheme('light');
        }
    }

    cycle() {
        const idx  = ZoltoThemeManager.THEMES.indexOf(this.current);
        const next = ZoltoThemeManager.THEMES[(idx + 1) % ZoltoThemeManager.THEMES.length];
        this.setTheme(next);
    }

    setTheme(theme) {
        if (!ZoltoThemeManager.THEMES.includes(theme)) theme = 'dark';
        this._apply(theme, true);
    }

    _apply(theme, animate) {
        this.current = theme;
        const html   = document.documentElement;

        if (animate) {
            html.style.transition = 'background .25s, color .25s';
            setTimeout(() => { html.style.transition = ''; }, 400);
        }

        html.setAttribute('data-theme', theme);
        ZoltoPersistence.saveTheme(theme);

        // Update button icon
        if (this.btn) {
            const icon = this.btn.querySelector('i');
            if (icon) {
                const iconMap = { dark: 'fa-sun', light: 'fa-moon', midnight: 'fa-star', sepia: 'fa-book', contrast: 'fa-circle-half-stroke' };
                icon.className = `fa-solid ${iconMap[theme] || 'fa-sun'}`;
            }
            this.btn.title = `Theme: ${theme} (click to cycle)`;
        }
    }
}

/* ========================================================================================
   §12  ZOLTO STUDIO — MASTER ORCHESTRATOR
   The top-level DI container that bootstraps, wires, and coordinates all subsystems.
   ======================================================================================== */

class ZoltoStudio {
    constructor() {
        ZoltoLogger.info('Studio', '⚡ Zolto Studio 9.0.0-omnibus initialising…');
        this.isCompiling      = false;
        this._compileQueued   = false;
        this._pendingErrorEls = [];
        this._autoSaveTimer   = null;
        this._metricsCacheEl  = null;

        this._resolveUI();
        this._bootstrap();
    }

    /* ── DOM element cache ───────────────────────────────────────────────────────── */
    _resolveUI() {
        const $ = id => document.getElementById(id);
        this.ui = {
            editor:         $('zolto-editor'),
            canvasContent:  $('zolto-canvas-content'),
            svgLayer:       $('zolto-svg-layer'),
            svgPaths:       $('svg-paths'),
            toast:          $('toast'),
            btnTheme:       $('btn-theme'),
            btnLoad:        $('btn-load'),
            btnSave:        $('btn-save'),
            btnExport:      $('btn-export'),
            fileInput:      $('file-input'),
            errorPanel:     $('zolto-error-panel'),
            statusBar:      $('zolto-status-bar'),
            zoomIn:         $('btn-zoom-in'),
            zoomOut:        $('btn-zoom-out'),
            zoomReset:      $('btn-zoom-reset'),
            zoomFit:        $('btn-zoom-fit'),
            btnSnippets:    $('btn-snippets'),
            btnNewDoc:      $('btn-new-doc'),
            btnPrint:       $('btn-print'),
            btnExportHtml:  $('btn-export-html'),
            metricsBar:     $('zolto-metrics'),
        };
    }

    /* ── Full bootstrap ──────────────────────────────────────────────────────────── */
    _bootstrap() {
        // 1. Theme manager
        this.theme    = new ZoltoThemeManager('btn-theme');

        // 2. History
        this.history  = new ZoltoHistory(150);

        // 3. Performance monitor
        this.perf     = new ZoltoPerformanceMonitor();
        if (this.ui.statusBar) this.perf.attach(this.ui.statusBar);

        // 4. Error panel
        this.errorPanel = new ZoltoErrorPanel('zolto-error-panel', null /* editor ref added below */);

        // 5. Editor
        this.editor   = new ZoltoEditor('zolto-editor', text => {
            this.history.push(text);
            this._scheduleCompile();
            this._updateMetrics();
            this._scheduleAutoSave(text);
        });
        this.errorPanel.editor = this.editor;

        // 6. Viewport
        if (this.viewport) this.viewport.destroy();
        this.viewport = new ZoltoViewport(
            'preview-container',
            ['zolto-canvas-content', 'zolto-svg-layer']
        );

        // 7. Export engine
        this.exporter = new ZoltoExportEngine(this);

        // 8. Snippet palette
        this.snippets = new ZoltoSnippetPalette(this.editor);

        // 9. Command palette
        this.commands = new ZoltoCommandPalette(this);
        this._registerCommands();

        // 10. Wire all global subsystem bridges
        this._wireSubsystems();

        // 11. Bind all UI controls
        this._bindControls();

        // 12. Bind keyboard shortcuts
        this._bindKeyboard();

        // 13. Load initial content
        this._loadInitialContent();

        // 14. Register view-switch (mobile)
        this._bindViewSwitch();

        ZoltoLogger.info('Studio', '✅ Bootstrap complete');
    }

    /* ── Subsystem bridges ───────────────────────────────────────────────────────── */
    _wireSubsystems() {
        // §D4 SVG / Graphics: ZoltoSVGRouter
        this._router = window.ZoltoSVGRouter || window.SVGRouter || null;
        if (!this._router) ZoltoLogger.warn('Studio', 'ZoltoSVGRouter not found on window — SVG edges disabled');

        // §D5 Layout Engine
        this._layoutEngine = window.ZoltoLayoutEngine || null;

        // §D6 Component Runtime
        this._compRuntime = window.ZoltoComponentRuntime || null;
        if (this._compRuntime?.init) {
            try { this._compRuntime.init(); } catch (e) { ZoltoLogger.warn('Studio', 'ComponentRuntime.init() failed:', e.message); }
        }

        // Animation system
        this._animSystem = window.ZoltoAnimationSystem || null;

        // Snapping system
        this._snapping = window.ZoltoSnappingSystem || null;

        // ViewportManager (enhanced camera from router-engine)
        this._vpManager = window.ZoltoViewportManager || null;

        // Utils / EventBus
        this._utils = window.ZoltoUtils || null;

        // Advanced renderer (MCQ, charts, flashcards etc.)
        this._advRenderer = window.ZoltoAdvancedEngines || null;

        ZoltoLogger.debug('Studio', 'Subsystems wired:', {
            router:      !!this._router,
            layout:      !!this._layoutEngine,
            components:  !!this._compRuntime,
            animations:  !!this._animSystem,
            snapping:    !!this._snapping,
            advanced:    !!this._advRenderer,
        });
    }

    /* ── Command palette population ──────────────────────────────────────────────── */
    _registerCommands() {
        const cmd = (label, icon, fn, key = '') => this.commands.register(label, icon, fn, key);

        // File
        cmd('New Document',                 'fa-file',          () => this._newDocument(),          'Ctrl+N');
        cmd('Open .zl File',               'fa-folder-open',   () => this.ui.fileInput?.click(),   'Ctrl+O');
        cmd('Save Workspace (.zl)',         'fa-floppy-disk',   () => this.exporter.exportSource(), 'Ctrl+S');
        cmd('Export as SVG',               'fa-vector-square', () => this.exporter.exportSVG(),    'Ctrl+E');
        cmd('Export as HTML',              'fa-code',          () => this.exporter.exportHTML());
        cmd('Print / Export PDF',          'fa-print',         () => this.exporter.exportPrint(),  'Ctrl+P');

        // Edit
        cmd('Undo',                        'fa-rotate-left',   () => this._applyUndo(),            'Ctrl+Z');
        cmd('Redo',                        'fa-rotate-right',  () => this._applyRedo(),            'Ctrl+Y');

        // View
        cmd('Zoom In',                     'fa-magnifying-glass-plus',   () => this.viewport?.zoomIn());
        cmd('Zoom Out',                    'fa-magnifying-glass-minus',  () => this.viewport?.zoomOut());
        cmd('Reset Zoom',                  'fa-compress',                () => this.viewport?.reset());
        cmd('Fit to Content',             'fa-expand',                  () => this.viewport?.fitToContent());
        cmd('Toggle Dark/Light Theme',     'fa-circle-half-stroke',      () => this.theme?.cycle());

        // Snippets — all 6 domains quick-inserts
        cmd('Insert: Math Block (§D2)',    'fa-square-root-variable',    () => this.editor.insertAt('\n@math name="Equation"\n  \n@/math\n'));
        cmd('Insert: Flowchart (§D3)',     'fa-diagram-project',         () => this.editor.insertAt('\n@diagram flowchart title="Flow"\n  [Start] --> [End]\n@/diagram\n'));
        cmd('Insert: Sequence Diagram',   'fa-arrows-left-right',        () => this.editor.insertAt('\n@diagram sequence title="Sequence"\n  A -> B: Message\n@/diagram\n'));
        cmd('Insert: Mindmap (§D3)',       'fa-brain',                   () => this.editor.insertAt('\n@graph mindmap\n  (Central)\n    (Branch)\n@/graph\n'));
        cmd('Insert: MCQ Question (§D6)', 'fa-list-check',               () => this.editor.insertAt('\n@mcq\n  question: ""\n  A: "" [correct]\n  B: ""\n@/mcq\n'));
        cmd('Insert: Bar Chart',          'fa-chart-bar',                () => this.editor.insertAt('\n@chart bar title="Chart"\n  "A": 10\n  "B": 20\n@/chart\n'));
        cmd('Insert: Callout [important]','fa-circle-exclamation',       () => this.editor.insertAt('\n[important]\n\n[/important]\n'));
        cmd('Insert: Tabs Component',     'fa-table-columns',            () => this.editor.insertAt('\n@tabs\n  @tab label="Tab 1"\n    \n  @/tab\n@/tabs\n'));
        cmd('Insert: Flashcard (§D6)',    'fa-id-card',                  () => this.editor.insertAt('\n@flashcard\n  front: \n  back: \n@/flashcard\n'));
        cmd('Insert: Card Row (§D5)',     'fa-grip',                     () => this.editor.insertAt('\n@row\n  @card width=50%\n    Left\n  @/card\n  @card width=50%\n    Right\n  @/card\n@/row\n'));
        cmd('Insert: Timeline',           'fa-timeline',                 () => this.editor.insertAt('\n@timeline\n  event year=2020 text="Event"\n@/timeline\n'));
        cmd('Insert: Canvas Block (§D4)', 'fa-draw-polygon',             () => this.editor.insertAt('\n@canvas width=800 height=400\n  \n@/canvas\n'));

        // Templates
        cmd('Load: Ultimate Showcase',    'fa-star', () => this._loadTemplate('ULTIMATE_SHOWCASE'));
        cmd('Load: Blank Document',       'fa-file-circle-plus', () => this._loadTemplate('BLANK'));
        cmd('Load: Math Document',        'fa-square-root-variable', () => this._loadTemplate('MATH_SHOWCASE'));
        cmd('Load: Diagram Showcase',     'fa-diagram-project', () => this._loadTemplate('DIAGRAM_SHOWCASE'));
    }

    /* ── UI control bindings ─────────────────────────────────────────────────────── */
    _bindControls() {
        // File I/O
        this.ui.btnLoad?.addEventListener('click', () => this.ui.fileInput?.click());
        this.ui.fileInput?.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                this.editor.replace(ev.target.result);
                this.showToast(`✓ Loaded: ${file.name}`);
            };
            reader.onerror = () => this.showToast('File read failed', 'error');
            reader.readAsText(file, 'UTF-8');
            e.target.value = '';  // allow re-loading same file
        });

        this.ui.btnSave?.addEventListener('click', () => this.exporter.exportSource());
        this.ui.btnExport?.addEventListener('click', () => this.exporter.exportSVG());
        this.ui.btnPrint?.addEventListener('click', () => this.exporter.exportPrint());
        this.ui.btnExportHtml?.addEventListener('click', () => this.exporter.exportHTML());
        this.ui.btnNewDoc?.addEventListener('click', () => this._newDocument());
        this.ui.btnSnippets?.addEventListener('click', () => this.snippets.toggle());

        // Viewport zoom controls
        this.ui.zoomIn?.addEventListener('click',    () => this.viewport.zoomIn());
        this.ui.zoomOut?.addEventListener('click',   () => this.viewport.zoomOut());
        this.ui.zoomReset?.addEventListener('click', () => this.viewport.reset());
        this.ui.zoomFit?.addEventListener('click',   () => this.viewport.fitToContent());
    }

    /* ── Keyboard shortcut registry ──────────────────────────────────────────────── */
    _bindKeyboard() {
        window.addEventListener('keydown', e => {
            const ctrl = e.ctrlKey || e.metaKey;
            const key  = e.key.toLowerCase();

            // Command palette
            if (ctrl && key === 'p') { e.preventDefault(); this.commands.toggle(); return; }

            // Snippet palette
            if (ctrl && e.key === ' ') { e.preventDefault(); this.snippets.toggle(); return; }

            // Undo / Redo
            if (ctrl && key === 'z' && !e.shiftKey) { e.preventDefault(); this._applyUndo(); return; }
            if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); this._applyRedo(); return; }

            // Save
            if (ctrl && key === 's') { e.preventDefault(); this.exporter.exportSource(); return; }

            // Open
            if (ctrl && key === 'o') { e.preventDefault(); this.ui.fileInput?.click(); return; }

            // New
            if (ctrl && key === 'n') { e.preventDefault(); this._newDocument(); return; }

            // Export
            if (ctrl && key === 'e') { e.preventDefault(); this.exporter.exportSVG(); return; }

            // Math insert shortcut (§D2)
            if (ctrl && key === 'm') {
                e.preventDefault();
                this.editor.insertAt('\n@math name="Equation"\n  \n@/math\n', 21);
                return;
            }

            // Diagram insert shortcut (§D3)
            if (ctrl && key === 'd' && !e.shiftKey) {
                e.preventDefault();
                this.editor.insertAt('\n@diagram flowchart\n  [Start] --> [End]\n@/diagram\n');
                return;
            }

            // Zoom
            if (ctrl && (key === '=' || key === '+')) { e.preventDefault(); this.viewport?.zoomIn();  return; }
            if (ctrl && key === '-')                   { e.preventDefault(); this.viewport?.zoomOut(); return; }
            if (ctrl && key === '0')                   { e.preventDefault(); this.viewport?.reset();   return; }
        });
    }

    /* ── Mobile view switcher ────────────────────────────────────────────────────── */
    _bindViewSwitch() {
        const btns = document.querySelectorAll('.view-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', e => {
                btns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.body.className = `mode-${e.currentTarget.getAttribute('data-view')}`;
            });
        });
    }

    /* ── Initial content loader ──────────────────────────────────────────────────── */
    _loadInitialContent() {
        // Priority: 1) persisted draft, 2) config showcase, 3) built-in sample
        const draft = ZoltoPersistence.loadDraft();
        if (draft && draft.trim().length > 20) {
            this.editor.setValue(draft, { silent: true });
            this.showToast('Draft restored from last session');
        } else {
            const showcase = (typeof ZOLTO_CONFIG_EXTENDED !== 'undefined')
                ? ZOLTO_CONFIG_EXTENDED?.TEMPLATES?.ULTIMATE_SHOWCASE
                : null;
            this.editor.setValue(showcase || this._fallbackDoc(), { silent: true });
        }

        this.history.push(this.editor.getValue());
        this._updateMetrics();
        this.triggerCompile();
    }

    /* ── Template loader ─────────────────────────────────────────────────────────── */
    _loadTemplate(key) {
        const templates = (typeof ZOLTO_CONFIG_EXTENDED !== 'undefined')
            ? ZOLTO_CONFIG_EXTENDED?.TEMPLATES || {}
            : {};
        const tpl = templates[key];
        if (!tpl) { this.showToast(`Template "${key}" not found`, 'warn'); return; }
        this.editor.replace(tpl);
        this.showToast(`✓ Template loaded: ${key.replace(/_/g, ' ').toLowerCase()}`);
    }

    /* ── New document ────────────────────────────────────────────────────────────── */
    _newDocument() {
        const blank = (typeof ZOLTO_CONFIG_EXTENDED !== 'undefined')
            ? ZOLTO_CONFIG_EXTENDED?.TEMPLATES?.BLANK
            : '# Untitled\n\nStart writing…';
        if (this.editor.getValue().trim() && !confirm('Create new document? Unsaved changes will be lost.')) return;
        this.editor.replace(blank || '# Untitled\n\nStart writing…');
        this.showToast('New document created');
    }

    /* ── Metrics bar ─────────────────────────────────────────────────────────────── */
    _updateMetrics() {
        if (!this.ui.metricsBar) return;
        const lines = this.editor.getLineCount();
        const words = this.editor.getWordCount();
        this.ui.metricsBar.textContent = `${lines} lines · ${words} words`;
    }

    /* ── Auto-save ───────────────────────────────────────────────────────────────── */
    _scheduleAutoSave(text) {
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => {
            ZoltoPersistence.saveDraft(text);
        }, 2000);
    }

    /* ── Undo / Redo helpers ─────────────────────────────────────────────────────── */
    _applyUndo() {
        const state = this.history.undo();
        if (state !== null) {
            this.editor.setValue(state, { silent: true });
            this.triggerCompile();
            this.showToast('Undo');
        }
    }

    _applyRedo() {
        const state = this.history.redo();
        if (state !== null) {
            this.editor.setValue(state, { silent: true });
            this.triggerCompile();
            this.showToast('Redo');
        }
    }

    /* ── Toast notifications ─────────────────────────────────────────────────────── */
    showToast(message, type = 'info') {
        if (!this.ui.toast) return;
        this.ui.toast.textContent = message;
        this.ui.toast.className   = `toast show toast-${type}`;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            this.ui.toast.classList.remove('show');
        }, 3000);
    }

    /* ── Compile pipeline ────────────────────────────────────────────────────────── */

    /**
     * Schedule a compile on the next animation frame.
     * Uses a "pending" flag to collapse rapid-fire calls into one compile pass.
     */
    _scheduleCompile() {
        if (this._compileQueued) return;
        this._compileQueued = true;
        // Microtask to batch same-tick changes, then RAF to align with paint
        queueMicrotask(() => {
            requestAnimationFrame(() => {
                this._compileQueued = false;
                if (!this.isCompiling) this.triggerCompile();
            });
        });
    }

    /**
     * Full compile + render pipeline.
     * Covers all 6 Zolto domains via the compiler and renderer chain.
     */
    triggerCompile() {
        if (this.isCompiling) { this._compileQueued = true; return; }
        this.isCompiling = true;
        ZoltoLogger.time('compile');

        try {
            const source = this.editor?.getValue() || '';

            /* ── §D1–§D6: Parse → AST ─────────────────────────────────────────── */
            let ast;
            try {
                ast = ZOLTOCompiler.parse(source);
            } catch (parseErr) {
                // Surface parse errors but still attempt partial render
                ZoltoLogger.warn('Compiler', 'Parse error:', parseErr.message);
                const diags = Array.isArray(parseErr.diagnostics)
                    ? parseErr.diagnostics
                    : [{ severity: 'error', message: parseErr.message, line: parseErr.line }];
                this.errorPanel.show(diags);
                ast = null;
            }

            // Clear errors on successful parse
            if (ast) this.errorPanel.clear();

            // Post-parse AST normalisation patch (backward compat with v7 AST shapes)
            if (ast && Array.isArray(ast.nodes)) {
                for (const node of ast.nodes) {
                    if (node.type === 'CodeBlock' && !node.language) node.language = node.lang || '';
                    if (node.type === 'Chart'     && !node.dataset)  node.dataset  = node.data || [];
                }
            }

            /* ── §D1–§D6: Render → HTML (via ZoltoRenderer + ZoltoAdvancedEngines) */
            if (window.ZoltoRenderer && this.ui.canvasContent && ast) {
                try {
                    const html = window.ZoltoRenderer.render(ast);
                    this.ui.canvasContent.innerHTML = html;

                    // §D6: Run component runtime post-render (slot hydration, variant logic)
                    if (this._compRuntime?.hydrate) {
                        try { this._compRuntime.hydrate(this.ui.canvasContent); } catch {}
                    }

                    // §D3 / §D5: Trigger layout engine for spatial blocks
                    if (this._layoutEngine?.processAll) {
                        try { this._layoutEngine.processAll(this.ui.canvasContent); } catch {}
                    }

                    // §D4: Fire animations after DOM is painted
                    if (this._animSystem?.runAll) {
                        requestAnimationFrame(() => {
                            try { this._animSystem.runAll(this.ui.canvasContent); } catch {}
                        });
                    }

                } catch (renderErr) {
                    ZoltoLogger.error('Renderer', 'Render failure:', renderErr);
                    this.ui.canvasContent.innerHTML =
                        `<div style="padding:1rem;color:#ef4444;font-family:monospace">
                           <strong>Render Error</strong><br>${renderErr.message}
                         </div>`;
                }
            }

            /* ── §D3 / §D4: SVG edge routing ────────────────────────────────── */
            if (this._router && this.ui.svgPaths && ast?.edges?.length) {
                // Wait for DOM paint so getBoundingClientRect is accurate
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        try {
                            const container = document.getElementById('preview-container');
                            const svgHTML   = this._router.routeEdges(ast.edges, container);
                            if (this.ui.svgPaths) this.ui.svgPaths.innerHTML = svgHTML || '';
                        } catch (routeErr) {
                            ZoltoLogger.warn('SVGRouter', 'Edge routing failed:', routeErr.message);
                        }
                    });
                });
            } else if (this.ui.svgPaths && (!ast?.edges?.length)) {
                this.ui.svgPaths.innerHTML = '';
            }

            /* ── Diagnostics from AST ───────────────────────────────────────── */
            if (ast?.diagnostics?.length) {
                this.errorPanel.show(ast.diagnostics);
            }

        } catch (fatalErr) {
            ZoltoLogger.error('Pipeline', 'Fatal compile error:', fatalErr);
            this.errorPanel.show([{ severity: 'error', message: fatalErr.message }]);
        } finally {
            const ms = ZoltoLogger.timeEnd('compile');
            this.perf.recordCompile(ms || 0);
            this.isCompiling = false;

            // If another compile was requested while we were running, fire it now
            if (this._compileQueued) {
                this._compileQueued = false;
                requestAnimationFrame(() => this.triggerCompile());
            }
        }
    }

    /* ── Built-in fallback document ──────────────────────────────────────────────── */
    _fallbackDoc() {
        return `# Welcome to Zolto Studio 9.0

**Zolto** is a unified visual language combining Markdown, LaTeX, Mermaid and spatial design into one coherent syntax.

[important]
Press **Ctrl+P** (⌘P on Mac) to open the command palette.  
Press **Ctrl+Space** to insert a snippet from any of the 6 domains.
[/important]

---

## §D2 Mathematics

The quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

@math name="Euler's Identity"
  e^{i\\pi} + 1 = 0
@/math

---

## §D3 Diagrams

@diagram flowchart title="Zolto Pipeline"
  [Source .zl] --> (Tokenizer)
  (Tokenizer) --> (Parser → AST)
  (Parser → AST) --> [Renderer → HTML]
  [Renderer → HTML] --> (Canvas Output) +success
@/diagram

---

## §D1 Rich Markdown

| Feature      | Markdown | LaTeX | Mermaid | **Zolto** |
|:-------------|:--------:|:-----:|:-------:|:---------:|
| Rich text    | ✓        | -     | -       | **✓+**    |
| Mathematics  | -        | ✓     | -       | **✓+**    |
| Diagrams     | -        | -     | ✓       | **✓++**   |
| Assessments  | -        | -     | -       | **✓**     |
| Layouts      | -        | -     | -       | **✓+**    |

---

## §D6 Assessment

@mcq
  question: "What does Zolto unify?"
  A: "Only Markdown features"
  B: "Markdown, Math, Diagrams, Layouts and Components" [correct]
  C: "Only diagram tools"
  D: "Only LaTeX math"
  explanation: "Zolto combines all six domains into one coherent language."
  difficulty: easy
@/mcq

---

## §D5 Layouts

@row
  @card width=33%
    **📝 §D1 Markdown**
    Rich text, tables, callouts, tabs, accordions, footnotes.
  @/card
  @card width=33%
    **∑ §D2 Math**
    LaTeX-level equations, matrices, chemistry, function plots.
  @/card
  @card width=33%
    **📊 §D3 Diagrams**
    Flowcharts, mindmaps, sequences, ER, timelines, state machines.
  @/card
@/row

---

*Open any .zl file or use the command palette (Ctrl+P) to load a template.*`;
    }
}

/* ========================================================================================
   §13  BOOT
   Safe initialisation: handles both pre-loaded DOM and deferred DOMContentLoaded.
   ======================================================================================== */

/**
 * Injects critical UI styles for the panels added by zolto-core.js
 * (snippet palette, command palette, error panel, status bar, metrics bar).
 * These supplement variables.css / layout.css / canvas.css without modifying them.
 */
function _injectCoreStyles() {
    if (document.getElementById('zolto-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'zolto-core-styles';
    style.textContent = `
/* ── Zolto Core UI — injected by zolto-core.js ── */

/* Toast extended variants */
.toast-warn  { border-left: 3px solid #f59e0b !important; }
.toast-error { border-left: 3px solid #ef4444 !important; }
.toast-info  { border-left: 3px solid #3b82f6 !important; }

/* Diagnostic / Error Panel */
#zolto-error-panel {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: var(--bg-panel, #0f172a);
  border-top: 1px solid var(--color-border, #334155);
  max-height: 160px;
  overflow-y: auto;
  z-index: 80;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: .78rem;
}
.zolto-diag {
  display: flex; align-items: center; gap: .5rem;
  padding: .35rem .75rem;
  border-bottom: 1px solid rgba(255,255,255,.04);
  cursor: pointer;
  transition: background .12s;
}
.zolto-diag:hover { background: rgba(255,255,255,.05); }
.zolto-diag-error   { color: #ef4444; }
.zolto-diag-warning { color: #f59e0b; }
.zolto-diag-info    { color: #3b82f6; }
.zolto-diag-icon    { flex-shrink: 0; }
.zolto-diag-loc     { opacity: .6; flex-shrink: 0; }
.zolto-diag-msg     { flex: 1; }

/* Status / Metrics bar */
#zolto-status-bar, #zolto-metrics {
  font-family: var(--font-mono, monospace);
  font-size: .72rem;
  color: var(--color-text-mute, #64748b);
  padding: .2rem .75rem;
  background: var(--bg-depth, #1e293b);
  border-top: 1px solid var(--color-border, #334155);
  user-select: none;
}
#zolto-metrics { text-align: right; }

/* ── Snippet Palette ── */
.zolto-palette {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: min(480px, 96vw);
  max-height: 70vh;
  background: var(--bg-panel, #0f172a);
  border: 1px solid var(--color-border, #334155);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0,0,0,.6);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.zolto-palette-header {
  display: flex; align-items: center; gap: .5rem;
  padding: .6rem .875rem;
  border-bottom: 1px solid var(--color-border, #334155);
  background: var(--bg-depth, #1e293b);
}
.zolto-palette-header i { color: var(--color-accent, #3b82f6); flex-shrink: 0; }
.zolto-palette-header kbd {
  margin-left: auto; padding: .15rem .4rem;
  border: 1px solid var(--color-border, #334155);
  border-radius: 4px; font-size: .7rem;
  color: var(--color-text-mute, #64748b);
  background: var(--bg-panel, #0f172a);
}
.zolto-palette-input {
  flex: 1;
  background: transparent;
  border: none; outline: none;
  color: var(--color-text, #f1f5f9);
  font-size: .9rem;
  font-family: inherit;
}
.zolto-palette-list {
  overflow-y: auto;
  flex: 1;
  padding: .4rem 0;
}
.zolto-palette-group {
  padding: .25rem .875rem;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--color-text-mute, #64748b);
  background: var(--bg-depth, #1e293b);
  border-bottom: 1px solid var(--color-border, #334155);
  margin-top: .25rem;
}
.zolto-palette-item {
  display: flex; align-items: center; gap: .5rem;
  padding: .45rem .875rem;
  cursor: pointer;
  transition: background .1s;
  outline: none;
}
.zolto-palette-item:hover,
.zolto-palette-item:focus { background: rgba(59,130,246,.15); }
.zolto-palette-label { font-size: .875rem; color: var(--color-text, #f1f5f9); }
.zolto-palette-empty { padding: 1rem; text-align: center; color: var(--color-text-mute, #64748b); font-size: .85rem; }

/* ── Command Palette ── */
.zolto-cmd {
  position: fixed; inset: 0; z-index: 1100;
  display: flex; align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
}
.zolto-cmd-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
}
.zolto-cmd-box {
  position: relative;
  width: min(560px, 96vw);
  background: var(--bg-panel, #0f172a);
  border: 1px solid var(--color-border, #334155);
  border-radius: 14px;
  box-shadow: 0 32px 100px rgba(0,0,0,.7);
  overflow: hidden;
  max-height: 65vh;
  display: flex;
  flex-direction: column;
}
.zolto-cmd-header {
  display: flex; align-items: center; gap: .65rem;
  padding: .75rem 1rem;
  border-bottom: 1px solid var(--color-border, #334155);
  background: var(--bg-depth, #1e293b);
}
.zolto-cmd-header i { color: var(--color-accent, #3b82f6); }
.zolto-cmd-input {
  flex: 1;
  background: transparent; border: none; outline: none;
  color: var(--color-text, #f1f5f9);
  font-size: 1rem;
  font-family: inherit;
}
.zolto-cmd-results { overflow-y: auto; flex: 1; padding: .35rem 0; }
.zolto-cmd-item {
  display: flex; align-items: center; gap: .6rem;
  padding: .5rem 1rem;
  cursor: pointer;
  transition: background .1s;
  outline: none;
}
.zolto-cmd-item:hover,
.zolto-cmd-item:focus { background: rgba(59,130,246,.15); }
.zolto-cmd-icon { width: 1rem; text-align: center; color: var(--color-accent, #3b82f6); flex-shrink: 0; }
.zolto-cmd-label { flex: 1; font-size: .9rem; color: var(--color-text, #f1f5f9); }
.zolto-cmd-key {
  font-size: .7rem; padding: .1rem .35rem;
  border: 1px solid var(--color-border, #334155);
  border-radius: 4px;
  color: var(--color-text-mute, #64748b);
  background: var(--bg-panel, #0f172a);
  font-family: var(--font-mono, monospace);
  flex-shrink: 0;
}
.zolto-cmd-empty { padding: 1.25rem; text-align: center; color: var(--color-text-mute, #64748b); font-size: .85rem; }

/* Theme variants */
[data-theme="light"] {
  --bg-panel: #ffffff;
  --bg-depth: #f1f5f9;
  --color-text: #0f172a;
  --color-text-mute: #64748b;
  --color-border: #e2e8f0;
  --color-accent: #2563eb;
}
[data-theme="midnight"] {
  --bg-panel: #060918;
  --bg-depth: #0d1224;
  --color-border: #1e2a4a;
  --color-accent: #818cf8;
}
[data-theme="sepia"] {
  --bg-panel: #fdf8f0;
  --bg-depth: #f4ede0;
  --color-text: #2c1810;
  --color-text-mute: #7c6050;
  --color-border: #d4b896;
  --color-accent: #b45309;
}
[data-theme="contrast"] {
  --bg-panel: #000000;
  --bg-depth: #0a0a0a;
  --color-text: #ffffff;
  --color-border: #444444;
  --color-accent: #ffdd00;
}

/* Print styles — clean output for PDF export */
@media print {
  .header, .editor, .view-switch, .controls,
  #zolto-error-panel, #zolto-status-bar, #zolto-metrics,
  #zolto-snippet-palette, #zolto-cmd-palette { display: none !important; }
  .preview, .workspace { all: unset; }
  #zolto-canvas-content { display: block; width: 100%; }
  body { background: #fff !important; color: #000 !important; }
}
`;
    document.head.appendChild(style);
}

/**
 * Ensures that the error panel, status bar, and metrics bar elements exist in the DOM.
 * Creates them if not present in index.html (graceful progressive enhancement).
 */
function _ensurePanelElements() {
    // Error panel — attached to preview container
    if (!document.getElementById('zolto-error-panel')) {
        const preview = document.querySelector('.preview') || document.body;
        const div = document.createElement('div');
        div.id = 'zolto-error-panel';
        div.hidden = true;
        preview.appendChild(div);
    }

    // Status bar (compile timing / FPS)
    if (!document.getElementById('zolto-status-bar')) {
        const bar = document.createElement('div');
        bar.id = 'zolto-status-bar';
        bar.textContent = 'Ready';
        const preview = document.querySelector('.preview') || document.body;
        preview.appendChild(bar);
    }

    // Metrics bar (line / word count) — attached to editor panel
    if (!document.getElementById('zolto-metrics')) {
        const bar = document.createElement('div');
        bar.id = 'zolto-metrics';
        bar.textContent = '0 lines · 0 words';
        const editor = document.querySelector('.editor') || document.body;
        editor.appendChild(bar);
    }
}

/* ── Entry point ──────────────────────────────────────────────────────────────────── */
function initApp() {
    _injectCoreStyles();
    _ensurePanelElements();
    window.App = new ZoltoStudio();
    ZoltoLogger.info('Boot', `Zolto Studio 9.0.0-omnibus ready — ${window.App.editor.getLineCount()} lines loaded`);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
