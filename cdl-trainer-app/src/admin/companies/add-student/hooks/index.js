// Path: src/admin/companies/add-student/hooks/index.js
// ============================================================================
// Hooks Barrel (Add Student)
// - Tree-shakeable named exports
// - Optional lazy() helpers for route/code-splitting
// - Side-effect free; safe to import anywhere
// ============================================================================

// Prefer direct re-exports to avoid eager evaluation + keep treeshaking crisp
export { default as useAddStudentForm } from './useAddStudentForm.js'
export * from './useAddStudentForm.js'

export { default as useInstructorOptions } from './useInstructorOptions.js'
export * from './useInstructorOptions.js'

export { default as useInstructorList } from './useInstructorList.js'
export * from './useInstructorList.js'

// ---- Lazy loaders (optional code-splitting) -------------------------------
// Example usage (in an async boundary):
//   const { default: useInstructorList } = await lazy.useInstructorList()
export const lazy = {
  useAddStudentForm: () => import('./useAddStudentForm.js'),
  useInstructorOptions: () => import('./useInstructorOptions.js'),
  useInstructorList: () => import('./useInstructorList.js'),
}

// ---- Convenient default bundle (useful in tests/scripts) ------------------
import useAddStudentForm from './useAddStudentForm.js'
import useInstructorList from './useInstructorList.js'
import useInstructorOptions from './useInstructorOptions.js'

const hooks = Object.freeze({
  useAddStudentForm,
  useInstructorOptions,
  useInstructorList,
  lazy,
})

export default hooks