// Path: src/admin/companies/add-student/index.js
// ============================================================================
// Admin • Companies • Add-Student (feature barrel)
// - Single entry point for the add-student drawer + internals
// - Side-effect free; safe for tree-shaking
// - Namespaces + star re-exports for flexible importing
// ============================================================================

// Primary component (default export from the module)
export { default as AddStudentDrawer } from './AddStudentDrawer.jsx'

// ---- Submodule namespaces --------------------------------------------------
export * as components from './components/index.js'
export * as hooks from './hooks/index.js'
export * as services from './services/index.js'
export * as utils from './utils/index.js'

// ---- Tree-shakable star re-exports (ergonomic named imports) --------------
export * from './components/index.js' // DrawerShell, FormActions, FormFields, OverlayChips
export * from './hooks/index.js'      // useAddStudentForm, useInstructorList, useInstructorOptions
export * from './services/index.js'   // saveStudent, getInstructors, etc.
export * from './utils/index.js'      // validations, transforms, etc.

// ---- Optional lazy loader (for code splitting at call sites) --------------
export const lazy = {
  AddStudentDrawer: () => import('./AddStudentDrawer.jsx'),
  components: () => import('./components/index.js'),
  hooks: () => import('./hooks/index.js'),
  services: () => import('./services/index.js'),
  utils: () => import('./utils/index.js'),
}

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
//
// 4) Code-split:
//    const { AddStudentDrawer } = await (await lazy.AddStudentDrawer()).default
//    // or: const { default: AddStudentDrawer } = await lazy.AddStudentDrawer()
// ----------------------------------------------------------------------