// src/student/dashboard/services/updatesApi.js
// ============================================================================
// Updates API (thin facade)
// - Prefer these re-exports over importing Firestore utils directly
// - Back-compat alias: getLatestUpdate → getLatestUpdateOnce
// - Easy to mock in tests or swap data source later
// ============================================================================

export {
  // Handy dev/test helper
  __clearDashboardCache,
  // Preferred modern APIs
  getLatestUpdateOnce,
  // Convenience re-exports (used by dashboard quick links / CTA)
  getResourcesForSchool,
  getSchedulerURL,
  loadDashboardSnapshot,
  subscribeLatestUpdate,
} from './dashboardApi.js'

// --- Back-compat alias -----------------------------------------------------
// Older hooks/components may still import { getLatestUpdate }.
// Keep it working by aliasing to the newer getLatestUpdateOnce.
export { getLatestUpdateOnce as getLatestUpdate } from './dashboardApi.js'
