// src/student/profile/index.js
// ======================================================================
// Student Profile — Barrel Exports (side-effect free)
// - Import from '@student-profile' across the app
// - Re-exports main component, hook, sections, UI atoms
// - Also surfaces schema + calculators to avoid deep paths
// ======================================================================

// --- Main page/component ---
export { default as Profile } from './Profile.jsx'
export { default as StudentProfile } from './Profile.jsx' // friendly alias

// --- Hook (optional, realtime profile loader) ---
export { default as useProfileState } from './useProfileState.js'

// --- Form Sections (barrel re-export) ---
export {
  BasicInfoSection,
  CdlSection,
  CoursePaymentSection,
  EmergencySection,
  LicenseSection,
  MedicalSection,
  PermitSection,
  VehicleSection,
  WaiverSection,
} from './sections'

// --- UI Atoms/Molecules (barrel re-export) ---
export { Field, Select, UploadField, CheckboxGroup } from './ui'

// --- Schema + Calculators (single source of truth) ---
export { PROFILE_SCHEMA, TIERS } from './schema/profileSchema.js'
export {
  getEnrollmentReadiness,
  getBTWReadiness,
  getSectionStatus,
} from './schema/calculators.js'
