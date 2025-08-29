// src/walkthrough-data/overlays/common/index.js
// ======================================================================
// Overlays — common helpers barrel
// - Re-exports utility overlays used across restriction/school/phase sets
// - Provides ALL list, BY_ID map, IDS list, and safe lookup helpers
// - Pure module, immutable, light DEV validation
// ======================================================================

// @ts-check

import mergeSteps from './merge-steps.js'
import renameSections from './rename-sections.js'

// ----- Named exports for direct importing --------------------------------
export { renameSections, mergeSteps }

// ----- Aggregated list (order does not matter) ----------------------------
export const ALL = /** @type {const} */ ([renameSections, mergeSteps])
Object.freeze(ALL)

// ----- Map by id (null-prototype for safety) ------------------------------
/** @type {Record<string, any>} */
export const BY_ID = Object.freeze(
  ALL.reduce((acc, o) => {
    if (o?.id && !acc[o.id]) acc[o.id] = o
    return acc
  }, /** @type {Record<string, any>} */ (Object.create(null)))
)

// Convenience: stable list of ids
export const IDS = Object.freeze(Object.keys(BY_ID))

// ----- Helpers -------------------------------------------------------------
/** Safe overlay lookup by id (returns null if missing). */
export function get(id) {
  return BY_ID[String(id ?? '')] ?? null
}

/** Predicate form of `get` (boolean). */
export const has = id => get(id) !== null

// ======================================================================
// DEV validation (no-op in prod): basic shape + unique IDs
// ======================================================================
const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

if (IS_DEV) {
  try {
    /** @type {Set<string>} */
    const seen = new Set()
    ALL.forEach((o, i) => {
      const okId = typeof o?.id === 'string' && o.id.trim().length > 0
      if (!okId) {
        console.warn(`[overlays/common] Missing/invalid id at index ${i}`, o)
      } else if (seen.has(o.id)) {
        console.warn(`[overlays/common] Duplicate id "${o.id}" at index ${i}`)
      } else {
        seen.add(o.id)
      }
      if (o.rules && !Array.isArray(o.rules)) {
        console.warn(
          `[overlays/common] "rules" should be an array for id "${o.id}"`
        )
      }
    })
  } catch {
    // never throw in dev diagnostics
  }
}

// Optional default for convenience
export default { ALL, BY_ID, IDS, get, has, renameSections, mergeSteps }
