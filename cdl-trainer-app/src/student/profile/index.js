// src/student/profile/index.js
// ======================================================================
// PROFILE MODULE BARREL
// ----------------------------------------------------------------------
// This file re-exports the entire profile module so other parts of the
// app can import from '@student/profile' without worrying about paths.
// Keep it side-effect free (no JSX rendering here).
// ======================================================================

// --- Main page/component ---
export { default as Profile } from './Profile.jsx'

// --- Hooks ---
export { default as useProfileState } from './useProfileState.js'

// --- Form Sections ---
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

// --- UI Components (atoms/molecules) ---
export {
  Field,
  Select,
  UploadField,
  CheckboxGroup,
} from './ui'