// src/walkthrough-data/index.js
// ============================================================================
// Global Walkthrough Data API (single public entry point)
// - Re-exports loader + utils
// - Builds a token → script map from your defaults
// - Provides labels + helpers that accept either CDL codes or tokens
// ============================================================================

// ---- Loader (async resolver) -----------------------------------------------
export { resolveWalkthrough } from './loaders/resolveWalkthrough.js'

// ---- Utils (helpers for parsing/validation) --------------------------------
export { parseCsv } from './utils/parseCsv.js'
export { parseMarkdown } from './utils/parseMarkdown.js'
export {
  validateWalkthroughs,
} from './utils/validateWalkthroughs.js'

// ---- Defaults (datasets + helpers) -----------------------------------------
// NOTE: We *do not* re-export "*" from defaults to avoid name collisions.
// We expose the raw list as DEFAULT_DATASETS and keep our own
// token → script map under DEFAULT_WALKTHROUGHS.
import {
  DEFAULT_WALKTHROUGHS as DEFAULT_DATASETS, // array of dataset objects
  listDefaultWalkthroughs,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  validateWalkthroughShape,
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
} from './defaults/index.js'

export {
  // raw dataset list and handy helpers (unchanged from defaults/)
  DEFAULT_DATASETS,
  listDefaultWalkthroughs,
  getDefaultWalkthroughByClass,
  getDefaultWalkthroughById,
  validateWalkthroughShape,
  WALKTHROUGHS_BY_CLASS,
  WALKTHROUGHS_BY_ID,
}

// ---- Labels & token mapping -------------------------------------------------
const CODE_TO_TOKEN = {
  'A': 'class-a',
  'A-WO-AIR-ELEC': 'class-a-wo-air-elec',
  'A-WO-HYD-ELEC': 'class-a-wo-hyd-elec',
  'B': 'class-b',
  'PASSENGER-BUS': 'passenger-bus',
}

export const WALKTHROUGH_LABELS = {
  'class-a': 'Class A',
  'class-a-wo-air-elec': 'Class A (No Air/Electric)',
  'class-a-wo-hyd-elec': 'Class A (No Hyd/Electric)',
  'class-b': 'Class B',
  'passenger-bus': 'Passenger Bus',
}

/** Normalize any input (CDL code or token) into our canonical token. */
function toToken(input) {
  if (input == null) return ''
  const s = String(input).trim()
  const asCode = s.toUpperCase()
  if (CODE_TO_TOKEN[asCode]) return CODE_TO_TOKEN[asCode]

  // treat input as token-ish: kebab-case it
  const asToken = s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')

  return asToken
}

/** Safe label lookup for UI (falls back to the raw string). */
export function getWalkthroughLabel(classType) {
  const tok = toToken(classType)
  return WALKTHROUGH_LABELS[tok] ?? String(classType ?? '')
}

// ---- Build token → script map from your default datasets -------------------
/**
 * DEFAULT_WALKTHROUGHS (map):
 *   token -> WalkthroughScript (array of sections)
 * Examples:
 *   DEFAULT_WALKTHROUGHS['class-a']
 *   DEFAULT_WALKTHROUGHS['passenger-bus']
 */
export const DEFAULT_WALKTHROUGHS = (() => {
  const out = Object.create(null)
  const all = Array.isArray(DEFAULT_DATASETS) ? DEFAULT_DATASETS : listDefaultWalkthroughs()
  for (const ds of all) {
    const token = toToken(ds?.classCode)
    if (!token) continue
    const script = Array.isArray(ds?.sections) ? ds.sections : []
    out[token] = script
  }
  return out
})()

/** Convenience getter that accepts either CDL codes or tokens. */
export function getWalkthroughByClass(classType) {
  const tok = toToken(classType)
  return DEFAULT_WALKTHROUGHS[tok] ?? null
}

// ============================================================================
// NOTE: schema.d.ts sits beside this file to provide IntelliSense/types.
// It’s not imported by JS, but TS tooling picks it up automatically.
// ============================================================================
