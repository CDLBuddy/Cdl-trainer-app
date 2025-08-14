// src/navigation/navigation.js
// ======================================================================
// Central helpers for routing + nav across the app (React Router v6+)
// - Role normalization & detection
// - Dashboard helpers, safe navigation wrappers
// - Route builders (kept DRY)
// - Top/hidden nav link accessors (from navConfig) with safe fallbacks
// ======================================================================

import {
  // optional canonical helpers & registries (safe to be absent)
  normalizeRole as cfgNormalizeRole,
  roleFromPath,
  getDashboardRoute as cfgGetDashboardRoute,
  getTopNavForRole as cfgGetTopNavForRole,
  getHiddenRoutesForRole as cfgGetHiddenRoutesForRole,
} from './navConfig.js'

// ---------- role helpers -------------------------------------------------

/** Lowercase, trims, and falls back to "student" if unknown. */
export function normalizeRole(role) {
  try {
    return (cfgNormalizeRole?.(role) || String(role || 'student')).trim().toLowerCase()
  } catch {
    return 'student'
  }
}

/** Best-effort current role read (no React dependency). */
export function getCurrentRole() {
  try {
    const win = /** @type {any} */ (window)
    const fromSession =
      win?.__lastSession?.role ||
      win?.currentUserRole ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('userRole'))
    return normalizeRole(fromSession || 'student')
  } catch {
    return 'student'
  }
}

// ---------- small url helpers -------------------------------------------

export function toURL(input) {
  try { return new URL(input, window.location.href) }
  catch { return new URL(String(input || '/'), window.location.origin) }
}

export function withQuery(urlLike, params = {}) {
  const url = urlLike instanceof URL ? urlLike : toURL(urlLike)
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    url.searchParams.set(k, String(v))
  })
  return url
}

// ---------- dashboard helpers -------------------------------------------

export function getDashboardRoute(role) {
  const r = normalizeRole(role)
  return cfgGetDashboardRoute?.(r) ||
    (r === 'superadmin' ? '/superadmin/dashboard'
    : r === 'admin'      ? '/admin/dashboard'
    : r === 'instructor' ? '/instructor/dashboard'
    :                       '/student/dashboard')
}

/** Navigate to the dashboard of the given (or current) role. */
export function goToCurrentDashboard(navigate, roleOverride = null, options = { replace: true }) {
  const role = normalizeRole(roleOverride || getCurrentRole())
  safeNavigate(navigate, getDashboardRoute(role), options)
}

// ---------- safe navigation wrappers ------------------------------------

export function safeNavigate(navigate, to, options = {}) {
  try {
    if (typeof navigate === 'function') navigate(to, options)
    else window.location.assign(to)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[navigation] navigate failed:', err)
    try { window.location.assign(to) } catch { /* noop */ }
  }
}

/**
 * After login: honor `state.from` or `?from=...`, else go to dashboard.
 * Guards against bad/looping values (e.g., "/login" or absolute URLs).
 */
export function redirectAfterLogin(navigate, role, location) {
  const fromState = location?.state?.from?.pathname
  let fromQuery = null
  try { fromQuery = new URL(window.location.href).searchParams.get('from') } catch { /* ignore error */ }
  const candidate = fromState || fromQuery || ''
  const safe =
    typeof candidate === 'string' &&
    candidate.length > 0 &&
    !/^\/login(?:\/|$)/i.test(candidate) &&
    !/^https?:\/\//i.test(candidate)
  const dest = safe ? candidate : getDashboardRoute(role)
  safeNavigate(navigate, dest, { replace: true })
}

// ======================================================================
// Route builders (keep string paths DRY)
// ======================================================================

// ---- Student (updated for new folders: /student/profile & /student/walkthrough)
export const StudentRoutes = {
  dashboard:     () => '/student/dashboard',
  profile:       () => '/student/profile',            // NEW foldered page
  checklists:    () => '/student/checklists',
  practiceTests: () => '/student/practice-tests',
  testEngine:    (testName = '') => `/student/test-engine/${encodeURIComponent(testName)}`,
  testReview:    (testName = '') => `/student/test-review/${encodeURIComponent(testName)}`,
  testResults:   () => '/student/test-results',
  walkthrough:   () => '/student/walkthrough',        // NEW foldered page
  flashcards:    () => '/student/flashcards',
}

// ---- Instructor
export const InstructorRoutes = {
  dashboard:       () => '/instructor/dashboard',
  profile:         () => '/instructor/profile',
  checklistReview: () => '/instructor/checklist-review',
  studentProfile:  (studentId) => `/instructor/student-profile/${encodeURIComponent(studentId)}`,
}

// ---- Admin
export const AdminRoutes = {
  dashboard: () => '/admin/dashboard',
  profile:   () => '/admin/profile',
  users:     () => '/admin/users',
  companies: () => '/admin/companies',
  reports:   () => '/admin/reports',
}

// ---- Superadmin (now includes Walkthrough Manager)
export const SuperadminRoutes = {
  dashboard:    () => '/superadmin/dashboard',
  schools:      () => '/superadmin/schools',
  users:        () => '/superadmin/users',
  compliance:   () => '/superadmin/compliance',
  billing:      () => '/superadmin/billing',
  settings:     () => '/superadmin/settings',
  logs:         () => '/superadmin/logs',
  permissions:  () => '/superadmin/permissions',
  walkthroughs: () => '/superadmin/walkthroughs', // NEW – WalkthroughManager
}

// ---- Unified role-aware builders
export const RouteBuilders = {
  profile(role = getCurrentRole()) {
    switch (normalizeRole(role)) {
      case 'superadmin': return '/superadmin/profile'
      case 'admin':      return '/admin/profile'
      case 'instructor': return '/instructor/profile'
      case 'student':
      default:           return '/student/profile'
    }
  },

  // Student aliases
  studentDashboard:     StudentRoutes.dashboard,
  studentProfile:       StudentRoutes.profile,
  studentChecklists:    StudentRoutes.checklists,
  studentPracticeTests: StudentRoutes.practiceTests,
  studentTestEngine:    StudentRoutes.testEngine,
  studentTestReview:    StudentRoutes.testReview,
  studentTestResults:   StudentRoutes.testResults,
  studentWalkthrough:   StudentRoutes.walkthrough,
  studentFlashcards:    StudentRoutes.flashcards,

  // Instructor aliases
  instructorDashboard:      InstructorRoutes.dashboard,
  instructorProfile:        InstructorRoutes.profile,
  instructorChecklistReview:InstructorRoutes.checklistReview,
  instructorStudentProfile: InstructorRoutes.studentProfile,

  // Admin aliases
  adminDashboard:  AdminRoutes.dashboard,
  adminProfile:    AdminRoutes.profile,
  adminUsers:      AdminRoutes.users,
  adminCompanies:  AdminRoutes.companies,
  adminReports:    AdminRoutes.reports,

  // Superadmin aliases
  superadminDashboard:    SuperadminRoutes.dashboard,
  superadminSchools:      SuperadminRoutes.schools,
  superadminUsers:        SuperadminRoutes.users,
  superadminCompliance:   SuperadminRoutes.compliance,
  superadminBilling:      SuperadminRoutes.billing,
  superadminSettings:     SuperadminRoutes.settings,
  superadminLogs:         SuperadminRoutes.logs,
  superadminPermissions:  SuperadminRoutes.permissions,
  superadminWalkthroughs: SuperadminRoutes.walkthroughs, // NEW
}

// ======================================================================
// Nav links (Top nav + hidden/deep links) – sourced from navConfig.js
// If navConfig doesn’t provide them, we generate sensible defaults here.
// ======================================================================

export function getTopNavForRole(role) {
  return cfgGetTopNavForRole?.(normalizeRole(role)) || []
}

export function getHiddenRoutesForRole(role) {
  return cfgGetHiddenRoutesForRole?.(normalizeRole(role)) || []
}

/** Convenience: generated top-nav set if navConfig is absent. */
export function getNavLinksForRole(role) {
  const links = getTopNavForRole(role)
  if (Array.isArray(links) && links.length) return links

  switch (normalizeRole(role)) {
    case 'superadmin':
      return [
        { to: SuperadminRoutes.dashboard(),    label: 'Dashboard',   icon: '🏠', exact: true },
        { to: SuperadminRoutes.schools(),      label: 'Schools',     icon: '🏫' },
        { to: SuperadminRoutes.users(),        label: 'Users',       icon: '👥' },
        { to: SuperadminRoutes.compliance(),   label: 'Compliance',  icon: '🛡️' },
        { to: SuperadminRoutes.walkthroughs(), label: 'Walkthroughs',icon: '🧭' }, // NEW
        { to: SuperadminRoutes.billing(),      label: 'Billing',     icon: '💳' },
        { to: SuperadminRoutes.settings(),     label: 'Settings',    icon: '⚙️' },
        { to: SuperadminRoutes.logs(),         label: 'Logs',        icon: '📜' },
        { to: SuperadminRoutes.permissions(),  label: 'Permissions', icon: '🔐' },
      ]
    case 'admin':
      return [
        { to: AdminRoutes.dashboard(),  label: 'Dashboard', icon: '🏠', exact: true },
        { to: AdminRoutes.profile(),    label: 'Profile',   icon: '👤' },
        { to: AdminRoutes.users(),      label: 'Users',     icon: '👥' },
        { to: AdminRoutes.companies(),  label: 'Companies', icon: '🏢' },
        { to: AdminRoutes.reports(),    label: 'Reports',   icon: '📄' },
      ]
    case 'instructor':
      return [
        { to: InstructorRoutes.dashboard(),       label: 'Dashboard',        icon: '🏠', exact: true },
        { to: InstructorRoutes.profile(),         label: 'Profile',          icon: '👤' },
        { to: InstructorRoutes.checklistReview(), label: 'Checklist Review', icon: '✅' },
      ]
    case 'student':
    default:
      return [
        { to: StudentRoutes.dashboard(),     label: 'Dashboard',      icon: '🏠', exact: true },
        { to: StudentRoutes.profile(),       label: 'Profile',        icon: '👤' },   // NEW
        { to: StudentRoutes.checklists(),    label: 'Checklists',     icon: '📋' },
        { to: StudentRoutes.practiceTests(), label: 'Practice Tests', icon: '📝' },
        { to: StudentRoutes.walkthrough(),   label: 'Walkthrough',    icon: '🧭' },  // NEW
        { to: StudentRoutes.flashcards(),    label: 'Flashcards',     icon: '🗂️' },
      ]
  }
}