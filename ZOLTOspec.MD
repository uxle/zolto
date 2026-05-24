# ZOLTO SPECIFICATION v1.0
## The Visual Education Language

**Zolto** is a unified, human-readable markup language designed for **thinking-first educational content**—combining the power of Markdown, LaTeX, Mermaid, and spatial note systems into a single coherent syntax.

---

## 🎯 Vision Statement

> Zolto is **not** a Markdown killer.  
> Zolto is **not** a LaTeX replacement.  
> Zolto is **not** just a diagram tool.
>
> **Zolto is the language of visual thinking.**
>
> It enables students, teachers, and learners to express ideas—notes, reasoning, mathematics, diagrams, MCQs, and spatial relationships—in one unified, intuitive syntax that mirrors how humans naturally think and learn.

---

## 📊 The Problem Zolto Solves

### Current Fragmentation

| **Learning Need** | **Current Tool** | **Limitation** |
|---|---|---|
| Notes | Markdown | Limited formatting, no MCQs or diagrams |
| Math | LaTeX | Complex syntax, steep learning curve |
| Diagrams | Mermaid/Visio | Requires separate tool, no math integration |
| Tables | HTML/Excel | Disconnected from narrative |
| MCQs | LMS Systems | Isolated, not part of notes |
| Reasoning Diagrams | Manual images | Not editable, not scalable |
| Spatial Layouts | CSS/HTML | Programming knowledge required |
| Flashcards | Separate apps | No integration with notes |

### The Solution: One Language, One Ecosystem

Zolto unifies all of these into a single, readable, learnable syntax.

---

## 🎓 Target Audience

### Primary Users
- **Students** (K-12, Undergraduate, Competitive exams)
- **Teachers** (Creating curriculum, assignments, assessments)
- **Coaching Institutes** (JEE/NEET/UPSC/CAT preparation)
- **Self-learners** (Online courses, knowledge bases)
- **Researchers** (Technical documentation, notes)

### Use Cases
- Study notes and revision guides
- Lecture notes with embedded diagrams
- Competitive exam preparation materials
- Science lab reports with diagrams
- Mathematical proofs and derivations
- Quiz and assessment systems
- Interactive learning modules
- Visual thinking and mind mapping
- Project documentation with visual context

---

## 🏗️ Architecture Layers

### **Layer 1: Core Syntax** (Human-Readable)
Intuitive, easy to type, easy to remember.

```
# Text markup like Markdown
@math equations in blocks
@diagram visual drawings
@mcq assessment blocks
@reasoning logical thinking
```

### **Layer 2: Parser** (Tokenizer → AST)
Converts raw Zolto syntax into a structured Abstract Syntax Tree.

- **Lexical Analysis**: Tokenization
- **Syntax Analysis**: Grammar-based parsing
- **Semantic Analysis**: Type checking, validation
- **Diagnostic Engine**: Error reporting with line numbers

### **Layer 3: Renderer** (Multi-Output)
Outputs to multiple formats:

- **Web**: Interactive HTML5 with real-time preview
- **PDF**: Print-ready documents with embedded math
- **Mobile**: Responsive touch-optimized views
- **IDE**: Live editor with syntax highlighting
- **Notebook**: Jupyter-style interactive notebooks

### **Layer 4: Runtime** (Reactive & Interactive)
Dynamic, stateful rendering engine.

- Reactive state management
- Interactive components (quizzes, sliders, toggles)
- Live evaluation (code snippets, math solvers)
- Session persistence

---

## 📝 Core Syntax Reference

### **1. Text & Formatting** (Markdown-Level)

```zolto
# Heading 1
## Heading 2
### Heading 3

**bold** _italic_ ~~strikethrough~~ ==highlight==

{red This is red text}
{#0ea5e9 Hex color support}

::: center :::Centered text:::
::: right :::Right-aligned text:::

> Blockquote with context

---
(Horizontal rule)
```

### **2. Rich Components** (Educational Blocks)

#### Important/Tip/Warning Blocks

```zolto
[important]
Newton's First Law: An object at rest stays at rest.
[/important]

[tip]
Always draw free-body diagrams for force problems.
[/tip]

[warning]
Do not confuse mass with weight.
[/warning]

[info]
This concept builds on kinematics.
[/info]
```

#### Flashcard System

```zolto
@flashcard
front: What is inertia?
back: Resistance of an object to changes in its motion.
tags: physics, motion
difficulty: easy
```

#### Accordion/Collapsible Sections

```zolto
@collapse title="Why is this important?"
Newton's laws form the foundation of classical mechanics.
They explain motion in everyday life and engineering.
@/collapse
```

---

### **3. Mathematics System** (LaTeX-Level Power)

#### Block Math

```zolto
@math name="Pythagorean Theorem"
a^2 + b^2 = c^2
@/math

@math
\int_0^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
@/math
```

#### Inline Math

```zolto
The area of a circle is $A = \pi r^2$.

Einstein's equation: $E = mc^2$
```

#### Supported Mathematics
- **Algebra**: Linear equations, polynomials, factorization
- **Geometry**: Coordinate systems, transformations, proofs
- **Trigonometry**: Identities, graphs, applications
- **Calculus**: Limits, derivatives, integrals
- **Statistics**: Distributions, probability, regression
- **Matrices**: Operations, determinants, eigenvalues
- **Complex Numbers**: Operations, polar form

---

### **4. Diagrams & Drawings** (Beyond Mermaid)

#### Geometric Diagrams

```zolto
@diagram geometry
  circle center=5,5 radius=3
  triangle points=3,2 8,2 5,8
  line from=5,5 to=3,2
  label "A" at=3,2 offset=0,-15
  label "B" at=8,2 offset=5,0
  label "C" at=5,8 offset=0,10
@/diagram
```

#### Chemistry Diagrams

```zolto
@diagram chemistry
  molecule="benzene"
  show_structure
  highlight_bonds=[1,2,3,4,5,6]
@/diagram

@diagram equation
  reactants: "2H₂ + O₂"
  products: "2H₂O"
  type: "combustion"
@/diagram
```

#### Circuit Diagrams

```zolto
@diagram circuit
  component "resistor" at=10,10 value=100
  component "capacitor" at=30,10 value=10u
  component "inductor" at=50,10 value=1m
  connect from=0,10 to=10,10
  connect from=20,10 to=30,10
@/diagram
```

#### Free-Form Drawing Canvas

```zolto
@canvas width=800 height=600
  draw mode="freehand" color="blue" thickness=2
  text "Click to draw" at=10,10
@/canvas
```

---

### **5. Graphs & Visualizations** (Mermaid + More)

#### Flowcharts & State Machines

```zolto
@graph flowchart
  [Start] --> (Decision)
  (Decision) --"Yes"--> [Process A] +primary
  (Decision) --"No"--> [Process B] +danger
  [Process A] --> [End] +success
  [Process B] --> [End] +success
@/graph
```

#### Mind Maps

```zolto
@graph mindmap
  (Central Idea)
    (Branch 1)
      Leaf 1.1
      Leaf 1.2
    (Branch 2)
      Leaf 2.1
      Leaf 2.2
@/graph
```

#### Timeline

```zolto
@timeline
  event year=1666 text="Newton's Laws published"
  event year=1687 text="Principia published"
  event year=1729 text="Newton dies"
@/timeline
```

---

### **6. Charts & Data Visualization**

#### Bar Chart

```zolto
@chart bar title="Physics Student Performance"
  "Test 1": 78
  "Test 2": 85
  "Test 3": 92
  colors: primary success success
@/chart
```

#### Pie Chart

```zolto
@chart pie title="Energy Distribution"
  "Kinetic": 45
  "Potential": 35
  "Thermal": 20
@/chart
```

#### Line Graph

```zolto
@chart line title="Temperature vs Time"
  x: [0, 5, 10, 15, 20]
  y: [20, 22, 25, 24, 23]
  xlabel: "Time (min)"
  ylabel: "Temperature (°C)"
@/chart
```

#### Sequence Diagram

```zolto
@diagram sequence title="Student Learning Process"
  Student -> Teacher: "I have a doubt"
  Teacher -> Student: "Explain your approach"
  Student -> Student: "Think"
  Student -> Teacher: "Here's my attempt"
  Teacher -> Student: "Very close! Consider..."
@/diagram
```

---

### **7. MCQ & Assessment System**

#### Single MCQ

```zolto
@mcq
  question: "Who formulated Newton's Laws of Motion?"
  A: "Galileo"
  B: "Isaac Newton" [correct]
  C: "Albert Einstein"
  D: "Stephen Hawking"
  explanation: "Newton published his laws in Principia Mathematica (1687)."
  difficulty: "easy"
  tags: [physics, history, gravity]
@/mcq
```

#### Quiz with Multiple Questions

```zolto
@quiz title="Motion & Forces Quiz" time_limit=30
  @mcq
    question: "What is SI unit of force?"
    A: "Dyne"
    B: "Newton" [correct]
    C: "Joule"
    D: "Watt"
  @/mcq
  
  @mcq
    question: "Inertia is resistance to..."
    A: "Motion"
    B: "Acceleration"
    C: "Change in motion" [correct]
    D: "Velocity"
  @/mcq
@/quiz
```

#### Matrix MCQ (Complex Reasoning)

```zolto
@mcq type="matrix"
  question: "Match concepts with definitions"
  pairs:
    - ("Velocity", "Rate of change of displacement")
    - ("Speed", "Magnitude of velocity")
    - ("Acceleration", "Rate of change of velocity")
  correct_matches: [1→1, 2→2, 3→3]
@/mcq
```

---

### **8. Reasoning & Logic Blocks**

#### Number Series

```zolto
@reasoning series
  question: "Find the missing number: 2, 4, 8, 16, ?"
  options: [24, 32, 48, 64]
  answer: 32
  explanation: "Each number is double the previous one."
@/reasoning
```

#### Analogy

```zolto
@reasoning analogy
  question: "Bird is to Sky as Fish is to ?"
  options: ["Land", "Water", "Air", "Ocean"]
  answer: "Water"
@/reasoning
```

#### Visual Matrix Reasoning

```zolto
@reasoning visual-matrix
  grid:
    row1: [□, ○, △]
    row2: [○, △, □]
    row3: [△, □, ?]
  options: ["○", "□", "△", "◇"]
  answer: "○"
@/reasoning
```

---

### **9. Tables & Data Structures**

#### Simple Markdown Table

```zolto
| Element | Atomic # | Valence |
|:--------|:--------:|--------:|
| Carbon  | 6        | 4       |
| Nitrogen| 7        | 5       |
| Oxygen  | 8        | 6       |
```

#### Enhanced Table with Styling

```zolto
@table title="Periodic Table Excerpt"
  headers: ["Element", "Symbol", "Atomic #", "Mass"]
  rows:
    - ["Hydrogen", "H", 1, 1.008]
    - ["Helium", "He", 2, 4.003]
    - ["Lithium", "Li", 3, 6.941]
  format:
    align: [left, center, right, right]
    styles: [bold, code, number, number]
@/table
```

---

### **10. Spatial Layouts** (Notebook-Style Control)

#### Flexible Grid Layout

```zolto
@row
  @card width=50%
    ## Concept A
    Definition and details...
  @/card
  
  @card width=50%
    ## Concept B
    Related information...
  @/card
@/row
```

#### Canvas Positioning (Absolute)

```zolto
@canvas width=1000 height=600
  place element="formula" at=100,50
  place element="diagram" at=500,50
  place element="note" at=100,350
@/canvas
```

#### Columns

```zolto
@columns count=3
  ## Left Column
  Content...
  
  ## Middle Column
  Content...
  
  ## Right Column
  Content...
@/columns
```

---

### **11. Interactive Components**

#### Tabs

```zolto
@tabs
  @tab label="Overview"
    This is the overview tab.
  @/tab
  
  @tab label="Details"
    This is the details tab.
  @/tab
  
  @tab label="Examples"
    This is the examples tab.
  @/tab
@/tabs
```

#### Sliders & Input Controls

```zolto
@interactive
  slider name="mass" min=1 max=100 default=50 label="Mass (kg)"
  slider name="velocity" min=0 max=50 default=10 label="Velocity (m/s)"
  output: $E = 0.5 * mass * velocity^2$
@/interactive
```

---

### **12. Subject-Specific Extensions**

#### Mathematics - Function Plotting

```zolto
@math plot
  function: "y = x^2 - 4x + 3"
  xrange: [-1, 5]
  yrange: [-2, 8]
  highlight_roots: true
  grid: true
@/math
```

#### Science - Atom Model

```zolto
@diagram atom
  element: "Carbon"
  protons: 6
  neutrons: 6
  electrons: 6
  electron_shells: [2, 4]
  show_labels: true
@/diagram
```

#### History - Event Timeline

```zolto
@timeline
  event year=1858 text="Sepoy Mutiny begins" icon="war"
  event year=1859 text="Origin of Species published" icon="book"
  event year=1869 text="Suez Canal opens" icon="ship"
  event year=1876 text="Telephone invented" icon="phone"
@/timeline
```

#### English - Grammar Tree

```zolto
@diagram grammar-tree title="Sentence Structure"
  S
    NP
      Det: "The"
      Adj: "quick"
      N: "fox"
    VP
      V: "jumps"
      PP
        P: "over"
        NP
          Det: "the"
          N: "fence"
@/diagram
```

---

## 🔄 Execution Flow

```
User writes .zolto file
        ↓
Lexical Analyzer (Tokenization)
        ↓
Parser (Syntax Analysis → AST)
        ↓
Semantic Analyzer (Type checking, validation)
        ↓
Renderer (Convert to HTML/SVG/Canvas)
        ↓
Runtime Engine (Interactive features, state management)
        ↓
Output (Web, PDF, Mobile, or IDE)
```

---

## 🎨 Design Philosophy

### **Simplicity First**
- Easy to type
- Easy to read
- Easy to remember
- No unnecessary symbols

### **Thinking-First, Not Document-First**
- Syntax mirrors how students think
- Visual representation matches mental model
- Supports non-linear note-taking
- Encourages spatial reasoning

### **Educational Focus**
- Designed for learning, not just documentation
- Built-in assessment mechanisms
- Supports various cognitive styles
- Interactive and engaging

### **Platform Agnostic**
- Works in browser, desktop, mobile
- Export to multiple formats
- Shareable and collaborative
- Accessible offline

---

## 🚀 Key Competitive Advantages

| Feature | Markdown | Mermaid | LaTeX | Notion | **Zolto** |
|---------|:--------:|:-------:|:-----:|:------:|:---------:|
| Rich text | ✓ | ✓ | - | ✓ | **✓+** |
| Math | - | - | ✓ | ✓ | **✓+** |
| Diagrams | - | ✓ | - | ✓ | **✓++** |
| MCQs | - | - | - | - | **✓** |
| Reasoning blocks | - | - | - | - | **✓** |
| Spatial layouts | - | - | - | ✓ | **✓+** |
| Educational focus | - | - | - | - | **✓** |
| Lightweight syntax | ✓ | - | - | - | **✓** |
| Open source | ✓ | ✓ | ✓ | - | **✓** |

---

## 📦 Implementation Status

### ✅ Phase 1: Core Foundation (Current)
- ✓ Lexer & Parser
- ✓ Basic renderer (HTML/SVG)
- ✓ Text markup
- ✓ Charts & graphs
- ✓ Math rendering
- ✓ Spatial node system

### 🔄 Phase 2: Educational Components (Next)
- [ ] MCQ system
- [ ] Reasoning blocks
- [ ] Flashcard support
- [ ] Quiz engine
- [ ] Assessment tracking

### 📅 Phase 3: Advanced Features (Future)
- [ ] AI-powered explanations
- [ ] Auto diagram generation
- [ ] Live code evaluation
- [ ] Collaborative features
- [ ] Mobile app

### 🌟 Phase 4: Ecosystem (Long-term)
- [ ] Community library
- [ ] Plugin system
- [ ] Integration with LMS
- [ ] Competitive exam prep tools
- [ ] Teacher dashboard

---

## 🎓 Example: Complete Study Note in Zolto

```zolto
# Newton's Laws of Motion

## Overview

[important]
Newton's three laws of motion are the foundation of classical mechanics.
[/important]

## Law 1: Inertia

**Definition**: An object at rest remains at rest, and an object in motion remains in motion
unless acted upon by an external force.

$$F_{net} = 0 \Rightarrow a = 0$$

@diagram
  rectangle "Object at rest" at=100,100 label="No net force"
  arrow "External force" at=100,150 direction="right"
  rectangle "Object accelerates" at=200,150 label="Motion changes"
@/diagram

[tip]
Think of yourself in a car that suddenly stops. You lurch forward because your body
tends to continue in motion (inertia).
[/tip]

## Law 2: Force & Acceleration

**Definition**: The acceleration of an object is directly proportional to the net force
acting on it and inversely proportional to its mass.

$$F = ma$$

@interactive
  slider name="mass" min=1 max=100 label="Mass (kg)"
  slider name="force" min=0 max=500 label="Force (N)"
  output: $a = \frac{F}{m} = \frac{force}{mass} \text{ m/s}^2$
@/interactive

## Law 3: Action-Reaction

**Definition**: For every action, there is an equal and opposite reaction.

$$F_{action} = -F_{reaction}$$

@diagram sequence
  Ball -> Earth: Pulls downward
  Earth -> Ball: Pushes upward
@/diagram

## Practice MCQs

@quiz title="Newton's Laws Quiz" time_limit=15

  @mcq
    question: "Which law describes inertia?"
    A: "First Law" [correct]
    B: "Second Law"
    C: "Third Law"
    D: "Zeroth Law"
    explanation: "Inertia is the tendency of objects to resist changes in motion."
  @/mcq

  @mcq
    question: "If mass doubles and force stays constant, acceleration..."
    A: "Doubles"
    B: "Halves" [correct]
    C: "Stays same"
    D: "Quadruples"
    explanation: "From F = ma, if F is constant and m increases, a must decrease."
  @/mcq

@/quiz

## Visual Summary

@row
  @card width=33%
    **Law 1**: Objects resist change
    ![inertia](icon)
  @/card
  @card width=33%
    **Law 2**: F = ma
    ![force](icon)
  @/card
  @card width=33%
    **Law 3**: Action ↔ Reaction
    ![reaction](icon)
  @/card
@/row

---

**Next**: [Energy & Work](energy.zolto) | [Circular Motion](circular.zolto)
```

---

## 💡 Innovation Opportunities

### **AI Integration**
```zolto
@solve
  equation: "2x + 5 = 15"
  ai_explain: true
```

### **Auto Diagram Generation**
```zolto
@auto-diagram
  molecule: "benzene"
  style: "2d"
```

### **Collaborative Features**
```zolto
@comment author="Teacher" timestamp="2024-01-15"
  This is an excellent approach!
@/comment
```

### **Gamification**
```zolto
@achievement name="Perfect Quiz" icon="🏆"
  Earned by scoring 100% on Quiz 1
@/achievement
```

---

## 🎯 Positioning

### **Not Positioned As:**
- ❌ Markdown killer
- ❌ LaTeX replacement
- ❌ Programming language
- ❌ Mermaid alternative

### **Positioned As:**
- ✅ **The Visual Education Language**
- ✅ **The Next-Generation Study Note System**
- ✅ **Thinking-First Markup for Learners**
- ✅ **One Language for All Learning Content**

---

## 📈 Success Metrics

- **Adoption**: Number of educators using Zolto
- **Engagement**: Time spent creating/studying with Zolto
- **Quality**: Completeness and accuracy of Zolto documents
- **Community**: User-contributed templates and examples
- **Impact**: Student performance improvements using Zolto

---

## 🔗 Resources

- **GitHub**: https://github.com/uxle/zolto
- **Documentation**: (Hosted on GitHub Pages)
- **Community**: GitHub Discussions & Discord
- **Live Editor**: (Web-based IDE)

---

## 📄 License

Zolto is released under the **MIT License**.

---

## 🙏 Vision Statement (Final)

> **Zolto transforms how humans learn.**
>
> By unifying notes, reasoning, mathematics, and visual thinking into one intuitive language,
> Zolto empowers students and educators to think visually, learn interactively, and share
> knowledge seamlessly.
>
> **Zolto: Write like you think. Think like you learn. Learn like you grow.**

---
