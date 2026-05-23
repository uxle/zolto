/**
 * =========================================================================================
 * LUMA STUDIO: ENTERPRISE MASTER CONFIGURATION REGISTRY (v4.0.0)
 * =========================================================================================
 * Description: The single source of truth for the Luma Spatial IDE. 
 * This file dictates environment variables, storage schemas, timing matrices, 
 * spatial engine physics, language grammar regex definitions, comprehensive keybindings, 
 * diagnostic error codes, and default application templates.
 * * Luma is a unified spatial language encompassing:
 * - Advanced Mathematics (LaTeX equivalent)
 * - Rich Text & Typography (Markdown equivalent + colors, alignments)
 * - Complex Charting (Mermaid equivalent + Gantt, Sequence, Radial)
 * - Graph Theory & Diagrams (Spatial node/edge routing)
 * - Grid-based Data Tables
 * * * Architecture Principle: Zero hardcoded magic numbers or strings in the logic files.
 * =========================================================================================
 */

'use strict';

const CONFIG = (function () {

    /* =====================================================================================
       1. SYSTEM & ENVIRONMENT METADATA
       ===================================================================================== */
    const SYSTEM = Object.freeze({
        APP_NAME: 'Luma Studio Enterprise',
        APP_VERSION: '4.0.0-infinity',
        BUILD_ENVIRONMENT: 'production',
        BUILD_DATE: new Date().toISOString().split('T')[0],
        AUTHOR: 'Luma Systems Engineering',
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
            DOCUMENTATION: 'https://docs.luma-lang.org',
            GITHUB_REPO: 'https://github.com/luma-lang/luma-studio',
            ISSUE_TRACKER: 'https://github.com/luma-lang/luma-studio/issues',
            COMMUNITY: 'https://discord.gg/luma-lang'
        }
    });

    /* =====================================================================================
       2. STORAGE SCHEMA & NAMESPACES
       ===================================================================================== */
    const STORAGE = Object.freeze({
        PREFIX: 'luma_v4_',
        KEYS: {
            WORKSPACE_CONTENT: 'luma_v4_workspace_content',
            THEME_PREFERENCE: 'luma_v4_theme_pref',
            EDITOR_SETTINGS: 'luma_v4_editor_settings',
            CANVAS_TRANSFORM: 'luma_v4_canvas_pan_zoom',
            RECENT_FILES: 'luma_v4_recent_files',
            UI_LAYOUT_STATE: 'luma_v4_ui_layout_panels',
            MACROS: 'luma_v4_custom_macros',
            SNIPPETS: 'luma_v4_user_snippets'
        },
        LIMITS: {
            MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15MB limit for local text parsing
            MAX_RECENT_FILES: 25,
            AUTO_SAVE_INTERVAL_MS: 15000, // Background auto-save flush
            HISTORY_STACK_SIZE: 500       // Number of undo/redo steps
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
        DEBOUNCE_TYPING: 120,           // AST Parse delay after keystroke (ultra-fast)
        DEBOUNCE_SEARCH: 250,           // File search/filter delay
        THROTTLE_SCROLL: 16,            // ~60fps sync scrolling
        
        // Window & Layout
        THROTTLE_RESIZE: 50,            // Debounce canvas recalculation on resize
        LAYOUT_SHIFT_DELAY: 50,         // Wait for CSS transitions before SVG math
        
        // Animations & Feedback
        TOAST_DURATION_SHORT: 2000,
        TOAST_DURATION_NORMAL: 3500,
        TOAST_DURATION_LONG: 6000,
        TOOLTIP_DELAY: 400,             // Hover delay before showing tooltip
        MODAL_TRANSITION_IN: 250,
        MODAL_TRANSITION_OUT: 200,
        
        // Network & Background Tasks
        API_TIMEOUT: 15000,
        WORKER_IDLE_TIMEOUT: 60000,
        GARBAGE_COLLECTION_INTERVAL: 120000 // AST Memory cleanup
    });

    /* =====================================================================================
       4. SPATIAL ENGINE & PHYSICS CONSTANTS
       ===================================================================================== */
    const SPATIAL = Object.freeze({
        // Grid & Layout Dimensions
        INDENT_REM: 2.5,                // Horizontal spatial depth per AST level
        CANVAS_PADDING_REM: 4,          // Base padding around the preview container
        LINE_HEIGHT_REM: 1.6,           // Base vertical rhythm
        BASE_FONT_SIZE_PX: 16,
        
        // SVG Vector Routing Mathematics
        ROUTING: {
            EDGE_PADDING: 10,               // Pixel gap between DOM node border and SVG stroke start
            BEZIER_CONTROL_MIN: 50,         // Minimum curve bow out for adjacent nodes
            BEZIER_CONTROL_MULTIPLIER: 0.5, // Ratio of distance for curve depth
            ARROWHEAD_WIDTH: 12,
            ARROWHEAD_HEIGHT: 8,
            STROKE_WIDTH_NORMAL: 2,
            STROKE_WIDTH_THICK: 4,
            DASH_ARRAY_ASYNC: '6, 6',
            INTERSECTION_JUMP_RADIUS: 8
        },
        
        // Drag & Drop Physics (Interactive Canvas)
        PHYSICS: {
            SPRING_STIFFNESS: 0.18,
            SPRING_DAMPING: 0.85,
            SNAP_GRID_SIZE: 24,         // Matches CSS canvas background grid
            SNAP_THRESHOLD: 12,         // Snap when within 12px
            DRAG_FRICTION: 0.90,
            MAX_VELOCITY: 60,
            INERTIA_DECAY: 0.95
        },
        
        // Zoom & Pan (Infinite Canvas Viewport)
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
       5. ADVANCED CHARTING DEFAULTS (Mermaid Replacement)
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
        BAR: {
            GAP_RATIO: 0.2,
            CORNER_RADIUS: 4,
            SHOW_VALUES: true
        },
        PIE: {
            DONUT_RATIO: 0.5, // Set > 0 for Donut chart
            MIN_ANGLE_FOR_LABEL_RAD: 0.15,
            EXPLODE_HOVER_OFFSET: 10
        },
        LINE: {
            CURVE_TENSION: 0.3, // 0 = straight lines, 0.5 = smooth curves
            POINT_RADIUS: 5,
            SHOW_AREA: true,    // Fill under line
            AREA_OPACITY: 0.15
        },
        SEQUENCE: {
            ACTOR_WIDTH: 120,
            ACTOR_HEIGHT: 40,
            MESSAGE_SPACING: 50,
            LIFELINE_DASH: '5,5'
        },
        GANTT: {
            ROW_HEIGHT: 30,
            BAR_HEIGHT: 20,
            GRID_COLOR: 'rgba(128, 128, 128, 0.2)',
            TODAY_MARKER_COLOR: '#ef4444'
        }
    });

    /* =====================================================================================
       6. MATHEMATICAL ENGINE CONSTANTS (LaTeX Replacement)
       ===================================================================================== */
    const MATH_CONFIG = Object.freeze({
        // Symbols mapping (ASCII to Unicode/HTML Entities)
        SYMBOLS: {
            // Greek Alphabet
            '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
            '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
            '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
            '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
            '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
            '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
            '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
            
            // Operators
            '\\times': '×', '\\cdot': '⋅', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
            '\\ast': '∗', '\\star': '⋆', '\\circ': '∘', '\\bullet': '∙',
            '\\neq': '≠', '\\leq': '≤', '\\geq': '≥', '\\equiv': '≡', '\\approx': '≈',
            '\\sim': '∼', '\\cong': '≅', '\\propto': '∝',
            
            // Set Theory & Logic
            '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
            '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\forall': '∀', '\\exists': '∃',
            '\\lor': '∨', '\\land': '∧', '\\neg': '¬', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔',
            
            // Calculus & Advanced
            '\\int': '∫', '\\iint': '∬', '\\oint': '∮', '\\partial': '∂', '\\nabla': '∇',
            '\\infty': '∞', '\\sum': '∑', '\\prod': '∏', '\\lim': 'lim',
            
            // Arrows
            '\\rightarrow': '→', '\\leftarrow': '←', '\\uparrow': '↑', '\\downarrow': '↓',
            '\\leftrightarrow': '↔', '\\mapsto': '↦'
        },
        MACROS: {
            'R': 'ℝ', 'N': 'ℕ', 'Z': 'ℤ', 'Q': 'ℚ', 'C': 'ℂ'
        }
    });

    /* =====================================================================================
       7. LUMA LANGUAGE GRAMMAR SPECIFICATION (REGEX DICTIONARY)
       This powers the 4-phase compiler. It is the core of Luma's syntax.
       ===================================================================================== */
    const GRAMMAR = Object.freeze({
        // --- MACRO STRUCTURES ---
        INDENTATION: /^ */,
        COMMENT_LINE: /^\/\/.*/,
        COMMENT_BLOCK_START: /^\/\*/,
        COMMENT_BLOCK_END: /\*\//,
        
        // --- SPATIAL NODES (SHAPES) ---
        // Supports: [Block], (Interactive), <Geometric>, {Database}, ((Circle))
        NODE_DECLARATION: /^(\[|\(|\<|\{|\(\()(.*?)(\]|\)|\>|\}|\)\))(.*)/,
        
        // --- TRAITS / MODIFIERS ---
        // Matches: +glass, +primary, +danger, etc.
        TRAIT_MATCH: /\+([a-zA-Z0-9-]+)/g,
        
        // --- SPATIAL EDGES / CONNECTORS ---
        // Supports: ->, =>, ~>, <->, ..>
        EDGE_MATCH: /(->|=>|~>|<->|\.\.>)\s*(\[|\(|\<|\{)?(.*?)(\]|\)|\>|\})?$/,
        STANDALONE_EDGE_MATCH: /^(->|=>|~>|<->|\.\.>)\s*(\[|\(|\<|\{)?(.*?)(\]|\)|\>|\})?(.*)/,
        
        // --- TREE EXPLORER SYNTAX ---
        TREE_BRANCH: /^\/\s+(.*)/,      // e.g., "/ src"
        TREE_LEAF: /^-\s+(.*)/,         // e.g., "- index.js"
        
        // --- DATA TABLES ---
        // Matches standard Markdown/Luma table row: | cell | cell |
        TABLE_ROW: /^\|(.+)\|$/,
        TABLE_DIVIDER: /^\|(?:[:\s-]+\|)+$/,
        
        // --- ADVANCED CHARTING BLOCKS ---
        CHART_BLOCK_START: /^chart:\s*(pie|bar|line|sequence|gantt|radar|network)/i,
        CHART_CONFIG_LINE: /^config:\s*([a-zA-Z0-9_]+)\s*=\s*(.*)/,
        CHART_DATA_KV: /^(?:"([^"]+)"|([a-zA-Z0-9_ -]+))\s*:\s*([\d.]+)/, // Key: Value
        CHART_DATA_SEQ: /^(.*?)\s*(->|=>|-->|~>)\s*(.*?)\s*:\s*(.*)/,     // Actor -> Actor : Msg
        
        // --- MATHEMATICS BLOCKS ---
        MATH_BLOCK_START: /^math:\s*(.*)/i,
        MATH_BLOCK_DELIMITER: /^\$\$/,
        
        // --- LAYOUT & ALIGNMENT BLOCKS ---
        LAYOUT_BLOCK_START: /^layout:\s*(flex-row|flex-col|grid-\d|masonry)/i,
        
        // --- TYPOGRAPHY & TEXT ---
        HEADING: /^(#{1,6})\s+(.*)/,    // # Heading
        BLOCKQUOTE: /^>\s+(.*)/,        // > Quote
        HORIZONTAL_RULE: /^(---|___|\*\*\*)\s*$/,
        
        // --- INLINE RICH TEXT ---
        INLINE: {
            ALIGNMENT: /:::\s*(left|center|right|justify)\s*:::(.*?):::/g, // ::: center ::: Text :::
            COLOR: /\{#([0-9a-fA-F]{3,6}|[a-zA-Z]+)\s+([^}]+)\}/g,         // {#ff0000 Text} or {red Text}
            HIGHLIGHT: /==([^=]+)==/g,                                    // ==highlight==
            BOLD: /\*\*([^*]+)\*\*/g,                                     // **bold**
            ITALIC: /_([^_]+)_|\*([^*]+)\*/g,                             // _italic_ or *italic*
            STRIKETHROUGH: /~~([^~]+)~~/g,                                // ~~strike~~
            UNDERLINE: /__([^_]+)__/g,                                    // __underline__
            INLINE_CODE: /`([^`]+)`/g,                                    // `code`
            INLINE_MATH: /\$([^$]+)\$/g,                                  // $math$
            LINK: /\[([^\]]+)\]\(([^)]+)\)/g,                             // [label](url)
            IMAGE: /!\[([^\]]*)\]\(([^)]+)\)/g                            // ![alt](url)
        }
    });

    /* =====================================================================================
       8. DIAGNOSTIC ERROR CODES & MESSAGES (LSP ENGINE)
       Exhaustive matrix of errors for real-time IDE linting.
       ===================================================================================== */
    const ERRORS = Object.freeze({
        // --- LEXICAL ERRORS (L000) ---
        L001: { code: 'L001', type: 'LexicalError', message: 'Illegal tab character detected. Luma enforces strict 2-space indentation for spatial matrices.', severity: 'error' },
        L002: { code: 'L002', type: 'LexicalError', message: 'Odd indentation length. Depth must be a multiple of 2 spaces.', severity: 'warning' },
        L003: { code: 'L003', type: 'LexicalError', message: 'Unclosed string literal or invalid quote character.', severity: 'error' },
        L004: { code: 'L004', type: 'LexicalError', message: 'Invalid invisible character detected in stream.', severity: 'warning' },
        
        // --- SYNTAX ERRORS (S000) ---
        S001: { code: 'S001', type: 'SyntaxError', message: 'Unclosed node bracket. Ensure nodes use matching [ ], ( ), < >, or { }.', severity: 'error' },
        S002: { code: 'S002', type: 'SyntaxError', message: 'Invalid trait syntax. Traits must follow the +traitname format with no spaces.', severity: 'warning' },
        S003: { code: 'S003', type: 'SyntaxError', message: 'Malformed edge operator. Expected ->, =>, ~>, <->, or ..>', severity: 'error' },
        S004: { code: 'S004', type: 'SyntaxError', message: 'Table row column mismatch. Divider row does not match header column count.', severity: 'warning' },
        S005: { code: 'S005', type: 'SyntaxError', message: 'Unknown chart type declared. Supported: pie, bar, line, sequence, gantt.', severity: 'error' },
        S006: { code: 'S006', type: 'SyntaxError', message: 'Invalid inline color tag. Use {#hex Text} or {colorname Text}.', severity: 'warning' },
        
        // --- SEMANTIC ERRORS (E000) ---
        E001: { code: 'E001', type: 'SemanticWarning', message: 'Orphaned edge. Standalone edge has no parent node above it in the spatial tree.', severity: 'warning' },
        E002: { code: 'E002', type: 'SemanticError', message: 'Unresolved edge target. The node specified in the connection does not exist.', severity: 'error' },
        E003: { code: 'E003', type: 'SemanticError', message: 'Circular dependency detected in a strict Directed Acyclic Graph (DAG) layout context.', severity: 'error' },
        E004: { code: 'E004', type: 'SemanticWarning', message: 'Duplicate node label. Edges will target the first declared instance.', severity: 'warning' },
        E005: { code: 'E005', type: 'SemanticError', message: 'Chart data parsing failed. Ensure Key: Value format for Pie/Bar charts.', severity: 'error' },
        
        // --- RUNTIME & RENDER ERRORS (R000) ---
        R001: { code: 'R001', type: 'RuntimeError', message: 'Exceeded maximum AST recursion depth limit (512 levels).', severity: 'fatal' },
        R002: { code: 'R002', type: 'RuntimeError', message: 'SVG bounding box calculation failed. Target DOM elements are not painted or have 0x0 dimensions.', severity: 'warning' },
        R003: { code: 'R003', type: 'RuntimeError', message: 'Mathematical parser failed on complex fraction stack.', severity: 'error' },
        R004: { code: 'R004', type: 'RuntimeError', message: 'Regex catastropic backtracking prevented. Expression execution halted.', severity: 'fatal' }
    });

    /* =====================================================================================
       9. UI INTERNATIONALIZATION (i18n)
       Complete dictionary for the IDE UI, allowing instant translation.
       ===================================================================================== */
    const I18N = Object.freeze({
        EN: {
            TOASTS: {
                FILE_LOADED: 'Luma file loaded successfully.',
                FILE_SAVED: 'Luma project saved.',
                FILE_LOAD_ERROR: 'Failed to read file. Please ensure it is a valid text or .lm file.',
                SVG_EXPORTED: 'Vector SVG exported successfully.',
                HTML_EXPORTED: 'Standalone HTML Document exported.',
                THEME_LIGHT: 'Light Mode Enabled.',
                THEME_DARK: 'Dark Mode Enabled.',
                PARSER_RECOVERED: 'Parser recovered from invalid syntax.',
                UNDO: 'Undo performed.',
                REDO: 'Redo performed.',
                FORMATTED: 'Document formatted.'
            },
            EDITOR: {
                PLACEHOLDER: '// Start typing Luma syntax here...',
                HEADER_TITLE: 'Source Code (.lm)',
                LINE: 'Ln',
                COL: 'Col',
                UTF8: 'UTF-8'
            },
            CANVAS: {
                HEADER_TITLE: 'Spatial Runtime',
                EMPTY_STATE: 'AST is empty. Type Luma syntax to render spatial nodes, charts, or math.',
                ZOOM_LEVEL: 'Zoom:',
                RENDERING: 'Rendering...'
            },
            COMMAND_PALETTE: {
                PLACEHOLDER: '> Search files, or type ? for commands...',
                EMPTY_STATE: 'No files found. Press Enter to create new file.',
                CMD_FORMAT: 'Format Document',
                CMD_THEME: 'Toggle Theme',
                CMD_EXPORT_SVG: 'Export Vector SVG',
                CMD_EXPORT_HTML: 'Export as HTML Webpage',
                CMD_RESET_VIEW: 'Reset Canvas Viewport'
            }
        }
    });

    /* =====================================================================================
       10. KEYBINDINGS & SHORTCUT REGISTRY
       ===================================================================================== */
    const KEYBINDINGS = Object.freeze({
        MAC: {
            SAVE: ['Meta', 's'],
            OPEN: ['Meta', 'o'],
            EXPORT: ['Meta', 'Shift', 'e'],
            TOGGLE_THEME: ['Meta', 'k', 't'],
            COMMAND_PALETTE: ['Meta', 'p'],
            FORMAT_DOC: ['Shift', 'Alt', 'f'],
            UNDO: ['Meta', 'z'],
            REDO: ['Meta', 'Shift', 'z'],
            FOCUS_EDITOR: ['Meta', '1'],
            FOCUS_CANVAS: ['Meta', '2']
        },
        WINDOWS: {
            SAVE: ['Control', 's'],
            OPEN: ['Control', 'o'],
            EXPORT: ['Control', 'Shift', 'e'],
            TOGGLE_THEME: ['Control', 'k', 't'],
            COMMAND_PALETTE: ['Control', 'p'],
            FORMAT_DOC: ['Shift', 'Alt', 'f'],
            UNDO: ['Control', 'z'],
            REDO: ['Control', 'y'],
            FOCUS_EDITOR: ['Control', '1'],
            FOCUS_CANVAS: ['Control', '2']
        },
        ACTIONS: {
            ESCAPE_MODAL: ['Escape'],
            CONFIRM_MODAL: ['Enter'],
            AUTO_COMPLETE: ['Tab'],
            PAN_CANVAS: ['Space'] // Hold Space + Drag to pan
        }
    });

    /* =====================================================================================
       11. MASTER TEMPLATE REGISTRY (The Core Library)
       Provides massive, complex default .lm strings to populate the editor.
       These templates showcase the absolute limit of Luma's infinity-level parser.
       ===================================================================================== */
    const TEMPLATES = Object.freeze({
        
        // --- 11.1 The Ultimate Feature Showcase ---
        ULTIMATE_SHOWCASE: 
`# The Luma Language: Ultimate Showcase
Luma is an infinity-level language. It combines Markdown, Mermaid, LaTeX, and UI Layouts into a single spatial grid.

## 1. Rich Text & Typography
Standard text is supported, but enhanced with Luma Inlines.
You can use **Bold**, _Italic_, and ~~Strikethrough~~.
You can also use ==Highlighter Pens== and {red native color tags}.
{#0ea5e9 Hex codes} are also fully supported inline.

::: center :::
You can precisely align text blocks without CSS.
This block is centered.
:::

## 2. Advanced Mathematics (LaTeX Alternative)
Luma features a native math layout engine. No external libraries required.

math: The Quadratic Formula
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}

math: Calculus - The Fundamental Theorem
  \\int_{a}^{b} f(x) dx = F(b) - F(a)

math: Einstein Field Equations
  R_{\\mu\\nu} - \\frac{1}{2}Rg_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}

Inline math is also supported: Compute the area of a circle using $A = \\pi r^2$.

## 3. Data Tables
Tables are grid-aware and support alignment syntax.

| Feature Segment      | Luma Support | Legacy Alternative |
| :------------------- | :----------: | -----------------: |
| Spatial Graphing     | Native       | Mermaid.js / Visio |
| Mathematical Typeset | Native       | LaTeX / MathJax    |
| Chart Rendering      | Native       | Chart.js / D3.js   |
| Rich Text Processing | Native       | Markdown / HTML    |

## 4. Native SVG Charting
Luma generates SVG charts dynamically from data blocks.

chart: pie
  config: color = primary
  "Frontend Setup": 25
  "Backend Logic": 45
  "Database Schema": 15
  "DevOps / CI/CD": 15

chart: bar
  config: theme = dark
  "Q1 Revenue": 12000
  "Q2 Revenue": 18500
  "Q3 Revenue": 14200
  "Q4 Revenue": 22000

## 5. Sequence & Flow Diagrams
Map out logic flows instantly.

chart: sequence
  User -> API Gateway : POST /login
  API Gateway => Auth Service : Validate Token
  Auth Service --> API Gateway : 200 OK
  API Gateway -> User : Return Session

## 6. Spatial Graph Architecture
The crown jewel of Luma. Draw complex, interactive nodes and link them mathematically.

[ Web Client ] +glass
  -> ( Load Balancer )

( Load Balancer ) +primary
  => [ Node Cluster A ]
  => [ Node Cluster B ]

[ Node Cluster A ]
  -> { Master Database } +success
  ~> < Redis Cache > +warning

[ Node Cluster B ]
  -> { Master Database }
  ~> < Redis Cache >

{ Master Database } +success
  ..> { Read Replica } +dashed

## 7. UI Layout Blocks
Build web layouts directly in code.

layout: grid-3
  [ Metric: Users ] +primary
  [ Metric: Sales ] +success
  [ Metric: Churn ] +danger`,

        // --- 11.2 Microservices Architecture Template ---
        ARCHITECTURE: 
`# Microservices Cloud Architecture
System topology for the global e-commerce platform.

/ aws-cloud
  / us-east-1
    / availability-zone-a
      - EC2_Instance_1
      - RDS_Primary
    / availability-zone-b
      - EC2_Instance_2
      - RDS_Replica

[ Load Balancer ] +glass
  => ( API Gateway )
  
( API Gateway ) +primary
  -> [ Auth Service ]
  -> [ Product Service ]
  -> [ Order Service ]

[ Auth Service ]
  -> < Redis Cache > +warning
  -> { PostgreSQL } +success

[ Product Service ]
  -> { DynamoDB } +warning

[ Order Service ]
  => ( Stripe Payment API ) +outline
  ~> { Orders Database } +success
  
( Stripe Payment API ) +outline
  => [ Order Service ]
  ~> [ Webhook Handler ]

[ Webhook Handler ]
  -> < Kafka Queue > +danger
  
< Kafka Queue > +danger
  -> [ Notification Service ]

[ Notification Service ]
  -> ( Send Email/SMS ) +primary`,

        // --- 11.3 State Machine & Logic Flow Template ---
        STATE_MACHINE: 
`# Authentication State Machine
Finite State Automata for user login flow.

( Initial State: Logged Out )
  => [ Enter Credentials ]

[ Enter Credentials ]
  -> ( Click Submit ) +primary

( Click Submit ) +primary
  ~> [ Validating with Server ] +dashed

[ Validating with Server ] +dashed
  => < Server Error 500 > +danger
  => < Invalid Password 401 > +warning
  => < Token Received 200 > +success

< Server Error 500 > +danger
  -> [ Show Error Toast ]
  -> [ Enter Credentials ]

< Invalid Password 401 > +warning
  -> [ Increment Retry Count ]
  -> [ Enter Credentials ]

< Token Received 200 > +success
  -> [ Save to LocalStorage ]
  => ( State: Authenticated ) +glass`,

        // --- 11.4 Organization / Mind Map Template ---
        MIND_MAP: 
`# Corporate Structure
Luma Systems Corporation reporting lines.

(( Board of Directors )) +glass
  => ( Chief Executive Officer ) +primary

( Chief Executive Officer ) +primary
  -> [ Chief Technology Officer ]
  -> [ Chief Marketing Officer ]
  -> [ Chief Financial Officer ]
  -> [ Chief Operations Officer ]

[ Chief Technology Officer ]
  -> ( VP of Engineering )
  -> ( VP of Product )
  -> ( Chief Information Security Officer )

( VP of Engineering )
  -> [ Frontend Team ] +success
  -> [ Backend Team ] +success
  -> [ DevOps Team ] +warning

[ Frontend Team ] +success
  - React Developers
  - UI/UX Designers

[ Backend Team ] +success
  - Node.js Engineers
  - Database Architects`,

        // --- 11.5 Blank State ---
        BLANK: 
`# Untitled Luma Document

// Start typing your Luma syntax here...`

    });

    /* =====================================================================================
       12. EXPOSED API (Frozen Registry)
       Deep freezing ensures that external plugins or runtime scripts cannot accidentally 
       mutate the core compiler configuration.
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
        SYSTEM,
        STORAGE,
        TIMING,
        SPATIAL,
        CHART_CONFIG,
        MATH_CONFIG,
        GRAMMAR,
        ERRORS,
        I18N,
        KEYBINDINGS,
        TEMPLATES,
        // The payload used on first boot (Showcasing everything)
        DEFAULT_LUMA: TEMPLATES.ULTIMATE_SHOWCASE 
    });

})();

// Node.js & ES6 Bundler Export Support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}