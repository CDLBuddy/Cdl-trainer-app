// src/superadmin/index.jsx
// ===== SUPERADMIN BARREL (pure) =====
// Re-export page components for routing/import ergonomics.
// No lazy(), no route registrations, no side effects.

export { default as SuperAdminDashboard } from './SuperAdminDashboard.jsx'
export { default as SchoolManagement } from './SchoolManagement.jsx'
export { default as UserManagement } from './UserManagement.jsx'
export { default as ComplianceCenter } from './ComplianceCenter.jsx'
export { default as Billings } from './Billings.jsx'
export { default as Settings } from './Settings.jsx'
export { default as Logs } from './Logs.jsx'
export { default as Permissions } from './Permissions.jsx'

// Walkthroughs (custom/default script management per school)
export { default as WalkthroughManager } from './WalkthroughManager.jsx'

// Optional re-exports (uncomment if/when these exist)
// export * from '../hooks/useSuperadminData.js'
// export * from '../utils/superadmin-helpers.js'
// export * from './components/index.js'