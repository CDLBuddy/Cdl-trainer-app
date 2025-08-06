// admin/index.js

// === ADMIN MODULE BARREL IMPORTS ===
import { renderAdminDashboard } from './admin-dashboard.js';
import { renderAdminProfile } from './admin-profile.js';
import { renderAdminUsers } from './admin-users.js';
import { renderAdminCompanies } from './admin-companies.js';
import { renderAdminReports } from './admin-reports.js';

// === BARREL EXPORTS ===
export {
  renderAdminDashboard,
  renderAdminProfile,
  renderAdminUsers,
  renderAdminCompanies,
  renderAdminReports,
};

/**
 * Route handler for all admin navigation.
 * @param {string} page - The admin page (e.g. 'admin-dashboard')
 * @param {...any} args - Any extra args (2nd arg is usually container)
 */
export function handleAdminNav(page, ...args) {
  let container = args[1] || document.getElementById('app');
  if (!container) container = document.body; // Defensive

  // --- Admin Auth Check (Fail Closed) ---
  const role = window.currentUserRole || localStorage.getItem('userRole');
  if (role !== 'admin') {
    container.innerHTML = `
      <div class="dashboard-card" style="margin:2em auto;max-width:460px;">
        <h2>🔒 Access Denied</h2>
        <p>This page is for admin users only. Please log in with an admin account.</p>
      </div>
    `;
    document.title = 'Admin | Access Denied - CDL Trainer';
    return;
  }

  // --- Page Routing ---
  switch ((page || '').toLowerCase()) {
    case 'admin-dashboard':
      document.title = 'Admin Dashboard - CDL Trainer';
      return renderAdminDashboard(container);
    case 'admin-profile':
      document.title = 'Admin Profile - CDL Trainer';
      return renderAdminProfile(container);
    case 'admin-users':
      document.title = 'Manage Users - CDL Trainer';
      return renderAdminUsers(container);
    case 'admin-companies':
      document.title = 'Manage Companies - CDL Trainer';
      return renderAdminCompanies(container);
    case 'admin-reports':
      document.title = 'Reports & Export - CDL Trainer';
      return renderAdminReports(container);
    default:
      document.title = 'Admin Dashboard - CDL Trainer';
      return renderAdminDashboard(container);
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
