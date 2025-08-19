// src/admin/settings/hooks/subhooks/index.js
// ======================================================================
// Admin Settings — Subhooks Barrel
// - Centralized, tree-shakable exports for all settings subhooks
// - Keeps imports clean and consistent across the app
// ======================================================================

// Core sections
export { useBillingSettings }        from './useBillingSettings.js'
export { useBrandingSettings }       from './useBrandingSettings.js'
export { useComplianceSettings }     from './useComplianceSettings.js'
export { useCoursesSettings }        from './useCoursesSettings.js'
export { useNotificationsSettings }  from './useNotificationsSettings.js'
export { useUsersSettings }          from './useUsersSettings.js'

// Optional/advanced sections
export { useAuditSettings }          from './useAuditSettings.js'
export { useDataRetentionSettings }  from './useDataRetentionSettings.js'
export { useIntegrationsSettings }   from './useIntegrationsSettings.js'
export { useSecuritySettings }       from './useSecuritySettings.js'
export { useWebhooksSettings }       from './useWebhooksSettings.js'

// ----------------------------------------------------------------------
// Usage
//   import {
//     useBillingSettings,
//     useBrandingSettings,
//     useIntegrationsSettings,
//     // ...
//   } from '@admin/settings/hooks/subhooks'
// ----------------------------------------------------------------------