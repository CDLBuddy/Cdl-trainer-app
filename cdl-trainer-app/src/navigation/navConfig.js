// src/navigation/navConfig.js
// ======================================================================
// Centralized navigation + route metadata for all roles.
//
// - Only items in TOP_NAV appear in the main NavBar / rails.
// - DEEP_LINKS are valid routes but hidden from top nav (detail/wrapper).
// - Use getTopNavForRole(role) to build role-aware nav.
// - Use getDashboardRoute(role) to jump to a role’s dashboard.
// - Bonus helpers: normalizeRole, roleFromPath, getNavLinksForRole (alias).
// ======================================================================

/**
 * @typedef {'student'|'instructor'|'admin'|'superadmin'} Role
 *
 * @typedef {Object} NavItem
 * @property {string} to
 * @property {string} label
 * @property {string=} icon
 * @property {boolean=} exact          // if true, only exact path is active
 * @property {Role=} prefetchRole      // optional hint for preloading
 */

// ----------------------------------------------------------------------
// Role helpers
// ----------------------------------------------------------------------

/** @param {unknown} r @returns {Role|null} */
export function normalizeRole(r) {
  const v = String(r || '').trim().toLowerCase()
  return /** @type {Role|null} */(
    v === 'student' || v === 'instructor' || v === 'admin' || v === 'superadmin'
      ? v
      : null
  )
}

/** Infer a role from a path like "/student/..." (used by preloading/UI) */
export function roleFromPath(path = '') {
  const m = /^\/(student|instructor|admin|superadmin)(?:\/|$)/i.exec(String(path))
  return m ? /** @type {Role} */ (m[1].toLowerCase()) : null
}

/** DEV assertion for nav item paths (keeps config tidy) */
function assertPathPrefix(item, role) {
  if (import.meta?.env?.DEV) {
    const ok = roleFromPath(item.to) === role || item.to === '/'
    if (!ok) {
       
      console.warn(`[navConfig] "${item.label}" path "${item.to}" is not under "/${role}".`)
    }
  }
}

// ----------------------------------------------------------------------
// Student
// ----------------------------------------------------------------------

/** @type {NavItem[]} */
export const STUDENT_TOP_NAV = [
  { to: '/student/dashboard',      label: 'Dashboard',      icon: '🏠', exact: true, prefetchRole: 'student' },
  { to: '/student/profile',        label: 'Profile',        icon: '👤',              prefetchRole: 'student' },
  { to: '/student/checklists',     label: 'Checklists',     icon: '📋',              prefetchRole: 'student' },
  { to: '/student/practice-tests', label: 'Practice Tests', icon: '📝',              prefetchRole: 'student' },
  { to: '/student/walkthrough',    label: 'Walkthrough',    icon: '🧭',              prefetchRole: 'student' },
  { to: '/student/flashcards',     label: 'Flashcards',     icon: '🗂️',              prefetchRole: 'student' },
]

export const STUDENT_DEEP_LINKS = [
  '/student/test-engine/:testName',
  '/student/test-review/:testName',
  '/student/test-results',
]

// ----------------------------------------------------------------------
/* Instructor */
// ----------------------------------------------------------------------

/** @type {NavItem[]} */
export const INSTRUCTOR_TOP_NAV = [
  { to: '/instructor/dashboard',        label: 'Dashboard',        icon: '🏠', exact: true, prefetchRole: 'instructor' },
  { to: '/instructor/profile',          label: 'Profile',          icon: '👤',              prefetchRole: 'instructor' },
  { to: '/instructor/checklist-review', label: 'Checklist Review', icon: '✅',              prefetchRole: 'instructor' },
]

export const INSTRUCTOR_DEEP_LINKS = [
  '/instructor/student-profile/:studentId', // legacy/detail
  '/instructor/verify/:studentId',          // NEW verify screen
]

// ----------------------------------------------------------------------
/* Admin */
// ----------------------------------------------------------------------

/** @type {NavItem[]} */
export const ADMIN_TOP_NAV = [
  { to: '/admin/dashboard',    label: 'Dashboard',    icon: '🏠', exact: true, prefetchRole: 'admin' },
  { to: '/admin/profile',      label: 'Profile',      icon: '👤',              prefetchRole: 'admin' },
  { to: '/admin/users',        label: 'Users',        icon: '👥',              prefetchRole: 'admin' },
  { to: '/admin/companies',    label: 'Companies',    icon: '🏢',              prefetchRole: 'admin' },
  { to: '/admin/billing',      label: 'Billing',      icon: '💳',              prefetchRole: 'admin' }, // NEW
  { to: '/admin/reports',      label: 'Reports',      icon: '📄',              prefetchRole: 'admin' },
  { to: '/admin/walkthroughs', label: 'Walkthroughs', icon: '🧭',              prefetchRole: 'admin' },
]

export const ADMIN_DEEP_LINKS = [
  '/admin/companies/:companyId', // detail route not shown in top nav
]

// ----------------------------------------------------------------------
/* Superadmin */
// ----------------------------------------------------------------------

/** @type {NavItem[]} */
export const SUPERADMIN_TOP_NAV = [
  { to: '/superadmin/dashboard',    label: 'Dashboard',    icon: '🏠', exact: true, prefetchRole: 'superadmin' },
  { to: '/superadmin/schools',      label: 'Schools',      icon: '🏫',              prefetchRole: 'superadmin' },
  { to: '/superadmin/users',        label: 'Users',        icon: '👥',              prefetchRole: 'superadmin' },
  { to: '/superadmin/compliance',   label: 'Compliance',   icon: '🛡️',              prefetchRole: 'superadmin' },
  { to: '/superadmin/walkthroughs', label: 'Walkthroughs', icon: '🧭',              prefetchRole: 'superadmin' },
  { to: '/superadmin/billing',      label: 'Billing',      icon: '💳',              prefetchRole: 'superadmin' },
  { to: '/superadmin/settings',     label: 'Settings',     icon: '⚙️',              prefetchRole: 'superadmin' },
  { to: '/superadmin/logs',         label: 'Logs',         icon: '📜',              prefetchRole: 'superadmin' },
  { to: '/superadmin/permissions',  label: 'Permissions',  icon: '🔐',              prefetchRole: 'superadmin' },
]

export const SUPERADMIN_DEEP_LINKS = [
  // add hidden detail routes here if needed
]

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

/** Dashboard route per role (used for redirects) */
export function getDashboardRoute(role) {
  switch (normalizeRole(role)) {
    case 'student':    return '/student/dashboard'
    case 'instructor': return '/instructor/dashboard'
    case 'admin':      return '/admin/dashboard'
    case 'superadmin': return '/superadmin/dashboard'
    default:           return '/login'
  }
}

/** Top nav links for role (what NavBar/Rails should render) */
export function getTopNavForRole(role) {
  const r = normalizeRole(role)
  switch (r) {
    case 'student':
      STUDENT_TOP_NAV.forEach(i => assertPathPrefix(i, 'student'))
      return STUDENT_TOP_NAV
    case 'instructor':
      INSTRUCTOR_TOP_NAV.forEach(i => assertPathPrefix(i, 'instructor'))
      return INSTRUCTOR_TOP_NAV
    case 'admin':
      ADMIN_TOP_NAV.forEach(i => assertPathPrefix(i, 'admin'))
      return ADMIN_TOP_NAV
    case 'superadmin':
      SUPERADMIN_TOP_NAV.forEach(i => assertPathPrefix(i, 'superadmin'))
      return SUPERADMIN_TOP_NAV
    default:
      return []
  }
}

/** Alias maintained for older imports */
export const getNavLinksForRole = getTopNavForRole

/** Deep links per role (valid routes that should NOT be in top nav) */
export function getHiddenRoutesForRole(role) {
  switch (normalizeRole(role)) {
    case 'student':    return STUDENT_DEEP_LINKS
    case 'instructor': return INSTRUCTOR_DEEP_LINKS
    case 'admin':      return ADMIN_DEEP_LINKS
    case 'superadmin': return SUPERADMIN_DEEP_LINKS
    default:           return []
  }
}

/** Optional: one big registry if you want to inspect everything at once */
export const NAV_REGISTRY = {
  student:    { top: STUDENT_TOP_NAV,    hidden: STUDENT_DEEP_LINKS },
  instructor: { top: INSTRUCTOR_TOP_NAV, hidden: INSTRUCTOR_DEEP_LINKS },
  admin:      { top: ADMIN_TOP_NAV,      hidden: ADMIN_DEEP_LINKS },
  superadmin: { top: SUPERADMIN_TOP_NAV, hidden: SUPERADMIN_DEEP_LINKS },
}
