// src/student/profile/ui/index.js
// ======================================================================
// Student Profile UI — Barrel Exports
// - Side-effect free (safe for tree-shaking)
// - Keep imports tidy across the app
// - Add new atoms/molecules here as they’re created
// ======================================================================

// Atoms / controls
export { default as CheckboxGroup } from './CheckboxGroup.jsx'
export { default as Field } from './Field.jsx'
export { default as Select } from './Select.jsx'
export { default as UploadField } from './UploadField.jsx'

// Note: CSS modules are imported where used; not exported from the barrel.
