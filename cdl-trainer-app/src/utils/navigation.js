// src/utils/navigation.js
// Small, React-Router-friendly helpers to replace legacy navigation.js

export function getDashboardRoute(role) {
  switch ((role || "").toLowerCase()) {
    case "superadmin":
      return "/superadmin/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "instructor":
      return "/instructor/dashboard";
    case "student":
    default:
      return "/student/dashboard";
  }
}

/**
 * Read the current role from reliable places.
 * (Keeps your existing localStorage convention for now.)
 */
export function getCurrentRole() {
  return (
    localStorage.getItem("userRole") ||
    window.currentUserRole ||
    "student"
  );
}

/**
 * Convenience: push to the dashboard for the current role.
 * Call this inside a component that has access to `useNavigate`.
 */
export function goToCurrentDashboard(navigate, roleOverride = null) {
  const role = (roleOverride || getCurrentRole()).toLowerCase();
  navigate(getDashboardRoute(role), { replace: true });
}