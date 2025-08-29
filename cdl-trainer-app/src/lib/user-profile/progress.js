// Path: src/lib/user-profile/progress.js
// ======================================================================
/* Legacy snapshot progress (%)
   - Lightweight % used across admin & student surfaces
   - Normalizes first (safe, idempotent)
   - Condition-aware: excludes inapplicable fields (billing/permit/vehicle)
   - Detailed breakdown helper for debugging & UI
*/
// ======================================================================

import { serverTimestamp } from 'firebase/firestore'

import { normalizeProfile } from './normalize.js'

/** Base key list (unconditional “simple” fields). */
const BASE_PROGRESS_KEYS = [
  // Basic
  'name',
  'dob',
  'profilePicUrl',

  // Admin-owned but visible to students
  'cdlClass',

  // Emergency / Waiver (always applicable)
  ['emergencyName', 'emergencyPhone'],
  'emergencyRelation',
  'waiverSigned',
  'waiverSignature',
]

/** Conditional groups that are only included if their predicate matches. */
const CONDITIONAL_GROUPS = [
  // Permit group → only when student reports they have a permit
  {
    when: p => (p.cdlPermit || '').toLowerCase() === 'yes',
    keys: ['cdlPermit', 'permitPhotoUrl', 'permitExpiry'],
  },

  // License group (always relevant for BTW, still harmless to include)
  {
    when: () => true,
    keys: ['driverLicenseUrl', 'licenseExpiry'],
  },

  // Medical card (always relevant for BTW)
  {
    when: () => true,
    keys: ['medicalCardUrl', 'medCardExpiry'],
  },

  // Vehicle plates → only when student will use their own vehicle
  {
    when: p => (p.vehicleQualified || '').toLowerCase() === 'yes',
    keys: ['vehicleQualified', 'truckPlateUrl', 'trailerPlateUrl'],
  },

  // Payment → only when individual billing
  {
    when: p => (p?.billing?.mode || '').toLowerCase() === 'individual',
    keys: ['paymentStatus', 'paymentProofUrl'],
  },
]

/**
 * Compute the effective set of progress keys for a given (normalized) profile.
 * Returns a flat array of string keys and compound arrays (for “both required”).
 */
function getEffectiveProgressKeys(profile) {
  const out = [...BASE_PROGRESS_KEYS]
  for (const g of CONDITIONAL_GROUPS) {
    if (g.when(profile)) out.push(...g.keys)
  }
  return out
}

/**
 * Calculate a simple completion percentage.
 * - Counts 1 point per key.
 * - For compound arrays like ['emergencyName','emergencyPhone'], the entry
 *   only counts if **all** members are truthy.
 *
 * @param {object} profile
 * @param {Array<string|Array<string>>=} overrideKeys  Optional explicit key set
 * @returns {number} 0..100
 */
export function calculateProfileCompletion(profile = {}, overrideKeys) {
  if (!profile || typeof profile !== 'object') return 0

  // Normalize first so comparisons are consistent
  const normalized = normalizeProfile(profile)

  const keys =
    Array.isArray(overrideKeys) && overrideKeys.length
      ? overrideKeys
      : getEffectiveProgressKeys(normalized)

  const total = keys.length || 1
  let filled = 0

  for (const key of keys) {
    if (Array.isArray(key)) {
      // compound requirement: every member must be truthy
      if (key.every(k => Boolean(normalized[k]))) filled += 1
      continue
    }
    const v = normalized[key]
    if (Array.isArray(v)) {
      filled += v.length > 0 ? 1 : 0
    } else if (typeof v === 'boolean') {
      filled += v ? 1 : 0
    } else if (v) {
      filled += 1
    }
  }

  const pct = Math.round((filled / total) * 100)
  return Math.max(0, Math.min(100, pct))
}

/**
 * Detailed variant: returns percentage + what was counted.
 * Handy for admin tooling, QA, or coaching UI.
 *
 * @param {object} profile
 * @param {Array<string|Array<string>>=} overrideKeys
 * @returns {{
 *   percentage: number,
 *   total: number,
 *   filled: number,
 *   keysIncluded: Array<string|Array<string>>,
 *   keysFilled: Array<string|Array<string>>
 * }}
 */
export function calculateProfileCompletionDetailed(profile = {}, overrideKeys) {
  const normalized = normalizeProfile(profile)
  const keys =
    Array.isArray(overrideKeys) && overrideKeys.length
      ? overrideKeys
      : getEffectiveProgressKeys(normalized)

  const keysFilled = []
  let filled = 0

  for (const key of keys) {
    let ok = false
    if (Array.isArray(key)) {
      ok = key.every(k => Boolean(normalized[k]))
    } else {
      const v = normalized[key]
      ok = Array.isArray(v)
        ? v.length > 0
        : typeof v === 'boolean'
          ? v
          : Boolean(v)
    }
    if (ok) {
      filled += 1
      keysFilled.push(key)
    }
  }

  const total = keys.length || 1
  const pct = Math.max(0, Math.min(100, Math.round((filled / total) * 100)))

  return {
    percentage: pct,
    total,
    filled,
    keysIncluded: keys,
    keysFilled,
  }
}

/**
 * Normalize + attach snapshot progress and audit stamps.
 * (Non-breaking legacy helper.)
 *
 * @param {object} profile
 * @param {string} [updatedBy='system']
 */
export function updateProfileProgress(profile = {}, updatedBy = 'system') {
  const normalized = normalizeProfile(profile)
  const profileProgress = calculateProfileCompletion(normalized)
  return {
    ...normalized,
    profileProgress,
    profileUpdatedAt: serverTimestamp(),
    lastUpdatedBy: updatedBy,
  }
}

/** Convenience alias. */
export const withProgress = updateProfileProgress

// Export base keys for testing/inspection if you need them.
export const __internal = {
  BASE_PROGRESS_KEYS,
  CONDITIONAL_GROUPS,
  getEffectiveProgressKeys,
}
