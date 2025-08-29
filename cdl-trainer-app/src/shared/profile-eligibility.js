// src/utils/profile-eligibility.js
// ======================================================================
// Profile Eligibility Checker
// - Ensures a user profile meets the required fields before enrollment.
// - Uses settings.users.requiredFields (fallbacks to sensible defaults).
// ======================================================================

/**
 * Check if a user's profile has all required fields populated.
 *
 * @param {Object} user - The user profile object.
 * @param {Object} settings - App/school settings object.
 * @returns {boolean} True if eligible (all required fields present & valid).
 */
export function isProfileEligible(user, settings) {
  const requiredFields = settings?.users?.requiredFields ?? [
    'name',
    'phone',
    'address',
  ]

  return requiredFields.every(field => {
    const value = user?.[field]

    // treat strings, numbers, etc. consistently
    if (value == null) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return !isNaN(value)
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0

    return Boolean(value)
  })
}
