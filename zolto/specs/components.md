# Zolto Component System Reference

**File:** `zolto/specs/components.md`
**Version:** 8.1.0 (Infinity Architecture · Component & Design System Edition)
**Source of truth:** `js/renderer/component-renderer.js` · `js/parser/ast.js` · `zolto/specs/ast.md`
**Cross-references:** `zolto/specs/syntax.md` · `zolto/specs/renderer.md`

---

## Table of Contents

1. [What Is the Component System?](#1-what-is-the-component-system)
2. [Architecture Overview](#2-architecture-overview)
3. [Built-in Components](#3-built-in-components)
4. [Defining Custom Components](#4-defining-custom-components)
5. [Using Components](#5-using-components)
6. [Slots & Composition](#6-slots--composition)
7. [Props System](#7-props-system)
8. [Variants](#8-variants)
9. [Themes & Design Tokens](#9-themes--design-tokens)
10. [Templates](#10-templates)
11. [Macros](#11-macros)
12. [Animations](#12-animations)
13. [Component Registry API](#13-component-registry-api)
14. [Component Renderer Internals](#14-component-renderer-internals)
15. [Style Inheritance & Resolution](#15-style-inheritance--resolution)
16. [Runtime Injection](#16-runtime-injection)
17. [Built-in Component Reference](#17-built-in-component-reference)
18. [Design System Integration](#18-design-system-integration)
19. [Complete Examples](#19-complete-examples) — Quick-start · Study notes · Dashboard · Interactive formula

---

## 1. What Is the Component System?

The Zolto Component System lets you build **reusable content blocks** — anything from a simple styled card to a full multi-panel dashboard widget — using nothing but `.zl` syntax.

### How it works in two steps

> **Step 1 — Define a blueprint** using `@component`:
> Declare a name, default prop values, and a template body. This is your component's "mould".
>
> **Step 2 — Stamp out copies** using `<ComponentName prop="value">`:
> Every time you write the PascalCase tag, the renderer clones the blueprint and fills in your props.

```zolto
// Step 1: Define once
@component UserCard name="" role="Member"
  ### {name}
  Role: **{role}**
@/component

// Step 2: Use anywhere
<UserCard name="Alice" role="Admin" />
<UserCard name="Bob"   role="Editor" />
<UserCard name="Carol" role="Viewer" />
```

Rendered output for each tag:
```html
<div class="zolto-component zolto-cmp-UserCard">
  <h3>Alice</h3><p>Role: <strong>Admin</strong></p>
</div>
```

Components are defined once and used anywhere in the same document or across imported files. They can contain any valid Zolto content — prose, math, diagrams, charts, other components, layouts, assessments.

### What components cannot do

- Execute arbitrary JavaScript at definition time (they are declarative)
- Access the DOM directly from their definition body
- Use names that start with lowercase (`usercard` is invalid — use `UserCard`)
- Nest deeper than 32 levels (error `C001`)
- Define themselves recursively (error `C002`)

---

## 2. Architecture Overview

```
 Source (.zl)
      │
      ▼
 Parser (parser.js)
  ├─ @component …  →  ComponentDef AST node
  │                    ↓ stored in Document.components[]
  └─ <UserCard …>  →  ComponentUse AST node
                       ↓ stored in Document.nodes[]
      │
      ▼
 Transformer (transformer.js)
  ├─ Registers all ComponentDef nodes in ComponentRegistry
  ├─ Validates ComponentUse references (error E006 if unresolved)
  └─ Parses props strings → parsedProps objects
      │
      ▼
 ComponentRenderer (component-renderer.js)
  ├─ Looks up ComponentDef from registry
  ├─ Merges props: defaultProps → definition → use-site
  ├─ Resolves variant classes
  ├─ Builds slot map (slotContent → named slot buckets)
  ├─ Renders template body (substituting SlotOutlet nodes)
  └─ Applies style inheritance chain
      │
      ▼
 HTML output
```

### Files involved

| File | Role |
|------|------|
| `js/parser/ast.js` | `ASTFactory.createComponentDef/Use/SlotDef/SlotOutlet` |
| `js/parser/parser.js` | Tokenises `@component`, `<PascalCase>`, `@slot` syntax |
| `js/parser/transformer.js` | Registers defs, validates uses, parses props |
| `js/renderer/component-renderer.js` | Instantiates and renders components to HTML |
| `js/renderer/renderer.js` | Delegates `ComponentUse` nodes to component-renderer |
| `zolto/grammar/components.zol` | Grammar rules for component syntax |

---

## 3. Built-in Components

Zolto ships with **30 built-in system components** that are always available — no `@component` definition needed. Just write the tag and it works.

```zolto
// No setup required — these just work:
@card variant=primary
  Content here.
@/card

@badge tone=success shape=pill ✓ Verified

@alert type=warning title="Watch Out"
  This action cannot be undone.
@/alert

@progress value=72 label="Module completion" showValue=true
```

### 3.1 Layout & Structure

| Component | Shorthand | Description |
|-----------|-----------|-------------|
| `Card` | `@card` | Elevated content container with optional title and variant |
| `Row` | `@row` | Flex-row card group |
| `Column` | `@column` | Single flex column inside a `@row` |
| `Grid` | `@grid` | CSS grid layout wrapper |
| `Stack` | `@stack` | Vertical flex stack with configurable gap |
| `Divider` | `@divider` | Horizontal or vertical rule with optional label |
| `Spacer` | `@spacer` | Invisible whitespace block |

### 3.2 Navigation & Disclosure

| Component | Shorthand | Description |
|-----------|-----------|-------------|
| `Tabs` | `@tabs` | Tab group container |
| `Tab` | `@tab` | Single tab pane |
| `Accordion` | `@collapse` | Expandable/collapsible section |
| `AccordionItem` | *(nested)* | Single accordion item |

### 3.3 Feedback & Callouts

| Component | Shorthand | Description |
|-----------|-----------|-------------|
| `Alert` | `@alert` | Inline alert/notification strip |
| `Callout` | `@callout` | Styled callout with icon and colour |
| `Admonition` | `::: type` | Block admonition (note/tip/warning/…) |
| `Badge` | `@badge` | Small inline label pill |
| `Tag` | `@tag` | Coloured topic tag |

### 3.4 Data Display

| Component | Shorthand | Description |
|-----------|-----------|-------------|
| `Table` | Markdown `\|` | Enhanced data table |
| `Chart` | `@chart` | Data visualisation (all chart types) |
| `Timeline` | `@timeline` | Event timeline |
| `Progress` | `@progress` | Horizontal progress bar |

### 3.5 Interactive & Specialised

| Component | Shorthand | Description |
|-----------|-----------|-------------|
| `Slider` | *(inside `@interactive`)* | Range input with live output |
| `Toggle` | `@toggle` | Boolean on/off switch |
| `Flashcard` | `@flashcard` | Flip-card for study |
| `Mcq` | `@mcq` | Multiple-choice question block |
| `Quiz` | `@quiz` | Timed quiz wrapper |
| `Math` | `@math` | Equation block |
| `MathPlot` | `@math plot` | Function plot |

### 3.6 Media

| Component | Shorthand | Description |
|-----------|-----------|-------------|
| `Embed` | `@embed` | Embedded external resource |
| `Avatar` | `@avatar` | Circular user avatar with optional fallback |
| `Icon` | `@icon` | Named icon from the Zolto icon set |

---

## 4. Defining Custom Components

A component definition uses `@component` followed by the component name and default prop values.

```zolto
@component ComponentName prop1="default" prop2=0 prop3=null
  // Template body: any valid Zolto content
  // Reference props with {propName}
@/component
```

> **Mental model:** The attributes you write on the `@component` line are the **default props** — the values used when a caller doesn't provide that attribute. A caller overrides them by passing a different value: `<ComponentName prop1="override">`.

### Rules

1. Names must be **PascalCase** and start with an uppercase letter.
2. Definitions are **document-scoped** by default. Use `@import` to share across files.
3. A component can be defined anywhere before its first use in the same file (the transformer resolves them in a two-pass scan).
4. Component definitions are stored in `Document.components[]` — they never appear in the rendered output directly.

### Simple example

```zolto
@component StatCard title="" value="" unit="" trend="neutral"
  @card variant=outline
    **{title}**

    # {value} {unit}

    {#if trend == "up"}
      {success ↑ Trending up}
    {/if}
    {#if trend == "down"}
      {danger ↓ Trending down}
    {/if}
  @/card
@/component
```

### With slots

```zolto
@component FeatureCard title="" icon="" variant="default"
  @slot header
    {#if icon}
    @icon name={icon} size=24
    {/if}
    ### {title}
  @/slot

  @slot default
    // Caller fills this slot with their content.
  @/slot

  @slot footer
    ---
    *{title}*
  @/slot
@/component
```

### With nested layout

```zolto
@component CompareCard leftTitle="" rightTitle=""
  @row
    @card width=50%
      **{leftTitle}**
      @slot left
        // Left column content
      @/slot
    @/card

    @card width=50%
      **{rightTitle}**
      @slot right
        // Right column content
      @/slot
    @/card
  @/row
@/component
```

---

## 5. Using Components

### 5.1 Self-closing (no children)

Use this when all content is provided through props:

```zolto
<StatCard title="Revenue" value="$124,000" unit="USD" trend="up" />
<StatCard title="Users" value="8,420" unit="accounts" trend="up" />
<StatCard title="Churn" value="2.4" unit="%" trend="down" />
```

### 5.2 With children (default slot)

Content between the open and close tags fills the `default` slot:

```zolto
<FeatureCard title="Real-time Rendering" icon="zap">
  Zolto re-renders instantly as you type — no save required.
  Changes appear in the canvas within **16 ms**.
</FeatureCard>
```

### 5.3 With named slots

Inject content into specific named slots using `@slot name="…"`:

```zolto
<FeatureCard title="Math Engine" icon="sigma">
  Native LaTeX-compatible math rendering with no external dependencies.

  @slot footer
  Supports 200+ LaTeX commands, chemistry notation, and function plots.
  @/slot
</FeatureCard>
```

### 5.4 With multiple named slots

```zolto
<CompareCard leftTitle="Zolto" rightTitle="Markdown">
  @slot left
  - Native math
  - Native diagrams
  - Component system
  - Assessment blocks
  - Spatial layout
  @/slot

  @slot right
  - Basic formatting
  - Code blocks
  - Tables (GFM)
  - Images
  - Links
  @/slot
</CompareCard>
```

### 5.5 Attribute shorthand — boolean props

Boolean props can be set without a value (presence = `true`):

```zolto
<DataCard title="Revenue" featured bordered elevated />
// equivalent to:
<DataCard title="Revenue" featured=true bordered=true elevated=true />
```

---

## 6. Slots & Composition

### 6.1 Default slot

Every component implicitly has a `default` slot. **Any children not wrapped in a named `@slot` block go there automatically** — you never need to explicitly target it.

```zolto
<MyCard title="Hello">
  This paragraph is in the default slot.
  And so is this one.
  Even this @math block: $F = ma$
</MyCard>
```

Think of it as: *whatever you put inside the component tags, unless you wrap it in a named slot, ends up in the body of the component.*

### 6.2 Named slots — definition

In the component definition, `@slot name="…" … @/slot` marks **where** that named slot's content is injected, and the body inside it is the **fallback** (shown when the caller doesn't fill that slot).

```zolto
@component ArticleLayout
  @slot header
    // ← This fallback renders if caller provides no header slot
  @/slot

  <article class="article-body">
    @slot default
      // ← Caller's default/body content goes here
    @/slot
  </article>

  @slot footer
    ---
    // ← Footer fallback
  @/slot
@/component
```

### 6.3 Named slots — use site

At the call site, wrap slot content with `@slot name="…" … @/slot` inside the component tags:

```zolto
<ArticleLayout>
  @slot header
  # Understanding Newton's Laws
  *By Dr. A. Kumar · September 2025*
  @/slot

  The three laws of motion form the foundation of classical mechanics.

  @slot footer
  **Tags:** #physics #mechanics #newton
  @/slot
</ArticleLayout>
```

### 6.4 Slot fallbacks

When a caller does not provide content for a slot, the fallback (the content defined inside `@slot … @/slot` in the component definition body) is rendered instead.

```zolto
@component InfoPanel title=""
  @slot icon
    @icon name="info" size=20
  @/slot

  ### {title}

  @slot default
    *No content provided.*
  @/slot
@/component

// This uses the icon fallback:
<InfoPanel title="Quick Tip">
  Always draw a free-body diagram first.
</InfoPanel>

// This overrides the icon slot:
<InfoPanel title="Warning">
  @slot icon
    @icon name="warning" size=20 color=amber
  @/slot
  Do not apply force before checking the pivot.
</InfoPanel>
```

### 6.5 Slot forwarding

Components can forward a slot through to an inner component:

```zolto
@component OuterCard title=""
  @card variant=primary
    **{title}**
    @slot default
      // This slot passes caller content through to the inner @card
    @/slot
  @/card
@/component
```

### 6.6 Composition — nesting components

Components can be nested freely up to 32 levels:

```zolto
<ArticleLayout>
  @slot header
  # Deep Learning Fundamentals
  @/slot

  <FeatureCard title="Backpropagation">
    The algorithm that makes neural network training possible.
    $\frac{\partial L}{\partial w} = \frac{\partial L}{\partial a} \cdot \frac{\partial a}{\partial z} \cdot \frac{\partial z}{\partial w}$
  </FeatureCard>

  <FeatureCard title="Gradient Descent">
    Optimisation at the heart of every model.
    @math name="Update Rule"
      w \leftarrow w - \alpha \nabla_w L
    @/math
  </FeatureCard>
</ArticleLayout>
```

---

## 7. Props System

### 7.1 Prop types

| Type | Zolto declaration | Example | Validator |
|------|------------------|---------|-----------|
| `string` | `title=""` | `title="Hello"` | `typeof v === 'string'` |
| `number` | `count=0` | `count=42` | `typeof v === 'number'` |
| `boolean` | `visible=true` | `visible` (presence) | `typeof v === 'boolean'` |
| `color` | `color=""` | `color=#6366f1` or `color=primary` | Hex or named token |
| `size` | `width="auto"` | `width=240px` `width=50%` | CSS length value |
| `enum` | `variant="default"` | `variant=primary` | Validated per-component |
| `slot` | *(implicit)* | Named slot content | — |
| `list` | `tags=[]` | `tags=[a,b,c]` | `Array.isArray` |
| `object` | `config={}` | *(JSON-like)* | typeof object |

### 7.2 Prop merging order

Props are merged in this priority order (later wins):

```
1. Component default props  (declared in @component header)
2. Document-level defaults  (set via @theme or @config block)
3. Use-site props           (<MyCard title="…" variant="…">)
4. Inline overrides         (style="" class="" attributes)
```

### 7.3 Referencing props in templates

Inside a component body, reference props with `{propName}`:

```zolto
@component PriceTag price="" currency="USD" discounted=false
  @card variant=outline
    **{currency} {price}**

    {#if discounted}
    {success Save 20%}
    {/if}
  @/card
@/component
```

### 7.4 Conditional rendering with props

```zolto
@component ProfileCard name="" role="" avatar=null showBadge=false

  {#if avatar}
  @avatar src={avatar} size=48 alt={name}
  {/if}

  **{name}**
  *{role}*

  {#if showBadge}
  @badge variant=primary {role}
  {/if}

@/component
```

### 7.5 Prop validation errors

The validator emits these diagnostics for prop issues:

| Code | Severity | Trigger |
|------|----------|---------|
| `E007` | error | Prop type mismatch (e.g. passing a string where a number is expected) |
| `E008` | warning | Declared prop has no matching slot in the template |
| `C003` | warning | Variant value not found; falls back to default |
| `C004` | warning | Theme token referenced but not defined in active theme |

---

## 8. Variants

Variants let a single component have multiple visual forms without duplicating definitions.

### 8.1 Declaring variants

```zolto
@component AlertBlock message="" type="info"
  // type is a variant prop — values map to CSS classes
  @slot icon
    {#if type == "success"} ✅ {/if}
    {#if type == "warning"} ⚠️ {/if}
    {#if type == "danger"}  🚫 {/if}
    {#if type == "info"}    ℹ️ {/if}
  @/slot

  @slot default
    {message}
  @/slot
@/component
```

### 8.2 Built-in variant axes

All built-in components support these standard variant axes:

| Axis | Values | CSS effect |
|------|--------|-----------|
| `size` | `xs` `sm` `md` `lg` `xl` `2xl` | font-size, padding, border-radius |
| `tone` | `default` `primary` `success` `warning` `danger` `info` `muted` | colour scheme |
| `shape` | `default` `rounded` `pill` `square` | border-radius |
| `outline` | `true` `false` | border vs filled background |
| `ghost` | `true` `false` | transparent background with border |

### 8.3 Variant examples

```zolto
// Size variants
<Badge size=sm>Beta</Badge>
<Badge size=lg>New Feature</Badge>

// Tone variants
<Alert tone=success>Operation completed successfully.</Alert>
<Alert tone=danger>This action cannot be undone.</Alert>

// Shape variants
<Card shape=rounded>Default rounded card.</Card>
<Card shape=pill>Pill-shaped card.</Card>

// Outline variant
<Card outline=true>Outlined card with transparent background.</Card>

// Ghost variant
<Card ghost=true>Ghost card — visible only on hover.</Card>

// Combined
<Badge tone=success size=sm shape=pill>✓ Verified</Badge>
```

---

## 9. Themes & Design Tokens

### 9.1 Document-level theme override

Override any CSS custom property for the entire document:

```zolto
---
theme: dark
---

--accent-primary: #6366f1
--accent-secondary: #8b5cf6
--font-sans: "Inter Variable", system-ui, sans-serif
--font-mono: "JetBrains Mono", "Fira Code", monospace
--radius-md: 12px
--radius-lg: 16px
--card-shadow: 0 4px 24px rgba(0,0,0,0.4)
```

### 9.2 Scoped theme block

Apply token overrides to a specific block or component tree. The tokens only affect elements rendered inside the tagged block — nothing outside it changes.

```zolto
@theme name="physics-palette"
  --accent-primary: #0ea5e9;
  --card-bg: rgba(14, 165, 233, 0.05);
  --card-border: rgba(14, 165, 233, 0.3);
  --heading-color: #7dd3fc;
  --radius-md: 12px;
@/theme

@grid cols=3 theme="physics-palette"
  @card
    ## Mechanics
    Classical and quantum.
  @/card
  @card
    ## Thermodynamics
    Heat, entropy, cycles.
  @/card
  @card
    ## Electromagnetism
    Fields, waves, circuits.
  @/card
@/grid
```

> **How it works:** `@theme` defines a named token set. Pass `theme="name"` to any layout block or component to apply that token set as CSS custom properties scoped to that element's subtree. Multiple named themes can coexist in the same document.

### 9.3 Token naming convention

All tokens follow the `--category-variant` pattern:

| Category | Tokens |
|----------|--------|
| Accent | `--accent-primary` `--accent-secondary` `--accent-tertiary` |
| Background | `--bg-app` `--bg-canvas` `--bg-panel` `--bg-deep` `--bg-surface` |
| Text | `--text-main` `--text-mute` `--text-faint` `--text-link` |
| Border | `--border-subtle` `--border-normal` `--border-heavy` |
| Intent | `--intent-primary` `--intent-success` `--intent-warning` `--intent-danger` `--intent-info` |
| Font | `--font-sans` `--font-mono` `--font-display` |
| Radius | `--radius-sm` `--radius-md` `--radius-lg` `--radius-xl` `--radius-full` |
| Spacing | `--space-1` … `--space-16` (4px increments) |
| Shadow | `--shadow-sm` `--shadow-md` `--shadow-lg` `--shadow-glow` |
| Transition | `--duration-fast` `--duration-normal` `--duration-slow` `--easing-default` |

### 9.4 Built-in themes

Zolto ships four base themes, selectable in frontmatter or at runtime:

| Theme ID | File | Description |
|----------|------|-------------|
| `light` | `css/themes/light.css` | Clean light background, dark text |
| `dark` | `css/themes/dark.css` | Deep dark canvas, subtle borders |
| `midnight` | `css/themes/midnight.css` | Deep navy, high contrast accents |
| `oled` | `css/themes/oled.css` | Pure black background for OLED screens |

Set in frontmatter:
```zolto
---
theme: midnight
---
```

---

## 10. Templates

Templates are parameterised document fragments — higher-level than components because they define structural patterns for whole sections of a document.

### 10.1 Defining a template

```zolto
@template StudySection(subject, level="intermediate", emoji="📚")
  ## {emoji} {subject}
  *Difficulty: {level}*

  [info]
  This section covers {subject} at the {level} level.
  [/info]

  @slot content
    // Section body goes here
  @/slot

  @collapse title="Quick Review"
    @slot review
      // Summary / review points
    @/slot
  @/collapse
@/template
```

### 10.2 Using a template

```zolto
<StudySection subject="Newton's Laws" level="foundation" emoji="⚙️">
  @slot content
  The three laws explain all classical motion.
  @/slot

  @slot review
  - Law 1: Objects resist changes in motion (inertia)
  - Law 2: F = ma
  - Law 3: Action = −reaction
  @/slot
</StudySection>
```

### 10.3 Template vs Component

| | Template | Component |
|--|---------|-----------|
| **Purpose** | Document structure patterns | Reusable UI blocks |
| **Scope** | One or more document sections | Inline or block element |
| **Props** | Positional or named params | Named with type declarations |
| **Typical use** | Chapter layouts, lesson templates | Cards, alerts, badges, charts |
| **AST node** | `TemplateDef` / `ComponentUse` | `ComponentDef` / `ComponentUse` |

---

## 11. Macros

Macros are text-expansion shortcuts — lighter than components, with no slot system.

### 11.1 Defining a macro

```zolto
@macro equation(name, latex)
  @math name="{name}"
    {latex}
  @/math
@/macro

@macro theorem(name, statement)
  [theorem]
  **{name}**: {statement}
  [/theorem]
@/macro

@macro cite(author, year, title)
  [{author}, {year}] *{title}*
@/macro
```

### 11.2 Calling a macro

```zolto
@equation("Newton's Second Law", "\\mathbf{F} = m\\mathbf{a}")

@theorem("Newton's First Law", "An object at rest stays at rest unless acted upon by a net force.")

@cite("Newton", "1687", "Philosophiæ Naturalis Principia Mathematica")
```

### 11.3 When to use macros vs components

Use **macros** when:
- You only need simple text/block expansion
- There are no slots, no conditional rendering, no variant system
- The pattern is used inline within prose (e.g. citations, formula shorthands)

Use **components** when:
- You need slots (caller-injected content)
- You need conditional rendering based on props
- You need the variant or theme system
- The block has complex structure

---

## 12. Animations

The animation system lets you define named CSS keyframe animations and apply them to components or individual blocks.

### 12.1 Defining an animation

```zolto
@animate fadeSlideUp duration=300ms timing=ease delay=0ms
  @keyframe 0%
    opacity: 0
    transform: translateY(12px)
  @keyframe 100%
    opacity: 1
    transform: translateY(0)
@/animate

@animate scaleIn duration=200ms timing=cubic-bezier(0.34,1.56,0.64,1)
  @keyframe 0%
    opacity: 0
    transform: scale(0.85)
  @keyframe 100%
    opacity: 1
    transform: scale(1)
@/animate

@animate shimmerLoading duration=1.5s timing=linear loop=true
  @keyframe 0%
    background-position: -200% center
  @keyframe 100%
    background-position: 200% center
@/animate
```

### 12.2 Applying an animation

Apply via the `animate` prop on any component or built-in block:

```zolto
<FeatureCard title="Fast Rendering" animate="fadeSlideUp">
  Renders 10,000 nodes in under 16 ms.
</FeatureCard>

@card animate="scaleIn"
  This card scales in on appearance.
@/card
```

### 12.3 Staggered entrance animations

Use `animate-stagger` on any grid or flex container to animate multiple children in sequence with a fixed delay between each:

```zolto
// Grid: each card appears 60ms after the previous
@grid cols=3 animate-stagger="fadeSlideUp" stagger-delay=60ms
  @card
    ## Mechanics
    Classical motion and forces.
  @/card
  @card
    ## Thermodynamics
    Heat, entropy, and cycles.
  @/card
  @card
    ## Electromagnetism
    Fields, currents, and waves.
  @/card
@/grid

// Apply to custom components too
@grid cols=3 animate-stagger="scaleIn" stagger-delay=80ms
  <ConceptCard term="Inertia" />
  <ConceptCard term="Momentum" />
  <ConceptCard term="Acceleration" />
@/grid
```

The renderer injects `animation-delay: N×stagger-delay` on each child element automatically — no per-child configuration needed.

### 12.4 Animation AST nodes

```ts
interface Animation {
  type:      'Animation';
  id:        string;
  line:      number;
  name:      string;                  // 'fadeSlideUp', 'scaleIn', …
  timing:    'ease' | 'linear' | 'ease-in' | 'ease-out' | 'spring'
           | string;                  // accepts any CSS easing string
  duration:  string | null;           // '300ms', '1.5s'
  delay:     string | null;           // '0ms', '60ms'
  config:    string;                  // raw config string
  keyframes: Keyframe[];
}

interface Keyframe {
  type:       'Keyframe';
  offset:     number;                 // 0–100 (percent of animation)
  properties: Record<string, string>; // CSS property → value
}
```

---

## 13. Component Registry API

The component registry is managed by `ZoltoComponentRuntime` (exported from `js/zolto-router-engine.js`):

```js
import { ZoltoComponentRuntime } from './js/zolto-router-engine.js';

// Register a component programmatically (for plugin authors)
ZoltoComponentRuntime.register('MyWidget', defNode);

// Check if a component is registered
ZoltoComponentRuntime.has('UserCard');  // → boolean

// Retrieve a component definition
const def = ZoltoComponentRuntime.get('UserCard');  // → ComponentDef | null

// List all registered component names
ZoltoComponentRuntime.list();  // → string[]

// Clear all registered components (between document reloads)
ZoltoComponentRuntime.clear();
```

### Registry rules

| Rule | Error |
|------|-------|
| Names must start with uppercase | `C001` if violated |
| Max 256 components per registry | Silent drop after limit |
| Reserved names (Root, Document, Page, Fragment) cannot be registered | `C001` |
| Recursive component definitions are rejected at registration | `C002` |
| Duplicate names: later definition overwrites earlier | warning `E004` |

---

## 14. Component Renderer Internals

The component renderer (`js/renderer/component-renderer.js`) runs at render time, not parse time. This means components are fully lazy — a `ComponentDef` that is defined but never used costs nothing.

### Render flow

```
ComponentUse node
      │
      ├─ Look up ComponentDef from registry (E006 if missing)
      │
      ├─ Merge props
      │     defaultProps → definition → parsedProps → inline-override
      │
      ├─ Resolve variant classes
      │     props.size, props.tone, props.shape, props.outline, props.ghost
      │     → CSS class list via variant map
      │
      ├─ Build slot map
      │     slotContent[] → { default: [], header: [], footer: [], … }
      │
      ├─ Render template body
      │     Walk ComponentDef.children
      │     When SlotOutlet encountered: inject slot content or fallback
      │     All other nodes: rendered by main ZoltoRenderer
      │
      ├─ Apply style inheritance
      │     global-theme → document-theme → component-defaults
      │     → component-instance → inline-override
      │
      └─ Emit HTML
            <div class="zolto-component zolto-cmp-{Name} {variantClasses} {themeClass}"
                 style="{styleVars}"
                 data-component="{Name}">
              …rendered template…
            </div>
```

### Style variable injection

Props declared in a component's `propStyleMap` are injected as CSS custom properties on the root element:

```js
// In component definition:
propStyleMap: {
  'color':    '--cmp-color',
  'bg':       '--cmp-bg',
  'radius':   '--cmp-radius',
}

// Emitted HTML style attribute:
style="--cmp-color: #6366f1; --cmp-bg: rgba(99,102,241,0.1); --cmp-radius: 12px"
```

---

## 15. Style Inheritance & Resolution

Styles are resolved in a five-step cascade (last wins):

```
1. global-theme        css/themes/{theme}.css
       ↓
2. document-theme      --token: value overrides in frontmatter/document body
       ↓
3. component-defaults  Default styles from ComponentDef.defaultProps
       ↓
4. component-instance  Props provided at use site (<MyCard bg=#fff>)
       ↓
5. inline-override     style="" or class="" attributes on the component tag
```

This matches the same cascade order used by `ZoltoComponentRuntime._propsToStyleVars()`.

### Class resolution

CSS classes on a rendered component element:

```
zolto-component                 ← always present
zolto-cmp-{ComponentName}       ← component identity
zolto-size-{size}               ← from size variant (if set)
zolto-tone-{tone}               ← from tone variant (if set)
zolto-shape-{shape}             ← from shape variant (if set)
zolto-outline                   ← if outline=true
zolto-ghost                     ← if ghost=true
zolto-theme-{themeName}         ← if theme prop is set
{custom classes from class="…"} ← from use-site class prop
```

---

## 16. Runtime Injection

Runtime injection allows external JavaScript (e.g. a plugin or the editor) to inject components into a live document without re-parsing.

### 16.1 Injecting a component programmatically

```js
// Build a ComponentDef node manually
const def = ASTFactory.createComponentDef(0, 'LiveChart', [
  { name: 'title', type: 'string', default: 'Chart' },
  { name: 'data',  type: 'list',   default: [] },
]);
def.children = [/* pre-built AST nodes */];

// Register it
ZoltoComponentRuntime.register('LiveChart', def);

// Trigger a live re-render in the canvas
ZoltoCore.renderToCanvas(document.getElementById('zolto-canvas'));
```

### 16.2 Dynamic props update

Update the props of an already-rendered component without a full re-render:

```js
const el = document.querySelector('[data-component="StatCard"][data-id="cu3"]');
if (el) {
  el.style.setProperty('--cmp-value', '$156,000');
  el.querySelector('.stat-value').textContent = '$156,000';
}
```

### 16.3 Render mode control

The render mode determines how a component responds to prop changes:

| Mode | Behaviour | Set via |
|------|-----------|---------|
| `static` | Rendered once — no runtime updates | `@component … render=static` |
| `reactive` | Re-renders on prop/state change | Default |
| `lazy` | Renders on first scroll-intersection | `@component … render=lazy` |
| `streaming` | Progressive render (large docs) | `@component … render=streaming` |

```zolto
@component HeavyDiagram title="" render=lazy
  @diagram network
    // Large network diagram — only renders when visible
  @/diagram
@/component
```

---

## 17. Built-in Component Reference

### 17.1 Card

```zolto
@card
  title="string"           // Optional card title
  variant="default"        // default|primary|success|warning|danger|outline|glass
  icon="string"            // Optional icon name
  href="url"               // Makes the card a clickable link
  elevation=1              // 0-4 shadow level
  width="auto"             // CSS width value
  animate="string"         // Named animation
```

**Example:**
```zolto
@card variant=primary icon=star
  ## Featured Formula

  $E = mc^2$

  Einstein's mass–energy equivalence.
@/card
```

---

### 17.2 Alert

```zolto
@alert
  type="info"              // info|success|warning|danger|note
  title="string"           // Optional bold title
  dismissible=false        // Show close button
  icon=true                // Show type icon
```

**Example:**
```zolto
@alert type=warning title="Watch Out"
  Applying a net force changes the object's velocity every time.
@/alert
```

---

### 17.3 Badge

```zolto
@badge
  tone="default"           // default|primary|success|warning|danger|info
  shape="default"          // default|pill|square
  size="md"                // xs|sm|md|lg
  icon="string"            // Optional icon prefix
```

**Example:**
```zolto
@badge tone=success shape=pill ✓ Verified
@badge tone=warning ⚠ Experimental
@badge tone=danger 🚫 Deprecated
```

---

### 17.4 Tabs

```zolto
@tabs
  active=0                 // Default active tab index (0-based)
  variant="default"        // default|pills|underline|boxed
  align="left"             // left|center|right
```

**Example:**
```zolto
@tabs variant=underline
  @tab label="Theory"
    The first law describes inertia.
  @/tab
  @tab label="Formula"
    $F = ma$
  @/tab
  @tab label="Example"
    A 10 kg object with 50 N net force accelerates at 5 m/s².
  @/tab
@/tabs
```

---

### 17.5 Accordion (Collapse)

```zolto
@collapse
  title="string"           // Visible header (required)
  open=false               // Expanded by default
  icon="▸"                 // Custom toggle icon
```

**Example:**
```zolto
@collapse title="Prove Newton's Second Law from First Principles"
  Starting from the definition of momentum $p = mv$...

  @math
    \mathbf{F} = \frac{d\mathbf{p}}{dt} = m\frac{d\mathbf{v}}{dt} = m\mathbf{a}
  @/math

  Therefore $F = ma$ follows directly from the rate of change of momentum.
@/collapse
```

---

### 17.6 Progress

```zolto
@progress
  value=0                  // Current value (0-100)
  max=100                  // Maximum value
  label="string"           // Optional label
  tone="primary"           // primary|success|warning|danger
  size="md"                // xs|sm|md|lg
  animated=false           // Striped animation
  showValue=false          // Display percentage text
```

**Example:**
```zolto
@progress value=72 label="Module completion" tone=success showValue=true
```

---

### 17.7 Avatar

```zolto
@avatar
  src="url"                // Image URL (optional)
  alt="string"             // Alt text / fallback initials
  size=40                  // Size in px
  shape="circle"           // circle|square|rounded
  tone="default"           // Background tone when no image
```

**Example:**
```zolto
@avatar alt="Dr. A. Kumar" size=48 tone=primary
@avatar src="/team/alice.jpg" alt="Alice Chen" size=40
```

---

### 17.8 Divider

```zolto
@divider
  label="string"           // Optional centred label
  tone="subtle"            // subtle|normal|heavy|primary
  orientation="horizontal" // horizontal|vertical
  style="solid"            // solid|dashed|dotted
```

**Example:**
```zolto
@divider label="Part II — Dynamics" tone=primary
```

---

### 17.9 Toggle

```zolto
@toggle
  label="string"           // Visible label
  checked=false            // Default state
  id="string"              // Element ID for scripting
  tone="primary"           // Colour when checked
```

**Example:**
```zolto
@toggle label="Show step-by-step working" id="toggle-steps"
```

---

### 17.10 Timeline

```zolto
@timeline
  title="string"           // Optional chart title
  layout="vertical"        // vertical|horizontal
  theme="default"          // default|compact|detailed
```

**Example:**
```zolto
@timeline title="Newton's Major Works" layout=vertical
  section 17th Century
    1687: Principia Mathematica published
    1704: Opticks published

  section Legacy
    1727: Newton's death — buried at Westminster Abbey
    1846: Neptune discovered using Newtonian mechanics
@/timeline
```

---

### 17.11 Embed

```zolto
@embed
  type="image"             // image|youtube|vimeo|iframe|audio|video|figma|codepen|loom
  src="url"                // Resource URL (also positional as second argument)
  label="string"           // Caption/title
  width="100%"             // CSS width
  height="400px"           // CSS height
  alt="string"             // Alt text (images)
  autoplay=false           // Video/audio autoplay
```

**Example:**
```zolto
@embed youtube "Newton's Laws Visualised" https://youtu.be/abc123
  width=100% height=400px
@/embed

@embed image "Free-Body Diagram" /assets/fbd-example.png width=600 alt="Free body diagram showing forces"
```

---

## 18. Design System Integration

### 18.1 Creating a design system file

A design system is a `.zl` file containing component definitions, theme tokens, and documentation. Import it at the top of any document that needs it.

**`shared/physics-components.zl`:**
```zolto
// Physics learning design system
// Import this file to access all physics-specific components

--accent-primary: #0ea5e9
--accent-secondary: #38bdf8
--card-bg: rgba(14, 165, 233, 0.04)

@component FormulaCard name="" formula="" domain="physics"
  @card variant=outline
    @slot header
    **{name}**
    @badge tone=info size=sm {domain}
    @/slot

    @math
      {formula}
    @/math

    @slot default
      // Optional explanation
    @/slot
  @/card
@/component

@component LawBlock number="" title="" statement=""
  [theorem]
  **Newton's {number} Law — {title}**

  {statement}

  @slot default
    // Additional content, examples, or derivations
  @/slot
  [/theorem]
@/component

@macro keyterm(term, definition)
  **{term}**: *{definition}*
@/macro
```

**Using the design system:**
```zolto
@import "shared/physics-components.zl"

<FormulaCard name="Kinetic Energy" formula="KE = \frac{1}{2}mv^2">
  Where $m$ is mass in kg and $v$ is velocity in m/s.
</FormulaCard>

<LawBlock number="Second" title="Law of Acceleration" statement="F = ma">
  The net force on an object equals its mass multiplied by its acceleration.

  @interactive
    slider name="mass"  min=1 max=100 default=10 label="Mass (kg)"
    slider name="accel" min=0 max=50  default=5  label="Acceleration (m/s²)"
    output: $F = mass \times accel = \text{ N}$
  @/interactive
</LawBlock>

@keyterm("Inertia", "The tendency of an object to resist changes in its state of motion")
```

---

### 18.2 Sharing components across files

```zolto
// File: shared/cards.zl
@component InfoCard title="" body=""
  @card variant=outline
    **{title}**
    {body}
  @/card
@/component
```

```zolto
// File: chapter-3.zl
@import "shared/cards.zl" as cards

<cards.InfoCard title="Impulse" body="The change in momentum of an object." />
```

---

## 19. Complete Examples

### 19.0 Beginner Quick-Start

This is the minimum viable component document — defining one component, using it three times, with a scoped theme. New users can copy this as a starting point.

```zolto
---
title: Physics Concepts
theme: dark
---

// ── 1. Define a component ──────────────────────────────────────────────

@component ConceptCard term="" symbol="" tone="default"
  @card tone={tone} variant=outline
    **{term}**
    {#if symbol}
    @badge tone=muted size=sm {symbol}
    {/if}

    @slot default
      // Body goes here — caller fills this in
    @/slot
  @/card
@/component

// ── 2. Define a theme ─────────────────────────────────────────────────

@theme name="physics"
  --accent-primary: #0ea5e9;
  --card-bg: rgba(14, 165, 233, 0.05);
@/theme

// ── 3. Write the document ─────────────────────────────────────────────

# Newton's Laws — Key Concepts

@grid cols=3 gap=1.5rem theme="physics" animate-stagger="fadeSlideUp" stagger-delay=60ms
  <ConceptCard term="Inertia" symbol="I" tone=primary>
    Resistance of an object to changes in its state of motion.
  </ConceptCard>

  <ConceptCard term="Net Force" symbol="F_net">
    The vector sum of all forces acting on an object. $F_{net} = \sum F$
  </ConceptCard>

  <ConceptCard term="Momentum" symbol="p = mv" tone=success>
    Mass times velocity. Conserved in isolated systems.
  </ConceptCard>
@/grid
```

---

### 19.1 Reusable study notes template

```zolto
---
title: Classical Mechanics Reference
theme: dark
---

@import "shared/physics-design-system.zl"

// ── Component definitions ──────────────────────────────────────────────

@component ConceptCard term="" definition="" symbol="" examples=[]
  @card variant=outline
    @slot header
    **{term}**
    {#if symbol}
    @badge tone=muted size=sm {symbol}
    {/if}
    @/slot

    *{definition}*

    @slot default
      // Optional body content
    @/slot
  @/card
@/component

@component DerivedFormula name="" from="" result="" proof=false
  @tabs
    @tab label="Formula"
      @math name="{name}"
        {result}
      @/math
    @/tab
    @tab label="Derivation"
      Starting from: $\{from}$

      @slot derivation
        // Derivation steps
      @/slot
    @/tab
    {#if proof}
    @tab label="Proof"
      @slot proof
        // Formal proof
      @/slot
    @/tab
    {/if}
  @/tabs
@/component

// ── Document content ──────────────────────────────────────────────────

# Newton's Laws of Motion
*Classical Mechanics · Chapter 3*

---

## Key Concepts

@grid cols=3 gap=1.5rem animate-stagger="fadeSlideUp" stagger-delay=60ms
  <ConceptCard
    term="Inertia"
    definition="Resistance of an object to changes in its state of motion."
    symbol="I">
    Inertia increases with mass. A heavier object is harder to accelerate.
  </ConceptCard>

  <ConceptCard
    term="Net Force"
    definition="The vector sum of all forces acting on an object."
    symbol="F_net" />

  <ConceptCard
    term="Momentum"
    definition="The product of mass and velocity."
    symbol="p = mv">
    Momentum is conserved in isolated systems.
  </ConceptCard>
@/grid

---

## Core Formulae

<DerivedFormula name="Newton's Second Law" from="p = mv" result="\mathbf{F} = m\mathbf{a}" proof=true>
  @slot derivation
    $\mathbf{F} = \frac{d\mathbf{p}}{dt}$

    For constant mass:

    $\mathbf{F} = m\frac{d\mathbf{v}}{dt} = m\mathbf{a}$
  @/slot

  @slot proof
    Assume constant mass system. By Newton's definition of force as rate of
    change of momentum: $F = \frac{dp}{dt} = \frac{d(mv)}{dt} = m\frac{dv}{dt} = ma$.
    Therefore $F = ma$. $\blacksquare$
  @/slot
</DerivedFormula>

---

## Interactive Exploration

@interactive
  slider name="mass"  min=1   max=100 default=10 label="Mass (kg)"
  slider name="force" min=0   max=500 default=50 label="Net Force (N)"
  output: $a = \frac{F}{m} = \frac{force}{mass}\,\text{m/s}^2$
@/interactive

---

## Self-Assessment

@quiz title="Newton's Laws · Chapter Check" time_limit=900 passing=70

  @mcq
    question: "Which law defines inertia?"
    A: "Newton's First Law"  [correct]
    B: "Newton's Second Law"
    C: "Newton's Third Law"
    D: "Law of Conservation"
    explanation: "The First Law: objects resist changes in motion (inertia)."
    difficulty: easy
  @/mcq

  @mcq
    question: "A 5 kg object experiences 20 N net force. Acceleration?"
    A: "1 m/s²"
    B: "2 m/s²"
    C: "4 m/s²" [correct]
    D: "100 m/s²"
    explanation: "a = F/m = 20/5 = 4 m/s²"
    difficulty: medium
  @/mcq

@/quiz
```

---

### 19.2 Dashboard layout using components

```zolto
---
title: System Dashboard
theme: dark
---

@component MetricCard title="" value="" change="" direction="up" icon=""
  @card
    @slot header
    {#if icon}
    @icon name={icon} size=20
    {/if}
    *{title}*
    @/slot

    # {value}

    {#if direction == "up"}
    {success ↑ {change}}
    {/if}
    {#if direction == "down"}
    {danger ↓ {change}}
    {/if}
  @/card
@/component

@component StatusBadge service="" status="healthy"
  {#if status == "healthy"}
  @badge tone=success shape=pill ● {service}
  {/if}
  {#if status == "degraded"}
  @badge tone=warning shape=pill ● {service}
  {/if}
  {#if status == "down"}
  @badge tone=danger shape=pill ● {service}
  {/if}
@/component

// ── Dashboard ─────────────────────────────────────────────────────────

# System Dashboard

@grid cols=4 gap=1rem
  <MetricCard title="Active Users" value="8,420" change="+12%" direction=up icon=users />
  <MetricCard title="Revenue" value="$124K" change="+8%" direction=up icon=dollar />
  <MetricCard title="Latency" value="24ms" change="-3ms" direction=down icon=bolt />
  <MetricCard title="Error Rate" value="0.4%" change="+0.1%" direction=up icon=alert />
@/grid

@split direction=horizontal ratio=60/40
  ::: pane
  ## Traffic
  @chart line title="Requests / Hour"
    x: [0, 4, 8, 12, 16, 20, 24]
    y: [1200, 800, 2400, 3200, 2800, 1900, 1100]
    smooth: true
    fill: true
    gradient: true
  @/chart
  :::

  ::: pane
  ## Service Health
  <StatusBadge service="API Gateway" status=healthy />
  <StatusBadge service="Auth Service" status=healthy />
  <StatusBadge service="Database" status=degraded />
  <StatusBadge service="CDN" status=healthy />
  <StatusBadge service="Payment API" status=healthy />
  :::
@/split
```

---

### 19.3 Interactive Formula Explorer

Drawn from the HFE's tab-based formula/proof pattern — a component that exposes both an interactive calculator and a mathematical proof in separate tabs.

```zolto
---
title: Interactive Physics Reference
theme: dark
---

// ── Component: tabbed formula with calculator + proof ─────────────────

@component FormulaExplorer name="" latex="" from="" proof=""
  @tabs variant=underline
    @tab label="Formula"
      @math name="{name}"
        {latex}
      @/math
    @/tab

    @tab label="Calculator"
      @slot calculator
        // Caller injects interactive sliders here
      @/slot
    @/tab

    @tab label="Derivation"
      Starting from $\{from}$:

      @slot derivation
        // Step-by-step working
      @/slot
    @/tab

    @tab label="Proof"
      @slot proof
        // Formal proof body
      @/slot
    @/tab
  @/tabs
@/component

// ── Document ──────────────────────────────────────────────────────────

# Newton's Laws — Interactive Reference

## Law 2: F = ma

<FormulaExplorer
  name="Newton's Second Law"
  latex="\mathbf{F} = m\mathbf{a}"
  from="p = mv">

  @slot calculator
    @interactive
      slider name="mass"  min=1   max=100 default=10 label="Mass (kg)"
      slider name="force" min=0   max=500 default=50 label="Net Force (N)"
      output: $a = \frac{F}{m} = \frac{force}{mass}\,\text{m/s}^2$
    @/interactive
  @/slot

  @slot derivation
    By definition of force as rate of change of momentum:

    @math env=align
      \mathbf{F} &= \frac{d\mathbf{p}}{dt} \\
                 &= m\frac{d\mathbf{v}}{dt} \\
                 &= m\mathbf{a}
    @/math
  @/slot

  @slot proof
    Assume constant mass. From $\mathbf{F} = \frac{d\mathbf{p}}{dt}$ and $\mathbf{p} = m\mathbf{v}$:

    $\mathbf{F} = m\frac{d\mathbf{v}}{dt} = m\mathbf{a}$ $\blacksquare$
  @/slot
</FormulaExplorer>

---

## Self-Assessment

@quiz title="Chapter Check" time_limit=900 passing=70
  @mcq
    question: "Which law defines inertia?"
    A: "Newton's First Law" [correct]
    B: "Newton's Second Law"
    C: "Newton's Third Law"
    explanation: "The First Law states objects resist changes in motion."
    difficulty: easy
  @/mcq
@/quiz
```

---

*This is the canonical Component System reference for Zolto v8.1.0.*
*Source: `zolto/specs/components.md`*
*Related: `zolto/specs/ast.md` · `zolto/specs/syntax.md` · `zolto/specs/renderer.md`*
*Grammar: `zolto/grammar/components.zol` · Renderer: `js/renderer/component-renderer.js`*
