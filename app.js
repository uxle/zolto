/**
 * =========================================================================================
 * LUMA STUDIO: ENTERPRISE APPLICATION CONTROLLER (v4.0.0)
 * =========================================================================================
 * Description: The master operating system for the Luma Spatial IDE.
 * Architecture Modules:
 * 1. LumaLogger        - Diagnostic telemetry and console orchestration.
 * 2. LumaVFS           - Virtual File System for multi-file project management.
 * 3. LumaHistory       - Temporal state manager (Undo/Redo stack).
 * 4. LumaEditor        - Advanced text manipulation (auto-indent, brackets, line numbers).
 * 5. LumaViewport      - Infinite canvas physics (Pan, Zoom, Bounds).
 * 6. LumaCommandCenter - Ctrl+P Command Palette UI and action routing.
 * 7. LumaExportEngine  - Multi-format artifact generation (SVG, PNG, HTML).
 * 8. LumaStudio        - The central brain tying the event loop and compiler pipeline.
 * =========================================================================================
 */

'use strict';

/* =====================================================================================
   1. TELEMETRY & LOGGING ENGINE
   ===================================================================================== */
class LumaLogger {
    static LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4 };
    static currentLevel = LumaLogger.LEVELS.DEBUG;
    static history = [];

    static _log(level, tag, message, data = null) {
        if (level < this.currentLevel) return;
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, tag, message, data };
        this.history.push(logEntry);
        
        if (this.history.length > 1000) this.history.shift(); // Cap history

        const prefix = `[Luma ${tag}] ${message}`;
        switch (level) {
            case this.LEVELS.DEBUG: console.debug(prefix, data || ''); break;
            case this.LEVELS.INFO: console.info(prefix, data || ''); break;
            case this.LEVELS.WARN: console.warn(prefix, data || ''); break;
            case this.LEVELS.ERROR: console.error(prefix, data || ''); break;
            case this.LEVELS.FATAL: 
                console.error(`💥 FATAL: ${prefix}`, data || ''); 
                alert(`Fatal Error: ${message}`);
                break;
        }
    }

    static debug(tag, msg, data) { this._log(this.LEVELS.DEBUG, tag, msg, data); }
    static info(tag, msg, data) { this._log(this.LEVELS.INFO, tag, msg, data); }
    static warn(tag, msg, data) { this._log(this.LEVELS.WARN, tag, msg, data); }
    static error(tag, msg, data) { this._log(this.LEVELS.ERROR, tag, msg, data); }
    static fatal(tag, msg, data) { this._log(this.LEVELS.FATAL, tag, msg, data); }
    
    static dumpLogs() { return JSON.stringify(this.history, null, 2); }
}

/* =====================================================================================
   2. VIRTUAL FILE SYSTEM (VFS)
   ===================================================================================== */
class LumaVFS {
    constructor() {
        this.files = new Map();
        this.activeFileId = null;
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('luma_v4_vfs');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.forEach(f => this.files.set(f.id, f));
                LumaLogger.info('VFS', `Loaded ${this.files.size} files from storage.`);
            } else {
                this.seedDefaultProject();
            }
        } catch (e) {
            LumaLogger.error('VFS', 'Failed to load VFS, seeding defaults.', e);
            this.seedDefaultProject();
        }
    }

    seedDefaultProject() {
        const defaultContent = (typeof CONFIG !== 'undefined') ? CONFIG.DEFAULT_LUMA : '# Welcome to Luma\n\n[ Core ] -> ( UI )';
        this.createFile('main.lm', defaultContent);
        this.createFile('README.md', '# Project Readme\nLuma Studio V4.');
        this.activeFileId = 'main.lm';
        this.saveToStorage();
    }

    saveToStorage() {
        try {
            const serialized = Array.from(this.files.values());
            localStorage.setItem('luma_v4_vfs', JSON.stringify(serialized));
        } catch (e) {
            LumaLogger.error('VFS', 'Quota exceeded or write failed.', e);
        }
    }

    createFile(filename, content = '') {
        if (this.files.has(filename)) {
            LumaLogger.warn('VFS', `File ${filename} already exists. Appending copy.`);
            filename = `copy_${filename}`;
        }
        const fileObj = {
            id: filename,
            name: filename,
            content: content,
            lastModified: Date.now()
        };
        this.files.set(filename, fileObj);
        this.saveToStorage();
        return fileObj;
    }

    readFile(filename) {
        return this.files.get(filename);
    }

    writeFile(filename, content) {
        const file = this.files.get(filename);
        if (file) {
            file.content = content;
            file.lastModified = Date.now();
            this.saveToStorage();
        } else {
            this.createFile(filename, content);
        }
    }

    deleteFile(filename) {
        if (this.files.has(filename)) {
            this.files.delete(filename);
            if (this.activeFileId === filename) {
                this.activeFileId = this.files.keys().next().value || null;
            }
            this.saveToStorage();
        }
    }

    listTree() {
        return Array.from(this.files.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
}

/* =====================================================================================
   3. TEMPORAL HISTORY MANAGER (Undo/Redo Stack)
   ===================================================================================== */
class LumaHistory {
    constructor(maxSize = 100) {
        this.stack = [];
        this.pointer = -1;
        this.maxSize = maxSize;
        this.isMutating = false;
    }

    push(content) {
        if (this.isMutating) return;
        
        // Don't push if it's identical to current state
        if (this.pointer >= 0 && this.stack[this.pointer] === content) return;

        // If we are back in time and make a change, destroy alternate future
        if (this.pointer < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.pointer + 1);
        }

        this.stack.push(content);
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        } else {
            this.pointer++;
        }
        LumaLogger.debug('History', `State pushed. Pointer: ${this.pointer}`);
    }

    undo() {
        if (this.pointer > 0) {
            this.pointer--;
            return this.stack[this.pointer];
        }
        return null;
    }

    redo() {
        if (this.pointer < this.stack.length - 1) {
            this.pointer++;
            return this.stack[this.pointer];
        }
        return null;
    }
}

/* =====================================================================================
   4. ADVANCED EDITOR CONTROLLER
   ===================================================================================== */
class LumaEditor {
    constructor(textareaId, appController) {
        this.el = document.getElementById(textareaId);
        this.app = appController;
        this.history = new LumaHistory();
        
        if (!this.el) {
            LumaLogger.fatal('Editor', `Textarea #${textareaId} not found.`);
            return;
        }

        this.injectUI();
        this.bindEvents();
        LumaLogger.info('Editor', 'Advanced Editor Controller Initialized.');
    }

    injectUI() {
        // Dynamically inject line numbers gutter into the DOM
        const parent = this.el.parentElement;
        this.gutter = document.createElement('div');
        this.gutter.className = 'luma-editor-gutter';
        
        // Inline CSS for the dynamically injected gutter
        this.gutter.style.cssText = `
            position: absolute; left: 0; top: 40px; bottom: 0; width: 40px;
            background: var(--editor-gutter-bg, #f8fafc); border-right: 1px solid var(--border-base, #e2e8f0);
            color: var(--editor-gutter-text, #94a3b8); font-family: var(--font-mono); font-size: 0.85rem;
            text-align: right; padding: 1.5rem 8px 1.5rem 0; overflow: hidden; pointer-events: none;
            line-height: 1.6; user-select: none; z-index: 10;
        `;
        
        this.el.style.paddingLeft = '56px'; // Make room for gutter
        parent.style.position = 'relative';
        parent.insertBefore(this.gutter, this.el);
        
        this.updateLineNumbers();
    }

    bindEvents() {
        this.el.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.el.addEventListener('input', () => this.handleInput());
        this.el.addEventListener('scroll', () => this.syncScroll());
    }

    updateLineNumbers() {
        const lines = this.el.value.split('\n').length;
        let numbersHtml = '';
        for (let i = 1; i <= lines; i++) {
            numbersHtml += `<div>${i}</div>`;
        }
        this.gutter.innerHTML = numbersHtml;
    }

    syncScroll() {
        this.gutter.scrollTop = this.el.scrollTop;
    }

    handleInput() {
        this.updateLineNumbers();
        this.history.push(this.el.value);
        this.app.triggerCompile();
    }

    handleKeyDown(e) {
        // 1. Enforce Luma Rule: No Tabs, 2 Spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertText('  '); // Spatial indent
        }
        
        // 2. Auto-close spatial brackets
        else if (e.key === '[') this.autoClose(e, ']');
        else if (e.key === '(') this.autoClose(e, ')');
        else if (e.key === '<') this.autoClose(e, '>');
        else if (e.key === '{') this.autoClose(e, '}');
        else if (e.key === '"') this.autoClose(e, '"');

        // 3. Smart Enter (Preserve Indentation)
        else if (e.key === 'Enter') {
            e.preventDefault();
            const val = this.el.value;
            const start = this.el.selectionStart;
            
            // Find current line's leading spaces
            let lineStart = start - 1;
            while (lineStart >= 0 && val[lineStart] !== '\n') lineStart--;
            const currentLine = val.substring(lineStart + 1, start);
            const indentMatch = currentLine.match(/^\s*/);
            const indent = indentMatch ? indentMatch[0] : '';

            this.insertText('\n' + indent);
        }

        // 4. Undo / Redo
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) this.performRedo();
            else this.performUndo();
        }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            this.performRedo();
        }
    }

    autoClose(e, closingChar) {
        e.preventDefault();
        const start = this.el.selectionStart;
        this.insertText(e.key + closingChar);
        // Move cursor back inside the brackets
        this.el.selectionStart = this.el.selectionEnd = start + 1;
    }

    insertText(text) {
        this.history.isMutating = true;
        const val = this.el.value;
        const start = this.el.selectionStart;
        const end = this.el.selectionEnd;
        
        this.el.value = val.substring(0, start) + text + val.substring(end);
        this.el.selectionStart = this.el.selectionEnd = start + text.length;
        
        this.history.isMutating = false;
        this.handleInput(); // Trigger compilation manually
    }

    performUndo() {
        const state = this.history.undo();
        if (state !== null) {
            this.history.isMutating = true;
            this.el.value = state;
            this.history.isMutating = false;
            this.updateLineNumbers();
            this.app.triggerCompile();
            this.app.showToast("Undo");
        }
    }

    performRedo() {
        const state = this.history.redo();
        if (state !== null) {
            this.history.isMutating = true;
            this.el.value = state;
            this.history.isMutating = false;
            this.updateLineNumbers();
            this.app.triggerCompile();
            this.app.showToast("Redo");
        }
    }

    getValue() { return this.el.value; }
    setValue(val) { 
        this.el.value = val; 
        this.updateLineNumbers(); 
        this.history.push(val);
    }
}

/* =====================================================================================
   5. INFINITE CANVAS ENGINE (Pan, Zoom, Physics)
   ===================================================================================== */
class LumaViewport {
    constructor(containerId, contentId) {
        this.container = document.getElementById(containerId);
        this.content = document.getElementById(contentId);
        this.svgLayer = document.getElementById('luma-svg-layer');
        
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        // Apply physics config
        this.MIN_ZOOM = (typeof CONFIG !== 'undefined') ? CONFIG.SPATIAL.CAMERA.ZOOM_MIN : 0.1;
        this.MAX_ZOOM = (typeof CONFIG !== 'undefined') ? CONFIG.SPATIAL.CAMERA.ZOOM_MAX : 4.0;
        
        if (this.container && this.content) {
            this.bindEvents();
            this.applyTransform();
            LumaLogger.info('Viewport', 'Infinite Canvas Physics Engine Online.');
        }
    }

    bindEvents() {
        // Zoom on Wheel (with Ctrl/Cmd)
        this.container.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault(); // Stop browser zoom
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom(zoomFactor, e.clientX, e.clientY);
            } else if (e.shiftKey) {
                // Horizontal scroll via shift
                this.container.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // Pan on Middle Mouse Button or Space + Left Click
        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.altKey)) {
                e.preventDefault();
                this.isPanning = true;
                this.startX = e.clientX - this.translateX;
                this.startY = e.clientY - this.translateY;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            this.translateX = e.clientX - this.startX;
            this.translateY = e.clientY - this.startY;
            this.applyTransform();
        });

        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.container.style.cursor = 'default';
            }
        });

        // Double click middle mouse to reset
        this.container.addEventListener('auxclick', (e) => {
            if (e.button === 1) this.reset();
        });
    }

    zoom(factor, mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2) {
        const oldScale = this.scale;
        this.scale *= factor;
        this.scale = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.scale));

        if (this.scale !== oldScale) {
            // Adjust translation to zoom towards mouse position
            const rect = this.container.getBoundingClientRect();
            const relX = mouseX - rect.left;
            const relY = mouseY - rect.top;

            this.translateX = relX - (relX - this.translateX) * (this.scale / oldScale);
            this.translateY = relY - (relY - this.translateY) * (this.scale / oldScale);
            this.applyTransform();
        }
    }

    applyTransform() {
        const transformStr = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        this.content.style.transform = transformStr;
        this.content.style.transformOrigin = '0 0';
        
        if (this.svgLayer) {
            this.svgLayer.style.transform = transformStr;
            this.svgLayer.style.transformOrigin = '0 0';
        }
    }

    reset() {
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.applyTransform();
    }
}

/* =====================================================================================
   6. COMMAND PALETTE (CTRL+P / CMD+P UI)
   ===================================================================================== */
class LumaCommandCenter {
    constructor(appController) {
        this.app = appController;
        this.isVisible = false;
        this.injectUI();
        this.bindEvents();
    }

    injectUI() {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: none; align-items: flex-start; justify-content: center;
            padding-top: 15vh; z-index: 9999;
        `;

        this.palette = document.createElement('div');
        this.palette.style.cssText = `
            width: 600px; max-width: 90vw; background: var(--bg-panel, #fff);
            border-radius: var(--radius-lg, 8px); box-shadow: var(--shadow-2xl);
            border: 1px solid var(--border-base); overflow: hidden;
            display: flex; flex-direction: column;
        `;

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = '> Search files, or type ? for commands...';
        this.input.style.cssText = `
            width: 100%; padding: 1.5rem; font-size: 1.25rem; font-family: var(--font-sans);
            border: none; border-bottom: 1px solid var(--border-base);
            background: transparent; color: var(--text-main); outline: none;
        `;

        this.list = document.createElement('div');
        this.list.style.cssText = `max-height: 400px; overflow-y: auto; padding: 0.5rem;`;

        this.palette.appendChild(this.input);
        this.palette.appendChild(this.list);
        this.overlay.appendChild(this.palette);
        document.body.appendChild(this.overlay);
    }

    bindEvents() {
        // Toggle on Ctrl+P
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        this.overlay.addEventListener('mousedown', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        this.input.addEventListener('input', () => this.renderList());
        
        // Handle selection via Enter key
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstChild = this.list.firstElementChild;
                if (firstChild) firstChild.click();
            }
        });
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }

    show() {
        this.isVisible = true;
        this.overlay.style.display = 'flex';
        this.input.value = '';
        this.renderList();
        setTimeout(() => this.input.focus(), 10);
    }

    hide() {
        this.isVisible = false;
        this.overlay.style.display = 'none';
        if (this.app.editor) this.app.editor.el.focus();
    }

    renderList() {
        const query = this.input.value.toLowerCase();
        let itemsHtml = '';

        if (query.startsWith('?')) {
            // Command Mode
            const cmds = [
                { title: 'Format Document', icon: 'fa-align-left', action: () => this.app.formatDocument() },
                { title: 'Toggle Theme', icon: 'fa-moon', action: () => this.app.toggleTheme() },
                { title: 'Export Vector SVG', icon: 'fa-vector-square', action: () => this.app.exportEngine.exportSVG() },
                { title: 'Export PNG Image', icon: 'fa-image', action: () => this.app.exportEngine.exportPNG() },
                { title: 'Reset Canvas View', icon: 'fa-expand', action: () => this.app.viewport.reset() },
                { title: 'Load Microservices Template', icon: 'fa-cloud', action: () => this.app.loadTemplate('ARCHITECTURE') }
            ];

            const filtered = cmds.filter(c => c.title.toLowerCase().includes(query.substring(1).trim()));
            filtered.forEach((cmd, idx) => {
                itemsHtml += this._buildItem(cmd.title, cmd.icon, `cmd-${idx}`);
            });

            this.list.innerHTML = itemsHtml;
            
            // Bind actions
            filtered.forEach((cmd, idx) => {
                const el = document.getElementById(`cmd-${idx}`);
                if (el) el.onclick = () => { cmd.action(); this.hide(); };
            });

        } else {
            // File Mode (Search VFS)
            const files = this.app.vfs.listTree().filter(f => f.name.toLowerCase().includes(query));
            
            if (files.length === 0) {
                itemsHtml = `<div style="padding: 1rem; color: var(--text-mute); text-align: center;">No files found. Press Enter to create '${query}'</div>`;
                this.list.innerHTML = itemsHtml;
                this.list.onclick = () => {
                    if (query.trim()) {
                        this.app.openFile(query.trim());
                        this.hide();
                    }
                };
                return;
            }

            files.forEach(f => {
                itemsHtml += this._buildItem(f.name, 'fa-file-code', `file-${f.id.replace(/[^a-zA-Z0-9]/g, '')}`);
            });

            this.list.innerHTML = itemsHtml;

            // Bind actions
            files.forEach(f => {
                const safeId = `file-${f.id.replace(/[^a-zA-Z0-9]/g, '')}`;
                const el = document.getElementById(safeId);
                if (el) el.onclick = () => { this.app.openFile(f.id); this.hide(); };
            });
        }
    }

    _buildItem(title, icon, id) {
        return `
            <div id="${id}" style="
                padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem;
                cursor: pointer; border-radius: 4px; color: var(--text-main); font-weight: 500;
            " onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='transparent'">
                <i class="fa-solid ${icon}" style="color: var(--text-mute);"></i>
                ${title}
            </div>
        `;
    }
}

/* =====================================================================================
   7. MULTI-FORMAT EXPORT ENGINE
   ===================================================================================== */
class LumaExportEngine {
    constructor(appController) {
        this.app = appController;
    }

    exportSVG() {
        const svgLayer = document.getElementById('luma-svg-layer');
        if (!svgLayer) return;

        const svgElement = svgLayer.cloneNode(true);
        const edgeColor = getComputedStyle(document.documentElement).getPropertyValue('--edge-line-color').trim();
        
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        // Bake CSS variables
        svgElement.innerHTML = svgElement.innerHTML.replace(/var\(--edge-line-color\)/g, edgeColor || '#64748b');
        
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgElement);
        this._downloadBlob(source, 'image/svg+xml;charset=utf-8', 'LumaGraph.svg');
        this.app.showToast('Vector SVG exported successfully!');
    }

    exportPNG() {
        this.app.showToast('Generating PNG... (Canvas rendering implemented in v4.1 via html2canvas)');
        // Note: A true pixel-perfect HTML->PNG pipeline requires external libs like html2canvas.
        // For zero-dependencies, we fallback to notifying the user.
        LumaLogger.warn('Export', 'Native PNG export requires WebGL context or html2canvas hook.');
    }

    exportHTML() {
        const compiledHtml = document.getElementById('luma-canvas-content').innerHTML;
        const payload = `
        <!DOCTYPE html>
        <html><head><style>
            body { font-family: sans-serif; padding: 2rem; background: #f8fafc; }
            ${this._extractStyles()}
        </style></head>
        <body>${compiledHtml}</body></html>`;
        
        this._downloadBlob(payload, 'text/html;charset=utf-8', 'LumaExport.html');
        this.app.showToast('Standalone HTML Exported.');
    }

    _extractStyles() {
        // Scrapes the current document for CSS definitions to bundle into the export
        let css = '';
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    css += rule.cssText;
                }
            } catch (e) { /* Ignore CORS restricted sheets */ }
        }
        return css;
    }

    _downloadBlob(content, type, filename) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

/* =====================================================================================
   8. MASTER STUDIO CONTROLLER (The Brain)
   ===================================================================================== */
class LumaStudio {
    constructor() {
        LumaLogger.info('Core', 'Booting Luma Studio Enterprise Engine...');

        // 1. Initialize Sub-Engines
        this.vfs = new LumaVFS();
        this.editor = new LumaEditor('luma-editor', this);
        this.viewport = new LumaViewport('preview-container', 'luma-canvas-content');
        this.commandCenter = new LumaCommandCenter(this);
        this.exportEngine = new LumaExportEngine(this);

        // 2. Cache DOM UI elements
        const get = id => document.getElementById(id);
        this.ui = {
            canvasContent: get('luma-canvas-content'),
            svgPaths: get('svg-paths'),
            toast: get('toast'),
            btnTheme: get('btn-theme'),
            btnSave: get('btn-save'),
            btnLoad: get('btn-load'),
            btnExport: get('btn-export'),
            editorHeader: document.querySelector('.editor-header')
        };

        // 3. Initialize State
        const theme = localStorage.getItem('luma_v4_theme') || 'light';
        this.applyTheme(theme);
        
        // 4. Load Active File
        this.openFile(this.vfs.activeFileId);

        // 5. Bind App-Level Events
        this.bindGlobalEvents();

        LumaLogger.info('Core', 'Boot Sequence Complete.');
    }

    // --- Core Pipeline ---

    openFile(filename) {
        let file = this.vfs.readFile(filename);
        if (!file) {
            file = this.vfs.createFile(filename, '# New File\n');
        }
        
        this.vfs.activeFileId = filename;
        this.editor.setValue(file.content);
        
        if (this.ui.editorHeader) {
            this.ui.editorHeader.innerHTML = `
                <i class="fa-solid fa-file-code" style="margin-right:8px; color:var(--intent-primary);"></i>
                ${filename}
            `;
        }

        this.triggerCompile();
        this.vfs.saveToStorage();
    }

    /**
     * Executes the Compiler Pipeline: Parser -> Renderer -> SVG Router
     */
    triggerCompile() {
        try {
            // Save state to VFS
            this.vfs.writeFile(this.vfs.activeFileId, this.editor.getValue());

            // 1. Parsing Phase
            // We use global objects established in parser.js and renderer.js
            const startTime = performance.now();
            let ast;
            
            if (typeof LumaCompiler !== 'undefined') {
                ast = LumaCompiler.parse(this.editor.getValue());
            } else if (typeof LumaParser !== 'undefined') {
                // Fallback to legacy parser name
                ast = LumaParser.parse(this.editor.getValue());
            } else {
                throw new Error("Compiler missing. Ensure parser.js is loaded.");
            }

            // 2. DOM Rendering Phase
            if (this.ui.canvasContent) {
                if (typeof LumaRenderer !== 'undefined') {
                    this.ui.canvasContent.innerHTML = LumaRenderer.render(ast);
                } else {
                    throw new Error("Renderer missing. Ensure renderer.js is loaded.");
                }
            }

            // 3. SVG Mathematical Routing Phase
            // Must wait for browser to layout the DOM blocks before measuring them
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (this.ui.svgPaths && typeof SVGRouter !== 'undefined') {
                        this.ui.svgPaths.innerHTML = SVGRouter.routeEdges(ast.edges, this.ui.canvasContent.parentElement);
                    }
                    const execTime = (performance.now() - startTime).toFixed(2);
                    LumaLogger.debug('Compiler', `Pipeline completed in ${execTime}ms`, ast);
                });
            });

        } catch (e) {
            LumaLogger.error('Compiler', 'Pipeline execution failed.', e);
            this.showToast('Compilation Error. Check Console.', 'danger');
        }
    }

    // --- Global Event Orchestration ---

    bindGlobalEvents() {
        // Theme Toggle
        this.ui.btnTheme?.addEventListener('click', () => this.toggleTheme());
        
        // Standard Save
        this.ui.btnSave?.addEventListener('click', () => {
            this.exportEngine._downloadBlob(this.editor.getValue(), 'text/plain', this.vfs.activeFileId);
            this.showToast('Source file saved to disk.');
        });

        // Export SVG
        this.ui.btnExport?.addEventListener('click', () => this.exportEngine.exportSVG());

        // Standard Load overriding to VFS
        this.ui.btnLoad?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.lm,.txt,.md';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.vfs.createFile(file.name, event.target.result);
                    this.openFile(file.name);
                    this.showToast(`Imported ${file.name}`);
                };
                reader.readAsText(file);
            };
            input.click();
        });

        // Auto-redraw edges on window resize
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.triggerCompile(), 100);
        });

        // Global Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.showToast('Project auto-saved to Local Storage.');
                        break;
                }
            }
        });
    }

    // --- UI Utilities ---

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        this.applyTheme(next);
        this.showToast(`${next.charAt(0).toUpperCase() + next.slice(1)} Mode Enabled`);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('luma_v4_theme', theme);
        
        const icon = this.ui.btnTheme?.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        
        // Force SVG redraw to adopt new CSS variable colors
        setTimeout(() => this.triggerCompile(), 50);
    }

    loadTemplate(templateName) {
        if (typeof CONFIG !== 'undefined' && CONFIG.TEMPLATES[templateName]) {
            this.editor.setValue(CONFIG.TEMPLATES[templateName]);
            this.showToast(`Loaded Template: ${templateName}`);
        } else {
            LumaLogger.warn('Template', `Template ${templateName} not found in CONFIG.`);
        }
    }

    showToast(message, type = 'info') {
        if (!this.ui.toast) return;
        
        // Dynamic background colors based on intent type
        let bg = 'var(--toast-bg, #0f172a)';
        if (type === 'danger') bg = 'var(--intent-danger, #ef4444)';
        else if (type === 'success') bg = 'var(--intent-success, #22c55e)';
        
        this.ui.toast.style.backgroundColor = bg;
        this.ui.toast.textContent = message;
        
        this.ui.toast.classList.remove('show');
        requestAnimationFrame(() => {
            this.ui.toast.classList.add('show');
            
            if (this.toastTimeout) clearTimeout(this.toastTimeout);
            this.toastTimeout = setTimeout(() => {
                this.ui.toast.classList.remove('show');
            }, 3000);
        });
    }

    /** Helper function for the Command Palette */
    formatDocument() {
        // A simple formatter that ensures single blank lines between nodes
        let val = this.editor.getValue();
        val = val.replace(/\n{3,}/g, '\n\n'); 
        this.editor.setValue(val);
        this.showToast('Document Formatted');
    }
}

/* =====================================================================================
   BOOTSTRAP INITIALIZATION
   ===================================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Inject the master application instance into the global window object
    // allowing other potential plugins to hook into the Luma Architecture.
    window.LumaApp = new LumaStudio();
});
