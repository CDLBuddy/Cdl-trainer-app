// admin/index.js

// === ADMIN MODULE BARREL IMPORTS ===
import { renderAdminDashboard, currentUserEmail } from './admin-dashboard.js';
import { renderAdminProfile }   from './admin-profile.js';
import { renderAdminUsers }     from './admin-users.js';
import { renderAdminCompanies } from './admin-companies.js';
import { renderAdminReports }   from './admin-reports.js';

// --- Export all admin pages for navigation.js barrel import ---
export {
  renderAdminDashboard,
  renderAdminProfile,
  renderAdminUsers,
  renderAdminCompanies,
  renderAdminReports,
  currentUserEmail, // Shared helper/state if needed
};

// === ADMIN NAVIGATION HANDLER ===
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

// --- (Optional) Standalone admin entry for direct page loads ---
window.addEventListener("DOMContentLoaded", () => {
  if (location.hash.startsWith("#admin")) {
    // Example: #admin-users, #admin-companies, #admin-profile, etc.
    const match = location.hash.match(/^#admin-([a-z]+)/);
    const page = match ? match[1] : "dashboard";
    handleAdminNav(page);
  }
});

// --- (Optional) Admin-specific popstate handling (not required if global nav already works) ---
window.addEventListener("popstate", () => {
  if (!location.hash.startsWith("#admin")) return;
  const match = location.hash.match(/^#admin-([a-z]+)/);
  const page = match ? match[1] : "dashboard";
  handleAdminNav(page);
});