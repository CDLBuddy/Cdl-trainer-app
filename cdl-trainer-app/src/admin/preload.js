// src/admin/preload.js
// ======================================================================
// Admin — route preloader (pure; no JSX)
//   Standard API:
//     • preloadAboveTheFold()  → light, high-use screens
//     • preloadAll()           → everything in Admin area
//     • preloadRoute(key)      → targeted warm by key (routes + overlays)
//   Back-compat aliases:
//     • preloadAdminCore / preloadAdminAll / preloadAdminRoutes
//   Convenience:
//     • warmAdminOnIdle, preloadAdminOnHover, prefetchAdminByPath,
//       warmAdminAfterShell, preloadIfIdle, preloadOverlays
//   Notes:
//     • Idempotent: repeated calls don’t re-import the same chunk
//     • Safe on SSR: guards whenever touching window/document/navigator
// ======================================================================

// ---------- tiny SSR guards -------------------------------------------
const hasWindow   = () => typeof window !== 'undefined'

// ---------- one-shot helper (prevents duplicate loads) ----------------
const _onceKeys = new Set()
async function _once(key, loader) {
  if (_onceKeys.has(key)) return
  _onceKeys.add(key)
  try {
    await loader()
  } catch {
    // Best-effort only: ignore preload failures; lazy routes will still work.
  }
}

// ---------- polite environment checks ---------------------------------
export function prefersReducedMotion() {
  if (!hasWindow()) return false
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  } catch {
    return false
  }
}
export const isReducedMotion = prefersReducedMotion

export function isConstrainedNetwork() {
  if (!hasWindow()) return false
  try {
    const c =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection
    if (!c) return false
    if (c.saveData === true) return true
    const type = String(c.effectiveType || '')
    // Covers slow-2g, 2g, 3g
    return /\b(slow-2g|2g|3g)\b/i.test(type)
  } catch {
    return false
  }
}

// ---------- lazy entries (single source of truth) ---------------------
// Keep keys stable; other helpers rely on these names.
/** @type {Record<string, () => Promise<any>>} */
const entries = {
  // Routes
  dashboard:     () => import('@admin/dashboard/AdminDashboard.jsx'),
  profile:       () => import('@admin/AdminProfile.jsx'),
  companies:     () => import('@admin/companies/AdminCompanies.jsx'),
  companyDetail: () => import('@admin/companies/CompanyDetail.jsx'),   // /companies/:id
  reports:       () => import('@admin/reports/AdminReports.jsx'),
  billing:       () => import('@admin/billing/Billing.jsx'),
  walkthroughs:  () => import('@admin/walkthroughs/WalkthroughManager.jsx'),
  settings:      () => import('@admin/settings/AdminSettings.jsx'),
  communications:() => import('@admin/communications/AdminCommunications.jsx'),

  // Non-route overlays/drawers (still useful to warm)
  addStudent:    () => import('@admin/companies/add-student/AddStudentDrawer.jsx'),
  addCompany:    () => import('@admin/companies/add-company/AddCompanyDrawer.jsx'),
}

// Expose keys for type-safety in callers (JSDoc users get intellisense)
export const ADMIN_ENTRY_KEYS = /** @type {const} */ (Object.freeze(Object.keys(entries)))

// ---------- public API: above-the-fold (light/core) --------------------
export async function preloadAboveTheFold() {
  if (!hasWindow()) return
  await Promise.allSettled([
    _once('admin:dashboard', entries.dashboard),
    _once('admin:companies', entries.companies), // commonly visited after dashboard
    // Tip: if Communications is a high-traffic screen, add it here:
    // _once('admin:communications', entries.communications),
  ])
}

// ---------- public API: full warm (all admin screens) ------------------
export async function preloadAll() {
  if (!hasWindow()) return
  await Promise.allSettled(
    Object.entries(entries).map(([k, loader]) => _once(`admin:${k}`, loader))
  )
}

// ---------- public API: targeted warm by key ---------------------------
/**
 * @param {'dashboard'|'profile'|'companies'|'companyDetail'|'addStudent'|'addCompany'|'reports'|'billing'|'walkthroughs'|'settings'|'communications'|string} name
 */
export async function preloadRoute(name) {
  if (!hasWindow()) return
  const key = String(name)
  const loader = entries[key]
  if (typeof loader === 'function') {
    await _once(`admin:${key}`, loader)
  }
}

// ---------- back-compat aliases ---------------------------------------
export const preloadAdminCore   = preloadAboveTheFold
export const preloadAdminAll    = preloadAll
export async function preloadAdminRoutes() { return preloadAll() }
export default preloadAboveTheFold

// ======================================================================
// Convenience helpers (idle / hover / path-based) — idempotent, safe
// ======================================================================

/**
 * Warm the core screens at browser idle time (returns a cancel fn).
 * Uses requestIdleCallback where available; falls back to setTimeout.
 */
export function warmAdminOnIdle(timeout = 1200) {
  if (!hasWindow() || prefersReducedMotion()) return () => {}

  const run = () => { preloadAboveTheFold().catch(() => {}) }

  // Prefer a true idle tick if available
  // @ts-ignore - not all TS DOM libs include requestIdleCallback
  if (typeof window.requestIdleCallback === 'function') {
    // @ts-ignore
    const id = window.requestIdleCallback(run, { timeout })
    return () => {
      // @ts-ignore
      if (typeof window.cancelIdleCallback === 'function') {
        // @ts-ignore
        window.cancelIdleCallback(id)
      }
    }
  }

  const t = setTimeout(run, 200)
  return () => clearTimeout(t)
}

/**
 * Attach one-shot hover/focus preloading to a link or button (returns cleanup).
 * @param {HTMLElement|(() => HTMLElement|null)|null} elOrGetter
 */
export function preloadAdminOnHover(elOrGetter) {
  if (!hasWindow()) return () => {}

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
      el.removeEventListener('focus', handler, { capture: true })
    } catch { /* noop */ }
  }
  return cleanup
}

/**
 * Preload a specific screen by path (useful inside guards/redirects).
 * Best-effort pattern-matching — resolves the *most likely* chunk.
 */
export function prefetchAdminByPath(path = '') {
  const p = String(path || '').toLowerCase()
  // Detail route must warm list + detail
  if (p.includes('/admin/companies/')) {
    entries.companies()
    return entries.companyDetail()
  }
  if (p.includes('/admin/companies'))      return entries.companies()
  if (p.includes('/admin/communications')) return entries.communications()
  if (p.includes('/admin/billing'))        return entries.billing()
  if (p.includes('/admin/reports'))        return entries.reports()
  if (p.includes('/admin/profile'))        return entries.profile()
  if (p.includes('/admin/settings'))       return entries.settings()
  if (p.includes('/admin/walkthroughs'))   return entries.walkthroughs()
  return entries.dashboard()
}

/**
 * Optionally warm core screens shortly after the Admin shell mounts.
 * Skips on constrained networks (Data Saver / 2g/3g) and respects
 * reduced motion preference (be polite with background work).
 */
export async function warmAdminAfterShell() {
  if (isConstrainedNetwork() || prefersReducedMotion()) return
  await preloadAboveTheFold()
}

/**
 * One-off idle preloader for any entry key.
 * Example: preloadIfIdle('addCompany', 800)
 */
export function preloadIfIdle(key, timeout = 800) {
  if (!hasWindow()) return
  const loader = entries?.[key]
  if (typeof loader !== 'function') return

  // @ts-ignore
  if (typeof window.requestIdleCallback === 'function') {
    // @ts-ignore
    const id = window.requestIdleCallback(() => _once(`admin:${key}`, loader), { timeout })
    return () => window.cancelIdleCallback?.(id)
  }
  const t = setTimeout(() => _once(`admin:${key}`, loader), Math.min(timeout, 1200))
  return () => clearTimeout(t)
}

/**
 * Warm commonly-used non-route overlays/drawers.
 * Useful when you know a user is likely to open them (e.g., on Companies mount).
 */
export async function preloadOverlays() {
  if (!hasWindow()) return
  await Promise.allSettled([
    _once('admin:addStudent', entries.addStudent),
    _once('admin:addCompany', entries.addCompany),
  ])
}