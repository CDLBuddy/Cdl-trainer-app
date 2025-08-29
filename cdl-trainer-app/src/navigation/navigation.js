// src/navigation/navigation.js
// ======================================================================
// Central helpers for routing + nav across the app (React Router v6+)
// - Role normalization & detection
// - Dashboard helpers, safe navigation wrappers (now handles external URLs)
// - Route builders (kept DRY) + profileSection() helper
// - Top/hidden nav link accessors (from navConfig) with safe fallbacks
// - Pure module (no side effects) for SSR/tree-shaking friendliness
// ======================================================================

import {
  getDashboardRoute as cfgGetDashboardRoute,
  getHiddenRoutesForRole as cfgGetHiddenRoutesForRole,
  getTopNavForRole as cfgGetTopNavForRole,
  normalizeRole as cfgNormalizeRole,
  roleFromPath as cfgRoleFromPath,
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
    const canon = cfgNormalizeRole?.(role)
    const v = (canon ?? String(role ?? '')).trim().toLowerCase()
    return /** @type any */ (
      v === 'student' ||
      v === 'instructor' ||
      v === 'admin' ||
      v === 'superadmin'
        ? v
        : 'student'
    )
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
  // prefer navConfig’s regex for consistency, fall back to local
  return (
    cfgRoleFromPath?.(path) ??
    (() => {
      const m = /^\/(student|instructor|admin|superadmin)(?:\/|$)/i.exec(
        String(path)
      )
      return m ? /** @type any */ (m[1].toLowerCase()) : null
    })()
  )
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

// ======================================================================
// Small URL helpers (defensive)
// ======================================================================

/** @param {string} s */
export function isExternalURL(s = '') {
  const v = String(s || '')
  return /^(?:https?:|mailto:|tel:)/i.test(v)
}

/** @param {string} s */
export function isJavascriptURL(s = '') {
  return /^javascript:/i.test(String(s || ''))
}

/** @param {string|URL} input */
export function toURL(input) {
  try {
    if (input instanceof URL) return input
    const base =
      typeof window !== 'undefined' ? window.location.href : 'http://localhost/'
    return new URL(String(input || '/'), base)
  } catch {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost'
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

/** Keep internal paths tidy */
export function ensureLeadingSlash(p = '') {
  const s = String(p || '')
  return s.startsWith('/') ? s : `/${s}`
}

/** Simple internal path check */
export function isInternalPath(p = '') {
  const s = String(p || '')
  return (
    /^\/(?!\/)/.test(s) && !/^https?:\/\//i.test(s) && !/^javascript:/i.test(s)
  )
}

/** Safe “return to” sanitizer used after login */
export function sanitizeReturnPath(candidate = '') {
  const s = String(candidate || '')
  if (!isInternalPath(s)) return null
  if (/^\/login(?:\/|$)/i.test(s)) return null
  return s
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
 * Wrapper around react-router navigate that also handles external URLs safely.
 * - Internal path: uses client-side navigate(to, options).
 * - External (http/https/mailto/tel): hard navigate via window.location.assign().
 * - Guards against javascript: URLs.
 * @param {(to:string, opts?:any)=>void|undefined} navigate
 * @param {string|URL} to
 * @param {any} [options]
 */
export function safeNavigate(navigate, to, options = {}) {
  const href = to instanceof URL ? to.href : String(to || '/')
  try {
    if (isJavascriptURL(href)) return // ignore dangerous URLs
    if (isExternalURL(href)) {
      if (typeof window !== 'undefined') window.location.assign(href)
      return
    }
    const path =
      href instanceof URL ? href.pathname + href.search + href.hash : href
    if (typeof navigate === 'function') {
      navigate(path, options)
    } else if (typeof window !== 'undefined') {
      window.location.assign(path)
    }
  } catch (err) {
    console.error('[navigation] navigate failed:', err)
    try {
      if (typeof window !== 'undefined') window.location.assign(href)
    } catch {
      /* noop */
    }
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
  } catch {
    /* ignore */
  }

  const candidate = sanitizeReturnPath(fromState || fromQuery || '')
  const dest = candidate || getDashboardRoute(role)
  safeNavigate(navigate, dest, { replace: true })
}

// ======================================================================
// Route builders (keep string paths DRY)
// ======================================================================

// ---- Student
export const StudentRoutes = Object.freeze({
  dashboard: () => '/student/dashboard',
  profile: () => '/student/profile',
  /** Deep-link to a profile section via hash, e.g., "#permit" */
  profileSection: (section = '') =>
    `/student/profile${section ? `#${String(section).replace(/\s+/g, '-').toLowerCase()}` : ''}`,
  checklists: () => '/student/checklists',
  practiceTests: () => '/student/practice-tests',
  testEngine: (testName = '') =>
    `/student/test-engine/${encodeURIComponent(testName)}`,
  testReview: (testName = '') =>
    `/student/test-review/${encodeURIComponent(testName)}`,
  testResults: () => '/student/test-results',
  walkthrough: () => '/student/walkthrough',
  flashcards: () => '/student/flashcards',
})

// ---- Instructor
export const InstructorRoutes = Object.freeze({
  dashboard: () => '/instructor/dashboard',
  profile: () => '/instructor/profile',
  checklistReview: () => '/instructor/checklist-review',
  studentProfile: studentId =>
    `/instructor/student-profile/${encodeURIComponent(studentId)}`,
})

// ---- Admin (Users removed; companies own user mgmt)
export const AdminRoutes = Object.freeze({
  dashboard: () => '/admin/dashboard',
  profile: () => '/admin/profile',
  companies: () => '/admin/companies',
  reports: () => '/admin/reports',
  billing: () => '/admin/billing',
  walkthroughs: () => '/admin/walkthroughs',
  settings: () => '/admin/settings',
})

// ---- Superadmin
export const SuperadminRoutes = Object.freeze({
  dashboard: () => '/superadmin/dashboard',
  schools: () => '/superadmin/schools',
  users: () => '/superadmin/users',
  compliance: () => '/superadmin/compliance',
  billing: () => '/superadmin/billing',
  settings: () => '/superadmin/settings',
  logs: () => '/superadmin/logs',
  permissions: () => '/superadmin/permissions',
  walkthroughs: () => '/superadmin/walkthroughs',
})

// ---- Unified role-aware builders
export const RouteBuilders = Object.freeze({
  /**
   * Role-aware profile route.
   * @param {'student'|'instructor'|'admin'|'superadmin'|string} role
   */
  profile(role = getCurrentRole()) {
    switch (normalizeRole(role)) {
      case 'superadmin':
        return '/superadmin/profile'
      case 'admin':
        return '/admin/profile'
      case 'instructor':
        return '/instructor/profile'
      case 'student':
      default:
        return '/student/profile'
    }
  },

  // Student aliases
  studentDashboard: StudentRoutes.dashboard,
  studentProfile: StudentRoutes.profile,
  studentProfileSection: StudentRoutes.profileSection,
  studentChecklists: StudentRoutes.checklists,
  studentPracticeTests: StudentRoutes.practiceTests,
  studentTestEngine: StudentRoutes.testEngine,
  studentTestReview: StudentRoutes.testReview,
  studentTestResults: StudentRoutes.testResults,
  studentWalkthrough: StudentRoutes.walkthrough,
  studentFlashcards: StudentRoutes.flashcards,

  // Instructor aliases
  instructorDashboard: InstructorRoutes.dashboard,
  instructorProfile: InstructorRoutes.profile,
  instructorChecklistReview: InstructorRoutes.checklistReview,
  instructorStudentProfile: InstructorRoutes.studentProfile,

  // Admin aliases
  adminDashboard: AdminRoutes.dashboard,
  adminProfile: AdminRoutes.profile,
  adminCompanies: AdminRoutes.companies,
  adminReports: AdminRoutes.reports,
  adminBilling: AdminRoutes.billing,
  adminWalkthroughs: AdminRoutes.walkthroughs,
  adminSettings: AdminRoutes.settings,

  // Superadmin aliases
  superadminDashboard: SuperadminRoutes.dashboard,
  superadminSchools: SuperadminRoutes.schools,
  superadminUsers: SuperadminRoutes.users,
  superadminCompliance: SuperadminRoutes.compliance,
  superadminBilling: SuperadminRoutes.billing,
  superadminSettings: SuperadminRoutes.settings,
  superadminLogs: SuperadminRoutes.logs,
  superadminPermissions: SuperadminRoutes.permissions,
  superadminWalkthroughs: SuperadminRoutes.walkthroughs,
})

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

/** Alias */
export const getNavLinksForRole = getTopNavForRole

// ======================================================================
// Optional: convenience aggregators
// ======================================================================

/** All known paths for a role (top + hidden), useful for guards/tools. */
export function getAllRoutesForRole(role) {
  return {
    top: getTopNavForRole(role),
    hidden: getHiddenRoutesForRole(role),
  }
}
