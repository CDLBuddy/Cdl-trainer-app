// superadmin/index.js

import { renderSuperadminDashboard } from './superadmin-dashboard.js';
import { renderSchoolManagement } from './school-management.js';
import { renderUserManagement } from './user-management.js';
import { renderComplianceCenter } from './compliance-center.js';
import { renderBilling } from './billing.js';
import { renderSettings } from './settings.js';
import { renderPermissions } from './permissions.js';
import { renderLogs } from './logs.js';

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

export function handleSuperadminNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'superadmin';

  switch ((page || '').toLowerCase()) {
    case 'superadmin-dashboard':   return renderSuperadminDashboard(container);
    case 'superadmin-schools':     return renderSchoolManagement(container);
    case 'superadmin-users':       return renderUserManagement(container);
    case 'superadmin-compliance':  return renderComplianceCenter(container);
    case 'superadmin-billing':     return renderBilling(container);
    case 'superadmin-settings':    return renderSettings(container);
    case 'superadmin-permissions': return renderPermissions(container);
    case 'superadmin-logs':        return renderLogs(container);
    default:                       return renderSuperadminDashboard(container);
  }
}

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
