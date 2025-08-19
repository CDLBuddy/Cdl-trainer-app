// src/admin/companies/add-student/utils/index.js
// ======================================================================
// ADD STUDENT • Utils Barrel (pure, side-effect free)
// - Central export for form validations, transforms, and focus helpers
// - Keep exports small + stable; avoid leaking private helpers
// ======================================================================

// Focus management
export { default as trapFocus } from './trapFocus.js'

// Validations (EMAIL_RE, validate, canSave, etc.)
export * from './validations.js'

// Transforms (toPayload, normalizeForm, etc.)
export * from './transforms.js'

// ----------------------------------------------------------------------
// Usage:
//   import { validate, canSave, toPayload, trapFocus } 
//     from '@admin/companies/add-student/utils'
// ----------------------------------------------------------------------