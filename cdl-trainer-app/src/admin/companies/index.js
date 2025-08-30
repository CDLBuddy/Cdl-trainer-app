// Path: src/admin/companies/index.js
// ======================================================================
// ADMIN • Companies (barrel)
// - Canonical re-exports for screens + components + hooks + services
// - Side-effect free & tree-shakable
// - Namespaces + star re-exports + optional lazy loaders
// ======================================================================

// -- Screens -------------------------------------------------------------
// Keep screens explicit to avoid circulars and make bundlers happy.
export { default as AdminCompanies } from './AdminCompanies.jsx'
export * from './AdminCompanies.jsx' // in case the screen exports helpers

export { default as CompanyDetail } from './company-detail/CompanyDetail.jsx'
export * from './company-detail/CompanyDetail.jsx'

// Surface the rest of the company-detail submodule (non-defaults)
export * as companyDetail from './company-detail/index.js'
export * from './company-detail/index.js'

// -- Submodule barrels (namespaces + star re-exports) --------------------
export * as addStudent from './add-student/index.js'
export * from './add-student/index.js' // AddStudentDrawer + related pieces

export * as components from './components/index.js'
export * from './components/index.js' // CompaniesTable, CompanyRow, etc.

export * as hooks from './hooks/index.js'
export * from './hooks/index.js' // useCompanies, useCompanyDetail*, etc.

export * as services from './services/index.js'
export * from './services/index.js' // listCompaniesBySchool, exports, etc.

// -- Optional lazy loaders (code-splitting friendly) ---------------------
export const lazy = {
  AdminCompanies: () => import('./AdminCompanies.jsx'),
  CompanyDetail: () => import('./company-detail/CompanyDetail.jsx'),

  companyDetail: () => import('./company-detail/index.js'),
  addStudent: () => import('./add-student/index.js'),
  components: () => import('./components/index.js'),
  hooks: () => import('./hooks/index.js'),
  services: () => import('./services/index.js'),
}