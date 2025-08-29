// src/student/dashboard/hooks/index.js
// ======================================================================
// Dashboard Hooks Barrel (side-effect free)
// - Re-exports the enhanced useDashboardData hook
// - Keep this file minimal to preserve tree-shaking
// ======================================================================

/**
 * useDashboardData(options?)
 * See source for full JSDoc & return shape.
 */
export { useDashboardData } from './useDashboardData.js'

// Back-compat / convenience default export
export { useDashboardData as default } from './useDashboardData.js'
