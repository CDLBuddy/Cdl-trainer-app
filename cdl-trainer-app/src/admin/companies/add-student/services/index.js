// Path: src/admin/companies/add-student/services/index.js
// -----------------------------------------------------------------------------
// Services Barrel for Add Student drawer
// - Clean imports: import { saveStudent, getInstructors } from './services'
// - Re-exports defaults AND any named helpers from leaf modules
// - Side-effect free; tree-shakeable
// -----------------------------------------------------------------------------

// Instructors
export { getInstructors } from './getInstructors.js'
export * from './getInstructors.js'

// Save student
export { default as saveStudent } from './saveStudent.js'
export * from './saveStudent.js'

// Optional code-splitting helpers (dynamic imports)
export const lazy = {
  saveStudent: () => import('./saveStudent.js'),
  getInstructors: () => import('./getInstructors.js'),
}