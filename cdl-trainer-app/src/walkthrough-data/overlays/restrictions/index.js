// Path: src/walkthrough-data/overlays/restrictions/index.js
// ======================================================================
// Restriction overlays — barrel
// - Exports individual overlays (tree-shakable)
// - Collections: ALL, BY_ID, BY_CODE
// - Helpers: getByCode, overlaysForRestrictions, toRestrictionCodes
// - Pure module; no side effects
// ======================================================================

import automatic from './automatic.js' // E  = automatic transmission
import noAir from './no-air.js' // L/Z = no full air brakes
import noFifthWheel from './no-fifth-wheel.js' // O  = no fifth-wheel

// Named exports so `import * as restrictions` works nicely
export { automatic, noAir, noFifthWheel }

// ----------------------------------------------------------------------
// Collections
// ----------------------------------------------------------------------

export const ALL = /** @type {const} */ (
  Object.freeze([automatic, noAir, noFifthWheel])
)

export const BY_ID = Object.freeze(
  ALL.reduce((acc, ov) => {
    if (ov?.id && !acc[ov.id]) acc[ov.id] = ov
    return acc
  }, /** @type {Record<string, any>} */ (Object.create(null)))
)

// Map CDL restriction code → overlay object
export const BY_CODE = Object.freeze({
  E: automatic,
  L: noAir,
  Z: noAir,
  O: noFifthWheel,
})

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

/** Normalize a single CDL restriction token to an uppercase code or null. */
function normalizeCode(code) {
  if (code == null) return null
  const s = String(code).trim().toUpperCase()
  if (!s) return null
  // Accept "E", "e", " l ", "Z", "O", and ignore unknowns.
  return s === 'E' || s === 'L' || s === 'Z' || s === 'O' ? s : null
}

/** Lookup by CDL restriction code. Unknown codes return null. */
export function getByCode(code) {
  const c = normalizeCode(code)
  return c ? (BY_CODE[c] ?? null) : null
}

/**
 * Parse a mixed input (array or string) into normalized codes.
 * @param {string|string[]|null|undefined} input
 * @returns {string[]} Array of unique codes like ['E','L']
 */
export function toRestrictionCodes(input) {
  const raw = Array.isArray(input)
    ? input
    : String(input ?? '')
        .split(/[,\s|/]+/g) // commas, pipes, spaces, or slashes
        .filter(Boolean)

  const seen = new Set()
  const out = []
  for (const item of raw) {
    const c = normalizeCode(item)
    if (c && !seen.has(c)) {
      seen.add(c)
      out.push(c)
    }
  }
  return out
}

/**
 * Return overlay objects for the given restrictions (deduped, in input order).
 * Accepts: ['E','L'] or 'E,L' or 'E L' etc.
 * Unknown entries are ignored.
 * @param {string|string[]|null|undefined} restrictions
 * @returns {Array<{ id: string, rules: any[] }>}
 */
export function overlaysForRestrictions(restrictions) {
  const codes = toRestrictionCodes(restrictions)
  const seenIds = new Set()
  const out = []
  for (const c of codes) {
    const ov = BY_CODE[c]
    if (ov && ov.id && !seenIds.has(ov.id)) {
      seenIds.add(ov.id)
      out.push(ov)
    }
  }
  return out
}

// ----------------------------------------------------------------------
// Optional convenience default (handy for debugging/inspecting)
// ----------------------------------------------------------------------
export default {
  automatic,
  noAir,
  noFifthWheel,
  ALL,
  BY_ID,
  BY_CODE,
  getByCode,
  toRestrictionCodes,
  overlaysForRestrictions,
}
