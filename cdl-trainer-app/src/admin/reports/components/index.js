// src/admin/reports/components/index.js
// ======================================================================
// Components Barrel (LIGHTWEIGHT)
// - Export only tiny, always-needed atoms/molecules
// - Keep heavy tables/dialogs out to avoid bloating initial bundles
//   (import those directly or via ./heavy.js)
// ======================================================================

export { default as ChecklistCard } from './ChecklistCard.jsx'
export { default as FiltersBar }    from './FiltersBar.jsx'
export { default as StatusPill }    from './StatusPill.jsx'

// Intentionally NOT exported here to keep the route light:
//   - UsersTable
//   - CompanyRosterTable
//   - ExportMenu
//   - BulkUploadDialog
//   - SubmitToTPRDialog
//   - CertPreview