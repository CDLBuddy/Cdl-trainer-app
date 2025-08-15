// src/utils/route-preload.js
// ======================================================================
// Route Preloading Utilities
// - Preload lazy route chunks proactively (role routers, public pages)
// - Idempotent (cached), network-aware, and idle-friendly
// - Alias-safe (matches your Vite + ESLint alias map)
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

/** Detect slow or data-saver connections; skip aggressive preloads if so */
function isConstrainedNetwork() {
  try {
    const c =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection
    if (!c) return false
    if (c.saveData === true) return true // respect Data Saver
    const type = c.effectiveType || ''
    return /(^|\b)(slow-2g|2g|3g)\b/.test(type)
  } catch {
    return false
  }
}

/** Run the preload when the browser is idle (fallback to timeout) */
export function onIdle(fn, { timeout = 1200 } = {}) {
  if (typeof window === 'undefined') return // SSR/Tests
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(fn, { timeout })
  } else {
    setTimeout(fn, timeout)
  }
}

/** Preload the lazy public pages (login/signup/welcome/404) */
export async function preloadPublicRoutes() {
  await Promise.allSettled([
    _once('page:welcome', () => import('@pages/Welcome.jsx')),
    _once('page:login', () => import('@pages/Login.jsx')),
    _once('page:signup', () => import('@pages/Signup.jsx')),
    _once('page:notfound', () => import('@pages/NotFound.jsx')),
  ])
}

/** Preload all role routers (heavy; prefer role-targeted preload) */
export async function preloadAllRoleRouters() {
  await Promise.allSettled([
    _once('router:student', () => import('@student/StudentRouter.jsx')),
    _once('router:instructor', () => import('@instructor/InstructorRouter.jsx')),
    _once('router:admin', () => import('@admin/AdminRouter.jsx')),
    _once('router:superadmin', () => import('@superadmin/SuperadminRouter.jsx')),
  ])
}

/** (Optional) Warm common pages inside a role after the router shell */
async function _preloadRoleCorePages(role) {
  switch (role) {
    case 'student':
      await Promise.allSettled([
        _once('student:dashboard', () => import('@student/StudentDashboard.jsx')),
        _once('student:profile',   () => import('@student/profile/Profile.jsx')),
        _once('student:checks',    () => import('@student/Checklists.jsx')),
        _once('student:practice',  () => import('@student/PracticeTests.jsx')),
        _once('student:walk',      () => import('@student/walkthrough/Walkthrough.jsx')),
        _once('student:flash',     () => import('@student/Flashcards.jsx')),
        // Wrappers used in test flow
        _once('student:testEngine', () => import('@student-components/TestEngineWrapper.jsx')),
        _once('student:testReview', () => import('@student-components/TestReviewWrapper.jsx')),
        _once('student:testResults', () => import('@student-components/TestResultsWrapper.jsx')),
      ])
      break

    case 'instructor':
      await Promise.allSettled([
        _once('instructor:dashboard', () => import('@instructor/InstructorDashboard.jsx')),
        _once('instructor:profile',   () => import('@instructor/InstructorProfile.jsx')),
        _once('instructor:review',    () => import('@instructor/ChecklistReviewForInstructor.jsx')),
      ])
      break

    case 'admin':
      await Promise.allSettled([
        _once('admin:dashboard', () => import('@admin/AdminDashboard.jsx')),
        _once('admin:users',     () => import('@admin/AdminUsers.jsx')),
        _once('admin:companies', () => import('@admin/AdminCompanies.jsx')),
        _once('admin:reports',   () => import('@admin/AdminReports.jsx')),
      ])
      break

    case 'superadmin':
      await Promise.allSettled([
        _once('sa:dashboard', () => import('@superadmin/SuperAdminDashboard.jsx')),
        _once('sa:schools',   () => import('@superadmin/SchoolManagement.jsx')),
        _once('sa:users',     () => import('@superadmin/UserManagement.jsx')),
        _once('sa:compliance',() => import('@superadmin/ComplianceCenter.jsx')).catch(() => {}),
        _once('sa:settings',  () => import('@superadmin/Settings.jsx')).catch(() => {}),
        _once('sa:logs',      () => import('@superadmin/Logs.jsx')).catch(() => {}),
        _once('sa:perms',     () => import('@superadmin/Permissions.jsx')).catch(() => {}),
        _once('sa:billing',   () => import('@superadmin/Billing.jsx')).catch(() => {}),
      ])
      break
  }
}

/** Preload routers for a specific role (recommended) */
export async function preloadRoutesForRole(roleInput) {
  if (!roleInput) return
  const role = String(roleInput).toLowerCase()

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
      return // unknown role
  }

  // Warm a few core pages (skip on constrained networks)
  if (!isConstrainedNetwork()) {
    await _preloadRoleCorePages(role)
  }
}

/**
 * Smart preloader: warms public routes immediately, then (if network is not constrained)
 * warms the role router once we know the role. Call this from your session bridge.
 */
export function warmRoutesOnSession({ loading, isLoggedIn, role }) {
  onIdle(() => preloadPublicRoutes())

  if (!loading && isLoggedIn && role && !isConstrainedNetwork()) {
    onIdle(() => preloadRoutesForRole(role))
  }
}