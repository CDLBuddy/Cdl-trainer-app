// Path: src/walkthrough-data/utils/index.js
// ======================================================================
// Walkthrough utilities barrel
// - Re-exports individual helpers for tree-shaking
// - Provides stable, named symbols with graceful fallbacks
// - Also exposes a small default aggregate for convenience
// - Pure module (no side effects)
// ======================================================================

// @ts-check

// ---------------------------
// Robust namespace imports
// ---------------------------
import * as csvNS      from './parseCsv.js'
import * as mdNS       from './parseMarkdown.js'
import * as xlsxNS     from './parseXlsx.js'
import * as validateNS from './validateWalkthroughs.js'

// ---------------------------
// Tiny selector helpers
// ---------------------------
/** @template T */
const pickFn = (ns, keys) =>
  /** @type {T|undefined} */ (keys.map(k => /** @type {any} */(ns)?.[k]).find(v => typeof v === 'function'))

const id = x => x

// ---------------------------
// Normalize to named symbols
// Prefer explicit *ToWalkthrough; then generic; then default
// ---------------------------
export const parseCsv =
  pickFn(csvNS, ['parseCsvToWalkthrough', 'parseCsv', 'default']) || id

export const parseMarkdown =
  pickFn(mdNS, ['parseMarkdownToWalkthrough', 'parseMarkdown', 'default']) || id

export const parseXlsx =
  pickFn(xlsxNS, ['parseXlsxToWalkthrough', 'default']) || id

// Keep isXlsxAvailable synchronous; fall back to a false-returning fn
export const isXlsxAvailable =
  /** @type {() => boolean} */ (pickFn(xlsxNS, ['isXlsxAvailable'])) || (() => false)

// Validation (named + useful extras)
export const validateWalkthroughs =
  /** @type {typeof validateNS.validateWalkthroughs} */
  (validateNS.validateWalkthroughs ?? /** @type {any} */ (validateNS).default)

export const validateWalkthroughShape =
  /** @type {typeof validateNS.validateWalkthroughShape} */
  (validateNS.validateWalkthroughShape ?? /** @type {any} */ (validateNS).default?.validateWalkthroughShape)

// Nice extra exports from the validator (non-breaking, tree-shakable)
export const validateSingle               = validateNS.validateSingle
export const validateSingleWalkthrough    = validateNS.validateSingleWalkthrough
export const validate                     = validateNS.validate
export const summarizeWalkthrough         = validateNS.summarizeWalkthrough
export const formatProblems               = validateNS.formatProblems
export const assertValidOrThrow           = validateNS.assertValidOrThrow

// Also expose the overlay applier from the utils barrel for convenience.
export { applyOverlays } from './applyOverlays.js'

// ---------------------------
// Pass-through low-level XLSX helpers for power users
// ---------------------------
export { parseXlsxFile, exportXlsxFile, sanitizeFilename } from './parseXlsx.js'

// Optional: expose the normalizers from the parsers (handy in tests/tools)
export { normalizeWalkthrough as normalizeCsvWalkthrough } from './parseCsv.js'
export { normalizeWalkthrough as normalizeMarkdownWalkthrough } from './parseMarkdown.js'

// ---------------------------
// Back-compat aliases used by admin upload screens
// ---------------------------
export { parseCsv as parseCsvToWalkthrough, parseMarkdown as parseMarkdownToWalkthrough }

// ---------------------------
// Optional convenience default (kept tiny for bundle diff)
// ---------------------------
const utilsDefault = {
  parseCsv,
  parseMarkdown,
  parseXlsx,
  isXlsxAvailable,
  validateWalkthroughs,
  validateWalkthroughShape,
  validateSingle,
  validateSingleWalkthrough,
  validate,
  summarizeWalkthrough,
  formatProblems,
  assertValidOrThrow,
  // Back-compat keys
  parseCsvToWalkthrough: parseCsv,
  parseMarkdownToWalkthrough: parseMarkdown,
}

export default utilsDefault

/**
 * Local JSDoc typedefs for editor help (no runtime impact).
 * TS consumers can import types from this module thanks to schema.d.ts.
 *
 * @typedef {import('../schema').WalkthroughClassToken} WalkthroughClassToken
 * @typedef {import('../schema').CdlClassCode} CdlClassCode
 * @typedef {import('../schema').WalkthroughStep} WalkthroughStep
 * @typedef {import('../schema').WalkthroughSection} WalkthroughSection
 * @typedef {import('../schema').WalkthroughScript} WalkthroughScript
 * @typedef {import('../schema').WalkthroughDataset} WalkthroughDataset
 * @typedef {import('../schema').WalkthroughMap} WalkthroughMap
 * @typedef {import('../schema').WalkthroughLabels} WalkthroughLabels
 * @typedef {import('../schema').ResolveWalkthroughArgs} ResolveWalkthroughArgs
 * @typedef {import('../schema').ResolvedWalkthrough} ResolvedWalkthrough
 * @typedef {import('../schema').SchoolId} SchoolId
 */