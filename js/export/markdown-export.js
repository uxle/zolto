/**
 * js/export/markdown-export.js
 * Zolto v8.1.0 — Markdown Exporter
 *
 * Converts a transformed Document AST back to standard Markdown.
 * Zolto-only constructs that have no Markdown equivalent are either:
 *   - Stripped (diagram SVG, vector scenes, component definitions)
 *   - Approximated (callouts → blockquote, math → fenced code block)
 *   - Preserved as-is (code blocks, headings, lists, tables)
 *
 * The output is valid CommonMark with GitHub Flavored Markdown
 * extensions (tables, task lists, strikethrough).
 */

'use strict';

import { ZOLTONodeTypes, ZOLTOInlineTypes } from '../parser/ast.js';
import { downloadFile }                     from '../utils/helpers.js';
import { createLogger }                     from '../utils/logger.js';

const logger = createLogger('Export');

// ─────────────────────────────────────────────────────────────
// Markdown Exporter
// ─────────────────────────────────────────────────────────────

export const MarkdownExporter = {

  /**
   * Export a Document AST to a Markdown string.
   * @param {object} doc — transformed Document AST
   * @returns {string}
   */
  export(doc) {
    logger.info('Exporting Markdown');

    const ctx = { depth: 0 };
    const parts = [];

    // Frontmatter
    if (doc.frontmatter && Object.keys(doc.frontmatter).length > 0) {
      parts.push(_frontmatter(doc.frontmatter));
    }

    // Body nodes
    for (const node of (doc.nodes ?? [])) {
      const md = _node(node, ctx);
      if (md) parts.push(md);
    }

    // Footnotes
    if (doc.footnotes && Object.keys(doc.footnotes).length > 0) {
      parts.push(_footnotes(doc.footnotes));
    }

    return parts.filter(Boolean).join('\n\n') + '\n';
  },

  /**
   * Export and trigger browser download.
   * @param {object} doc
   */
  download(doc) {
    const md       = this.export(doc);
    const title    = doc.frontmatter?.title ?? 'document';
    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    downloadFile(filename, md, 'text/markdown');
    logger.info('Markdown download triggered:', filename);
  },
};

// ─────────────────────────────────────────────────────────────
// Frontmatter
// ─────────────────────────────────────────────────────────────

function _frontmatter(fm) {
  const lines = Object.entries(fm)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map(i => `"${i}"`).join(', ')}]`;
      return `${k}: ${v}`;
    });
  return `---\n${lines.join('\n')}\n---`;
}

// ─────────────────────────────────────────────────────────────
// Node Dispatcher
// ─────────────────────────────────────────────────────────────

function _node(node, ctx) {
  if (!node) return '';

  switch (node.type) {
    // ── Domain 1 ──────────────────────────────────────────
    case ZOLTONodeTypes.HEADING:        return _heading(node, ctx);
    case ZOLTONodeTypes.PARAGRAPH:      return _paragraph(node, ctx);
    case ZOLTONodeTypes.BLOCKQUOTE:     return _blockquote(node, ctx);
    case ZOLTONodeTypes.HORIZONTAL_RULE: return '---';
    case ZOLTONodeTypes.LIST:           return _list(node, ctx);
    case ZOLTONodeTypes.TABLE:          return _table(node);
    case ZOLTONodeTypes.CODE_BLOCK:     return _codeBlock(node);
    case ZOLTONodeTypes.CALLOUT:        return _callout(node, ctx);
    case ZOLTONodeTypes.ADMONITION:     return _admonition(node, ctx);
    case ZOLTONodeTypes.DETAILS:        return _details(node, ctx);
    case ZOLTONodeTypes.ACCORDION:      return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.ACCORDION_ITEM: return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.TABS:           return _tabs(node, ctx);
    case ZOLTONodeTypes.TAB:            return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.CARD:           return _card(node, ctx);
    case ZOLTONodeTypes.CARD_GROUP:     return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.STEPS:          return _steps(node, ctx);
    case ZOLTONodeTypes.STEP:           return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.HERO:           return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.EMBED:          return _embed(node);
    case ZOLTONodeTypes.BANNER:         return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.COLUMNS:        return _nodes(node.children ?? [], ctx);
    case ZOLTONodeTypes.FOOTNOTE:       return ''; // Collected separately

    // ── Domain 2: Math → fenced code block ──────────────
    case ZOLTONodeTypes.MATH_BLOCK:
      return `\`\`\`math\n${(node.content ?? '').trim()}\n\`\`\``;

    // ── Domain 3–6: Strip or approximate ────────────────
    case ZOLTONodeTypes.DIAGRAM:
      return `> **[Diagram: ${node.config?.title ?? node.diagramType ?? 'diagram'}]**`;

    case ZOLTONodeTypes.CHART:
      return `> **[Chart: ${node.config?.title ?? node.chartType ?? 'chart'}]**`;

    case ZOLTONodeTypes.VECTOR_SCENE:
      return `> **[Vector Scene]**`;

    case ZOLTONodeTypes.GRID:
    case ZOLTONodeTypes.FLEX:
    case ZOLTONodeTypes.CANVAS:
    case ZOLTONodeTypes.SPLIT:
    case ZOLTONodeTypes.PANEL:
      return _nodes(node.children ?? [], ctx);

    case ZOLTONodeTypes.PRESENTATION:
      return _presentation(node, ctx);

    case ZOLTONodeTypes.MCQ:
      return _mcq(node);

    case ZOLTONodeTypes.FLASHCARD:
      return _flashcard(node);

    case ZOLTONodeTypes.COMPONENT_DEF:
    case ZOLTONodeTypes.IMPORT:
    case ZOLTONodeTypes.THEME_BLOCK:
    case ZOLTONodeTypes.COMMENT:
      return ''; // invisible / meta

    case ZOLTONodeTypes.COMPONENT_USE:
      return _nodes(node.children ?? [], ctx);

    case ZOLTONodeTypes.ERROR_NODE:
      return `<!-- Error [${node.code}]: ${node.message} -->`;

    default:
      if (Array.isArray(node.children)) return _nodes(node.children, ctx);
      return '';
  }
}

function _nodes(nodes, ctx) {
  return nodes.map(n => _node(n, ctx)).filter(Boolean).join('\n\n');
}

// ─────────────────────────────────────────────────────────────
// Individual Node Renderers
// ─────────────────────────────────────────────────────────────

function _heading(node, ctx) {
  const hashes = '#'.repeat(node.level ?? 1);
  const text   = _inline(node);
  const anchor = node.anchor ? ` {#${node.anchor}}` : '';
  return `${hashes} ${text}${anchor}`;
}

function _paragraph(node, ctx) {
  return _inline(node);
}

function _blockquote(node, ctx) {
  const inner = _nodes(node.children ?? [], ctx);
  return inner.split('\n').map(l => `> ${l}`).join('\n');
}

function _list(node, ctx, indent = 0) {
  const prefix = '  '.repeat(indent);
  return (node.children ?? []).map((item, i) => {
    const marker   = node.ordered ? `${i + 1}.` : '-';
    const text     = _inline(item);

    // Checklist
    if (item.checked !== null && item.checked !== undefined) {
      const box = item.checked === true ? '[x]' : '[ ]';
      return `${prefix}- ${box} ${text}`;
    }

    const content = `${prefix}${marker} ${text}`;

    // Nested list
    const nested = (item.children ?? []).filter(c => c?.type === ZOLTONodeTypes.LIST);
    const nestedMd = nested.map(n => _list(n, ctx, indent + 1)).join('\n');

    return nestedMd ? `${content}\n${nestedMd}` : content;
  }).join('\n');
}

function _table(node) {
  const headers = node.headers ?? [];
  const rows    = node.rows    ?? [];
  const align   = node.align   ?? [];

  if (headers.length === 0) return '';

  const headerRow = `| ${headers.join(' | ')} |`;
  const sepRow    = `| ${headers.map((_, i) => {
    const a = align[i] ?? 'left';
    if (a === 'center') return ':---:';
    if (a === 'right')  return '---:';
    return '---';
  }).join(' | ')} |`;
  const dataRows  = rows.map(row => `| ${row.join(' | ')} |`).join('\n');

  return [headerRow, sepRow, dataRows].filter(Boolean).join('\n');
}

function _codeBlock(node) {
  const lang = node.lang ?? '';
  return `\`\`\`${lang}\n${node.code ?? ''}\n\`\`\``;
}

function _callout(node, ctx) {
  const type = node.calloutType ?? 'note';
  const icon = { tip: '💡', warning: '⚠️', danger: '🚫', info: 'ℹ️' }[type] ?? '📝';
  const body = node.children?.length ? _nodes(node.children, ctx) : (node.text ?? '');
  const title = node.title ? `**${node.title}**\n\n` : '';
  return body.split('\n').map((l, i) => i === 0 ? `> ${icon} ${title}${l}` : `> ${l}`).join('\n');
}

function _admonition(node, ctx) {
  const title = node.title ?? (node.admonitionType ?? 'Note');
  const body  = _nodes(node.children ?? [], ctx);
  const prefixed = body.split('\n').map(l => `> ${l}`).join('\n');
  return `> **${title}**\n>\n${prefixed}`;
}

function _details(node, ctx) {
  const summary = node.summary ?? 'Details';
  const body    = _nodes(node.children ?? [], ctx);
  return `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;
}

function _tabs(node, ctx) {
  const tabs = node.tabs ?? [];
  return tabs.map(tab => {
    const label = tab.label ?? 'Tab';
    const body  = _nodes(tab.children ?? [], ctx);
    return `**${label}**\n\n${body}`;
  }).join('\n\n---\n\n');
}

function _card(node, ctx) {
  const title = node.title ? `**${node.title}**\n\n` : '';
  const body  = _nodes(node.children ?? [], ctx);
  return `${title}${body}`;
}

function _steps(node, ctx) {
  return (node.children ?? []).map((step, i) => {
    const title = step.title ?? `Step ${i + 1}`;
    const body  = _nodes(step.children ?? [], ctx);
    return `${i + 1}. **${title}**\n\n${body.split('\n').map(l => `   ${l}`).join('\n')}`;
  }).join('\n\n');
}

function _embed(node) {
  const src  = node.src ?? '';
  const alt  = node.alt ?? '';
  const type = node.embedType ?? 'image';
  if (type === 'image') return `![${alt}](${src})`;
  return `[${alt || src}](${src})`;
}

function _presentation(node, ctx) {
  const slides = node.slides ?? [];
  return slides.map((slide, i) => {
    const body = _nodes(slide.children ?? [], ctx);
    return `---\n\n<!-- Slide ${i + 1} -->\n\n${body}`;
  }).join('\n\n');
}

function _mcq(node) {
  const q       = node.question ?? '';
  const options = (node.options ?? []).map((o, i) => {
    const letter = String.fromCharCode(65 + i);
    const mark   = o.correct ? '✓ ' : '  ';
    return `- ${mark}**${letter}.** ${o.text ?? ''}`;
  }).join('\n');
  const expl = node.explanation ? `\n\n> **Explanation:** ${node.explanation}` : '';
  return `**Question:** ${q}\n\n${options}${expl}`;
}

function _flashcard(node) {
  const front = node.front ?? '';
  const back  = node.back  ?? '';
  return `**Q:** ${front}\n\n**A:** ${back}`;
}

function _footnotes(footnotes) {
  return Object.values(footnotes)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    .map(fn => `[^${fn.label ?? fn.number}]: ${fn.text ?? ''}`)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────
// Inline Renderer
// ─────────────────────────────────────────────────────────────

function _inline(node) {
  if (Array.isArray(node.inline) && node.inline.length > 0) {
    return _inlineNodes(node.inline);
  }
  return node.text ?? '';
}

function _inlineNodes(nodes) {
  return nodes.map(_inlineNode).join('');
}

function _inlineNode(n) {
  if (!n) return '';
  switch (n.type) {
    case ZOLTOInlineTypes.TEXT:          return n.text ?? '';
    case ZOLTOInlineTypes.BOLD:          return `**${n.text ?? ''}**`;
    case ZOLTOInlineTypes.ITALIC:        return `*${n.text ?? ''}*`;
    case ZOLTOInlineTypes.BOLD_ITALIC:   return `***${n.text ?? ''}***`;
    case ZOLTOInlineTypes.CODE:          return `\`${n.text ?? ''}\``;
    case ZOLTOInlineTypes.MATH:          return `$${n.text ?? ''}$`;
    case ZOLTOInlineTypes.LINK:          return `[${n.text ?? ''}](${n.href ?? ''})`;
    case ZOLTOInlineTypes.IMAGE:         return `![${n.text ?? ''}](${n.src ?? ''})`;
    case ZOLTOInlineTypes.FOOTNOTE_REF:  return `[^${n.label ?? n.number}]`;
    case ZOLTOInlineTypes.HIGHLIGHT:     return `==${n.text ?? ''}==`;
    case ZOLTOInlineTypes.STRIKETHROUGH: return `~~${n.text ?? ''}~~`;
    case ZOLTOInlineTypes.SUPERSCRIPT:   return `^${n.text ?? ''}^`;
    case ZOLTOInlineTypes.SUBSCRIPT:     return `~${n.text ?? ''}~`;
    case ZOLTOInlineTypes.MENTION:       return `@${n.text ?? ''}`;
    case ZOLTOInlineTypes.HASHTAG:       return `#${n.text ?? ''}`;
    case ZOLTOInlineTypes.VARIABLE_REF:  return `{$${n.name ?? ''}}`;
    case ZOLTOInlineTypes.LINE_BREAK:    return '  \n';
    case ZOLTOInlineTypes.SOFT_BREAK:    return ' ';
    default:                             return n.text ?? '';
  }
}
