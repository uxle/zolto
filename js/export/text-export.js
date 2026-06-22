/**
 * js/export/text-export.js
 * Zolto v8.1.0 — Plain Text Exporter
 *
 * Strips all markup and produces clean, readable plain text.
 * Useful for copying to word processors, email clients, or
 * piping to other text-processing tools.
 *
 * Preserves:
 *  - Heading hierarchy (underline style for H1/H2, dashes for H3)
 *  - Paragraph spacing (blank lines between blocks)
 *  - List structure (bullets and numbers)
 *  - Table layout (padded ASCII columns)
 *  - Code blocks (indented 4 spaces)
 *  - Math (raw LaTeX)
 *  - Footnote text
 *
 * Strips:
 *  - All inline formatting markers (**, *, ~~, ``)
 *  - Links (keeps text, appends URL in parentheses)
 *  - Images (alt text only)
 *  - Diagrams, charts, vector (title/caption only)
 *  - Component definitions
 */

'use strict';

import { ZOLTONodeTypes, ZOLTOInlineTypes } from '../parser/ast.js';
import { downloadFile }                     from '../utils/helpers.js';
import { createLogger }                     from '../utils/logger.js';

const logger = createLogger('Export');

// ─────────────────────────────────────────────────────────────
// Text Exporter
// ─────────────────────────────────────────────────────────────

export const TextExporter = {

  /**
   * Export a Document AST to a plain text string.
   * @param {object} doc — transformed Document AST
   * @returns {string}
   */
  export(doc) {
    logger.info('Exporting plain text');

    const parts = [];

    for (const node of (doc.nodes ?? [])) {
      const text = _node(node, 0);
      if (text) parts.push(text);
    }

    // Footnotes at the bottom
    const fns = Object.values(doc.footnotes ?? {});
    if (fns.length > 0) {
      parts.push('─'.repeat(40));
      parts.push('FOOTNOTES');
      for (const fn of fns.sort((a, b) => (a.number ?? 0) - (b.number ?? 0))) {
        parts.push(`[${fn.number}] ${fn.text ?? ''}`);
      }
    }

    return parts.join('\n\n').trim() + '\n';
  },

  /**
   * Export and trigger browser download.
   * @param {object} doc
   */
  download(doc) {
    const text     = this.export(doc);
    const title    = doc.frontmatter?.title ?? 'document';
    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    downloadFile(filename, text, 'text/plain');
    logger.info('Text download triggered:', filename);
  },
};

// ─────────────────────────────────────────────────────────────
// Node Renderer
// ─────────────────────────────────────────────────────────────

function _node(node, depth) {
  if (!node) return '';

  switch (node.type) {
    case ZOLTONodeTypes.HEADING:
      return _heading(node);

    case ZOLTONodeTypes.PARAGRAPH:
      return _inline(node);

    case ZOLTONodeTypes.BLOCKQUOTE: {
      const inner = _nodes(node.children ?? [], depth + 1);
      return inner.split('\n').map(l => `    ${l}`).join('\n');
    }

    case ZOLTONodeTypes.HORIZONTAL_RULE:
      return '─'.repeat(40);

    case ZOLTONodeTypes.LIST:
      return _list(node, depth);

    case ZOLTONodeTypes.TABLE:
      return _table(node);

    case ZOLTONodeTypes.CODE_BLOCK: {
      const header = node.lang ? `[${node.lang.toUpperCase()}]\n` : '';
      return header + (node.code ?? '').split('\n').map(l => `    ${l}`).join('\n');
    }

    case ZOLTONodeTypes.CALLOUT:
    case ZOLTONodeTypes.ADMONITION: {
      const type  = (node.calloutType ?? node.admonitionType ?? 'note').toUpperCase();
      const title = node.title ? ` — ${node.title}` : '';
      const body  = node.children?.length ? _nodes(node.children, depth) : (node.text ?? '');
      return `[${type}${title}]\n${body}`;
    }

    case ZOLTONodeTypes.DETAILS: {
      const body = _nodes(node.children ?? [], depth);
      return `${node.summary ?? 'Details'}:\n${body}`;
    }

    case ZOLTONodeTypes.MATH_BLOCK:
      return `[MATH]\n${(node.content ?? '').trim()}\n[/MATH]`;

    case ZOLTONodeTypes.DIAGRAM:
      return `[DIAGRAM: ${node.config?.title ?? node.diagramType ?? 'diagram'}]`;

    case ZOLTONodeTypes.CHART:
      return `[CHART: ${node.config?.title ?? node.chartType ?? 'chart'}]`;

    case ZOLTONodeTypes.VECTOR_SCENE:
      return '[VECTOR SCENE]';

    case ZOLTONodeTypes.TABS:
      return (node.tabs ?? []).map(tab => {
        const label = tab.label ?? 'Tab';
        const body  = _nodes(tab.children ?? [], depth);
        return `── ${label} ──\n${body}`;
      }).join('\n\n');

    case ZOLTONodeTypes.CARD: {
      const title = node.title ? `${node.title}\n${'─'.repeat(node.title.length)}\n` : '';
      return title + _nodes(node.children ?? [], depth);
    }

    case ZOLTONodeTypes.STEPS:
      return (node.children ?? []).map((step, i) => {
        const title = step.title ?? `Step ${i + 1}`;
        const body  = _nodes(step.children ?? [], depth);
        return `${i + 1}. ${title}\n   ${body.split('\n').join('\n   ')}`;
      }).join('\n\n');

    case ZOLTONodeTypes.EMBED: {
      const alt = node.alt ?? '';
      const src = node.src ?? '';
      return alt ? `[Image: ${alt}] (${src})` : `[Embed: ${src}]`;
    }

    case ZOLTONodeTypes.MCQ: {
      const q       = node.question ?? '';
      const options = (node.options ?? []).map((o, i) => {
        const letter = String.fromCharCode(65 + i);
        const mark   = o.correct ? '✓' : ' ';
        return `  ${mark} ${letter}. ${o.text ?? ''}`;
      }).join('\n');
      return `Q: ${q}\n${options}`;
    }

    case ZOLTONodeTypes.FLASHCARD:
      return `Q: ${node.front ?? ''}\nA: ${node.back ?? ''}`;

    case ZOLTONodeTypes.PRESENTATION:
      return (node.slides ?? []).map((slide, i) => {
        return `─── Slide ${i + 1} ───\n${_nodes(slide.children ?? [], depth)}`;
      }).join('\n\n');

    case ZOLTONodeTypes.COMMENT:
    case ZOLTONodeTypes.COMPONENT_DEF:
    case ZOLTONodeTypes.IMPORT:
    case ZOLTONodeTypes.THEME_BLOCK:
      return '';

    default:
      if (Array.isArray(node.children)) return _nodes(node.children, depth);
      return node.text ?? '';
  }
}

function _nodes(nodes, depth) {
  return nodes.map(n => _node(n, depth)).filter(Boolean).join('\n\n');
}

// ─────────────────────────────────────────────────────────────
// Specific Renderers
// ─────────────────────────────────────────────────────────────

function _heading(node) {
  const text  = _inline(node);
  const level = node.level ?? 1;

  if (level === 1) return `${text}\n${'═'.repeat(text.length)}`;
  if (level === 2) return `${text}\n${'─'.repeat(text.length)}`;
  if (level === 3) return `### ${text}`;
  return `${'#'.repeat(level)} ${text}`;
}

function _list(node, depth) {
  const pad = '  '.repeat(depth);
  return (node.children ?? []).map((item, i) => {
    const marker = node.ordered ? `${i + 1}.` : '•';
    const text   = _inline(item);
    const nested = (item.children ?? [])
      .filter(c => c?.type === ZOLTONodeTypes.LIST)
      .map(n => _list(n, depth + 1))
      .join('\n');
    const check = item.checked !== null && item.checked !== undefined
      ? `[${item.checked === true ? 'x' : ' '}] ` : '';
    return `${pad}${marker} ${check}${text}${nested ? '\n' + nested : ''}`;
  }).join('\n');
}

function _table(node) {
  const headers = node.headers ?? [];
  const rows    = node.rows    ?? [];
  if (headers.length === 0) return '';

  // Calculate column widths
  const allRows = [headers, ...rows];
  const widths  = headers.map((_, ci) =>
    Math.max(...allRows.map(row => String(row[ci] ?? '').length))
  );

  const pad = (str, w) => String(str ?? '').padEnd(w);
  const headerRow = '│ ' + headers.map((h, i) => pad(h, widths[i])).join(' │ ') + ' │';
  const sepRow    = '├─' + widths.map(w => '─'.repeat(w)).join('─┼─') + '─┤';
  const topRow    = '┌─' + widths.map(w => '─'.repeat(w)).join('─┬─') + '─┐';
  const botRow    = '└─' + widths.map(w => '─'.repeat(w)).join('─┴─') + '─┘';
  const dataRows  = rows.map(row =>
    '│ ' + row.map((c, i) => pad(c, widths[i])).join(' │ ') + ' │'
  );

  return [topRow, headerRow, sepRow, ...dataRows, botRow].join('\n');
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
    case ZOLTOInlineTypes.BOLD:          return n.text ?? '';
    case ZOLTOInlineTypes.ITALIC:        return n.text ?? '';
    case ZOLTOInlineTypes.BOLD_ITALIC:   return n.text ?? '';
    case ZOLTOInlineTypes.CODE:          return n.text ?? '';
    case ZOLTOInlineTypes.MATH:          return n.text ?? '';
    case ZOLTOInlineTypes.LINK:          return n.href ? `${n.text ?? ''} (${n.href})` : (n.text ?? '');
    case ZOLTOInlineTypes.IMAGE:         return n.text ? `[${n.text}]` : '[image]';
    case ZOLTOInlineTypes.FOOTNOTE_REF:  return `[${n.number ?? n.label}]`;
    case ZOLTOInlineTypes.HIGHLIGHT:     return n.text ?? '';
    case ZOLTOInlineTypes.STRIKETHROUGH: return n.text ?? '';
    case ZOLTOInlineTypes.SUPERSCRIPT:   return n.text ?? '';
    case ZOLTOInlineTypes.SUBSCRIPT:     return n.text ?? '';
    case ZOLTOInlineTypes.MENTION:       return `@${n.text ?? ''}`;
    case ZOLTOInlineTypes.HASHTAG:       return `#${n.text ?? ''}`;
    case ZOLTOInlineTypes.VARIABLE_REF:  return `{$${n.name ?? ''}}`;
    case ZOLTOInlineTypes.LINE_BREAK:    return '\n';
    case ZOLTOInlineTypes.SOFT_BREAK:    return ' ';
    default:                             return n.text ?? '';
  }
}
