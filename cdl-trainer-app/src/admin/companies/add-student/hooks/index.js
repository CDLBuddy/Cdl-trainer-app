// Path: src/admin/companies/add-student/hooks/index.js
// ============================================================================
// Hooks Barrel (Add Student)
// - Tree-shakeable named exports
// - Optional lazy() helpers for route/code-splitting
// - Side-effect free; safe to import anywhere
// ============================================================================

import useAddStudentForm from './useAddStudentForm.js'
import useInstructorOptions from './useInstructorOptions.js'

// ---- Named exports (preferred) --------------------------------------------
export { useAddStudentForm, useInstructorOptions }

// ---- Lazy loaders (optional code-splitting) -------------------------------
// Example usage:
//   const { useInstructorOptions } = await lazy.useInstructorOptions()
export const lazy = {
  useAddStudentForm: () => import('./useAddStudentForm.js'),
  useInstructorOptions: () => import('./useInstructorOptions.js'),
}

// ---- Convenient default bundle (useful in tests/scripts) ------------------
const hooks = Object.freeze({
  useAddStudentForm,
  useInstructorOptions,
  lazy,
})
export default hooks
