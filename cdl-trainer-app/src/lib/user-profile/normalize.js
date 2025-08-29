// Path: src/lib/user-profile/normalize.js
// ======================================================================
// Profile normalization (safe, idempotent)
// - Trims & coerces common string fields
// - Normalizes arrays (overlays/endorsements/restrictions) → unique, truthy
// - Canonicalizes enums (cdlClass, cdlPermit, vehicleQualified, paymentStatus)
// - Coerces billing to object { mode } and normalizes mode
// - Ensures dates are ISO YYYY-MM-DD (or left as-is if invalid/empty)
// - Keeps verified as boolean or map; strips junk
// - Lowercases email; defaults status
// ======================================================================

import { normalizeEmail, stripUndefined } from './helpers.js'

/* ----------------------------- helpers -------------------------------- */

const S = x => (x == null ? '' : String(x).trim())

const lower = x => S(x).toLowerCase()
const upper = x => S(x).toUpperCase()

/** If value is a valid date/string, return YYYY-MM-DD; else return original ('' stays ''). */
function toISODateOr(value) {
  const v = S(value)
  if (!v) return v
  // Accept either raw ISO date or any parseable date
  const d = new Date(v)
  if (Number.isNaN(+d)) return value
  return d.toISOString().slice(0, 10)
}

/** Normalize yes/no-ish values → 'yes' | 'no' | '' */
function normYesNo(value) {
  const v = lower(value)
  if (['y', 'yes', 'true', '1'].includes(v)) return 'yes'
  if (['n', 'no', 'false', '0'].includes(v)) return 'no'
  return v === '' ? '' : v // passthrough unknowns rather than destroying data
}

/** Normalize payment status → 'unpaid' | 'pending' | 'paid' | '' (otherwise passthrough) */
function normPaymentStatus(value) {
  const v = lower(value)
  if (!v) return ''
  if (['unpaid', 'not paid', 'due'].includes(v)) return 'unpaid'
  if (['pending', 'processing', 'in review'].includes(v)) return 'pending'
  if (['paid', 'complete', 'settled'].includes(v)) return 'paid'
  return v
}

/** Normalize CDL class → 'A' | 'B' | 'C' | other uppercased token */
function normCdlClass(value) {
  const v = upper(value)
  if (v === 'A' || v === 'B' || v === 'C') return v
  return v // allow custom tokens (e.g., PASSENGER-BUS) without mangling
}

/** Normalize role (lowercase common roles; passthrough unknowns) */
function normRole(value) {
  const v = lower(value)
  if (['student', 'instructor', 'admin', 'superadmin'].includes(v)) return v
  return v
}

/** Normalize status → 'active' | 'completed' | 'archived' | 'pending' (fallback 'active') */
function normStatus(value) {
  const v = lower(value)
  if (['active', 'completed', 'archived', 'pending'].includes(v)) return v
  return 'active'
}

/** Normalize billing to object shape with canonical mode */
function normBilling(value) {
  if (value == null) return value
  if (typeof value === 'object') {
    const mode = lower(value.mode)
    return { ...value, mode: mode || '—' }
  }
  // string → object
  const mode = lower(value)
  return { mode: mode || '—' }
}

/** Dedupe+truthy+trim array of strings */
function normStringArray(arrLike) {
  const arr = Array.isArray(arrLike) ? arrLike : arrLike ? [arrLike] : []
  return Array.from(new Set(arr.map(S).filter(Boolean)))
}

/** Keep `verified` as boolean or object; strip junky values while preserving legit maps */
function normVerified(value) {
  if (value === true) return true
  if (value && typeof value === 'object') return value
  return undefined
}

/* ----------------------------- main API -------------------------------- */

/**
 * Normalize a profile object in a predictable, safe way.
 * Idempotent: calling twice should yield the same result.
 * Never throws; only trims/coerces obvious fields and leaves unknown keys intact.
 *
 * @param {object} profile
 * @returns {object} normalized
 */
export function normalizeProfile(profile = {}) {
  const p = { ...profile }

  // Arrays
  p.overlays = normStringArray(p.overlays)
  p.endorsements = normStringArray(p.endorsements)
  p.restrictions = normStringArray(p.restrictions)

  // Booleans
  if (p.waiverSigned != null) p.waiverSigned = !!p.waiverSigned

  // Canonical enums / class
  if (p.cdlClass != null) p.cdlClass = normCdlClass(p.cdlClass)
  if (p.cdlPermit != null) p.cdlPermit = normYesNo(p.cdlPermit)
  if (p.vehicleQualified != null)
    p.vehicleQualified = normYesNo(p.vehicleQualified)
  if (p.paymentStatus != null)
    p.paymentStatus = normPaymentStatus(p.paymentStatus)

  // Dates (kept simple & safe)
  if (p.permitExpiry != null) p.permitExpiry = toISODateOr(p.permitExpiry)
  if (p.licenseExpiry != null) p.licenseExpiry = toISODateOr(p.licenseExpiry)
  if (p.medCardExpiry != null) p.medCardExpiry = toISODateOr(p.medCardExpiry)
  if (p.waiverSignatureDate != null)
    p.waiverSignatureDate = toISODateOr(p.waiverSignatureDate)

  // Strings we routinely trim (non-destructive)
  for (const key of [
    'name',
    'assignedCompany',
    'assignedInstructor',
    'emergencyName',
    'emergencyRelation',
    'course',
    'schedulePref',
    'scheduleNotes',
    'paymentStatus', // already normalized, but trim anyway
    'accommodation',
    'studentNotes',
  ]) {
    if (typeof p[key] === 'string') p[key] = S(p[key])
  }

  // URLs (light trim only)
  for (const key of [
    'profilePicUrl',
    'permitPhotoUrl',
    'driverLicenseUrl',
    'medicalCardUrl',
    'truckPlateUrl',
    'trailerPlateUrl',
    'paymentProofUrl',
  ]) {
    if (typeof p[key] === 'string') p[key] = S(p[key])
  }

  // Billing & verified
  if (p.billing != null) p.billing = normBilling(p.billing)
  const v2 = normVerified(p.verified)
  if (v2 !== undefined) p.verified = v2
  else delete p.verified

  // Email / role / status
  if (p.email) p.email = normalizeEmail(p.email)
  if (p.role != null) p.role = normRole(p.role)
  p.status = normStatus(p.status)

  // Final pass: remove undefined entries we might’ve introduced
  return stripUndefined(p)
}
