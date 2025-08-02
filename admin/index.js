// admin/index.js

// === ADMIN MODULE BARREL IMPORTS ===
import { renderAdminDashboard, currentUserEmail } from './admin-dashboard.js';
import { renderAdminProfile } from './admin-profile.js';
import { renderAdminUsers } from './admin-users.js';
import { renderAdminCompanies } from './admin-companies.js';
import { renderAdminReports } from './admin-reports.js';

// === ADMIN MODULE BARREL EXPORTS ===
export {
  renderAdminDashboard,
  currentUserEmail,
  renderAdminProfile,
  renderAdminUsers,
  renderAdminCompanies,
  renderAdminReports,
};

// === ADMIN NAVIGATION HANDLER ===
export function handleAdminNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'admin';

  switch ((page || '').toLowerCase()) {
    case 'admin-dashboard':
      renderAdminDashboard(container);
      break;
    case 'admin-profile':
      renderAdminProfile(container);
      break;
    case 'admin-users':
      renderAdminUsers(container);
      break;
    case 'admin-companies':
      renderAdminCompanies(container);
      break;
    case 'admin-reports':
      renderAdminReports(container);
      break;
    default:
      renderAdminDashboard(container);
  }
}

// --- Standalone admin entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  const hash = location.hash.toLowerCase();
  if (hash.startsWith('#admin')) {
    const match = hash.match(/^#admin-([a-z\-]+)/);
    const page = match ? `admin-${match[1]}` : 'admin-dashboard';
    handleAdminNav(page);
  }
});

// --- Admin-specific popstate handling (browser navigation) ---
window.addEventListener('popstate', () => {
  const hash = location.hash.toLowerCase();
  if (!hash.startsWith('#admin')) return;
  const match = hash.match(/^#admin-([a-z\-]+)/);
  const page = match ? `admin-${match[1]}` : 'admin-dashboard';
  handleAdminNav(page);
});