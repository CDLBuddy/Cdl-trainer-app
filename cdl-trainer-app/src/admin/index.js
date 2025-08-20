// src/admin/index.js
// ============================================================================
// ADMIN BARREL (pure, tree-shakable)
// - Centralizes exports for admin pages and submodules
// - Keep JSX/CSS out of barrels to preserve Fast Refresh
// ============================================================================

// -- Pages / Views -----------------------------------------------------------
// Prefer importing from each module's own barrel when available.
// These direct exports remain for back-compat with older imports.
export { default as AdminDashboard } from './dashboard/AdminDashboard.jsx'
export { default as AdminProfile }   from './AdminProfile.jsx'

// Reports now lives under /reports (keep the direct export for compat)
export { default as AdminReports }   from './reports/AdminReports.jsx'
export * from './reports'            // sections/components/hooks/services (if any)

// -- Companies Suite ---------------------------------------------------------
// Prefer: import { AdminCompanies, CompanyDetail, AddStudentDrawer, AddCompanyDrawer } from '@admin/companies'
export { default as AdminCompanies } from './companies/AdminCompanies.jsx' // compat
export * from './companies'          // surfaces: AdminCompanies, CompanyDetail,
// add-student (drawer, hooks, utils), add-company (drawer, hooks, utils),
// components/hooks/services barrels

// -- Communications ----------------------------------------------------------
// Prefer: import { AdminCommunications, ... } from '@admin/communications'
export { default as AdminCommunications } from './communications/AdminCommunications.jsx' // compat
export * from './communications'    // components/hooks/services barrels

// -- Billing -----------------------------------------------------------------
// Prefer: import { Billing } from '@admin/billing'
export { default as AdminBilling }  from './billing/Billing.jsx' // compat
export * from './billing'           // components, hooks, services, utils

// -- Settings ----------------------------------------------------------------
// Prefer: import { AdminSettings, useBillingSettings, ... } from '@admin/settings'
export * from './settings'          // sections/hooks/services/utils

// -- UI Controls (standalone atoms used across admin) ------------------------
export { default as ExportUsersControls }     from './ExportUsersControls.jsx'
export { default as ExportCompaniesControls } from './ExportCompaniesControls.jsx'

// -- Walkthroughs (admin module) ---------------------------------------------
export * from './walkthroughs'

// -- Admin Utilities ----------------------------------------------------------
export * from './utils'

// -- Preload helpers ----------------------------------------------------------
export * from './preload.js'

// ---------------------------------------------------------------------------
// Optional legacy alias (soft transition). Uncomment if needed.
// export { default as AdminUsers } from './companies/AdminCompanies.jsx' // DEPRECATED: use AdminCompanies

// Optional convenience namespaces (opt-in):
// export * as Companies       from './companies'
// export * as Communications  from './communications'
// export * as BillingNS       from './billing'
// export { default as AdminRouter } from './AdminRouter.jsx'