// src/walkthrough-data/overlays/index.js
// ======================================================================
// Overlays — master index
// - Gathers every overlay object from the subfolders
// - Exposes category namespaces, a flat list, and an id → overlay map
// - Side-effect free; all objects are plain data
// ======================================================================

import * as restrictions from './restrictions/index.js'
import * as school from './school/index.js'
import * as phases from './phases/index.js'
import * as common from './common/index.js'

// Re-export category namespaces for convenience (tree-shakable)
export { restrictions, school, phases, common }

/** @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay */

// ---- Collect & index --------------------------------------------------

/** Flatten a namespace object ({name: overlay, …}) into an array */
function values(ns) {
  return Object.values(ns || {}).filter(Boolean)
}

/** All overlays, in deterministic category order */
export const ALL_OVERLAYS = Object.freeze(
  [].concat(values(restrictions), values(phases), values(school), values(common))
)

/** Build a stable id → overlay map */
function buildIdMap(list) {
  /** @type {Record<string, WalkthroughOverlay>} */
  const out = Object.create(null)
  let auto = 0
  for (const ov of list) {
    if (!ov || typeof ov !== 'object') continue
    let { id } = ov
    if (!id) {
      id = `overlay:auto:${auto++}`
      if (__DEV__) console.warn('[overlays] Overlay missing id; generated:', id, ov)
    }
    if (out[id]) {
      if (__DEV__) console.warn('[overlays] Duplicate overlay id (first wins):', id, { first: out[id], dup: ov })
      continue
    }
    out[id] = ov
  }
  return Object.freeze(out)
}

/** Immutable id → overlay map for runtime lookups */
export const OVERLAYS_BY_ID = buildIdMap(ALL_OVERLAYS)

/** Quick helpers */
export const listOverlayIds = () => Object.keys(OVERLAYS_BY_ID)
export const getOverlayById = (id) => OVERLAYS_BY_ID[id] || null

// ---- Convenience: map common restriction codes to overlay ids ----------
export const RESTRICTION_ID_BY_CODE = Object.freeze({
  // E = Automatic transmission
  E: 'restriction:E:automatic',
  // L / Z = No full air brakes (treat both the same for now)
  L: 'restriction:LZ:no-air',
  Z: 'restriction:LZ:no-air',
  // O = No fifth-wheel
  O: 'restriction:O:no-fifth-wheel',
})

/**
 * Return overlay objects for a set of CDL restriction codes.
 * Unknown codes are ignored safely.
 * @param {Array<'E'|'L'|'Z'|'O'|string>} codes
 * @returns {WalkthroughOverlay[]}
 */
export function overlaysForRestrictions(codes = []) {
  const out = []
  const seen = new Set()
  for (const c of codes) {
    const id = RESTRICTION_ID_BY_CODE[String(c).toUpperCase()]
    if (!id || seen.has(id)) continue
    const ov = OVERLAYS_BY_ID[id]
    if (ov) {
      out.push(ov)
      seen.add(id)
    }
  }
  return out
}