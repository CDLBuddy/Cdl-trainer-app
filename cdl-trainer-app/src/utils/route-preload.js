// src/utils/route-preload.js
// ======================================================================
// Route Preloading Utilities
// - Preload lazy route chunks proactively (role routers, public pages)
// - Idempotent (cached), network-aware, and idle-friendly
// ======================================================================

/** Basic in-memory guard so we don't import the same chunk repeatedly */
const _preloadCache = new Set()

/** Wrap a dynamic import to ensure it's only executed once per key */
async function _once(key, loader) {
  if (_preloadCache.has(key)) return
  _preloadCache.add(key)
  try {
    await loader()
  } catch (err) {
    // Non-fatal: preloading is best-effort
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[route-preload] Failed to preload "${key}":`, err)
    }
  }
}

/** Detect "slow" connection types; skip aggressive preloads if so */
function isSlowNetwork() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!c || !c.effectiveType) return false
    // Treat 'slow-2g', '2g', and '3g' as slow (be conservative)
    return /(^|\b)(slow-2g|2g|3g)\b/.test(c.effectiveType)
  } catch {
    return false
  }
}

/** Run the preload when the browser is idle (fallback to timeout) */
export function onIdle(fn, { timeout = 1200 } = {}) {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(fn, { timeout })
  } else {
    setTimeout(fn, timeout)
  }
}

/** Preload the lazy public pages (login/signup/welcome/404) */
export async function preloadPublicRoutes() {
  await Promise.all([
    _once('page:welcome', () => import('@pages/Welcome.jsx')),
    _once('page:login', () => import('@pages/Login.jsx')),
    _once('page:signup', () => import('@pages/Signup.jsx')),
    _once('page:notfound', () => import('@pages/NotFound.jsx')),
  ])
}

/** Preload all role routers (heavy; prefer role-targeted preload) */
export async function preloadAllRoleRouters() {
  await Promise.all([
    _once('router:student', () => import('@student/StudentRouter.jsx')),
    _once('router:instructor', () => import('@instructor/InstructorRouter.jsx')),
    _once('router:admin', () => import('@admin/AdminRouter.jsx')),
    _once('router:superadmin', () => import('@superadmin/SuperadminRouter.jsx')),
  ])
}

/** Preload routers for a specific role (recommended) */
export async function preloadRoutesForRole(role) {
  if (!role) return
  switch (role) {
    case 'student':
      await _once('router:student', () => import('@student/StudentRouter.jsx'))
      break
    case 'instructor':
      await _once('router:instructor', () => import('@instructor/InstructorRouter.jsx'))
      break
    case 'admin':
      await _once('router:admin', () => import('@admin/AdminRouter.jsx'))
      break
    case 'superadmin':
      await _once('router:superadmin', () => import('@superadmin/SuperadminRouter.jsx'))
      break
    default:
      // unknown role: no-op
      break
  }
}

/**
 * Smart preloader: warms public routes immediately, then (if network is not slow)
 * warms the role router once we know the role. Call this from your session bridge.
 */
export function warmRoutesOnSession({ loading, isLoggedIn, role }) {
  // Always warm public pages quickly (idle)
  onIdle(() => preloadPublicRoutes())

  // If session is resolved and user is logged in, warm their role area (idle)
  if (!loading && isLoggedIn && role && !isSlowNetwork()) {
    onIdle(() => preloadRoutesForRole(role))
  }
}