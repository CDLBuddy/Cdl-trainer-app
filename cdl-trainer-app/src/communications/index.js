// src/communications/components/index.js
// ======================================================================
// Communications • Components (barrel)
// - Pure re-exports; no side effects (safe for SSR/tree-shaking)
// - Includes tiny dynamic loaders + optional preloads for React.lazy()
// - Keeps readable aliases where helpful
// ======================================================================

// --- Direct component exports -----------------------------------------
export { default as InboxBell } from './components/InboxBell.jsx'
export { default as InboxList } from './components/InboxList.jsx'

// Optional alias (same component)
export { default as Announcements } from './components/InboxList.jsx'

// --- Lazy loaders (use with React.lazy) -------------------------------
// Example:
//   const InboxList  = React.lazy(loadInboxList)
//   const InboxBell  = React.lazy(loadInboxBell)
//   // (optional) somewhere idle/hover: preloadInboxList()
export const loadInboxList = /* @__PURE__ */ () =>
  import('./components/InboxList.jsx')
export const loadInboxBell = /* @__PURE__ */ () =>
  import('./components/InboxBell.jsx')

// --- Optional: tiny preloads (best-effort; safe to call multiple times)
const _preloaded = { list: false, bell: false }

/** Warm the InboxList chunk without rendering it. */
export function preloadInboxList() {
  if (_preloaded.list) return
  _preloaded.list = true
  // Ignore errors: the route/component will still lazy-load when needed
  loadInboxList().catch(() => {})
}

/** Warm the InboxBell chunk without rendering it. */
export function preloadInboxBell() {
  if (_preloaded.bell) return
  _preloaded.bell = true
  loadInboxBell().catch(() => {})
}

/**
 * Convenience: attach one-shot hover/focus preloading to any element.
 * Usage:
 *   const cleanup = preloadOnHover(() => document.getElementById('inbox-link'), preloadInboxList)
 */
export function preloadOnHover(elOrGetter, preloadFn = preloadInboxList) {
  const el = typeof elOrGetter === 'function' ? elOrGetter() : elOrGetter
  if (!el || typeof el.addEventListener !== 'function') return () => {}

  const handler = () => {
    try {
      preloadFn()
    } finally {
      el.removeEventListener('pointerenter', handler)
      el.removeEventListener('focus', handler, { capture: true })
    }
  }
  el.addEventListener('pointerenter', handler, { once: true })
  el.addEventListener('focus', handler, { once: true, capture: true })
  return () => {
    try {
      el.removeEventListener('pointerenter', handler)
      el.removeEventListener('focus', handler, { capture: true })
    } catch {
      // intentionally ignored
    }
  }
}
