// src/student/dashboard/index.js
// ======================================================================
// Student Dashboard Barrel (side-effect free)
// - Exports the page under both names for back-compat
// - Re-exports local components, hooks, services
// - Also surfaces link helpers (getResourcesForSchool, getSchedulerURL)
// ======================================================================

export { default as StudentDashboard } from './StudentDashboard.jsx'

// Local components (BannerNextSteps, KpiCard, QuickLinks, UpdatesCard, TipsRow)
export * from './components'

// Hooks (useDashboardData, etc.)
export * from './hooks'

// Services (dashboardApi, updatesApi)
export * from './services'

// Link helpers (runtime school overrides + defaults)
export * from './links.js'