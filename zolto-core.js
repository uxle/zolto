/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE APPLICATION CONTROLLER (Optimized Repair Patch)
 * Version: 5.0.1 (Memory Safe & Corrected)
 * =========================================================================================
 */

'use strict';

import { ZOLTOCompiler } from './parser-core.js';

class ZoltoLogger {
    static LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4 };
    static currentLevel = ZoltoLogger.LEVELS.INFO;
    
    static _log(level, tag, ...args) {
        if (level < this.currentLevel) return;
        const prefix = `[ZOLTO|${tag}]`;
        if (level >= this.LEVELS.ERROR) console.error(prefix, ...args);
        else if (level === this.LEVELS.WARN) console.warn(prefix, ...args);
        else console.log(prefix, ...args);
    }
    static info(tag, ...args) { this._log(this.LEVELS.INFO, tag, ...args); }
    static warn(tag, ...args) { this._log(this.LEVELS.WARN, tag, ...args); }
    static error(tag, ...args) { this._log(this.LEVELS.ERROR, tag, ...args); }
}

class ZoltoHistory {
    constructor(maxSize = 50) {
        this.stack = [];
        this.currentIndex = -1;
        this.maxSize = maxSize;
        this.isNavigating = false;
    }
    push(state) {
        if (this.isNavigating) return;
        if (this.currentIndex >= 0 && this.stack[this.currentIndex] === state) return;
        if (this.currentIndex < this.stack.length - 1) this.stack.length = this.currentIndex + 1;
        this.stack.push(state);
        if (this.stack.length > this.maxSize) this.stack.shift();
        else this.currentIndex++;
    }
    undo() {
        if (this.currentIndex > 0) {
            this.isNavigating = true;
            const state = this.stack[--this.currentIndex];
            this.isNavigating = false;
            return state;
        }
        return null;
    }
    redo() {
        if (this.currentIndex < this.stack.length - 1) {
            this.isNavigating = true;
            const state = this.stack[++this.currentIndex];
            this.isNavigating = false;
            return state;
        }
        return null;
    }
}

class ZoltoViewport {
    constructor(containerId, contentIds) {
        this.container = document.getElementById(containerId);
        this.contents = contentIds.map(id => document.getElementById(id)).filter(Boolean);
        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.rafPending = false;

        // Memoize references to prevent unbound garbage collection allocations
        this._boundOnPointerMove = this._onPointerMove.bind(this);
        this._boundOnPointerUp = this._onPointerUp.bind(this);

        if (this.container && this.contents.length > 0) this._initEvents();
    }
    
    _initEvents() {
        this.container.addEventListener('mousedown', this._onPointerDown.bind(this));
        window.addEventListener('mousemove', this._boundOnPointerMove, { passive: true });
        window.addEventListener('mouseup', this._boundOnPointerUp, { passive: true });
        this.container.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    }
    
    _applyTransform() {
        if (this.rafPending) return;
        this.rafPending = true;
        requestAnimationFrame(() => {
            const transformString = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
            this.contents.forEach(el => {
                el.style.transform = transformString;
                el.style.transformOrigin = '0 0';
            });
            this.rafPending = false;
        });
    }
    
    _onPointerDown(e) {
        if (e.button !== 0 && e.button !== 1) return; 
        if (e.target.tagName.toLowerCase() === 'textarea' || e.target.closest('button')) return;
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.container.style.cursor = 'grabbing';
    }
    
    _onPointerMove(e) {
        if (!this.isDragging) return;
        this.transform.x += e.clientX - this.lastMouse.x;
        this.transform.y += e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this._applyTransform();
    }
    
    _onPointerUp() {
        this.isDragging = false;
        if (this.container) this.container.style.cursor = '';
    }
    
    _onWheel(e) {
        if (!e.ctrlKey && !e.metaKey) return; 
        e.preventDefault();
        
        const zoomFactor = 1.1;
        const scaleChange = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
        const oldScale = this.transform.scale;
        let newScale = Math.max(0.1, Math.min(oldScale * scaleChange, 5));
        
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Stabilize camera translation algebra equations against variable scale shifts
        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / oldScale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / oldScale);
        this.transform.scale = newScale;
        this._applyTransform();
    }

    destroy() {
        window.removeEventListener('mousemove', this._boundOnPointerMove);
        window.removeEventListener('mouseup', this._boundOnPointerUp);
    }
}

class ZoltoEditor {
    constructor(elementId, onChange) {
        this.el = document.getElementById(elementId);
        this.onChange = onChange;
        if (this.el) this._initEvents();
    }
    _initEvents() {
        let debounceTimer;
        this.el.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (this.onChange) this.onChange(this.el.value);
            }, 120);
        });
    }
    getValue() { return this.el ? this.el.value : ''; }
    setValue(val) { 
        if (this.el && this.el.value !== val) {
            this.el.value = val;
            if (this.onChange) this.onChange(val);
        }
    }
}

class ZoltoStudio {
    constructor() {
        this.ui = {
            editor: document.getElementById('zolto-editor'),
            canvasContent: document.getElementById('zolto-canvas-content'),
            svgPaths: document.getElementById('svg-paths'),
            toast: document.getElementById('toast'),
            btnTheme: document.getElementById('btn-theme')
        };
        this.history = new ZoltoHistory();
        this.isCompiling = false;
        this._bootstrap();
    }
    
    _bootstrap() {
        ZoltoLogger.info('App', 'Bootstrapping Zolto Studio Engine...');
        if (this.ui.editor) {
            this.editor = new ZoltoEditor('zolto-editor', (text) => {
                this.history.push(text);
                this.triggerCompile();
            });
            this.history.push(this.editor.getValue());
        }
        if (this.viewport && typeof this.viewport.destroy === 'function') {
            this.viewport.destroy();
        }
        this.viewport = new ZoltoViewport('preview-container', ['zolto-canvas-content', 'zolto-svg-layer']);
        
        this._bindGlobals();
        this.triggerCompile();
    }
    
    showToast(message) {
        if (!this.ui.toast) return;
        this.ui.toast.textContent = message;
        this.ui.toast.classList.add('show');
        setTimeout(() => this.ui.toast.classList.remove('show'), 3000);
    }

    _bindGlobals() {
        // 1. Existing Theme Toggle
        if (this.ui.btnTheme) {
            this.ui.btnTheme.addEventListener('click', () => {
                const html = document.documentElement;
                const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                html.setAttribute('data-theme', next);
                
                const icon = this.ui.btnTheme.querySelector('i');
                if (icon) {
                    icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
                }
            });
        }

        // 2. Existing View Switcher (Mobile/Tablet Tabs)
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                viewBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.body.className = `mode-${e.currentTarget.getAttribute('data-view')}`;
            });
        });

        // 3. NEW: Load File (.zl / .txt)
        const btnLoad = document.getElementById('btn-load');
        const fileInput = document.getElementById('file-input');
        if (btnLoad && fileInput) {
            btnLoad.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.editor.setValue(ev.target.result);
                    this.showToast('File loaded successfully');
                };
                reader.readAsText(file);
                fileInput.value = ''; // Reset input so same file can be loaded again
            });
        }

        // 4. NEW: Save Workspace as .zl file
        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const text = this.editor.getValue();
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'workspace.zl';
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('Workspace saved locally');
            });
        }

        // 5. NEW: Export Canvas as SVG
        const btnExport = document.getElementById('btn-export');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const svgNode = document.getElementById('zolto-svg-layer');
                if (!svgNode) return;
                
                // Serialize the SVG DOM node to a string
                const svgData = new XMLSerializer().serializeToString(svgNode);
                
                // Add XML namespace if missing (required for standalone SVGs)
                const finalSvg = svgData.includes('xmlns="http://www.w3.org/2000/svg"') 
                    ? svgData 
                    : svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

                const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'zolto-diagram.svg';
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('SVG Exported Successfully');
            });
        }

        // 6. Existing Undo/Redo Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                const state = e.shiftKey ? this.history.redo() : this.history.undo();
                if (state !== null) {
                    this.editor.setValue(state);
                    this.showToast(e.shiftKey ? 'Redo applied' : 'Undo applied');
                }
            }
        });
    }

    triggerCompile() {
        if (this.isCompiling) return;
        this.isCompiling = true;
        requestAnimationFrame(() => {
            try {
                const source = this.editor ? this.editor.getValue() : '';
                const ast = ZoltoCompiler.parse(source);
                
                // Hotfix interpolation injections safely prior to rendering execution definitions
                if (ast && Array.isArray(ast.nodes)) {
                    ast.nodes.forEach(node => {
                        if (node.type === 'CodeBlock' && !node.language) node.language = node.lang;
                        if (node.type === 'Chart' && !node.dataset) node.dataset = node.data;
                    });
                }

                if (window.ZoltoRenderer && this.ui.canvasContent) {
                    this.ui.canvasContent.innerHTML = window.ZoltoRenderer.render(ast);
                }
                if (window.SVGRouter && this.ui.svgPaths) {
                    // Force DOM paint recalculation so bounding client metrics evaluate accurately
                    setTimeout(() => {
                        this.ui.svgPaths.innerHTML = window.SVGRouter.routeEdges(ast.edges, document.getElementById('preview-container'));
                    }, 50);
                }
            } catch (err) {
                ZoltoLogger.error('Compiler', 'Pipeline Failure:', err);
            } finally {
                this.isCompiling = false;
            }
        });
    }
}

// Safely boot the app whether the DOM is already loaded or still loading
const initApp = () => { window.App = new ZoltoStudio(); };

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
