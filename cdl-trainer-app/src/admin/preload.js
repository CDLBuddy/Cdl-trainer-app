// Path: /src/admin/preload.js
// ======================================================================
// Admin — route preloader (pure; no JSX, SSR-safe, idempotent)
//   Public API
//     • preloadAboveTheFold()   → warm light/high-use screens
//     • preloadAll()            → warm everything in Admin
//     • preloadRoute(key)       → targeted warm by key (routes + overlays)
//   Back-compat aliases
//     • preloadAdminCore / preloadAdminAll / preloadAdminRoutes
//   Conveniences
//     • warmAdminOnIdle, preloadAdminOnHover, prefetchAdminByPath,
//       warmAdminAfterShell, preloadIfIdle, preloadOverlays
//   Notes
//     • All helpers are safe on SSR and polite on constrained networks
//     • Loads are memoized so repeated calls reuse the same Promise
// ======================================================================

// ---------- tiny SSR guard ---------------------------------------------------
export const hasWindow = () => typeof window !== 'undefined'

// ---------- polite environment checks ---------------------------------------
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
    return /\b(slow-2g|2g|3g)\b/i.test(String(c.effectiveType || ''))
  } catch {
    return false
  }
}

// ---------- memoized one-shot loader ----------------------------------------
// We store the Promise so concurrent callers await the same work.
const _cache = new Map()
function _memo(key, loader) {
  if (_cache.has(key)) return _cache.get(key)
  const p = (async () => {
    try {
      return await loader()
    } catch {
      /* ignore: best-effort warm */
    }
  })()
  _cache.set(key, p)
  return p
}

// ---------- lazy entries (single source of truth) ---------------------------
// Keep keys stable; external callers rely on them.
/** @type {const} */
const entries = {
  // Routes
  dashboard: () => import('@admin/dashboard/AdminDashboard.jsx'),
  profile: () => import('@admin/AdminProfile.jsx'),
  companies: () => import('@admin/companies/AdminCompanies.jsx'),
  // ⬇️ UPDATED PATH
  companyDetail: () =>
    import('@admin/companies/company-detail/CompanyDetail.jsx'), // /companies/:id
  communications: () => import('@admin/communications/AdminCommunications.jsx'),
  billing: () => import('@admin/billing/Billing.jsx'),
  settings: () => import('@admin/settings/AdminSettings.jsx'),
  walkthroughs: () =>
    import('@admin/walkthroughs/Manager/WalkthroughManager.jsx'),

  // Reports: warm the route chunk AND heavy services/bundles.
  reports: async () => {
    await import('@admin/reports/AdminReports.jsx')
    try {
      const { prefetchReports } = await import('@admin/reports')
      await prefetchReports?.()
    } catch {
      /* ignore: optional in some builds */
    }
  },

  // Non-route overlays/drawers worth pre-warming.
  addStudent: () => import('@admin/companies/add-student/AddStudentDrawer.jsx'),
  addCompany: () => import('@admin/companies/add-company/AddCompanyDrawer.jsx'),
  studentReportDrawer: async () => {
    try {
      await import('@admin/reports/student-reports/StudentReportsDrawer.jsx')
    } catch {
      /* optional feature */
    }
  },
}

export const ADMIN_ENTRY_KEYS =
  /** @type {readonly (keyof typeof entries)[]} */ (
    Object.freeze(Object.keys(entries))
  )
/** @typedef {keyof typeof entries} AdminEntryKey */

// ---------- public API: above-the-fold (light/core) -------------------------
export async function preloadAboveTheFold() {
  if (!hasWindow()) return
  await Promise.allSettled([
    _memo('admin:dashboard', entries.dashboard),
    _memo('admin:companies', entries.companies),
    // Add other high-traffic screens here if desired:
    // _memo('admin:communications', entries.communications),
  ])
}

// ---------- public API: full warm (all admin screens) -----------------------
export async function preloadAll() {
  if (!hasWindow()) return
  await Promise.allSettled(
    Object.entries(entries).map(([k, loader]) => _memo(`admin:${k}`, loader))
  )
}

// ---------- public API: targeted warm by key --------------------------------
/** @param {AdminEntryKey|string} name */
export async function preloadRoute(name) {
  if (!hasWindow()) return
  const key = /** @type {AdminEntryKey} */ (String(name))
  const loader = entries[key]
  if (typeof loader === 'function') await _memo(`admin:${key}`, loader)
}

// ---------- back-compat aliases ---------------------------------------------
export const preloadAdminCore = preloadAboveTheFold
export const preloadAdminAll = preloadAll
export async function preloadAdminRoutes() {
  return preloadAll()
}
export default preloadAboveTheFold

// ======================================================================
// Convenience helpers (idle / hover / path-based) — idempotent, safe
// ======================================================================

/**
 * Warm core screens at browser idle time (returns a cancel fn).
 * Skips on reduced-motion or constrained networks.
 */
export function warmAdminOnIdle(timeout = 1200) {
  if (!hasWindow() || isConstrainedNetwork() || prefersReducedMotion())
    return () => {}

  const run = () => {
    preloadAboveTheFold().catch(() => {})
  }

  // Prefer a true idle tick if available
  // @ts-ignore – not always in DOM libs
  if (typeof window.requestIdleCallback === 'function') {
    // @ts-ignore
    const id = window.requestIdleCallback(run, { timeout })
    return () => {
      // @ts-ignore
      if (typeof window.cancelIdleCallback === 'function')
        window.cancelIdleCallback(id)
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
    } catch {
      /* noop */
    }
  }
  return cleanup
}

/**
 * Preload a specific screen by path (useful inside guards/redirects).
 * Best-effort matching that resolves the most likely chunk.
 */
export function prefetchAdminByPath(path = '') {
  const p = String(path || '').toLowerCase()

  // Detail route warms both list + detail.
  if (p.includes('/admin/companies/')) {
    entries.companies()
    return entries.companyDetail()
  }
  if (p.includes('/admin/companies')) return entries.companies()
  if (p.includes('/admin/communications')) return entries.communications()
  if (p.includes('/admin/billing')) return entries.billing()
  if (p.includes('/admin/reports')) return entries.reports()
  if (p.includes('/admin/profile')) return entries.profile()
  if (p.includes('/admin/settings')) return entries.settings()
  if (p.includes('/admin/walkthroughs')) return entries.walkthroughs()
  return entries.dashboard()
}

/**
 * Optionally warm core screens shortly after the Admin shell mounts.
 * Skips on constrained networks and respects reduced-motion.
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
  if (!hasWindow()) return () => {}
  const loader = entries?.[key]
  if (typeof loader !== 'function') return () => {}

  // @ts-ignore
  if (typeof window.requestIdleCallback === 'function') {
    // @ts-ignore
    const id = window.requestIdleCallback(() => _memo(`admin:${key}`, loader), {
      timeout,
    })
    return () => window.cancelIdleCallback?.(id)
  }
  const t = setTimeout(
    () => _memo(`admin:${key}`, loader),
    Math.min(timeout, 1200)
  )
  return () => clearTimeout(t)
}

/**
 * Warm commonly-used non-route overlays/drawers.
 * Useful when users are likely to open them (e.g., on Companies mount).
 */
export async function preloadOverlays() {
  if (!hasWindow()) return
  await Promise.allSettled([
    _memo('admin:addStudent', entries.addStudent),
    _memo('admin:addCompany', entries.addCompany),
    _memo('admin:studentReportDrawer', entries.studentReportDrawer),
  ])
}
