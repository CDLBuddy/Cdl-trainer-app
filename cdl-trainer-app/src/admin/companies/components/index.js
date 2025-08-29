// Path: src/admin/companies/components/index.js
// ======================================================================
// ADMIN • Companies • Components (barrel)
// - Canonical re-exports for company UI subcomponents
// - Side-effect free + tree-shakable (keep JSX/CSS out of here)
// - Keeps imports tidy across the app
// ======================================================================

// Core table & chrome
export { default as CompanyHeader } from './CompanyHeader.jsx'
export { default as CompanyFilters } from './CompanyFilters.jsx'
export { default as CompaniesTable } from './CompaniesTable.jsx'
export { default as CompanyRow } from './CompanyRow.jsx'

// Detail cards (Overview / Documents / Notes)
export * from './detail/index.js'

// ---------------------------------------------------------------------
// TEMP SHIMS (shared primitives)
// Re-export shared drawer primitives currently living under
// add-student/components. This gives both add-student and add-company
// a single canonical import path:
//
//   import { DrawerShell, OverlayChips } from '@admin/companies/components'
//
// Later, you can physically move these files into this folder without
// changing any imports elsewhere.
// ---------------------------------------------------------------------
export { default as DrawerShell } from '../add-student/components/DrawerShell.jsx'
export { default as OverlayChips } from '../add-student/components/OverlayChips.jsx'

// ---------------------------------------------------------------------
// Usage:
//   import { CompanyHeader, CompaniesTable, CompanyRow } from '@admin/companies/components'
//   import { CompanyOverviewCard } from '@admin/companies/components' // via detail barrel
//   import { DrawerShell } from '@admin/companies/components'         // shared primitive
// ---------------------------------------------------------------------
