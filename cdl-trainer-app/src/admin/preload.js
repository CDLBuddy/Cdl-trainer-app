// ======================================================================
// Admin preloader helpers
// - Call from nav hovers, idle callbacks, or route guards to warm chunks
// - Side-effect free until you call one of these functions
// ======================================================================

// Core screens your router actually uses
const chunks = {
  dashboard: () => import('./AdminDashboard.jsx'),
  profile:   () => import('./AdminProfile.jsx'),
  users:     () => import('./AdminUsers.jsx'),
  companies: () => import('./AdminCompanies.jsx'),
  reports:   () => import('./AdminReports.jsx'),
  // billing:   () => import('./AdminBilling.jsx'), // add when page exists
}

/** Preload only the core, most-hit screens. */
export async function preloadAdminCore() {
  await Promise.allSettled([
    chunks.dashboard(),
    chunks.users(),
  ])
}

/** Preload everything that currently exists under /admin. */
export async function preloadAdminAll() {
  await Promise.allSettled([
    chunks.dashboard(),
    chunks.profile(),
    chunks.users(),
    chunks.companies(),
    chunks.reports(),
    // chunks.billing?.(),
  ])
}

/** Old Router-style bulk preloader (handy if something calls this name). */
export async function preloadAdminRoutes() {
  return preloadAdminAll()
}

/**
 * Warm the core screens at browser idle time.
 * Use from app shell: warmAdminOnIdle()
 */
export function warmAdminOnIdle() {
  const ric = typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (fn) => setTimeout(fn, 150)

  ric(() => { void preloadAdminCore() })
}

/**
 * Attach hover/focus preloading to a link or a getter that returns a link.
 * Usage: preloadAdminOnHover(() => document.querySelector('a[href="/admin"]'))
 */
export function preloadAdminOnHover(elOrGetter) {
  const el = typeof elOrGetter === 'function' ? elOrGetter() : elOrGetter
  if (!el) return
  const on = () => { el.removeEventListener('mouseenter', on); el.removeEventListener('focusin', on); void preloadAdminCore() }
  el.addEventListener('mouseenter', on, { once: true })
  el.addEventListener('focusin', on, { once: true })
}

/**
 * Preload a specific screen by path (useful in route guards or redirects).
 * Example: prefetchAdminByPath('/admin/users')
 */
export function prefetchAdminByPath(path = '') {
  const p = String(path || '').toLowerCase()
  if (p.includes('/admin/users'))      return chunks.users()
  if (p.includes('/admin/companies'))  return chunks.companies()
  if (p.includes('/admin/reports'))    return chunks.reports()
  if (p.includes('/admin/profile'))    return chunks.profile()
  // if (p.includes('/admin/billing')) return chunks.billing?.()
  // default: dashboard
  return chunks.dashboard()
}