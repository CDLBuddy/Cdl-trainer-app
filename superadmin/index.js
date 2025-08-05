// superadmin/index.js

// === SUPERADMIN MODULE BARREL IMPORTS ===
import { renderSuperadminDashboard }   from './superadmin-dashboard.js';
import { renderSchoolManagement }      from './school-management.js';
import { renderUserManagement }        from './user-management.js';
import { renderComplianceCenter }      from './compliance-center.js';
import { renderBilling }               from './billing.js';
import { renderSettings }              from './settings.js';
import { renderPermissions }           from './permissions.js';
import { renderLogs }                  from './logs.js';

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
};

/**
 * Main SPA Navigation for Superadmin.
 * @param {string} page - Page key (e.g., 'superadmin-dashboard')
 * @param {...any} args - Optional: [container]
 */
export function handleSuperadminNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'superadmin';

  // Defensive: Scroll to top on navigation (SPA feel)
  if (container && container.scrollIntoView) container.scrollIntoView({ behavior: 'smooth' });

  switch ((page || '').toLowerCase()) {
    case 'superadmin-dashboard':
      document.title = 'Super Admin Dashboard - CDL Trainer';
      return renderSuperadminDashboard(container);
    case 'superadmin-schools':
      document.title = 'School Management - CDL Trainer';
      return renderSchoolManagement(container);
    case 'superadmin-users':
      document.title = 'User Management - CDL Trainer';
      return renderUserManagement(container);
    case 'superadmin-compliance':
      document.title = 'Compliance Center - CDL Trainer';
      return renderComplianceCenter(container);
    case 'superadmin-billing':
      document.title = 'Billing & Licensing - CDL Trainer';
      return renderBilling(container);
    case 'superadmin-settings':
      document.title = 'Platform Settings - CDL Trainer';
      return renderSettings(container);
    case 'superadmin-permissions':
      document.title = 'Permissions - CDL Trainer';
      return renderPermissions(container);
    case 'superadmin-logs':
      document.title = 'Audit Logs - CDL Trainer';
      return renderLogs(container);
    default:
      document.title = 'Super Admin Dashboard - CDL Trainer';
      return renderSuperadminDashboard(container);
  }
}

// --- SPA Routing: On initial load and browser nav ---
function navFromHash() {
  const hash = location.hash.toLowerCase();
  if (!hash.startsWith('#superadmin')) return;
  const match = hash.match(/^#superadmin-([a-z\-]+)/);
  const page = match ? `superadmin-${match[1]}` : 'superadmin-dashboard';
  handleSuperadminNav(page);
}

window.addEventListener('DOMContentLoaded', navFromHash);
window.addEventListener('popstate', navFromHash);