// src/admin/companies/add-student/services/index.js
// ======================================================================
// ADD STUDENT • Services Barrel (minimal, side-effect free)
// - Keep this surface area tight: only expose what the drawer / parent needs
// ======================================================================

export { default as saveStudent } from './saveStudent.js'

// ----------------------------------------------------------------------
// Usage example:
//   import { saveStudent } from '@admin/companies/add-student/services'
// ----------------------------------------------------------------------