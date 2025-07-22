// admin/index.js

// === MODULE EXPORTS (barrel pattern) ===
export { renderAdminDashboard } from './admin-dashboard.js';
export { renderAdminProfile } from './admin-profile.js';
export { renderAdminUsers } from './admin-users.js';
export { renderAdminCompanies } from './admin-companies.js';
export { renderAdminReports } from './admin-reports.js';

// Optionally: Export shared helpers or state
export { currentUserEmail } from './admin-dashboard.js';

// === SMART NAVIGATION HANDLER (optional, but recommended for modular routing) ===
export function handleAdminNav(page, ...args) {
  switch (page) {
    case "dashboard":
      renderAdminDashboard(...args);
      break;
    case "profile":
      renderAdminProfile(...args);
      break;
    case "users":
      renderAdminUsers(...args);
      break;
    case "companies":
      renderAdminCompanies(...args);
      break;
    case "reports":
      renderAdminReports(...args);
      break;
    default:
      renderAdminDashboard(...args);
  }
}

// --- (Optional) Load dashboard on DOMContentLoaded if using direct entry point ---
window.addEventListener("DOMContentLoaded", () => {
  // Only auto-load if #admin in hash, otherwise defer to app shell
  if (location.hash.startsWith("#admin")) renderAdminDashboard();
});

// --- (Optional) Hash-based navigation ---
window.addEventListener("popstate", () => {
  if (!location.hash.startsWith("#admin")) return;
  // E.g. #admin-users, #admin-reports
  const pageMatch = location.hash.match(/^#admin-([a-z]+)/);
  const page = pageMatch ? pageMatch[1] : "dashboard";
  handleAdminNav(page);
});