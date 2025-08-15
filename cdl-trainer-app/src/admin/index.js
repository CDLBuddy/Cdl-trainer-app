// ======================================================================
// ADMIN BARREL (pure)
// - Re-export admin pages & role-scoped UI bits
// - Keep this file side-effect free (no JSX execution, no lazy() calls)
// ======================================================================

// ---- Pages / Views ----------------------------------------------------
export { default as AdminDashboard } from './AdminDashboard.jsx'
export { default as AdminProfile }   from './AdminProfile.jsx'
export { default as AdminUsers }     from './AdminUsers.jsx'
export { default as AdminCompanies } from './AdminCompanies.jsx'
export { default as AdminReports }   from './AdminReports.jsx'
// export { default as AdminBilling } from './AdminBilling.jsx' // when added

// ---- UI Controls (components only — safe for Fast Refresh) ------------
export { default as ExportUsersControls }     from './ExportUsersControls.jsx'
export { default as ExportCompaniesControls } from './ExportCompaniesControls.jsx'

// ---- Preload helpers (side-effect free; functions only) ---------------
export * from './preload.js'

// ---- Optional barrels (uncomment when ready) --------------------------
// export * from './components'
// export * from '../hooks/useAdminData.js'
// export * from '../utils/admin-helpers.js'