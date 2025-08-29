// Path: src/admin/hooks/index.js
// ======================================================================
// Admin • Hooks (barrel)
// - Single import surface for all Admin-level hooks
// - Keep **alphabetized**, side-effect free, and JS-only (no JSX)
// - Example:
//     import { useAdminDashboard, useRecentActivity, hookUtils } from '@admin/hooks'
// ======================================================================

// ---- Named exports (alphabetized) ------------------------------------
// Hooks barrel — static exports only (no lazy)
export { default as useAdminDashboard } from './useAdminDashboard.js'
export { default as useCompaniesSnapshot } from './useCompaniesSnapshot.js'
export { default as useDashboardAlerts } from './useDashboardAlerts.js'
export { default as useDashboardKpis } from './useDashboardKpis.js'
export { default as useRecentActivity } from './useRecentActivity.js'

// Subhooks (auth/metrics/users)
export * from './subhooks'

// Optional: local hook utilities (namespaced to avoid collisions)
// Usage: hookUtils.clampPct(...)
export * as hookUtils from './utils/index.js'

// ---- Notes ------------------------------------------------------------
// • Keep this file PURE (no runtime/side-effects) to preserve treeshaking
//   and Fast Refresh behavior.
// • When adding a new hook:
//     1) Name it `useSomething.js` in this folder (or a subfolder).
//     2) Export it here in alphabetical order.
// • Prefer named exports for subhooks; reserve default exports for the
//   primary, top-level hooks (dashboards, major features).
