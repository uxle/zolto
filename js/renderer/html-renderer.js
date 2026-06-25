/**
 * js/renderer/html-renderer.js
 * Zolto v8.1.0 — HTML Renderer (Domain 1: Markdown & Typography)
 *
 * Renders all Markdown and typography AST nodes to HTML strings.
 * Handles: headings, paragraphs, lists, tables, code blocks,
 *          blockquotes, callouts, admonitions, details, accordion,
 *          tabs, cards, steps, hero, embed, banner, columns, footnotes.
 *
 * All methods receive (node, ctx) and return an HTML string.
 * No DOM access — pure string construction.
 */

'use strict';

import { ZOLTONodeTypes, ZOLTOInlineTypes } from '../parser/ast.js';
import { escapeHtml, escapeAttr }           from '../utils/dom.js';

// ─────────────────────────────────────────────────────────────
// Callout icon map
// ─────────────────────────────────────────────────────────────

const CALLOUT_ICONS = Object.freeze({
  tip:        '💡', note:       '📝', info:       'ℹ️',
  warning:    '⚠️', danger:     '🚫', caution:    '⚠️',
  important:  '❗', success:    '✅', check:      '✔️',
  bug:        '🐛', example:    '📋', quote:      '"',
  abstract:   '📄', todo:       '☑️', question:   '❓',
  failure:    '✖️', seealso:    '🔗', summary:    '📄',
  hint:       '💡', attention:  '⚠️', definition: '📖',
  theorem:    '📐',
});

// ─────────────────────────────────────────────────────────────
// HTMLRenderer Class
// ─────────────────────────────────────────────────────────────

export class HTMLRenderer {
  /**
   * @param {import('./renderer.js').ZoltoRenderer} parent
   */
  constructor(parent) {
    this._r = parent; // back-reference to ZoltoRenderer
  }

  // ─────────────────────────────────────────────────────────
  // 1. Heading
  // ─────────────────────────────────────────────────────────

  renderHeading(node, ctx) {
    const level   = node.level ?? 1;
    const tag     = `h${level}`;
    const id      = escapeAttr(node.id);
    const anchor  = node.anchor ? ` id="${escapeAttr(node.anchor)}"` : '';
    const classes = ['zolto-heading', `zolto-h${level}`, ...(node.classes ?? [])].join(' ');
    const content = this._inline(node, ctx);

    return `<${tag}${anchor} class="${classes}" data-id="${id}">${content}</${tag}>`;
  }

  // ─────────────────────────────────────────────────────────
  // 2. Paragraph
  // ─────────────────────────────────────────────────────────

  renderParagraph(node, ctx) {
    const id      = escapeAttr(node.id);
    const classes = ['zolto-p', ...(node.classes ?? [])].join(' ');
    const content = this._inline(node, ctx);
    if (!content.trim()) return '';
    return `<p class="${classes}" data-id="${id}">${content}</p>`;
  }

  // ─────────────────────────────────────────────────────────
  // 3. Blockquote
  // ─────────────────────────────────────────────────────────

  renderBlockquote(node, ctx) {
    const id       = escapeAttr(node.id);
    const children = this._r.renderNodes(node.children ?? [], ctx);
    return `<blockquote class="zolto-blockquote" data-id="${id}">${children}</blockquote>`;
  }

  // ─────────────────────────────────────────────────────────
  // 4. Horizontal Rule
  // ─────────────────────────────────────────────────────────

  renderHR(node, ctx) {
    return `<hr class="zolto-hr" data-id="${escapeAttr(node.id)}" />`;
  }

  // ─────────────────────────────────────────────────────────
  // 5. List
  // ─────────────────────────────────────────────────────────

  renderList(node, ctx) {
    const id      = escapeAttr(node.id);
    const ordered = node.ordered ?? false;
    const tag     = ordered ? 'ol' : 'ul';
    const cls     = ordered
      ? 'zolto-list zolto-list-ordered'
      : 'zolto-list';

    const items = (node.children ?? []).map(item => {
      if (!item) return '';
      if (item.type === ZOLTONodeTypes.LIST) {
        // Nested list — render directly
        return this.renderList(item, ctx);
      }
      return this._renderListItem(item, ctx);
    }).join('');

    return `<${tag} class="${cls}" data-id="${id}">${items}</${tag}>`;
  }

  _renderListItem(item, ctx) {
    const content  = this._inline(item, ctx);
    const nested   = this._r.renderNodes(item.children ?? [], ctx);
    const checked  = item.checked;
    const id       = escapeAttr(item.id);

    // Checklist item
    if (checked !== null && checked !== undefined) {
      const state = checked === true  ? 'zolto-checked'
                  : checked === false ? ''
                  : `zolto-${String(checked)}`;
      const icon  = checked === true  ? '✓'
                  : checked === 'o'   ? '◐'
                  : checked === '!'   ? '⊘'
                  : checked === '~'   ? '✗'
                  : '☐';
      return `<li class="zolto-checklist-item ${state}" data-id="${id}"
                role="checkbox" aria-checked="${checked === true}">
        <span class="zolto-check-icon" aria-hidden="true">${icon}</span>
        <span>${content}</span>${nested}
      </li>`;
    }

    return `<li class="zolto-list-item" data-id="${id}">${content}${nested}</li>`;
  }

  // ─────────────────────────────────────────────────────────
  // 6. Table
  // ─────────────────────────────────────────────────────────

  renderTable(node, ctx) {
    const id      = escapeAttr(node.id);
    const headers = node.headers ?? [];
    const rows    = node.rows    ?? [];
    const align   = node.align   ?? [];
    const caption = node.caption;

    const thCells = headers.map((h, i) =>
      `<th class="align-${align[i] ?? 'left'}" scope="col">${escapeHtml(h)}</th>`
    ).join('');

    const bodyRows = rows.map(row => {
      const cells = row.map((cell, i) =>
        `<td class="align-${align[i] ?? 'left'}">${escapeHtml(String(cell ?? ''))}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<div class="zolto-table-wrapper" data-id="${id}">
      <table class="zolto-table" role="table">
        ${caption ? `<caption class="zolto-table-caption">${escapeHtml(caption)}</caption>` : ''}
        <thead><tr>${thCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 7. Code Block
  // ─────────────────────────────────────────────────────────

  renderCodeBlock(node, ctx) {
    const id   = escapeAttr(node.id);
    const lang = node.lang ?? '';
    const code = escapeHtml(node.code ?? '');

    return `<div class="zolto-code-block" data-id="${id}" data-lang="${escapeAttr(lang)}">
      <div class="zolto-code-header">
        ${lang ? `<span class="zolto-code-lang">${escapeHtml(lang)}</span>` : ''}
        <button class="zolto-code-copy" aria-label="Copy code" data-action="code:copy">⎘</button>
      </div>
      <pre class="zolto-pre"><code class="zolto-code language-${escapeAttr(lang)}">${code}</code></pre>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 8. Callout
  // ─────────────────────────────────────────────────────────

  renderCallout(node, ctx) {
    const id       = escapeAttr(node.id);
    const type     = (node.calloutType ?? 'note').toLowerCase();
    const icon     = CALLOUT_ICONS[type] ?? 'ℹ️';
    const body     = node.children?.length
      ? this._r.renderNodes(node.children, ctx)
      : `<span>${this._inline(node, ctx)}</span>`;

    const title = node.title
      ? `<div class="zolto-callout-title">${escapeHtml(node.title)}</div>`
      : '';

    return `<div class="zolto-callout zolto-callout-${type}" role="note"
              aria-label="${escapeAttr(type)}" data-id="${id}">
      <div class="zolto-callout-icon" aria-hidden="true">${icon}</div>
      <div class="zolto-callout-body">${title}${body}</div>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 9. Admonition
  // ─────────────────────────────────────────────────────────

  renderAdmonition(node, ctx) {
    const id       = escapeAttr(node.id);
    const type     = (node.admonitionType ?? 'note').toLowerCase();
    const icon     = CALLOUT_ICONS[type] ?? 'ℹ️';
    const title    = node.title ?? type.charAt(0).toUpperCase() + type.slice(1);
    const body     = this._r.renderNodes(node.children ?? [], ctx);

    return `<div class="zolto-admonition zolto-admonition-${type}" role="note" data-id="${id}">
      <div class="zolto-admonition-header">
        <span class="zolto-admonition-icon" aria-hidden="true">${icon}</span>
        <span class="zolto-admonition-title">${escapeHtml(title)}</span>
      </div>
      <div class="zolto-admonition-body">${body}</div>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 10. Details (Spoiler)
  // ─────────────────────────────────────────────────────────

  renderDetails(node, ctx) {
    const id      = escapeAttr(node.id);
    const summary = escapeHtml(node.summary ?? 'Details');
    const body    = this._r.renderNodes(node.children ?? [], ctx);
    const open    = node.open ? ' open' : '';

    return `<details class="zolto-details" id="${id}"${open}>
      <summary class="zolto-details-summary">${summary}</summary>
      <div class="zolto-details-body">${body}</div>
    </details>`;
  }

  // ─────────────────────────────────────────────────────────
  // 11. Accordion
  // ─────────────────────────────────────────────────────────

  renderAccordion(node, ctx) {
    const id    = escapeAttr(node.id);
    const items = this._r.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-accordion" data-id="${id}" role="list">${items}</div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 12. Tabs
  // ─────────────────────────────────────────────────────────

  renderTabs(node, ctx) {
    const id      = escapeAttr(node.id);
    const tabs    = node.tabs ?? [];
    const variant = escapeAttr(node.variant ?? 'underline');

    const btnList = tabs.map((tab, i) => {
      const label    = escapeHtml(tab.label ?? `Tab ${i + 1}`);
      const isActive = i === 0;
      return `<button class="zolto-tab-btn${isActive ? ' zolto-tab-active' : ''}"
                role="tab"
                aria-selected="${isActive}"
                aria-controls="tab-panel-${id}-${i}"
                id="tab-btn-${id}-${i}">${label}</button>`;
    }).join('');

    const panels = tabs.map((tab, i) => {
      const content  = this._r.renderNodes(tab.children ?? [], ctx);
      const isActive = i === 0;
      return `<div class="zolto-tab-panel${isActive ? '' : ' zolto-tab-hidden'}"
               id="tab-panel-${id}-${i}"
               role="tabpanel"
               aria-labelledby="tab-btn-${id}-${i}"
               ${isActive ? '' : 'hidden'}>${content}</div>`;
    }).join('');

    return `<div class="zolto-tabs zolto-tabs-${variant}" data-id="${id}"
              role="tablist" aria-label="Tabs">
      <div class="zolto-tabs-header">${btnList}</div>
      <div class="zolto-tabs-body">${panels}</div>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 13. Card
  // ─────────────────────────────────────────────────────────

  renderCard(node, ctx) {
    const id      = escapeAttr(node.id);
    const variant = node.variant ?? 'default';
    const cls     = ['zolto-card',
                     variant !== 'default' ? `zolto-card-${variant}` : '',
                     ...(node.classes ?? [])].filter(Boolean).join(' ');
    const title   = node.title
      ? `<div class="zolto-card-header">
           ${node.icon ? `<span class="zolto-card-icon">${escapeHtml(node.icon)}</span>` : ''}
           <span class="zolto-card-title">${escapeHtml(node.title)}</span>
         </div>`
      : '';
    const body    = this._r.renderNodes(node.children ?? [], ctx);
    const tag     = node.href ? 'a' : 'div';
    const href    = node.href ? ` href="${escapeAttr(node.href)}"` : '';

    return `<${tag} class="${cls}" data-id="${id}"${href}>
      ${title}
      <div class="zolto-card-body">${body}</div>
    </${tag}>`;
  }

  // ─────────────────────────────────────────────────────────
  // 14. Card Group
  // ─────────────────────────────────────────────────────────

  renderCardGroup(node, ctx) {
    const id   = escapeAttr(node.id);
    const cols = node.columns ?? 3;
    const body = this._r.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-card-group zolto-card-group-${cols}" data-id="${id}">${body}</div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 15. Steps
  // ─────────────────────────────────────────────────────────

  renderSteps(node, ctx) {
    const id    = escapeAttr(node.id);
    const items = (node.children ?? []).map((step, i) => {
      const title = escapeHtml(step.title ?? `Step ${i + 1}`);
      const body  = this._r.renderNodes(step.children ?? [], ctx);
      const num   = i + 1;
      return `<li class="zolto-step" data-step="${num}">
        <div class="zolto-step-marker" aria-hidden="true">${num}</div>
        <div class="zolto-step-content">
          <div class="zolto-step-title">${title}</div>
          <div class="zolto-step-body">${body}</div>
        </div>
      </li>`;
    }).join('');

    return `<ol class="zolto-steps" data-id="${id}">${items}</ol>`;
  }

  // ─────────────────────────────────────────────────────────
  // 16. Hero
  // ─────────────────────────────────────────────────────────

  renderHero(node, ctx) {
    const id      = escapeAttr(node.id);
    const variant = escapeAttr(node.variant ?? 'default');
    const body    = this._r.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-hero zolto-hero-${variant}" data-id="${id}">
      <div class="zolto-hero-content">${body}</div>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 17. Embed
  // ─────────────────────────────────────────────────────────

  renderEmbed(node, ctx) {
    const id      = escapeAttr(node.id);
    const src     = escapeAttr(node.src ?? '');
    const type    = node.embedType ?? 'image';
    const alt     = node.alt     ? escapeHtml(node.alt)     : '';
    const caption = node.caption ? escapeHtml(node.caption) : '';

    let media = '';
    switch (type) {
      case 'image':
        media = `<img src="${src}" alt="${alt}" class="zolto-embed-img" loading="lazy" />`;
        break;
      case 'youtube': {
        const ytId = this._youtubeId(node.src ?? '');
        media = `<div class="zolto-embed-ratio" style="--ratio:56.25%">
          <iframe src="https://www.youtube-nocookie.com/embed/${ytId}"
            title="${alt}" loading="lazy" class="zolto-embed-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>`;
        break;
      }
      case 'vimeo': {
        const vmId = this._vimeoId(node.src ?? '');
        media = `<div class="zolto-embed-ratio" style="--ratio:56.25%">
          <iframe src="https://player.vimeo.com/video/${vmId}"
            title="${alt}" loading="lazy" class="zolto-embed-iframe" allowfullscreen></iframe>
        </div>`;
        break;
      }
      case 'video':
        media = `<video src="${src}" controls class="zolto-embed-img" loading="lazy">
          <track kind="captions" />
        </video>`;
        break;
      default:
        media = `<iframe src="${src}" title="${alt}" class="zolto-embed-iframe" loading="lazy"></iframe>`;
    }

    return `<figure class="zolto-embed zolto-embed-${escapeAttr(type)}" data-id="${id}">
      ${media}
      ${caption ? `<figcaption class="zolto-embed-caption">${caption}</figcaption>` : ''}
    </figure>`;
  }

  _youtubeId(url) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    return m ? escapeAttr(m[1]) : '';
  }

  _vimeoId(url) {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? escapeAttr(m[1]) : '';
  }

  // ─────────────────────────────────────────────────────────
  // 18. Banner
  // ─────────────────────────────────────────────────────────

  renderBanner(node, ctx) {
    const id   = escapeAttr(node.id);
    const body = this._r.renderNodes(node.children ?? [], ctx);
    return `<div class="zolto-banner" data-id="${id}" role="note">${body}</div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 19. Columns
  // ─────────────────────────────────────────────────────────

  renderColumns(node, ctx) {
    const id   = escapeAttr(node.id);
    const cols = (node.children ?? []).map(col => {
      const body = this._r.renderNodes(
        Array.isArray(col?.children) ? col.children : [col], ctx
      );
      return `<div class="zolto-column">${body}</div>`;
    }).join('');
    return `<div class="zolto-columns" data-id="${id}">${cols}</div>`;
  }

  // ─────────────────────────────────────────────────────────
  // 20. Inline Renderer
  //     Converts InlineNode[] to an HTML string.
  //     Falls back to escapeHtml(node.text) if inline is null.
  // ─────────────────────────────────────────────────────────

  _inline(node, ctx) {
    if (Array.isArray(node.inline) && node.inline.length > 0) {
      return this._renderInlineNodes(node.inline, ctx);
    }
    return escapeHtml(typeof node.text === 'string' ? node.text : '');
  }

  _renderInlineNodes(nodes, ctx) {
    return nodes.map(n => this._renderInlineNode(n, ctx)).join('');
  }

  _renderInlineNode(n, ctx) {
    if (!n) return '';
    switch (n.type) {
      case ZOLTOInlineTypes.TEXT:
        return escapeHtml(n.text ?? '');

      case ZOLTOInlineTypes.BOLD:
        return `<strong class="zolto-bold">${escapeHtml(n.text ?? '')}</strong>`;

      case ZOLTOInlineTypes.ITALIC:
        return `<em class="zolto-italic">${escapeHtml(n.text ?? '')}</em>`;

      case ZOLTOInlineTypes.BOLD_ITALIC:
        return `<strong><em class="zolto-bolditalic">${escapeHtml(n.text ?? '')}</em></strong>`;

      case ZOLTOInlineTypes.CODE:
        return `<code class="zolto-code-inline">${escapeHtml(n.text ?? '')}</code>`;

      case ZOLTOInlineTypes.MATH: {
        // Inline math — rendered by MathRenderer
        const mathHtml = this._r._math().renderMathInline(
          { type: 'MathInline', id: 'mi', line: 0, content: n.text ?? '', ast: null, attrs: {} },
          ctx
        );
        return mathHtml;
      }

      case ZOLTOInlineTypes.LINK: {
        const href  = escapeAttr(n.href ?? '#');
        const title = n.title ? ` title="${escapeAttr(n.title)}"` : '';
        return `<a class="zolto-link" href="${href}"${title}>${escapeHtml(n.text ?? '')}</a>`;
      }

      case ZOLTOInlineTypes.IMAGE: {
        const src = escapeAttr(n.src ?? '');
        const alt = escapeAttr(n.text ?? '');
        return `<img class="zolto-inline-img" src="${src}" alt="${alt}" loading="lazy" />`;
      }

      case ZOLTOInlineTypes.FOOTNOTE_REF: {
        const num = n.number ?? '?';
        const id  = escapeAttr(n.label ?? '');
        return `<sup class="zolto-footnote-ref">
          <a href="#fn-${id}" id="fnref-${id}" aria-describedby="footnote-label">[${num}]</a>
        </sup>`;
      }

      case ZOLTOInlineTypes.HIGHLIGHT:
        return `<mark class="zolto-highlight">${escapeHtml(n.text ?? '')}</mark>`;

      case ZOLTOInlineTypes.STRIKETHROUGH:
        return `<del class="zolto-strikethrough">${escapeHtml(n.text ?? '')}</del>`;

      case ZOLTOInlineTypes.SUPERSCRIPT:
        return `<sup class="zolto-sup">${escapeHtml(n.text ?? '')}</sup>`;

      case ZOLTOInlineTypes.SUBSCRIPT:
        return `<sub class="zolto-sub">${escapeHtml(n.text ?? '')}</sub>`;

      case ZOLTOInlineTypes.UNDERLINE:
        return `<u class="zolto-underline">${escapeHtml(n.text ?? '')}</u>`;

      case ZOLTOInlineTypes.MENTION:
        return `<span class="zolto-mention">@${escapeHtml(n.text ?? '')}</span>`;

      case ZOLTOInlineTypes.HASHTAG:
        return `<span class="zolto-hashtag">#${escapeHtml(n.text ?? '')}</span>`;

      case ZOLTOInlineTypes.COLOR: {
        const colour = escapeAttr(n.color ?? 'inherit');
        return `<span class="zolto-color" style="color:${colour}">${escapeHtml(n.text ?? '')}</span>`;
      }

      case ZOLTOInlineTypes.VARIABLE_REF:
        return escapeHtml(String(ctx.variables?.[n.name ?? ''] ?? `{$${n.name ?? '?'}}`));

      case ZOLTOInlineTypes.LINE_BREAK:
        return '<br />';

      case ZOLTOInlineTypes.SOFT_BREAK:
        return ' ';

      default:
        return escapeHtml(n.text ?? '');
    }
  }
}
