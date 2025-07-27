// superadmin/index.js

import { renderSuperadminDashboard } from './superadmin-dashboard.js';
import { renderSchoolManagement } from './school-management.js';
import { renderUserManagement } from './user-management.js';
import { renderComplianceCenter } from './compliance.js';
import { renderBilling } from './billing.js';
import { renderSettings } from './settings.js';
import { renderPermissions } from './permissions.js';
import { renderLogs } from './logs.js';
// Add more as you grow...

export {
  renderSuperadminDashboard,
  renderSchoolManagement,
  renderUserManagement,
  renderComplianceCenter,
  renderBilling,
  renderSettings,
  renderPermissions,
  renderLogs,
  // Add new exports as you add features
};
