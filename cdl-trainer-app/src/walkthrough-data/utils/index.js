// src/walkthrough-data/utils/index.js
// ======================================================================
// Walkthrough utilities barrel
// - Re-exports individual helpers for tree-shaking
// - Optional default aggregate for convenience
// - Pure module (no side effects)
// ======================================================================

import { parseCsv } from './parseCsv.js'
import { parseMarkdown } from './parseMarkdown.js'
import {
  validateWalkthroughs,
  // expose shape validator too if you want granular checks
  validateWalkthroughShape,
} from './validateWalkthroughs.js'

// ---------------------------
// Named exports (preferred)
// ---------------------------
export {
  parseCsv,
  parseMarkdown,
  validateWalkthroughs,
  validateWalkthroughShape,
}

// ---------------------------
// Optional convenience default
// ---------------------------
export default {
  parseCsv,
  parseMarkdown,
  validateWalkthroughs,
  validateWalkthroughShape,
}

// ---------------------------
// Type passthroughs
// (purely for IntelliSense / TS consumers)
// ---------------------------
export type {
  WalkthroughClassToken,
  CdlClassCode,
  WalkthroughStep,
  WalkthroughSection,
  WalkthroughScript,
  WalkthroughDataset,
  WalkthroughMap,
  WalkthroughLabels,
  ResolveWalkthroughArgs,
  ResolvedWalkthrough,
  SchoolId,
} from '../schema.d.ts'