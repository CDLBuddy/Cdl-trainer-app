// admin/index.js

// === ADMIN MODULE BARREL IMPORTS ===
import {
  renderAdminDashboard,
  currentUserEmail,
} from './admin/admin-dashboard.js';
import { renderAdminProfile } from './admin/admin-profile.js';
import { renderAdminUsers } from './admin/admin-users.js';
import { renderAdminCompanies } from './admin/admin-companies.js';
import { renderAdminReports } from './admin/admin-reports.js';

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

  // Route only via explicit admin-page names
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
      break;
  }
}

// --- (Optional) Standalone admin entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#admin')) {
    const match = location.hash.match(/^#admin-([a-zA-Z-]+)/);
    const page = match ? `admin-${match[1]}` : 'admin-dashboard';
    handleAdminNav(page);
  }
});

// --- (Optional) Admin-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#admin')) return;
  const match = location.hash.match(/^#admin-([a-zA-Z-]+)/);
  const page = match ? `admin-${match[1]}` : 'admin-dashboard';
  handleAdminNav(page);
});
