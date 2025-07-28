// superadmin-index.js

// === SUPERADMIN MODULE BARREL EXPORTS ===
export { renderSuperadminDashboard } from './superadmin-dashboard.js';
export { renderSchoolManagement } from './school-management.js';
export { renderUserManagement } from './user-management.js';
export { renderComplianceCenter } from './compliance.js';
export { renderBilling } from './billing.js';
export { renderSettings } from './settings.js';
export { renderPermissions } from './permissions.js';
export { renderLogs } from './logs.js';
// Add new exports as needed...

// === SUPERADMIN NAVIGATION HANDLER ===
export function handleSuperadminNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'superadmin';

  switch (page) {
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
  }
}

// --- (Optional) Standalone superadmin entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#superadmin')) {
    const match = location.hash.match(/^#superadmin-([a-zA-Z]+)/);
    const page = match ? match[1] : 'dashboard';
    handleSuperadminNav(page);
  }
});

// --- (Optional) Superadmin-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#superadmin')) return;
  const match = location.hash.match(/^#superadmin-([a-zA-Z]+)/);
  const page = match ? match[1] : 'dashboard';
  handleSuperadminNav(page);
});
