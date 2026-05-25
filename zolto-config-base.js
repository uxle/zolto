/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE CONFIGURATION BASE (Module 2 of 7)
 * Version: 8.0.0-infinity (Supernova Architecture · Unified Domain Config)
 * =========================================================================================
 *
 * Architecture: Single source of truth for ALL six Zolto domains.
 * Aligned with: ast.js v8, tokenizer.js v8, parser-core.js v8
 *
 * Domain Coverage:
 *  §1  SYSTEM           — Environment metadata, feature detection
 *  §2  STORAGE          — Persistence schema, limits, defaults
 *  §3  TIMING           — Debounce, throttle, animation timing matrix
 *  §4  SPATIAL          — Physics, camera, routing, snap constants
 *  §5  TYPOGRAPHY       — Rich text rendering, font stacks, scale
 *  §6  MARKDOWN_CONFIG  — All block/inline markdown feature settings
 *  §7  MATH_CONFIG      — Full LaTeX-level symbol maps, environments, physics/chem
 *  §8  DIAGRAM_CONFIG   — All diagram types: themes, layout, animations, interactivity
 *  §9  VECTOR_CONFIG    — SVG/graphics engine: shapes, paths, layers, constraints
 *  §10 LAYOUT_CONFIG    — Spatial layout system: flex, grid, canvas, whiteboard
 *  §11 COMPONENT_CONFIG — Component/template/slot/variant/theme design system
 *  §12 CHART_CONFIG     — Data visualisation defaults per chart type
 *  §13 THEME            — Design token system (dark/light/custom)
 *  §14 ANIMATION_CONFIG — Keyframe, timing, easing, transition presets
 *  §15 GRAMMAR          — Regex dictionary aligned with tokenizer.js v8
 * =========================================================================================
 */

'use strict';

const ZOLTO_CONFIG_BASE = (function () {

    /* =====================================================================================
       §1  SYSTEM — Environment Metadata & Feature Detection
       ===================================================================================== */
    const SYSTEM = Object.freeze({
        APP_NAME:        'Zolto Studio Enterprise',
        APP_VERSION:     '8.0.0-infinity',
        API_VERSION:     '8',
        BUILD_ENV:       'production',
        BUILD_DATE:      new Date().toISOString().split('T')[0],
        AUTHOR:          'Zolto Systems Engineering',
        ENGINE_CODENAME: 'Supernova',
        LANG_EXTENSION:  '.zl',

        IS_MOBILE: (function () {
            try {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            } catch (_) { return false; }
        })(),

        FEATURES: Object.freeze({
            LOCAL_STORAGE:  (function () { try { return !!window.localStorage; }   catch (_) { return false; } })(),
            FILE_API:       (function () { try { return typeof FileReader !== 'undefined'; } catch (_) { return false; } })(),
            WORKERS:        (function () { try { return typeof Worker !== 'undefined'; } catch (_) { return false; } })(),
            WEBGL:          (function () {
                try { return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('webgl'); }
                catch (_) { return false; }
            })(),
            WASM:           (function () { try { return typeof WebAssembly !== 'undefined'; } catch (_) { return false; } })(),
            CLIPBOARD:      (function () { try { return !!navigator.clipboard; } catch (_) { return false; } })(),
            POINTER_EVENTS: (function () { try { return !!window.PointerEvent; } catch (_) { return false; } })(),
            RESIZE_OBSERVER:(function () { try { return !!window.ResizeObserver; } catch (_) { return false; } })(),
            INTERSECTION_OBS:(function(){ try { return !!window.IntersectionObserver; } catch(_){ return false; }})(),
            NATIVE_PRINT:   (function () { try { return typeof window.print === 'function'; } catch (_) { return false; } })(),
        }),

        LINKS: Object.freeze({
            DOCS:      'https://docs.zolto-lang.org',
            GITHUB:    'https://github.com/zolto-lang/zolto-studio',
            ISSUES:    'https://github.com/zolto-lang/zolto-studio/issues',
            COMMUNITY: 'https://discord.gg/zolto-lang',
            CHANGELOG: 'https://docs.zolto-lang.org/changelog',
        }),
    });

    /* =====================================================================================
       §2  STORAGE — Persistence Schema, Limits, Defaults
       ===================================================================================== */
    const STORAGE = Object.freeze({
        PREFIX: 'zolto_v8_',

        KEYS: Object.freeze({
            WORKSPACE_CONTENT:   'zolto_v8_workspace_content',
            THEME_PREFERENCE:    'zolto_v8_theme_pref',
            EDITOR_SETTINGS:     'zolto_v8_editor_settings',
            CANVAS_TRANSFORM:    'zolto_v8_canvas_pan_zoom',
            RECENT_FILES:        'zolto_v8_recent_files',
            UI_LAYOUT_STATE:     'zolto_v8_ui_layout_panels',
            MACROS:              'zolto_v8_custom_macros',
            SNIPPETS:            'zolto_v8_user_snippets',
            COMPONENT_REGISTRY:  'zolto_v8_components',
            TEMPLATE_REGISTRY:   'zolto_v8_templates',
            MATH_LABELS:         'zolto_v8_math_labels',
            DIAGRAM_THEMES:      'zolto_v8_diagram_themes',
            HISTORY_STACK:       'zolto_v8_history',
        }),

        LIMITS: Object.freeze({
            MAX_FILE_SIZE_BYTES:    15 * 1024 * 1024,   // 15 MB
            MAX_RECENT_FILES:       25,
            AUTO_SAVE_INTERVAL_MS:  15000,
            HISTORY_STACK_SIZE:     500,
            MAX_COMPONENT_DEPTH:    32,
            MAX_AST_DEPTH:          512,
            MAX_TABLE_COLS:         64,
            MAX_TABLE_ROWS:         2048,
            MAX_DIAGRAM_NODES:      4096,
            MAX_MATH_NESTING:       24,
            MAX_INLINE_LENGTH:      65535,
        }),

        DEFAULTS: Object.freeze({
            THEME:                  'dark',
            EDITOR_FONT_SIZE:       14,
            EDITOR_FONT_FAMILY:     'JetBrains Mono, Fira Code, monospace',
            EDITOR_LINE_HEIGHT:     1.7,
            EDITOR_WORD_WRAP:       true,
            EDITOR_TAB_SIZE:        2,
            SHOW_MINIMAP:           true,
            SHOW_LINE_NUMBERS:      true,
            AUTO_FORMAT_ON_SAVE:    true,
            RENDER_PREVIEW_LIVE:    true,
            MATH_RENDERER:          'native',       // 'native' | 'katex' | 'mathjax'
            DIAGRAM_THEME:          'default',
            COMPONENT_STRICT_MODE:  false,
            INFINITE_CANVAS:        true,
            SNAP_TO_GRID:           false,
            GRID_SIZE:              24,
        }),
    });

    /* =====================================================================================
       §3  TIMING — Debounce · Throttle · Animation Timing Matrix (ms)
       ===================================================================================== */
    const TIMING = Object.freeze({
        // Editor interaction
        DEBOUNCE_TYPING:           120,
        DEBOUNCE_SEARCH:           250,
        DEBOUNCE_RESIZE:            50,
        THROTTLE_SCROLL:            16,     // ~60 fps
        THROTTLE_POINTER:           16,
        THROTTLE_WHEEL:             16,

        // Layout & paint
        LAYOUT_SHIFT_DELAY:         50,
        PAINT_SETTLE_DELAY:         80,
        DOM_REFLOW_BUFFER:          20,

        // UI feedback
        TOAST_SHORT:              2000,
        TOAST_NORMAL:             3500,
        TOAST_LONG:               6000,
        TOOLTIP_SHOW_DELAY:        400,
        TOOLTIP_HIDE_DELAY:        150,
        MODAL_TRANSITION_IN:       250,
        MODAL_TRANSITION_OUT:      200,
        PANEL_COLLAPSE_DURATION:   220,
        ACCORDION_DURATION:        280,

        // Network & workers
        API_TIMEOUT:             15000,
        WORKER_IDLE_TIMEOUT:     60000,
        GC_INTERVAL:            120000,

        // Math & diagram re-render
        MATH_RENDER_DELAY:          40,
        DIAGRAM_LAYOUT_DELAY:       60,
        ANIMATION_FRAME_BUDGET:     12,     // ms per frame for incremental render
    });

    /* =====================================================================================
       §4  SPATIAL — Physics, Camera, Edge Routing, Snap, Grid
       ===================================================================================== */
    const SPATIAL = Object.freeze({
        INDENT_REM:           2.5,
        CANVAS_PADDING_REM:   4,
        LINE_HEIGHT_REM:      1.6,
        BASE_FONT_SIZE_PX:    16,

        ROUTING: Object.freeze({
            EDGE_PADDING:               10,
            BEZIER_CONTROL_MIN:         50,
            BEZIER_CONTROL_MULTIPLIER:  0.45,
            ARROWHEAD_WIDTH:            12,
            ARROWHEAD_HEIGHT:           8,
            STROKE_WIDTH_THIN:           1,
            STROKE_WIDTH_NORMAL:         2,
            STROKE_WIDTH_THICK:          4,
            STROKE_WIDTH_ULTRA:          6,
            DASH_ARRAY_DOTTED:         '3, 4',
            DASH_ARRAY_DASHED:         '6, 6',
            DASH_ARRAY_LONG_DASH:     '12, 4',
            INTERSECTION_JUMP_RADIUS:   8,
            ORTHO_CORNER_RADIUS:        8,
            ELBOW_OFFSET:              30,
            SMART_AVOID_PADDING:       20,
            LABEL_OFFSET_Y:           -10,
            LABEL_PILL_RX:            10,
            LABEL_PILL_W:             60,
            LABEL_PILL_H:             20,
        }),

        PHYSICS: Object.freeze({
            SPRING_STIFFNESS:     0.18,
            SPRING_DAMPING:       0.85,
            SNAP_GRID_SIZE:       24,
            SNAP_THRESHOLD:       12,
            DRAG_FRICTION:        0.90,
            MAX_VELOCITY:         60,
            INERTIA_DECAY:        0.95,
            FORCE_GRAVITY:        0.003,
            FORCE_REPULSION:    150.0,
            FORCE_LINK_LENGTH:   120,
            ITERATIONS_PER_TICK:   5,
        }),

        CAMERA: Object.freeze({
            ZOOM_MIN:           0.05,
            ZOOM_MAX:           5.0,
            ZOOM_STEP:          0.1,
            ZOOM_STEP_WHEEL:    0.001,
            ZOOM_STEP_PINCH:    0.005,
            PAN_SPEED_MOUSE:    1.2,
            PAN_SPEED_TOUCH:    2.0,
            PAN_SPEED_KEYBOARD: 20,
            WHEEL_SENSITIVITY:  0.001,
            FIT_PADDING:        48,
        }),

        CANVAS: Object.freeze({
            INFINITE:           true,
            DEFAULT_WIDTH:      null,   // null = viewport width
            DEFAULT_HEIGHT:     null,
            BG_GRID_SIZE:       24,
            BG_GRID_DOTS:       true,   // false = lines
            BG_GRID_COLOR:     'rgba(128,128,128,0.12)',
            SELECTION_COLOR:   '#3b82f6',
            SELECTION_OPACITY:  0.12,
            SELECTION_STROKE:  '#3b82f6',
        }),

        WHITEBOARD: Object.freeze({
            INFINITE:           true,
            STROKE_DEFAULT:      2,
            STROKE_SIZES:       [1, 2, 4, 8, 16],
            ERASER_SIZE:        24,
            TOOL_COLORS:        ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'],
        }),

        PRESENTATION: Object.freeze({
            SLIDE_WIDTH:       1280,
            SLIDE_HEIGHT:       720,
            SLIDE_ASPECT:      '16:9',
            TRANSITION_TYPES:  ['none', 'fade', 'slide', 'zoom', 'flip'],
            DEFAULT_TRANSITION:'fade',
            TRANSITION_SPEED:   400,
        }),
    });

    /* =====================================================================================
       §5  TYPOGRAPHY — Font Stacks, Scale, Rich Text Rendering Config
       ===================================================================================== */
    const TYPOGRAPHY = Object.freeze({
        FONT_STACKS: Object.freeze({
            SANS:  '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
            MONO:  '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
            SERIF: '"Lora", "Georgia", "Times New Roman", serif',
            DISPLAY: '"Cal Sans", "Plus Jakarta Sans", var(--font-sans)',
        }),

        SCALE: Object.freeze({
            // Modular scale (1.25 — Major Third)
            XS:   '0.75rem',   //  12px
            SM:   '0.875rem',  //  14px
            BASE: '1rem',      //  16px
            MD:   '1.125rem',  //  18px
            LG:   '1.25rem',   //  20px
            XL:   '1.5rem',    //  24px
            H6:   '1rem',
            H5:   '1.125rem',
            H4:   '1.25rem',
            H3:   '1.5rem',
            H2:   '1.875rem',
            H1:   '2.25rem',
            DISPLAY_SM: '3rem',
            DISPLAY_MD: '3.75rem',
            DISPLAY_LG: '4.5rem',
        }),

        WEIGHTS: Object.freeze({ LIGHT: 300, NORMAL: 400, MEDIUM: 500, SEMIBOLD: 600, BOLD: 700, EXTRABOLD: 800 }),

        INLINE: Object.freeze({
            BOLD_TAG:          'strong',
            ITALIC_TAG:        'em',
            CODE_TAG:          'code',
            STRIKETHROUGH_TAG: 'del',
            UNDERLINE_TAG:     'u',
            MARK_TAG:          'mark',
            SUP_TAG:           'sup',
            SUB_TAG:           'sub',
            SMART_QUOTES:      true,
            SMART_DASHES:      true,
            SMART_ELLIPSIS:    true,
            EMOJI_PROVIDER:    'native',   // 'native' | 'twemoji' | 'noto'
        }),

        HEADING_ANCHORS:   true,
        HEADING_ANCHOR_ICON: '#',
        AUTO_SLUG:         true,
        SLUG_MAX_LENGTH:   64,
        SLUG_SEPARATOR:    '-',
    });

    /* =====================================================================================
       §6  MARKDOWN_CONFIG — Full Markdown Feature Registry
       Covers all 6 block domains: rich text, UI blocks, layout, docs, embeds, references.
       ===================================================================================== */
    const MARKDOWN_CONFIG = Object.freeze({

        // ── Feature flags — can be toggled at runtime ──────────────────────────────────
        FEATURES: Object.freeze({
            HEADINGS:           true,
            LISTS:              true,
            ORDERED_LISTS:      true,
            CHECKLISTS:         true,
            DEFINITION_LISTS:   true,
            TABLES:             true,
            TABLE_ALIGNMENT:    true,
            TABLE_CAPTION:      true,
            QUOTES:             true,
            CALLOUTS:           true,
            CODE_BLOCKS:        true,
            CODE_HIGHLIGHTING:  true,
            CODE_COPY_BTN:      true,
            CODE_LINE_NUMBERS:  true,
            MATH_INLINE:        true,
            MATH_BLOCK:         true,
            EMBEDS:             true,
            FOOTNOTES:          true,
            REFERENCES:         true,
            ABBREVIATIONS:      true,
            TREE_VIEWS:         true,
            HORIZONTAL_RULES:   true,
            SMART_TYPOGRAPHY:   true,
            MENTIONS:           true,
            HASHTAGS:           true,
            EMOJIS:             true,
            VARIABLE_REFS:      true,
            RAW_HTML:           false,   // disabled by default (XSS surface)
        }),

        // ── Extended block types (:::type ... :::) ─────────────────────────────────────
        BLOCK_TYPES: Object.freeze({
            // Admonitions
            ADMONITIONS: ['note', 'tip', 'info', 'warning', 'danger', 'caution',
                          'important', 'success', 'check', 'bug', 'example',
                          'quote', 'abstract', 'todo', 'question', 'failure',
                          'help', 'hint', 'attention', 'seealso', 'summary'],

            // UI Components
            UI_BLOCKS: ['card', 'cards', 'tab', 'tabs', 'accordion',
                        'steps', 'step', 'details', 'spoiler', 'callout',
                        'badge', 'hero', 'banner', 'aside', 'section',
                        'quiz', 'exercise', 'solution', 'demo'],

            // Layouts
            LAYOUT_BLOCKS: ['column', 'col', 'column2', 'column3', 'column4',
                            'grid', 'grid2', 'grid3', 'grid4', 'flex', 'masonry',
                            'split', 'sidebar', 'panel'],

            // Documentation
            DOC_BLOCKS: ['api', 'param', 'return', 'throws', 'since',
                         'deprecated', 'experimental', 'internal',
                         'version', 'author', 'license'],
        }),

        // ── Callout icons (maps callout type → icon name for renderer) ─────────────────
        CALLOUT_ICONS: Object.freeze({
            note:      'info-circle',
            tip:       'lightbulb',
            info:      'info-circle',
            warning:   'exclamation-triangle',
            danger:    'skull',
            caution:   'exclamation-circle',
            important: 'bell',
            success:   'check-circle',
            check:     'check-circle',
            bug:       'bug',
            example:   'beaker',
            quote:     'quote-right',
            abstract:  'file-alt',
            todo:      'tasks',
            question:  'question-circle',
            failure:   'times-circle',
            hint:      'hand-point-right',
            attention: 'exclamation',
            seealso:   'link',
            summary:   'stream',
        }),

        // ── Table config ───────────────────────────────────────────────────────────────
        TABLE: Object.freeze({
            MAX_COLS:            64,
            STRIPED:             true,
            HOVERABLE:           true,
            RESPONSIVE:          true,
            CAPTION_POSITION:    'bottom',  // 'top' | 'bottom'
            DEFAULT_ALIGN:       'left',
            SORT_ENABLED:        false,
            FILTER_ENABLED:      false,
        }),

        // ── Code block config ─────────────────────────────────────────────────────────
        CODE: Object.freeze({
            DEFAULT_LANG:        'text',
            SHOW_LANG_LABEL:     true,
            SHOW_COPY_BUTTON:    true,
            SHOW_LINE_NUMBERS:   false,
            TAB_SIZE:            2,
            MAX_LINES_COLLAPSED: null,   // null = no collapse
            HIGHLIGHTED_LANGS:   [
                'javascript', 'typescript', 'python', 'rust', 'go',
                'css', 'html', 'xml', 'svg', 'json', 'yaml', 'toml',
                'bash', 'shell', 'zsh', 'sql', 'graphql',
                'cpp', 'c', 'java', 'kotlin', 'swift', 'dart',
                'markdown', 'zolto',
            ],
        }),

        // ── Embed types & providers ───────────────────────────────────────────────────
        EMBEDS: Object.freeze({
            TYPES: ['image', 'video', 'audio', 'youtube', 'vimeo', 'figma',
                    'codepen', 'codesandbox', 'stackblitz', 'replit',
                    'twitter', 'x', 'instagram', 'loom', 'miro', 'excalidraw'],
            DEFAULT_ASPECT_RATIO: '16/9',
            LAZY_LOAD:            true,
            SANDBOX:              true,     // iframe sandbox attribute
        }),

        // ── Multi-column layout defaults ──────────────────────────────────────────────
        COLUMNS: Object.freeze({
            DEFAULT_COUNT:  2,
            MAX_COUNT:      6,
            DEFAULT_GAP:    '2rem',
            RESPONSIVE_BREAKPOINT: '768px',
        }),

        // ── Documentation structure ───────────────────────────────────────────────────
        DOCS: Object.freeze({
            AUTO_TOC:           false,
            TOC_MIN_HEADINGS:   3,
            TOC_MAX_DEPTH:      3,
            BREADCRUMBS:        false,
            PREV_NEXT_NAV:      false,
            EDIT_LINK:          false,
            LAST_MODIFIED:      false,
            READING_TIME:       false,
            WORDS_PER_MINUTE:   200,
        }),
    });

    /* =====================================================================================
       §7  MATH_CONFIG — Full LaTeX-Level Mathematics Engine Config
       Covers symbols, environments, physics, chemistry, statistics notation.
       ===================================================================================== */
    const MATH_CONFIG = Object.freeze({

        // ── Renderer selection ─────────────────────────────────────────────────────────
        RENDERER:     'native',     // 'native' | 'katex' | 'mathjax'
        DISPLAY_MODE: 'block',      // default display mode for math blocks
        NUMBERING:    true,         // auto-number equations
        NUMBER_FORMAT: '({n})',     // equation number format

        // ── Environments ───────────────────────────────────────────────────────────────
        ENVIRONMENTS: Object.freeze([
            'equation', 'equation*',
            'align', 'align*',
            'gather', 'gather*',
            'multline', 'multline*',
            'cases', 'rcases',
            'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix', 'Bmatrix',
            'array', 'subarray',
            'split', 'aligned', 'gathered',
            'CD',                   // commutative diagrams
        ]),

        // ── Greek alphabet — lowercase ─────────────────────────────────────────────────
        GREEK_LOWER: Object.freeze({
            '\\alpha':   'α',  '\\beta':    'β',  '\\gamma':   'γ',  '\\delta':   'δ',
            '\\epsilon': 'ε',  '\\varepsilon': 'ε','\\zeta':   'ζ',  '\\eta':     'η',
            '\\theta':   'θ',  '\\vartheta':'ϑ',  '\\iota':   'ι',  '\\kappa':   'κ',
            '\\lambda':  'λ',  '\\mu':      'μ',  '\\nu':     'ν',  '\\xi':      'ξ',
            '\\pi':      'π',  '\\varpi':   'ϖ',  '\\rho':    'ρ',  '\\varrho':  'ϱ',
            '\\sigma':   'σ',  '\\varsigma':'ς',  '\\tau':    'τ',  '\\upsilon': 'υ',
            '\\phi':     'φ',  '\\varphi':  'φ',  '\\chi':    'χ',  '\\psi':     'ψ',
            '\\omega':   'ω',
        }),

        // ── Greek alphabet — uppercase ─────────────────────────────────────────────────
        GREEK_UPPER: Object.freeze({
            '\\Gamma':   'Γ',  '\\Delta':   'Δ',  '\\Theta':  'Θ',  '\\Lambda':  'Λ',
            '\\Xi':      'Ξ',  '\\Pi':      'Π',  '\\Sigma':  'Σ',  '\\Upsilon': 'Υ',
            '\\Phi':     'Φ',  '\\Psi':     'Ψ',  '\\Omega':  'Ω',
        }),

        // ── Binary operators ───────────────────────────────────────────────────────────
        BINARY_OPS: Object.freeze({
            '\\times':   '×',  '\\cdot':    '⋅',  '\\div':    '÷',  '\\pm':      '±',
            '\\mp':      '∓',  '\\ast':     '∗',  '\\star':   '⋆',  '\\circ':    '∘',
            '\\bullet':  '∙',  '\\oplus':   '⊕',  '\\ominus': '⊖',  '\\otimes':  '⊗',
            '\\oslash':  '⊘',  '\\odot':    '⊙',  '\\cup':    '∪',  '\\cap':     '∩',
            '\\sqcup':   '⊔',  '\\sqcap':   '⊓',  '\\wedge':  '∧',  '\\vee':     '∨',
            '\\land':    '∧',  '\\lor':     '∨',  '\\setminus':'∖',  '\\wr':      '≀',
            '\\amalg':   '⨿',
        }),

        // ── Relation operators ─────────────────────────────────────────────────────────
        RELATIONS: Object.freeze({
            '\\leq':     '≤',  '\\geq':     '≥',  '\\neq':    '≠',  '\\equiv':   '≡',
            '\\approx':  '≈',  '\\sim':     '∼',  '\\simeq':  '≃',  '\\cong':    '≅',
            '\\propto':  '∝',  '\\prec':    '≺',  '\\succ':   '≻',  '\\preceq':  '≼',
            '\\succeq':  '≽',  '\\subset':  '⊂',  '\\supset': '⊃',  '\\subseteq':'⊆',
            '\\supseteq':'⊇',  '\\sqsubseteq':'⊑','\\sqsupseteq':'⊒','\\in':      '∈',
            '\\notin':   '∉',  '\\ni':      '∋',  '\\perp':   '⊥',  '\\parallel':'∥',
            '\\mid':     '∣',  '\\nmid':    '∤',  '\\smile':  '⌣',  '\\frown':   '⌢',
        }),

        // ── Arrows ─────────────────────────────────────────────────────────────────────
        ARROWS: Object.freeze({
            '\\rightarrow':     '→',  '\\leftarrow':      '←',
            '\\uparrow':        '↑',  '\\downarrow':       '↓',
            '\\leftrightarrow': '↔',  '\\updownarrow':     '↕',
            '\\Rightarrow':     '⇒',  '\\Leftarrow':       '⇐',
            '\\Leftrightarrow': '⇔',  '\\Uparrow':         '⇑',
            '\\Downarrow':      '⇓',  '\\Updownarrow':     '⇕',
            '\\mapsto':         '↦',  '\\longmapsto':      '⟼',
            '\\longrightarrow': '⟶',  '\\longleftarrow':   '⟵',
            '\\Longrightarrow': '⟹',  '\\Longleftarrow':   '⟸',
            '\\nearrow':        '↗',  '\\searrow':         '↘',
            '\\swarrow':        '↙',  '\\nwarrow':         '↖',
            '\\rightharpoonup': '⇀',  '\\leftharpoondown': '↽',
            '\\rightleftharpoons':'⇌','\\to':              '→',
            '\\gets':           '←',  '\\hookrightarrow':  '↪',
        }),

        // ── Calculus & analysis ────────────────────────────────────────────────────────
        CALCULUS: Object.freeze({
            '\\int':      '∫',  '\\iint':    '∬',  '\\iiint':  '∭',
            '\\oint':     '∮',  '\\oiint':   '∯',  '\\oiiint': '∰',
            '\\partial':  '∂',  '\\nabla':   '∇',  '\\infty':  '∞',
            '\\sum':      '∑',  '\\prod':    '∏',  '\\coprod': '∐',
            '\\lim':      'lim','\\limsup':  'lim\u2009sup', '\\liminf': 'lim\u2009inf',
            '\\sup':      'sup','\\inf':     'inf', '\\max':    'max',
            '\\min':      'min','\\arg':     'arg', '\\det':    'det',
            '\\exp':      'exp','\\ln':      'ln',  '\\log':    'log',
            '\\sin':      'sin','\\cos':     'cos', '\\tan':    'tan',
            '\\sec':      'sec','\\csc':     'csc', '\\cot':    'cot',
            '\\arcsin':  'arcsin','\\arccos':'arccos','\\arctan':'arctan',
            '\\sinh':    'sinh','\\cosh':   'cosh', '\\tanh':  'tanh',
        }),

        // ── Set theory ─────────────────────────────────────────────────────────────────
        SETS: Object.freeze({
            '\\emptyset': '∅',  '\\varnothing':'∅', '\\forall': '∀',  '\\exists':  '∃',
            '\\nexists':  '∄',  '\\neg':     '¬',  '\\complement':'∁','\\wp':      '℘',
            '\\Re':       'ℜ',  '\\Im':      'ℑ',  '\\ell':    'ℓ',  '\\hbar':    'ℏ',
            // Number set blackboard bold (rendered as code if no font)
            '\\mathbb{R}':'ℝ',  '\\mathbb{N}':'ℕ', '\\mathbb{Z}':'ℤ',
            '\\mathbb{Q}':'ℚ',  '\\mathbb{C}':'ℂ', '\\mathbb{P}':'ℙ',
        }),

        // ── Miscellaneous ──────────────────────────────────────────────────────────────
        MISC: Object.freeze({
            '\\sqrt':     '√',  '\\angle':   '∠',  '\\measuredangle':'∡',
            '\\sphericalangle':'∢','\\degree':'°',  '\\prime':  '′',  '\\dprime':  '″',
            '\\cdots':    '⋯',  '\\ldots':   '…',  '\\vdots':  '⋮',  '\\ddots':   '⋱',
            '\\hline':    '─',  '\\triangle':'△',  '\\square': '□',  '\\diamond': '◇',
            '\\lozenge':  '◊',  '\\bigstar': '★',  '\\checkmark':'✓','\\dagger':  '†',
            '\\ddagger':  '‡',  '\\S':       '§',  '\\P':      '¶',  '\\copyright':'©',
            '\\dots':     '…',  '\\aleph':   'ℵ',  '\\beth':   'ℶ',  '\\gimel':   'ℷ',
        }),

        // ── Physics notation ───────────────────────────────────────────────────────────
        PHYSICS: Object.freeze({
            // SI units (rendered in upright)
            UNITS: ['m', 'kg', 's', 'A', 'K', 'mol', 'cd',
                    'N', 'J', 'W', 'Pa', 'C', 'V', 'F', 'Ω', 'T', 'H',
                    'Hz', 'rad', 'sr', 'lm', 'lx', 'Bq', 'Gy', 'Sv'],
            // Common notations
            '\\hbar':     'ℏ',
            '\\degree':   '°',
            '\\celsius':  '℃',
            '\\ohm':      'Ω',
            '\\micro':    'μ',
            '\\angstrom': 'Å',
            // Dirac notation
            KET_OPEN:    '|',
            KET_CLOSE:   '⟩',
            BRA_OPEN:    '⟨',
            BRA_CLOSE:   '|',
            BRAKET:      '⟨·|·⟩',
        }),

        // ── Chemistry notation ─────────────────────────────────────────────────────────
        CHEMISTRY: Object.freeze({
            REACTION_ARROWS: Object.freeze({
                FORWARD:       '→',
                REVERSE:       '←',
                EQUILIBRIUM:   '⇌',
                DOUBLE:        '⇆',
                RESONANCE:     '↔',
            }),
            STATES: Object.freeze({
                SOLID:    '(s)',
                LIQUID:   '(l)',
                GAS:      '(g)',
                AQUEOUS:  '(aq)',
            }),
            BOND_SYMBOLS: Object.freeze({
                SINGLE:   '–',
                DOUBLE:   '=',
                TRIPLE:   '≡',
                AROMATIC: '∿',
            }),
        }),

        // ── Statistics ─────────────────────────────────────────────────────────────────
        STATISTICS: Object.freeze({
            SYMBOLS: Object.freeze({
                '\\mu':       'μ',
                '\\sigma':    'σ',
                '\\sigma^2':  'σ²',
                '\\bar{x}':   'x̄',
                '\\hat{x}':   'x̂',
                '\\tilde{x}': 'x̃',
                '\\mathbb{E}':'𝔼',
                '\\mathbb{P}':'ℙ',
                '\\Var':      'Var',
                '\\Cov':      'Cov',
                '\\Corr':     'Corr',
            }),
        }),

        // ── Merged flat symbol map for fast lookup (renderer access) ───────────────────
        get SYMBOLS() {
            return Object.assign(
                {},
                MATH_CONFIG.GREEK_LOWER,
                MATH_CONFIG.GREEK_UPPER,
                MATH_CONFIG.BINARY_OPS,
                MATH_CONFIG.RELATIONS,
                MATH_CONFIG.ARROWS,
                MATH_CONFIG.CALCULUS,
                MATH_CONFIG.SETS,
                MATH_CONFIG.MISC
            );
        },

        // ── Delimiter pairs ────────────────────────────────────────────────────────────
        DELIMITERS: Object.freeze({
            PAREN:   { open: '(', close: ')',   lOpen: '\\left(', lClose: '\\right)' },
            BRACKET: { open: '[', close: ']',   lOpen: '\\left[', lClose: '\\right]' },
            BRACE:   { open: '{', close: '}',   lOpen: '\\left{', lClose: '\\right}' },
            ANGLE:   { open: '⟨', close: '⟩',  lOpen: '\\langle', lClose: '\\rangle' },
            FLOOR:   { open: '⌊', close: '⌋',  lOpen: '\\lfloor', lClose: '\\rfloor' },
            CEIL:    { open: '⌈', close: '⌉',  lOpen: '\\lceil',  lClose: '\\rceil'  },
            VERT:    { open: '|', close: '|',   lOpen: '\\lvert',  lClose: '\\rvert'  },
            DVERT:   { open: '‖', close: '‖',  lOpen: '\\lVert',  lClose: '\\rVert'  },
        }),

        // ── Macros (user-extendable at runtime) ────────────────────────────────────────
        MACROS: Object.freeze({
            '\\R':    '\\mathbb{R}',
            '\\N':    '\\mathbb{N}',
            '\\Z':    '\\mathbb{Z}',
            '\\Q':    '\\mathbb{Q}',
            '\\C':    '\\mathbb{C}',
            '\\P':    '\\mathbb{P}',
            '\\E':    '\\mathbb{E}',
            '\\d':    '\\mathrm{d}',  // upright differential
            '\\eps':  '\\varepsilon',
            '\\vphi': '\\varphi',
        }),
    });

    /* =====================================================================================
       §8  DIAGRAM_CONFIG — All Diagram Types: Themes, Layout, Animations, Interactivity
       ===================================================================================== */
    const DIAGRAM_CONFIG = Object.freeze({

        // ── All supported diagram types ────────────────────────────────────────────────
        TYPES: Object.freeze([
            // Data viz
            'pie', 'bar', 'line', 'area', 'scatter', 'bubble', 'radar',
            'polar', 'donut', 'histogram', 'treemap', 'funnel', 'gauge',
            'waterfall', 'heatmap', 'sankey', 'quadrant',
            // Process & system
            'flowchart', 'sequence', 'gantt', 'state', 'timeline',
            'pipeline', 'kanban', 'gitgraph',
            // Architecture & modeling
            'mindmap', 'er', 'network', 'architecture', 'dependency',
            'tree', 'logic', 'graph',
        ]),

        // ── Direction aliases ──────────────────────────────────────────────────────────
        DIRECTIONS: Object.freeze({
            LR: 'left-to-right',
            RL: 'right-to-left',
            TB: 'top-to-bottom',
            BT: 'bottom-to-top',
            TD: 'top-down',          // alias for TB
        }),

        // ── Default layout settings ────────────────────────────────────────────────────
        LAYOUT: Object.freeze({
            DEFAULT_DIR:            'LR',
            NODE_MIN_WIDTH:          80,
            NODE_MIN_HEIGHT:         36,
            NODE_PADDING_X:          20,
            NODE_PADDING_Y:          12,
            RANK_SEP:                80,    // spacing between ranks
            NODE_SEP:                40,    // spacing between nodes in same rank
            EDGE_SEP:                10,
            MARGIN_X:                40,
            MARGIN_Y:                40,
            CURVE:                 'basis',  // 'basis' | 'linear' | 'step' | 'cardinal'
        }),

        // ── Themes ────────────────────────────────────────────────────────────────────
        THEMES: Object.freeze({
            DEFAULT: Object.freeze({
                name:          'default',
                NODE_FILL:     'var(--bg-node)',
                NODE_STROKE:   'var(--border-heavy)',
                NODE_TEXT:     'var(--text-main)',
                EDGE_STROKE:   'var(--edge-color)',
                EDGE_WIDTH:     2,
                BG:            'transparent',
                FONT_FAMILY:   'var(--font-sans)',
                FONT_SIZE:     14,
                BORDER_RADIUS:  6,
            }),
            DARK: Object.freeze({
                name:          'dark',
                NODE_FILL:     '#1e293b',
                NODE_STROKE:   '#334155',
                NODE_TEXT:     '#e2e8f0',
                EDGE_STROKE:   '#64748b',
                EDGE_WIDTH:     2,
                BG:            '#0f172a',
                FONT_FAMILY:   'var(--font-sans)',
                FONT_SIZE:     14,
                BORDER_RADIUS:  6,
            }),
            LIGHT: Object.freeze({
                name:          'light',
                NODE_FILL:     '#f8fafc',
                NODE_STROKE:   '#cbd5e1',
                NODE_TEXT:     '#0f172a',
                EDGE_STROKE:   '#94a3b8',
                EDGE_WIDTH:     2,
                BG:            '#ffffff',
                FONT_FAMILY:   'var(--font-sans)',
                FONT_SIZE:     14,
                BORDER_RADIUS:  6,
            }),
            BLUEPRINT: Object.freeze({
                name:          'blueprint',
                NODE_FILL:     '#1e3a5f',
                NODE_STROKE:   '#3b82f6',
                NODE_TEXT:     '#bfdbfe',
                EDGE_STROKE:   '#60a5fa',
                EDGE_WIDTH:     1.5,
                BG:            '#0c1e33',
                FONT_FAMILY:   'var(--font-mono)',
                FONT_SIZE:     13,
                BORDER_RADIUS:  2,
            }),
        }),

        // ── Sequence diagram ───────────────────────────────────────────────────────────
        SEQUENCE: Object.freeze({
            ACTOR_WIDTH:         120,
            ACTOR_HEIGHT:         40,
            ACTOR_SPACING:       160,
            HEADER_HEIGHT:        60,
            MESSAGE_SPACING:      50,
            NOTE_OFFSET:          10,
            LIFELINE_DASH:       '5,5',
            ACTIVATION_WIDTH:     10,
            GROUP_PADDING:        16,
        }),

        // ── Gantt ──────────────────────────────────────────────────────────────────────
        GANTT: Object.freeze({
            ROW_HEIGHT:           30,
            BAR_HEIGHT:           20,
            BAR_CORNER_RADIUS:     3,
            HEADER_HEIGHT:        40,
            LABEL_WIDTH:         150,
            GRID_COLOR:          'rgba(128,128,128,0.2)',
            TODAY_COLOR:         '#ef4444',
            BAR_COLORS: Object.freeze({
                default:   'var(--intent-primary)',
                crit:      'var(--intent-danger)',
                done:      'var(--intent-success)',
                active:    'var(--intent-warning)',
                milestone: '#8b5cf6',
            }),
            DATE_FORMATS: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD'],
        }),

        // ── Mindmap ───────────────────────────────────────────────────────────────────
        MINDMAP: Object.freeze({
            LAYOUTS:         ['radial', 'tree', 'compact', 'horizontal'],
            DEFAULT_LAYOUT:  'radial',
            LEVEL_COLORS:    ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'],
            NODE_RADIUS:      28,
            BRANCH_WIDTH:      2,
            BRANCH_TENSION:   0.4,
            LABEL_OFFSET:     10,
        }),

        // ── Interactivity ─────────────────────────────────────────────────────────────
        INTERACTIVITY: Object.freeze({
            NODE_HOVER:          true,
            NODE_CLICK:          true,
            NODE_DRAG:           false,   // drag-to-reposition (canvas mode only)
            EDGE_HOVER:          true,
            ZOOM:                true,
            PAN:                 true,
            ANIMATE_ENTRY:       true,
            ENTRY_DURATION_MS:   400,
            ENTRY_EASING:        'cubic-bezier(0.4, 0, 0.2, 1)',
        }),

        // ── Edge operator styles ────────────────────────────────────────────────────────
        EDGE_STYLES: Object.freeze({
            '-->':   { dash: 'none',   arrowEnd: true,  arrowStart: false, width: 2 },
            '==>':   { dash: 'none',   arrowEnd: true,  arrowStart: false, width: 4 },
            '-.->':  { dash: '6,4',    arrowEnd: true,  arrowStart: false, width: 2 },
            '---':   { dash: 'none',   arrowEnd: false, arrowStart: false, width: 2 },
            '<-->':  { dash: 'none',   arrowEnd: true,  arrowStart: true,  width: 2 },
            '~~>':   { dash: '2,4',    arrowEnd: true,  arrowStart: false, width: 2 },
            '..>':   { dash: '3,6',    arrowEnd: true,  arrowStart: false, width: 1.5 },
            '--|>':  { dash: 'none',   arrowEnd: 'open', arrowStart: false,width: 2 },
        }),
    });

    /* =====================================================================================
       §9  VECTOR_CONFIG — SVG & Native Graphics Engine Configuration
       ===================================================================================== */
    const VECTOR_CONFIG = Object.freeze({

        // ── Default artboard ──────────────────────────────────────────────────────────
        DEFAULT_WIDTH:     800,
        DEFAULT_HEIGHT:    600,
        DEFAULT_VIEWBOX:   '0 0 800 600',
        UNITS:             'px',           // 'px' | 'mm' | 'pt' | 'cm'

        // ── Supported shape primitives ─────────────────────────────────────────────────
        SHAPES: Object.freeze([
            'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline',
            'line', 'text', 'image', 'arc', 'bezier', 'spline', 'star',
            'arrow', 'group', 'symbol', 'use', 'clipPath', 'mask',
        ]),

        // ── Default stroke/fill ───────────────────────────────────────────────────────
        DEFAULTS: Object.freeze({
            FILL:              'none',
            STROKE:            'var(--text-main)',
            STROKE_WIDTH:       2,
            STROKE_LINECAP:    'round',
            STROKE_LINEJOIN:   'round',
            OPACITY:            1,
            FONT_SIZE:          14,
            FONT_FAMILY:       'var(--font-sans)',
            TEXT_ANCHOR:       'start',       // 'start' | 'middle' | 'end'
        }),

        // ── Gradient presets ──────────────────────────────────────────────────────────
        GRADIENTS: Object.freeze({
            HORIZONTAL: { x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
            VERTICAL:   { x1: '0%', y1: '0%', x2: '0%',   y2: '100%' },
            DIAGONAL:   { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
            RADIAL:     { cx: '50%', cy: '50%', r: '50%' },
        }),

        // ── Filter presets ────────────────────────────────────────────────────────────
        FILTERS: Object.freeze({
            DROP_SHADOW: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
            GLOW:        'drop-shadow(0 0 8px var(--intent-primary))',
            BLUR_SM:     'blur(2px)',
            BLUR_MD:     'blur(6px)',
            BLUR_LG:     'blur(12px)',
            GRAYSCALE:   'grayscale(1)',
            INVERT:      'invert(1)',
        }),

        // ── Layer system ──────────────────────────────────────────────────────────────
        LAYERS: Object.freeze({
            KINDS:            ['normal', 'front', 'back', 'above', 'below', 'canvas'],
            DEFAULT_KIND:     'normal',
            MAX_LAYERS:        32,
            LOCK_ON_EXPORT:   false,
        }),

        // ── Smart snap & grid ─────────────────────────────────────────────────────────
        SNAP: Object.freeze({
            GRID_SIZE:        24,
            THRESHOLD:        12,
            TO_GRID:          false,
            TO_OBJECTS:       true,
            TO_MIDPOINTS:     true,
            TO_ANCHORS:       true,
            SHOW_GUIDES:      true,
            GUIDE_COLOR:     '#3b82f6',
            GUIDE_DASH:      '4,4',
        }),

        // ── Camera & zoom ─────────────────────────────────────────────────────────────
        CAMERA: Object.freeze({
            ZOOM_MIN:         0.1,
            ZOOM_MAX:         20.0,
            ZOOM_DEFAULT:     1.0,
            ZOOM_FIT_PADDING: 32,
            PAN_INERTIA:      true,
            SCROLL_ZOOM:      true,
            PINCH_ZOOM:       true,
        }),

        // ── Connector routing modes ───────────────────────────────────────────────────
        CONNECTOR_MODES: Object.freeze(['straight', 'curved', 'elbow', 'smart', 'orthogonal']),
        DEFAULT_CONNECTOR: 'curved',

        // ── Export formats ────────────────────────────────────────────────────────────
        EXPORT_FORMATS: Object.freeze(['svg', 'png', 'jpg', 'pdf', 'webp']),
        DEFAULT_EXPORT_DPI: 144,
    });

    /* =====================================================================================
       §10  LAYOUT_CONFIG — Spatial Layout System Configuration
       ===================================================================================== */
    const LAYOUT_CONFIG = Object.freeze({

        // ── Supported layout modes ─────────────────────────────────────────────────────
        MODES: Object.freeze([
            'flex-row', 'flex-col', 'flex-row-wrap', 'flex-center',
            'grid', 'grid-2', 'grid-3', 'grid-4', 'grid-auto', 'masonry',
            'columns-2', 'columns-3', 'columns-4',
            'absolute', 'relative', 'sticky',
            'canvas', 'whiteboard', 'presentation',
            'split', 'split-vertical',
            'panel', 'sidebar', 'modal', 'drawer', 'popover', 'tooltip',
        ]),

        // ── Flex defaults ─────────────────────────────────────────────────────────────
        FLEX: Object.freeze({
            DEFAULT_DIRECTION:  'row',
            DEFAULT_GAP:        '1rem',
            DEFAULT_ALIGN:      'flex-start',
            DEFAULT_JUSTIFY:    'flex-start',
            DEFAULT_WRAP:       false,
        }),

        // ── Grid defaults ─────────────────────────────────────────────────────────────
        GRID: Object.freeze({
            DEFAULT_COLS:       3,
            DEFAULT_GAP:        '1rem',
            DEFAULT_ROW_GAP:    '1rem',
            AUTO_FLOW:          'row',     // 'row' | 'column' | 'dense'
            MIN_CELL_WIDTH:    '200px',    // for auto-fill grids
        }),

        // ── Masonry defaults ──────────────────────────────────────────────────────────
        MASONRY: Object.freeze({
            DEFAULT_COLS:       3,
            DEFAULT_GAP:        '1rem',
            STAGGER:            true,
            STAGGER_DELAY_MS:   60,
        }),

        // ── Responsive breakpoints ────────────────────────────────────────────────────
        BREAKPOINTS: Object.freeze({
            XS:   '480px',
            SM:   '640px',
            MD:   '768px',
            LG:  '1024px',
            XL:  '1280px',
            XXL: '1536px',
        }),

        // ── Container config ──────────────────────────────────────────────────────────
        CONTAINER: Object.freeze({
            MAX_WIDTH:         '1400px',
            PADDING_X:          '2rem',
            PADDING_Y:          '1.5rem',
        }),

        // ── Split view defaults ───────────────────────────────────────────────────────
        SPLIT: Object.freeze({
            DEFAULT_RATIO:     '50/50',
            MIN_PANE_SIZE:     '80px',
            SPLITTER_SIZE:      '4px',
            SPLITTER_COLOR:    'var(--border-heavy)',
            COLLAPSIBLE:        true,
        }),

        // ── Panel defaults ────────────────────────────────────────────────────────────
        PANEL: Object.freeze({
            DEFAULT_WIDTH:     '320px',
            MIN_WIDTH:         '200px',
            MAX_WIDTH:         '600px',
            COLLAPSIBLE:        true,
            RESIZABLE:          true,
            SHADOW:             true,
        }),

        // ── Presentation mode ─────────────────────────────────────────────────────────
        PRESENTATION: Object.freeze({
            SLIDE_W:           1280,
            SLIDE_H:            720,
            ASPECT:            '16:9',
            SHOW_CONTROLS:      true,
            SHOW_PROGRESS:      true,
            KEYBOARD_NAV:       true,
            FULLSCREEN:         true,
            TRANSITION:        'fade',
        }),

        // ── Constraint system ─────────────────────────────────────────────────────────
        CONSTRAINTS: Object.freeze({
            SUPPORTED:          true,
            TYPES: Object.freeze([
                'pin', 'center', 'fill', 'hug',
                'fixed-width', 'fixed-height',
                'aspect-ratio', 'min-width', 'max-width',
            ]),
        }),
    });

    /* =====================================================================================
       §11  COMPONENT_CONFIG — Component, Template, Slot, Variant & Design System Config
       ===================================================================================== */
    const COMPONENT_CONFIG = Object.freeze({

        // ── Runtime settings ──────────────────────────────────────────────────────────
        STRICT_MODE:        false,
        HOT_RELOAD:         true,
        MAX_DEPTH:           32,        // maximum component nesting depth
        CACHE_COMPONENTS:   true,
        CACHE_MAX_SIZE:     256,

        // ── Prop types ────────────────────────────────────────────────────────────────
        PROP_TYPES: Object.freeze([
            'string', 'number', 'boolean', 'array', 'object',
            'function', 'node', 'any', 'enum', 'color', 'size',
        ]),

        // ── Slot defaults ─────────────────────────────────────────────────────────────
        SLOTS: Object.freeze({
            DEFAULT_NAME:   'default',
            NAMED_SLOTS:     true,
            SCOPED_SLOTS:    true,
            FALLBACK:        true,   // render fallback if slot not filled
        }),

        // ── Variant system ────────────────────────────────────────────────────────────
        VARIANTS: Object.freeze({
            SIZE:    Object.freeze(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
            INTENT:  Object.freeze(['default', 'primary', 'success', 'warning', 'danger', 'info', 'ghost', 'outline']),
            SHAPE:   Object.freeze(['square', 'rounded', 'pill', 'circle']),
            WEIGHT:  Object.freeze(['light', 'normal', 'medium', 'bold']),
        }),

        // ── Theme inheritance ─────────────────────────────────────────────────────────
        THEME_INHERITANCE: Object.freeze({
            ENABLED:         true,
            SCOPE:          'component',  // 'component' | 'subtree' | 'global'
            CSS_VARS:        true,
            DARK_CLASS:     'dark',
            LIGHT_CLASS:    'light',
        }),

        // ── Macro system ──────────────────────────────────────────────────────────────
        MACROS: Object.freeze({
            MAX_PARAMS:      16,
            RECURSION_LIMIT:  8,
            INLINE_MACROS:    true,
            BLOCK_MACROS:     true,
        }),

        // ── Built-in component registry (keys match ComponentUse.componentName) ────────
        BUILTIN: Object.freeze([
            'Button', 'Badge', 'Card', 'Callout', 'Tabs', 'Accordion',
            'Alert', 'Avatar', 'Breadcrumb', 'Chip', 'Code',
            'Divider', 'Icon', 'Image', 'Input', 'Label', 'Link',
            'List', 'Menu', 'Modal', 'Popover', 'Progress',
            'Select', 'Spinner', 'Steps', 'Table', 'Tag',
            'Timeline', 'Tooltip', 'Tree',
            // Layout
            'Box', 'Flex', 'Grid', 'Stack', 'Center', 'Spacer',
            'Container', 'Section', 'Aside', 'Panel', 'Split',
            // Math & Diagram
            'Math', 'Diagram', 'Chart', 'Embed', 'Canvas',
        ]),
    });

    /* =====================================================================================
       §12  CHART_CONFIG — Data Visualisation Defaults per Chart Type
       ===================================================================================== */
    const CHART_CONFIG = Object.freeze({

        GLOBAL: Object.freeze({
            WIDTH_DEFAULT:          600,
            HEIGHT_DEFAULT:         400,
            PADDING:                 40,
            FONT_FAMILY:           'var(--font-sans)',
            TITLE_SIZE:              18,
            AXIS_LABEL_SIZE:         12,
            LEGEND_FONT_SIZE:        12,
            ANIMATION_DURATION_MS:  800,
            EASING:                'cubic-bezier(0.4, 0, 0.2, 1)',
            RESPONSIVE:              true,
            MAINTAIN_ASPECT_RATIO:   true,
            TOOLTIPS:                true,
            LEGEND:                  true,
            ACCESSIBLE:              true,   // aria-labels on SVG paths
        }),

        // ── Colour palettes ───────────────────────────────────────────────────────────
        PALETTES: Object.freeze({
            DEFAULT:    ['#3b82f6','#22c55e','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'],
            MONOCHROME: ['#1e293b','#334155','#475569','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#f1f5f9'],
            PASTEL:     ['#bfdbfe','#bbf7d0','#fde68a','#fecaca','#bae6fd','#ddd6fe','#fbcfe8','#ccfbf1','#fed7aa','#d9f99d'],
            VIBRANT:    ['#2563eb','#16a34a','#d97706','#dc2626','#0284c7','#7c3aed','#db2777','#0d9488'],
            NEON:       ['#38bdf8','#4ade80','#facc15','#f87171','#60a5fa','#a78bfa','#f472b6','#34d399'],
        }),

        // ── Per-type config ───────────────────────────────────────────────────────────
        BAR: Object.freeze({
            GAP_RATIO:          0.2,
            GROUP_GAP_RATIO:    0.05,
            CORNER_RADIUS:       4,
            SHOW_VALUES:         true,
            VALUE_POSITION:     'top',   // 'top' | 'inside' | 'bottom'
            ORIENTATION:        'vertical',
            STACKED:             false,
            NORMALIZED:          false,
        }),

        PIE: Object.freeze({
            DONUT_RATIO:                0.5,
            MIN_ANGLE_FOR_LABEL_RAD:    0.15,
            EXPLODE_HOVER_OFFSET:       10,
            LABEL_LINE_LENGTH:          20,
            SHOW_PERCENTAGE:            true,
            SHOW_VALUES:                false,
            LEGEND_POSITION:           'right',
        }),

        LINE: Object.freeze({
            CURVE_TENSION:       0.3,
            POINT_RADIUS:         5,
            POINT_HOVER_RADIUS:   8,
            SHOW_AREA:            true,
            AREA_OPACITY:         0.15,
            SMOOTH:               true,
            SHOW_POINTS:          true,
            FILL_BELOW:          false,
        }),

        AREA: Object.freeze({
            CURVE_TENSION:       0.4,
            OPACITY:             0.6,
            STACKED:             false,
            GRADIENT:            true,
        }),

        SCATTER: Object.freeze({
            POINT_RADIUS:         5,
            POINT_HOVER_RADIUS:   8,
            SHOW_TRENDLINE:      false,
            TRENDLINE_DASH:      '4,4',
        }),

        RADAR: Object.freeze({
            FILL_OPACITY:        0.25,
            POINT_RADIUS:         3,
            LEVELS:               5,
            ANGLE_LINES:          true,
        }),

        HEATMAP: Object.freeze({
            COLOR_LOW:          '#bfdbfe',
            COLOR_HIGH:         '#1d4ed8',
            CELL_SIZE:           24,
            CELL_GAP:             2,
            SHOW_VALUES:          true,
        }),

        SANKEY: Object.freeze({
            NODE_WIDTH:          20,
            NODE_PAD:            10,
            LINK_OPACITY:        0.4,
            LINK_HOVER_OPACITY:  0.7,
        }),

        GAUGE: Object.freeze({
            MIN:                   0,
            MAX:                 100,
            THRESHOLD_WARNING:    60,
            THRESHOLD_DANGER:     80,
            ARC_WIDTH:            20,
            NEEDLE:               true,
        }),

        SEQUENCE: Object.freeze({
            ACTOR_WIDTH:         120,
            ACTOR_HEIGHT:         40,
            MESSAGE_SPACING:      50,
            LIFELINE_DASH:       '5,5',
        }),

        GANTT: Object.freeze({
            ROW_HEIGHT:           30,
            BAR_HEIGHT:           20,
            GRID_COLOR:          'rgba(128,128,128,0.2)',
            TODAY_MARKER_COLOR:  '#ef4444',
        }),

        TREEMAP: Object.freeze({
            PADDING:              2,
            LABEL_MIN_SIZE:      40,
            SHOW_PARENT_LABELS:   true,
        }),

        WATERFALL: Object.freeze({
            POSITIVE_COLOR:     'var(--intent-success)',
            NEGATIVE_COLOR:     'var(--intent-danger)',
            TOTAL_COLOR:        'var(--intent-primary)',
            CONNECTOR_LINE:      true,
        }),
    });

    /* =====================================================================================
       §13  THEME — Design Token System
       CSS custom property names → default values for dark and light themes.
       ===================================================================================== */
    const THEME = Object.freeze({

        // ── Available themes ──────────────────────────────────────────────────────────
        AVAILABLE: Object.freeze(['dark', 'light', 'midnight', 'solarized', 'catppuccin', 'nord', 'custom']),
        DEFAULT:   'dark',

        // ── Token namespaces ──────────────────────────────────────────────────────────
        NAMESPACES: Object.freeze({
            BG:       '--bg-',        // backgrounds
            TEXT:     '--text-',      // text colours
            BORDER:   '--border-',    // borders
            INTENT:   '--intent-',    // semantic intent colours
            FONT:     '--font-',      // font stacks
            RADIUS:   '--radius-',    // border radius
            SHADOW:   '--shadow-',    // box shadow
            EDGE:     '--edge-',      // diagram edge colours
        }),

        // ── Dark theme tokens ─────────────────────────────────────────────────────────
        DARK: Object.freeze({
            '--bg-base':              '#0f172a',
            '--bg-panel':             '#1e293b',
            '--bg-node':              '#1e293b',
            '--bg-elevated':          '#334155',
            '--bg-hover':             '#2d3f55',
            '--bg-selected':          '#1d3a5f',
            '--bg-overlay':           'rgba(0,0,0,0.5)',
            '--text-main':            '#e2e8f0',
            '--text-body':            '#cbd5e1',
            '--text-mute':            '#64748b',
            '--text-disabled':        '#475569',
            '--text-inverted':        '#0f172a',
            '--text-code':            '#7dd3fc',
            '--border-default':       '#334155',
            '--border-heavy':         '#475569',
            '--border-light':         '#1e293b',
            '--intent-primary':       '#3b82f6',
            '--intent-success':       '#22c55e',
            '--intent-warning':       '#f59e0b',
            '--intent-danger':        '#ef4444',
            '--intent-info':          '#0ea5e9',
            '--intent-purple':        '#8b5cf6',
            '--intent-pink':          '#ec4899',
            '--font-sans':            '"Inter",system-ui,sans-serif',
            '--font-mono':            '"JetBrains Mono",monospace',
            '--font-serif':           '"Lora",serif',
            '--radius-sm':            '4px',
            '--radius-md':            '8px',
            '--radius-lg':            '12px',
            '--radius-xl':            '16px',
            '--radius-pill':          '9999px',
            '--shadow-sm':            '0 1px 3px rgba(0,0,0,0.3)',
            '--shadow-md':            '0 4px 12px rgba(0,0,0,0.4)',
            '--shadow-lg':            '0 8px 24px rgba(0,0,0,0.5)',
            '--edge-color':           '#64748b',
            '--edge-marker-color':    '#94a3b8',
        }),

        // ── Light theme tokens ─────────────────────────────────────────────────────────
        LIGHT: Object.freeze({
            '--bg-base':              '#ffffff',
            '--bg-panel':             '#f8fafc',
            '--bg-node':              '#ffffff',
            '--bg-elevated':          '#f1f5f9',
            '--bg-hover':             '#e2e8f0',
            '--bg-selected':          '#dbeafe',
            '--bg-overlay':           'rgba(0,0,0,0.3)',
            '--text-main':            '#0f172a',
            '--text-body':            '#1e293b',
            '--text-mute':            '#64748b',
            '--text-disabled':        '#94a3b8',
            '--text-inverted':        '#ffffff',
            '--text-code':            '#1d4ed8',
            '--border-default':       '#e2e8f0',
            '--border-heavy':         '#cbd5e1',
            '--border-light':         '#f1f5f9',
            '--intent-primary':       '#2563eb',
            '--intent-success':       '#16a34a',
            '--intent-warning':       '#d97706',
            '--intent-danger':        '#dc2626',
            '--intent-info':          '#0284c7',
            '--intent-purple':        '#7c3aed',
            '--intent-pink':          '#db2777',
            '--font-sans':            '"Inter",system-ui,sans-serif',
            '--font-mono':            '"JetBrains Mono",monospace',
            '--font-serif':           '"Lora",serif',
            '--radius-sm':            '4px',
            '--radius-md':            '8px',
            '--radius-lg':            '12px',
            '--radius-xl':            '16px',
            '--radius-pill':          '9999px',
            '--shadow-sm':            '0 1px 3px rgba(0,0,0,0.08)',
            '--shadow-md':            '0 4px 12px rgba(0,0,0,0.12)',
            '--shadow-lg':            '0 8px 24px rgba(0,0,0,0.16)',
            '--edge-color':           '#94a3b8',
            '--edge-marker-color':    '#64748b',
        }),

        // ── CSS variable injection helper ─────────────────────────────────────────────
        injectTheme(themeName, target = document.documentElement) {
            const tokens = THEME[themeName.toUpperCase()];
            if (!tokens) return;
            for (const [k, v] of Object.entries(tokens)) {
                target.style.setProperty(k, v);
            }
            target.setAttribute('data-theme', themeName);
        },
    });

    /* =====================================================================================
       §14  ANIMATION_CONFIG — Keyframe, Timing Function, Transition & Motion Presets
       ===================================================================================== */
    const ANIMATION_CONFIG = Object.freeze({

        // ── Easing functions ──────────────────────────────────────────────────────────
        EASINGS: Object.freeze({
            LINEAR:        'linear',
            EASE:          'ease',
            EASE_IN:       'ease-in',
            EASE_OUT:      'ease-out',
            EASE_IN_OUT:   'ease-in-out',
            // Material & Apple spring curves
            STANDARD:      'cubic-bezier(0.4, 0.0, 0.2, 1)',
            DECELERATE:    'cubic-bezier(0.0, 0.0, 0.2, 1)',
            ACCELERATE:    'cubic-bezier(0.4, 0.0, 1.0, 1)',
            SHARP:         'cubic-bezier(0.4, 0.0, 0.6, 1)',
            SPRING:        'cubic-bezier(0.34, 1.56, 0.64, 1)',
            BOUNCE:        'cubic-bezier(0.34, 1.8, 0.64, 1)',
            SMOOTH:        'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
        }),

        // ── Duration presets (ms) ─────────────────────────────────────────────────────
        DURATIONS: Object.freeze({
            INSTANT:       0,
            MICRO:        80,
            FAST:        150,
            NORMAL:      250,
            SLOW:        400,
            VERY_SLOW:   700,
            DRAMATIC:   1200,
        }),

        // ── Entry animation presets ───────────────────────────────────────────────────
        ENTRY_PRESETS: Object.freeze({
            FADE_IN:      { from: { opacity: 0 },                    to: { opacity: 1 } },
            SLIDE_UP:     { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            SLIDE_DOWN:   { from: { opacity: 0, transform: 'translateY(-16px)'},  to: { opacity: 1, transform: 'translateY(0)' } },
            SLIDE_LEFT:   { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
            SLIDE_RIGHT:  { from: { opacity: 0, transform: 'translateX(-16px)'},  to: { opacity: 1, transform: 'translateX(0)' } },
            SCALE_IN:     { from: { opacity: 0, transform: 'scale(0.92)' }, to: { opacity: 1, transform: 'scale(1)' } },
            SCALE_UP:     { from: { opacity: 0, transform: 'scale(0.5)' },  to: { opacity: 1, transform: 'scale(1)' } },
            BLUR_IN:      { from: { opacity: 0, filter: 'blur(8px)' },      to: { opacity: 1, filter: 'blur(0)' } },
        }),

        // ── Stagger defaults (for list/diagram node entry) ─────────────────────────────
        STAGGER: Object.freeze({
            ENABLED:        true,
            DELAY_MS:        40,     // per-child delay
            MAX_DELAY_MS:   600,     // cap total stagger delay
            REVERSE:        false,
        }),

        // ── Diagram-specific animations ───────────────────────────────────────────────
        DIAGRAM: Object.freeze({
            EDGE_DRAW:          true,   // animate edge stroke-dashoffset on entry
            NODE_POP:           true,   // scale-in nodes
            SEQUENCE_STEP:      true,   // step-by-step sequence replay
            STEP_DELAY_MS:     400,
        }),

        // ── Math animation ────────────────────────────────────────────────────────────
        MATH: Object.freeze({
            FORMULA_FADE:       true,
            FORMULA_DELAY_MS:    80,
        }),

        // ── Reduce motion (prefers-reduced-motion) ────────────────────────────────────
        RESPECT_REDUCED_MOTION: true,
    });

    /* =====================================================================================
       §15  GRAMMAR — Regex Dictionary Aligned with tokenizer.js v8
       This section documents the canonical patterns for each Zolto syntactic construct.
       The tokenizer.js file is the authoritative runtime implementation;
       this config provides the named lookup table for tools, linters, and editors.
       ===================================================================================== */
    const GRAMMAR = Object.freeze({

        // ── Structural ─────────────────────────────────────────────────────────────────
        BLANK_LINE:           /^\s*$/,
        HEADING:              /^(#{1,6})\s+(.*?)(?:\s+\{([^}]*)})?\s*$/,
        HORIZONTAL_RULE:      /^(?:[-*_=~])\1{2,}\s*$/,
        FRONTMATTER_DELIM:    /^---\s*$/,

        // ── Comments ───────────────────────────────────────────────────────────────────
        COMMENT_LINE:         /^\/\/\s?(.*)$/,
        BLOCK_COMMENT_START:  /^\/\*\s?(.*)$/,
        BLOCK_COMMENT_END:    /^(.*?)\*\/\s*$/,

        // ── Imports, variables, theming ────────────────────────────────────────────────
        IMPORT_STMT:          /^@import\s+"([^"]+)"(?:\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*$/,
        VARIABLE_DEF:         /^\$([a-zA-Z_][a-zA-Z0-9_-]*)\s*(?::=|=)\s*(.+)$/,
        THEME_VAR:            /^--([a-zA-Z0-9_-]+)\s*:\s*(.+)$/,

        // ── Quotes & callouts ──────────────────────────────────────────────────────────
        QUOTE:                /^>\s*(.*)$/,
        CALLOUT:              /^>\s*\[!([a-zA-Z]+)\]\s*(.*)$/,

        // ── Lists ─────────────────────────────────────────────────────────────────────
        CHECKLIST_ITEM:       /^(\s*)([-*+])\s+\[([ xXoO?\/!~])\]\s+(.*)$/,
        LIST_ITEM:            /^(\s*)([-*+])\s+(.*)$/,
        ORDERED_LIST_ITEM:    /^(\s*)(\d+)([.):]) (.*)$/,
        DEFINITION_TERM:      /^:\s+(.+)$/,
        DEFINITION_DEF:       /^::\s+(.+)$/,

        // ── Tables ────────────────────────────────────────────────────────────────────
        TABLE_ROW:            /^\|(.+)\|$/,
        TABLE_DIVIDER:        /^\|(?:\s*:?-{1,}\s*:?\s*\|)+$/,

        // ── Code, math, diagram fences ─────────────────────────────────────────────────
        CODE_FENCE:           /^`{3}([a-zA-Z0-9_+#.\-]*)(?:\s+(.*))?$/,
        TILDE_FENCE:          /^~{3}([a-zA-Z0-9_+#.\-]*)(?:\s+(.*))?$/,
        MATH_BLOCK_START:     /^(?:\$\$|math(?:\s+([a-zA-Z0-9_-]+))?)(?:\s+\{(.*))?\s*$/i,
        MATH_EQUATION:        /^eq(?:uation)?\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$/i,
        MATH_INLINE:          /\$([^$\n]+)\$/g,
        MATH_INLINE_DISPLAY:  /\$\$([^$]+)\$\$/g,

        // ── Inline chart ───────────────────────────────────────────────────────────────
        CHART_INLINE:         /^(PIE|BAR|LINE|AREA|SCATTER|BUBBLE|RADAR|POLAR|DONUT|HISTOGRAM|TREEMAP|FUNNEL|GAUGE|WATERFALL)\s*:\s*(.*)$/i,

        // ── Diagram block ──────────────────────────────────────────────────────────────
        DIAGRAM_BLOCK_START:  /^(flowchart|sequence|mindmap|statechart|erd|network|architecture|gantt|timeline|dependency|logic|pipeline|graph|digraph|tree|sankey|quadrant|gitgraph|kanban|radar|heatmap)\s+(?:(LR|RL|TB|BT|TD)\s+)?([a-zA-Z0-9_-]*)?\s*\{\s*$/i,
        DIAGRAM_BLOCK_END:    /^\}\s*$/,
        DIAGRAM_DIR:          /^(LR|RL|TB|BT|TD)$/,

        // ── Graph nodes (flowchart body) ───────────────────────────────────────────────
        GRAPH_NODE_RECT:      /^([a-zA-Z0-9_]+)\[([^\]]*)\](?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
        GRAPH_NODE_ROUND:     /^([a-zA-Z0-9_]+)\(([^)]*)\)(?!\))(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
        GRAPH_NODE_CIRCLE:    /^([a-zA-Z0-9_]+)\(\(([^)]*)\)\)(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
        GRAPH_NODE_DIAMOND:   /^([a-zA-Z0-9_]+)\{([^}]*)\}(?!\})(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
        GRAPH_NODE_HEX:       /^([a-zA-Z0-9_]+)\{\{([^}]*)\}\}(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
        GRAPH_NODE_STADIUM:   /^([a-zA-Z0-9_]+)\(\[([^\]]*)\]\)(?:\s*:::([a-zA-Z0-9_\s-]+))?\s*$/,
        GRAPH_EDGE:           /^([a-zA-Z0-9_]+(?:\s*&\s*[a-zA-Z0-9_]+)*)\s*(-->|---|-\.->|==>|===|--[ox]|<-->|~~>|-\.->|===>|-->>)\s*(?:\|([^|]*)\|\s*)?([a-zA-Z0-9_]+(?:\s*&\s*[a-zA-Z0-9_]+)*)\s*$/,
        GRAPH_SUBGRAPH:       /^subgraph\s+([a-zA-Z0-9_]*)(?:\s*\[([^\]]*)\])?\s*$/i,

        // ── Sequence diagram ───────────────────────────────────────────────────────────
        SEQUENCE_ACTOR:       /^(?:actor|participant|database|boundary|control|entity|collections|queue)\s+([a-zA-Z0-9_]+)(?:\s+as\s+(.+))?\s*$/i,
        SEQUENCE_MSG:         /^([a-zA-Z0-9_]+)\s*(->|-->|->>|-->>|-[xX]|--[xX]|-\)|--\)|~>)\s*([a-zA-Z0-9_]+)\s*:\s*(.+)$/,
        SEQUENCE_NOTE:        /^[Nn]ote\s+(left|right|over)\s+(?:of\s+)?([a-zA-Z0-9_]+(?:\s*,\s*[a-zA-Z0-9_]+)*)\s*:\s*(.+)$/,
        SEQUENCE_LOOP:        /^(loop|alt|else|opt|par|and|critical|break|rect|ref|neg)\s+(.*)?$/i,

        // ── State machine ──────────────────────────────────────────────────────────────
        STATE_DEF:            /^state\s+"([^"]+)"\s+as\s+([a-zA-Z0-9_]+)(?:\s*:\s*(.+))?\s*$/i,
        STATE_TRANS:          /^([a-zA-Z0-9_[\]*+]+)\s*-->\s*(?:\[([^\]]*)\]\s*)?([a-zA-Z0-9_[\]*+]+)(?:\s*:\s*(.+))?\s*$/,
        STATE_NOTE:           /^note\s+(right|left)\s+of\s+([a-zA-Z0-9_]+)\s*:\s*(.+)$/i,

        // ── ER diagram ────────────────────────────────────────────────────────────────
        ER_ENTITY:            /^([a-zA-Z0-9_]+)\s*\{\s*$/,
        ER_ATTR:              /^\s+(string|int|integer|float|double|boolean|bool|date|datetime|timestamp|enum|uuid|bigint|json|text|blob|decimal)\s+([a-zA-Z0-9_]+)(?:\s+(PK|FK|UK))?(?:\s+"([^"]*)")?\s*$/i,
        ER_RELATION:          /^([a-zA-Z0-9_]+)\s+([|o{}*+[\]]{2,4}--[|o{}*+[\]]{2,4})\s+([a-zA-Z0-9_]+)\s*:\s*"([^"]*)"\s*$/,

        // ── Mindmap ───────────────────────────────────────────────────────────────────
        MINDMAP_NODE:         /^(\s*)([+\-*o~@#])\s+(.+)$/,
        MINDMAP_ROOT:         /^root\s*(?:\(\((.+)\)\)|(.+))$/i,

        // ── Gantt ─────────────────────────────────────────────────────────────────────
        GANTT_SECTION:        /^section\s+(.+)$/i,
        GANTT_TASK:           /^\s{0,}([^:]+)\s*:\s*(?:(crit|done|active|milestone)\s*,\s*)?(?:([a-zA-Z0-9_]+)\s*,\s*)?([^,]+)(?:\s*,\s*(.+))?\s*$/,

        // ── Timeline ──────────────────────────────────────────────────────────────────
        TIMELINE_PERIOD:      /^(\d{4}(?:-\d{2})?(?:-\d{2})?|\w+\s+\d{4})\s*$/,
        TIMELINE_EVENT:       /^\s{2,}(.+?)(?:\s*:\s*(.+))?\s*$/,

        // ── Tree / ASCII art ───────────────────────────────────────────────────────────
        TREE_BRANCH:          /^([├└│ ─\s]+)(.+)$/,

        // ── Vector / SVG shapes ────────────────────────────────────────────────────────
        VECTOR_COMMAND:       /^(path|circle|ellipse|rect|rectangle|polygon|polyline|line|text|image|arc|bezier|spline|star|arrow)\s*:\s*(.*)$/i,
        VECTOR_GROUP_START:   /^group\s*([a-zA-Z0-9_-]*)?\s*\{?\s*$/i,
        VECTOR_LAYER:         /^layer\s+([a-zA-Z0-9_-]+)(?:\s+(front|back|above|below|canvas))?\s*$/i,
        VECTOR_ARTBOARD:      /^artboard\s+([a-zA-Z0-9_-]+)(?:\s+([0-9]+)x([0-9]+))?\s*$/i,

        // ── Spatial directives ─────────────────────────────────────────────────────────
        DIRECTIVE_START:      /^@([a-zA-Z0-9_-]+)(?:\s+([^{]+?))?(?:\s*\{([^}]*)})?s*$/,
        DIRECTIVE_END:        /^@end(?:\s+([a-zA-Z0-9_-]+))?\s*$/,
        COLUMN_BREAK:         /^---(?:col(?:umn)?|split|break)---\s*$/i,

        // ── Component & template ──────────────────────────────────────────────────────
        COMPONENT_USE:        /^<([A-Z][a-zA-Z0-9_.-]*)(?:\s+(.*?))?(?:\s*\/>|>)\s*$/,
        SLOT_DEF:             /^::slot(?:\{([a-zA-Z0-9_-]+)})?\s*$/,
        TEMPLATE_START:       /^#template\s+([a-zA-Z0-9_-]+)(?:\s*\(([^)]*)\))?\s*$/,
        TEMPLATE_END:         /^#end(?:\s+template)?\s*$/,
        MACRO_DEF:            /^@macro\s+([a-zA-Z0-9_-]+)(?:\s*\(([^)]*)\))?\s*$/,

        // ── Extended markdown blocks ───────────────────────────────────────────────────
        MD_BLOCK_START:       /^:::\s*([a-zA-Z0-9_-]+)(?:\s+(.+))?\s*$/,
        MD_BLOCK_END:         /^:::\s*$/,

        // ── Media & references ────────────────────────────────────────────────────────
        EMBED:                /^!(?:([a-zA-Z0-9_-]+))?\[([^\]]*)\]\(([^)]+)\)(?:\s*\{([^}]*)})?s*$/,
        FOOTNOTE_DEF:         /^\[\^([^\]]+)\]:\s+(.+)$/,
        REFERENCE_DEF:        /^\[([^\]]+)\]:\s+(.+)$/,

        // ── Animation ─────────────────────────────────────────────────────────────────
        ANIMATION_DEF:        /^@animate\s+([a-zA-Z0-9_-]+)(?:\s+([a-zA-Z0-9_-]+))?(?:\s+\{(.+))?\s*$/i,

        // ── Inline content markers (fast detection bitmask seeds) ──────────────────────
        INLINE: Object.freeze({
            MATH:             /\$[^$\n]+\$/,
            BOLD:             /\*\*[^*]+\*\*/,
            ITALIC:           /(?:\*[^*]+\*|_[^_]+_)/,
            BOLD_ITALIC:      /\*{3}[^*]+\*{3}/,
            CODE_SPAN:        /`[^`]+`/,
            LINK:             /\[[^\]]+\]\([^)]+\)/,
            IMAGE:            /!\[[^\]]*\]\([^)]+\)/,
            FOOTNOTE_REF:     /\[\^[^\]]+\]/,
            HIGHLIGHT:        /==[^=]+==/,
            STRIKETHROUGH:    /~~[^~]+~~/,
            SUBSCRIPT:        /~[^~]+~/,
            SUPERSCRIPT:      /\^[^^]+\^/,
            UNDERLINE:        /<u>[^<]+<\/u>/,
            MENTION:          /@[a-zA-Z0-9_]{1,50}/,
            HASHTAG:          /#[a-zA-Z][a-zA-Z0-9_]*/,
            EMOJI:            /:[a-z0-9_+\-]{1,40}:/,
            VARIABLE_REF:     /\{\$[a-zA-Z_][a-zA-Z0-9_]*}/,
            COLOR:            /\{#[0-9a-fA-F]{3,8}\s[^}]+}/,
        }),
    });

    /* =====================================================================================
       §16  DEEP FREEZE UTILITY & PUBLIC API SURFACE
       ===================================================================================== */

    /** Recursively freeze all object values. */
    const deepFreeze = (obj) => {
        if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
        // Freeze all own enumerable properties first (breadth-first-safe)
        Object.getOwnPropertyNames(obj).forEach(key => {
            const val = obj[key];
            if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
                deepFreeze(val);
            }
        });
        return Object.freeze(obj);
    };

    return deepFreeze({
        SYSTEM,
        STORAGE,
        TIMING,
        SPATIAL,
        TYPOGRAPHY,
        MARKDOWN_CONFIG,
        MATH_CONFIG,
        DIAGRAM_CONFIG,
        VECTOR_CONFIG,
        LAYOUT_CONFIG,
        COMPONENT_CONFIG,
        CHART_CONFIG,
        THEME,
        ANIMATION_CONFIG,
        GRAMMAR,
    });

})();

/* =========================================================================================
   EXPORT — compatible with ESM, CJS, and browser globals
   ========================================================================================= */

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZOLTO_CONFIG_BASE };
} else if (typeof window !== 'undefined') {
    window.ZOLTO_CONFIG_BASE = ZOLTO_CONFIG_BASE;
}
