// src/utils/route-preload.js
// ======================================================================
// Route Preloading Utilities
// - Delegates to role preload modules (student/instructor/admin/superadmin)
// - Best effort (idempotent, network-aware, idle-friendly)
// - Falls back to direct dynamic imports if a role's preload module is absent
// ======================================================================

/** In-memory guard so we don't import the same chunk repeatedly */
const _preloadCache = new Set()

/** Wrap a task so it runs only once per key */
async function _once(key, loader) {
  if (_preloadCache.has(key)) return
  _preloadCache.add(key)
  try {
    await loader()
  } catch (err) {
    // Non-fatal: preloading is best-effort
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[route-preload] Failed to preload "${key}":`, err)
    }
  }
}

/** Detect slow or data-saver connections; skip aggressive preloads if so */
function isConstrainedNetwork() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!c) return false
    if (c.saveData === true) return true // respect Data Saver
    const type = c.effectiveType || ''
    return /(^|\b)(slow-2g|2g|3g)\b/.test(type)
  } catch {
    return false
  }
}

/** Run a task when the browser is idle (fallback to timeout) */
export function onIdle(fn, { timeout = 1200 } = {}) {
  if (typeof window === 'undefined') return // SSR/Tests
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(fn, { timeout })
  } else {
    setTimeout(fn, timeout)
  }
}

/* ======================================================================
   Public pages
   ====================================================================== */

/** Preload the lazy public pages (welcome/login/signup/404) */
export async function preloadPublicRoutes() {
  await Promise.allSettled([
    _once('page:welcome',  () => import('@pages/Welcome.jsx')),
    _once('page:login',    () => import('@pages/Login.jsx')),
    _once('page:signup',   () => import('@pages/Signup.jsx')),
    _once('page:notfound', () => import('@pages/NotFound.jsx')),
  ])
}

/* ======================================================================
   Role routers (shells)
   ====================================================================== */

/** Preload all role routers (heavy; prefer role-targeted preload) */
export async function preloadAllRoleRouters() {
  await Promise.allSettled([
    _once('router:student',    () => import('@student/StudentRouter.jsx')),
    _once('router:instructor', () => import('@instructor/InstructorRouter.jsx')),
    _once('router:admin',      () => import('@admin/AdminRouter.jsx')),
    _once('router:superadmin', () => import('@superadmin/SuperadminRouter.jsx')),
  ])
}

/* ======================================================================
   Role-specific preloading (delegated to role preload modules)
   ====================================================================== */

// Safe dynamic imports of role preload modules
async function _loadStudentPreload()   { try { return await import('@student/preload.js') } catch { return null } }
async function _loadInstructorPreload() { try { return await import('@instructor/preload.js') } catch { return null } }
async function _loadAdminPreload()      { try { return await import('@admin/preload.js') } catch { return null } }
async function _loadSuperPreload()      { try { return await import('@superadmin/preload.js') } catch { return null } }

/** Fallback core-page warmers if a role preload module is missing */
async function _fallbackCorePages(role) {
  switch (role) {
    case 'student':
      await Promise.allSettled([
        _once('student:dashboard', () => import('@student/StudentDashboard.jsx')),
        _once('student:profile',   () => import('@student/profile/Profile.jsx')),
        _once('student:checks',    () => import('@student/Checklists.jsx')),
        _once('student:practice',  () => import('@student/PracticeTests.jsx')),
        _once('student:walk',      () => import('@student/walkthrough/Walkthrough.jsx')),
        _once('student:flash',     () => import('@student/Flashcards.jsx')),
        _once('student:testEngine',  () => import('@student-components/TestEngineWrapper.jsx')),
        _once('student:testReview',  () => import('@student-components/TestReviewWrapper.jsx')),
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
        _once('sa:dashboard',  () => import('@superadmin/SuperAdminDashboard.jsx')),
        _once('sa:schools',    () => import('@superadmin/SchoolManagement.jsx')),
        _once('sa:users',      () => import('@superadmin/UserManagement.jsx')),
        _once('sa:compliance', () => import('@superadmin/ComplianceCenter.jsx')),
        _once('sa:settings',   () => import('@superadmin/Settings.jsx')),
        _once('sa:logs',       () => import('@superadmin/Logs.jsx')),
        _once('sa:perms',      () => import('@superadmin/Permissions.jsx')),
        _once('sa:billing',    () => import('@superadmin/Billings.jsx')),
      ])
      break
  }
}

/**
 * Preload routers + “above the fold” pages for a role (recommended).
 * - Uses role preload module if available (preloadAboveTheFold)
 * - Falls back to direct imports if not
 */
export async function preloadRoutesForRole(roleInput) {
  if (!roleInput) return
  const role = String(roleInput).toLowerCase()

  // Always warm the router shell first
  switch (role) {
    case 'student':
      await _once('router:student',    () => import('@student/StudentRouter.jsx')); break
    case 'instructor':
      await _once('router:instructor', () => import('@instructor/InstructorRouter.jsx')); break
    case 'admin':
      await _once('router:admin',      () => import('@admin/AdminRouter.jsx')); break
    case 'superadmin':
      await _once('router:superadmin', () => import('@superadmin/SuperadminRouter.jsx')); break
    default:
      return // unknown role
  }

  if (isConstrainedNetwork()) return

  // Try the role preload module
  let api = null
  if (role === 'student')      api = await _loadStudentPreload()
  else if (role === 'instructor') api = await _loadInstructorPreload()
  else if (role === 'admin')      api = await _loadAdminPreload()
  else if (role === 'superadmin') api = await _loadSuperPreload()

  if (api?.preloadAboveTheFold) {
    await _once(`preload:aot:${role}`, () => api.preloadAboveTheFold())
  } else {
    // Fallback
    await _once(`preload:aot:${role}`, () => _fallbackCorePages(role))
  }
}

/** Preload *all* pages for a role (heavier than above-the-fold) */
export async function preloadAllForRole(roleInput) {
  if (!roleInput) return
  const role = String(roleInput).toLowerCase()

  // Load the module if present
  let api = null
  if (role === 'student')      api = await _loadStudentPreload()
  else if (role === 'instructor') api = await _loadInstructorPreload()
  else if (role === 'admin')      api = await _loadAdminPreload()
  else if (role === 'superadmin') api = await _loadSuperPreload()

  if (api?.preloadAll) {
    await _once(`preload:all:${role}`, () => api.preloadAll())
    return
  }

  // Fallback: warm the router, then core pages
  await preloadRoutesForRole(role)
  await _once(`preload:all-fallback:${role}`, () => _fallbackCorePages(role))
}

/** Targeted route-level preload (delegates to role preload module) */
export async function preloadRoleRoute(roleInput, routeName) {
  const role = String(roleInput || '').toLowerCase()
  if (!role || !routeName) return

  let api = null
  if (role === 'student')      api = await _loadStudentPreload()
  else if (role === 'instructor') api = await _loadInstructorPreload()
  else if (role === 'admin')      api = await _loadAdminPreload()
  else if (role === 'superadmin') api = await _loadSuperPreload()

  if (api?.preloadRoute) {
    await _once(`preload:route:${role}:${routeName}`, () => api.preloadRoute(routeName))
  }
}

/* ======================================================================
   Session-aware warming
   ====================================================================== */

/**
 * Smart preloader: warms public routes immediately, then (if network is not
 * constrained) warms the role router + above-the-fold pages once we know the role.
 */
export function warmRoutesOnSession({ loading, isLoggedIn, role }) {
  onIdle(() => preloadPublicRoutes())

  if (!loading && isLoggedIn && role && !isConstrainedNetwork()) {
    onIdle(() => preloadRoutesForRole(role))
  }
}

/* ======================================================================
   Test helpers (optional)
   ====================================================================== */

export function __resetPreloadCacheForTests() {
  _preloadCache.clear()
}