/**
 * Zolto Test Fixtures — Phase 2
 *
 * Each fixture is:  { input, contains?, notContains?, description }
 *
 *   input        — Zolto/Markdown source string
 *   contains     — substrings the HTML output MUST include
 *   notContains  — substrings the HTML output must NOT include
 *   description  — human-readable label for the test runner
 *
 * Phase 1 fixtures are carried forward unchanged except where the Phase 2
 * renderer intentionally upgraded output (standalone images → <figure>,
 * footnote/callout class names unified under the zl- prefix).
 */

// ─── Headings ─────────────────────────────────────────────────────────────────

export const headingFixtures = [
  { description: 'H1 generates correct tag and auto id', input: '# Hello World',
    contains: ['<h1 id="hello-world">', 'Hello World', '</h1>'] },
  { description: 'H2', input: '## Section Two', contains: ['<h2 id="section-two">'] },
  { description: 'H6', input: '###### Tiny Heading', contains: ['<h6 id="tiny-heading">'] },
  { description: 'Heading with custom id', input: '## My Section {#custom-id}',
    contains: ['id="custom-id"'], notContains: ['{#custom-id}'] },
  { description: 'Heading with custom class', input: '## Styled {.red .bold}',
    contains: ['class="red bold"'], notContains: ['{.red'] },
  { description: 'Heading with id and class', input: '# Full Attrs {#my-id .my-class}',
    contains: ['id="my-id"', 'class="my-class"'] },
  { description: 'Duplicate heading IDs get suffix', input: '# Dupe\n\n# Dupe',
    contains: ['id="dupe"', 'id="dupe-1"'] },
  { description: 'Heading with inline bold', input: '# Hello **World**',
    contains: ['<strong>World</strong>'] },
  { description: 'Unicode heading slugifies correctly', input: '# Héllo Wörld',
    contains: ['<h1 id="hello-world">'] },
];

// ─── Paragraphs ───────────────────────────────────────────────────────────────

export const paragraphFixtures = [
  { description: 'Simple paragraph', input: 'Hello, world.', contains: ['<p>Hello, world.</p>'] },
  { description: 'Two paragraphs separated by blank line', input: 'First para.\n\nSecond para.',
    contains: ['<p>First para.</p>', '<p>Second para.</p>'] },
  { description: 'Paragraph with soft break', input: 'Line one\nLine two',
    contains: ['Line one', 'Line two'] },
];

// ─── Horizontal rule ──────────────────────────────────────────────────────────

export const hrFixtures = [
  { description: 'Three dashes', input: '---', contains: ['<hr>'] },
  { description: 'Three asterisks', input: '***', contains: ['<hr>'] },
  { description: 'Three underscores', input: '___', contains: ['<hr>'] },
  { description: 'Five dashes', input: '-----', contains: ['<hr>'] },
];

// ─── Blockquotes ──────────────────────────────────────────────────────────────

export const blockquoteFixtures = [
  { description: 'Simple blockquote', input: '> Hello', contains: ['<blockquote>', 'Hello', '</blockquote>'] },
  { description: 'Blockquote with inline bold', input: '> **Bold** text', contains: ['<strong>Bold</strong>'] },
  { description: 'Nested blockquote', input: '> outer\n> > inner', contains: ['<blockquote>', '<blockquote>'] },
  { description: 'Blockquote containing heading', input: '> # Inner Heading', contains: ['<blockquote>', '<h1'] },
];

// ─── Lists ────────────────────────────────────────────────────────────────────

export const listFixtures = [
  { description: 'Unordered list with dash', input: '- Alpha\n- Beta\n- Gamma',
    contains: ['<ul>', '<li>Alpha</li>', '<li>Beta</li>', '</ul>'] },
  { description: 'Unordered list with asterisk', input: '* One\n* Two', contains: ['<ul>', '<li>One</li>'] },
  { description: 'Ordered list starting at 1', input: '1. First\n2. Second\n3. Third',
    contains: ['<ol>', '<li>First</li>', '</ol>'], notContains: ['start='] },
  { description: 'Ordered list starting at 3', input: '3. First\n4. Second',
    contains: ['<ol start="3">', '<li>First</li>'] },
  { description: 'Task list checked', input: '- [x] Done\n- [ ] Todo',
    contains: ['input type="checkbox" checked', 'input type="checkbox"', 'Done', 'Todo'] },
  { description: 'Nested list', input: '- Parent\n  - Child\n  - Child 2\n- Other',
    contains: ['<ul>', '<li>Parent', '<ul>', '<li>Child</li>', '</ul>', '<li>Other'] },
  { description: 'Loose list wraps items in paragraphs', input: '- Item A\n\n- Item B',
    contains: ['<p>Item A</p>', '<p>Item B</p>'] },
  { description: 'List with inline formatting', input: '- **Bold** item\n- *Italic* item',
    contains: ['<strong>Bold</strong>', '<em>Italic</em>'] },
];

// ─── Code ─────────────────────────────────────────────────────────────────────

export const codeFixtures = [
  { description: 'Inline code', input: 'Use `console.log()` here', contains: ['<code>console.log()</code>'] },
  { description: 'Inline code escapes HTML', input: 'Type `<br>` tag', contains: ['<code>&lt;br&gt;</code>'] },
  { description: 'Fenced code block no lang', input: '```\nconst x = 1;\n```',
    contains: ['const x = 1;', '</code></pre>'], notContains: ['class="language-'] },
  { description: 'Fenced code block with lang', input: '```javascript\nconst x = 1;\n```',
    contains: ['class="language-javascript"', 'const x = 1;'] },
  { description: 'Code block escapes HTML', input: '```\n<script>alert(1)</script>\n```',
    contains: ['&lt;script&gt;'], notContains: ['<script>'] },
  { description: 'Tilde fence', input: '~~~python\nprint("hi")\n~~~',
    contains: ['language-python', 'print(&quot;hi&quot;)'] },
];

// ─── Inline formatting ────────────────────────────────────────────────────────

export const inlineFixtures = [
  { description: 'Bold with **', input: '**bold**', contains: ['<strong>bold</strong>'] },
  { description: 'Bold with __', input: '__bold__', contains: ['<strong>bold</strong>'] },
  { description: 'Italic with *', input: '*italic*', contains: ['<em>italic</em>'] },
  { description: 'Italic with _', input: '_italic_', contains: ['<em>italic</em>'] },
  { description: 'Bold italic ***', input: '***bold italic***', contains: ['<strong>', '<em>', 'bold italic'] },
  { description: 'Strikethrough ~~', input: '~~struck~~', contains: ['<del>struck</del>'] },
  { description: 'Bold inside italic', input: '*italic **bold** italic*', contains: ['<em>', '<strong>bold</strong>'] },
  { description: 'Backslash escape', input: '\\*not italic\\*', contains: ['*not italic*'], notContains: ['<em>'] },
  { description: 'HTML entities escaped in text', input: 'x < y & z > w', contains: ['x &lt; y &amp; z &gt; w'] },
];

// ─── Links & images ───────────────────────────────────────────────────────────

export const linkFixtures = [
  { description: 'Simple link', input: '[Zolto](https://example.com)',
    contains: ['<a href="https://example.com">Zolto</a>'] },
  { description: 'Link with title', input: '[Zolto](https://example.com "Great tool")',
    contains: ['title="Great tool"', 'href="https://example.com"'] },
  { description: 'Auto-link URL', input: '<https://example.com>', contains: ['<a href="https://example.com">'] },
  { description: 'Auto-link email', input: '<user@example.com>', contains: ['href="mailto:user@example.com"'] },
  { description: 'Standalone image renders as figure', input: '![Alt text](./img.png)',
    contains: ['<figure', '<img src="./img.png" alt="Alt text"', '</figure>'] },
  { description: 'Standalone image with title gets figcaption', input: '![Logo](./logo.svg "Company logo")',
    contains: ['alt="Logo"', 'title="Company logo"', '<figcaption', 'Company logo'] },
  { description: 'Inline image (mixed with text) stays plain img', input: 'See this: ![icon](i.png) inline.',
    contains: ['<img src="i.png" alt="icon"'], notContains: ['<figure'] },
  { description: 'Link with bold text', input: '[**Bold Link**](https://x.com)',
    contains: ['<strong>Bold Link</strong>'] },
];

// ─── Tables ───────────────────────────────────────────────────────────────────

export const tableFixtures = [
  { description: 'Basic table', input: '| Name | Age |\n| ---- | --- |\n| Alice | 30 |',
    contains: ['<table', '<thead>', '<th', 'Name', '<tbody>', '<td', 'Alice', '</table>'] },
  { description: 'Table with left alignment', input: '| A |\n| :- |\n| B |', contains: ['text-align:left'] },
  { description: 'Table with center alignment', input: '| A |\n| :-: |\n| B |', contains: ['text-align:center'] },
  { description: 'Table with right alignment', input: '| A |\n| -: |\n| B |', contains: ['text-align:right'] },
  { description: 'Table with inline formatting in cells', input: '| Col |\n| --- |\n| **bold** |',
    contains: ['<strong>bold</strong>'] },
  { description: 'Table wrapped in responsive container', input: '| A |\n| - |\n| 1 |',
    contains: ['zl-table-wrap', 'role="region"'] },
];

// ─── Frontmatter ──────────────────────────────────────────────────────────────

export const frontmatterFixtures = [
  { description: 'Frontmatter is not rendered', input: '---\ntitle: Hello\n---\n\n# Doc',
    contains: ['<h1'], notContains: ['---', 'title: Hello'] },
  { description: 'Frontmatter parses title', input: '---\ntitle: My Doc\nauthor: Jane\n---\n\nBody.',
    contains: ['<p>Body.</p>'] },
];

// ─── Variables ────────────────────────────────────────────────────────────────

export const variableFixtures = [
  { description: 'Variable defined and used', input: '@var name = Alice\n\nHello {{name}}!',
    contains: ['Hello Alice!'], notContains: ['{{name}}'] },
  { description: 'Undefined variable renders literally', input: 'Hello {{unknown}}!', contains: ['{{unknown}}'] },
  { description: 'Variable def is not rendered', input: '@var x = y\n\nSome text.',
    contains: ['Some text.'], notContains: ['@var'] },
  { description: 'Multiple variables', input: '@var a = foo\n@var b = bar\n\n{{a}} and {{b}}',
    contains: ['foo and bar'] },
];

// ─── Comments ─────────────────────────────────────────────────────────────────

export const commentFixtures = [
  { description: 'Comment is not rendered', input: '<!-- This is a comment -->\n\nParagraph.',
    contains: ['<p>Paragraph.</p>'], notContains: ['This is a comment', '<!--'] },
  { description: 'Multi-line comment', input: '<!--\nLine 1\nLine 2\n-->\n\nText.',
    contains: ['<p>Text.</p>'], notContains: ['Line 1'] },
];

// ─── Footnotes ────────────────────────────────────────────────────────────────

export const footnoteFixtures = [
  { description: 'Footnote reference creates superscript', input: 'Text[^1] more.\n\n[^1]: The footnote.',
    contains: ['class="zl-fn-ref"', 'href="#fn-1"', 'fnref-1'] },
  { description: 'Footnote definition renders in section', input: 'Text[^a].\n\n[^a]: Definition here.',
    contains: ['class="zl-footnotes"', 'id="fn-a"', 'Definition here'] },
  { description: 'Multiple footnotes numbered in order', input: 'A[^x] and B[^y].\n\n[^x]: First.\n[^y]: Second.',
    contains: ['[1]', '[2]', 'id="fn-x"', 'id="fn-y"'] },
];

// ─── Imports ──────────────────────────────────────────────────────────────────

export const importFixtures = [
  { description: '@import is not rendered', input: '@import "other.zl"\n\nParagraph.',
    contains: ['<p>Paragraph.</p>'], notContains: ['@import', 'other.zl'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — NEW FIXTURE GROUPS
// ═══════════════════════════════════════════════════════════════════════════

// ─── GitHub-style callouts ─────────────────────────────────────────────────────

export const calloutFixtures = [
  { description: 'NOTE callout', input: '> [!NOTE]\n> Useful info.',
    contains: ['zl-callout-note', 'Useful info.', 'Note'] },
  { description: 'TIP callout', input: '> [!TIP]\n> A helpful tip.', contains: ['zl-callout-tip'] },
  { description: 'WARNING callout', input: '> [!WARNING]\n> Be careful.', contains: ['zl-callout-warning'] },
  { description: 'IMPORTANT callout', input: '> [!IMPORTANT]\n> Pay attention.', contains: ['zl-callout-important'] },
  { description: 'CAUTION callout', input: '> [!CAUTION]\n> Risky.', contains: ['zl-callout-caution'] },
  { description: 'DANGER callout', input: '> [!DANGER]\n> High risk.', contains: ['zl-callout-danger'] },
  { description: 'Callout with custom title', input: '> [!NOTE] Heads up\n> Body text.',
    contains: ['Heads up', 'zl-callout-note'] },
  { description: 'Plain blockquote is unaffected by callout detection', input: '> Just a normal quote.',
    contains: ['<blockquote>'], notContains: ['zl-callout'] },
  { description: 'Unknown bang-type falls back to plain blockquote', input: '> [!BOGUS]\n> text',
    contains: ['<blockquote>'] },
  { description: 'Callout nests correctly inside a list item', input: '- Item one\n  > [!TIP]\n  > nested tip\n- Item two',
    contains: ['<li>', 'zl-callout-tip', 'nested tip'] },
];

// ─── Admonition blocks ──────────────────────────────────────────────────────────

export const admonitionFixtures = [
  { description: 'info admonition', input: '[info]\nSome detail.\n[/info]',
    contains: ['zl-admonition-info', 'Some detail.'] },
  { description: 'warning admonition', input: '[warning]\nCareful here.\n[/warning]',
    contains: ['zl-admonition-warning'] },
  { description: 'tip admonition', input: '[tip]\nUse X.\n[/tip]', contains: ['zl-admonition-tip'] },
  { description: 'success admonition', input: '[success]\nDone.\n[/success]', contains: ['zl-admonition-success'] },
  { description: 'danger admonition', input: '[danger]\nStop.\n[/danger]', contains: ['zl-admonition-danger'] },
  { description: 'definition admonition', input: '[definition]\nInertia: resistance to change.\n[/definition]',
    contains: ['zl-admonition-definition'] },
  { description: 'theorem admonition', input: '[theorem]\nPythagoras.\n[/theorem]', contains: ['zl-admonition-theorem'] },
  { description: 'proof admonition', input: '[proof]\nQED.\n[/proof]', contains: ['zl-admonition-proof'] },
  { description: 'Admonition with custom title', input: '[tip title="Pro Tip"]\nGo faster.\n[/tip]',
    contains: ['Pro Tip', 'zl-admonition-tip'] },
  { description: 'Admonition with nested list', input: '[info]\n- One\n- Two\n[/info]',
    contains: ['zl-admonition-info', '<ul>', '<li>One</li>'] },
  { description: 'Admonition with nested code block', input: '[note]\n```js\nx = 1\n```\n[/note]',
    contains: ['zl-admonition-note', 'language-js'] },
  { description: 'Admonition with nested markdown emphasis', input: '[important]\nThis is **critical**.\n[/important]',
    contains: ['<strong>critical</strong>'] },
];

// ─── Superscript / subscript / highlight / kbd ────────────────────────────────

export const superSubFixtures = [
  { description: 'Superscript basic', input: 'E = mc^2^', contains: ['<sup>2</sup>'] },
  { description: 'Superscript with word', input: 'x^th^', contains: ['<sup>th</sup>'] },
  { description: 'Subscript basic', input: 'H~2~O', contains: ['<sub>2</sub>', 'H', 'O'] },
  { description: 'Subscript does not break strikethrough', input: '~~strike~~ then ~sub~',
    contains: ['<del>strike</del>', '<sub>sub</sub>'] },
  { description: 'Highlight basic', input: 'This is ==important==.', contains: ['<mark>important</mark>'] },
  { description: 'Kbd single key', input: 'Press [[Enter]].', contains: ['<kbd>Enter</kbd>'] },
  { description: 'Kbd combo', input: 'Use [[Ctrl+Shift+P]].', contains: ['<kbd>Ctrl+Shift+P</kbd>'] },
];

// ─── HTML entities ────────────────────────────────────────────────────────────

export const entityFixtures = [
  { description: 'Named entity copy', input: '&copy; 2026', contains: ['&copy;'] },
  { description: 'Named entity ampersand stays literal entity', input: '&amp;', contains: ['&amp;'] },
  { description: 'Named accented letter', input: 'Caf&eacute;', contains: ['&eacute;'] },
  { description: 'Decimal numeric entity', input: '&#65;&#66;&#67;', contains: ['ABC'] },
  { description: 'Hex numeric entity', input: '&#x2764;', contains: ['\u2764'] },
  { description: 'Unknown entity name falls back to escaped ampersand', input: '&notarealentity;',
    contains: ['&amp;notarealentity;'] },
];

// ─── Smart punctuation ────────────────────────────────────────────────────────

export const smartPunctuationFixtures = [
  { description: 'Triple hyphen becomes em dash', input: 'wait --- what', contains: ['\u2014'] },
  { description: 'Double hyphen becomes en dash', input: 'pages 10--20', contains: ['\u2013'] },
  { description: 'Triple dot becomes ellipsis', input: 'and so on...', contains: ['\u2026'] },
  { description: 'Smart punctuation does not affect code spans', input: '`a---b`',
    contains: ['<code>a---b</code>'] },
];

// ─── Reference-style links ──────────────────────────────────────────────────────

export const referenceLinkFixtures = [
  { description: 'Reference link resolves', input: '[Zolto][z]\n\n[z]: https://zolto.dev',
    contains: ['<a href="https://zolto.dev">Zolto</a>'] },
  { description: 'Reference link with title', input: '[Zolto][z]\n\n[z]: https://zolto.dev "Home"',
    contains: ['href="https://zolto.dev"', 'title="Home"'] },
  { description: 'Shorthand reference [label][] uses label as id', input: '[Zolto][]\n\n[zolto]: https://zolto.dev',
    contains: ['href="https://zolto.dev"'] },
  { description: 'Reference def itself is not rendered as a paragraph', input: '[z]: https://zolto.dev\n\nBody.',
    contains: ['<p>Body.</p>'], notContains: ['[z]: https://zolto.dev'] },
  { description: 'Unresolved reference link renders broken-ref span', input: '[text][missing]',
    contains: ['zl-broken-ref'] },
];

// ─── Code block metadata ──────────────────────────────────────────────────────

export const codeMetaFixtures = [
  { description: 'Code block title', input: '```js title="app.js"\nconst x = 1;\n```',
    contains: ['zl-code-title', 'app.js'] },
  { description: 'Code block line numbers', input: '```js numbers\nconst x = 1;\n```',
    contains: ['zl-has-nums', 'data-n="1"'] },
  { description: 'Code block single highlighted line', input: '```js {2}\na\nb\nc\n```',
    contains: ['zl-hl'] },
  { description: 'Code block highlighted range', input: '```js {1-2}\na\nb\nc\n```',
    contains: ['zl-hl'] },
  { description: 'Diff block from diff language', input: '```diff\n+added line\n-removed line\n unchanged\n```',
    contains: ['zl-diff-add', 'zl-diff-rem'] },
  { description: 'Code block has copy button', input: '```js\nx = 1\n```',
    contains: ['zl-copy', 'Copy'] },
];

// ─── Figures ──────────────────────────────────────────────────────────────────

export const figureFixtures = [
  { description: 'Figure wraps standalone image', input: '![A cat](cat.png)',
    contains: ['<figure class="zl-figure">', '<img src="cat.png" alt="A cat"'] },
  { description: 'Figure has lazy loading by default', input: '![X](x.png)', contains: ['loading="lazy"'] },
  { description: 'Figure caption matches title when provided', input: '![X](x.png "A nice picture")',
    contains: ['<figcaption class="zl-caption">A nice picture</figcaption>'] },
  { description: 'Figure with no title has no figcaption', input: '![X](x.png)', notContains: ['figcaption'] },
];

// ─── Definition lists ─────────────────────────────────────────────────────────

export const definitionListFixtures = [
  { description: 'Single term, single definition', input: 'Inertia\n: Resistance to change in motion.',
    contains: ['<dl', '<dt', 'Inertia', '<dd', 'Resistance to change in motion.'] },
  { description: 'Single term, multiple definitions', input: 'Mass\n: A measure of matter.\n: Resists acceleration.',
    contains: ['Mass'] },
  { description: 'Term with inline formatting', input: '**Bold Term**\n: Has a definition.',
    contains: ['<strong>Bold Term</strong>'] },
];

// ─── Table captions ───────────────────────────────────────────────────────────

export const tableCaptionFixtures = [
  { description: 'Table: prefix becomes caption', input: 'Table: Quarterly Results\n\n| Q1 | Q2 |\n| -- | -- |\n| 10 | 20 |',
    contains: ['<caption', 'Quarterly Results'] },
  { description: 'Caption: prefix also works', input: 'Caption: My Data\n\n| A |\n| - |\n| 1 |',
    contains: ['<caption', 'My Data'] },
  { description: 'Table without caption has no caption element', input: '| A |\n| - |\n| 1 |',
    notContains: ['<caption'] },
];
