// src/student/dashboard/services/index.js
// ============================================================================
// Dashboard Services Barrel
// - Re-export the primary APIs from `dashboardApi`
// - Keep a back-compat alias: `getLatestUpdate` → `getLatestUpdateOnce`
// - Provide an optional default namespace export
// ============================================================================

export {
  // Updates (one-shot + realtime)
  getLatestUpdateOnce,
  subscribeLatestUpdate,

  // Combined snapshot (updates + resources + scheduler)
  loadDashboardSnapshot,

  // Small dev helper
  __clearDashboardCache,

  // Resources / CTAs (used by QuickLinks & CTA button)
  getResourcesForSchool,
  getSchedulerURL,
} from './dashboardApi.js'

// ---- Back-compat -----------------------------------------------------------
// Some code may still import { getLatestUpdate }.
export { getLatestUpdateOnce as getLatestUpdate } from './dashboardApi.js'

// ---- Optional namespace export --------------------------------------------
// Enables: `import * as DashboardApi from '@student/dashboard/services'`
import * as DashboardApi from './dashboardApi.js'
export default DashboardApi