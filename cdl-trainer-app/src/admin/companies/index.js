// Path: src/admin/companies/index.js
// ======================================================================
// ADMIN • Companies (barrel)
// - Re-export screens and all submodules (tree-shakable)
// - Keep JSX/CSS out of here so Fast Refresh stays quick
// - NOTE: Star-exports below assume submodule barrels export only
//   functions/components (no side effects).
// ======================================================================

// -- Screens -------------------------------------------------------------
export { default as AdminCompanies } from './AdminCompanies.jsx'
export { default as CompanyDetail }  from './CompanyDetail.jsx'

// -- Submodule barrels ---------------------------------------------------
// Components: CompaniesTable, CompanyRow, CompanyHeader, CompanyFilters, ...
export * from './components'

// Hooks: useCompanies, ...
export * from './hooks'

// Services: listCompaniesBySchool, addCompany, updateCompany, ...
export * from './services'

// Add-Student drawer suite:
// AddStudentDrawer, DrawerShell, FormFields, OverlayChips,
// plus ./add-student/utils (trapFocus, validate, etc.) and services
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