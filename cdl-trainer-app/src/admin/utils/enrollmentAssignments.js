// src/admin/utils/enrollmentAssignments.js
// ============================================================================
// Enrollment → Derived overlays
// - Deterministic, lowercase slugs (stable sort)
// - Backward-compatible signature: deriveOverlays(course, cdlClass)
// - Easy to extend with new CDL class rules or course keyword rules
// - Extras exported: OVERLAY_LABELS, labelOverlay()
// ============================================================================

/** Canonical overlay ordering (stable output) */
const OVERLAY_ORDER = [
  'eldt-core',
  'refresher',
  'combination',        // CDL A
  'single-vehicle',     // CDL B
  'passenger-bus',      // P / passenger hints
  'school-bus',         // S
  'hazmat',             // H
  'tanker',             // N
  'doubles-triples',    // T
  'air-brakes',         // air brakes knowledge
  'manual-transmission' // common add-on
]

/** Human-friendly labels for chips/UI */
export const OVERLAY_LABELS = {
  'eldt-core': 'ELDT Core',
  'refresher': 'Refresher',
  'combination': 'Combination (A)',
  'single-vehicle': 'Single Vehicle (B)',
  'passenger-bus': 'Passenger / Bus',
  'school-bus': 'School Bus',
  'hazmat': 'HazMat',
  'tanker': 'Tanker',
  'doubles-triples': 'Doubles / Triples',
  'air-brakes': 'Air Brakes',
  'manual-transmission': 'Manual Transmission',
}

/** Optional helper if you need a display label sometime */
export function labelOverlay(slug) {
  return OVERLAY_LABELS[String(slug).toLowerCase()] || slug
}

/** Normalize/trim a text input safely */
function norm(s) {
  return String(s || '').trim()
}

/** Class → overlay hints (feel free to expand) */
function overlaysFromClass(cdlClass = '') {
  const c = norm(cdlClass).toUpperCase()
  const out = new Set()

  // Very lightweight mapping (kept conservative)
  if (c === 'A') out.add('combination')
  if (c === 'B') out.add('single-vehicle')

  // Broad “PASSENGER” token covers many real-world inputs
  if (c.includes('PASSENGER') || c === 'P' || c === 'BUS') out.add('passenger-bus')

  // Optional: quick endorsements found in some class strings
  if (/\bS\b|SCHOOL/.test(c)) out.add('school-bus')
  if (/\bH\b|HAZ(MAT)?/i.test(c)) out.add('hazmat')
  if (/\bN\b|TANK(ER)?/i.test(c)) out.add('tanker')
  if (/\bT\b|DOUBLES?|TRIPLES?/i.test(c)) out.add('doubles-triples')

  return out
}

/** Course → overlay hints (keyword rules only; safe to expand) */
function overlaysFromCourse(course = '') {
  const t = norm(course).toLowerCase()
  const out = new Set()

  // Core buckets
  if (/eldt/.test(t)) out.add('eldt-core')
  if (/refresher/.test(t)) out.add('refresher')

  // Common add-ons often encoded in course titles/descriptions
  if (/passenger|bus/.test(t)) out.add('passenger-bus')
  if (/school\s*bus|sb-?/.test(t)) out.add('school-bus')
  if (/haz\s*mat|hazmat|h-?endorsement/.test(t)) out.add('hazmat')
  if (/tanker|n-?endorsement/.test(t)) out.add('tanker')
  if (/double|triple|t-?endorsement/.test(t)) out.add('doubles-triples')
  if (/air\s*brake/.test(t)) out.add('air-brakes')
  if (/manual|stick\s*shift/.test(t)) out.add('manual-transmission')

  return out
}

/** Stable, deterministic sort using OVERLAY_ORDER (unknowns alphabetized) */
function sortOverlays(slugs) {
  const idx = (s) => {
    const i = OVERLAY_ORDER.indexOf(s)
    return i === -1 ? Number.POSITIVE_INFINITY : i
  }
  return [...slugs].sort((a, b) => {
    const ia = idx(a), ib = idx(b)
    if (ia !== ib) return ia - ib
    // Unknowns: secondary alpha
    if (ia === Number.POSITIVE_INFINITY) return a.localeCompare(b)
    return 0
  })
}

/**
 * Derive overlays from course/class.
 * Keep it simple and deterministic; can be expanded later.
 * @param {string} course
 * @param {string} cdlClass
 * @returns {string[]} overlays (lowercase slugs, stable order)
 */
export function deriveOverlays(course = '', cdlClass = '') {
  const set = new Set()

  // Class-driven
  overlaysFromClass(cdlClass).forEach((o) => set.add(o))
  // Course-driven
  overlaysFromCourse(course).forEach((o) => set.add(o))

  // Return stable list
  return sortOverlays(Array.from(set))
}