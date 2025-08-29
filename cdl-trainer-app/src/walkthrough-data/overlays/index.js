// src/walkthrough-data/overlays/index.js
// ======================================================================
// Overlays — master index
// - Collects overlay objects from subfolders
// - Exposes category namespaces, a flat list, and an id → overlay map
// - Pure, side-effect free, treeshake-friendly
// ======================================================================

// @ts-check

import * as common       from './common/index.js'
import * as phases       from './phases/index.js'
import * as restrictions from './restrictions/index.js'
import * as school       from './school/index.js'

// Re-export category namespaces (handy for tooling/tests)
export { restrictions, school, phases, common }

/** @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

// ---- Collect & index ----------------------------------------------------

/** Keep a deterministic category order for flattening. */
const CATEGORY_NAMESPACES = /** @type {const} */ ([restrictions, phases, school, common])

/** Flatten a namespace object into overlay objects only (skip helpers/BY_ID/etc). */
function nsValues(ns) {
  return Object
    .values(ns || {})
    .filter(Boolean)
    .filter(o => typeof o === 'object' && !Array.isArray(o) && Array.isArray(/** @type any */(o).rules))
}

/** All overlays, in deterministic category order (frozen). */
export const ALL_OVERLAYS = Object.freeze(CATEGORY_NAMESPACES.flatMap(nsValues))

/** Build a stable id → overlay map (frozen). */
function buildIdMap(list) {
  /** @type {Record<string, WalkthroughOverlay>} */
  const out = Object.create(null)
  let auto = 0
  for (const ov of list) {
    if (!ov || typeof ov !== 'object') continue
    let { id } = /** @type any */ (ov)
    if (!id) {
      id = `overlay:auto:${auto++}`
      if (IS_DEV) console.warn('[overlays] Overlay missing id; generated:', id, ov)
    }
    if (out[id]) {
      if (IS_DEV) console.warn('[overlays] Duplicate overlay id (first wins):', id, { first: out[id], dup: ov })
      continue
    }
    out[id] = /** @type WalkthroughOverlay */ (ov)
  }
  return Object.freeze(out)
}

/** Immutable id → overlay map for runtime lookups */
export const OVERLAYS_BY_ID = buildIdMap(ALL_OVERLAYS)

/** Cached ids array (immutable) + helpers */
export const OVERLAY_IDS = Object.freeze(Object.keys(OVERLAYS_BY_ID))

/** Return overlay ids (frozen, stable) */
export const listOverlayIds = () => OVERLAY_IDS

/** Safe lookup by id */
export const getOverlayById = (id) => OVERLAYS_BY_ID[id] || null

// ---- Restriction code → overlay id mapping -----------------------------
// Prefer deriving from the restrictions barrel (BY_CODE/getByCode) to avoid drift.
function deriveRestrictionCodeMap() {
  /** @type {Record<string,string>} */
  const out = Object.create(null)

  // If BY_CODE exists and maps to overlay objects, derive ids.
  const byCode = /** @type {any} */ (restrictions && restrictions.BY_CODE)
  if (byCode && typeof byCode === 'object') {
    for (const code of Object.keys(byCode)) {
      const val = byCode[code]
      const id = typeof val === 'string' ? val : val?.id
      if (id) out[code.toUpperCase()] = id
    }
  }

  // If getByCode exists, fill any gaps.
  if (restrictions && typeof restrictions.getByCode === 'function') {
    const CODES = ['E', 'L', 'Z', 'O'] // supported CDL codes
    for (const c of CODES) {
      if (!out[c]) {
        const ov = restrictions.getByCode(c)
        if (ov?.id) out[c] = ov.id
      }
    }
  }

  // Fallback defaults if nothing exported yet (kept in sync with restrictions/*)
  if (Object.keys(out).length === 0) {
    Object.assign(out, {
      E: 'restriction:E:automatic',
      L: 'restriction:LZ:no-air',
      Z: 'restriction:LZ:no-air',
      O: 'restriction:O:no-fifth-wheel',
    })
  }

  return Object.freeze(out)
}

/** Map of CDL restriction code → overlay id (immutable). */
export const RESTRICTION_ID_BY_CODE = deriveRestrictionCodeMap()

/**
 * Return overlay objects for a set of CDL restriction codes.
 * Unknown codes are ignored safely; duplicates are de-duplicated.
 * @param {Array<'E'|'L'|'Z'|'O'|string>} codes
 * @returns {WalkthroughOverlay[]}
 */
export function overlaysForRestrictions(codes = []) {
  /** @type {WalkthroughOverlay[]} */
  const out = []
  const seen = new Set()
  for (const c of codes) {
    const id = RESTRICTION_ID_BY_CODE[String(c).toUpperCase()]
    if (!id || seen.has(id)) continue
    const ov = OVERLAYS_BY_ID[id]
    if (ov) {
      out.push(ov)
      seen.add(id)
    } else if (IS_DEV) {
      console.warn('[overlays] Restriction mapped to missing overlay id:', id, 'for code:', c)
    }
  }
  return out
}