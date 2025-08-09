// src/navigation/navConfig.js

/**
 * Centralized navigation + route metadata for all roles.
 * - Only items in TOP_NAV appear in the main NavBar.
 * - DEEP_LINKS are valid routes but hidden from the top nav (detail pages, wrappers, etc).
 * - Use getTopNavForRole(role) in your NavBar.jsx.
 * - Use getDashboardRoute(role) anywhere you need a role→dashboard redirect.
 */

/** @typedef {{ to: string, label: string, icon?: string }} NavItem */

/* =========================
   Student
   ========================= */
export const STUDENT_TOP_NAV /** @type {NavItem[]} */ = [
  { to: "/student/dashboard",     label: "Dashboard",      icon: "🏠" },
  { to: "/student/profile",       label: "Profile",        icon: "👤" },
  { to: "/student/checklists",    label: "Checklists",     icon: "📋" },
  { to: "/student/practice-tests",label: "Practice Tests", icon: "📝" },
  { to: "/student/walkthrough",   label: "Walkthrough",    icon: "🚶" },
  { to: "/student/flashcards",    label: "Flashcards",     icon: "🗂️" },
];

export const STUDENT_DEEP_LINKS = [
  "/student/test-engine/:testName",
  "/student/test-review/:testName",
  "/student/test-results",
];

/* =========================
   Instructor
   ========================= */
export const INSTRUCTOR_TOP_NAV /** @type {NavItem[]} */ = [
  { to: "/instructor/dashboard",            label: "Dashboard",        icon: "🏠" },
  { to: "/instructor/profile",              label: "Profile",          icon: "👤" },
  { to: "/instructor/checklist-review",     label: "Checklist Review", icon: "✅" },
  // If/when you add InstructorChecklists page back:
  // { to: "/instructor/checklists",        label: "Checklists",       icon: "📋" },
];

export const INSTRUCTOR_DEEP_LINKS = [
  "/instructor/student-profile/:studentId",
];

/* =========================
   Admin
   ========================= */
export const ADMIN_TOP_NAV /** @type {NavItem[]} */ = [
  { to: "/admin/dashboard",   label: "Dashboard",  icon: "🏠" },
  { to: "/admin/profile",     label: "Profile",    icon: "👤" },
  { to: "/admin/users",       label: "Users",      icon: "👥" },
  { to: "/admin/companies",   label: "Companies",  icon: "🏢" },
  { to: "/admin/reports",     label: "Reports",    icon: "📄" },
  // Later:
  // { to: "/admin/billing",   label: "Billing",    icon: "💳" },
];

export const ADMIN_DEEP_LINKS = [];

/* =========================
   Superadmin
   ========================= */
export const SUPERADMIN_TOP_NAV /** @type {NavItem[]} */ = [
  { to: "/superadmin/dashboard",   label: "Dashboard",   icon: "🏠" },
  { to: "/superadmin/schools",     label: "Schools",     icon: "🏫" },
  { to: "/superadmin/users",       label: "Users",       icon: "👥" },
  { to: "/superadmin/compliance",  label: "Compliance",  icon: "🛡️" },
  { to: "/superadmin/billing",     label: "Billing",     icon: "💳" },
  { to: "/superadmin/settings",    label: "Settings",    icon: "⚙️" },
  { to: "/superadmin/logs",        label: "Logs",        icon: "📜" },
  { to: "/superadmin/permissions", label: "Permissions", icon: "🔐" },
];

export const SUPERADMIN_DEEP_LINKS = [];

/* =========================
   Helpers
   ========================= */

/** Dashboard route per role (used for redirects) */
export function getDashboardRoute(role) {
  switch (role) {
    case "student":     return "/student/dashboard";
    case "instructor":  return "/instructor/dashboard";
    case "admin":       return "/admin/dashboard";
    case "superadmin":  return "/superadmin/dashboard";
    default:            return "/login";
  }
}

/** Top nav links for role (what NavBar should render) */
export function getTopNavForRole(role) {
  switch (role) {
    case "student":     return STUDENT_TOP_NAV;
    case "instructor":  return INSTRUCTOR_TOP_NAV;
    case "admin":       return ADMIN_TOP_NAV;
    case "superadmin":  return SUPERADMIN_TOP_NAV;
    default:            return [];
  }
}

/** Deep links per role (valid routes that should NOT be in top nav) */
export function getHiddenRoutesForRole(role) {
  switch (role) {
    case "student":     return STUDENT_DEEP_LINKS;
    case "instructor":  return INSTRUCTOR_DEEP_LINKS;
    case "admin":       return ADMIN_DEEP_LINKS;
    case "superadmin":  return SUPERADMIN_DEEP_LINKS;
    default:            return [];
  }
}

/** Optional: one big registry if you want to inspect everything at once */
export const NAV_REGISTRY = {
  student:    { top: STUDENT_TOP_NAV,    hidden: STUDENT_DEEP_LINKS },
  instructor: { top: INSTRUCTOR_TOP_NAV, hidden: INSTRUCTOR_DEEP_LINKS },
  admin:      { top: ADMIN_TOP_NAV,      hidden: ADMIN_DEEP_LINKS },
  superadmin: { top: SUPERADMIN_TOP_NAV, hidden: SUPERADMIN_DEEP_LINKS },
};