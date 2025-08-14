// src/walkthrough-data/defaults/index.js
// =============================================================================
// Default Walkthrough Registry (Browning Mountain Training baseline)
// - Aggregates all default datasets in this folder
// - Fast lookups by classCode and id
// - Returns frozen (immutable) copies to prevent accidental mutation
// =============================================================================

import walkthroughClassA from './walkthrough-class-a.js'
import walkthroughClassAWoAirElec from './walkthrough-class-a-wo-air-elec.js'
import walkthroughClassAWoHydElec from './walkthrough-class-a-wo-hyd-elec.js'
import walkthroughClassB from './walkthrough-class-b.js'
import walkthroughPassengerBus from './walkthrough-passenger-bus.js'

/** Master list in one place (order doesn’t matter) */
export const DEFAULT_WALKTHROUGHS = [
  walkthroughClassA,
  walkthroughClassAWoAirElec,
  walkthroughClassAWoHydElec,
  walkthroughClassB,
  walkthroughPassengerBus,
]

/** Small helpers */
const norm = v => (v == null ? '' : String(v).trim())
const up = v => norm(v).toUpperCase()

/** Build fast lookup maps */
const _byClassCode = new Map()
const _byId = new Map()

for (const wt of DEFAULT_WALKTHROUGHS) {
  if (!wt || typeof wt !== 'object') continue
  const id = norm(wt.id)
  const cc = up(wt.classCode)
  if (id) _byId.set(id, wt)
  if (cc) _byClassCode.set(cc, wt)
}

/** Optional: current schema/default version */
export const DEFAULT_WALKTHROUGH_VERSION =
  Math.max(...DEFAULT_WALKTHROUGHS.map(w => Number(w.version || 1))) || 1

/**
 * Return a deep-frozen clone to keep the source datasets pristine.
 * Uses structuredClone when available; falls back to JSON clone.
 */
function cloneAndFreeze(obj) {
  let out
  if (typeof structuredClone === 'function') {
    out = structuredClone(obj)
  } else {
    out = JSON.parse(JSON.stringify(obj))
  }
  return deepFreeze(out)
}

function deepFreeze(o) {
  if (!o || typeof o !== 'object') return o
  Object.freeze(o)
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v && typeof v === 'object' && !Object.isFrozen(v)) {
      deepFreeze(v)
    }
  }
  return o
}

/** Public API =============================================================== */

/** Get by class code, e.g. 'A', 'A-WO-AIR-ELEC', 'B', 'PASSENGER-BUS' */
export function getDefaultWalkthroughByClass(classCode) {
  const hit = _byClassCode.get(up(classCode))
  return hit ? cloneAndFreeze(hit) : null
}

/** Get by dataset id, e.g. 'walkthrough-class-a' */
export function getDefaultWalkthroughById(id) {
  const hit = _byId.get(norm(id))
  return hit ? cloneAndFreeze(hit) : null
}

/** List all defaults (immutable clones) */
export function listDefaultWalkthroughs() {
  return DEFAULT_WALKTHROUGHS.map(cloneAndFreeze)
}

/**
 * Quick predicate for superadmin UI: validate minimum shape.
 * Returns { ok, errors[] } — conservative (doesn’t validate every field).
 */
export function validateWalkthroughShape(w) {
  const errors = []
  if (!w || typeof w !== 'object') return { ok: false, errors: ['Not an object'] }
  if (!norm(w.id)) errors.push('Missing id')
  if (!up(w.classCode)) errors.push('Missing classCode')
  if (!norm(w.label)) errors.push('Missing label')
  if (!Array.isArray(w.sections)) errors.push('sections must be an array')

  if (Array.isArray(w.sections)) {
    w.sections.forEach((s, i) => {
      if (!s || typeof s !== 'object') {
        errors.push(`sections[${i}] not an object`)
        return
      }
      if (!norm(s.section)) errors.push(`sections[${i}].section is required`)
      if (!Array.isArray(s.steps)) errors.push(`sections[${i}].steps must be an array`)
      if (Array.isArray(s.steps)) {
        s.steps.forEach((st, j) => {
          if (!st || typeof st !== 'object') {
            errors.push(`sections[${i}].steps[${j}] not an object`)
            return
          }
          if (!norm(st.script)) errors.push(`sections[${i}].steps[${j}].script is required`)
        })
      }
    })
  }

  return { ok: errors.length === 0, errors }
}

/** Export maps for power-users (read-only; don’t mutate values). */
export const WALKTHROUGHS_BY_CLASS = _byClassCode
export const WALKTHROUGHS_BY_ID = _byId