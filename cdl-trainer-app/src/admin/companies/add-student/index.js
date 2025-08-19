// Path: src/admin/companies/add-student/index.js
// ======================================================================
// ADMIN • Companies • Add Student (barrel)
// - Canonical re-exports for the add-student drawer and submodules
// - Keep this file JSX/CSS free so Fast Refresh and tree-shaking stay snappy
// ======================================================================

// Main entry (UI)
export { default as AddStudentDrawer } from './AddStudentDrawer.jsx'

// Core parts (UI atoms specific to this drawer)
export { default as DrawerShell }  from './DrawerShell.jsx'
export { default as FormFields }   from './FormFields.jsx'
export { default as OverlayChips } from './OverlayChips.jsx'

// Hook (state & submit orchestration for the drawer)
export { default as useAddStudentForm } from './useAddStudentForm.js'

// Submodule barrels (pure functions only; safe to star-export)
export * from './utils'     // trapFocus, EMAIL_RE, validate, canSave, toPayload, etc.
export * from './services'  // saveStudent (and future service calls)

// Optional: CSS module
// ⚠️ Exporting styles from a barrel can make bundling slightly less optimal.
// If you want convenient imports, leave this on. If you prefer stricter
// code-splitting, import the CSS where it’s used instead.
// export { default as styles } from './AddStudentDrawer.module.css'

// ----------------------------------------------------------------------
// Usage examples:
//
// 1) Typical consumer:
//    import { AddStudentDrawer } from '@admin/companies/add-student'
//
// 2) Power user (compose your own shell / fields):
//    import { DrawerShell, FormFields, useAddStudentForm } from '@admin/companies/add-student'
//
// 3) Pure utilities/services:
//    import { validate, toPayload, saveStudent } from '@admin/companies/add-student'
// ----------------------------------------------------------------------