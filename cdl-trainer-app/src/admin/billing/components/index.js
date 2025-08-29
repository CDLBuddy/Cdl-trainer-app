// Path: src/admin/billing/components/index.js
// ======================================================================
// Billing • Components Barrel
// - Exposes StatusPill (via its own barrel for helpers too)
// - Groups Employer and Individual subcomponents
// ======================================================================

export { default as StatusPill } from './StatusPill/index.js'
export {
  EMPLOYER_STATUSES,
  getAllowedStatuses,
  INDIVIDUAL_STATUSES,
} from './StatusPill/index.js'

// Employer
export { default as EmployerFilters } from './Employer/EmployerFilters.jsx'
export { default as EmployerTab } from './Employer/EmployerTab.jsx'
export { default as EmployerTable } from './Employer/EmployerTable.jsx'

// Individual
export { default as IndividualFilters } from './Individual/IndividualFilters.jsx'
export { default as IndividualTab } from './Individual/IndividualTab.jsx'
export { default as IndividualTable } from './Individual/IndividualTable.jsx'
