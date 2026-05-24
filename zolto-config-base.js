/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE CONFIGURATION BASE (Module 2 of 7)
 * =========================================================================================
 * Architecture: Minimal aesthetics, zero hardcoded magic numbers, Apple-level UI/UX polish.
 * Description: The single source of truth for the Zolto Spatial IDE base environment.
 * Maps environment variables, storage schemas, timing matrices, spatial engine physics,
 * and language grammar regex definitions.
 * =========================================================================================
 */

'use strict';

const ZOLTO_CONFIG_BASE = (function () {

    /* =====================================================================================
       1. SYSTEM & ENVIRONMENT METADATA
       ===================================================================================== */
    const SYSTEM = Object.freeze({
        APP_NAME: 'Zolto Studio Enterprise',
        APP_VERSION: '5.0.0-infinity',
        BUILD_ENVIRONMENT: 'production',
        BUILD_DATE: new Date().toISOString().split('T')[0],
        AUTHOR: 'Zolto Systems Engineering',
        ENGINE_CODENAME: 'Supernova',
        IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        SUPPORTED_FEATURES: {
            LOCAL_STORAGE: typeof Storage !== 'undefined',
            FILE_API: typeof FileReader !== 'undefined',
            WORKERS: typeof Worker !== 'undefined',
            NATIVE_PRINT: typeof window.print === 'function',
            WEBGL: (function() { try { return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl'); } catch(e) { return false; } })()
        },
        LINKS: {
            DOCUMENTATION: 'https://docs.zolto-lang.org',
            GITHUB_REPO: 'https://github.com/zolto-lang/zolto-studio',
            ISSUE_TRACKER: 'https://github.com/zolto-lang/zolto-studio/issues',
            COMMUNITY: 'https://discord.gg/zolto-lang'
        }
    });

    /* =====================================================================================
       2. STORAGE SCHEMA & NAMESPACES
       ===================================================================================== */
    const STORAGE = Object.freeze({
        PREFIX: 'zolto_v5_',
        KEYS: {
            WORKSPACE_CONTENT: 'zolto_v5_workspace_content',
            THEME_PREFERENCE: 'zolto_v5_theme_pref',
            EDITOR_SETTINGS: 'zolto_v5_editor_settings',
            CANVAS_TRANSFORM: 'zolto_v5_canvas_pan_zoom',
            RECENT_FILES: 'zolto_v5_recent_files',
            UI_LAYOUT_STATE: 'zolto_v5_ui_layout_panels',
            MACROS: 'zolto_v5_custom_macros',
            SNIPPETS: 'zolto_v5_user_snippets'
        },
        LIMITS: {
            MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15MB limit for local text parsing
            MAX_RECENT_FILES: 25,
            AUTO_SAVE_INTERVAL_MS: 15000,          // Background auto-save flush
            HISTORY_STACK_SIZE: 500                // Number of undo/redo steps
        },
        DEFAULTS: {
            THEME: 'dark',
            EDITOR_FONT_SIZE: 14,
            EDITOR_WORD_WRAP: true,
            SHOW_MINIMAP: true,
            AUTO_FORMAT_ON_SAVE: true,
            RENDER_PREVIEW_LIVE: true
        }
    });

    /* =====================================================================================
       3. TIMING & EVENT MATRIX (in Milliseconds)
       ===================================================================================== */
    const TIMING = Object.freeze({
        // Editor Interaction
        DEBOUNCE_TYPING: 120,           // AST Parse delay after keystroke
        DEBOUNCE_SEARCH: 250,           // File search/filter delay
        THROTTLE_SCROLL: 16,            // ~60fps sync scrolling
        
        // Window & Layout
        THROTTLE_RESIZE: 50,            // Debounce canvas recalculation on resize
        LAYOUT_SHIFT_DELAY: 50,         // Wait for CSS transitions before SVG math
        
        // Animations & Feedback
        TOAST_DURATION_SHORT: 2000,
        TOAST_DURATION_NORMAL: 3500,
        TOAST_DURATION_LONG: 6000,
        TOOLTIP_DELAY: 400,             
        MODAL_TRANSITION_IN: 250,
        MODAL_TRANSITION_OUT: 200,
        
        // Network & Background Tasks
        API_TIMEOUT: 15000,
        WORKER_IDLE_TIMEOUT: 60000,
        GARBAGE_COLLECTION_INTERVAL: 120000 
    });

    /* =====================================================================================
       4. SPATIAL ENGINE & PHYSICS CONSTANTS
       ===================================================================================== */
    const SPATIAL = Object.freeze({
        INDENT_REM: 2.5,                
        CANVAS_PADDING_REM: 4,          
        LINE_HEIGHT_REM: 1.6,           
        BASE_FONT_SIZE_PX: 16,
        
        ROUTING: {
            EDGE_PADDING: 10,               
            BEZIER_CONTROL_MIN: 50,         
            BEZIER_CONTROL_MULTIPLIER: 0.5, 
            ARROWHEAD_WIDTH: 12,
            ARROWHEAD_HEIGHT: 8,
            STROKE_WIDTH_NORMAL: 2,
            STROKE_WIDTH_THICK: 4,
            DASH_ARRAY_ASYNC: '6, 6',
            INTERSECTION_JUMP_RADIUS: 8
        },
        
        PHYSICS: {
            SPRING_STIFFNESS: 0.18,
            SPRING_DAMPING: 0.85,
            SNAP_GRID_SIZE: 24,         
            SNAP_THRESHOLD: 12,         
            DRAG_FRICTION: 0.90,
            MAX_VELOCITY: 60,
            INERTIA_DECAY: 0.95
        },
        
        CAMERA: {
            ZOOM_MIN: 0.05,
            ZOOM_MAX: 5.0,
            ZOOM_STEP: 0.1,
            PAN_SPEED_MOUSE: 1.2,
            PAN_SPEED_TOUCH: 2.0,
            WHEEL_SENSITIVITY: 0.001
        }
    });

    /* =====================================================================================
       5. ADVANCED CHARTING DEFAULTS 
       ===================================================================================== */
    const CHART_CONFIG = Object.freeze({
        GLOBAL: {
            WIDTH_DEFAULT: 600,
            HEIGHT_DEFAULT: 400,
            PADDING: 40,
            FONT_FAMILY: 'var(--font-sans)',
            TITLE_SIZE: 18,
            LABEL_SIZE: 12,
            ANIMATION_DURATION_MS: 800,
            EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
        },
        PALETTES: {
            DEFAULT: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899'],
            MONOCHROME: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
            PASTEL: ['#bfdbfe', '#bbf7d0', '#fde68a', '#fecaca', '#bae6fd', '#ddd6fe', '#fbcfe8']
        },
        BAR: { GAP_RATIO: 0.2, CORNER_RADIUS: 4, SHOW_VALUES: true },
        PIE: { DONUT_RATIO: 0.5, MIN_ANGLE_FOR_LABEL_RAD: 0.15, EXPLODE_HOVER_OFFSET: 10 },
        LINE: { CURVE_TENSION: 0.3, POINT_RADIUS: 5, SHOW_AREA: true, AREA_OPACITY: 0.15 },
        SEQUENCE: { ACTOR_WIDTH: 120, ACTOR_HEIGHT: 40, MESSAGE_SPACING: 50, LIFELINE_DASH: '5,5' },
        GANTT: { ROW_HEIGHT: 30, BAR_HEIGHT: 20, GRID_COLOR: 'rgba(128, 128, 128, 0.2)', TODAY_MARKER_COLOR: '#ef4444' }
    });

    /* =====================================================================================
       6. MATHEMATICAL ENGINE CONSTANTS
       ===================================================================================== */
    const MATH_CONFIG = Object.freeze({
        SYMBOLS: {
            '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
            '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
            '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
            '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
            '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
            '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
            '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
            '\\times': '×', '\\cdot': '⋅', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
            '\\ast': '∗', '\\star': '⋆', '\\circ': '∘', '\\bullet': '∙',
            '\\neq': '≠', '\\leq': '≤', '\\geq': '≥', '\\equiv': '≡', '\\approx': '≈',
            '\\sim': '∼', '\\cong': '≅', '\\propto': '∝',
            '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
            '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\forall': '∀', '\\exists': '∃',
            '\\lor': '∨', '\\land': '∧', '\\neg': '¬', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔',
            '\\int': '∫', '\\iint': '∬', '\\oint': '∮', '\\partial': '∂', '\\nabla': '∇',
            '\\infty': '∞', '\\sum': '∑', '\\prod': '∏', '\\lim': 'lim',
            '\\rightarrow': '→', '\\leftarrow': '←', '\\uparrow': '↑', '\\downarrow': '↓',
            '\\leftrightarrow': '↔', '\\mapsto': '↦'
        },
        MACROS: { 'R': 'ℝ', 'N': 'ℕ', 'Z': 'ℤ', 'Q': 'ℚ', 'C': 'ℂ' }
    });

    /* =====================================================================================
       7. ZOLTO LANGUAGE GRAMMAR SPECIFICATION (REGEX DICTIONARY)
       ===================================================================================== */
    const GRAMMAR = Object.freeze({
        INDENTATION: /^ */,
        COMMENT_LINE: /^\/\/.*/,
        COMMENT_BLOCK_START: /^\/\*/,
        COMMENT_BLOCK_END: /\*\//,
        NODE_DECLARATION: /^(\[|\(|\<|\{|\(\()(.*?)(\]|\)|\>|\}|\)\))(.*)/,
        TRAIT_MATCH: /\+([a-zA-Z0-9-]+)/g,
        EDGE_MATCH: /(->|=>|~>|<->|\.\.>)\s*(\[|\(|\<|\{)?(.*?)(\]|\)|\>|\})?$/,
        STANDALONE_EDGE_MATCH: /^(->|=>|~>|<->|\.\.>)\s*(\[|\(|\<|\{)?(.*?)(\]|\)|\>|\})?(.*)/,
        TREE_BRANCH: /^\/\s+(.*)/,
        TREE_LEAF: /^-\s+(.*)/,
        TABLE_ROW: /^\|(.+)\|$/,
        TABLE_DIVIDER: /^\|(?:[:\s-]+\|)+$/,
        CHART_BLOCK_START: /^chart:\s*(pie|bar|line|sequence|gantt|radar|network)/i,
        CHART_CONFIG_LINE: /^config:\s*([a-zA-Z0-9_]+)\s*=\s*(.*)/,
        CHART_DATA_KV: /^(?:"([^"]+)"|([a-zA-Z0-9_ -]+))\s*:\s*([\d.]+)/, 
        CHART_DATA_SEQ: /^(.*?)\s*(->|=>|-->|~>)\s*(.*?)\s*:\s*(.*)/,     
        MATH_BLOCK_START: /^math:\s*(.*)/i,
        MATH_BLOCK_DELIMITER: /^\$\$/,
        LAYOUT_BLOCK_START: /^layout:\s*(flex-row|flex-col|grid-\d|masonry)/i,
        HEADING: /^(#{1,6})\s+(.*)/,    
        BLOCKQUOTE: /^>\s+(.*)/,        
        HORIZONTAL_RULE: /^(---|___|\*\*\*)\s*$/,
        INLINE: {
            ALIGNMENT: /:::\s*(left|center|right|justify)\s*:::(.*?):::/g, 
            COLOR: /\{#([0-9a-fA-F]{3,6}|[a-zA-Z]+)\s+([^}]+)\}/g,         
            HIGHLIGHT: /==([^=]+)==/g,                                    
            BOLD: /\*\*([^*]+)\*\*/g,                                     
            ITALIC: /_([^_]+)_|\*([^*]+)\*/g,                             
            STRIKETHROUGH: /~~([^~]+)~~/g,                                
            UNDERLINE: /__([^_]+)__/g,                                    
            INLINE_CODE: /`([^`]+)`/g,                                    
            INLINE_MATH: /\$([^$]+)\$/g,                                  
            LINK: /\[([^\]]+)\]\(([^)]+)\)/g,                             
            IMAGE: /!\[([^\]]*)\]\(([^)]+)\)/g                            
        }
    });

    /* =====================================================================================
       8. EXPOSED API (Frozen Registry)
       ===================================================================================== */
    const deepFreeze = obj => {
        Object.keys(obj).forEach(prop => {
            if (typeof obj[prop] === 'object' && obj[prop] !== null) {
                deepFreeze(obj[prop]);
            }
        });
        return Object.freeze(obj);
    };

    return deepFreeze({
        SYSTEM, STORAGE, TIMING, SPATIAL, CHART_CONFIG, MATH_CONFIG, GRAMMAR
    });

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZOLTO_CONFIG_BASE };
} else if (typeof window !== 'undefined') {
    window.ZOLTO_CONFIG_BASE = ZOLTO_CONFIG_BASE;
}
