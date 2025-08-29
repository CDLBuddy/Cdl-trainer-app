// src/walkthrough-data/index.js
// ============================================================================
// Global Walkthrough Data API (single public entry point)
// - Re-exports loader + utils
// - Re-exports overlay namespaces + helpers
// - Builds a token → script map from your defaults (duplicate-safe)
// - Provides labels + helpers that accept CDL codes or tokens
// - Pure, treeshake-friendly module (top-level maps are frozen)
// ============================================================================

// ---- Loader (async resolver) -----------------------------------------------
export { resolveWalkthrough } from './loaders/index.js'

// ---- Utils (helpers for parsing/validation/overlays) -----------------------
export {
  applyOverlays,
  exportXlsxFile,
  isXlsxAvailable,
  parseCsv,
  parseMarkdown,
  parseXlsx,
  parseXlsxFile,
  validateWalkthroughs,
} from './utils/index.js'

// ---- Overlays (re-export aggregator & helpers) -----------------------------
export {
  ALL_OVERLAYS,
  getOverlayById,
  listOverlayIds,
  common as overlayCommon,
  phases as overlayPhases,
  restrictions as overlayRestrictions,
  OVERLAYS_BY_ID,
  school as overlaySchool,
  overlaysForRestrictions,
  RESTRICTION_ID_BY_CODE,
} from './overlays/index.js'

// ---- Defaults (datasets + helpers) -----------------------------------------
// Re-export ONLY (do not redefine) to avoid name conflicts.
export {
  DEFAULT_WALKTHROUGH_VERSION,
  DEFAULT_WALKTHROUGHS as DEFAULT_DATASETS,
  DEFAULT_WALKTHROUGHS,
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
  getWalkthroughByClass,
  getWalkthroughByToken,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  listDefaultWalkthroughs,
} from './defaults/index.js'

// Local imports for building the computed map and for default export values
import {
  DEFAULT_WALKTHROUGHS as __DEFAULT_DATASETS,
  DEFAULT_WALKTHROUGH_VERSION as __DWV,
} from './defaults/index.js'

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

// ---- Labels & token mapping -------------------------------------------------
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

/** Normalize any code/label/token to our canonical token. */
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

/** Safe label lookup for UI. */
export function getWalkthroughLabel(classType) {
  const tok = toToken(classType)
  if (tok && WALKTHROUGH_LABELS[tok]) return WALKTHROUGH_LABELS[tok]
  const raw = String(classType ?? '')
  return raw
    ? raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''
}

// ---- Build token → script map from default datasets ------------------------
export const DEFAULT_WALKTHROUGHS_MAP = (() => {
  /** @type {Record<string, any[]>} */
  const out = Object.create(null)
  const all = Array.isArray(__DEFAULT_DATASETS) ? __DEFAULT_DATASETS : []

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
export function getWalkthroughScript(classType) {
  const tok = toToken(classType)
  return DEFAULT_WALKTHROUGHS_MAP[tok] ?? null
}

export function hasWalkthrough(classType) {
  const tok = toToken(classType)
  return Object.prototype.hasOwnProperty.call(DEFAULT_WALKTHROUGHS_MAP, tok)
}

export function listWalkthroughTokens() {
  return Object.freeze(Object.keys(DEFAULT_WALKTHROUGHS_MAP))
}

export function listLabeledWalkthroughs() {
  return listWalkthroughTokens().map(t => ({
    token: t,
    label: getWalkthroughLabel(t),
  }))
}

// ---- Tiny default export (avoids accidental heavy imports) ------------------
export default {
  DEFAULT_DATASETS: __DEFAULT_DATASETS,
  DEFAULT_WALKTHROUGHS: DEFAULT_WALKTHROUGHS_MAP,
  DEFAULT_WALKTHROUGH_VERSION: __DWV,
  toToken,
  getWalkthroughLabel,
  hasWalkthrough,
  listWalkthroughTokens,
  listLabeledWalkthroughs,
  // overlays intentionally omitted to keep default export light
}
