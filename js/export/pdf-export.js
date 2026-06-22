/**
 * js/export/pdf-export.js
 * Zolto v8.1.0 — PDF Exporter
 *
 * Produces a PDF via the browser's built-in print dialog.
 * This approach requires zero dependencies (no Puppeteer, no
 * server-side rendering) and produces the highest-fidelity
 * output because it uses the exact same renderer that draws
 * the preview pane.
 *
 * Strategy:
 *  1. Render the document to a standalone HTML string
 *     (same as html-export.js but with a print-optimised stylesheet)
 *  2. Open that HTML in a hidden <iframe>
 *  3. Call iframe.contentWindow.print()
 *  4. Remove the iframe after the print dialog closes
 *
 * The print stylesheet is injected inline. All print-specific
 * rules (page margins, slide page-breaks, no interactive chrome)
 * are defined here rather than in the shared CSS.
 *
 * For headless server-side PDF generation, the exported HTML
 * file can be passed to Puppeteer:
 *   await page.goto(`file://${htmlPath}`);
 *   await page.pdf({ format: 'A4', ... });
 */

'use strict';

import { ZoltoRenderer } from '../renderer/renderer.js';
import { escapeHtml }    from '../utils/dom.js';
import { createLogger }  from '../utils/logger.js';
import { get as getSetting } from '../settings.js';

const logger = createLogger('Export');

// ─────────────────────────────────────────────────────────────
// Print Stylesheet
// ─────────────────────────────────────────────────────────────

const PRINT_CSS = `
/* ── PDF / Print stylesheet — Zolto v8.1.0 ── */

/* Page setup */
@page {
  size: A4 portrait;
  margin: 2.5cm 2.5cm 2.5cm 2.5cm;
}

@page :first {
  margin-top: 3cm;
}

/* Reset */
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  padding: 0;
  font-family: "Inter Variable", system-ui, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #000;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Content container */
.zolto-preview {
  max-width: none;
  padding: 0;
  margin: 0;
}

/* Headings */
.zolto-h1 { font-size: 22pt; margin-top: 0; }
.zolto-h2 { font-size: 17pt; border-bottom: 1pt solid #ccc; padding-bottom: 4pt; }
.zolto-h3 { font-size: 14pt; }
.zolto-h4, .zolto-h5, .zolto-h6 { font-size: 11pt; }

/* Page breaks */
.zolto-h1, .zolto-h2 { page-break-before: auto; }
h2 + * { page-break-before: avoid; }

/* Avoid orphans */
p { orphans: 3; widows: 3; }

/* Code */
.zolto-code-block {
  background: #f8fafc;
  border: 1pt solid #e2e8f0;
  border-radius: 4pt;
  font-size: 9pt;
  page-break-inside: avoid;
}
.zolto-code { font-family: "JetBrains Mono", monospace; }

/* Tables */
.zolto-table {
  border-collapse: collapse;
  width: 100%;
  page-break-inside: auto;
}
.zolto-table th { background: #f1f5f9; border: 1pt solid #e2e8f0; }
.zolto-table td { border: 1pt solid #e2e8f0; }
tr { page-break-inside: avoid; page-break-after: auto; }
thead { display: table-header-group; }

/* Callouts */
.zolto-callout {
  border-left: 3pt solid #6366f1;
  background: #f8f9ff;
  padding: 8pt 12pt;
  page-break-inside: avoid;
}

/* Math */
.zolto-math-block {
  text-align: center;
  page-break-inside: avoid;
  padding: 8pt 0;
}

/* Images */
img { max-width: 100%; page-break-inside: avoid; }

/* Diagrams — scale to page width */
.zolto-diagram svg { max-width: 100%; height: auto; }

/* Presentations — each slide on its own page */
.zolto-slide {
  page-break-after: always;
  min-height: auto;
  padding: 2cm;
}
.zolto-slide:last-child { page-break-after: auto; }

/* Hide interactive chrome */
.zolto-slide-nav,
.zolto-code-copy,
.zolto-palette-overlay,
.zolto-toast-region,
.zolto-autocomplete,
.zolto-editor-pane,
.zolto-topbar,
.zolto-sidebar {
  display: none !important;
}

/* Footnotes */
.zolto-footnotes {
  border-top: 1pt solid #ccc;
  margin-top: 2cm;
  font-size: 9pt;
}

/* Links — show URL after text */
a.zolto-link[href^="http"]::after {
  content: " (" attr(href) ")";
  font-size: 8pt;
  color: #475569;
}

/* Cards — no hover effects */
.zolto-card { box-shadow: none; border: 1pt solid #e2e8f0; }

/* Card grid collapses to 1 column */
.zolto-card-group, .zolto-grid {
  display: block;
}
.zolto-card-group > *, .zolto-grid > * {
  display: block;
  margin-bottom: 8pt;
  break-inside: avoid;
}
`;

// ─────────────────────────────────────────────────────────────
// PDF Exporter
// ─────────────────────────────────────────────────────────────

export const PDFExporter = {

  /**
   * Export the document as PDF via the browser print dialog.
   * @param {object} doc       — transformed Document AST
   * @param {object} [options]
   * @param {string}  [options.paperSize] — 'A4' | 'Letter' (CSS @page)
   * @param {string}  [options.theme]     — theme override
   * @returns {Promise<void>}
   */
  async export(doc, options = {}) {
    const theme  = options.theme ?? getSetting('theme');
    const title  = doc.frontmatter?.title ?? 'Zolto Document';
    const author = doc.frontmatter?.author ?? '';

    logger.info('Exporting PDF:', title);

    // Render body HTML
    const renderer = new ZoltoRenderer({
      theme,
      mathBackend:   getSetting('mathBackend'),
      codeHighlight: false,     // use plain code for printing
      footnoteMode:  'bottom',
    });
    const bodyHtml = renderer.render(doc);

    // Collect inline CSS from current page (base + component + theme tokens)
    const css = await _collectCSS();

    const katexCSSUrl = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';

    // Build the print HTML document
    const printHtml = `<!DOCTYPE html>
<html lang="${escapeHtml(doc.frontmatter?.lang ?? 'en')}" data-theme="${escapeHtml(theme)}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  ${author ? `<meta name="author" content="${escapeHtml(author)}" />` : ''}
  <link rel="stylesheet" href="${katexCSSUrl}" />
  <style>
${css}
${PRINT_CSS}
  </style>
</head>
<body>
  <article class="zolto-preview zolto-print">${bodyHtml}</article>
</body>
</html>`;

    return new Promise((resolve) => {
      // Create hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) {
        logger.error('Cannot access iframe document for PDF export');
        iframe.remove();
        resolve();
        return;
      }

      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      // Wait for iframe content to load (fonts, KaTeX CSS)
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          // Remove iframe after print dialog is acknowledged
          // (afterprint fires on some browsers, fallback timeout on others)
          const cleanup = () => { iframe.remove(); resolve(); };
          iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
          setTimeout(cleanup, 30_000); // 30s absolute fallback
        }, 800); // Allow KaTeX and fonts to finish rendering
      };
    });
  },

  /**
   * For server-side use: return the print-ready HTML string.
   * Pass to Puppeteer: await page.setContent(html); await page.pdf(...)
   * @param {object} doc
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async getHTML(doc, options = {}) {
    const theme    = options.theme ?? getSetting('theme');
    const renderer = new ZoltoRenderer({ theme, codeHighlight: false, footnoteMode: 'bottom' });
    const bodyHtml = renderer.render(doc);
    const css      = await _collectCSS();
    const title    = doc.frontmatter?.title ?? 'Zolto Document';

    return `<!DOCTYPE html>
<html lang="en" data-theme="${escapeHtml(theme)}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <style>${css}${PRINT_CSS}</style>
</head>
<body><article class="zolto-preview">${bodyHtml}</article></body>
</html>`;
  },
};

// ─────────────────────────────────────────────────────────────
// CSS Collector
// ─────────────────────────────────────────────────────────────

async function _collectCSS() {
  const parts = [];
  for (const sheet of document.styleSheets) {
    if (!sheet.href || sheet.href.startsWith(location.origin)) {
      try {
        parts.push([...(sheet.cssRules ?? [])].map(r => r.cssText).join('\n'));
      } catch { /* CORS-blocked */ }
    }
  }
  return parts.join('\n\n');
}
