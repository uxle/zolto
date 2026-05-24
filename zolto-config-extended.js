/**
 * =========================================================================================
 * ZOLTO STUDIO: ENTERPRISE CONFIGURATION EXTENDED (Module 3 of 7)
 * =========================================================================================
 * Architecture: Minimal aesthetics, zero hardcoded magic numbers, Apple-level UI/UX polish.
 * Description: Contains diagnostic error codes, UI internationalization, system 
 * keybindings, and the master Zolto templates.
 * =========================================================================================
 */

'use strict';

const ZOLTO_CONFIG_EXTENDED = (function () {

    /* =====================================================================================
       1. DIAGNOSTIC ERROR CODES & MESSAGES (LSP ENGINE)
       ===================================================================================== */
    const ERRORS = Object.freeze({
        // --- LEXICAL ERRORS (L000) ---
        L001: { code: 'L001', type: 'LexicalError', message: 'Illegal tab character detected. Zolto enforces strict 2-space indentation for spatial matrices.', severity: 'error' },
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
       2. UI INTERNATIONALIZATION (i18n)
       ===================================================================================== */
    const I18N = Object.freeze({
        EN: {
            TOASTS: {
                FILE_LOADED: 'Zolto file loaded successfully.',
                FILE_SAVED: 'Zolto project saved.',
                FILE_LOAD_ERROR: 'Failed to read file. Please ensure it is a valid text or .zl file.',
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
                PLACEHOLDER: '// Start typing Zolto syntax here...',
                HEADER_TITLE: 'Source Code (.zl)',
                LINE: 'Ln',
                COL: 'Col',
                UTF8: 'UTF-8'
            },
            CANVAS: {
                HEADER_TITLE: 'Spatial Runtime',
                EMPTY_STATE: 'AST is empty. Type Zolto syntax to render spatial nodes, charts, or math.',
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
       3. KEYBINDINGS & SHORTCUT REGISTRY
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
            PAN_CANVAS: ['Space'] 
        }
    });

    /* =====================================================================================
       4. MASTER TEMPLATE REGISTRY
       ===================================================================================== */
    const TEMPLATES = Object.freeze({
        
        ULTIMATE_SHOWCASE: 
`# The Zolto Language: Ultimate Showcase
Zolto is an infinity-level language. It combines Markdown, Mermaid, LaTeX, and UI Layouts into a single spatial grid.

## 1. Rich Text & Typography
Standard text is supported, but enhanced with Zolto Inlines.
You can use **Bold**, _Italic_, and ~~Strikethrough~~.
You can also use ==Highlighter Pens== and {red native color tags}.
{#0ea5e9 Hex codes} are also fully supported inline.

::: center :::
You can precisely align text blocks without CSS.
This block is centered.
:::

## 2. Advanced Mathematics (LaTeX Alternative)
Zolto features a native math layout engine. No external libraries required.

math: The Quadratic Formula
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}

math: Calculus - The Fundamental Theorem
  \\int_{a}^{b} f(x) dx = F(b) - F(a)

math: Einstein Field Equations
  R_{\\mu\\nu} - \\frac{1}{2}Rg_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}

Inline math is also supported: Compute the area of a circle using $A = \\pi r^2$.

## 3. Data Tables
Tables are grid-aware and support alignment syntax.

| Feature Segment      | Zolto Support | Legacy Alternative |
| :------------------- | :-----------: | -----------------: |
| Spatial Graphing     | Native        | Mermaid.js / Visio |
| Mathematical Typeset | Native        | LaTeX / MathJax    |
| Chart Rendering      | Native        | Chart.js / D3.js   |
| Rich Text Processing | Native        | Markdown / HTML    |

## 4. Native SVG Charting
Zolto generates SVG charts dynamically from data blocks.

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
The crown jewel of Zolto. Draw complex, interactive nodes and link them mathematically.

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

        MIND_MAP: 
`# Corporate Structure
Zolto Systems Corporation reporting lines.

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

        BLANK: 
`# Untitled Zolto Document

// Start typing your Zolto syntax here...`

    });

    const deepFreeze = obj => {
        Object.keys(obj).forEach(prop => {
            if (typeof obj[prop] === 'object' && obj[prop] !== null) {
                deepFreeze(obj[prop]);
            }
        });
        return Object.freeze(obj);
    };

    return deepFreeze({
        ERRORS,
        I18N,
        KEYBINDINGS,
        TEMPLATES,
        DEFAULT_ZOLTO: TEMPLATES.ULTIMATE_SHOWCASE 
    });

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZOLTO_CONFIG_EXTENDED };
} else if (typeof window !== 'undefined') {
    window.ZOLTO_CONFIG_EXTENDED = ZOLTO_CONFIG_EXTENDED;
}
