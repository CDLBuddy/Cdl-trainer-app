// src/admin/reports/hooks/index.js
// ======================================================================
// Hooks Barrel (tree-shake friendly)
// - Re-export all hooks with explicit file extensions
// - Also re-export useful constants + prefetch helpers
// - No side-effects; safe to import anywhere
// ======================================================================

/** Top-level data loader: brand, users, companies, filters, refresh */
export { default as useReports } from './useReports.js'

/** Generate/download a PDF checklist (lazy jsPDF); also exports DOT_CHECKLIST */
export { default as useChecklistPdf } from './useChecklistPdf.js'
export { DOT_CHECKLIST } from './useChecklistPdf.js'

/** Fetch + filter roster for a company (by schoolId/companyId), with local search */
export { default as useCompanyRoster } from './useCompanyRoster.js'

/** Build a normalized ELDT completion payload for a student; flags `ready` */
export { default as useStudentCert } from './useStudentCert.js'

/** Submit 1..N completions to TPR (API/bulk/portal facade); exposes loading/error */
export { default as useTPRSubmit } from './useTPRSubmit.js'
export { prefetchTPRServices } from './useTPRSubmit.js' // warm mappers/validators/tprClient on idle/hover

/** Manage Bulk Upload dialog state + CSV parsing + normalization; exports headers */
export { default as useBulkUpload } from './useBulkUpload.js'
export { SAMPLE_HEADERS } from './useBulkUpload.js'

// Optional convenience namespace (kept named so it won’t affect tree-shaking)
export const hooks = null /* for IDE intellisense only; prefer named imports */