// src/navigation/navigation.js
// ======================================================================
// Central helpers for routing + nav across the app (React Router v6+)
// - Role normalization & detection
// - Dashboard helpers, safe navigation wrappers
// - Route builders (kept DRY)
// - Top/hidden nav link accessors (from navConfig) with safe fallbacks
// - Pure module (no side effects) for SSR/tree-shaking friendliness
// ======================================================================

import {
  normalizeRole as cfgNormalizeRole,
  getDashboardRoute as cfgGetDashboardRoute,
  getTopNavForRole as cfgGetTopNavForRole,
  getHiddenRoutesForRole as cfgGetHiddenRoutesForRole,
} from './navConfig.js'

// ======================================================================
// Role helpers
// ======================================================================

/**
 * Lowercases, trims, and falls back to "student" if unknown.
 * Delegates to navConfig.normalizeRole when available.
 * @param {unknown} role
 * @returns {'student'|'instructor'|'admin'|'superadmin'}
 */
export function normalizeRole(role) {
  try {
    const v = (cfgNormalizeRole?.(role) ?? String(role ?? 'student'))
      .trim()
      .toLowerCase()
    return /** @type any */ (
      ['student', 'instructor', 'admin', 'superadmin'].includes(v) ? v : 'student'
    )
  } catch {
    return 'student'
  }
}

/**
 * Best-effort current role read (no React dependency).
 * Reads window globals and localStorage when available.
 * @returns {'student'|'instructor'|'admin'|'superadmin'}
 */
export function getCurrentRole() {
  try {
    const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {})
    const fromSession =
      win?.__lastSession?.role ||
      win?.currentUserRole ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('userRole'))
    return normalizeRole(fromSession || 'student')
  } catch {
    return 'student'
  }
}

/**
 * Infer a role segment from a pathname like "/student/...".
 * @param {string} path
 * @returns {'student'|'instructor'|'admin'|'superadmin'|null}
 */
export function roleFromPath(path = '') {
  const m = /^\/(student|instructor|admin|superadmin)(?:\/|$)/i.exec(String(path))
  return m ? /** @type any */ (m[1].toLowerCase()) : null
}

// ======================================================================
// Small URL helpers (defensive)
// ======================================================================

/** @param {string|URL} input */ export function toURL(input) {
  try {
    if (input instanceof URL) return input
    const base =
      typeof window !== 'undefined'
        ? window.location.href
        : 'http://localhost/'
    return new URL(String(input || '/'), base)
  } catch {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    return new URL('/', origin)
  }
}

/**
 * Append/replace query params on a URL-like value.
 * @template T extends Record<string, any>
 * @param {string|URL} urlLike
 * @param {T} params
 * @returns {URL}
 */
export function withQuery(urlLike, params = {}) {
  const url = urlLike instanceof URL ? urlLike : toURL(urlLike)
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return
    url.searchParams.set(k, String(v))
  })
  return url
}

// ======================================================================
// Dashboard helpers
// ======================================================================

/**
 * Map role to dashboard route. Delegates to navConfig when available.
 * @param {'student'|'instructor'|'admin'|'superadmin'|string} role
 * @returns {string}
 */
export function getDashboardRoute(role) {
  const r = normalizeRole(role)
  return (
    cfgGetDashboardRoute?.(r) ||
    (r === 'superadmin'
      ? '/superadmin/dashboard'
      : r === 'admin'
      ? '/admin/dashboard'
      : r === 'instructor'
      ? '/instructor/dashboard'
      : '/student/dashboard')
  )
}

/**
 * Navigate to the dashboard of the given (or current) role.
 * @param {(to:string, opts?:any)=>void} navigate
 * @param {string|null} [roleOverride]
 * @param {{ replace?: boolean }} [options]
 */
export function goToCurrentDashboard(
  navigate,
  roleOverride = null,
  options = { replace: true }
) {
  const role = normalizeRole(roleOverride || getCurrentRole())
  safeNavigate(navigate, getDashboardRoute(role), options)
}

// ======================================================================
// Safe navigation wrappers
// ======================================================================

/**
 * Wrapper around react-router navigate that falls back to hard navigation.
 * @param {(to:string, opts?:any)=>void|undefined} navigate
 * @param {string|URL} to
 * @param {any} [options]
 */
export function safeNavigate(navigate, to, options = {}) {
  const href = to instanceof URL ? to.href : String(to || '/')
  try {
    if (typeof navigate === 'function') navigate(href, options)
    else if (typeof window !== 'undefined') window.location.assign(href)
  } catch (err) {
     
    console.error('[navigation] navigate failed:', err)
    try {
      if (typeof window !== 'undefined') window.location.assign(href)
    } catch { /* noop */ }
  }
}

/**
 * After login: honor `state.from` or `?from=...`, else go to dashboard.
 * Guards against bad/looping values (e.g., "/login" or absolute URLs).
 * @param {(to:string, opts?:any)=>void} navigate
 * @param {'student'|'instructor'|'admin'|'superadmin'|string} role
 * @param {{state?: {from?: {pathname?: string}}}} [location]
 */
export function redirectAfterLogin(navigate, role, location) {
  const fromState = location?.state?.from?.pathname
  let fromQuery = null
  try {
    if (typeof window !== 'undefined') {
      fromQuery = new URL(window.location.href).searchParams.get('from')
    }
  } catch { /* ignore */ }

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

// ---- Student
export const StudentRoutes = {
  dashboard:     () => '/student/dashboard',
  profile:       () => '/student/profile',
  checklists:    () => '/student/checklists',
  practiceTests: () => '/student/practice-tests',
  testEngine:    (testName = '') => `/student/test-engine/${encodeURIComponent(testName)}`,
  testReview:    (testName = '') => `/student/test-review/${encodeURIComponent(testName)}`,
  testResults:   () => '/student/test-results',
  walkthrough:   () => '/student/walkthrough',
  flashcards:    () => '/student/flashcards',
}

// ---- Instructor
export const InstructorRoutes = {
  dashboard:       () => '/instructor/dashboard',
  profile:         () => '/instructor/profile',
  checklistReview: () => '/instructor/checklist-review',
  studentProfile:  (studentId) => `/instructor/student-profile/${encodeURIComponent(studentId)}`,
}

// ---- Admin (Users removed; companies own user mgmt)
export const AdminRoutes = {
  dashboard:     () => '/admin/dashboard',
  profile:       () => '/admin/profile',
  companies:     () => '/admin/companies',
  reports:       () => '/admin/reports',
  billing:       () => '/admin/billing',
  walkthroughs:  () => '/admin/walkthroughs',
  settings:      () => '/admin/settings',
}

// ---- Superadmin
export const SuperadminRoutes = {
  dashboard:    () => '/superadmin/dashboard',
  schools:      () => '/superadmin/schools',
  users:        () => '/superadmin/users',
  compliance:   () => '/superadmin/compliance',
  billing:      () => '/superadmin/billing',
  settings:     () => '/superadmin/settings',
  logs:         () => '/superadmin/logs',
  permissions:  () => '/superadmin/permissions',
  walkthroughs: () => '/superadmin/walkthroughs',
}

// ---- Unified role-aware builders
export const RouteBuilders = {
  /**
   * Role-aware profile route.
   * @param {'student'|'instructor'|'admin'|'superadmin'|string} role
   */
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
  instructorDashboard:       InstructorRoutes.dashboard,
  instructorProfile:         InstructorRoutes.profile,
  instructorChecklistReview: InstructorRoutes.checklistReview,
  instructorStudentProfile:  InstructorRoutes.studentProfile,

  // Admin aliases (users removed)
  adminDashboard:    AdminRoutes.dashboard,
  adminProfile:      AdminRoutes.profile,
  adminCompanies:    AdminRoutes.companies,
  adminReports:      AdminRoutes.reports,
  adminBilling:      AdminRoutes.billing,
  adminWalkthroughs: AdminRoutes.walkthroughs,
  adminSettings:     AdminRoutes.settings,

  // Superadmin aliases
  superadminDashboard:    SuperadminRoutes.dashboard,
  superadminSchools:      SuperadminRoutes.schools,
  superadminUsers:        SuperadminRoutes.users,
  superadminCompliance:   SuperadminRoutes.compliance,
  superadminBilling:      SuperadminRoutes.billing,
  superadminSettings:     SuperadminRoutes.settings,
  superadminLogs:         SuperadminRoutes.logs,
  superadminPermissions:  SuperadminRoutes.permissions,
  superadminWalkthroughs: SuperadminRoutes.walkthroughs,
}

// ======================================================================
// Nav links (top + hidden) – sourced from navConfig.js with fallbacks
// ======================================================================

/** Top-nav items for a role (from navConfig or [] if none). */
export function getTopNavForRole(role) {
  const res = cfgGetTopNavForRole?.(normalizeRole(role)) || []
  return Array.isArray(res) ? [...res] : []
}

/** Hidden/deep routes for a role (from navConfig or [] if none). */
export function getHiddenRoutesForRole(role) {
  const res = cfgGetHiddenRoutesForRole?.(normalizeRole(role)) || []
  return Array.isArray(res) ? [...res] : []
}

/**
 * Generated top-nav set when navConfig is absent.
 * @param {'student'|'instructor'|'admin'|'superadmin'|string} role
 */
export function getNavLinksForRole(role) {
  const links = getTopNavForRole(role)
  if (links.length) return links

  switch (normalizeRole(role)) {
    case 'superadmin':
      return [
        { to: SuperadminRoutes.dashboard(),    label: 'Dashboard',    icon: '🏠', exact: true },
        { to: SuperadminRoutes.schools(),      label: 'Schools',      icon: '🏫' },
        { to: SuperadminRoutes.users(),        label: 'Users',        icon: '👥' },
        { to: SuperadminRoutes.compliance(),   label: 'Compliance',   icon: '🛡️' },
        { to: SuperadminRoutes.walkthroughs(), label: 'Walkthroughs', icon: '🧭' },
        { to: SuperadminRoutes.billing(),      label: 'Billing',      icon: '💳' },
        { to: SuperadminRoutes.settings(),     label: 'Settings',     icon: '⚙️' },
        { to: SuperadminRoutes.logs(),         label: 'Logs',         icon: '📜' },
        { to: SuperadminRoutes.permissions(),  label: 'Permissions',  icon: '🔐' },
      ]
    case 'admin':
      return [
        { to: AdminRoutes.dashboard(),    label: 'Dashboard',    icon: '🏠', exact: true },
        { to: AdminRoutes.profile(),      label: 'Profile',      icon: '👤' },
        // Users removed
        { to: AdminRoutes.companies(),    label: 'Companies',    icon: '🏢' },
        { to: AdminRoutes.reports(),      label: 'Reports',      icon: '📄' },
        { to: AdminRoutes.billing(),      label: 'Billing',      icon: '💳' },
        { to: AdminRoutes.walkthroughs(), label: 'Walkthroughs', icon: '🧭' },
        { to: AdminRoutes.settings(),     label: 'Settings',     icon: '⚙️' },
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
        { to: StudentRoutes.profile(),       label: 'Profile',        icon: '👤' },
        { to: StudentRoutes.checklists(),    label: 'Checklists',     icon: '📋' },
        { to: StudentRoutes.practiceTests(), label: 'Practice Tests', icon: '📝' },
        { to: StudentRoutes.walkthrough(),   label: 'Walkthrough',    icon: '🧭' },
        { to: StudentRoutes.flashcards(),    label: 'Flashcards',     icon: '🗂️' },
      ]
  }
}