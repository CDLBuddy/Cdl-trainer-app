// ======================================================================
// Overlays — phases barrel
// - Re-exports phase overlays (pre-trip, skills test, etc.)
// - Provides ALL list, BY_ID map, and a safe get() helper
// - Immutable + light DEV validation
// ======================================================================

import preTrip from './pre-trip.js'
import skillsTest from './skills-test.js'

// ----- Named exports for direct importing --------------------------------
export { preTrip, skillsTest }

// ----- Aggregated list ----------------------------------------------------
/** @type {Array<{id:string, rules?:unknown[]}>} */
const ALL = [preTrip, skillsTest]

// ----- Map by id ----------------------------------------------------------
/** @type {Record<string, any>} */
const BY_ID = Object.freeze(
  ALL.reduce((acc, o) => {
    acc[o.id] = o
    return acc
  }, /** @type {Record<string, any>} */ ({}))
)

export { ALL, BY_ID }

// ----- Helper: safe lookup ------------------------------------------------
/**
 * Safe overlay lookup by id.
 * @param {string} id
 * @returns {any|null}
 */
export function get(id) {
  return BY_ID[id] || null
}

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
    const ids = new Set()
    ALL.forEach((o, i) => {
      const okId = typeof o?.id === 'string' && o.id.length > 0
      if (!okId) {
        // eslint-disable-next-line no-console
        console.warn(`[overlays/phases] Missing/invalid id at index ${i}`, o)
      } else if (ids.has(o.id)) {
        // eslint-disable-next-line no-console
        console.warn(`[overlays/phases] Duplicate id "${o.id}" at index ${i}`)
      } else {
        ids.add(o.id)
      }
      if (o.rules && !Array.isArray(o.rules)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[overlays/phases] "rules" should be an array for id "${o.id}"`
        )
      }
    })
  } catch {
    // swallow — never crash in DEV validation
  }
}

// ======================================================================
// Immutability (shallow freeze list; items are already frozen in files)
// ======================================================================
Object.freeze(ALL)