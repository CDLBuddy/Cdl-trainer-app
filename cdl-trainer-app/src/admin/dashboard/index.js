// Path: src/admin/index.js
// Admin Barrel
// - Centralized exports for all admin-facing modules
// - Keeps imports clean in consumers:  import { AdminDashboard } from '@admin'
// ===============================================
export { default as AdminDashboard } from './AdminDashboard.jsx'
export * from './components'
export * from './hooks'
export * from './services'
export * from './utils'