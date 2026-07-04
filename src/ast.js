/**
 * Zolto AST Node Factory — Phase 2
 *
 * Phase 1 : core Markdown blocks + inlines
 * Phase 2 : callouts · admonitions · reference links · figures ·
 *            definition lists · code metadata · extended inlines
 *
 * Conventions
 *   • type  — always first, always a string
 *   • null  — absent optional scalars (never undefined)
 *   • []    — absent array fields (never null)
 */

// ═══ SHARED TYPE SETS ════════════════════════════════════════════════════════

/** GitHub-style callout types  > [!TYPE] */
export const CALLOUT_TYPES = new Set([
  'note','tip','warning','important','caution','danger',
  'info','success','check','bug','example','question',
  'abstract','todo','failure','seealso','summary','hint',
]);

/** Zolto native admonition types  [type]…[/type] */
export const ADMONITION_TYPES = new Set([
  ...CALLOUT_TYPES,
  'definition','theorem','proof','quote',
]);

// ═══════════════════════════════════════════════════════════════════
// BLOCK NODES — Phase 1
// ═══════════════════════════════════════════════════════════════════

/** Root document node. */
export function document(children = [], metadata = {}) {
  return { type: 'document', children, metadata };
}

/** ATX heading (# … ######). */
export function heading(level, children = [], opts = {}) {
  return { type: 'heading', level, id: opts.id ?? null, classes: opts.classes ?? [], children };
}

/** Body paragraph. */
export function paragraph(children = []) {
  return { type: 'paragraph', children };
}

/** Thematic break. */
export function horizontalRule() {
  return { type: 'horizontal_rule' };
}

/** Block quotation. */
export function blockquote(children = []) {
  return { type: 'blockquote', children };
}

/** Ordered or unordered list. */
export function list(ordered, items = [], opts = {}) {
  return { type: 'list', ordered: !!ordered, start: opts.start ?? null, tight: opts.tight ?? true, children: items };
}

/** Single list item. */
export function listItem(children = [], opts = {}) {
  return { type: 'list_item', checked: opts.checked ?? null, children };
}

/**
 * Fenced code block.
 * Phase 2 adds: title, highlightLines, lineNumbers, diff
 */
export function codeBlock(value = '', opts = {}) {
  return {
    type:           'code_block',
    lang:           opts.lang           ?? null,
    meta:           opts.meta           ?? null,
    value,
    title:          opts.title          ?? null,
    highlightLines: opts.highlightLines ?? [],
    lineNumbers:    opts.lineNumbers    ?? false,
    diff:           opts.diff           ?? false,
  };
}

/**
 * GFM table.
 * Phase 2 adds: caption
 */
export function table(head = [], rows = [], align = [], opts = {}) {
  return { type: 'table', align, head, rows, caption: opts.caption ?? null };
}

/** Table row. */
export function tableRow(cells = []) {
  return { type: 'table_row', cells };
}

/** Table cell. */
export function tableCell(children = [], align = null) {
  return { type: 'table_cell', align, children };
}

/** YAML front-matter block. */
export function frontmatter(value = '', data = {}) {
  return { type: 'frontmatter', value, data };
}

/** HTML comment. */
export function comment(value = '') {
  return { type: 'comment', value };
}

/** @import directive. */
export function importNode(path = '') {
  return { type: 'import', path };
}

/** Variable definition  @var name = value */
export function variableDef(name = '', value = '') {
  return { type: 'variable_def', name, value };
}

/** Footnote definition  [^id]: … */
export function footnoteDef(id = '', children = []) {
  return { type: 'footnote_def', id, children };
}

/** Raw HTML block. */
export function htmlBlock(value = '') {
  return { type: 'html_block', value };
}

// ═══════════════════════════════════════════════════════════════════
// BLOCK NODES — Phase 2
// ═══════════════════════════════════════════════════════════════════

/**
 * GitHub-style callout  > [!NOTE]  > [!TIP]  etc.
 * @param {string}   calloutType  One of CALLOUT_TYPES
 * @param {Node[]}   children     Block children
 * @param {object}   opts
 * @param {string}   opts.title   Optional custom title override
 */
export function callout(calloutType = 'note', children = [], opts = {}) {
  return { type: 'callout', calloutType: calloutType.toLowerCase(), title: opts.title ?? null, children };
}

/**
 * Zolto native admonition block  [info]…[/info]
 * @param {string}   admonType  One of ADMONITION_TYPES
 * @param {Node[]}   children   Block children (re-parsed inner content)
 * @param {object}   opts
 * @param {string}   opts.title Optional custom title
 */
export function admonition(admonType = 'info', children = [], opts = {}) {
  return { type: 'admonition', admonType: admonType.toLowerCase(), title: opts.title ?? null, children };
}

/**
 * Reference-link definition  [id]: url "optional title"
 * Stored in doc.metadata.references — not rendered directly.
 */
export function referenceDef(id = '', href = '', title = null) {
  return { type: 'reference_def', id: id.toLowerCase(), href, title };
}

/**
 * Standalone image wrapped in HTML <figure>.
 * Created by the parser when a paragraph contains exactly one image.
 */
export function figure(src = '', alt = '', opts = {}) {
  return {
    type:    'figure',
    src,
    alt,
    title:   opts.title   ?? null,
    caption: opts.caption ?? null,
    lazy:    opts.lazy    ?? true,
    width:   opts.width   ?? null,
    height:  opts.height  ?? null,
  };
}

/** Definition list  <dl> */
export function definitionList(items = []) {
  return { type: 'definition_list', items };
}

/**
 * Single definition list entry — one term, one or more definitions.
 * @param {string}   term  Raw term text (to be inline-parsed by renderer)
 * @param {string[]} defs  Array of raw definition strings
 */
export function definitionItem(term = '', defs = []) {
  return { type: 'definition_item', term, defs };
}

// ═══════════════════════════════════════════════════════════════════
// INLINE NODES — Phase 1
// ═══════════════════════════════════════════════════════════════════

/** Plain text. */
export function text(value = '') { return { type: 'text', value }; }

/** Bold / strong. */
export function bold(children = []) { return { type: 'bold', children }; }

/** Italic / emphasis. */
export function italic(children = []) { return { type: 'italic', children }; }

/** Inline code. */
export function inlineCode(value = '') { return { type: 'inline_code', value }; }

/** Strikethrough  ~~text~~ */
export function strikethrough(children = []) { return { type: 'strikethrough', children }; }

/**
 * Hyperlink.
 * Phase 2: title is now always an explicit field.
 */
export function link(href = '', children = [], title = null) {
  return { type: 'link', href, title, children };
}

/**
 * Inline image.
 * Phase 2: adds lazy, width, height.
 * Backward-compat: third arg may be a string (title) or opts object.
 */
export function image(src = '', alt = '', titleOrOpts = null) {
  const isOpts  = titleOrOpts !== null && typeof titleOrOpts === 'object';
  const title   = isOpts ? (titleOrOpts.title ?? null) : titleOrOpts;
  const opts    = isOpts ? titleOrOpts : {};
  return { type: 'image', src, alt, title, lazy: opts.lazy ?? true, width: opts.width ?? null, height: opts.height ?? null };
}

/** Hard line break. */
export function linebreak() { return { type: 'linebreak' }; }

/** Soft line break. */
export function softbreak() { return { type: 'softbreak' }; }

/** Variable reference  {{name}} */
export function variableRef(name = '') { return { type: 'variable_ref', name }; }

/** Footnote reference  [^id] */
export function footnoteRef(id = '', index = 0) { return { type: 'footnote_ref', id, index }; }

// ═══════════════════════════════════════════════════════════════════
// INLINE NODES — Phase 2
// ═══════════════════════════════════════════════════════════════════

/** Superscript  ^text^ */
export function superscript(children = []) { return { type: 'superscript', children }; }

/** Subscript  ~text~  (single tilde — distinct from ~~strikethrough~~) */
export function subscript(children = []) { return { type: 'subscript', children }; }

/** Highlighted text  ==text== */
export function highlight(children = []) { return { type: 'highlight', children }; }

/** Keyboard key  [[key]] */
export function kbd(value = '') { return { type: 'kbd', value }; }

/**
 * HTML character entity  &amp;  &copy;  &#160;  &#x2014;
 * `raw` holds the entity body WITHOUT surrounding & and ;
 * e.g. raw="amp"  raw="#160"  raw="#x2014"
 */
export function htmlEntity(raw = '') { return { type: 'html_entity', raw }; }

/**
 * Reference-style link  [text][id]  resolved via doc.metadata.references
 * If id is empty, linkText is used as the lookup key  ([label][])
 */
export function refLink(id = '', children = []) {
  return { type: 'ref_link', id: id.toLowerCase(), children };
}

// ═══ INLINE TYPE SET (Phase 1 + Phase 2) ═════════════════════════════════════
export const INLINE_TYPES = new Set([
  'text','bold','italic','inline_code','strikethrough',
  'link','image','linebreak','softbreak','variable_ref','footnote_ref',
  'superscript','subscript','highlight','kbd','html_entity','ref_link',
]);
