// Path: src/admin/dashboard/utils/dates.js
// ======================================================================
// ADMIN • Dashboard Utils — Date & Progress Helpers
// - Central place for common calculations around expiries & percentages
// - Keep functions pure, deterministic, and side-effect free
// ======================================================================

/**
 * Calculate whole days between a target date and now.
 * @param {string|Date|null} dateLike - Date string (ISO/locale) or Date object.
 * @returns {number} Days until target (positive = future, negative = past).
 *   Returns a large number (≈infinity) if invalid or missing.
 */
export function daysBetween(dateLike) {
  if (!dateLike) return 9e6 // sentinel "infinite days"
  const dt = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (Number.isNaN(dt.getTime())) return 9e6
  const now = new Date()
  const msDiff = dt - now
  return Math.floor(msDiff / (1000 * 60 * 60 * 24))
}

/**
 * Check if a given date is expiring soon (≤ 30 days from now).
 * @param {string|Date|null} dateLike - Date string or Date object.
 * @param {number} [threshold=30] - Days window to consider "soon".
 * @returns {boolean}
 */
export function expirySoon(dateLike, threshold = 30) {
  return daysBetween(dateLike) <= threshold
}

/**
 * Clamp a percentage between 0 and 100.
 * @param {number|string} v - Value to clamp (coerced to number).
 * @returns {number} A safe integer percentage [0, 100].
 */
export function clampPct(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

// ----------------------------------------------------------------------
// Usage:
//   if (expirySoon(user.permitExpiry)) { ...highlight row... }
//   <td>{clampPct(user.profileProgress)}%</td>
// ----------------------------------------------------------------------