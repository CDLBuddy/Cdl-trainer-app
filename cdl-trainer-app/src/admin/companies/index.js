// Path: src/admin/companies/index.js
// ======================================================================
// ADMIN • Companies (barrel)
// - Canonical re-exports for screens + components + hooks + services
// - Side-effect free & tree-shakable
// ======================================================================

// -- Screens -------------------------------------------------------------
export { default as AdminCompanies } from './AdminCompanies.jsx'
// Canonical detail screen lives in the new folder:
export { default as CompanyDetail } from './company-detail/CompanyDetail.jsx'

// Optionally surface the rest of the company-detail submodule (non-defaults)
export * from './company-detail'

// -- Submodule barrels ---------------------------------------------------
export * from './add-student' // AddStudentDrawer + related pieces
export * from './components' // CompaniesTable, CompanyRow, CompanyHeader, CompanyFilters, detail cards…
export * from './hooks' // useCompanies, useCompanyDetail*, useDebounced, etc.
export * from './services' // listCompaniesBySchool, exports, etc.
