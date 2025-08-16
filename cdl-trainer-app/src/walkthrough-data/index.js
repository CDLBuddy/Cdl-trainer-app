// ============================================================================
// Global Walkthrough Data API (single public entry point)
// - Re-exports loader + utils
// - Re-exports overlay namespaces + helpers
// - Builds a token → script map from your defaults (duplicate-safe)
// - Provides labels + helpers that accept CDL codes or tokens
// - Pure, treeshake-friendly module (top-level maps are frozen)
// ============================================================================

/** @typedef {import('@walkthrough-loaders').WalkthroughScript} WalkthroughScript */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

// ---- Loader (async resolver) -----------------------------------------------
export { resolveWalkthrough } from './loaders/resolveWalkthrough.js'

// ---- Utils (helpers for parsing/validation) --------------------------------
export {
  parseCsv,
  parseMarkdown,
  parseXlsx,
  validateWalkthroughs,
  validateWalkthroughShape,
} from './utils/index.js'

// ---- Overlays (re-export aggregator & helpers) -----------------------------
export {
  // Category namespaces (tree-shakable)
  restrictions as overlayRestrictions,
  phases as overlayPhases,
  school as overlaySchool,
  common as overlayCommon,
  // Aggregates / lookups
  ALL_OVERLAYS,
  OVERLAYS_BY_ID,
  listOverlayIds,
  getOverlayById,
  overlaysForRestrictions,
  // Also export code → id map so callers can inspect it if needed
  RESTRICTION_ID_BY_CODE,
} from './overlays/index.js'

// ---- Defaults (datasets + helpers) -----------------------------------------
import {
  DEFAULT_WALKTHROUGHS as DEFAULT_DATASETS,
  DEFAULT_WALKTHROUGH_VERSION,
  listDefaultWalkthroughs,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  validateWalkthroughShape as _validateWalkthroughShape, // local use if needed
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
} from './defaults/index.js'

export {
  DEFAULT_DATASETS,
  DEFAULT_WALKTHROUGH_VERSION,
  listDefaultWalkthroughs,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
}

// ---- Labels & token mapping -------------------------------------------------
/** @type {Readonly<Record<string, string>>} */
const CODE_TO_TOKEN = Object.freeze({
  A: 'class-a',
  'A-WO-AIR-ELEC': 'class-a',
  'A-WO-HYD-ELEC': 'class-a',
  B: 'class-b',
  'PASSENGER-BUS': 'passenger-bus',
})

/** @type {Readonly<Record<string, string>>} */
export const WALKTHROUGH_LABELS = Object.freeze({
  'class-a': 'Class A',
  'class-b': 'Class B',
  'passenger-bus': 'Passenger Bus',
})

/**
 * Normalize any input (CDL code or token-like or human label) to our canonical token.
 * @param {unknown} input
 * @returns {string}
 */
export function toToken(input) {
  if (input == null) return ''
  const s = String(input).trim()
  if (!s) return ''

  const asCode = s.toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-')
  if (CODE_TO_TOKEN[asCode]) return CODE_TO_TOKEN[asCode]

  const lc = s.toLowerCase()
  if (/\bclass\s*a\b/.test(lc)) return 'class-a'
  if (/\bclass\s*b\b/.test(lc)) return 'class-b'
  if (/\b(passenger\s*bus|bus\s*passenger)\b/.test(lc)) return 'passenger-bus'

  return lc
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Safe label lookup for UI (falls back to readable version of the input).
 * @param {unknown} classType
 * @returns {string}
 */
export function getWalkthroughLabel(classType) {
  const tok = toToken(classType)
  if (tok && WALKTHROUGH_LABELS[tok]) return WALKTHROUGH_LABELS[tok]
  const raw = String(classType ?? '')
  return raw
    ? raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''
}

// ---- Build token → script map from default datasets ------------------------
export const DEFAULT_WALKTHROUGHS = (() => {
  /** @type {Record<string, WalkthroughScript>} */
  const out = Object.create(null)
  const all = Array.isArray(DEFAULT_DATASETS) ? DEFAULT_DATASETS : listDefaultWalkthroughs()

  for (const ds of all) {
    const token = toToken(ds?.classCode)
    if (!token) {
      if (IS_DEV) console.warn('[walkthrough-data] Missing/invalid classCode:', ds)
      continue
    }
    const script = Array.isArray(ds?.sections) ? ds.sections : []
    if (script.length === 0 && IS_DEV) {
      console.warn('[walkthrough-data] Empty sections for dataset:', ds?.classCode)
    }
    if (!out[token] || out[token].length === 0) {
      out[token] = script
    } else if (IS_DEV) {
      console.warn('[walkthrough-data] Duplicate dataset for token (first kept):', token)
    }
  }
  return Object.freeze(out)
})()

// ---- Convenience getters ----------------------------------------------------
export function getWalkthroughByClass(classType) {
  const tok = toToken(classType)
  return DEFAULT_WALKTHROUGHS[tok] ?? null
}

export function hasWalkthrough(classType) {
  const tok = toToken(classType)
  return Object.prototype.hasOwnProperty.call(DEFAULT_WALKTHROUGHS, tok)
}

export function listWalkthroughTokens() {
  return Object.freeze(Object.keys(DEFAULT_WALKTHROUGHS))
}

export function listLabeledWalkthroughs() {
  return listWalkthroughTokens().map(t => ({
    token: t,
    label: getWalkthroughLabel(t),
  }))
}

// ============================================================================
// NOTE: schema.d.ts sits beside this file to provide IntelliSense/types.
// ============================================================================