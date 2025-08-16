// src/admin/utils/enrollmentAssignments.js
/**
 * Derive overlays from course/class.
 * Keep it simple and deterministic; can be expanded later.
 * @param {string} course
 * @param {string} cdlClass
 * @returns {string[]} overlays
 */
export function deriveOverlays(course = '', cdlClass = '') {
  const overlays = new Set()
  const c = (cdlClass || '').toUpperCase()

  if (c === 'A') overlays.add('combination')
  if (c === 'B') overlays.add('single-vehicle')
  if (c.includes('PASSENGER')) overlays.add('passenger-bus')

  // Course-based examples
  if (/ELDT/i.test(course)) overlays.add('eldt-core')
  if (/refresher/i.test(course)) overlays.add('refresher')

  return Array.from(overlays)
}
