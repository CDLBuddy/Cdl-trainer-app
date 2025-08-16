// src/student/profile/schema/profileSchema.js
// ============================================================================
// Profile Schema (single source of truth)
// - Defines every field in the student profile, who owns it, when it’s required
// - Drives UI rendering, validation, and readiness calculations
// - Pure config (no side effects)
// ============================================================================

/**
 * @typedef {Object} ProfileField
 * @property {string} key - The key stored in Firestore under the student doc
 * @property {"text"|"date"|"fileUrl"|"enum"|"multi"|"tel"|"boolean"|"string"|"select"} type
 * @property {"student"|"admin"} owner - Who is responsible for filling this field
 * @property {Array<"enrollment"|"btw">} requiredIn - Which readiness tiers require this field
 * @property {number} weight - Weight (importance) for readiness %
 * @property {boolean} [readOnly] - If true, student cannot edit
 * @property {Object} [validate] - Simple validation hints (pattern, image, maxMB, future)
 * @property {Object} [requiredWhen] - Conditional requirement { otherKey: value }
 * @property {Object} [visibleWhen] - Conditional visibility { keyPath: value }
 * @property {string} [label] - Friendly label for UI
 */

/**
 * Profile schema: grouped by section.
 * Each section is an array of ProfileField objects.
 */
export const PROFILE_SCHEMA = {
  basicInfo: [
    {
      key: "name",
      type: "text",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 3,
      label: "Full Name",
    },
    {
      key: "dob",
      type: "date",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 3,
      validate: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
      label: "Date of Birth",
    },
    {
      key: "profilePicUrl",
      type: "fileUrl",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 2,
      validate: { image: true, maxMB: 8 },
      label: "Profile Picture",
    },
  ],

  cdlInfo: [
    // READ-ONLY: admin owns
    {
      key: "cdlClass",
      type: "select",
      owner: "admin",
      requiredIn: ["enrollment"],
      weight: 3,
      readOnly: true,
    },
    {
      key: "overlays",
      type: "multi",
      owner: "admin",
      requiredIn: [],
      weight: 0,
      readOnly: true,
      visibleWhen: {},
    },
  ],

  permit: [
    {
      key: "cdlPermit",
      type: "enum",
      owner: "student",
      requiredIn: ["btw"],
      weight: 2,
    },
    {
      key: "permitPhotoUrl",
      type: "fileUrl",
      owner: "student",
      requiredIn: ["btw"],
      requiredWhen: { cdlPermit: "yes" },
      weight: 3,
      validate: { image: true, maxMB: 8 },
    },
    {
      key: "permitExpiry",
      type: "date",
      owner: "student",
      requiredIn: ["btw"],
      requiredWhen: { cdlPermit: "yes" },
      weight: 1,
      validate: { future: true },
    },
  ],

  license: [
    {
      key: "driverLicenseUrl",
      type: "fileUrl",
      owner: "student",
      requiredIn: ["btw"],
      weight: 3,
      validate: { image: true, maxMB: 8 },
    },
    {
      key: "licenseExpiry",
      type: "date",
      owner: "student",
      requiredIn: ["btw"],
      weight: 1,
      validate: { future: true },
    },
  ],

  medical: [
    {
      key: "medicalCardUrl",
      type: "fileUrl",
      owner: "student",
      requiredIn: ["btw"],
      weight: 3,
      validate: { image: true, maxMB: 8 },
    },
    {
      key: "medCardExpiry",
      type: "date",
      owner: "student",
      requiredIn: ["btw"],
      weight: 1,
      validate: { future: true },
    },
  ],

  vehicle: [
    {
      key: "vehicleQualified",
      type: "enum",
      owner: "student",
      requiredIn: [],
      weight: 0,
    },
    {
      key: "truckPlateUrl",
      type: "fileUrl",
      owner: "student",
      requiredIn: ["btw"],
      requiredWhen: { vehicleQualified: "yes" },
      weight: 1,
      validate: { image: true, maxMB: 8 },
    },
    {
      key: "trailerPlateUrl",
      type: "fileUrl",
      owner: "student",
      requiredIn: ["btw"],
      requiredWhen: { vehicleQualified: "yes" },
      weight: 1,
      validate: { image: true, maxMB: 8 },
    },
  ],

  emergency: [
    {
      key: "emergencyName",
      type: "text",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 2,
    },
    {
      key: "emergencyPhone",
      type: "tel",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 2,
      validate: { pattern: /^[0-9\-()+ ]{10,15}$/ },
    },
    {
      key: "emergencyRelation",
      type: "text",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 1,
    },
  ],

  waiver: [
    {
      key: "waiverSigned",
      type: "boolean",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 2,
    },
    {
      key: "waiverSignature",
      type: "string",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 1,
    },
  ],

  payment: [
    {
      key: "paymentStatus",
      type: "enum",
      owner: "admin",
      requiredIn: ["enrollment"],
      weight: 2,
      visibleWhen: { "billing.mode": "individual" }, // hidden if employer
    },
    {
      key: "paymentProofUrl",
      type: "fileUrl",
      owner: "student",
      requiredIn: ["enrollment"],
      weight: 1,
      visibleWhen: { "billing.mode": "individual", paymentStatus: "paid" },
    },
  ],

  assignments: [
    {
      key: "assignedInstructor",
      type: "text",
      owner: "admin",
      requiredIn: [],
      weight: 0,
      readOnly: true,
    },
  ],
};

/**
 * Tiers: which sections belong to enrollment vs behind-the-wheel
 */
export const TIERS = {
  enrollment: ["basicInfo", "emergency", "cdlInfo", "waiver", "payment"],
  btw: ["permit", "license", "medical", "vehicle"],
};
