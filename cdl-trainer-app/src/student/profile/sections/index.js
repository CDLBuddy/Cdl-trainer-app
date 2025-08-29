// src/student/profile/sections/index.js
// ======================================================================
// Profile Sections Barrel
// - Central export for all <...Section/> components used in the student profile
// - Keeps imports clean:  import { BasicInfoSection, VehicleSection } from './sections'
// - Adds optional `lazy` helpers for code-splitting if you ever need it
// - Re-exports SectionHeader for consistency across sections
// ======================================================================

// Eager (standard) exports
export { default as BasicInfoSection } from './BasicInfoSection.jsx'
export { default as CdlSection } from './CdlSection.jsx'
export { default as CoursePaymentSection } from './CoursePaymentSection.jsx'
export { default as EmergencySection } from './EmergencySection.jsx'
export { default as LicenseSection } from './LicenseSection.jsx'
export { default as MedicalSection } from './MedicalSection.jsx'
export { default as PermitSection } from './PermitSection.jsx'
export { default as VehicleSection } from './VehicleSection.jsx'
export { default as WaiverSection } from './WaiverSection.jsx'

// Shared UI used by every section
export { default as SectionHeader } from './SectionHeader.jsx'

// ----------------------------------------------------------------------
// Optional lazy helpers (tree-shakeable). Useful if you ever decide to
// split the Student Profile into per-section routes or lazy modals.
// Example usage:
//   const PermitSection = React.lazy(sections.lazy.PermitSection)
// ----------------------------------------------------------------------
export const lazy = {
  BasicInfoSection: () => import('./BasicInfoSection.jsx'),
  CdlSection: () => import('./CdlSection.jsx'),
  CoursePaymentSection: () => import('./CoursePaymentSection.jsx'),
  EmergencySection: () => import('./EmergencySection.jsx'),
  LicenseSection: () => import('./LicenseSection.jsx'),
  MedicalSection: () => import('./MedicalSection.jsx'),
  PermitSection: () => import('./PermitSection.jsx'),
  VehicleSection: () => import('./VehicleSection.jsx'),
  WaiverSection: () => import('./WaiverSection.jsx'),
}

// ----------------------------------------------------------------------
// Future sections can be added here without touching import sites.
// Example:
//   export { default as EmployerSection } from './EmployerSection.jsx'
//   lazy.EmployerSection = () => import('./EmployerSection.jsx')
// ----------------------------------------------------------------------
