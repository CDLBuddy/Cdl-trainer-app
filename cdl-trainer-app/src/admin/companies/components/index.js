// ======================================================================
// ADMIN • Companies • Components (barrel)
// - Canonical re-exports for company UI subcomponents
// - Keep this file JSX/CSS free so Fast Refresh stays quick
// ======================================================================

// Main parts
export { default as CompanyHeader }    from './CompanyHeader.jsx'
export { default as CompanyFilters }   from './CompanyFilters.jsx'
export { default as CompaniesTable }   from './CompaniesTable.jsx'

// Subcomponents
export { default as CompanyRow }       from './CompanyRow.jsx'

// ----------------------------------------------------------------------
// Usage:
//   import { CompanyHeader, CompaniesTable, CompanyRow }
//     from '@admin/companies/components'
// ----------------------------------------------------------------------