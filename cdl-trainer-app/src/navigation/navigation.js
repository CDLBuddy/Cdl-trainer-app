// src/navigation/navigation.js
// Central helpers for routing + nav across the app (React Router v6-friendly).

import {
  getDashboardRoute as cfgGetDashboardRoute,
  getTopNavForRole as cfgGetTopNavForRole,
  getHiddenRoutesForRole as cfgGetHiddenRoutesForRole,
} from "./navConfig.js";

/* =========================================================================
   Role normalization / inference
   ========================================================================= */
/** Lowercase, trims, and defaults to "student" */
export function normalizeRole(role) {
  const r = String(role || "").trim().toLowerCase();
  return r || "student";
}

/** Keep your existing conventions for reading the role */
export function getCurrentRole() {
  return normalizeRole(
    localStorage.getItem("userRole") || window.currentUserRole || "student"
  );
}

/* =========================================================================
   Dashboard helpers
   ========================================================================= */
export function getDashboardRoute(role) {
  return cfgGetDashboardRoute(normalizeRole(role));
}

export function goToCurrentDashboard(
  navigate,
  roleOverride = null,
  options = { replace: true }
) {
  const role = normalizeRole(roleOverride || getCurrentRole());
  safeNavigate(navigate, getDashboardRoute(role), options);
}

/* =========================================================================
   Safe navigation wrappers
   ========================================================================= */
export function safeNavigate(navigate, to, options = {}) {
  try {
    if (typeof navigate === "function") {
      navigate(to, options);
    } else {
      window.location.assign(to);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[navigation] navigate failed:", err);
    window.location.assign(to);
  }
}

/** After login, honor `state.from` or `?from=...`, else go to dashboard */
export function redirectAfterLogin(navigate, role, location) {
  const fromState = location?.state?.from?.pathname;
  let fromQuery = null;
  try {
    const url = new URL(window.location.href);
    fromQuery = url.searchParams.get("from");
  } catch {
    /* noop */
  }
  const dest = fromState || fromQuery || getDashboardRoute(role);
  safeNavigate(navigate, dest, { replace: true });
}

/* =========================================================================
   Route builders (keep string paths DRY)
   ========================================================================= */
// Student
export const StudentRoutes = {
  dashboard: () => "/student/dashboard",
  profile: () => "/student/profile",
  checklists: () => "/student/checklists",
  practiceTests: () => "/student/practice-tests",
  testEngine: (testName) =>
    `/student/test-engine/${encodeURIComponent(testName)}`,
  testReview: (testName) =>
    `/student/test-review/${encodeURIComponent(testName)}`,
  testResults: () => "/student/test-results",
  walkthrough: () => "/student/walkthrough",
  flashcards: () => "/student/flashcards",
};

// Instructor
export const InstructorRoutes = {
  dashboard: () => "/instructor/dashboard",
  profile: () => "/instructor/profile",
  checklistReview: () => "/instructor/checklist-review",
  studentProfile: (studentId) =>
    `/instructor/student-profile/${encodeURIComponent(studentId)}`,
};

// Admin
export const AdminRoutes = {
  dashboard: () => "/admin/dashboard",
  profile: () => "/admin/profile",
  users: () => "/admin/users",
  companies: () => "/admin/companies",
  reports: () => "/admin/reports",
  // billing: () => "/admin/billing",
};

// Superadmin
export const SuperadminRoutes = {
  dashboard: () => "/superadmin/dashboard",
  schools: () => "/superadmin/schools",
  users: () => "/superadmin/users",
  compliance: () => "/superadmin/compliance",
  billing: () => "/superadmin/billing",
  settings: () => "/superadmin/settings",
  logs: () => "/superadmin/logs",
  permissions: () => "/superadmin/permissions",
};

// Unified role-aware builders
export const RouteBuilders = {
  profile(role = getCurrentRole()) {
    switch (normalizeRole(role)) {
      case "superadmin":
        return "/superadmin/profile";
      case "admin":
        return "/admin/profile";
      case "instructor":
        return "/instructor/profile";
      case "student":
      default:
        return "/student/profile";
    }
  },

  // Student aliases
  studentDashboard: StudentRoutes.dashboard,
  studentProfile: StudentRoutes.profile,
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
  adminUsers: AdminRoutes.users,
  adminCompanies: AdminRoutes.companies,
  adminReports: AdminRoutes.reports,

  // Superadmin aliases
  superadminDashboard: SuperadminRoutes.dashboard,
  superadminSchools: SuperadminRoutes.schools,
  superadminUsers: SuperadminRoutes.users,
  superadminCompliance: SuperadminRoutes.compliance,
  superadminBilling: SuperadminRoutes.billing,
  superadminSettings: SuperadminRoutes.settings,
  superadminLogs: SuperadminRoutes.logs,
  superadminPermissions: SuperadminRoutes.permissions,
};

/* =========================================================================
   Nav links (Top nav + hidden/deep links) – sourced from navConfig.js
   ========================================================================= */
export function getTopNavForRole(role) {
  return cfgGetTopNavForRole(normalizeRole(role)) || [];
}
export function getHiddenRoutesForRole(role) {
  return cfgGetHiddenRoutesForRole(normalizeRole(role)) || [];
}

/** Convenience: what NavBar should render if navConfig is unavailable */
export function getNavLinksForRole(role) {
  const links = getTopNavForRole(role);
  if (Array.isArray(links) && links.length) return links;

  // Defensive fallback (mirrors navConfig labels/structure)
  switch (normalizeRole(role)) {
    case "superadmin":
      return [
        { to: SuperadminRoutes.dashboard(), label: "Dashboard", icon: "🏠" },
        { to: SuperadminRoutes.schools(), label: "Schools", icon: "🏫" },
        { to: SuperadminRoutes.users(), label: "Users", icon: "👥" },
        { to: SuperadminRoutes.compliance(), label: "Compliance", icon: "🛡️" },
        { to: SuperadminRoutes.billing(), label: "Billing", icon: "💳" },
        { to: SuperadminRoutes.settings(), label: "Settings", icon: "⚙️" },
        { to: SuperadminRoutes.logs(), label: "Logs", icon: "📜" },
        { to: SuperadminRoutes.permissions(), label: "Permissions", icon: "🔐" },
      ];
    case "admin":
      return [
        { to: AdminRoutes.dashboard(), label: "Dashboard", icon: "🏠" },
        { to: AdminRoutes.profile(), label: "Profile", icon: "👤" },
        { to: AdminRoutes.users(), label: "Users", icon: "👥" },
        { to: AdminRoutes.companies(), label: "Companies", icon: "🏢" },
        { to: AdminRoutes.reports(), label: "Reports", icon: "📄" },
      ];
    case "instructor":
      return [
        { to: InstructorRoutes.dashboard(), label: "Dashboard", icon: "🏠" },
        { to: InstructorRoutes.profile(), label: "Profile", icon: "👤" },
        { to: InstructorRoutes.checklistReview(), label: "Checklist Review", icon: "✅" },
      ];
    case "student":
    default:
      return [
        { to: StudentRoutes.dashboard(), label: "Dashboard", icon: "🏠" },
        { to: StudentRoutes.profile(), label: "Profile", icon: "👤" },
        { to: StudentRoutes.checklists(), label: "Checklists", icon: "📋" },
        { to: StudentRoutes.practiceTests(), label: "Practice Tests", icon: "📝" },
        { to: StudentRoutes.walkthrough(), label: "Walkthrough", icon: "🚶" },
        { to: StudentRoutes.flashcards(), label: "Flashcards", icon: "🗂️" },
      ];
  }
}