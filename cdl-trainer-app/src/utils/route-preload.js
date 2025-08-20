// src/utils/route-preload.js
// ======================================================================
// Route Preloading Utilities
// - Delegates to role preload modules (student/instructor/admin/superadmin)
// - Best effort (idempotent, network-aware, idle-friendly)
// - Falls back to direct dynamic imports if a role's preload module is absent
// - Provides back-compat aliases for older call sites
// ======================================================================

/** In-memory guard so we don't import the same chunk repeatedly */
const _preloadCache = new Set();

/** Debug gate (silent in prod) */
function _debug(...args) {
   
  if (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[route-preload]', ...args);
  }
}

/** Wrap a task so it runs only once per key (even if scheduled multiple times) */
async function _once(key, loader) {
  if (_preloadCache.has(key)) return;
  _preloadCache.add(key);
  try {
    _debug('start', key);
    await loader();
    _debug('done', key);
  } catch (err) {
    // Non-fatal: preloading is best-effort
     
    if (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) {
      console.warn(`[route-preload] Failed to preload "${key}":`, err);
    }
  }
}

/** Detect slow or data-saver connections; skip aggressive preloads if so */
function isConstrainedNetwork() {
  try {
    if (typeof navigator === 'undefined') return false;
    const c =
      navigator.connection ||
      // @ts-ignore legacy
      navigator.mozConnection ||
      // @ts-ignore legacy
      navigator.webkitConnection;
    if (!c) return false;
    if (c.saveData === true) return true; // respect Data Saver
    const type = String(c.effectiveType || '');
    return /\b(slow-2g|2g|3g)\b/i.test(type);
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------------
   Idle scheduler with de-dupe: each key schedules at most once.
------------------------------------------------------------------------ */
const _idleHandles = new Map();

function _requestIdleCallback(cb, { timeout = 1200 } = {}) {
  if (typeof window === 'undefined') return null;
  // @ts-ignore - not all DOM libs include requestIdleCallback
  if (typeof window.requestIdleCallback === 'function') {
    // @ts-ignore
    return window.requestIdleCallback(cb, { timeout });
  }
  return setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), timeout);
}

function _cancelIdleCallback(handle) {
  if (!handle) return;
  if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    // @ts-ignore
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

/** Schedule an idle task at most once per key */
function scheduleIdleOnce(key, fn, { timeout = 1200 } = {}) {
  if (_idleHandles.has(key)) return;
  const handle = _requestIdleCallback(async () => {
    try {
      await fn();
    } finally {
      _idleHandles.delete(key);
    }
  }, { timeout });
  _idleHandles.set(key, handle);
}

/* ======================================================================
   Public pages
   ====================================================================== */

export async function preloadPublicRoutes() {
  await Promise.allSettled([
    _once('page:welcome',  () => import('@pages/Welcome.jsx')),
    _once('page:login',    () => import('@pages/Login.jsx')),
    _once('page:signup',   () => import('@pages/Signup.jsx')),
    _once('page:notfound', () => import('@pages/NotFound.jsx')),
  ]);
}

/* ======================================================================
   Role routers (shells)
   ====================================================================== */

export async function preloadAllRoleRouters() {
  await Promise.allSettled([
    _once('router:student',    () => import('@student/StudentRouter.jsx')),
    _once('router:instructor', () => import('@instructor/InstructorRouter.jsx')),
    _once('router:admin',      () => import('@admin/AdminRouter.jsx')),
    _once('router:superadmin', () => import('@superadmin/SuperadminRouter.jsx')),
  ]);
}

/* ======================================================================
   Role-specific preloading (delegated to role preload modules)
   ====================================================================== */

async function _loadStudentPreload()    { try { return await import('@student/preload.js'); } catch { return null; } }
async function _loadInstructorPreload() { try { return await import('@instructor/preload.js'); } catch { return null; } }
async function _loadAdminPreload()      { try { return await import('@admin/preload.js'); } catch { return null; } }
async function _loadSuperPreload()      { try { return await import('@superadmin/preload.js'); } catch { return null; } }

/** Fallback core-page warmers if a role preload module is missing */
async function _fallbackCorePages(role) {
  switch (role) {
    case 'student':
      await Promise.allSettled([
        _once('student:dashboard',   () => import('@student/StudentDashboard.jsx')),
        _once('student:profile',     () => import('@student/profile/Profile.jsx')),
        _once('student:checks',      () => import('@student/Checklists.jsx')),
        _once('student:practice',    () => import('@student/PracticeTests.jsx')),
        _once('student:walk',        () => import('@student/walkthrough/Walkthrough.jsx')),
        _once('student:flash',       () => import('@student/Flashcards.jsx')),
        _once('student:testEngine',  () => import('@student-components/TestEngineWrapper.jsx')),
        _once('student:testReview',  () => import('@student-components/TestReviewWrapper.jsx')),
        _once('student:testResults', () => import('@student-components/TestResultsWrapper.jsx')),
      ]);
      break;

    case 'instructor':
      await Promise.allSettled([
        _once('instructor:dashboard', () => import('@instructor/InstructorDashboard.jsx')),
        _once('instructor:profile',   () => import('@instructor/InstructorProfile.jsx')),
        _once('instructor:review',    () => import('@instructor/ChecklistReviewForInstructor.jsx')),
        _once('instructor:student',   () => import('@instructor/StudentProfileForInstructor.jsx')),
      ]);
      break;

    case 'admin':
      await Promise.allSettled([
        _once('admin:dashboard',   () => import('@admin/dashboard/AdminDashboard.jsx')),
        _once('admin:companies',   () => import('@admin/companies/AdminCompanies.jsx')),
        _once('admin:companyShow', () => import('@admin/companies/CompanyDetail.jsx')),
        _once('admin:reports',     () => import('@/admin/reports/AdminReports.jsx')),
        _once('admin:billing',     () => import('@admin/billing/Billing.jsx')),
        _once('admin:settings',    () => import('@admin/settings/AdminSettings.jsx')),
        _once('admin:walkthroughs',() => import('@admin/walkthroughs/WalkthroughManager.jsx')),
      ]);
      break;

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
      ]);
      break;

    default:
      break;
  }
}

/**
 * Preload routers + “above the fold” pages for a role (recommended).
 * @param {'student'|'instructor'|'admin'|'superadmin'} roleInput
 */
export async function preloadRoutesForRole(roleInput) {
  if (!roleInput) return;
  const role = String(roleInput).toLowerCase();

  // Warm the router shell first
  switch (role) {
    case 'student':
      await _once('router:student',    () => import('@student/StudentRouter.jsx')); break;
    case 'instructor':
      await _once('router:instructor', () => import('@instructor/InstructorRouter.jsx')); break;
    case 'admin':
      await _once('router:admin',      () => import('@admin/AdminRouter.jsx')); break;
    case 'superadmin':
      await _once('router:superadmin', () => import('@superadmin/SuperadminRouter.jsx')); break;
    default:
      return;
  }

  if (isConstrainedNetwork()) return;

  // Try the role preload module, else fallback
  let api = null;
  if (role === 'student')         api = await _loadStudentPreload();
  else if (role === 'instructor') api = await _loadInstructorPreload();
  else if (role === 'admin')      api = await _loadAdminPreload();
  else if (role === 'superadmin') api = await _loadSuperPreload();

  if (api?.preloadAboveTheFold) {
    await _once(`preload:aot:${role}`, () => api.preloadAboveTheFold());
  } else {
    await _once(`preload:aot:${role}`, () => _fallbackCorePages(role));
  }
}

/** Preload *all* pages for a role (heavier than above-the-fold) */
export async function preloadAllForRole(roleInput) {
  if (!roleInput) return;
  const role = String(roleInput).toLowerCase();

  let api = null;
  if (role === 'student')         api = await _loadStudentPreload();
  else if (role === 'instructor') api = await _loadInstructorPreload();
  else if (role === 'admin')      api = await _loadAdminPreload();
  else if (role === 'superadmin') api = await _loadSuperPreload();

  if (api?.preloadAll) {
    await _once(`preload:all:${role}`, () => api.preloadAll());
    return;
  }

  await preloadRoutesForRole(role);
  await _once(`preload:all-fallback:${role}`, () => _fallbackCorePages(role));
}

/** Targeted route-level preload (delegates to role preload module) */
export async function preloadRoleRoute(roleInput, routeName) {
  const role = String(roleInput || '').toLowerCase();
  if (!role || !routeName) return;

  let api = null;
  if (role === 'student')         api = await _loadStudentPreload();
  else if (role === 'instructor') api = await _loadInstructorPreload();
  else if (role === 'admin')      api = await _loadAdminPreload();
  else if (role === 'superadmin') api = await _loadSuperPreload();

  if (api?.preloadRoute) {
    await _once(`preload:route:${role}:${routeName}`, () => api.preloadRoute(routeName));
  }
}

/* ======================================================================
   Session / Path-aware warming
   ====================================================================== */

export function warmRoutesOnSession({ loading, isLoggedIn, role }) {
  scheduleIdleOnce('idle:public', () => preloadPublicRoutes());

  if (!loading && isLoggedIn && role && !isConstrainedNetwork()) {
    scheduleIdleOnce(`idle:role:${String(role).toLowerCase()}`, () =>
      preloadRoutesForRole(role)
    );
  }
}

/**
 * Preload based on a concrete path (best-effort heuristic).
 * Useful when you only know a URL (e.g., guard/redirect code).
 */
export function preloadByPath(path = '') {
  const p = String(path).toLowerCase();
  if (/^\/student\//.test(p))   return preloadRoutesForRole('student');
  if (/^\/instructor\//.test(p))return preloadRoutesForRole('instructor');
  if (/^\/admin\//.test(p))     return preloadRoutesForRole('admin');
  if (/^\/superadmin\//.test(p))return preloadRoutesForRole('superadmin');
  return preloadPublicRoutes();
}

/* ======================================================================
   Back-compat aliases (older call sites)
   ====================================================================== */
export const preloadForRole    = preloadRoutesForRole;
export const prefetchRoleRoute = preloadRoleRoute;

/* ======================================================================
   Test helpers (optional)
   ====================================================================== */
export function __resetPreloadCacheForTests() {
  _preloadCache.clear();
  for (const h of _idleHandles.values()) _cancelIdleCallback(h);
  _idleHandles.clear();
}

/** Cancel all queued idle preloads (useful for teardown) */
export function cancelAllScheduledPreloads() {
  for (const h of _idleHandles.values()) _cancelIdleCallback(h);
  _idleHandles.clear();
}