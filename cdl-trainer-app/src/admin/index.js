// Path: /src/admin/index.js
// ============================================================================
// ADMIN BARREL (side-effect free, SSR-safe, tree-shakable)
// - Centralizes exports for admin pages and submodules
// - For *new* code prefer importing from each module’s own barrel
//   (e.g. `@admin/reports`) for cleaner trees + faster HMR.
// - Direct page exports are kept for back-compat with older imports.
// ============================================================================

// ---------- Pages / Views (compat) ------------------------------------------
export { default as AdminDashboard }      from './dashboard/AdminDashboard.jsx'
export { default as AdminProfile }        from './AdminProfile.jsx'
export { default as AdminReports }        from './reports/AdminReports.jsx'
export { default as AdminCompanies }      from './companies/AdminCompanies.jsx'
export { default as AdminCommunications } from './communications/AdminCommunications.jsx'
export { default as AdminBilling }        from './billing/Billing.jsx'

// ---------- Preferred submodule barrels ------------------------------------
// These surface components, hooks, services, utils, and prefetch helpers.
export * from './reports'
export * from './companies'
export * from './communications'
export * from './billing'
export * from './settings'
export * from './walkthroughs'
export * from './utils'

// ---------- Preload helpers (canonical top-level access) -------------------
export * from './preload.js'

// ---------- Optional conveniences (opt-in) ---------------------------------
// Uncomment as needed during migrations.
// export { default as AdminRouter } from './AdminRouter.jsx' // Router (code-split host)
// export * as CompaniesNS      from './companies'
// export * as CommunicationsNS from './communications'
// export * as BillingNS        from './billing'
// export * as ReportsNS        from './reports'