// =============================================================================
// Defaults — datasets barrel (BASE walkthroughs only)
// - Aggregates immutable default datasets in this folder
// - Fast lookups by classCode and id
// - Returns frozen (immutable) copies to prevent accidental mutation
// - Dev-only guard: exported Maps are read-only (mutations throw)
// =============================================================================

// BASE scripts (no restriction variants here)
import walkthroughClassA       from './walkthrough-class-a.js'
import walkthroughClassB       from './walkthrough-class-b.js'
import walkthroughPassengerBus from './walkthrough-passenger-bus.js'

// ---- Master list (order doesn’t matter) ------------------------------------
const DEFAULT_WALKTHROUGHS_RAW = [
  walkthroughClassA,
  walkthroughClassB,
  walkthroughPassengerBus,
]

// ---- Normalizers ------------------------------------------------------------
const norm = v => (v == null ? '' : String(v).trim())
const up   = v => norm(v).toUpperCase()

// ---- Immutability helpers ---------------------------------------------------
function deepFreeze(o) {
  if (!o || typeof o !== 'object' || Object.isFrozen(o)) return o
  Object.freeze(o)
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
  }
  return o
}

/** Return a deep-frozen clone to keep the source datasets pristine. */
function cloneAndFreeze(obj) {
  let out
  if (typeof structuredClone === 'function') out = structuredClone(obj)
  else out = JSON.parse(JSON.stringify(obj))
  return deepFreeze(out)
}

/** Make a dev-only read-only facade for a Map (no set/clear/delete). */
function readonlyMap(map) {
  if (import.meta?.env?.DEV) {
    const thrower = () => { throw new Error('This Map is read-only: use the exported helpers instead.') }
    map.set = thrower
    map.delete = thrower
    map.clear = thrower
    Object.freeze(map)
  }
  return map
}

// ---- Indexes ----------------------------------------------------------------
const _byClassCode = new Map()
const _byId        = new Map()

for (const wt of DEFAULT_WALKTHROUGHS_RAW) {
  if (!wt || typeof wt !== 'object') continue
  const id = norm(wt.id)
  const cc = up(wt.classCode)
  if (id && !_byId.has(id)) _byId.set(id, wt)
  if (cc && !_byClassCode.has(cc)) _byClassCode.set(cc, wt)
}

/** Optional: current schema/default version (max of each dataset’s version) */
export const DEFAULT_WALKTHROUGH_VERSION =
  Math.max(...DEFAULT_WALKTHROUGHS_RAW.map(w => Number(w.version || 1))) || 1

// ---- Public data (frozen clones) -------------------------------------------
/** Frozen list of default datasets (deep-frozen clones). */
export const DEFAULT_WALKTHROUGHS = Object.freeze(
  DEFAULT_WALKTHROUGHS_RAW.map(cloneAndFreeze)
)

// ---- Public API =============================================================

/** Get by class code, e.g. 'A', 'B', 'PASSENGER-BUS' */
export function getDefaultWalkthroughByClass(classCode) {
  const hit = _byClassCode.get(up(classCode))
  return hit ? cloneAndFreeze(hit) : null
}

/** Get by dataset id, e.g. 'walkthrough:class-a' */
export function getDefaultWalkthroughById(id) {
  const hit = _byId.get(norm(id))
  return hit ? cloneAndFreeze(hit) : null
}

/** List all defaults (immutable clones) */
export function listDefaultWalkthroughs() {
  // Return the already-frozen clones to avoid cloning every call.
  return DEFAULT_WALKTHROUGHS
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

/** Convenience: ids/classCodes for dropdowns/search UI */
export function listDefaultIds()        { return Array.from(_byId.keys()) }
export function listDefaultClassCodes() { return Array.from(_byClassCode.keys()) }

/** Export maps for power users (read-only; do not mutate values). */
export const WALKTHROUGHS_BY_CLASS = readonlyMap(_byClassCode)
export const WALKTHROUGHS_BY_ID    = readonlyMap(_byId)