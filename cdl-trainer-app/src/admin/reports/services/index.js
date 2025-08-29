// src/admin/reports/services/index.js
// ======================================================================
// Services Barrel (hybrid)
// - Tree-shakeable named re-exports for new code paths
// - Keeps namespaced exports + lazy() helpers for back-compat
// - Side-effect free; safe to import anywhere
// - Includes tiny stubs for useStudentCert() optional helpers
// ======================================================================

/** ----------------------------------------------------------------------
 * Editor hinting (no runtime cost):
 * These typedefs pull strong types from the canonical ELDT domain module.
 * -------------------------------------------------------------------- */
/** @typedef {import('@/types/eldt').TPRCompletion} TPRCompletion */
/** @typedef {import('@/types/eldt').ProgramType} ProgramType */
/** @typedef {import('@/types/eldt').ClassType} ClassType */
/** @typedef {import('@/types/eldt').Endorsement} Endorsement */
/** @typedef {import('@/types/eldt').TprCsvRow} TprCsvRow */

// ---- Namespaced imports (for default bundle + back-compat) --------------
import * as exporters from './exporters.js'
import * as fieldMaps from './fieldMaps.js'
import * as mappers from './mappers.js'
import * as reportsApi from './reportsApi.js'
import * as tprClient from './tprClient.js'
import * as validators from './validators.js'

// ---- Tree-shakeable named re-exports (preferred) ------------------------
export {
  loadReportsBundle,
  normalizeUser,
  normalizeCompany,
} from './reportsApi.js'

export { toTPRCompletion, toTPRCompletions } from './mappers.js'

export {
  validateTPRPayload,
  validateTPRPayloads,
  assertValidTPRPayload,
} from './validators.js'

export { toCSV, toJSON } from './exporters.js'

export {
  submitCompletion,
  bulkUpload,
  providerId,
  mode,
  canSubmitViaApi,
  validateProviderConfig,
} from './tprClient.js'

// ---- Optional helpers for useStudentCert() -------------------------------
// If you later add real implementations, export them from another module
// and re-export here instead of these no-op stubs.
export async function loadProviderProfile(_schoolId) {
  return {}
}
export async function loadStudentTraining(_studentId, _opts = {}) {
  return {}
}

// ---- Back-compat namespace exports --------------------------------------
export { reportsApi, tprClient, fieldMaps, mappers, validators, exporters }

// ---- Code-splitting helpers (unchanged) ----------------------------------
export const lazy = {
  reportsApi: () => import('./reportsApi.js'),
  tprClient: () => import('./tprClient.js'),
  fieldMaps: () => import('./fieldMaps.js'),
  mappers: () => import('./mappers.js'),
  validators: () => import('./validators.js'),
  exporters: () => import('./exporters.js'),
}

// ---- Convenient default bundle (useful in tests/scripts) -----------------
const services = Object.freeze({
  reportsApi,
  tprClient,
  fieldMaps,
  mappers,
  validators,
  exporters,
  lazy,
  // also surface stubs on default for convenience in tests
  loadProviderProfile,
  loadStudentTraining,
})
export default services
