// src/walkthrough-data/utils/index.js
// ======================================================================
// Walkthrough utilities barrel
// - Re-exports individual helpers for tree-shaking
// - Optional default aggregate for convenience
// - Pure module (no side effects)
// ======================================================================

// @ts-check

// Robust namespace imports so this file works whether the children export
// named functions or default exports.
import * as csvNS from './parseCsv.js'
import * as mdNS from './parseMarkdown.js'
import * as validateNS from './validateWalkthroughs.js'

// Normalize to named symbols (prefer named, fall back to default)
const parseCsv = /** @type {any} */ (csvNS).parseCsv ?? /** @type {any} */ (csvNS).default
const parseMarkdown = /** @type {any} */ (mdNS).parseMarkdown ?? /** @type {any} */ (mdNS).default
const validateWalkthroughs =
  /** @type {any} */ (validateNS).validateWalkthroughs ??
  /** @type {any} */ (validateNS).default?.validateWalkthroughs ??
  /** @type {any} */ (validateNS).default
const validateWalkthroughShape =
  /** @type {any} */ (validateNS).validateWalkthroughShape ??
  /** @type {any} */ (validateNS).default?.validateWalkthroughShape

// ---------------------------
// Named exports (preferred)
// ---------------------------
export { parseCsv, parseMarkdown, validateWalkthroughs, validateWalkthroughShape }

// ---------------------------
// Optional convenience default
// ---------------------------
export default {
  parseCsv,
  parseMarkdown,
  validateWalkthroughs,
  validateWalkthroughShape,
}

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
