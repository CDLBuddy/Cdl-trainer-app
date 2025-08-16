// src/admin/index.js
// ======================================================================
// ADMIN BARREL (pure)
// - Re-export admin pages & role-scoped UI bits
// - Keep this file side-effect free (no JSX execution, no lazy() calls)
// - Also re-export Walkthroughs & Utils barrels for convenience
// ======================================================================

// ---- Pages / Views ----------------------------------------------------
export { default as AdminDashboard } from './AdminDashboard.jsx'
export { default as AdminProfile }   from './AdminProfile.jsx'
export { default as AdminUsers }     from './AdminUsers.jsx'
export { default as AdminReports }   from './AdminReports.jsx'

// Companies suite (canonical file name retained: AdminCompanies.jsx)
export { default as AdminCompanies }  from './companies/AdminCompanies.jsx'
export { CompanyDetail, AddStudentDrawer } from './companies' // via barrel

// Billing (screen + barrel-friendly named exports)
export { default as AdminBilling } from './billing/Billing.jsx'
export * from './billing/index.js'  // safe if present; ignored if not

// ---- UI Controls (components only — safe for Fast Refresh) ------------
export { default as ExportUsersControls }     from './ExportUsersControls.jsx'
export { default as ExportCompaniesControls } from './ExportCompaniesControls.jsx'

// ---- Walkthroughs (admin module) -------------------------------------
// Consumers can: import { WalkthroughManager } from '@admin'
export * from './walkthroughs/index.js'

// ---- Admin Utilities --------------------------------------------------
// Re-exports enrollmentAssignments.js (and future utils)
export * from './utils/index.js'

// ---- Preload helpers (functions only; tree-shakable) ------------------
export * from './preload.js'

// ----------------------------------------------------------------------
// Notes:
// - Keep this barrel free of dynamic imports or runtime logic.
// - Routers should still lazy-load pages to preserve code-splitting.
// - The companies & billing barrels make it easy to import related bits:
//     import { AdminCompanies, CompanyDetail } from '@admin'
//     import { AdminBilling } from '@admin'
// ----------------------------------------------------------------------
