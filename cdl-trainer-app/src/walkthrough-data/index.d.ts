// src/walkthrough-data/index.d.ts
// ======================================================================
// Type barrel for walkthrough-data
// - Re-exports canonical types from ./schema
// - Purely type-level (no value exports)
// - Avoids duplicate re-exports that can trip TS in some toolchains
// ======================================================================

/** Prefer path without the .d.ts suffix so TS resolves cleanly. */
export type * from './schema';

/* ----------------------------------------------------------------------
   If you must support older tooling that doesn’t understand
   `export type *`, comment the line above and uncomment this block.

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
} from './schema';

---------------------------------------------------------------------- */