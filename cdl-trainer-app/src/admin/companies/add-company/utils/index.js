// Path: src/admin/companies/add-company/utils/index.js
// ============================================================================
// Add-Company • Utils Barrel (pure)
// - Re-exports validations & transforms
// - Keep this file JS-only (no JSX/CSS) for fast HMR and tree-shaking
// - Stable surface so callers can import from a single path
//     import { validateCompany, EMAIL_RE, toCompanyPayload } from
//       '@admin/companies/add-company/utils'
// ============================================================================

export * from './transforms.js'
export * from './validations.js'

// No default export on purpose — named exports keep bundles lean.
