# Zolto

**Zolto** is a next-generation markup language – a better alternative to Markdown – designed for the modern web, documentation, technical notes, knowledge bases, and advanced visualization.

> **Why Zolto?**  
> Zolto brings together the best of Markdown, Mermaid, and LaTeX—then takes it further. With Zolto, you can seamlessly write documents, charts, workflows, math, and diagrams in a unified, readable syntax.

---

## 🚀 Features

- **Tables & Data**: Powerful, spreadsheet-style tables with alignment and styling.
- **Multiple Charts**: Bar, Pie, Line, Gantt, Sequence, and custom graphs—easy and expressive, far beyond Mermaid.
- **Advanced Mathematics**: Write high-level math, formulas, and equations—Zolto matches or surpasses LaTeX in clarity and output.
- **Rich Text Markup**: All Markdown features—plus color, highlighters, alignment, and more.
- **Graph Theory & Diagrams**: Draw nodes and edges for flowcharts, mindmaps, networks, state machines, and more.
- **Visual Layouts**: Grid/flex layouts, spatial positioning, and even UI prototyping syntax.
- **Modern & Extensible**: Built for the web, theme-aware, supports live preview and export.
- **WYSIWYG Friendly**: Zolto’s structure is designed to be rendered interactively, with real-time feedback.

---

## 🆚 Comparison Table

| Feature                | Markdown | Mermaid | LaTeX | **Zolto**      |
|------------------------|:--------:|:-------:|:-----:|:--------------:|
| Headings/Text          |   ✓      |   ✓     |   -   |       ✓        |
| Tables                 |   ✓      |   -     |   ✓   |      **✓+**    |
| Charts & Graphs        |   -      |   ✓     |   -   |    **✓++**     |
| Advanced Math          |   -      |   -     |   ✓   |     **✓+**     |
| Diagrams/State Machines|   -      |   ✓     |   -   |      **✓+**    |
| Inline Coloring        |   -      |   -     |   -   |     **✓**      |
| Text Alignment         |   -      |   -     |   -   |     **✓**      |
| UI Layouts             |   -      |   -     |   -   |     **✓**      |

---

## 📚 Zolto Syntax Examples

### Headings & Rich Text

```zolto
# Zolto Language Example

**Bold**, _Italic_, ~~Strikethrough~~, ==Highlight==, {red Colored Text}
::: center :::This text is centered.:::
```

### Tables

```zolto
| Name      | Feature         | Score |
|:----------|:---------------|------:|
| Zolto     | Math & Charts  |  100  |
| Markdown  | Text           |   60  |
| Mermaid   | Diagrams       |   80  |
```

### Charts

**Bar Chart**
```zolto
chart: bar
  "Markdown": 60
  "Mermaid":  80
  "Zolto":   100
```

**Pie Chart**
```zolto
chart: pie
  "Tables": 35
  "Charts": 25
  "Math":   40
```

**Sequence Diagram**
```zolto
chart: sequence
  User -> Service : Request
  Service -> DB : Query
  DB --> Service : Data
  Service -> User : Response
```

### Graphs & Networks

```zolto
[ Start ] +glass
  -> ( Review )
  -> [ Approve ] +primary
( Review )
  => < Edit >
  => [ Reject ] +danger
```

### Advanced Mathematics

```zolto
math: Quadratic Formula
  x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}

Inline math example: The area is $A = \pi r^2$
```

### Layouts & UI Blocks

```zolto
layout: grid-3
  [ Feature 1 ]
  [ Feature 2 ]
  [ Feature 3 ] +primary
```

---

## 🛠️ Getting Started

1. **Create a `.zolto` file** using any editor.
2. **Write your Zolto markup** (see samples above).
3. **Open it in a Zolto-compatible IDE or viewer** (see `/app` and `/docs` in this repo).

> **Try Zolto for your next project — clearer docs, more powerful diagrams, and beautiful math in one simple syntax.**

---

## 🔗 Resources

- [Live Demo / Playground (soon)]([https://uxle.github.io/zolto/])
- [Full Documentation](https://github.com/uxle/zolto/wiki)
- [Community & Support](https://github.com/uxle/zolto/discussions)

---

## 📃 License

Zolto is open source and licensed under the MIT License.

---

**Better than Markdown. More visual than Mermaid. More readable than LaTeX.**  
**Zolto. One language. Infinite documents.**
