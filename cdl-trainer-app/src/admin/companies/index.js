// Path: src/admin/companies/index.js
// ======================================================================
// ADMIN • Companies (barrel)
// - Canonical re-exports for screens + components + hooks + services
// - Side-effect free & tree-shakable (keep JSX/CSS out of here)
// - Star-exports assume each submodule exposes only values (no side effects)
// ======================================================================

// -- Screens -------------------------------------------------------------
export { default as AdminCompanies } from './AdminCompanies.jsx'
export { default as CompanyDetail }  from './CompanyDetail.jsx'

// -- Submodule barrels ---------------------------------------------------
// Components: CompaniesTable, CompanyRow, CompanyHeader, CompanyFilters, detail cards, …
export * from './components'

// Hooks: useCompanies, useCompanyDetail, useCompanyDocuments, useCompanyNotes, useDebounced, …
export * from './hooks'

// Services: listCompaniesBySchool, addCompany, updateCompany, removeCompany, exports, …
export * from './services'

// Add-Student drawer suite:
// AddStudentDrawer, DrawerShell, FormFields, OverlayChips, utils (trapFocus, validate, …), services
export * from './add-student'

// ----------------------------------------------------------------------
// Usage examples:
//
// import { AdminCompanies, CompanyDetail } from '@admin/companies'
//
// import { CompaniesTable, CompanyFilters } from '@admin/companies'
// import { useCompanies } from '@admin/companies'
// import { listCompaniesBySchool } from '@admin/companies'
//
// import { AddStudentDrawer } from '@admin/companies'
// import { validate } from '@admin/companies' // from add-student/utils
// ----------------------------------------------------------------------