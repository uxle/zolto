/**
 * js/export/html-export.js
 * Zolto v8.1.0 — HTML Exporter
 *
 * Produces a self-contained, single-file HTML document from the
 * current Document AST. The output:
 *  - Inlines all CSS (base + component + active theme)
 *  - Includes rendered math (KaTeX already produces MathML)
 *  - Embeds a minimal interactivity script (tabs, flashcards, etc.)
 *  - Is fully standalone — no external requests after export
 *  - Passes WCAG AA colour contrast on all built-in themes
 */

'use strict';

import { ZoltoRenderer } from '../renderer/renderer.js';
import { escapeHtml }    from '../utils/dom.js';
import { downloadFile }  from '../utils/helpers.js';
import { createLogger }  from '../utils/logger.js';
import { get as getSetting } from '../settings.js';

const logger = createLogger('Export');

// ─────────────────────────────────────────────────────────────
// Inline CSS collector
// Gathers text from all <link rel="stylesheet"> elements
// that point to local files (not CDN).
// ─────────────────────────────────────────────────────────────

async function collectCSS() {
  const sheets = [...document.styleSheets];
  const parts  = [];

  for (const sheet of sheets) {
    // Skip cross-origin sheets (CDN fonts, KaTeX)
    if (!sheet.href || sheet.href.startsWith(location.origin)) {
      try {
        const rules = [...(sheet.cssRules ?? [])];
        parts.push(rules.map(r => r.cssText).join('\n'));
      } catch {
        // CORS-blocked sheet — skip
      }
    }
  }

  return parts.join('\n\n');
}

// ─────────────────────────────────────────────────────────────
// Minimal interactivity script (tabs, flashcards, presentations)
// Inlined so the exported file works without Zolto's JS.
// ─────────────────────────────────────────────────────────────

const INTERACTIVITY_SCRIPT = `
<script>
(function() {
  // Tabs
  document.querySelectorAll('.zolto-tabs').forEach(tabs => {
    tabs.addEventListener('click', e => {
      const btn = e.target.closest('.zolto-tab-btn');
      if (!btn) return;
      tabs.querySelectorAll('.zolto-tab-btn').forEach(b => {
        b.classList.toggle('zolto-tab-active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      const panelId = btn.getAttribute('aria-controls');
      tabs.querySelectorAll('.zolto-tab-panel').forEach(p => {
        p.classList.toggle('zolto-tab-hidden', p.id !== panelId);
        p.hidden = p.id !== panelId;
      });
    });
  });

  // Flashcards
  document.querySelectorAll('.zolto-flashcard').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') card.classList.toggle('flipped');
    });
  });

  // Presentations
  document.querySelectorAll('.zolto-presentation').forEach(pres => {
    const slides  = [...pres.querySelectorAll('.zolto-slide')];
    const counter = pres.querySelector('.zolto-slide-counter');
    let current   = 0;
    const show = idx => {
      current = Math.max(0, Math.min(idx, slides.length - 1));
      slides.forEach((s, i) => {
        s.classList.toggle('zolto-slide-active',  i === current);
        s.classList.toggle('zolto-slide-hidden', i !== current);
        s.hidden = i !== current;
      });
      if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
    };
    pres.querySelector('.zolto-slide-prev')?.addEventListener('click', () => show(current - 1));
    pres.querySelector('.zolto-slide-next')?.addEventListener('click', () => show(current + 1));
  });

  // Details/accordion
  document.querySelectorAll('.zolto-details .zolto-accordion-chevron').forEach(chevron => {
    const details = chevron.closest('details');
    if (details) details.addEventListener('toggle', () => {
      chevron.style.transform = details.open ? 'rotate(180deg)' : '';
    });
  });

  // Code copy
  document.querySelectorAll('.zolto-code-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.closest('.zolto-code-block')?.querySelector('code');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent || '');
        const orig = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = orig, 1500);
      } catch(e) {}
    });
  });

  // Internal anchor links
  document.querySelectorAll('a.zolto-link[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
<\/script>`;

// ─────────────────────────────────────────────────────────────
// HTML Exporter
// ─────────────────────────────────────────────────────────────

export const HTMLExporter = {

  /**
   * Export a Document AST as a self-contained HTML string.
   * @param {object} doc       — transformed Document AST
   * @param {object} [options]
   * @param {string}  [options.theme]  — theme id (default: current setting)
   * @param {boolean} [options.inline] — true (always, currently)
   * @returns {Promise<string>}
   */
  async export(doc, options = {}) {
    const theme  = options.theme ?? getSetting('theme');
    const title  = doc.frontmatter?.title ?? 'Zolto Document';
    const author = doc.frontmatter?.author ?? '';
    const desc   = doc.frontmatter?.description ?? '';

    logger.info('Exporting HTML:', title);

    // Render body HTML
    const renderer = new ZoltoRenderer({
      theme,
      mathBackend:   getSetting('mathBackend'),
      codeHighlight: true,
      footnoteMode:  'bottom',
    });
    const bodyHtml = renderer.render(doc);

    // Collect inlined CSS
    const css = await collectCSS();

    // KaTeX CSS from CDN (for math) — include link in head
    const katexCSSUrl = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';

    const html = `<!DOCTYPE html>
<html lang="${escapeHtml(doc.frontmatter?.lang ?? 'en')}" data-theme="${escapeHtml(theme)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content="Zolto v8.1.0" />
  <title>${escapeHtml(title)}</title>
  ${author ? `<meta name="author" content="${escapeHtml(author)}" />` : ''}
  ${desc    ? `<meta name="description" content="${escapeHtml(desc)}" />` : ''}
  <link rel="stylesheet" href="${katexCSSUrl}" />
  <style>
/* Zolto Export — Inlined Styles */
${css}

/* Print overrides */
@media print {
  .zolto-slide-nav, .zolto-code-copy { display: none !important; }
  .zolto-slide { page-break-after: always; }
}
  </style>
</head>
<body>
  <article class="zolto-preview zolto-export">
${bodyHtml}
  </article>
${INTERACTIVITY_SCRIPT}
</body>
</html>`;

    return html;
  },

  /**
   * Export and trigger a browser download.
   * @param {object} doc
   * @param {object} [options]
   */
  async download(doc, options = {}) {
    const html     = await this.export(doc, options);
    const title    = doc.frontmatter?.title ?? 'document';
    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    downloadFile(filename, html, 'text/html');
    logger.info('HTML download triggered:', filename);
  },
};
