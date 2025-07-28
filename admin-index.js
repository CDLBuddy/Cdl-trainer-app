// admin-index.js

// === ADMIN MODULE BARREL EXPORTS ===
export { renderAdminDashboard, currentUserEmail } from './admin/admin-dashboard.js';
export { renderAdminProfile } from './admin/admin-profile.js';
export { renderAdminUsers } from './admin/admin-users.js';
export { renderAdminCompanies } from './admin/admin-companies.js';
export { renderAdminReports } from './admin/admin-reports.js';

// === ADMIN NAVIGATION HANDLER ===
export function handleAdminNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'admin';

  switch (page?.toLowerCase()) {
    case 'dashboard':
      renderAdminDashboard(container);
      break;
    case 'profile':
      renderAdminProfile(container);
      break;
    case 'users':
      renderAdminUsers(container);
      break;
    case 'companies':
      renderAdminCompanies(container);
      break;
    case 'reports':
      renderAdminReports(container);
      break;
    default:
      renderAdminDashboard(container);
      break;
  }
}

// --- (Optional) Standalone admin entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#admin')) {
    const match = location.hash.match(/^#admin-([a-zA-Z]+)/);
    const page = match ? match[1] : 'dashboard';
    handleAdminNav(page);
  }
});

// --- (Optional) Admin-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#admin')) return;
  const match = location.hash.match(/^#admin-([a-zA-Z]+)/);
  const page = match ? match[1] : 'dashboard';
  handleAdminNav(page);
});
