// /src/admin/companies/add-student/services/index.js
// -----------------------------------------------------------------------------
// Services Barrel for Add Student drawer
// - Keeps imports clean: import { saveStudent, getInstructors } from '../services'
// - Side-effect free; tree-shakeable
// -----------------------------------------------------------------------------

export { default as saveStudent } from './saveStudent.js'
export { getInstructors } from './getInstructors.js'

// Optional code-splitting helper
export const lazy = {
  saveStudent: () => import('./saveStudent.js'),
  getInstructors: () => import('./getInstructors.js'),
}
