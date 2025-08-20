// Path: src/admin/companies/add-student/index.js
// ============================================================================
// Admin • Companies • Add-Student (feature barrel)
// - Single entry point for the add-student drawer + internals
// - Side-effect free; safe for tree-shaking
// - Consumers can import either the high-level drawer or the parts
// ============================================================================

// Primary component
export { default as AddStudentDrawer } from './AddStudentDrawer.jsx'

// Submodule barrels
export * from './components'   // DrawerShell, FormActions, FormFields, OverlayChips
export * from './hooks'        // useAddStudentForm
export * from './services'     // any network/storage helpers used by the form
export * from './utils'        // validations, transforms, trapFocus, etc.
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