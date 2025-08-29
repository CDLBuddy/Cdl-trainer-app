// Path: src/walkthrough-data/defaults/index.js
// =============================================================================
// Defaults — datasets barrel (BASE walkthroughs only)
// - Aggregates immutable default datasets in this folder
// - Fast lookups by token (e.g., "class-a") and by classCode (e.g., "A")
// - Returns frozen (immutable) clones to prevent accidental mutation
// - Dev-only guard: exported Maps are read-only (mutations throw)
// - Also exposes DEFAULT_WALKTHROUGHS (object keyed by token) + LIST variant
// =============================================================================

// BASE scripts (no restriction variants here)
import walkthroughClassA       from './walkthrough-class-a.js'
import walkthroughClassB       from './walkthrough-class-b.js'
import walkthroughPassengerBus from './walkthrough-passenger-bus.js'

// ---- Internals --------------------------------------------------------------
const norm = (v) => (v == null ? '' : String(v).trim())
const up   = (v) => norm(v).toUpperCase()

function deepFreeze(o) {
  if (!o || typeof o !== 'object' || Object.isFrozen(o)) return o
  Object.freeze(o)
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
  }
  return o
}

function cloneAndFreeze(obj) {
  let out
  if (typeof structuredClone === 'function') out = structuredClone(obj)
  else out = JSON.parse(JSON.stringify(obj))
  return deepFreeze(out)
}

/** Make a dev-only read-only facade for a Map (no set/clear/delete). */
function readonlyMap(map) {
  if (import.meta?.env?.DEV) {
    const thrower = () => { throw new Error('This Map is read-only: use exported helpers instead.') }
    map.set = thrower
    map.delete = thrower
    map.clear = thrower
    Object.freeze(map)
  }
  return map
}

// ---- Master list (order doesn’t matter) ------------------------------------
const DEFAULT_WALKTHROUGHS_RAW = [
  walkthroughClassA,
  walkthroughClassB,
  walkthroughPassengerBus,
]

/**
 * Token aliases → base token.
 * Variants like "A-WO-AIR-ELEC" resolve to the *base* default ("class-a");
 * restriction-specific differences are applied later via overlays.
 */
const TOKEN_ALIASES = {
  // Class A
  a: 'class-a',
  'class a': 'class-a',
  'class-a': 'class-a',
  'a-wo-air-elec': 'class-a',
  'class-a-wo-air-elec': 'class-a',
  'a-wo-hyd-elec': 'class-a',
  'class-a-wo-hyd-elec': 'class-a',

  // Class B
  b: 'class-b',
  'class b': 'class-b',
  'class-b': 'class-b',

  // Passenger Bus
  bus: 'passenger-bus',
  'passenger bus': 'passenger-bus',
  'passenger-bus': 'passenger-bus',
}

/** Normalize any code/token/loose string to our canonical token. */
function toToken(input) {
  const s = norm(input).replace(/_/g, '-').toLowerCase()
  return TOKEN_ALIASES[s] || s
}

// ---- Indexes (backed by the raw objects) -----------------------------------
const _byClassCode = new Map()
const _byId        = new Map()
const _byToken     = new Map() // canonical token → dataset

for (const wt of DEFAULT_WALKTHROUGHS_RAW) {
  if (!wt || typeof wt !== 'object') continue

  const id = norm(wt.id)
  const cc = up(wt.classCode)
  if (id && !_byId.has(id)) _byId.set(id, wt)
  if (cc && !_byClassCode.has(cc)) _byClassCode.set(cc, wt)

  // Heuristic: derive a canonical token from id/label/classCode
  // Prefer explicit id like "walkthrough:class-a" → "class-a"
  let token = ''
  if (id.startsWith('walkthrough:')) token = id.slice('walkthrough:'.length)
  else if (/class\s*a$/i.test(wt.label)) token = 'class-a'
  else if (/class\s*b$/i.test(wt.label)) token = 'class-b'
  else if (/passenger.*bus/i.test(wt.label)) token = 'passenger-bus'

  if (token && !_byToken.has(token)) _byToken.set(token, wt)
}

// ---- Public metadata --------------------------------------------------------
/** Optional: current schema/default version (max of dataset.version) */
export const DEFAULT_WALKTHROUGH_VERSION =
  Math.max(...DEFAULT_WALKTHROUGHS_RAW.map(w => Number(w.version || 1))) || 1

// ---- Public data shapes -----------------------------------------------------
/**
 * Frozen object keyed by canonical token: { 'class-a': {...}, 'class-b': {...}, ... }
 * Values are deep-frozen clones to keep sources pristine.
 */
export const DEFAULT_WALKTHROUGHS = (() => {
  /** @type {Record<string, any>} */
  const obj = Object.create(null)
  for (const [token, wt] of _byToken.entries()) obj[token] = cloneAndFreeze(wt)
  return Object.freeze(obj)
})()

/** Frozen list of default datasets (deep-frozen clones). */
export const DEFAULT_WALKTHROUGHS_LIST = Object.freeze(
  DEFAULT_WALKTHROUGHS_RAW.map(cloneAndFreeze)
)

// ---- Public API =============================================================

/** Get by class code, e.g. 'A', 'B', 'PASSENGER-BUS' (returns a frozen clone). */
export function getDefaultWalkthroughByClass(classCode) {
  const hit = _byClassCode.get(up(classCode))
  return hit ? cloneAndFreeze(hit) : null
}

/** Get by canonical token or alias ('class-a', 'A', 'class-a-wo-air-elec', etc.). */
export function getWalkthroughByClass(classTypeOrToken) {
  // 1) Try token lookup (including alias → base)
  const token = toToken(classTypeOrToken)
  const byToken = _byToken.get(token)
  if (byToken) return cloneAndFreeze(byToken)

  // 2) Fall back to classCode map (e.g., 'A', 'B')
  const byCode = _byClassCode.get(up(classTypeOrToken))
  return byCode ? cloneAndFreeze(byCode) : null
}

/** Get by dataset id, e.g. 'walkthrough:class-a' (returns a frozen clone). */
export function getDefaultWalkthroughById(id) {
  const hit = _byId.get(norm(id))
  return hit ? cloneAndFreeze(hit) : null
}

/** List all defaults (immutable clones). */
export function listDefaultWalkthroughs() {
  return DEFAULT_WALKTHROUGHS_LIST
}

/** Convenience: ids/classCodes/tokens for dropdowns/search UI. */
export const listDefaultIds         = () => Array.from(_byId.keys())
export const listDefaultClassCodes  = () => Array.from(_byClassCode.keys())
export const listDefaultTokens      = () => Object.freeze(Object.keys(DEFAULT_WALKTHROUGHS))

/**
 * Quick predicate for superadmin UI: validate minimum shape.
 * Returns { ok, errors[] } — conservative (doesn’t validate every field).
 */
export function validateWalkthroughShape(w) {
  const errors = []
  if (!w || typeof w !== 'object') return { ok: false, errors: ['Not an object'] }
  if (!norm(w.id))        errors.push('Missing id')
  if (!up(w.classCode))   errors.push('Missing classCode')
  if (!norm(w.label))     errors.push('Missing label')
  if (!Array.isArray(w.sections)) errors.push('sections must be an array')

  if (Array.isArray(w.sections)) {
    w.sections.forEach((s, i) => {
      if (!s || typeof s !== 'object') { errors.push(`sections[${i}] not an object`); return }
      if (!norm(s.section))            errors.push(`sections[${i}].section is required`)
      if (!Array.isArray(s.steps))     errors.push(`sections[${i}].steps must be an array`)
      if (Array.isArray(s.steps)) {
        s.steps.forEach((st, j) => {
          if (!st || typeof st !== 'object') { errors.push(`sections[${i}].steps[${j}] not an object`); return }
          if (!norm(st.script))              errors.push(`sections[${i}].steps[${j}].script is required`)
        })
      }
    })
  }
  return { ok: errors.length === 0, errors }
}

/** Export maps for power users (read-only; do not mutate values). */
export const WALKTHROUGHS_BY_CLASS = readonlyMap(_byClassCode)
export const WALKTHROUGHS_BY_ID    = readonlyMap(_byId)

// ---- Back-compat / convenience ---------------------------------------------
/** Alias often imported elsewhere; same as token-based getter. */
export const getWalkthroughByToken = getWalkthroughByClass
/** Alias for callers expecting an array export (legacy). */
export const DEFAULT_WALKTHROUGHS_ARRAY = DEFAULT_WALKTHROUGHS_LIST