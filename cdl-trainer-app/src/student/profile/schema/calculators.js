// src/student/profile/schema/calculators.js
// ============================================================================
// Readiness Calculators (pure helpers; no side effects)
// - Works off PROFILE_SCHEMA + TIERS
// - Visibility + conditional requirement logic
// - Simple validators (pattern, future date, image-ish URL)
// ============================================================================

import { PROFILE_SCHEMA, TIERS } from "./profileSchema.js";

/**
 * Safely read a nested value from an object via a dotted path.
 * @param {object} obj
 * @param {string} path e.g. "billing.mode"
 * @returns {any}
 */
function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

/**
 * Does the profile satisfy a simple equality map like { keyPath: value }?
 * @param {object} profile
 * @param {Record<string, any>} cond
 */
function satisfiesCond(profile, cond = {}) {
  for (const [k, v] of Object.entries(cond)) {
    if (getByPath(profile, k) !== v) return false;
  }
  return true;
}

/**
 * Evaluate field visibility based on visibleWhen (if present).
 * Absent visibleWhen => visible.
 * @param {object} profile
 * @param {import("./profileSchema.js").ProfileField} field
 */
function isFieldVisible(profile, field) {
  if (!field.visibleWhen) return true;
  return satisfiesCond(profile, field.visibleWhen);
}

/**
 * Evaluate whether the field is required for this tier, considering requiredWhen.
 * @param {object} profile
 * @param {import("./profileSchema.js").ProfileField} field
 * @param {"enrollment"|"btw"} tier
 */
function isFieldRequiredForTier(profile, field, tier) {
  if (!field.requiredIn || !field.requiredIn.includes(tier)) return false;
  if (field.requiredWhen && !satisfiesCond(profile, field.requiredWhen)) {
    return false;
  }
  return true;
}

/**
 * Simple validator suite for readiness counting.
 * - pattern: RegExp test
 * - future: date must be strictly in the future (today invalid)
 * - image: rough check that string looks like an image URL
 * - maxMB: N/A at readiness time (size unknown for a URL) — only presence checked
 * @param {any} value
 * @param {object} validate
 */
function passesValidate(value, validate = {}) {
  if (value == null || value === "") return false;

  // pattern (for text / tel / string / date)
  if (validate.pattern && typeof value === "string") {
    try {
      if (!validate.pattern.test(value)) return false;
    } catch {
      // ignore invalid regex in config; treat as pass
    }
  }

  // future date (accepts Date, timestamp, or YYYY-MM-DD ISO-ish string)
  if (validate.future) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(+d)) return false;
    const today = new Date();
    // strip time for both
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const tDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!(dDay > tDay)) return false;
  }

  // image: heuristic for url-ish with image extension or data URL
  if (validate.image && typeof value === "string") {
    const looksLikeImage =
      /^data:image\//.test(value) ||
      /\.(png|jpe?g|webp|gif|bmp|heic|heif|tiff?)$/i.test(value);
    if (!looksLikeImage) return false;
  }

  // maxMB cannot be validated from URL — ignore here.
  return true;
}

/**
 * Determine if a field "counts" toward readiness:
 * - Visible
 * - Required for the current tier (and requiredWhen satisfied)
 * - Value present and passes simple validators
 * @param {object} profile
 * @param {import("./profileSchema.js").ProfileField} field
 * @param {"enrollment"|"btw"} tier
 */
function fieldCounts(profile, field, tier) {
  if (!isFieldVisible(profile, field)) return false;
  if (!isFieldRequiredForTier(profile, field, tier)) return false;
  const value = getByPath(profile, field.key) ?? profile?.[field.key]; // prefer dotted path, then root fallback
  // Simple truthy or validator-based check
  if (field.validate) return passesValidate(value, field.validate);
  return !(value == null || value === "");
}

/**
 * Get all fields for the given sections.
 * @param {string[]} sections
 */
function fieldsForSections(sections) {
  /** @type {Array<{sectionKey:string, field:import("./profileSchema.js").ProfileField}>} */
  const out = [];
  for (const sectionKey of sections) {
    const arr = PROFILE_SCHEMA[sectionKey] || [];
    for (const f of arr) out.push({ sectionKey, field: f });
  }
  return out;
}

/**
 * Sum of weights of all required-visible fields for a tier.
 * @param {"enrollment"|"btw"} tier
 * @param {object} profile
 */
function totalWeightForTier(tier, profile) {
  const sections = tier === "enrollment" ? TIERS.enrollment : TIERS.btw;
  let total = 0;
  for (const { field } of fieldsForSections(sections)) {
    if (isFieldVisible(profile, field) && isFieldRequiredForTier(profile, field, tier)) {
      total += Number(field.weight || 0);
    }
  }
  return total || 0;
}

/**
 * Sum of weights of fields that "count" for the tier.
 * @param {"enrollment"|"btw"} tier
 * @param {object} profile
 */
function achievedWeightForTier(tier, profile) {
  const sections = tier === "enrollment" ? TIERS.enrollment : TIERS.btw;
  let total = 0;
  for (const { field } of fieldsForSections(sections)) {
    if (fieldCounts(profile, field, tier)) {
      total += Number(field.weight || 0);
    }
  }
  return total || 0;
}

/**
 * Compute percentage readiness for a tier (0–100 integer).
 * @param {object} profile
 * @param {typeof PROFILE_SCHEMA} [schema]
 * @param {typeof TIERS} [tiers]
 */
export function getEnrollmentReadiness(profile, _schema = PROFILE_SCHEMA, _tiers = TIERS) {
  // schema/tiers accepted for signature parity; we use module-level constants
  const total = totalWeightForTier("enrollment", profile);
  if (total === 0) return 0;
  const done = achievedWeightForTier("enrollment", profile);
  return Math.round((done / total) * 100);
}

/**
 * Compute percentage readiness for Behind-the-Wheel (0–100 integer).
 * @param {object} profile
 * @param {typeof PROFILE_SCHEMA} [schema]
 * @param {typeof TIERS} [tiers]
 */
export function getBTWReadiness(profile, _schema = PROFILE_SCHEMA, _tiers = TIERS) {
  const total = totalWeightForTier("btw", profile);
  if (total === 0) return 0;
  const done = achievedWeightForTier("btw", profile);
  return Math.round((done / total) * 100);
}

/**
 * Determine per-section status across BOTH tiers:
 * - 'missing' if any required+visible field in that section is not satisfied
 * - 'pending-verify' if all required+visible fields are satisfied but not verified
 * - 'complete' if all required+visible fields are satisfied AND verified[sectionKey] === true
 * @param {string} sectionKey
 * @param {object} profile
 * @param {Record<string, any>} [verifiedObj]
 * @returns {'complete'|'missing'|'pending-verify'}
 */
export function getSectionStatus(sectionKey, profile, verifiedObj = {}) {
  const fields = PROFILE_SCHEMA[sectionKey] || [];
  // Consider both tiers; a field may be required in either (or both)
  const tiersToCheck = /** @type {Array<'enrollment'|'btw'>} */ (["enrollment", "btw"]);

  for (const field of fields) {
    // if field is required in any tier where it is visible & conditionally required,
    // make sure it passes validation/value presence.
    const requiredInAnyTier = tiersToCheck.some((tier) =>
      isFieldVisible(profile, field) && isFieldRequiredForTier(profile, field, tier)
    );
    if (!requiredInAnyTier) continue;

    const value = getByPath(profile, field.key) ?? profile?.[field.key];
    const ok = field.validate ? passesValidate(value, field.validate) : !(value == null || value === "");
    if (!ok) return "missing";
  }

  // All required-visible fields present → gate on verification
  if (verifiedObj?.[sectionKey] === true) return "complete";
  return "pending-verify";
}

/**
 * Humanize a field key to a friendly label, fallback if schema.label is missing.
 * @param {string} key
 */
function fallbackLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\burl\b/i, "URL")
    .replace(/\bcdl\b/i, "CDL")
    .replace(/\bid\b/i, "ID")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Produce up to `max` next actions the student can take.
 * Strategy:
 * - Scan both tiers for fields that are required+visible but not satisfied.
 * - Return unique actions with friendly labels: "Add/Upload/Enter <Label>"
 * @param {object} profile
 * @param {number} [max=3]
 * @returns {Array<{section:string,label:string,fieldKey:string}>}
 */
export function getNextActions(profile, max = 3) {
  const actions = [];
  const tiersToCheck = /** @type {Array<'enrollment'|'btw'>} */ (["enrollment", "btw"]);
  const seenKeys = new Set();

  // Section order: enrollment first, then btw
  const orderedSections = [...TIERS.enrollment, ...TIERS.btw];

  for (const sectionKey of orderedSections) {
    const fields = PROFILE_SCHEMA[sectionKey] || [];

    for (const field of fields) {
      // consider required in any tier + visible
      const isVisible = isFieldVisible(profile, field);
      if (!isVisible) continue;

      const requiredSomeTier = tiersToCheck.some((tier) =>
        isFieldRequiredForTier(profile, field, tier)
      );
      if (!requiredSomeTier) continue;

      const value = getByPath(profile, field.key) ?? profile?.[field.key];
      const ok = field.validate ? passesValidate(value, field.validate) : !(value == null || value === "");
      if (ok) continue;

      // Craft a friendly prompt
      const label = field.label || fallbackLabel(field.key);
      let verb = "Enter";
      if (field.type === "fileUrl") verb = "Upload";
      else if (field.type === "boolean") verb = "Confirm";
      else if (field.type === "date") verb = "Add";
      else if (field.type === "enum" || field.type === "select" || field.type === "multi") verb = "Select";

      const actionKey = `${sectionKey}:${field.key}`;
      if (!seenKeys.has(actionKey)) {
        actions.push({ section: sectionKey, label: `${verb} ${label}`, fieldKey: field.key });
        seenKeys.add(actionKey);
      }

      if (actions.length >= max) return actions;
    }
  }

  return actions;
}

// Named export for unit-testing helpers if you add tests later (optional)
export const __private = {
  getByPath,
  satisfiesCond,
  isFieldVisible,
  isFieldRequiredForTier,
  passesValidate,
  fieldCounts,
  totalWeightForTier,
  achievedWeightForTier,
};
