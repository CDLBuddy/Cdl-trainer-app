// Path: src/admin/dashboard/index.js
// ======================================================================
// ADMIN • Dashboard (public surface)
// - Side-effect free: no runtime code, no JSX execution in this file
// - Exposes the screen, hooks, services, utils, and (optionally) components
// - Dual style: direct star exports + convenient namespaced exports
// ======================================================================

// Screen
export { default as AdminDashboard } from './AdminDashboard.jsx'

// Hooks
export * from './hooks'
export * as dashboardHooks from './hooks'

// Services
export * from './services'
export * as dashboardServices from './services'

// Utils
export * from './utils'
export * as dashboardUtils from './utils'

// Components (cards, rows, calendar widget, etc.)
export * from './components'
export * as dashboardComponents from './components'