// Re-export the canonical walkthrough data types from schema.d.ts.

/* Prefer path without the .d.ts suffix so TS resolves cleanly */
export type * from './schema';

/* (Optional) Explicit named re-exports for older tooling that
   doesn't fully support `export type *` tree-shaking. */
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