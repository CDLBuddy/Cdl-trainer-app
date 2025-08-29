// ============================================================================
// Profile Schema (single source of truth)
// - Drives Student UI + Admin flows + readiness calculators
// - No side effects; pure config
// ============================================================================

/**
 * @typedef {Object} ProfileField
 * @property {string} key                           // path on the student doc (supports dotted paths)
 * @property {"text"|"date"|"fileUrl"|"enum"|"multi"|"tel"|"boolean"|"string"|"select"} type
 * @property {"student"|"admin"} owner              // who edits this field
 * @property {Array<"enrollment"|"btw">} requiredIn // tiers where this is considered by calculators
 * @property {number} [weight=1]                    // relative importance *within* core/extra cluster
 * @property {"core"|"extra"} [importance="core"]   // core contributes to the first 80%, extra to last 20%
 * @property {boolean} [readOnly]
 * @property {Object} [validate]                    // { pattern?:RegExp, image?:boolean, maxMB?:number, future?:boolean }
 * @property {Object} [requiredWhen]                // conditional requirement gate
 * @property {Object} [visibleWhen]                 // conditional visibility gate
 * @property {string} [label]                       // friendly label for UI
 */

export const PROFILE_SCHEMA = {
  /* ------------------------------ Basic Info ------------------------------ */
  basicInfo: [
    {
      key: 'name',
      type: 'text',
      owner: 'student',
      requiredIn: ['enrollment'],
      weight: 1,
      importance: 'core',
      label: 'Full Name',
    },
    {
      key: 'dob',
      type: 'date',
      owner: 'student',
      requiredIn: ['enrollment'],
      weight: 1,
      importance: 'core',
      validate: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
      label: 'Date of Birth',
    },
    // Optional in UI → mark as extra so it counts toward the 20% bucket, not the 80% core
    {
      key: 'profilePicUrl',
      type: 'fileUrl',
      owner: 'student',
      requiredIn: ['enrollment'],
      weight: 1,
      importance: 'extra',
      validate: { image: true, maxMB: 8 },
      label: 'Profile Picture',
    },
  ],

  /* --------------------------- CDL (Admin-owned) -------------------------- */
  cdlInfo: [
    {
      key: 'course',
      type: 'text',
      owner: 'admin',
      requiredIn: ['enrollment'],
      weight: 1,
      importance: 'core',
      readOnly: true,
      label: 'Course',
    },
    {
      key: 'cdlClass',
      type: 'select',
      owner: 'admin',
      requiredIn: ['enrollment'],
      weight: 1,
      importance: 'core',
      readOnly: true,
      label: 'CDL Class',
    },
    {
      key: 'overlays',
      type: 'multi',
      owner: 'admin',
      requiredIn: [], // does not affect readiness
      weight: 0,
      importance: 'extra',
      readOnly: true,
      label: 'Overlays / Restrictions',
    },
  ],

  /* ------------------------------- Permit (BTW) --------------------------- */
  permit: [
    {
      key: 'cdlPermit',
      type: 'enum', // 'yes' | 'no'
      owner: 'student',
      requiredIn: ['btw'],
      weight: 1,
      importance: 'core',
      label: 'Has CDL Permit',
    },
    {
      key: 'permitPhotoUrl',
      type: 'fileUrl',
      owner: 'student',
      requiredIn: ['btw'],
      requiredWhen: { cdlPermit: 'yes' },
      weight: 1,
      importance: 'core',
      validate: { image: true, maxMB: 8 },
      label: 'Permit Photo',
    },
    {
      key: 'permitExpiry',
      type: 'date',
      owner: 'student',
      requiredIn: ['btw'],
      requiredWhen: { cdlPermit: 'yes' },
      weight: 1,
      importance: 'core',
      validate: { future: true },
      label: 'Permit Expiration',
    },
  ],

  /* ------------------------------ License (BTW) --------------------------- */
  license: [
    {
      key: 'driverLicenseUrl',
      type: 'fileUrl',
      owner: 'student',
      requiredIn: ['btw'],
      weight: 1,
      importance: 'core',
      validate: { image: true, maxMB: 8 },
      label: 'Driver License Image',
    },
    {
      key: 'licenseExpiry',
      type: 'date',
      owner: 'student',
      requiredIn: ['btw'],
      weight: 1,
      importance: 'core',
      validate: { future: true },
      label: 'License Expiration',
    },
  ],

  /* ------------------------------ Medical (BTW) --------------------------- */
  medical: [
    {
      key: 'medicalCardUrl',
      type: 'fileUrl',
      owner: 'student',
      requiredIn: ['btw'],
      weight: 1,
      importance: 'core',
      validate: { image: true, maxMB: 8 },
      label: 'Medical Card Image',
    },
    {
      key: 'medCardExpiry',
      type: 'date',
      owner: 'student',
      requiredIn: ['btw'],
      weight: 1,
      importance: 'core',
      validate: { future: true },
      label: 'Medical Card Expiration',
    },
  ],

  /* ------------------------------ Vehicle (BTW) --------------------------- */
  vehicle: [
    {
      key: 'vehicleQualified',
      type: 'enum', // 'yes' | 'no'
      owner: 'student',
      requiredIn: ['btw'], // considered by calculators, but marked extra
      weight: 1,
      importance: 'extra',
      label: 'Uses Own Vehicle',
    },
    {
      key: 'truckPlateUrl',
      type: 'fileUrl',
      owner: 'student',
      requiredIn: ['btw'],
      requiredWhen: { vehicleQualified: 'yes' },
      weight: 1,
      importance: 'extra', // nice-to-have docs if they bring a vehicle
      validate: { image: true, maxMB: 8 },
      label: 'Truck Data Plate',
    },
    {
      key: 'trailerPlateUrl',
      type: 'fileUrl',
      owner: 'student',
      requiredIn: ['btw'],
      requiredWhen: { vehicleQualified: 'yes' },
      weight: 1,
      importance: 'extra',
      validate: { image: true, maxMB: 8 },
      label: 'Trailer Data Plate',
    },
  ],
}
