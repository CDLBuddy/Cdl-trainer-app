// admin/index.js

// === ADMIN MODULE BARREL EXPORTS ===
export { renderAdminDashboard } from './admin-dashboard.js';
export { renderAdminProfile } from './admin-profile.js';
export { renderAdminUsers } from './admin-users.js';
export { renderAdminCompanies } from './admin-companies.js';
export { renderAdminReports } from './admin-reports.js';

// Optionally: Export shared helpers or state (if needed elsewhere)
export { currentUserEmail } from './admin-dashboard.js';

// === ADMIN NAVIGATION HANDLER ===
export function handleAdminNav(page, ...args) {
  switch (page) {
    case 'dashboard':
      renderAdminDashboard(...args);
      break;
    case 'profile':
      renderAdminProfile(...args);
      break;
    case 'users':
      renderAdminUsers(...args);
      break;
    case 'companies':
      renderAdminCompanies(...args);
      break;
    case 'reports':
      renderAdminReports(...args);
      break;
    default:
      renderAdminDashboard(...args);
  }
}

// --- (Optional) Standalone admin entry for direct page loads ---
// Only runs if admin section is directly accessed (rare, but futureproof)
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#admin')) {
    // Example: #admin-users, #admin-companies, #admin-profile, etc.
    const match = location.hash.match(/^#admin-([a-z]+)/);
    const page = match ? match[1] : 'dashboard';
    handleAdminNav(page);
  }
});

// --- (Optional) Admin-specific popstate handling (not required if global nav already works) ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#admin')) return;
  const match = location.hash.match(/^#admin-([a-z]+)/);
  const page = match ? match[1] : 'dashboard';
  handleAdminNav(page);
});
