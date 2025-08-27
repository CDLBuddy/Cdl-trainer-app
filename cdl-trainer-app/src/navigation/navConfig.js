// Path: /src/navigation/navConfig.js
// ======================================================================
// Centralized navigation + route metadata for all roles (pure module)
// ----------------------------------------------------------------------
// • Only items in *_TOP_NAV appear in the main NavBar / rails.
// • *_DEEP_LINKS are valid routes but hidden from top nav (detail/wrappers).
// • Use getTopNavForRole(role) to build role-aware nav.
// • Use getDashboardRoute(role) to jump to a role’s dashboard.
// • Helpers: normalizeRole, roleFromPath, getHiddenRoutesForRole,
//            getNavLinksForRole (alias), NAV_REGISTRY, isRouteForRole,
//            annotateActive(links, path), getAllRoutesForRole(role),
//            getPrefetchKeysForRole(role).
// • Side-effect free; SSR/treeshake friendly.
// ======================================================================

import { __DEV__ } from '@utils/env.js'

/** @typedef {'student'|'instructor'|'admin'|'superadmin'} Role */

/**
 * @typedef NavItem
 * @prop {string}  to
 * @prop {string}  label
 * @prop {string=} icon
 * @prop {boolean=} exact            // meta only (React Router v6 ignores it)
 * @prop {Role=}   prefetchRole      // hint for role-specific preloaders
 * @prop {string=} preloadKey        // ties to preloadRoute(name) per role
 */

// ----------------------------------------------------------------------
// Role helpers
// ----------------------------------------------------------------------

export const ROLE_LIST = /** @type {const} */ ([
  'student',
  'instructor',
  'admin',
  'superadmin',
])

/** @param {unknown} r @returns {Role|null} */
export function normalizeRole(r) {
  const v = String(r ?? '').trim().toLowerCase()
  return /** @type {Role|null} */(
    v === 'student' || v === 'instructor' || v === 'admin' || v === 'superadmin'
      ? v
      : null
  )
}

/** Infer a role from a path like "/student/..." (returns null if none). */
export function roleFromPath(path = '') {
  const m = /^\/(student|instructor|admin|superadmin)(?:\/|$)/i.exec(String(path))
  return m ? /** @type {Role} */ (m[1].toLowerCase()) : null
}

// Dev assertions to keep config tidy
function assertPathPrefix(item, role) {
  if (!__DEV__) return
  const ok = roleFromPath(item.to) === role || item.to === '/'
  if (!ok) {
    // eslint-disable-next-line no-console
    console.warn(`[navConfig] "${item.label}" path "${item.to}" is not under "/${role}".`)
  }
}
function assertUniqueLabels(items, role) {
  if (!__DEV__) return
  const seen = new Set()
  for (const it of items) {
    const key = `${role}:${String(it.label).toLowerCase()}`
    if (seen.has(key)) {
      // eslint-disable-next-line no-console
      console.warn(`[navConfig] Duplicate label "${it.label}" in ${role} top nav.`)
    }
    seen.add(key)
  }
}

// ----------------------------------------------------------------------
// Student (preloadKey values map to src/student/preload.js preloadRoute keys)
// ----------------------------------------------------------------------

export const STUDENT_TOP_NAV = Object.freeze(/** @type {NavItem[]} */([
  { to: '/student/dashboard',      label: 'Dashboard',      icon: '🏠', exact: true, prefetchRole: 'student', preloadKey: 'dashboard' },
  { to: '/student/profile',        label: 'Profile',        icon: '👤',              prefetchRole: 'student', preloadKey: 'profile' },
  { to: '/student/checklists',     label: 'Checklists',     icon: '📋',              prefetchRole: 'student', preloadKey: 'checklists' },
  { to: '/student/practice-tests', label: 'Practice Tests', icon: '📝',              prefetchRole: 'student', preloadKey: 'practice' },
  { to: '/student/walkthrough',    label: 'Walkthrough',    icon: '🧭',              prefetchRole: 'student', preloadKey: 'walkthrough' },
  { to: '/student/flashcards',     label: 'Flashcards',     icon: '🗂️',              prefetchRole: 'student', preloadKey: 'flashcards' },
]))

export const STUDENT_DEEP_LINKS = Object.freeze(/** @type {string[]} */([
  '/student/test-engine/:testName',
  '/student/test-review/:testName',
  '/student/test-results',
]))

// ----------------------------------------------------------------------
// Instructor (preloadKey placeholders if/when you add instructor/preload.js)
// ----------------------------------------------------------------------

export const INSTRUCTOR_TOP_NAV = Object.freeze(/** @type {NavItem[]} */([
  { to: '/instructor/dashboard',        label: 'Dashboard',        icon: '🏠', exact: true, prefetchRole: 'instructor', preloadKey: 'dashboard' },
  { to: '/instructor/profile',          label: 'Profile',          icon: '👤',              prefetchRole: 'instructor', preloadKey: 'profile' },
  { to: '/instructor/checklist-review', label: 'Checklist Review', icon: '✅',              prefetchRole: 'instructor', preloadKey: 'checklist-review' },
]))

export const INSTRUCTOR_DEEP_LINKS = Object.freeze(/** @type {string[]} */([
  '/instructor/student-profile/:studentId',
  '/instructor/verify/:studentId',
]))

// ----------------------------------------------------------------------
// Admin (preloadKey values map to entries in src/admin/preload.js)
// ----------------------------------------------------------------------

export const ADMIN_TOP_NAV = Object.freeze(/** @type {NavItem[]} */([
  { to: '/admin/dashboard',    label: 'Dashboard',    icon: '🏠', exact: true, prefetchRole: 'admin', preloadKey: 'dashboard' },
  { to: '/admin/profile',      label: 'Profile',      icon: '👤',              prefetchRole: 'admin', preloadKey: 'profile' },
  { to: '/admin/companies',    label: 'Companies',    icon: '🏢',              prefetchRole: 'admin', preloadKey: 'companies' },
  { to: '/admin/billing',      label: 'Billing',      icon: '💳',              prefetchRole: 'admin', preloadKey: 'billing' },
  { to: '/admin/reports',      label: 'Reports',      icon: '📄',              prefetchRole: 'admin', preloadKey: 'reports' },
  { to: '/admin/walkthroughs', label: 'Walkthroughs', icon: '🧭',              prefetchRole: 'admin', preloadKey: 'walkthroughs' },
  { to: '/admin/settings',     label: 'Settings',     icon: '⚙️',              prefetchRole: 'admin', preloadKey: 'settings' },
]))

export const ADMIN_DEEP_LINKS = Object.freeze(/** @type {string[]} */([
  '/admin/companies/:companyId',
  // Communications route is available but intentionally hidden from top nav
  '/admin/communications',
]))

// ----------------------------------------------------------------------
// Superadmin (no preloader mapping yet; add when you create it)
// ----------------------------------------------------------------------

export const SUPERADMIN_TOP_NAV = Object.freeze(/** @type {NavItem[]} */([
  { to: '/superadmin/dashboard',    label: 'Dashboard',    icon: '🏠', exact: true, prefetchRole: 'superadmin', preloadKey: 'dashboard' },
  { to: '/superadmin/schools',      label: 'Schools',      icon: '🏫',              prefetchRole: 'superadmin', preloadKey: 'schools' },
  { to: '/superadmin/users',        label: 'Users',        icon: '👥',              prefetchRole: 'superadmin', preloadKey: 'users' },
  { to: '/superadmin/compliance',   label: 'Compliance',   icon: '🛡️',              prefetchRole: 'superadmin', preloadKey: 'compliance' },
  { to: '/superadmin/walkthroughs', label: 'Walkthroughs', icon: '🧭',              prefetchRole: 'superadmin', preloadKey: 'walkthroughs' },
  { to: '/superadmin/billing',      label: 'Billing',      icon: '💳',              prefetchRole: 'superadmin', preloadKey: 'billing' },
  { to: '/superadmin/settings',     label: 'Settings',     icon: '⚙️',              prefetchRole: 'superadmin', preloadKey: 'settings' },
  { to: '/superadmin/logs',         label: 'Logs',         icon: '📜',              prefetchRole: 'superadmin', preloadKey: 'logs' },
  { to: '/superadmin/permissions',  label: 'Permissions',  icon: '🔐',              prefetchRole: 'superadmin', preloadKey: 'permissions' },
]))

export const SUPERADMIN_DEEP_LINKS = Object.freeze(/** @type {string[]} */([]))

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

const DASHBOARD_ROUTE = Object.freeze({
  student: '/student/dashboard',
  instructor: '/instructor/dashboard',
  admin: '/admin/dashboard',
  superadmin: '/superadmin/dashboard',
})

/** @param {unknown} role */
export function getDashboardRoute(role) {
  const r = normalizeRole(role)
  return r ? DASHBOARD_ROUTE[r] : '/login'
}

/** Returns a defensive copy of the role’s top nav (callers can’t mutate source). */
export function getTopNavForRole(role) {
  const r = normalizeRole(role)
  switch (r) {
    case 'student':
      STUDENT_TOP_NAV.forEach(i => assertPathPrefix(i, 'student'))
      assertUniqueLabels(STUDENT_TOP_NAV, 'student')
      return [...STUDENT_TOP_NAV]
    case 'instructor':
      INSTRUCTOR_TOP_NAV.forEach(i => assertPathPrefix(i, 'instructor'))
      assertUniqueLabels(INSTRUCTOR_TOP_NAV, 'instructor')
      return [...INSTRUCTOR_TOP_NAV]
    case 'admin':
      ADMIN_TOP_NAV.forEach(i => assertPathPrefix(i, 'admin'))
      assertUniqueLabels(ADMIN_TOP_NAV, 'admin')
      return [...ADMIN_TOP_NAV]
    case 'superadmin':
      SUPERADMIN_TOP_NAV.forEach(i => assertPathPrefix(i, 'superadmin'))
      assertUniqueLabels(SUPERADMIN_TOP_NAV, 'superadmin')
      return [...SUPERADMIN_TOP_NAV]
    default:
      return []
  }
}

export const getNavLinksForRole = getTopNavForRole

/** Hidden, but routable, paths for a role (defensive copy). */
export function getHiddenRoutesForRole(role) {
  switch (normalizeRole(role)) {
    case 'student':    return [...STUDENT_DEEP_LINKS]
    case 'instructor': return [...INSTRUCTOR_DEEP_LINKS]
    case 'admin':      return [...ADMIN_DEEP_LINKS]
    case 'superadmin': return [...SUPERADMIN_DEEP_LINKS]
    default:           return []
  }
}

/** Registry for quick lookups / diagnostics (frozen for safety). */
export const NAV_REGISTRY = Object.freeze({
  student:    Object.freeze({ top: STUDENT_TOP_NAV,    hidden: STUDENT_DEEP_LINKS }),
  instructor: Object.freeze({ top: INSTRUCTOR_TOP_NAV, hidden: INSTRUCTOR_DEEP_LINKS }),
  admin:      Object.freeze({ top: ADMIN_TOP_NAV,      hidden: ADMIN_DEEP_LINKS }),
  superadmin: Object.freeze({ top: SUPERADMIN_TOP_NAV, hidden: SUPERADMIN_DEEP_LINKS }),
})

/** Optional utility: is a given path intended for a specific role? */
export function isRouteForRole(path, role) {
  const r = normalizeRole(role)
  if (!r) return false
  return roleFromPath(path) === r
}

// ----------------------------------------------------------------------
// Extra ergonomic helpers (pure; no router dependency)
// ----------------------------------------------------------------------

/** Simple :param matcher (supports "/a/:id/*" style patterns) */
function matchPathSimple(pattern, path) {
  const p = String(pattern || '').replace(/\/+$/, '')
  const u = String(path || '').replace(/\/+$/, '')
  const re = new RegExp('^' + p
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // escape
    .replace(/\\:([A-Za-z0-9_]+)/g, '[^/]+') // :param
    .replace(/\\\*$/,'(?:/.*)?')             // trailing wildcard
  + '$', 'i')
  return re.test(u)
}

/**
 * Add an `active` boolean to each link based on the current path.
 * Consumers can style active state without coupling to Router internals.
 * @param {NavItem[]} links
 * @param {string} currentPath
 * @returns {(NavItem & {active:boolean})[]}
 */
export function annotateActive(links, currentPath) {
  const path = String(currentPath || '')
  return links.map((it) => ({
    ...it,
    active: it.exact ? it.to === path : matchPathSimple(it.to, path),
  }))
}

/** All routable paths (top + hidden) for a role (defensive copy). */
export function getAllRoutesForRole(role) {
  return [
    ...getTopNavForRole(role).map((i) => i.to),
    ...getHiddenRoutesForRole(role),
  ]
}

/** Unique set of prefetch keys used by a role’s top nav. */
export function getPrefetchKeysForRole(role) {
  const keys = new Set(
    getTopNavForRole(role).map((i) => i.preloadKey).filter(Boolean)
  )
  return Array.from(keys)
}