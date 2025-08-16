// ======================================================================
// Admin — route preloader (pure; no JSX)
// - Standard API:
//     * preloadAboveTheFold()  → light, high-use screens
//     * preloadAll()           → everything in Admin area
//     * preloadRoute(key)      → targeted warm by key
// - Back-compat aliases: preloadAdminCore/preloadAdminAll/preloadAdminRoutes
// - Convenience: warmAdminOnIdle, preloadAdminOnHover, prefetchAdminByPath
// ======================================================================

// ---- one-shot guard so we don't import the same chunk repeatedly -------
const _onceKeys = new Set()
async function _once(key, loader) {
  if (_onceKeys.has(key)) return
  _onceKeys.add(key)
  try { await loader() } catch { /* non-fatal: best-effort */ }
}

// Respect reduced-motion users (be polite with aggressive preloads)
function prefersReducedMotion() {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch { return false }
}
export const isReducedMotion = prefersReducedMotion

// Skip aggressive warms on slow/Data Saver connections
function isConstrainedNetwork() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!c) return false
    if (c.saveData === true) return true
    return /(^| )(slow-2g|2g|3g)( |$)/.test(c.effectiveType || '')
  } catch { return false }
}

// ---- Lazy entries (alias-safe; mirrors vite/eslint config) --------------
const entries = {
  dashboard: () => import('@admin/AdminDashboard.jsx'),
  profile:   () => import('@admin/AdminProfile.jsx'),
  users:     () => import('@admin/AdminUsers.jsx'),
  companies: () => import('@admin/AdminCompanies.jsx'),
  reports:   () => import('@admin/AdminReports.jsx'),
  // billing: () => import('@admin/AdminBilling.jsx'), // add when page exists
}

// ---- Public API: above-the-fold (light set) -----------------------------
export async function preloadAboveTheFold() {
  if (typeof window === 'undefined') return
  await Promise.allSettled([
    _once('admin:dashboard', entries.dashboard),
    _once('admin:users',     entries.users),
  ])
}

// ---- Public API: full warm (everything admin) --------------------------
export async function preloadAll() {
  if (typeof window === 'undefined') return
  await Promise.allSettled(Object.entries(entries).map(([k, loader]) =>
    _once(`admin:${k}`, loader)
  ))
}

// ---- Public API: targeted warm by logical key --------------------------
/** @param {'dashboard'|'profile'|'users'|'companies'|'reports'|'billing'|string} name */
export async function preloadRoute(name) {
  if (typeof window === 'undefined') return
  const key = String(name)
  const loader = entries[key]
  if (loader) await _once(`admin:${key}`, loader)
}

// ---- Back-compat exports (keep old call sites working) -----------------
export const preloadAdminCore   = preloadAboveTheFold
export const preloadAdminAll    = preloadAll
export async function preloadAdminRoutes() { return preloadAll() }
export default preloadAboveTheFold

// ======================================================================
// Convenience helpers (idle / hover / path-based) — idempotent, safe
// ======================================================================

/** Warm the core screens at browser idle time (returns cancel fn). */
export function warmAdminOnIdle(timeout = 1200) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const run = () => { preloadAboveTheFold().catch(() => {}) }
  if ('requestIdleCallback' in window) {
    // @ts-ignore
    const id = window.requestIdleCallback(run, { timeout })
    return () => window.cancelIdleCallback?.(id)
  }
  const t = setTimeout(run, 200)
  return () => clearTimeout(t)
}

/** Attach one-shot hover/focus preloading to a link (returns cleanup). */
export function preloadAdminOnHover(elOrGetter) {
  if (typeof window === 'undefined') return () => {}

  const el = typeof elOrGetter === 'function' ? elOrGetter() : elOrGetter
  if (!el || typeof el.addEventListener !== 'function') return () => {}

  const handler = () => {
    preloadAboveTheFold().catch(() => {})
    cleanup()
  }

  el.addEventListener('pointerenter', handler, { once: true })
  el.addEventListener('focus', handler, { once: true, capture: true })

  function cleanup() {
    try {
      el.removeEventListener('pointerenter', handler, { capture: false })
      el.removeEventListener('focus', handler, { capture: true })
    } catch { /* noop */ }
  }
  return cleanup
}

/** Preload a specific screen by path (useful inside guards/redirects). */
export function prefetchAdminByPath(path = '') {
  const p = String(path || '').toLowerCase()
  if (p.includes('/admin/users'))      return entries.users()
  if (p.includes('/admin/companies'))  return entries.companies()
  if (p.includes('/admin/reports'))    return entries.reports()
  if (p.includes('/admin/profile'))    return entries.profile()
  // if (p.includes('/admin/billing'))  return entries.billing?.()
  return entries.dashboard()
}

// Optional: eager warm after router shell loads (skip on slow networks)
export async function warmAdminAfterShell() {
  if (isConstrainedNetwork()) return
  await preloadAboveTheFold()
}