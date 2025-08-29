// src/student/profile/schema/calculators.js
// ============================================================================
// Readiness Calculators (pure helpers; no side effects)
// - Schema-driven, weight-based readiness (Enrollment / BTW)
// - Honors visibleWhen / requiredWhen from PROFILE_SCHEMA
// - Verification compatibility: boolean flags OR { by, at } stamps
// - Progress Gate: cannot reach 80% until all CRITICAL items for the tier are met
// ============================================================================

import { PROFILE_SCHEMA, TIERS } from './profileSchema.js'

/* -------------------------------- Tunables -------------------------------- */
const GATE_PERCENT = 80 // students must finish CRITICAL to reach this
const LOCK_BELOW = GATE_PERCENT - 1

// Declare CRITICAL requirements per tier.
// Each item can be:
// - 'fieldKey'                                   (truthy/value + schema validate)
// - { key: 'fieldKey', when: { 'a.b': 'x' } }    (only required when condition holds)
// - { key: 'fieldKey', when, predicate(v,p) }    (custom pass logic)
const CRITICAL = {
  enrollment: [
    'name',
    'dob',
    'waiverSigned',
    'emergencyName',
    'emergencyPhone',
    'emergencyRelation',
    // Only when individual billing, ensure student is actually "paid"
    {
      key: 'paymentStatus',
      when: { 'billing.mode': 'individual' },
      predicate: v => String(v || '').toLowerCase() === 'paid',
    },
    // If "paid", a proof URL must exist (visibleWhen already handles the gating in schema)
    {
      key: 'paymentProofUrl',
      when: { 'billing.mode': 'individual', paymentStatus: 'paid' },
    },
  ],
  btw: [
    'cdlPermit', // must at least be answered "yes"/"no"
    'driverLicenseUrl',
    'licenseExpiry',
    'medicalCardUrl',
    'medCardExpiry',
    // If they DO have a permit, require photo + expiry
    { key: 'permitPhotoUrl', when: { cdlPermit: 'yes' } },
    { key: 'permitExpiry', when: { cdlPermit: 'yes' } },
    // Vehicle plate photos only required if they bring their own vehicle (schema visibility handles it, too)
    { key: 'truckPlateUrl', when: { vehicleQualified: 'yes' } },
    { key: 'trailerPlateUrl', when: { vehicleQualified: 'yes' } },
  ],
}

/* ----------------------------- tiny fallbacks ----------------------------- */
const FB_TIERS = {
  enrollment: ['basicInfo', 'emergency', 'waiver', 'payment', 'cdlInfo'],
  btw: ['permit', 'license', 'medical', 'vehicle'],
}

/* ------------------------------- path utils ------------------------------- */
function getByPath(obj, path) {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj)
}

function satisfiesCond(profile, cond = {}) {
  for (const [k, v] of Object.entries(cond)) {
    if (getByPath(profile, k) !== v) return false
  }
  return true
}

/* -------------------------- visibility / required ------------------------- */
function isFieldVisible(profile, field) {
  if (!field?.visibleWhen) return true
  return satisfiesCond(profile, field.visibleWhen)
}

function isFieldRequiredForTier(profile, field, tier) {
  if (!field?.requiredIn || !field.requiredIn.includes(tier)) return false
  if (field.requiredWhen && !satisfiesCond(profile, field.requiredWhen))
    return false
  return true
}

/* ------------------------------- validators ------------------------------- */
function passesValidate(value, validate = {}) {
  if (value == null || value === '') return false

  if (validate.pattern && typeof value === 'string') {
    try {
      if (!validate.pattern.test(value)) return false
    } catch {
      /* ignore bad regex */
    }
  }

  if (validate.future) {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(+d)) return false
    const today = new Date()
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const tDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
    if (!(dDay > tDay)) return false // strictly in the future
  }

  if (validate.image && typeof value === 'string') {
    const looksLikeImage =
      /^data:image\//.test(value) ||
      /\.(png|jpe?g|webp|gif|bmp|heic|heif|tiff?)$/i.test(value)
    if (!looksLikeImage) return false
  }

  return true
}

/* -------------------------- schema query helpers -------------------------- */
function fieldsForSections(sections) {
  const out = []
  for (const sectionKey of sections) {
    const arr = PROFILE_SCHEMA?.[sectionKey] || []
    for (const f of arr) out.push({ sectionKey, field: f })
  }
  return out
}

function findFieldDefByKey(key) {
  for (const sectionKey of Object.keys(PROFILE_SCHEMA || {})) {
    const found = (PROFILE_SCHEMA[sectionKey] || []).find(f => f.key === key)
    if (found) return found
  }
  return null
}

/* ----------------------------- field counters ----------------------------- */
function fieldCounts(profile, field, tier) {
  if (!isFieldVisible(profile, field)) return false
  if (!isFieldRequiredForTier(profile, field, tier)) return false
  const value = getByPath(profile, field.key) ?? profile?.[field.key]
  return field.validate
    ? passesValidate(value, field.validate)
    : !(value == null || value === '')
}

function totalWeightForTier(tier, profile) {
  const sections = TIERS?.[tier] || FB_TIERS[tier] || []
  let total = 0
  for (const { field } of fieldsForSections(sections)) {
    if (
      isFieldVisible(profile, field) &&
      isFieldRequiredForTier(profile, field, tier)
    ) {
      total += Number(field.weight || 0)
    }
  }
  return total || 0
}

function achievedWeightForTier(tier, profile) {
  const sections = TIERS?.[tier] || FB_TIERS[tier] || []
  let total = 0
  for (const { field } of fieldsForSections(sections)) {
    if (fieldCounts(profile, field, tier)) {
      total += Number(field.weight || 0)
    }
  }
  return total || 0
}

/* ------------------------------ critical gate ----------------------------- */
function requirementMet(profile, req) {
  const r = typeof req === 'string' ? { key: req } : req
  if (r.when && !satisfiesCond(profile, r.when)) return true // not required in this state

  const value = getByPath(profile, r.key) ?? profile?.[r.key]

  if (typeof r.predicate === 'function') {
    return !!r.predicate(value, profile)
  }

  // Reuse schema validate if available
  const def = findFieldDefByKey(r.key)
  if (def?.validate) return passesValidate(value, def.validate)

  // Default: truthy
  return !(value == null || value === '')
}

function criticalSatisfied(tier, profile) {
  const list = CRITICAL[tier] || []
  for (const req of list) {
    if (!requirementMet(profile, req)) return false
  }
  return true
}

/* -------------------------- verification compatibility -------------------- */
/**
 * Accepts multiple shapes:
 *  - verified[section] === true
 *  - verified[section] is an object with { by, at }
 *  - verified is a global object with { by, at }  (fallback)
 */
function isVerified(sectionKey, verified) {
  if (!verified) return false
  if (verified === true) return true
  const byAtLike = x => !!(x && (x.by || x.at))
  if (verified[sectionKey] === true) return true
  if (byAtLike(verified[sectionKey])) return true
  if (byAtLike(verified)) return true
  return false
}

/* ------------------------------- public API -------------------------------- */
export function getEnrollmentReadiness(profile) {
  const total = totalWeightForTier('enrollment', profile)
  if (total === 0) return 0
  const done = achievedWeightForTier('enrollment', profile)
  let pct = Math.round((done / total) * 100)
  if (!criticalSatisfied('enrollment', profile) && pct >= GATE_PERCENT) {
    pct = LOCK_BELOW
  }
  return pct
}

export function getBTWReadiness(profile) {
  const total = totalWeightForTier('btw', profile)
  if (total === 0) return 0
  const done = achievedWeightForTier('btw', profile)
  let pct = Math.round((done / total) * 100)
  if (!criticalSatisfied('btw', profile) && pct >= GATE_PERCENT) {
    pct = LOCK_BELOW
  }
  return pct
}

/**
 * Per-section status across BOTH tiers.
 * - 'missing'         → any required+visible field missing/invalid
 * - 'pending-verify'  → all required+visible fields OK, awaiting verification
 * - 'complete'        → all OK and verified (boolean or { by, at })
 */
export function getSectionStatus(sectionKey, profile, verifiedObj = {}) {
  const fields = PROFILE_SCHEMA?.[sectionKey] || []
  const tiersToCheck = /** @type {Array<'enrollment'|'btw'>} */ ([
    'enrollment',
    'btw',
  ])

  for (const field of fields) {
    const requiredSomeTier = tiersToCheck.some(
      tier =>
        isFieldVisible(profile, field) &&
        isFieldRequiredForTier(profile, field, tier)
    )
    if (!requiredSomeTier) continue

    const value = getByPath(profile, field.key) ?? profile?.[field.key]
    const ok = field.validate
      ? passesValidate(value, field.validate)
      : !(value == null || value === '')
    if (!ok) return 'missing'
  }

  return isVerified(sectionKey, verifiedObj) ? 'complete' : 'pending-verify'
}

/* Useful in tests if you add them later */
export const __private = {
  getByPath,
  satisfiesCond,
  isFieldVisible,
  isFieldRequiredForTier,
  passesValidate,
  fieldsForSections,
  findFieldDefByKey,
  fieldCounts,
  totalWeightForTier,
  achievedWeightForTier,
  requirementMet,
  criticalSatisfied,
  isVerified,
}
