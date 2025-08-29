// src/walkthrough-data/index.js
// ============================================================================
// Global Walkthrough Data API (single public entry point)
// - Re-exports loader + utils
// - Re-exports overlay namespaces + helpers
// - Builds a token → script map from your defaults (duplicate-safe)
// - Provides labels + helpers that accept CDL codes or tokens
// - Pure, treeshake-friendly module (top-level maps are frozen)
// ============================================================================

// @ts-check

/** @typedef {import('@walkthrough-loaders').WalkthroughScript} WalkthroughScript */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

// ---- Loader (async resolver) -----------------------------------------------
// export { resolveWalkthrough } from './loaders/index.js'

// ---- Utils (helpers for parsing/validation/overlays) -----------------------
export {
  // pure overlay applier (handy for tooling)
  applyOverlays,
  exportXlsxFile,
  // power-user XLSX helpers
  isXlsxAvailable,
  parseCsv,
  parseMarkdown,
  parseXlsx,
  parseXlsxFile,
  // validation
  validateWalkthroughs,
} from './utils/index.js'

// ---- Overlays (re-export aggregator & helpers) -----------------------------
export {
  // Aggregates / lookups
  ALL_OVERLAYS,
  getOverlayById,
  listOverlayIds,
  common as overlayCommon,
  phases as overlayPhases,
  // Category namespaces (tree-shakable)
  restrictions as overlayRestrictions,
  OVERLAYS_BY_ID,
  school as overlaySchool,
  overlaysForRestrictions,
  // Also export code → id map so callers can inspect it if needed
  RESTRICTION_ID_BY_CODE,
} from './overlays/index.js'

// ---- Defaults (datasets + helpers) -----------------------------------------
import {
  DEFAULT_WALKTHROUGH_VERSION,
  DEFAULT_WALKTHROUGHS as DEFAULT_DATASETS,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  listDefaultWalkthroughs,
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
} from './defaults/index.js'

export {
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  listDefaultWalkthroughs,
}

// ---- Labels & token mapping -------------------------------------------------
// Note: our BASE datasets cover the primary classes. “WO-…” variants alias
// to the base token; restrictions/phases are applied as overlays.
const CODE_TO_TOKEN = Object.freeze(
  /** @type {Readonly<Record<string, string>>} */ ({
    A: 'class-a',
    'A-WO-AIR-ELEC': 'class-a',
    'A-WO-HYD-ELEC': 'class-a',
    B: 'class-b',
    'PASSENGER-BUS': 'passenger-bus',
  })
)

/** @type {Readonly<Record<string, string>>} */
export const WALKTHROUGH_LABELS = Object.freeze({
  'class-a': 'Class A',
  'class-b': 'Class B',
  'passenger-bus': 'Passenger Bus',
})

/**
 * Normalize any input (CDL code or token-like or human label) to our canonical token.
 * - Uppercase codes like "A" / "A-WO-AIR-ELEC" map via CODE_TO_TOKEN.
 * - Otherwise we kebab-case and strip non-alphanumerics (defensive).
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
 * Safe label lookup for UI (falls back to a readable version of the input).
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
// Renamed to avoid redeclaration error
export const DEFAULT_WALKTHROUGHS_MAP = (() => {
  /** @type {Record<string, WalkthroughScript>} */
  const out = Object.create(null)
  const all = Array.isArray(DEFAULT_DATASETS)
    ? DEFAULT_DATASETS
    : listDefaultWalkthroughs()

  for (const ds of all) {
    const token = toToken(ds?.classCode)
    if (!token) {
      if (IS_DEV)
        console.warn('[walkthrough-data] Missing/invalid classCode:', ds)
      continue
    }
    const script = Array.isArray(ds?.sections) ? ds.sections : []
    if (script.length === 0 && IS_DEV) {
      console.warn(
        '[walkthrough-data] Empty sections for dataset:',
        ds?.classCode
      )
    }
    if (!out[token] || out[token].length === 0) {
      out[token] = script
    } else if (IS_DEV) {
      console.warn(
        '[walkthrough-data] Duplicate dataset for token (first kept):',
        token
      )
    }
  }

  return Object.freeze(out)
})()

// ---- Convenience getters ----------------------------------------------------
/**
 * Get the base (default) script for a given class token/CDL code.
 * @param {unknown} classType
 * @returns {WalkthroughScript | null}
 */
export function getWalkthroughScript(classType) {
  const tok = toToken(classType)
  return DEFAULT_WALKTHROUGHS_MAP[tok] ?? null
}

/**
 * Check if a walkthrough exists for a given class token/CDL code.
 * @param {unknown} classType
 * @returns {boolean}
 */
export function hasWalkthrough(classType) {
  const tok = toToken(classType)
  return Object.prototype.hasOwnProperty.call(DEFAULT_WALKTHROUGHS_MAP, tok)
}

/**
 * List all available walkthrough tokens.
 * @returns {ReadonlyArray<string>}
 */
export function listWalkthroughTokens() {
  return Object.freeze(Object.keys(DEFAULT_WALKTHROUGHS_MAP))
}

/** @returns {ReadonlyArray<{token:string,label:string}>} */
export function listLabeledWalkthroughs() {
  return listWalkthroughTokens().map(t => ({
    token: t,
    label: getWalkthroughLabel(t),
  }))
}

// ---- Public re-exports for defaults map (nice to have under @walkthrough-data)
export { DEFAULT_DATASETS }

// ============================================================================
// NOTE: schema.d.ts sits beside this file to provide IntelliSense/types.
// ============================================================================

// Optional convenience default (kept tiny to avoid accidental heavy imports)
export default {
  // loader
  // data
  DEFAULT_DATASETS,
  DEFAULT_WALKTHROUGHS: DEFAULT_WALKTHROUGHS_MAP,
  DEFAULT_WALKTHROUGH_VERSION,
  // labels/tokens
  toToken,
  getWalkthroughLabel,
  hasWalkthrough,
  listWalkthroughTokens,
  listLabeledWalkthroughs,
  // overlays
  overlayRestrictions: undefined, // re-exported as named above
  overlayPhases: undefined,
  overlaySchool: undefined,
  overlayCommon: undefined,
}
