/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE CONFIGURATION EXTENDED (Module 3 of 7)
 * Version: 8.0.0-infinity (Supernova Architecture · Extended Domain Config)
 * =========================================================================================
 *
 * Architecture: Minimal aesthetics, zero hardcoded magic numbers, Apple-level UI/UX polish.
 *
 * Domain Coverage (Extended Layer — complements zolto-config-base.js):
 *  §1  ERRORS          — Diagnostic codes for LSP engine (L/S/E/R/M/D/C/V/P series)
 *  §2  I18N            — UI internationalisation strings (EN + stub slots for FR/DE/JA/ZH)
 *  §3  KEYBINDINGS     — Full shortcut registry (Mac · Windows · Linux · Mobile)
 *  §4  MARKDOWN_EXT    — Extended markdown: callouts, cards, tabs, accordions, admonitions,
 *                         embeds, multi-column, footnotes, references, rich typography
 *  §5  MATH_EXT        — LaTeX-level math: inline/block, matrices, integrals, calculus,
 *                         physics, chemistry, statistics, function plots, auto-numbering,
 *                         semantic math AST, formula references
 *  §6  DIAGRAM_EXT     — Mermaid-level+ diagrams: flowcharts, sequences, mind maps,
 *                         state machines, ER, architecture, timelines, network, logic,
 *                         pipelines — with cleaner syntax, spatial awareness, animations,
 *                         interactivity, real-time rendering
 *  §7  VECTOR_EXT      — Native SVG/graphics: shapes, paths, curves, layers, grids,
 *                         artboards, cameras, zoom, constraints, smart snapping,
 *                         responsive graphics, icon system
 *  §8  LAYOUT_EXT      — Spatial layout: flex, grid, responsive, absolute, constraint,
 *                         auto-layout, canvas, whiteboard, infinite workspace, nested,
 *                         presentation mode, split views, interactive panels
 *  §9  COMPONENT_EXT   — Component system: custom blocks, templates, slots, props, themes,
 *                         design systems, dynamic rendering, runtime injection,
 *                         style inheritance, variants, composition
 *  §10 ASSESSMENT_EXT  — MCQ, quiz, flashcard, reasoning, matrix blocks (Zolto-unique)
 *  §11 TEMPLATES       — Full master template registry (showcase + domain-specific)
 *  §12 AUTOCOMPLETE    — Snippet registry for IDE auto-complete
 * =========================================================================================
 */

'use strict';

const ZOLTO_CONFIG_EXTENDED = (function () {

    /* =====================================================================================
       §1  DIAGNOSTIC ERROR CODES & MESSAGES (LSP ENGINE)
       Full series: L · S · E · R · M · D · C · V · P
       ===================================================================================== */
    const ERRORS = Object.freeze({

        // ── LEXICAL ERRORS (L000) ──────────────────────────────────────────────────────
        L001: { code: 'L001', series: 'Lexical',   severity: 'error',   message: 'Illegal tab character. Zolto enforces strict 2-space indentation for spatial matrices.' },
        L002: { code: 'L002', series: 'Lexical',   severity: 'warning', message: 'Odd indentation depth. Indentation must be a multiple of 2 spaces.' },
        L003: { code: 'L003', series: 'Lexical',   severity: 'error',   message: 'Unclosed string literal or invalid quote character.' },
        L004: { code: 'L004', series: 'Lexical',   severity: 'warning', message: 'Invalid invisible/zero-width character in source stream.' },
        L005: { code: 'L005', series: 'Lexical',   severity: 'warning', message: 'Non-ASCII character outside a string or math context.' },
        L006: { code: 'L006', series: 'Lexical',   severity: 'error',   message: 'Unterminated block comment (/* ... */).' },

        // ── SYNTAX ERRORS (S000) ──────────────────────────────────────────────────────
        S001: { code: 'S001', series: 'Syntax',    severity: 'error',   message: 'Unclosed node bracket. Ensure nodes use matching [ ], ( ), < >, or { }.' },
        S002: { code: 'S002', series: 'Syntax',    severity: 'warning', message: 'Invalid trait syntax. Traits must follow the +traitname format with no spaces.' },
        S003: { code: 'S003', series: 'Syntax',    severity: 'error',   message: 'Malformed edge operator. Expected ->, =>, ~>, <->, ..>, or labelled form --"label"-->.' },
        S004: { code: 'S004', series: 'Syntax',    severity: 'warning', message: 'Table row column mismatch. Divider row does not match header column count.' },
        S005: { code: 'S005', series: 'Syntax',    severity: 'error',   message: 'Unknown chart type. Supported: pie, bar, line, area, scatter, radar, donut, histogram, gauge, waterfall.' },
        S006: { code: 'S006', series: 'Syntax',    severity: 'warning', message: 'Invalid inline colour tag. Use {#hex Text} or {colorname Text}.' },
        S007: { code: 'S007', series: 'Syntax',    severity: 'error',   message: 'Malformed @directive. Expected @keyword or @keyword/type with optional attributes.' },
        S008: { code: 'S008', series: 'Syntax',    severity: 'error',   message: 'Unclosed @block. Missing @/keyword closing tag.' },
        S009: { code: 'S009', series: 'Syntax',    severity: 'warning', message: 'Unrecognised @directive keyword. Check the Zolto language spec.' },
        S010: { code: 'S010', series: 'Syntax',    severity: 'error',   message: 'Malformed component tag. Component names must start with a capital letter.' },
        S011: { code: 'S011', series: 'Syntax',    severity: 'warning', message: 'Duplicate attribute key in directive. Last value wins.' },
        S012: { code: 'S012', series: 'Syntax',    severity: 'error',   message: 'Invalid math delimiter. Use $…$ for inline or @math…@/math for block equations.' },

        // ── SEMANTIC ERRORS (E000) ─────────────────────────────────────────────────────
        E001: { code: 'E001', series: 'Semantic',  severity: 'warning', message: 'Orphaned edge. No parent node found above this edge in the spatial tree.' },
        E002: { code: 'E002', series: 'Semantic',  severity: 'error',   message: 'Unresolved edge target. Target node does not exist in current scope.' },
        E003: { code: 'E003', series: 'Semantic',  severity: 'error',   message: 'Circular dependency in strict DAG layout context.' },
        E004: { code: 'E004', series: 'Semantic',  severity: 'warning', message: 'Duplicate node label. Edges will target the first declared instance.' },
        E005: { code: 'E005', series: 'Semantic',  severity: 'error',   message: 'Chart data parse failed. Use Key: Value format for pie/bar charts.' },
        E006: { code: 'E006', series: 'Semantic',  severity: 'warning', message: 'Undefined component reference. Component not found in registry.' },
        E007: { code: 'E007', series: 'Semantic',  severity: 'error',   message: 'Slot/prop type mismatch. Expected type does not match provided value.' },
        E008: { code: 'E008', series: 'Semantic',  severity: 'warning', message: 'Unused template variable. Declared prop has no matching slot.' },
        E009: { code: 'E009', series: 'Semantic',  severity: 'warning', message: 'Footnote defined but never referenced in document.' },
        E010: { code: 'E010', series: 'Semantic',  severity: 'error',   message: 'Reference target not found. Link anchor does not resolve to a heading or ID.' },
        E011: { code: 'E011', series: 'Semantic',  severity: 'warning', message: 'Column layout count mismatch. Content blocks do not match declared column count.' },
        E012: { code: 'E012', series: 'Semantic',  severity: 'error',   message: 'MCQ has no correct answer marked. Exactly one option must be tagged [correct].' },

        // ── RUNTIME & RENDER ERRORS (R000) ────────────────────────────────────────────
        R001: { code: 'R001', series: 'Runtime',   severity: 'fatal',   message: 'Exceeded maximum AST recursion depth (512 levels).' },
        R002: { code: 'R002', series: 'Runtime',   severity: 'warning', message: 'SVG bounding-box calculation failed. Elements have 0×0 dimensions or are not painted.' },
        R003: { code: 'R003', series: 'Runtime',   severity: 'error',   message: 'Math renderer failed on complex fraction/matrix stack.' },
        R004: { code: 'R004', series: 'Runtime',   severity: 'fatal',   message: 'Catastrophic regex backtracking prevented. Execution halted.' },
        R005: { code: 'R005', series: 'Runtime',   severity: 'error',   message: 'Canvas context lost. WebGL or 2D context unavailable.' },
        R006: { code: 'R006', series: 'Runtime',   severity: 'warning', message: 'Component render timeout. Exceeded maximum render budget (100 ms).' },
        R007: { code: 'R007', series: 'Runtime',   severity: 'error',   message: 'Interactive state update failed. Reactive binding could not resolve target.' },

        // ── MATH-SPECIFIC ERRORS (M000) ───────────────────────────────────────────────
        M001: { code: 'M001', series: 'Math',      severity: 'error',   message: 'Unknown math symbol or command.' },
        M002: { code: 'M002', series: 'Math',      severity: 'warning', message: 'Unbalanced braces in math expression.' },
        M003: { code: 'M003', series: 'Math',      severity: 'error',   message: 'Matrix row dimension mismatch. All rows must have the same column count.' },
        M004: { code: 'M004', series: 'Math',      severity: 'warning', message: 'Ambiguous math operator precedence. Consider adding explicit parentheses.' },
        M005: { code: 'M005', series: 'Math',      severity: 'error',   message: 'Equation label collision. Label already used by another @math block.' },
        M006: { code: 'M006', series: 'Math',      severity: 'warning', message: 'Chemistry formula uses non-standard element symbol.' },

        // ── DIAGRAM-SPECIFIC ERRORS (D000) ────────────────────────────────────────────
        D001: { code: 'D001', series: 'Diagram',   severity: 'error',   message: 'Unknown diagram type. Check supported diagram types in the spec.' },
        D002: { code: 'D002', series: 'Diagram',   severity: 'warning', message: 'Diagram exceeds node limit. Consider splitting into sub-diagrams.' },
        D003: { code: 'D003', series: 'Diagram',   severity: 'error',   message: 'Sequence actor used before declaration.' },
        D004: { code: 'D004', series: 'Diagram',   severity: 'warning', message: 'Timeline events are not in chronological order.' },
        D005: { code: 'D005', series: 'Diagram',   severity: 'error',   message: 'ER relation references undefined entity.' },

        // ── COMPONENT SYSTEM ERRORS (C000) ────────────────────────────────────────────
        C001: { code: 'C001', series: 'Component', severity: 'error',   message: 'Component nesting depth exceeded (max 32 levels).' },
        C002: { code: 'C002', series: 'Component', severity: 'error',   message: 'Recursive component definition detected.' },
        C003: { code: 'C003', series: 'Component', severity: 'warning', message: 'Variant not found. Falling back to default variant.' },
        C004: { code: 'C004', series: 'Component', severity: 'warning', message: 'Theme token referenced but not defined in active theme.' },

        // ── VECTOR/SVG ERRORS (V000) ──────────────────────────────────────────────────
        V001: { code: 'V001', series: 'Vector',    severity: 'error',   message: 'Invalid SVG path data (d attribute malformed).' },
        V002: { code: 'V002', series: 'Vector',    severity: 'warning', message: 'Layer reference not found. Element placed on default canvas layer.' },
        V003: { code: 'V003', series: 'Vector',    severity: 'error',   message: 'Artboard dimensions are zero or negative.' },

        // ── PARSER RECOVERY CODES (P000) ──────────────────────────────────────────────
        P001: { code: 'P001', series: 'Parser',    severity: 'info',    message: 'Parser recovered by skipping malformed line. Rendering continues.' },
        P002: { code: 'P002', series: 'Parser',    severity: 'info',    message: 'Block auto-closed at EOF (missing closing tag inferred).' },
        P003: { code: 'P003', series: 'Parser',    severity: 'info',    message: 'Deprecated syntax detected. Auto-upgraded to current form.' },
    });

    /* =====================================================================================
       §2  UI INTERNATIONALIZATION (i18n)
       ===================================================================================== */
    const I18N = Object.freeze({

        EN: {
            TOASTS: {
                FILE_LOADED:         'Zolto file loaded successfully.',
                FILE_SAVED:          'Zolto project saved.',
                FILE_LOAD_ERROR:     'Failed to read file. Ensure it is a valid text or .zl file.',
                SVG_EXPORTED:        'Vector SVG exported successfully.',
                HTML_EXPORTED:       'Standalone HTML document exported.',
                PDF_EXPORTED:        'PDF document exported successfully.',
                THEME_LIGHT:         'Light mode enabled.',
                THEME_DARK:          'Dark mode enabled.',
                THEME_CUSTOM:        'Custom theme applied.',
                PARSER_RECOVERED:    'Parser recovered from invalid syntax.',
                UNDO:                'Undo performed.',
                REDO:                'Redo performed.',
                FORMATTED:           'Document formatted.',
                COMPONENT_SAVED:     'Component saved to registry.',
                TEMPLATE_INSERTED:   'Template inserted.',
                CLIPBOARD_COPIED:    'Copied to clipboard.',
                MATH_LABEL_ADDED:    'Equation label registered.',
                QUIZ_SUBMITTED:      'Quiz answers submitted.',
                FLASHCARD_FLIPPED:   'Card flipped.',
                AUTO_SAVED:          'Auto-saved.',
                ZOOM_RESET:          'Viewport reset to 100%.',
                LINK_COPIED:         'Document link copied.',
            },
            EDITOR: {
                PLACEHOLDER:         '// Start writing Zolto syntax here...',
                HEADER_TITLE:        'Source (.zl)',
                LINE:                'Ln',
                COL:                 'Col',
                ENCODING:            'UTF-8',
                UNSAVED_INDICATOR:   '●',
                READONLY_LABEL:      '[Read-only]',
            },
            CANVAS: {
                HEADER_TITLE:        'Spatial Runtime',
                EMPTY_STATE:         'AST is empty. Type Zolto syntax to render nodes, charts, diagrams, or math.',
                ZOOM_LABEL:          'Zoom:',
                RENDERING:           'Rendering…',
                DIAGRAM_LABEL:       'Diagram',
                CHART_LABEL:         'Chart',
                MATH_LABEL:          'Equation',
                CANVAS_LABEL:        'Canvas',
                WHITEBOARD_LABEL:    'Whiteboard',
            },
            COMMAND_PALETTE: {
                PLACEHOLDER:         '> Search files, or type ? for commands…',
                EMPTY_STATE:         'No matches found. Press Enter to create new file.',
                CMD_FORMAT:          'Format Document',
                CMD_THEME:           'Toggle Theme',
                CMD_EXPORT_SVG:      'Export Vector SVG',
                CMD_EXPORT_HTML:     'Export as HTML Webpage',
                CMD_EXPORT_PDF:      'Export as PDF',
                CMD_RESET_VIEW:      'Reset Canvas Viewport',
                CMD_INSERT_TEMPLATE: 'Insert Template…',
                CMD_NEW_COMPONENT:   'New Component…',
                CMD_MATH_LABEL:      'Jump to Equation…',
                CMD_OPEN_DOCS:       'Open Language Reference',
                CMD_TOGGLE_MINIMAP:  'Toggle Minimap',
                CMD_TOGGLE_PANELS:   'Toggle Side Panels',
                CMD_SETTINGS:        'Open Settings',
            },
            ASSESSMENTS: {
                CORRECT_LABEL:       'Correct!',
                INCORRECT_LABEL:     'Incorrect.',
                SHOW_EXPLANATION:    'Show Explanation',
                HIDE_EXPLANATION:    'Hide Explanation',
                SUBMIT_QUIZ:         'Submit Quiz',
                QUIZ_SCORE:          'Score: {score}/{total}',
                FLASHCARD_FRONT:     'Front',
                FLASHCARD_BACK:      'Back',
                FLIP_CARD:           'Flip Card',
                NEXT_CARD:           'Next →',
                PREV_CARD:           '← Prev',
                REVEAL_ANSWER:       'Reveal Answer',
                TRY_AGAIN:           'Try Again',
                TIME_LEFT:           'Time left: {seconds}s',
                QUIZ_COMPLETE:       'Quiz Complete',
            },
            ACCESSIBILITY: {
                CLOSE_DIALOG:        'Close dialog',
                EXPAND_SECTION:      'Expand section',
                COLLAPSE_SECTION:    'Collapse section',
                DIAGRAM_ALT:         'Interactive diagram',
                CHART_ALT:           'Data chart',
                MATH_ALT:            'Mathematical expression',
                LOADING:             'Loading…',
                TOGGLE_THEME:        'Toggle colour theme',
            },
        },

        // Stub slots for future localisations (translators fill these in)
        FR: null,
        DE: null,
        JA: null,
        ZH: null,
        ES: null,
        PT: null,
        HI: null,
        AR: null,
    });

    /* =====================================================================================
       §3  KEYBINDINGS & SHORTCUT REGISTRY
       ===================================================================================== */
    const KEYBINDINGS = Object.freeze({

        MAC: {
            SAVE:                ['Meta', 's'],
            OPEN:                ['Meta', 'o'],
            NEW_FILE:            ['Meta', 'n'],
            CLOSE_FILE:          ['Meta', 'w'],
            EXPORT_SVG:          ['Meta', 'Shift', 'e'],
            EXPORT_HTML:         ['Meta', 'Shift', 'h'],
            EXPORT_PDF:          ['Meta', 'Shift', 'p'],
            TOGGLE_THEME:        ['Meta', 'k', 't'],
            COMMAND_PALETTE:     ['Meta', 'p'],
            FORMAT_DOC:          ['Shift', 'Alt', 'f'],
            UNDO:                ['Meta', 'z'],
            REDO:                ['Meta', 'Shift', 'z'],
            FOCUS_EDITOR:        ['Meta', '1'],
            FOCUS_CANVAS:        ['Meta', '2'],
            FOCUS_PANEL:         ['Meta', '3'],
            ZOOM_IN:             ['Meta', '='],
            ZOOM_OUT:            ['Meta', '-'],
            ZOOM_RESET:          ['Meta', '0'],
            INSERT_MATH:         ['Meta', 'm'],
            INSERT_DIAGRAM:      ['Meta', 'd'],
            INSERT_TABLE:        ['Meta', 't'],
            INSERT_COMPONENT:    ['Meta', 'Shift', 'c'],
            TOGGLE_PREVIEW:      ['Meta', 'Shift', 'v'],
            TOGGLE_MINIMAP:      ['Meta', 'Shift', 'm'],
            FIND:                ['Meta', 'f'],
            FIND_REPLACE:        ['Meta', 'Alt', 'f'],
            TOGGLE_COMMENT:      ['Meta', '/'],
            MOVE_LINE_UP:        ['Alt', 'ArrowUp'],
            MOVE_LINE_DOWN:      ['Alt', 'ArrowDown'],
            DUPLICATE_LINE:      ['Meta', 'Shift', 'd'],
            SELECT_ALL:          ['Meta', 'a'],
            INDENT:              ['Tab'],
            OUTDENT:             ['Shift', 'Tab'],
        },

        WINDOWS: {
            SAVE:                ['Control', 's'],
            OPEN:                ['Control', 'o'],
            NEW_FILE:            ['Control', 'n'],
            CLOSE_FILE:          ['Control', 'w'],
            EXPORT_SVG:          ['Control', 'Shift', 'e'],
            EXPORT_HTML:         ['Control', 'Shift', 'h'],
            EXPORT_PDF:          ['Control', 'Shift', 'p'],
            TOGGLE_THEME:        ['Control', 'k', 't'],
            COMMAND_PALETTE:     ['Control', 'p'],
            FORMAT_DOC:          ['Shift', 'Alt', 'f'],
            UNDO:                ['Control', 'z'],
            REDO:                ['Control', 'y'],
            FOCUS_EDITOR:        ['Control', '1'],
            FOCUS_CANVAS:        ['Control', '2'],
            FOCUS_PANEL:         ['Control', '3'],
            ZOOM_IN:             ['Control', '='],
            ZOOM_OUT:            ['Control', '-'],
            ZOOM_RESET:          ['Control', '0'],
            INSERT_MATH:         ['Control', 'm'],
            INSERT_DIAGRAM:      ['Control', 'd'],
            INSERT_TABLE:        ['Control', 't'],
            INSERT_COMPONENT:    ['Control', 'Shift', 'c'],
            TOGGLE_PREVIEW:      ['Control', 'Shift', 'v'],
            TOGGLE_MINIMAP:      ['Control', 'Shift', 'm'],
            FIND:                ['Control', 'f'],
            FIND_REPLACE:        ['Control', 'h'],
            TOGGLE_COMMENT:      ['Control', '/'],
            MOVE_LINE_UP:        ['Alt', 'ArrowUp'],
            MOVE_LINE_DOWN:      ['Alt', 'ArrowDown'],
            DUPLICATE_LINE:      ['Control', 'Shift', 'd'],
            SELECT_ALL:          ['Control', 'a'],
            INDENT:              ['Tab'],
            OUTDENT:             ['Shift', 'Tab'],
        },

        LINUX: {
            SAVE:                ['Control', 's'],
            UNDO:                ['Control', 'z'],
            REDO:                ['Control', 'Shift', 'z'],
            COMMAND_PALETTE:     ['Control', 'p'],
            FORMAT_DOC:          ['Shift', 'Alt', 'f'],
            FIND:                ['Control', 'f'],
            FIND_REPLACE:        ['Control', 'h'],
        },

        ACTIONS: {
            ESCAPE_MODAL:        ['Escape'],
            CONFIRM_MODAL:       ['Enter'],
            AUTO_COMPLETE:       ['Tab'],
            PAN_CANVAS:          ['Space'],
            ZOOM_CANVAS:         ['Control'],       // hold + scroll
            SELECT_NODE:         ['Click'],
            MULTI_SELECT:        ['Shift', 'Click'],
            DRAG_NODE:           ['MouseDrag'],
            CONTEXT_MENU:        ['RightClick'],
            FLIP_FLASHCARD:      ['Space'],
            NEXT_SLIDE:          ['ArrowRight'],
            PREV_SLIDE:          ['ArrowLeft'],
        },
    });

    /* =====================================================================================
       §4  MARKDOWN EXTENDED CONFIG
       All extended markdown: callouts, cards, tabs, accordions, admonitions, embeds,
       multi-column, footnotes, references, rich typography.
       ===================================================================================== */
    const MARKDOWN_EXT = Object.freeze({

        // Supported admonition/callout types with default icons and colour tokens
        ADMONITION_TYPES: Object.freeze({
            important: { icon: '❗', colorToken: 'accent-red',    label: 'Important'   },
            warning:   { icon: '⚠️', colorToken: 'accent-amber',  label: 'Warning'     },
            tip:       { icon: '💡', colorToken: 'accent-teal',   label: 'Tip'         },
            info:      { icon: 'ℹ️', colorToken: 'accent-blue',   label: 'Info'        },
            note:      { icon: '📝', colorToken: 'accent-indigo', label: 'Note'        },
            success:   { icon: '✅', colorToken: 'accent-green',  label: 'Success'     },
            danger:    { icon: '🚫', colorToken: 'accent-rose',   label: 'Danger'      },
            example:   { icon: '📖', colorToken: 'accent-violet', label: 'Example'     },
            quote:     { icon: '💬', colorToken: 'accent-slate',  label: 'Quote'       },
            definition:{ icon: '📐', colorToken: 'accent-cyan',   label: 'Definition'  },
            theorem:   { icon: '∴',  colorToken: 'accent-purple', label: 'Theorem'     },
            proof:     { icon: '∎',  colorToken: 'accent-gray',   label: 'Proof'       },
        }),

        // Tab block defaults
        TABS: Object.freeze({
            DEFAULT_ACTIVE_INDEX: 0,
            ANIMATION:            'slide',      // 'slide' | 'fade' | 'none'
            OVERFLOW_MODE:        'scroll',     // 'scroll' | 'wrap' | 'dropdown'
        }),

        // Accordion defaults
        ACCORDION: Object.freeze({
            ALLOW_MULTIPLE_OPEN:  false,
            DEFAULT_OPEN_INDEX:   -1,           // -1 = all closed
            ANIMATION_DURATION:   220,          // ms
            ICON_OPEN:            '▾',
            ICON_CLOSED:          '▸',
        }),

        // Card defaults
        CARD: Object.freeze({
            DEFAULT_ELEVATION:    1,            // 0-4
            BORDER_RADIUS_TOKEN:  'radius-md',
            PADDING_TOKEN:        'space-4',
            HOVER_ANIMATION:      true,
        }),

        // Multi-column layout defaults
        COLUMNS: Object.freeze({
            MAX_COLUMNS:          6,
            DEFAULT_COLUMNS:      2,
            GAP_TOKEN:            'space-6',
            BREAKPOINT_COLLAPSE:  'md',         // collapse to single col at this breakpoint
        }),

        // Rich typography inline features
        TYPOGRAPHY: Object.freeze({
            SMART_QUOTES:         true,
            SMART_DASHES:         true,         // -- → en-dash, --- → em-dash
            SMART_ELLIPSIS:       true,         // ... → …
            LIGATURES:            true,
            FRACTION_SHORTHAND:   true,         // 1/2 → ½ etc.
            SUPERSCRIPT_ORDINALS: true,         // 1st → 1ˢᵗ
        }),

        // Supported embed types
        EMBED_TYPES: Object.freeze([
            'youtube', 'vimeo', 'codepen', 'codesandbox', 'repl',
            'figma', 'excalidraw', 'miro', 'loom',
            'image', 'audio', 'video', 'iframe',
        ]),

        // Footnote rendering mode
        FOOTNOTES: Object.freeze({
            RENDER_MODE:          'bottom',     // 'bottom' | 'side' | 'tooltip' | 'popover'
            AUTO_NUMBER:          true,
            BACKLINK_SYMBOL:      '↩',
        }),

        // Heading anchor auto-generation
        HEADINGS: Object.freeze({
            AUTO_ANCHOR:          true,
            ANCHOR_PREFIX:        '',
            SHOW_HOVER_LINK:      true,
            TOC_MAX_DEPTH:        4,
        }),

        // Code block features
        CODE_BLOCKS: Object.freeze({
            SHOW_COPY_BUTTON:     true,
            SHOW_LANG_BADGE:      true,
            LINE_NUMBERS:         true,
            LINE_HIGHLIGHT:       true,         // e.g. ```js {2,5-7}
            DIFF_VIEW:            true,
            WRAP_LONG_LINES:      false,
            MAX_COLLAPSED_LINES:  50,
        }),
    });

    /* =====================================================================================
       §5  MATH EXTENDED CONFIG
       LaTeX-level: inline/block, matrices, integrals, calculus, physics, chemistry,
       statistics, function plots, auto-numbering, semantic AST, formula references.
       ===================================================================================== */
    const MATH_EXT = Object.freeze({

        // Rendering backend priority
        RENDERER: Object.freeze({
            PRIMARY:   'native',        // 'native' | 'katex' | 'mathjax'
            FALLBACK:  'katex',
            FONT:      'STIX Two Math, Latin Modern Math, serif',
        }),

        // Auto-numbering for @math blocks
        AUTO_NUMBERING: Object.freeze({
            ENABLED:   true,
            FORMAT:    '({n})',         // e.g. (1), (2) — use {n} as counter placeholder
            POSITION:  'right',         // 'right' | 'left'
            RESET_ON:  'section',       // 'section' | 'document' | 'chapter'
        }),

        // Supported block environments (maps to renderer environment names)
        ENVIRONMENTS: Object.freeze({
            equation:    { numbered: true,  display: true,  description: 'Single numbered equation'          },
            equation_s:  { numbered: false, display: true,  description: 'Unnumbered equation (equation*)'   },
            align:       { numbered: true,  display: true,  description: 'Multi-line aligned equations'      },
            align_s:     { numbered: false, display: true,  description: 'Unnumbered align'                  },
            gather:      { numbered: true,  display: true,  description: 'Centred multi-line equations'      },
            multline:    { numbered: true,  display: true,  description: 'Single equation split over lines'  },
            cases:       { numbered: false, display: false, description: 'Piecewise / case definitions'      },
            matrix:      { numbered: false, display: false, description: 'Plain matrix (no delimiters)'      },
            pmatrix:     { numbered: false, display: false, description: 'Matrix with ( ) delimiters'        },
            bmatrix:     { numbered: false, display: false, description: 'Matrix with [ ] delimiters'        },
            vmatrix:     { numbered: false, display: false, description: 'Matrix with | | delimiters'        },
            Vmatrix:     { numbered: false, display: false, description: 'Matrix with ‖ ‖ delimiters'        },
            Bmatrix:     { numbered: false, display: false, description: 'Matrix with { } delimiters'        },
            array:       { numbered: false, display: false, description: 'General array with column spec'    },
            subarray:    { numbered: false, display: false, description: 'Sub-array for stacked expressions' },
            split:       { numbered: false, display: false, description: 'Split equation within equation'    },
            prooftree:   { numbered: false, display: true,  description: 'Natural deduction proof trees'     },
            cd:          { numbered: false, display: true,  description: 'Commutative diagram (tikzcd-like)' },
        }),

        // Supported domain extensions
        DOMAINS: Object.freeze({
            CALCULUS:    true,     // \\int, \\diff, \\partial, \\grad, \\curl, \\div, \\laplacian
            PHYSICS:     true,     // \\bra, \\ket, \\braket, \\vec, \\hat, \\hbar, \\SI
            CHEMISTRY:   true,     // \\ce{}, chemical equations, state notation (aq/s/g/l)
            STATISTICS:  true,     // \\prob, \\expect, \\var, \\cov, \\std, \\N, \\Bin, \\Poi
            LOGIC:       true,     // \\land, \\lor, \\lnot, \\implies, \\iff, \\forall, \\exists
            SET_THEORY:  true,     // \\in, \\notin, \\subset, \\subseteq, \\cup, \\cap, \\emptyset
            GRAPH_THEORY:true,     // \\graph, \\edge, \\vertex
            FINANCE:     true,     // \\NPV, \\IRR, \\PV, \\FV
        }),

        // Function plot config (for @math plot blocks)
        PLOT: Object.freeze({
            DEFAULT_X_RANGE:  [-10, 10],
            DEFAULT_Y_RANGE:  [-10, 10],
            GRID:             true,
            AXES:             true,
            HIGHLIGHT_ROOTS:  false,
            HIGHLIGHT_CRIT:   false,
            LEGEND:           true,
            POINT_SAMPLE_COUNT: 500,
            LINE_WIDTH:       2,
            COLORS: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        }),

        // Label / cross-reference system
        LABELS: Object.freeze({
            REF_FORMAT:        'Eq. ({n})',     // text used when referencing an equation
            LABEL_REGEX:       /^[a-zA-Z0-9:_-]+$/, // valid label characters
        }),
    });

    /* =====================================================================================
       §6  DIAGRAM EXTENDED CONFIG
       All diagram types with cleaner syntax, spatial awareness, animations, interactivity.
       ===================================================================================== */
    const DIAGRAM_EXT = Object.freeze({

        // Supported diagram types and their layout engine
        TYPES: Object.freeze({
            flowchart:    { engine: 'dagre',    direction: 'TB', interactive: true,  animated: true  },
            sequence:     { engine: 'sequence', direction: null, interactive: true,  animated: true  },
            mindmap:      { engine: 'radial',   direction: null, interactive: true,  animated: true  },
            statechart:   { engine: 'dagre',    direction: 'LR', interactive: true,  animated: true  },
            erd:          { engine: 'dagre',    direction: 'TB', interactive: false, animated: false },
            network:      { engine: 'force',    direction: null, interactive: true,  animated: true  },
            architecture: { engine: 'dagre',    direction: 'TB', interactive: true,  animated: false },
            gantt:        { engine: 'gantt',    direction: 'LR', interactive: true,  animated: false },
            timeline:     { engine: 'linear',   direction: 'LR', interactive: true,  animated: true  },
            dependency:   { engine: 'dagre',    direction: 'LR', interactive: true,  animated: false },
            logic:        { engine: 'dagre',    direction: 'LR', interactive: false, animated: false },
            pipeline:     { engine: 'linear',   direction: 'LR', interactive: true,  animated: true  },
            tree:         { engine: 'tree',     direction: 'TB', interactive: true,  animated: true  },
            sankey:       { engine: 'sankey',   direction: 'LR', interactive: true,  animated: true  },
            quadrant:     { engine: 'grid',     direction: null, interactive: true,  animated: false },
            kanban:       { engine: 'columns',  direction: null, interactive: true,  animated: true  },
            gitgraph:     { engine: 'git',      direction: 'LR', interactive: false, animated: false },
            geometry:     { engine: 'canvas2d', direction: null, interactive: true,  animated: false },
            circuit:      { engine: 'canvas2d', direction: null, interactive: false, animated: false },
            atom:         { engine: 'canvas2d', direction: null, interactive: true,  animated: true  },
            grammar_tree: { engine: 'tree',     direction: 'TB', interactive: false, animated: false },
        }),

        // Layout engine defaults per engine type
        LAYOUT_DEFAULTS: Object.freeze({
            dagre:    { rankSep: 60, nodeSep: 40, edgeSep: 20, marginX: 32, marginY: 32 },
            force:    { linkDist: 120, charge: -400, alpha: 0.3, alphaDecay: 0.028       },
            radial:   { levelSep: 120, siblingGap: 20                                    },
            tree:     { levelSep: 80,  nodeSep: 30                                       },
            linear:   { itemGap: 48,   trackHeight: 48                                   },
        }),

        // Node shape tokens and their SVG shape type
        NODE_SHAPES: Object.freeze({
            RECT:      { bracket: '[]',  svgType: 'rect',    description: 'Rectangle node'      },
            ROUND:     { bracket: '()',  svgType: 'rect',    description: 'Rounded-corner node'  },
            CIRCLE:    { bracket: '(())',svgType: 'circle',  description: 'Circle / oval node'   },
            DIAMOND:   { bracket: '{}',  svgType: 'diamond', description: 'Decision diamond'     },
            HEX:       { bracket: '{{}}',svgType: 'hex',     description: 'Hexagonal node'       },
            STADIUM:   { bracket: '([])',svgType: 'stadium', description: 'Stadium / pill node'  },
            CYLINDER:  { bracket: '[()]',svgType: 'cylinder',description: 'Database cylinder'    },
            TRAPEZOID: { bracket: '[/]', svgType: 'trapezoid',description: 'Input/output trapezoid'},
            LEAN_R:    { bracket: '[\\]',svgType: 'lean',    description: 'Lean-right parallelogram'},
        }),

        // Edge/connector styles
        EDGE_STYLES: Object.freeze({
            '-->':    { type: 'solid',   arrow: 'open',   weight: 1.5, label: true  },
            '---':    { type: 'solid',   arrow: 'none',   weight: 1.5, label: true  },
            '--->':   { type: 'solid',   arrow: 'open',   weight: 2,   label: true  },
            '==>':    { type: 'solid',   arrow: 'filled', weight: 3,   label: true  },
            '===':    { type: 'solid',   arrow: 'none',   weight: 3,   label: true  },
            '-.->':   { type: 'dashed',  arrow: 'open',   weight: 1.5, label: true  },
            '-.-':    { type: 'dashed',  arrow: 'none',   weight: 1.5, label: true  },
            '~~>':    { type: 'wavy',    arrow: 'open',   weight: 1.5, label: true  },
            '<-->':   { type: 'solid',   arrow: 'both',   weight: 1.5, label: true  },
            '..>':    { type: 'dotted',  arrow: 'open',   weight: 1,   label: true  },
            '->':     { type: 'solid',   arrow: 'open',   weight: 1,   label: false },
            '=>':     { type: 'solid',   arrow: 'filled', weight: 2,   label: false },
            '~>':     { type: 'dashed',  arrow: 'open',   weight: 1,   label: false },
        }),

        // Interactivity features
        INTERACTIVITY: Object.freeze({
            HOVER_HIGHLIGHT:      true,
            CLICK_SELECT:         true,
            DRAG_NODES:           true,
            PAN_ZOOM:             true,
            ZOOM_MIN:             0.1,
            ZOOM_MAX:             8.0,
            ZOOM_STEP:            0.1,
            COLLAPSE_SUBGRAPHS:   true,
            TOOLTIP_ON_HOVER:     true,
            EDGE_ROUTING_MODE:    'orthogonal',   // 'orthogonal' | 'curved' | 'straight'
            MAGNETIC_SNAP_PX:     12,
        }),

        // Diagram themes
        THEMES: Object.freeze({
            DEFAULT:    { node_fill: 'surface-2', node_stroke: 'border', text: 'fg-primary',  edge: 'fg-muted'   },
            DARK:       { node_fill: 'surface-3', node_stroke: 'border', text: 'fg-primary',  edge: 'fg-muted'   },
            FOREST:     { node_fill: '#1a2e1a',   node_stroke: '#2d5a27',text: '#c8f7c5',     edge: '#4a9e43'    },
            OCEAN:      { node_fill: '#0a1628',   node_stroke: '#1e3a5f',text: '#c5dff8',     edge: '#3d87cc'    },
            SUNSET:     { node_fill: '#2a1520',   node_stroke: '#7b2d42',text: '#ffd6e0',     edge: '#e85d7b'    },
            MONO:       { node_fill: '#f8f8f8',   node_stroke: '#222',   text: '#111',        edge: '#666'       },
            BLUEPRINT:  { node_fill: '#1a2744',   node_stroke: '#2756b0',text: '#c8d8f0',     edge: '#4e89e0'    },
        }),

        // Animation presets for diagrams
        ANIMATIONS: Object.freeze({
            NODE_ENTER:   { type: 'fadeSlideUp',  duration: 300, stagger: 40  },
            EDGE_DRAW:    { type: 'pathDraw',     duration: 400, stagger: 30  },
            HIGHLIGHT:    { type: 'pulse',        duration: 600, repeat: true },
            FLOW_PULSE:   { type: 'dashOffset',   duration: 1200,repeat: true },
        }),
    });

    /* =====================================================================================
       §7  VECTOR EXTENDED CONFIG
       SVG/graphics engine: shapes, paths, curves, layers, grids, artboards, cameras,
       zoom, constraints, smart snapping, responsive graphics, icon system.
       ===================================================================================== */
    const VECTOR_EXT = Object.freeze({

        // Supported primitive shape commands
        SHAPES: Object.freeze({
            circle:    { params: ['cx','cy','r'],                      svgEl: 'circle'   },
            ellipse:   { params: ['cx','cy','rx','ry'],                svgEl: 'ellipse'  },
            rect:      { params: ['x','y','width','height','rx','ry'], svgEl: 'rect'     },
            line:      { params: ['x1','y1','x2','y2'],               svgEl: 'line'     },
            polyline:  { params: ['points'],                           svgEl: 'polyline' },
            polygon:   { params: ['points'],                           svgEl: 'polygon'  },
            path:      { params: ['d'],                                svgEl: 'path'     },
            text:      { params: ['x','y','text'],                     svgEl: 'text'     },
            image:     { params: ['x','y','width','height','href'],    svgEl: 'image'    },
            arc:       { params: ['cx','cy','r','startAngle','endAngle'], svgEl: 'path'  },
            bezier:    { params: ['x1','y1','cx1','cy1','cx2','cy2','x2','y2'], svgEl: 'path' },
            star:      { params: ['cx','cy','r','points','innerR'],    svgEl: 'path'     },
            arrow:     { params: ['x1','y1','x2','y2','headSize'],     svgEl: 'g'        },
        }),

        // Layer system
        LAYERS: Object.freeze({
            SYSTEM_LAYERS:  ['background', 'grid', 'connections', 'shapes', 'labels', 'ui'],
            DEFAULT_LAYER:  'shapes',
            MAX_LAYERS:     64,
            BLEND_MODES: ['normal','multiply','screen','overlay','darken','lighten',
                          'color-dodge','color-burn','hard-light','soft-light',
                          'difference','exclusion','hue','saturation','color','luminosity'],
        }),

        // Artboard / canvas presets
        ARTBOARDS: Object.freeze({
            PRESETS: Object.freeze({
                A4_PORTRAIT:   { width: 794,  height: 1123, unit: 'px', dpi: 96  },
                A4_LANDSCAPE:  { width: 1123, height: 794,  unit: 'px', dpi: 96  },
                A3_PORTRAIT:   { width: 1123, height: 1587, unit: 'px', dpi: 96  },
                SLIDE_16_9:    { width: 1280, height: 720,  unit: 'px', dpi: 96  },
                SLIDE_4_3:     { width: 1024, height: 768,  unit: 'px', dpi: 96  },
                SCREEN_1080P:  { width: 1920, height: 1080, unit: 'px', dpi: 96  },
                SCREEN_4K:     { width: 3840, height: 2160, unit: 'px', dpi: 96  },
                INSTAGRAM_SQ:  { width: 1080, height: 1080, unit: 'px', dpi: 72  },
                TWITTER_CARD:  { width: 1200, height: 628,  unit: 'px', dpi: 72  },
                MOBILE_360:    { width: 360,  height: 800,  unit: 'px', dpi: 96  },
                INFINITE:      { width: null, height: null, unit: 'px', dpi: 96  },
            }),
            DEFAULT_PRESET:   'INFINITE',
        }),

        // Smart snapping system
        SNAPPING: Object.freeze({
            SNAP_TO_GRID:     false,
            SNAP_TO_OBJECTS:  true,
            SNAP_TO_GUIDES:   true,
            SNAP_THRESHOLD_PX: 8,
            MAGNETIC_GUIDES:  true,
            SMART_DISTRIBUTE: true,
            ALIGNMENT_HINTS:  true,
            SNAP_ANGLES:      [0, 45, 90, 135, 180, 225, 270, 315],
        }),

        // Constraints system (Figma-style)
        CONSTRAINTS: Object.freeze({
            HORIZONTAL: ['LEFT', 'RIGHT', 'LEFT_RIGHT', 'CENTER', 'SCALE'],
            VERTICAL:   ['TOP', 'BOTTOM', 'TOP_BOTTOM', 'CENTER', 'SCALE'],
        }),

        // Camera / viewport
        CAMERA: Object.freeze({
            MIN_ZOOM:         0.05,
            MAX_ZOOM:         64.0,
            DEFAULT_ZOOM:     1.0,
            ZOOM_STEP:        0.1,
            PAN_SPEED:        1.0,
            INERTIA:          true,
            INERTIA_DECAY:    0.9,
            FIT_PADDING:      48,
        }),

        // Grid display
        GRID: Object.freeze({
            SMALL_GRID_SIZE:  8,
            LARGE_GRID_SIZE:  64,
            SHOW_GRID:        false,
            GRID_COLOR:       'rgba(128,128,128,0.15)',
            DOT_GRID:         false,
            AXES:             false,
        }),
    });

    /* =====================================================================================
       §8  LAYOUT EXTENDED CONFIG
       Flex, grid, responsive, absolute, constraint, auto-layout, canvas,
       whiteboard, infinite workspace, nested, presentation, split, interactive panels.
       ===================================================================================== */
    const LAYOUT_EXT = Object.freeze({

        // Layout modes
        MODES: Object.freeze({
            DOCUMENT:       { description: 'Linear vertical document flow'           },
            CANVAS:         { description: 'Free-position canvas (finite size)'      },
            WHITEBOARD:     { description: 'Infinite pan/zoom workspace'             },
            PRESENTATION:   { description: 'Slide-based sequential presentation'     },
            SPLIT:          { description: 'Dual-pane side-by-side view'             },
            NOTEBOOK:       { description: 'Jupyter-style cell-based notebook'       },
            DASHBOARD:      { description: 'Widget-based dashboard with drag-resize' },
        }),

        // Grid layout presets
        GRID_PRESETS: Object.freeze({
            'grid-1':  { cols: 1,  gap: '1.5rem'  },
            'grid-2':  { cols: 2,  gap: '1.5rem'  },
            'grid-3':  { cols: 3,  gap: '1.25rem' },
            'grid-4':  { cols: 4,  gap: '1rem'    },
            'grid-5':  { cols: 5,  gap: '1rem'    },
            'grid-6':  { cols: 6,  gap: '0.75rem' },
            'auto':    { cols: 'auto-fill', minColWidth: '240px', gap: '1.25rem' },
        }),

        // Responsive breakpoints
        BREAKPOINTS: Object.freeze({
            XS:  320,
            SM:  480,
            MD:  768,
            LG:  1024,
            XL:  1280,
            XXL: 1536,
        }),

        // Auto-layout (Figma-style hug/fill/fixed)
        AUTO_LAYOUT: Object.freeze({
            SIZING_MODES: ['HUG', 'FILL', 'FIXED'],
            DEFAULT_DIRECTION:  'VERTICAL',
            DEFAULT_ALIGN:      'START',
            DEFAULT_GAP:        16,
            DEFAULT_PADDING:    16,
            WRAP:               false,
        }),

        // Presentation mode
        PRESENTATION: Object.freeze({
            SLIDE_TRANSITION:   'slide',    // 'slide' | 'fade' | 'zoom' | 'flip' | 'cube'
            TRANSITION_DURATION: 400,
            LOOP:               false,
            SHOW_SLIDE_NUMBERS: true,
            SHOW_PROGRESS_BAR:  true,
            SPEAKER_NOTES:      true,
            FULL_SCREEN:        true,
            ASPECT_RATIO:       '16/9',
        }),

        // Panel system (IDE-style layout panels)
        PANELS: Object.freeze({
            DEFAULT_EDITOR_WIDTH_PCT:  50,
            MIN_PANEL_WIDTH_PX:        200,
            RESIZABLE:                 true,
            COLLAPSIBLE:               true,
            PERSIST_SIZES:             true,
        }),
    });

    /* =====================================================================================
       §9  COMPONENT EXTENDED CONFIG
       Custom blocks, templates, slots, props, themes, design systems, dynamic rendering,
       runtime injection, style inheritance, variants, composition.
       ===================================================================================== */
    const COMPONENT_EXT = Object.freeze({

        // Prop value types supported in component definitions
        PROP_TYPES: Object.freeze({
            string:   { jsType: 'string',  validator: v => typeof v === 'string'               },
            number:   { jsType: 'number',  validator: v => typeof v === 'number' && !isNaN(v)  },
            boolean:  { jsType: 'boolean', validator: v => typeof v === 'boolean'              },
            color:    { jsType: 'string',  validator: v => /^(#[0-9a-fA-F]{3,8}|[a-z]+)$/.test(v) },
            size:     { jsType: 'string',  validator: v => /^(\d+)(px|rem|em|%|vh|vw)?$/.test(v)  },
            enum:     { jsType: 'string',  validator: null  },     // validated per-component
            slot:     { jsType: 'node',    validator: null  },     // child content slot
            list:     { jsType: 'array',   validator: Array.isArray },
            object:   { jsType: 'object',  validator: v => typeof v === 'object' && v !== null },
        }),

        // Built-in system components (always available)
        BUILT_IN: Object.freeze([
            'Card', 'Row', 'Column', 'Grid', 'Stack',
            'Divider', 'Spacer', 'Badge', 'Tag',
            'Alert', 'Callout', 'Admonition',
            'Tabs', 'Tab', 'Accordion', 'AccordionItem',
            'Table', 'Th', 'Tr', 'Td',
            'CodeBlock', 'Math', 'MathPlot',
            'Chart', 'Diagram', 'Timeline',
            'Flashcard', 'Mcq', 'Quiz',
            'Slider', 'Toggle', 'Progress',
            'Avatar', 'Icon', 'Embed',
        ]),

        // Variant system
        VARIANTS: Object.freeze({
            SIZE:    ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
            TONE:    ['default', 'primary', 'success', 'warning', 'danger', 'info', 'muted'],
            SHAPE:   ['default', 'rounded', 'pill', 'square'],
            OUTLINE: [true, false],
            GHOST:   [true, false],
        }),

        // Style inheritance chain
        STYLE_RESOLUTION_ORDER: Object.freeze([
            'global-theme',
            'document-theme',
            'component-defaults',
            'component-instance',
            'inline-override',
        ]),

        // Dynamic rendering modes
        RENDER_MODE: Object.freeze({
            STATIC:     'static',       // render once, no runtime state
            REACTIVE:   'reactive',     // re-render on prop/state change
            LAZY:       'lazy',         // render on first intersection
            STREAMING:  'streaming',    // progressive render (large docs)
        }),

        // Component registry constraints
        REGISTRY: Object.freeze({
            MAX_COMPONENTS:     256,
            NAME_REGEX:         /^[A-Z][a-zA-Z0-9_-]{0,63}$/,
            RESERVED_NAMES:     ['Root', 'Document', 'Page', 'Fragment'],
            STRICT_MODE:        false,
        }),
    });

    /* =====================================================================================
       §10  ASSESSMENT EXTENDED CONFIG
       MCQ, quiz, flashcard, reasoning, matrix blocks (Zolto-unique)
       ===================================================================================== */
    const ASSESSMENT_EXT = Object.freeze({

        MCQ: Object.freeze({
            OPTION_LABELS:          ['A', 'B', 'C', 'D', 'E'],
            SHUFFLE_OPTIONS:        false,
            SHOW_EXPLANATION:       true,
            SHOW_DIFFICULTY:        true,
            DIFFICULTY_LEVELS:      ['easy', 'medium', 'hard', 'expert'],
            TYPES:                  ['single', 'multi', 'matrix', 'truefalse', 'fillblank', 'ordering'],
        }),

        QUIZ: Object.freeze({
            DEFAULT_TIME_LIMIT_S:   0,          // 0 = no limit
            SHOW_PROGRESS:          true,
            SHOW_SCORE:             true,
            ALLOW_REVIEW:           true,
            PASSING_PCT:            60,
            SHUFFLE_QUESTIONS:      false,
            MAX_ATTEMPTS:           Infinity,
            SCORE_FORMAT:           '{score}/{total} ({pct}%)',
        }),

        FLASHCARD: Object.freeze({
            FLIP_ANIMATION:         'flip3d',   // 'flip3d' | 'fade' | 'slide'
            FLIP_DURATION_MS:       400,
            SHOW_DIFFICULTY:        true,
            SHOW_TAGS:              true,
            SPACED_REPETITION:      true,
            CONFIDENCE_LEVELS:      ['again', 'hard', 'good', 'easy'],
        }),

        REASONING: Object.freeze({
            TYPES:                  ['series', 'analogy', 'visual-matrix', 'syllogism',
                                     'coding-decoding', 'direction', 'ranking',
                                     'blood-relation', 'venn', 'puzzle'],
            SHOW_HINT:              true,
            HINT_PENALTY_PCT:       25,
        }),
    });

    /* =====================================================================================
       §11  MASTER TEMPLATE REGISTRY
       All templates: Ultimate Showcase + Architecture + State Machine + Mind Map +
       Edu Note + Math Heavy + Diagram Suite + Assessment + Component Design + Blank
       ===================================================================================== */
    const TEMPLATES = Object.freeze({

        /* ── Ultimate Showcase ─────────────────────────────────────────────────────── */
        ULTIMATE_SHOWCASE:
`# The Zolto Language · Ultimate Showcase
Zolto unifies Markdown, LaTeX, Mermaid, SVG, Spatial Layouts, and Component Systems into one language.

## 1 · Rich Text & Typography

Standard prose supports enhanced **Bold**, _Italic_, ~~Strikethrough~~, ==Highlight==, and \`inline code\`.
Smart typography: em-dash --- en-dash -- ellipsis...

{red Native colour tags} and {#6366f1 hex colour codes} inline.

::: center
Precisely aligned text blocks — no CSS required.
:::

[important]
Key insight: Zolto replaces five separate tools with one unified syntax.
[/important]

[tip]
Use @collapse blocks to keep long explanations out of the way until needed.
[/tip]

## 2 · Advanced Mathematics

@math name="Quadratic Formula"
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
@/math

@math name="Fundamental Theorem of Calculus"
  \\int_{a}^{b} f(x)\\,dx = F(b) - F(a)
@/math

@math name="Einstein Field Equations"
  G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4}\\,T_{\\mu\\nu}
@/math

@math name="Maxwell — Gauss's Law"
  \\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}
@/math

Inline math: area of a circle is $A = \\pi r^2$, Euler's identity $e^{i\\pi} + 1 = 0$.

@math plot name="Quadratic Curve"
  function: "y = x^2 - 4x + 3"
  xrange: [-1, 5]
  yrange: [-2, 8]
  highlight_roots: true
  grid: true
@/math

## 3 · Data Tables

| Feature Segment      | Zolto        | Legacy                   |
| :------------------- | :----------: | -----------------------: |
| Spatial Graphing     | Native       | Mermaid.js / Visio       |
| Mathematical Typeset | Native       | LaTeX / MathJax          |
| Chart Rendering      | Native       | Chart.js / D3.js         |
| Rich Text            | Native       | Markdown / HTML          |
| MCQ & Assessment     | Native       | Separate LMS             |

## 4 · Charts

@chart pie title="Project Time Allocation"
  "Frontend Setup": 25
  "Backend Logic": 45
  "Database Schema": 15
  "DevOps / CI/CD": 15
@/chart

@chart bar title="Quarterly Revenue"
  "Q1": 12000
  "Q2": 18500
  "Q3": 14200
  "Q4": 22000
@/chart

@chart line title="Temperature Over Time"
  x: [0, 5, 10, 15, 20, 25, 30]
  y: [20, 22, 25, 24, 23, 26, 28]
  xlabel: "Time (min)"
  ylabel: "Temperature (°C)"
@/chart

## 5 · Sequence Diagram

@diagram sequence title="Auth Flow"
  User -> API Gateway: POST /login
  API Gateway => Auth Service: Validate Token
  Auth Service --> API Gateway: 200 OK
  API Gateway -> User: Return Session Cookie
@/diagram

## 6 · Spatial Graph Architecture

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

## 7 · Component Layouts

@row
  @card width=33%
    **Markdown Power**
    Headings, tables, callouts, tabs, accordions.
  @/card
  @card width=33%
    **Math Engine**
    LaTeX-level math with cleaner syntax.
  @/card
  @card width=33%
    **Diagram Suite**
    Flowcharts, mindmaps, sequences, ER, timelines.
  @/card
@/row

## 8 · Assessment Block

@mcq
  question: "Which law states F = ma?"
  A: "Newton's First Law"
  B: "Newton's Second Law" [correct]
  C: "Newton's Third Law"
  D: "Hooke's Law"
  explanation: "Newton's Second Law relates net force to mass × acceleration."
  difficulty: medium
@/mcq`,

        /* ── Educational Study Note ───────────────────────────────────────────────── */
        EDU_STUDY_NOTE:
`# Newton's Laws of Motion
*Physics · Classical Mechanics · Chapter 3*

---

## Overview

[important]
Newton's three laws form the entire foundation of classical mechanics.
Every force problem in the syllabus traces back to these three laws.
[/important]

## Law 1 · Inertia

**Definition**: An object at rest stays at rest, and an object in motion continues
in motion, unless acted upon by a net external force.

@math
  F_{\\text{net}} = 0 \\implies a = 0
@/math

[tip]
Think of a ball on a frictionless table. It never stops — there's no net force.
Real surfaces have friction, which is the external force that slows objects down.
[/tip]

@diagram sequence title="Inertia Demonstration"
  Object -> Table: Rests at position x₀
  Table -> Object: Normal force balances gravity
  External -> Object: Apply force F
  Object -> Space: Accelerates continuously
@/diagram

## Law 2 · F = ma

**Definition**: Acceleration is directly proportional to net force and inversely
proportional to mass.

@math name="Newton's Second Law"
  \\mathbf{F} = m\\mathbf{a}
@/math

@interactive
  slider name="mass" min=1 max=100 default=10 label="Mass (kg)"
  slider name="force" min=0 max=500 default=50 label="Force (N)"
  output: $a = \\frac{F}{m} = \\frac{force}{mass}\\text{ m/s}^2$
@/interactive

## Law 3 · Action–Reaction

**Definition**: For every action force there is an equal and opposite reaction force.

@math
  \\mathbf{F}_{\\text{action}} = -\\mathbf{F}_{\\text{reaction}}
@/math

[warning]
Action and reaction forces act on **different** objects. They never cancel each other out.
[/warning]

## Practice Quiz

@quiz title="Newton's Laws · Quick Check" time_limit=120

  @mcq
    question: "What is the SI unit of force?"
    A: "Dyne"
    B: "Newton" [correct]
    C: "Joule"
    D: "Watt"
    explanation: "Force is measured in Newtons (N) = kg·m/s²."
  @/mcq

  @mcq
    question: "If mass doubles and net force stays constant, acceleration…"
    A: "Doubles"
    B: "Halves" [correct]
    C: "Stays the same"
    D: "Quadruples"
    explanation: "From F = ma ⟹ a = F/m. Doubling m halves a."
  @/mcq

  @mcq
    question: "Which law explains why you lurch forward when a car brakes?"
    A: "First Law" [correct]
    B: "Second Law"
    C: "Third Law"
    D: "Law of Gravitation"
    explanation: "Your body's inertia (Law 1) resists the deceleration of the car."
  @/mcq

@/quiz

## Visual Summary

@row
  @card width=33%
    **Law 1 · Inertia**
    $F_{\\text{net}} = 0 \\Rightarrow a = 0$
    Objects resist change in motion.
  @/card
  @card width=33%
    **Law 2 · F = ma**
    $\\mathbf{F} = m\\mathbf{a}$
    Net force causes acceleration.
  @/card
  @card width=33%
    **Law 3 · Reaction**
    $F_A = -F_R$
    Every force has an equal opposite.
  @/card
@/row

---
**Next**: [Circular Motion](circular-motion.zl) | [Work & Energy](work-energy.zl)`,

        /* ── Mathematics Heavy ──────────────────────────────────────────────────────── */
        MATH_HEAVY:
`# Advanced Mathematics · Reference Sheet

## Calculus

@math name="Product Rule"
  \\frac{d}{dx}[u \\cdot v] = u'v + uv'
@/math

@math name="Chain Rule"
  \\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}
@/math

@math name="Integration by Parts"
  \\int u\\,dv = uv - \\int v\\,du
@/math

@math name="Taylor Series"
  f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n
@/math

## Linear Algebra

@math name="Matrix Multiplication"
  (AB)_{ij} = \\sum_{k=1}^{n} A_{ik}\\,B_{kj}
@/math

@math name="Determinant (2×2)"
  \\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc
@/math

@math name="Eigenvalue Problem"
  A\\mathbf{v} = \\lambda\\mathbf{v}
@/math

## Probability & Statistics

@math name="Bayes' Theorem"
  P(A|B) = \\frac{P(B|A)\\,P(A)}{P(B)}
@/math

@math name="Normal Distribution PDF"
  f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right)
@/math

## Physics

@math name="Schrödinger Equation (Time-Dependent)"
  i\\hbar\\,\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi
@/math

@math name="Maxwell — Faraday's Law"
  \\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}
@/math

## Chemistry

@math name="Nernst Equation"
  E = E^\\circ - \\frac{RT}{nF}\\ln Q
@/math

Combustion reaction: $\\ce{CH4 + 2O2 -> CO2 + 2H2O}$

Water formation: $\\ce{2H2 + O2 -> 2H2O}$

## Function Plots

@math plot name="Sine and Cosine"
  function: "sin(x)"
  function2: "cos(x)"
  xrange: [-6.28, 6.28]
  yrange: [-1.5, 1.5]
  grid: true
  legend: true
@/math`,

        /* ── Cloud Architecture ────────────────────────────────────────────────────── */
        ARCHITECTURE:
`# Microservices Cloud Architecture
System topology — global e-commerce platform.

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
  -> ( Send Email / SMS ) +primary`,

        /* ── State Machine ─────────────────────────────────────────────────────────── */
        STATE_MACHINE:
`# Authentication State Machine
Finite-state automata for user login flow.

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

        /* ── Mind Map ──────────────────────────────────────────────────────────────── */
        MIND_MAP:
`# Corporate Structure
Zolto Systems Corporation — reporting lines.

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

        /* ── Diagram Suite ─────────────────────────────────────────────────────────── */
        DIAGRAM_SUITE:
`# Zolto Diagram Suite · All Types

## 1 · Flowchart

@diagram flowchart title="CI/CD Pipeline"
  [Push to main] --> (Run Tests)
  (Run Tests) --"Pass"--> [Build Docker Image] +success
  (Run Tests) --"Fail"--> [Notify Team] +danger
  [Build Docker Image] --> [Push to Registry]
  [Push to Registry] --> [Deploy to Staging]
  [Deploy to Staging] --> (Smoke Tests)
  (Smoke Tests) --"Pass"--> [Deploy to Prod] +success
  (Smoke Tests) --"Fail"--> [Rollback] +danger
@/diagram

## 2 · Sequence Diagram

@diagram sequence title="OAuth2 Flow"
  User -> App: Click "Login with Google"
  App -> Google: Redirect with client_id & scope
  Google -> User: Show consent screen
  User -> Google: Grant permission
  Google -> App: Return auth_code
  App -> Google: Exchange code for tokens
  Google -> App: Return access_token + refresh_token
  App -> User: Render authenticated dashboard
@/diagram

## 3 · ER Diagram

@diagram erd
  User {
    uuid    id        PK
    string  email     UK
    string  name
    datetime created_at
  }
  Post {
    uuid    id        PK
    string  title
    text    body
    uuid    user_id   FK
    datetime published_at
  }
  Tag {
    uuid    id        PK
    string  name      UK
  }
  User ||--o{ Post : "writes"
  Post }o--o{ Tag : "tagged_with"
@/diagram

## 4 · Timeline

@timeline
  event year=1971 text="Intel 4004 — first commercial microprocessor"
  event year=1981 text="IBM PC launched"
  event year=1991 text="Linux kernel released by Torvalds"
  event year=1994 text="World Wide Web opens to the public"
  event year=2004 text="Facebook founded"
  event year=2008 text="iPhone App Store opens"
  event year=2015 text="TensorFlow open-sourced"
  event year=2022 text="ChatGPT launches, AI goes mainstream"
@/timeline

## 5 · Mindmap

@graph mindmap
  (Machine Learning)
    (Supervised)
      Regression
      Classification
    (Unsupervised)
      Clustering
      Dimensionality Reduction
    (Reinforcement)
      Q-Learning
      Policy Gradients
@/graph`,

        /* ── Assessment Template ───────────────────────────────────────────────────── */
        ASSESSMENT:
`# Physics Assessment · Chapter 5: Waves

[info]
This assessment covers wave motion, sound, and light. Time allowed: 30 minutes.
[/info]

@quiz title="Chapter 5 · Waves Assessment" time_limit=1800

  @mcq
    question: "The distance between two consecutive crests of a wave is called…"
    A: "Amplitude"
    B: "Wavelength" [correct]
    C: "Frequency"
    D: "Period"
    explanation: "Wavelength (λ) is the spatial period of the wave."
    difficulty: easy
    tags: [waves, definitions]
  @/mcq

  @mcq
    question: "If the frequency of a wave doubles while speed stays constant, the wavelength…"
    A: "Doubles"
    B: "Stays the same"
    C: "Halves" [correct]
    D: "Quadruples"
    explanation: "v = fλ, so if v is constant and f doubles, λ must halve."
    difficulty: medium
    tags: [waves, calculations]
  @/mcq

  @mcq
    question: "Which type of wave requires a medium to propagate?"
    A: "Electromagnetic"
    B: "Radio"
    C: "Mechanical" [correct]
    D: "Light"
    explanation: "Mechanical waves (e.g. sound) need a medium; EM waves do not."
    difficulty: medium
  @/mcq

@/quiz

## Flashcard Review

@flashcard
  front: What is the relationship between wave speed, frequency, and wavelength?
  back: $v = f\\lambda$, where v = speed (m/s), f = frequency (Hz), λ = wavelength (m).
  tags: [waves, formula]
  difficulty: easy
@/flashcard

@flashcard
  front: Define the Doppler Effect.
  back: The perceived change in frequency of a wave when source or observer is in motion relative to the other.
  tags: [waves, doppler]
  difficulty: medium
@/flashcard`,

        /* ── Component Design System ───────────────────────────────────────────────── */
        COMPONENT_DESIGN:
`# Design System · Component Reference

## Admonition Variants

[important]
Important block — draws maximum attention to critical information.
[/important]

[warning]
Warning block — caution required before proceeding.
[/warning]

[tip]
Tip block — helpful suggestion or shortcut.
[/tip]

[info]
Info block — supplementary context or background.
[/info]

[definition]
**Abstraction**: The process of hiding complex implementation details while
exposing only the necessary interface to the user.
[/definition]

## Tab Component

@tabs
  @tab label="Overview"
    This tab shows the high-level overview of the system architecture.
    Key components: API Gateway, Service Mesh, Data Layer.
  @/tab

  @tab label="Implementation"
    Technical implementation details and code examples appear here.
    \`\`\`js
    const client = new ZoltoClient({ theme: 'dark' });
    client.render('#canvas');
    \`\`\`
  @/tab

  @tab label="Examples"
    Live runnable examples and demos go in this tab.
    Use @interactive blocks for sliders and live computations.
  @/tab
@/tabs

## Accordion

@collapse title="What is Zolto?"
  Zolto is a unified markup language combining Markdown, LaTeX-level mathematics,
  Mermaid-level diagramming, SVG graphics, spatial layout, and a component system —
  all in a single clean, human-readable syntax.
@/collapse

@collapse title="Who should use Zolto?"
  Students, teachers, researchers, and technical writers who need to create rich,
  visually expressive documents without switching between multiple tools.
@/collapse

@collapse title="How does math rendering work?"
  Zolto includes a native math layout engine. Math blocks use a LaTeX-compatible
  command syntax but with improvements for readability and an optional cleaner shorthand.
@/collapse

## Card Grid

@row
  @card width=25%
    **📝 Markdown**
    All standard formatting plus callouts, cards, tabs, accordions, and more.
  @/card
  @card width=25%
    **∑ Mathematics**
    Inline and block equations, matrices, function plots, chemistry notation.
  @/card
  @card width=25%
    **📊 Diagrams**
    Flowcharts, sequences, ER, mindmaps, timelines, state machines.
  @/card
  @card width=25%
    **🧩 Components**
    Custom blocks, slots, props, themes, and composition.
  @/card
@/row`,

        /* ── Blank Starter ─────────────────────────────────────────────────────────── */
        BLANK:
`# Untitled Zolto Document

// Start writing your Zolto syntax here.
// Press Ctrl+P (or ⌘P) to open the command palette.
// Press Ctrl+M (or ⌘M) to insert a math block.
// Press Ctrl+D (or ⌘D) to insert a diagram block.`,

    });

    /* =====================================================================================
       §12  AUTOCOMPLETE SNIPPET REGISTRY
       IDE auto-complete triggers, labels, and boilerplate for the 6 capability domains.
       ===================================================================================== */
    const AUTOCOMPLETE = Object.freeze({

        // Trigger prefix → snippet object
        SNIPPETS: Object.freeze({

            // ── Math ─────────────────────────────────────────────────────────────────
            'math':      { label: '@math block',            body: '@math name="${1:Label}"\n  ${2:equation}\n@/math' },
            'imath':     { label: 'Inline math $…$',        body: '\\$${1:expression}\\$' },
            'mathplot':  { label: '@math plot',             body: '@math plot name="${1:Graph}"\n  function: "${2:y = x^2}"\n  xrange: [${3:-10}, ${4:10}]\n  yrange: [${5:-10}, ${6:10}]\n  grid: true\n@/math' },
            'matrix':    { label: 'Matrix (bmatrix)',       body: '\\\\begin{bmatrix}\n  ${1:a} & ${2:b} \\\\\\\\\\\n  ${3:c} & ${4:d}\n\\\\end{bmatrix}' },
            'integral':  { label: 'Definite integral',      body: '\\\\int_{${1:a}}^{${2:b}} ${3:f(x)}\\\\,dx' },
            'frac':      { label: 'Fraction \\frac{}{}',    body: '\\\\frac{${1:num}}{${2:den}}' },
            'sum':       { label: 'Summation',              body: '\\\\sum_{${1:i=1}}^{${2:n}} ${3:a_i}' },
            'vec':       { label: 'Vector \\vec{}',         body: '\\\\vec{${1:v}}' },
            'chem':      { label: 'Chemistry \\ce{}',       body: '\\\\ce{${1:H2O}}' },

            // ── Diagrams ─────────────────────────────────────────────────────────────
            'flowchart': { label: '@diagram flowchart',     body: '@diagram flowchart title="${1:Title}"\n  [${2:Start}] --> (${3:Decision})\n  (${3:Decision}) --"Yes"--> [${4:Process}] +success\n  (${3:Decision}) --"No"--> [${5:End}] +danger\n@/diagram' },
            'sequence':  { label: '@diagram sequence',      body: '@diagram sequence title="${1:Title}"\n  ${2:Alice} -> ${3:Bob}: ${4:Hello}\n  ${3:Bob} --> ${2:Alice}: ${5:Hi!}\n@/diagram' },
            'mindmap':   { label: '@graph mindmap',         body: '@graph mindmap\n  (${1:Central Topic})\n    (${2:Branch 1})\n      ${3:Leaf 1}\n    (${4:Branch 2})\n      ${5:Leaf 2}\n@/graph' },
            'timeline':  { label: '@timeline',              body: '@timeline\n  event year=${1:2020} text="${2:First event}"\n  event year=${3:2022} text="${4:Second event}"\n@/timeline' },
            'erd':       { label: '@diagram erd',           body: '@diagram erd\n  ${1:Entity} {\n    uuid   id   PK\n    string name\n  }\n@/diagram' },

            // ── Charts ───────────────────────────────────────────────────────────────
            'pie':       { label: '@chart pie',             body: '@chart pie title="${1:Title}"\n  "${2:Label A}": ${3:40}\n  "${4:Label B}": ${5:35}\n  "${6:Label C}": ${7:25}\n@/chart' },
            'bar':       { label: '@chart bar',             body: '@chart bar title="${1:Title}"\n  "${2:Item 1}": ${3:100}\n  "${4:Item 2}": ${5:150}\n  "${6:Item 3}": ${7:120}\n@/chart' },
            'line':      { label: '@chart line',            body: '@chart line title="${1:Title}"\n  x: [${2:0, 1, 2, 3, 4}]\n  y: [${3:10, 20, 15, 30, 25}]\n  xlabel: "${4:X}"\n  ylabel: "${5:Y}"\n@/chart' },

            // ── Markdown / Components ─────────────────────────────────────────────
            'important': { label: '[important] block',      body: '[important]\n${1:Content}\n[/important]' },
            'warning':   { label: '[warning] block',        body: '[warning]\n${1:Content}\n[/warning]' },
            'tip':       { label: '[tip] block',            body: '[tip]\n${1:Content}\n[/tip]' },
            'info':      { label: '[info] block',           body: '[info]\n${1:Content}\n[/info]' },
            'definition':{ label: '[definition] block',     body: '[definition]\n**${1:Term}**: ${2:Meaning}\n[/definition]' },
            'collapse':  { label: '@collapse accordion',    body: '@collapse title="${1:Title}"\n${2:Content}\n@/collapse' },
            'tabs':      { label: '@tabs component',        body: '@tabs\n  @tab label="${1:Tab 1}"\n    ${2:Content}\n  @/tab\n  @tab label="${3:Tab 2}"\n    ${4:Content}\n  @/tab\n@/tabs' },
            'row':       { label: '@row card grid',         body: '@row\n  @card width=50%\n    ${1:Left content}\n  @/card\n  @card width=50%\n    ${2:Right content}\n  @/card\n@/row' },
            'columns':   { label: '@columns layout',        body: '@columns count=${1:3}\n  ## ${2:Column 1}\n  ${3:Content}\n\n  ## ${4:Column 2}\n  ${5:Content}\n@/columns' },
            'table':     { label: '@table enhanced',        body: '@table title="${1:Title}"\n  headers: ["${2:Col 1}", "${3:Col 2}", "${4:Col 3}"]\n  rows:\n    - ["${5:A}", "${6:B}", "${7:C}"]\n@/table' },

            // ── Assessment ───────────────────────────────────────────────────────────
            'mcq':       { label: '@mcq question',          body: '@mcq\n  question: "${1:Question text?}"\n  A: "${2:Option A}"\n  B: "${3:Option B}" [correct]\n  C: "${4:Option C}"\n  D: "${5:Option D}"\n  explanation: "${6:Explanation.}"\n  difficulty: ${7:medium}\n@/mcq' },
            'quiz':      { label: '@quiz block',            body: '@quiz title="${1:Quiz Title}" time_limit=${2:300}\n\n  @mcq\n    question: "${3:Question?}"\n    A: "${4:Option A}" [correct]\n    B: "${5:Option B}"\n  @/mcq\n\n@/quiz' },
            'flashcard': { label: '@flashcard',             body: '@flashcard\n  front: ${1:Question or concept}\n  back: ${2:Answer or definition}\n  tags: [${3:tag1, tag2}]\n  difficulty: ${4:medium}\n@/flashcard' },

            // ── SVG / Canvas ─────────────────────────────────────────────────────────
            'canvas':    { label: '@canvas block',          body: '@canvas width=${1:800} height=${2:600}\n  ${3:// shapes and paths}\n@/canvas' },
            'vector':    { label: '@vector scene',          body: '@vector\n  layer: shapes\n  rect: x=10 y=10 width=200 height=100 fill=primary\n  circle: cx=300 cy=60 r=50 fill=accent\n@/vector' },

            // ── Heading shortcuts ─────────────────────────────────────────────────
            'h1':        { label: '# Heading 1',            body: '# ${1:Title}'                        },
            'h2':        { label: '## Heading 2',           body: '## ${1:Section}'                     },
            'h3':        { label: '### Heading 3',          body: '### ${1:Sub-section}'                },
            'hr':        { label: 'Horizontal rule ---',    body: '\n---\n'                             },
            'toc':       { label: 'Table of contents',      body: '@toc depth=${1:3}\n@/toc'            },
        }),

        // Pair-complete brackets for live typing
        PAIR_CHARS: Object.freeze({
            '(': ')', '[': ']', '{': '}', '<': '>',
            '"': '"', "'": "'", '`': '`',
            '$': '$',
        }),

        // Keywords that trigger @directive suggestions
        DIRECTIVE_TRIGGERS: Object.freeze([
            'math', 'chart', 'diagram', 'graph', 'timeline', 'table',
            'mcq', 'quiz', 'flashcard', 'reasoning', 'interactive',
            'canvas', 'vector', 'tabs', 'tab', 'collapse', 'row', 'card',
            'columns', 'toc', 'animate', 'component', 'slot', 'macro',
        ]),
    });

    /* =====================================================================================
       DEEP FREEZE UTILITY
       ===================================================================================== */
    const deepFreeze = (obj) => {
        if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
        Object.getOwnPropertyNames(obj).forEach(key => {
            const val = obj[key];
            if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
                deepFreeze(val);
            }
        });
        return Object.freeze(obj);
    };

    /* =====================================================================================
       PUBLIC API SURFACE
       ===================================================================================== */
    return deepFreeze({
        ERRORS,
        I18N,
        KEYBINDINGS,
        MARKDOWN_EXT,
        MATH_EXT,
        DIAGRAM_EXT,
        VECTOR_EXT,
        LAYOUT_EXT,
        COMPONENT_EXT,
        ASSESSMENT_EXT,
        TEMPLATES,
        AUTOCOMPLETE,

        // Convenience shortcut — default document loaded on first launch
        DEFAULT_ZOLTO: null,  // resolved at runtime: TEMPLATES.ULTIMATE_SHOWCASE
    });

})();

/* =========================================================================================
   EXPORT — compatible with ESM, CJS, and browser globals
   ========================================================================================= */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZOLTO_CONFIG_EXTENDED };
} else if (typeof window !== 'undefined') {
    window.ZOLTO_CONFIG_EXTENDED = ZOLTO_CONFIG_EXTENDED;
    // Resolve DEFAULT_ZOLTO after freeze (templates are already frozen strings)
    Object.defineProperty(window.ZOLTO_CONFIG_EXTENDED, 'DEFAULT_ZOLTO', {
        get: () => window.ZOLTO_CONFIG_EXTENDED.TEMPLATES.ULTIMATE_SHOWCASE,
        configurable: false,
        enumerable:   true,
    });
}
