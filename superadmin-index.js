// superadmin-index.js

// === SUPERADMIN MODULE BARREL IMPORTS ===
import { renderSuperadminDashboard } from './superadmin/superadmin-dashboard.js';
import { renderSchoolManagement } from './superadmin/school-management.js';
import { renderUserManagement } from './superadmin/user-management.js';
import { renderComplianceCenter } from './superadmin/compliance-center.js';
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

  // Route only via explicit role-prefixed route names!
  switch ((page || '').toLowerCase()) {
    case 'superadmin-dashboard':
      renderSuperadminDashboard(container);
      break;
    case 'superadmin-schools':
      renderSchoolManagement(container);
      break;
    case 'superadmin-users':
      renderUserManagement(container);
      break;
    case 'superadmin-compliance':
      renderComplianceCenter(container);
      break;
    case 'superadmin-billing':
      renderBilling(container);
      break;
    case 'superadmin-settings':
      renderSettings(container);
      break;
    case 'superadmin-permissions':
      renderPermissions(container);
      break;
    case 'superadmin-logs':
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
    const match = location.hash.match(/^#superadmin-([a-zA-Z-]+)/);
    const page = match ? `superadmin-${match[1]}` : 'superadmin-dashboard';
    handleSuperadminNav(page);
  }
});

window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#superadmin')) return;
  const match = location.hash.match(/^#superadmin-([a-zA-Z-]+)/);
  const page = match ? `superadmin-${match[1]}` : 'superadmin-dashboard';
  handleSuperadminNav(page);
});
