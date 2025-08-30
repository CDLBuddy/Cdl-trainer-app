// Path: src/admin/dashboard/components/calendar/index.js
// ======================================================================
// Admin • Dashboard • Calendar (barrel)
// - Canonical exports for widget, editor, and hook
// - Side-effect free & tree-shakeable
// - Includes optional lazy() helpers for code-splitting
// ======================================================================

// Defaults (compat)
export { default as CalendarWidget } from './CalendarWidget.jsx'
export { default as EventEditor } from './EventEditor.jsx'
export { default as useCalendarEvents } from './useCalendarEvents.js'

// Named mirrors (nice for tooling / refactors)
export { default as CalendarWidgetComponent } from './CalendarWidget.jsx'
export { default as EventEditorComponent } from './EventEditor.jsx'

// (Optional) Lazy loaders — example:
//   const { CalendarWidget } = await lazy.CalendarWidget();
export const lazy = {
  CalendarWidget: () => import('./CalendarWidget.jsx'),
  EventEditor: () => import('./EventEditor.jsx'),
  useCalendarEvents: () => import('./useCalendarEvents.js'),
}