/**
 * js/components/chart.js
 * Zolto v8.1.0 — Chart Component
 *
 * Renders data visualisations for <chart> elements using Chart.js.
 *
 * The renderer outputs a placeholder:
 *   <div class="zolto-chart zolto-chart--{type}"
 *        data-type="{type}" data-raw="{escaped csv}" data-options="{json}">
 *     <canvas class="zolto-chart-canvas" aria-label="{title}"></canvas>
 *   </div>
 *
 * This module hydrates those placeholders with live Chart.js instances.
 *
 * Supported chart types:
 *   bar, line, area, pie, doughnut, scatter, bubble, radar, polar
 *
 * Data format (raw CSV inside the tag body):
 *   Label, Series1, Series2
 *   Jan,   100,     200
 *   Feb,   150,     180
 *
 * Or single-series shorthand:
 *   Jan, 100
 *   Feb, 150
 */

'use strict';

// Chart.js is loaded as a UMD global via the CDN <script> tag in index.html.
// This gives us window.Chart without any bundler or importmap requirement.
const Chart = window.Chart;
import { createLogger }    from '../utils/logger.js';
import { bus, EVENTS }     from '../utils/events.js';
import { $$ }              from '../utils/dom.js';

const logger = createLogger('Chart');

// ─────────────────────────────────────────────────────────────
// 1. Constants
// ─────────────────────────────────────────────────────────────

const SEL_CHART  = '.zolto-chart';
const SEL_CANVAS = '.zolto-chart-canvas';

// Palette pulled from CSS accent tokens (fallback HEX values)
const PALETTE = Object.freeze([
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16',
  '#f97316', '#14b8a6',
]);

// ─────────────────────────────────────────────────────────────
// 2. Instance Registry
// ─────────────────────────────────────────────────────────────

/** @type {WeakMap<HTMLCanvasElement, Chart>} */
const _chartInstances = new WeakMap();
const _cleanupMap     = new WeakMap();

// ─────────────────────────────────────────────────────────────
// 3. Public API
// ─────────────────────────────────────────────────────────────

/**
 * Render all charts within `root`.
 * Destroys and re-creates existing Chart.js instances.
 * @param {HTMLElement} root
 */
export function init(root) {
  destroy(root);

  const cleanups = [];

  _renderAll(root);

  const _unRender = bus.on(EVENTS.RENDER_DONE, () => {
    destroy(root);
    _renderAll(root);
  });
  cleanups.push(_unRender);

  _cleanupMap.set(root, cleanups);
  logger.debug('Chart component initialised');
}

/**
 * @param {HTMLElement} root
 */
export function destroy(root) {
  // Destroy all Chart.js instances within root
  $$(SEL_CANVAS, root).forEach(canvas => {
    const instance = _chartInstances.get(/** @type {HTMLCanvasElement} */ (canvas));
    if (instance) {
      instance.destroy();
      _chartInstances.delete(/** @type {HTMLCanvasElement} */ (canvas));
    }
  });

  const cleanups = _cleanupMap.get(root);
  if (cleanups) {
    cleanups.forEach(fn => fn?.());
    _cleanupMap.delete(root);
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Rendering
// ─────────────────────────────────────────────────────────────

function _renderAll(root) {
  $$(SEL_CHART, root).forEach(chartEl => {
    try {
      _renderOne(chartEl);
    } catch (err) {
      logger.error('Chart render error:', err);
      _showError(chartEl, err.message);
    }
  });
}

/**
 * @param {HTMLElement} chartEl
 */
function _renderOne(chartEl) {
  const canvas = /** @type {HTMLCanvasElement} */ (chartEl.querySelector(SEL_CANVAS));
  if (!canvas) return;

  // Destroy existing instance if present
  const existing = _chartInstances.get(canvas);
  if (existing) { existing.destroy(); _chartInstances.delete(canvas); }

  const type    = chartEl.dataset.type    ?? 'bar';
  const rawData = chartEl.dataset.raw     ?? '';
  const rawOpts = chartEl.dataset.options ?? '{}';

  /** @type {Record<string, unknown>} */
  let opts = {};
  try { opts = JSON.parse(rawOpts); } catch { /* ignore */ }

  const parsed   = _parseCSV(rawData);
  const chartCfg = _buildConfig(type, parsed, opts);
  const instance = new Chart(canvas, chartCfg);

  _chartInstances.set(canvas, instance);
  logger.debug(`Chart rendered: type=${type}, series=${parsed.datasets.length}`);
}

// ─────────────────────────────────────────────────────────────
// 5. CSV Parsing
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {{ labels: string[], datasets: { label: string, data: number[] }[] }} ParsedData
 */

/**
 * Parse CSV-like chart data.
 * First row: header (labels for each series if >2 cols, else ignored)
 * First col: category labels
 * Remaining cols: numeric data per series
 *
 * @param {string} raw
 * @returns {ParsedData}
 */
function _parseCSV(raw) {
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  if (!lines.length) return { labels: [], datasets: [] };

  const rows = lines.map(l =>
    l.split(/[,|]/).map(cell => cell.trim())
  );

  // Detect if first row is a header (non-numeric first value)
  const firstRow   = rows[0];
  const hasHeader  = rows.length > 1 && isNaN(Number(firstRow[1] ?? ''));
  const headerRow  = hasHeader ? rows[0]  : null;
  const dataRows   = hasHeader ? rows.slice(1) : rows;

  const labels  = dataRows.map(r => r[0] ?? '');
  const numCols = Math.max(...dataRows.map(r => r.length - 1));

  const datasets = [];
  for (let col = 1; col <= numCols; col++) {
    datasets.push({
      label: headerRow?.[col] ?? (numCols > 1 ? `Series ${col}` : ''),
      data:  dataRows.map(r => {
        const v = parseFloat(r[col] ?? '');
        return isNaN(v) ? 0 : v;
      }),
    });
  }

  return { labels, datasets };
}

// ─────────────────────────────────────────────────────────────
// 6. Config Builder
// ─────────────────────────────────────────────────────────────

/**
 * Build a Chart.js configuration from parsed data and options.
 * @param {string}                    type
 * @param {ParsedData}                parsed
 * @param {Record<string, unknown>}   opts
 * @returns {object}
 */
function _buildConfig(type, parsed, opts) {
  const isArea    = type === 'area';
  const chartType = isArea ? 'line' : type;

  // Assign colours per dataset
  const datasets = parsed.datasets.map((ds, i) => {
    const color     = PALETTE[i % PALETTE.length];
    const colorAlpha = color + '33'; // 20% opacity fill

    const base = {
      label:           ds.label,
      data:            ds.data,
      backgroundColor: _isCircular(type) ? parsed.datasets[0].data.map((_, j) => PALETTE[j % PALETTE.length] + 'cc') : colorAlpha,
      borderColor:     _isCircular(type) ? PALETTE.slice(0, parsed.datasets[0].data.length) : color,
      borderWidth:     2,
    };

    if (chartType === 'line') {
      base.fill          = isArea;
      base.tension       = opts.smooth ? 0.4 : 0;
      base.pointRadius   = 4;
      base.pointHoverRadius = 6;
    }

    if (type === 'scatter' || type === 'bubble') {
      // Scatter expects {x, y} objects
      base.data = ds.data.map((v, j) => ({ x: j, y: v }));
    }

    return base;
  });

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
              || document.documentElement.getAttribute('data-theme') === 'midnight'
              || document.documentElement.getAttribute('data-theme') === 'oled';

  const gridColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const labelColor = isDark ? '#a1a1aa' : '#71717a';

  return {
    type: chartType,
    data: {
      labels:   _isCircular(type) ? parsed.labels : parsed.labels,
      datasets,
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      animation:           { duration: _reducedMotion() ? 0 : 600 },
      plugins: {
        legend: {
          display:  datasets.length > 1 || _isCircular(type),
          position: 'bottom',
          labels:   { color: labelColor, boxWidth: 12, padding: 16 },
        },
        title: {
          display: !!opts.title,
          text:    String(opts.title ?? ''),
          color:   labelColor,
          padding: { bottom: 12 },
        },
        tooltip: {
          mode:      'index',
          intersect: false,
        },
      },
      scales: _isCircular(type) ? {} : {
        x: {
          grid:  { color: gridColor },
          ticks: { color: labelColor },
        },
        y: {
          grid:    { color: gridColor },
          ticks:   { color: labelColor },
          beginAtZero: true,
        },
      },
    },
  };
}

function _isCircular(type) {
  return type === 'pie' || type === 'doughnut' || type === 'polar';
}

function _reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─────────────────────────────────────────────────────────────
// 7. Error Display
// ─────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} chartEl
 * @param {string}      message
 */
function _showError(chartEl, message) {
  const canvas = chartEl.querySelector(SEL_CANVAS);
  if (canvas) canvas.hidden = true;

  let errEl = chartEl.querySelector('.zolto-chart-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'zolto-chart-error';
    chartEl.appendChild(errEl);
  }

  errEl.textContent = `Chart error: ${message}`;
}
