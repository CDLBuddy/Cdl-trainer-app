// Path: src/admin/dashboard/index.js
//=============================================
// Admin Dashboard public surface (no component re-exports here)

export { default as AdminDashboard } from './AdminDashboard.jsx'

// Data layer stays static
export * from './hooks'
export * as dashboardHooks from './hooks'

export * from './services'
export * as dashboardServices from './services'

export * from './utils'
export * as dashboardUtils from './utils'
