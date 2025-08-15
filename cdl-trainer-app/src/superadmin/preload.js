// src/superadmin/preload.js
// ======================================================================
// Superadmin preloader helpers (no React imports)
// - Call these on hover/idle/route-guard to warm page chunks
// - Kept separate to avoid react-refresh warnings in routers
// ======================================================================

/** Load the Superadmin Dashboard chunk. */
export async function preloadSuperadminDashboard() {
  await import('@superadmin/SuperAdminDashboard.jsx')
}

/** Load School Management. */
export async function preloadSuperadminSchools() {
  await import('@superadmin/SchoolManagement.jsx')
}

/** Load User Management. */
export async function preloadSuperadminUsers() {
  await import('@superadmin/UserManagement.jsx')
}

/** Load Compliance Center. */
export async function preloadSuperadminCompliance() {
  await import('@superadmin/ComplianceCenter.jsx')
}

/** Load Billing (if present). */
export async function preloadSuperadminBilling() {
  await import('@superadmin/Billings.jsx')
}

/** Load Settings. */
export async function preloadSuperadminSettings() {
  await import('@superadmin/Settings.jsx')
}

/** Load Logs. */
export async function preloadSuperadminLogs() {
  await import('@superadmin/Logs.jsx')
}

/** Load Permissions. */
export async function preloadSuperadminPermissions() {
  await import('@superadmin/Permissions.jsx')
}

/** Load Walkthrough Manager. */
export async function preloadSuperadminWalkthroughs() {
  await import('@superadmin/WalkthroughManager.jsx')
}

// ---------------- Grouped helpers ----------------

/**
 * Core nav seen most often by superadmins.
 * (Dashboard, Schools, Users, Compliance)
 */
export async function preloadSuperadminCore() {
  await Promise.allSettled([
    import('@superadmin/SuperAdminDashboard.jsx'),
    import('@superadmin/SchoolManagement.jsx'),
    import('@superadmin/UserManagement.jsx'),
    import('@superadmin/ComplianceCenter.jsx'),
  ])
}

/**
 * Admin/ops area commonly visited next.
 * (Settings, Logs, Permissions, Billing)
 */
export async function preloadSuperadminOps() {
  await Promise.allSettled([
    import('@superadmin/Settings.jsx'),
    import('@superadmin/Logs.jsx'),
    import('@superadmin/Permissions.jsx'),
    import('@superadmin/Billings.jsx'),
  ])
}

/** Everything (core + ops + walkthrough tooling). */
export async function preloadSuperadminAll() {
  await Promise.allSettled([
    // core
    import('@superadmin/SuperAdminDashboard.jsx'),
    import('@superadmin/SchoolManagement.jsx'),
    import('@superadmin/UserManagement.jsx'),
    import('@superadmin/ComplianceCenter.jsx'),
    // ops
    import('@superadmin/Settings.jsx'),
    import('@superadmin/Logs.jsx'),
    import('@superadmin/Permissions.jsx'),
    import('@superadmin/Billings.jsx'),
    // tooling
    import('@superadmin/WalkthroughManager.jsx'),
  ])
}