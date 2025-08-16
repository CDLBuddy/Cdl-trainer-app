// ======================================================================
// Superadmin — route preloader (pure; no JSX)
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
export function isReducedMotion() {
  return prefersReducedMotion()
}

// Skip aggressive warms on slow/Data Saver connections
function isConstrainedNetwork() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!c) return false
    if (c.saveData === true) return true
    return /(^| )(slow-2g|2g|3g)( |$)/.test(c.effectiveType || '')
  } catch { return false }
}
export { isConstrainedNetwork } // optionally useful to callers

// ---- Lazy entries (alias-safe; mirrors vite/eslint config) --------------
const entries = {
  dashboard:    () => import('@superadmin/SuperAdminDashboard.jsx'),
  schools:      () => import('@superadmin/SchoolManagement.jsx'),
  users:        () => import('@superadmin/UserManagement.jsx'),
  compliance:   () => import('@superadmin/ComplianceCenter.jsx'),
  billing:      () => import('@superadmin/Billings.jsx'),
  settings:     () => import('@superadmin/Settings.jsx'),
  logs:         () => import('@superadmin/Logs.jsx'),
  permissions:  () => import('@superadmin/Permissions.jsx'),
  walkthroughs: () => import('@superadmin/WalkthroughManager.jsx'),

  // New: Superadmin Walkthrough Review (loaded via barrel)
  'walkthroughs-review-queue': () =>
    import('@superadmin/walkthroughs').then(m => ({ default: m.SAReviewQueue })),
  'walkthroughs-review-detail': () =>
    import('@superadmin/walkthroughs').then(m => ({ default: m.SAReviewDetail })),
}

// ---- Public API: above-the-fold (light set) -----------------------------
export async function preloadAboveTheFold() {
  if (typeof window === 'undefined') return
  await Promise.allSettled([
    _once('sa:dashboard',  entries.dashboard),
    _once('sa:schools',    entries.schools),
    _once('sa:users',      entries.users),
    _once('sa:compliance', entries.compliance),
  ])
}

// ---- Public API: full warm (everything superadmin) ---------------------
export async function preloadAll() {
  if (typeof window === 'undefined') return
  await Promise.allSettled(
    Object.entries(entries).map(([k, loader]) => _once(`sa:${k}`, loader))
  )
}

// ---- Public API: targeted warm by logical key --------------------------
/** @param {'dashboard'|'schools'|'users'|'compliance'|'billing'|'settings'|'logs'|'permissions'|'walkthroughs'|'walkthroughs-review-queue'|'walkthroughs-review-detail'|string} name */
export async function preloadRoute(name) {
  if (typeof window === 'undefined') return
  const key = String(name)
  const loader = entries[key]
  if (loader) await _once(`sa:${key}`, loader)
}

// ---- Back-compat exports (keep existing calls working) -----------------
export async function preloadSuperadminDashboard()   { return _once('sa:dashboard',  entries.dashboard) }
export async function preloadSuperadminSchools()     { return _once('sa:schools',    entries.schools) }
export async function preloadSuperadminUsers()       { return _once('sa:users',      entries.users) }
export async function preloadSuperadminCompliance()  { return _once('sa:compliance', entries.compliance) }
export async function preloadSuperadminBilling()     { return _once('sa:billing',    entries.billing) }
export async function preloadSuperadminSettings()    { return _once('sa:settings',   entries.settings) }
export async function preloadSuperadminLogs()        { return _once('sa:logs',       entries.logs) }
export async function preloadSuperadminPermissions() { return _once('sa:permissions',entries.permissions) }
export async function preloadSuperadminWalkthroughs(){ return _once('sa:walkthroughs',entries.walkthroughs) }

// New back-compat style helpers for review pages (optional)
export async function preloadSAReviewQueue()  { return _once('sa:walkthroughs-review-queue',  entries['walkthroughs-review-queue']) }
export async function preloadSAReviewDetail() { return _once('sa:walkthroughs-review-detail', entries['walkthroughs-review-detail']) }

export async function preloadSuperadminCore() { return preloadAboveTheFold() }
export async function preloadSuperadminOps()  {
  await Promise.allSettled([
    _once('sa:settings',   entries.settings),
    _once('sa:logs',       entries.logs),
    _once('sa:permissions',entries.permissions),
    _once('sa:billing',    entries.billing),
  ])
}
export async function preloadSuperadminAll()  { return preloadAll() }

// For convenience if something imports default from this file
export default preloadAboveTheFold

// ======================================================================
// Convenience helpers (idle / hover / path-based) — idempotent, safe
// ======================================================================

/** Warm the core screens at browser idle time (returns cancel fn). */
export function warmSuperadminOnIdle(timeout = 1200) {
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
export function preloadSuperadminOnHover(elOrGetter) {
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
      el.removeEventListener('pointerenter', handler)
      el.removeEventListener('focus', handler, true)
    } catch { /* noop */ }
  }
  return cleanup
}

/** Preload a specific screen by URL path (useful in guards/redirects). */
export function prefetchSuperadminByPath(path = '') {
  const p = String(path || '').toLowerCase()
  if (p.includes('/superadmin/schools'))                 return entries.schools()
  if (p.includes('/superadmin/users'))                   return entries.users()
  if (p.includes('/superadmin/compliance'))              return entries.compliance()
  if (p.includes('/superadmin/settings'))                return entries.settings()
  if (p.includes('/superadmin/logs'))                    return entries.logs()
  if (p.includes('/superadmin/permissions'))             return entries.permissions()
  if (p.includes('/superadmin/billing'))                 return entries.billing()
  if (p.includes('/superadmin/walkthroughs/review/'))    return entries['walkthroughs-review-detail']()
  if (p.includes('/superadmin/walkthroughs/review'))     return entries['walkthroughs-review-queue']()
  if (p.includes('/superadmin/walkthroughs'))            return entries.walkthroughs()
  return entries.dashboard()
}

// Optional: eager warm after router shell loads (skip on slow networks)
export async function warmSuperadminAfterShell() {
  if (isConstrainedNetwork()) return
  await preloadAboveTheFold()
}