// Path: src/admin/companies/add-student/utils/index.js
// ======================================================================
// ADD STUDENT • Utils Barrel (pure, side-effect free)
// - Central export for form validations, transforms, and focus helpers
// - Star re-exports for ergonomics + namespaces for power users
// - Optional lazy() dynamic import helpers
// ======================================================================

// Focus management (default + any named exports)
export { default as trapFocus } from './trapFocus.js'
export * from './trapFocus.js'

// Validations (EMAIL_RE, validate, canSave, etc.)
export * from './validations.js'

// Transforms (toPayload, normalizeForm, etc.)
export * from './transforms.js'

// ---- Namespaces (useful when importing lots of helpers together) ----------
export * as validations from './validations.js'
export * as transforms from './transforms.js'

// ---- Optional lazy loaders (code-splitting friendly) ---------------------
export const lazy = {
  trapFocus: () => import('./trapFocus.js'),
  validations: () => import('./validations.js'),
  transforms: () => import('./transforms.js'),
}

// ---- Frozen default bundle (nice for tests or ad-hoc scripts) ------------
import * as transformsNS from './transforms.js'
import trapFocusDefault from './trapFocus.js'
import * as validationsNS from './validations.js'

const utils = Object.freeze({
  trapFocus: trapFocusDefault,
  validations: validationsNS,
  transforms: transformsNS,
  lazy,
})
export default utils

// ----------------------------------------------------------------------
// Usage:
//   import { validate, canSave, toPayload, trapFocus } from '@admin/companies/add-student/utils'
//   import { validations, transforms } from '@admin/companies/add-student/utils'
//   const { default: utils } = await lazy.validations()
// ----------------------------------------------------------------------