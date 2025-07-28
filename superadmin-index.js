// superadmin-index.js

// === SUPERADMIN MODULE BARREL IMPORTS ===
import { renderSuperadminDashboard } from './superadmin/superadmin-dashboard.js';
import { renderSchoolManagement } from './superadmin/school-management.js';
import { renderUserManagement } from './superadmin/user-management.js';
import { renderComplianceCenter } from './superadmin/compliance.js';
import { renderBilling } from './superadmin/billing.js';
import { renderSettings } from './superadmin/settings.js';
import { renderPermissions } from './superadmin/permissions.js';
import { renderLogs } from './superadmin/logs.js';
// Add new imports as needed...

// === SUPERADMIN MODULE BARREL EXPORTS ===
export {
  renderSuperadminDashboard,
  renderSchoolManagement,
  renderUserManagement,
  renderComplianceCenter,
  renderBilling,
  renderSettings,
  renderPermissions,
  renderLogs,
  // Add new exports as needed...
};

// === SUPERADMIN NAVIGATION HANDLER ===
export function handleSuperadminNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'superadmin';

  switch ((page || '').toLowerCase()) {
    case 'dashboard':
      renderSuperadminDashboard(container);
      break;
    case 'schools':
      renderSchoolManagement(container);
      break;
    case 'users':
      renderUserManagement(container);
      break;
    case 'compliance':
      renderComplianceCenter(container);
      break;
    case 'billing':
      renderBilling(container);
      break;
    case 'settings':
      renderSettings(container);
      break;
    case 'permissions':
      renderPermissions(container);
      break;
    case 'logs':
      renderLogs(container);
      break;
    default:
      renderSuperadminDashboard(container);
      break;
  }
}

// --- Standalone hash route support ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#superadmin')) {
    const match = location.hash.match(/^#superadmin-([a-zA-Z]+)/);
    const page = match ? match[1] : 'dashboard';
    handleSuperadminNav(page);
  }
});

window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#superadmin')) return;
  const match = location.hash.match(/^#superadmin-([a-zA-Z]+)/);
  const page = match ? match[1] : 'dashboard';
  handleSuperadminNav(page);
});
