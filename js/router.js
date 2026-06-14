/**
 * js/router.js
 * Zolto v8.1.0 — Client-Side Hash Router
 *
 * Hash-based SPA router — no server-side routing required.
 * index.html is the only entry point; all navigation is via
 * the URL fragment (#/path).
 *
 * Routes:
 *   #/            → home   (recent documents)
 *   #/new         → editor (blank document)
 *   #/doc/:id     → editor (open document by id)
 *   #/settings    → settings page
 *   #/plugins     → plugin manager
 *
 * Route transitions swap the `data-view` attribute on <main>
 * and update `data-route` on <html>. No JS DOM insertion.
 */

'use strict';

import { createLogger }            from './utils/logger.js';
import { bus, EVENTS }             from './utils/events.js';
import { get as stateGet,
         set as setState,
         patch, batch }            from './state.js';

const logger = createLogger('Router');

// ─────────────────────────────────────────────────────────────
// 1. Route Definitions
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} Route
 * @property {string}   path      — hash path pattern (e.g. '/doc/:id')
 * @property {string}   view      — data-view value to activate
 * @property {string}   title     — document.title suffix
 * @property {Function} [enter]   — async hook called on route enter
 * @property {Function} [leave]   — hook called on route leave
 */

/** @type {Route[]} */
const ROUTES = [
  {
    path:  '/',
    view:  'home',
    title: 'Home',
    enter: async () => {
      logger.debug('Route: home');
    },
  },
  {
    path:  '/new',
    view:  'editor',
    title: 'New Document',
    enter: async () => {
      logger.debug('Route: new');
      const { openDocument } = await import('./state.js');
      openDocument({ source: '' });
    },
  },
  {
    path:  '/doc/:id',
    view:  'editor',
    title: 'Document',
    enter: async (params) => {
      logger.debug('Route: doc', params.id);
      const { load }         = await import('./storage.js');
      const { openDocument } = await import('./state.js');
      const doc = await load(params.id);
      if (doc) {
        openDocument({ id: doc.id, source: doc.source, meta: doc.meta ?? {} });
      } else {
        logger.warn('Document not found:', params.id);
        navigate('/');
      }
    },
  },
  {
    path:  '/settings',
    view:  'settings',
    title: 'Settings',
    enter: async () => {
      logger.debug('Route: settings');
    },
  },
  {
    path:  '/plugins',
    view:  'plugins',
    title: 'Plugins',
    enter: async () => {
      logger.debug('Route: plugins');
    },
  },
];

// ─────────────────────────────────────────────────────────────
// 2. Internal State
// ─────────────────────────────────────────────────────────────

/** @type {Route | null} */
let _currentRoute = null;

/** @type {Record<string, string>} */
let _currentParams = {};

/** @type {string} */
let _currentPath = '/';

/** Whether the router has been initialised. */
let _ready = false;

// ─────────────────────────────────────────────────────────────
// 3. Path Matching
// ─────────────────────────────────────────────────────────────

/**
 * Parse a hash string to a clean path.
 * '#/doc/abc' → '/doc/abc'
 * '' → '/'
 * @param {string} hash
 * @returns {string}
 */
function hashToPath(hash) {
  const path = hash.replace(/^#/, '') || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Match a path against a route pattern.
 * Returns extracted params or null if no match.
 * @param {string} pattern  — e.g. '/doc/:id'
 * @param {string} path     — e.g. '/doc/abc123'
 * @returns {Record<string, string> | null}
 */
function matchRoute(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts    = path.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const seg = patternParts[i];
    if (seg.startsWith(':')) {
      params[seg.slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (seg !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

/**
 * Find the matching route and params for a given path.
 * @param {string} path
 * @returns {{ route: Route, params: Record<string, string> } | null}
 */
function resolve(path) {
  // Normalise trailing slash
  const normalised = path === '/' ? '/' : path.replace(/\/$/, '');

  for (const route of ROUTES) {
    const params = matchRoute(route.path, normalised);
    if (params !== null) return { route, params };
  }
  return null;
}


// ─────────────────────────────────────────────────────────────
// 4. View Switching
// ─────────────────────────────────────────────────────────────

/**
 * Activate a view by swapping data-view classes on child views of <main>.
 * @param {string} view  — matches [data-view] attribute
 */
function activateView(view) {
  const main  = document.getElementById('zolto-main');
  if (!main) return;

  // Hide all views
  for (const el of main.querySelectorAll('[data-view]')) {
    el.classList.remove('zolto-view-active');
    if (el instanceof HTMLElement) el.hidden = true;
  }

  // Show target view
  const target = main.querySelector(`[data-view="${view}"]`);
  if (target) {
    target.classList.add('zolto-view-active');
    if (target instanceof HTMLElement) target.hidden = false;
  } else {
    logger.warn(`View not found: "${view}"`);
  }

  // Update data-route on <html> for CSS targeting
  document.documentElement.setAttribute('data-route', view);
}


// ─────────────────────────────────────────────────────────────
// 5. Route Execution
// ─────────────────────────────────────────────────────────────

/**
 * Execute a route transition.
 * @param {string} path
 */
async function go(path) {
  if (path === _currentPath && _ready) return;

  const match = resolve(path);

  if (!match) {
    logger.warn('No route matched for path:', path, '— falling back to /');
    return go('/');
  }

  const { route, params } = match;

  // Call leave hook on previous route
  if (_currentRoute?.leave) {
    try { _currentRoute.leave(_currentParams); } catch (e) {
      logger.error('Route leave hook error', e);
    }
  }

  // Update internal state
  const prevPath   = _currentPath;
  _currentPath     = path;
  _currentRoute    = route;
  _currentParams   = params;

  // Activate view
  activateView(route.view);

  // Update document title
  document.title = route.title !== 'Home'
    ? `${route.title} — Zolto`
    : 'Zolto';

  // Sync to global state
  batch(() => {
    setState('previewMode', stateGet('settings')?.previewMode ?? 'live');
  });

  // Call enter hook
  if (route.enter) {
    try {
      await route.enter(params);
    } catch (e) {
      logger.error('Route enter hook error', e);
    }
  }

  logger.debug(`Route: ${prevPath} → ${path}`, params);

  // Emit on event bus
  bus.emit(EVENTS.ROUTE_CHANGE, { path, view: route.view, params, prev: prevPath });
}


// ─────────────────────────────────────────────────────────────
// 6. Public Navigation API
// ─────────────────────────────────────────────────────────────

/**
 * Navigate to a path by updating the hash.
 * @param {string} path  — e.g. '/doc/abc123', '/settings'
 */
export function navigate(path) {
  const hash = path.startsWith('#') ? path : `#${path}`;
  window.location.hash = hash;
}

/**
 * Navigate to a specific document.
 * @param {string} id
 */
export const openDoc = (id) => navigate(`/doc/${id}`);

/**
 * Navigate to a new blank document.
 */
export const newDoc = () => navigate('/new');

/**
 * Navigate back (browser history).
 */
export const back = () => window.history.back();

/**
 * Navigate forward (browser history).
 */
export const forward = () => window.history.forward();

/**
 * Replace the current history entry without adding a new one.
 * @param {string} path
 */
export function replace(path) {
  const hash = path.startsWith('#') ? path : `#${path}`;
  window.location.replace(hash);
}

/**
 * Get the current route path.
 * @returns {string}
 */
export const currentPath = () => _currentPath;

/**
 * Get the current route params.
 * @returns {Record<string, string>}
 */
export const currentParams = () => ({ ..._currentParams });

/**
 * Get the current route view name.
 * @returns {string | null}
 */
export const currentView = () => _currentRoute?.view ?? null;


// ─────────────────────────────────────────────────────────────
// 7. Route Guards
// ─────────────────────────────────────────────────────────────

/** @type {Array<(path: string, params: Record<string,string>) => boolean | string>} */
const _guards = [];

/**
 * Register a route guard.
 * Guard receives (path, params) and should return:
 *   - true  → allow navigation
 *   - false → block navigation (stay on current route)
 *   - string → redirect to this path instead
 *
 * @param {(path: string, params: Record<string,string>) => boolean | string} guard
 * @returns {() => void} unregister function
 */
export function addGuard(guard) {
  _guards.push(guard);
  return () => {
    const i = _guards.indexOf(guard);
    if (i >= 0) _guards.splice(i, 1);
  };
}

/**
 * Run all registered guards for a navigation.
 * Returns the final allowed path (or null to block).
 * @param {string}                   path
 * @param {Record<string, string>}   params
 * @returns {string | null}
 */
function runGuards(path, params) {
  for (const guard of _guards) {
    const result = guard(path, params);
    if (result === false) return null;
    if (typeof result === 'string') return result;
  }
  return path;
}


// ─────────────────────────────────────────────────────────────
// 8. hashchange Handler
// ─────────────────────────────────────────────────────────────

async function onHashChange() {
  const path  = hashToPath(window.location.hash);
  const match = resolve(path);

  if (!match) {
    await go(path);
    return;
  }

  const { params } = match;
  const allowed    = runGuards(path, params);

  if (allowed === null) {
    // Restore previous hash silently
    window.location.replace(`#${_currentPath}`);
    return;
  }

  await go(allowed === path ? path : allowed);
}


// ─────────────────────────────────────────────────────────────
// 9. Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Initialise the router.
 * Registers the hashchange listener and processes the initial URL.
 * Call once during app bootstrap (app.js).
 */
export function initRouter() {
  window.addEventListener('hashchange', onHashChange);

  // Handle initial URL
  const initialPath = hashToPath(window.location.hash);
  go(initialPath).then(() => {
    _ready = true;
    logger.info('Router initialised at', initialPath);
  });
}

/**
 * Tear down the router (used in tests).
 */
export function destroyRouter() {
  window.removeEventListener('hashchange', onHashChange);
  _currentRoute  = null;
  _currentParams = {};
  _currentPath   = '/';
  _ready         = false;
}
