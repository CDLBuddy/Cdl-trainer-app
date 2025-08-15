// ============================================================================
// Global Walkthrough Data API (single public entry point)
// - Re-exports loader + utils
// - Builds a token → script map from your defaults (duplicate-safe)
// - Provides labels + helpers that accept CDL codes or tokens
// - Pure, treeshake-friendly module (top-level map is frozen)
// ============================================================================

// ---- Loader (async resolver) -----------------------------------------------
export { resolveWalkthrough } from './loaders/resolveWalkthrough.js'

// ---- Utils (helpers for parsing/validation) --------------------------------
export {
  parseCsv,
  parseMarkdown,
  validateWalkthroughs,
  validateWalkthroughShape,
} from './utils/index.js'

// ---- Overlays (new: re-export aggregator & helpers) ------------------------
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
} from './overlays/index.js'

// ---- Defaults (datasets + helpers) -----------------------------------------
import {
  DEFAULT_WALKTHROUGHS as DEFAULT_DATASETS,
  listDefaultWalkthroughs,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  validateWalkthroughShape as _validateWalkthroughShape, // local use if needed
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
} from './defaults/index.js'

export {
  DEFAULT_DATASETS,
  listDefaultWalkthroughs,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
}

// ---- Labels & token mapping -------------------------------------------------
/** @type {Record<string, string>} */
const CODE_TO_TOKEN = {
  A: 'class-a',
  'A-WO-AIR-ELEC': 'class-a-wo-air-elec',
  'A-WO-HYD-ELEC': 'class-a-wo-hyd-elec',
  B: 'class-b',
  'PASSENGER-BUS': 'passenger-bus',
}

/** @type {Record<string, string>} */
export const WALKTHROUGH_LABELS = {
  'class-a': 'Class A',
  'class-a-wo-air-elec': 'Class A (No Air/Electric)',
  'class-a-wo-hyd-elec': 'Class A (No Hyd/Electric)',
  'class-b': 'Class B',
  'passenger-bus': 'Passenger Bus',
}

/** Normalize any input (CDL code or token-like or human label) to our token. */
export function toToken(input) {
  if (input == null) return ''
  const s = String(input).trim()

  // canonical codes first
  const asCode = s.toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-')
  if (CODE_TO_TOKEN[asCode]) return CODE_TO_TOKEN[asCode]

  // human-ish forms
  const humanish = s
    .toLowerCase()
    .replace(/\bclass\s+([ab])\b/g, 'class-$1')
    .replace(/\s+no\s+air(?:\/|and)?electric/gi, '-wo-air-elec')
    .replace(/\s+no\s+hyd(?:\/|and)?electric/gi, '-wo-hyd-elec')

  return humanish
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
}

/** Safe label lookup for UI (falls back to raw string). */
export function getWalkthroughLabel(classType) {
  const tok = toToken(classType)
  return WALKTHROUGH_LABELS[tok] ?? String(classType ?? '')
}

// ---- Build token → script map from your default datasets -------------------
/**
 * DEFAULT_WALKTHROUGHS (frozen Map-like plain object):
 *   token -> WalkthroughScript (array of sections)
 */
export const DEFAULT_WALKTHROUGHS = (() => {
  /** @type {Record<string, any[]>} */
  const out = Object.create(null)
  const all = Array.isArray(DEFAULT_DATASETS) ? DEFAULT_DATASETS : listDefaultWalkthroughs()
  for (const ds of all) {
    const token = toToken(ds?.classCode)
    if (!token) continue
    const script = Array.isArray(ds?.sections) ? ds.sections : []
    if (!out[token] || out[token].length === 0) out[token] = script
  }
  return Object.freeze(out)
})()

// ---- Convenience getters (accept CDL codes or tokens) ----------------------
export function getWalkthroughByClass(classType) {
  const tok = toToken(classType)
  return DEFAULT_WALKTHROUGHS[tok] ?? null
}
export function hasWalkthrough(classType) {
  const tok = toToken(classType)
  return Object.prototype.hasOwnProperty.call(DEFAULT_WALKTHROUGHS, tok)
}
export function listWalkthroughTokens() {
  return Object.keys(DEFAULT_WALKTHROUGHS)
}
export function listLabeledWalkthroughs() {
  return listWalkthroughTokens().map(t => ({ token: t, label: getWalkthroughLabel(t) }))
}

// ============================================================================
// NOTE: schema.d.ts sits beside this file to provide IntelliSense/types.
// It’s not imported by JS; TS tooling picks it up automatically.
// ============================================================================