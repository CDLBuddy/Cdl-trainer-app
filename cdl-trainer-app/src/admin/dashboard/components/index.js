// Path: src/admin/dashboard/components/index.js
// ======================================================================
// ADMIN • Dashboard Components (barrel)
// - Pure re-exports for UI building blocks used by AdminDashboard
// - Side-effect free (no runtime code, no JSX)
// - Tree-shakable: only imported symbols are bundled
// - Keep in sync with folder contents (see src/admin/dashboard/components/*)
// ======================================================================

// Core dashboard cards/widgets
export { default as ActivityFeed } from './ActivityFeed.jsx'
export { default as AdminSections } from './AdminSections.jsx'
export { default as AlertsCard } from './AlertsCard.jsx'
export { default as BillingSummary } from './BillingSummary.jsx'
export { default as CompaniesMiniTable } from './CompaniesMiniTable.jsx'
export { default as ComplianceRadar } from './ComplianceRadar.jsx'
export { default as InstructorScheduleCard } from './InstructorScheduleCard.jsx'
export { default as KpiRow } from './KpiRow.jsx'
export { default as QuickActions } from './QuickActions.jsx'
export { default as ReportsTiles } from './ReportsTiles.jsx'

// Calendar subsystem (export directly for convenience)
export { default as CalendarWidget } from './calendar/CalendarWidget.jsx'
export { default as EventEditor } from './calendar/EventEditor.jsx'
export { default as useCalendarEvents } from './calendar/useCalendarEvents.js'

// (Optional) namespace export if callers prefer grouped access:
// export * as calendar from './calendar'
