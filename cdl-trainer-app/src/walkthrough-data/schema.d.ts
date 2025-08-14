// src/walkthrough-data/schema.d.ts
// ======================================================================
// Type definitions for CDL walkthrough data + helpers (JS-friendly).
// ======================================================================

/** Canonical "token" keys used in the defaults map (lowercase, kebab-case). */
export type WalkthroughClassToken =
  | 'class-a'
  | 'class-a-wo-air-elec'
  | 'class-a-wo-hyd-elec'
  | 'class-b'
  | 'passenger-bus';

/** CDL code strings you’ll typically store on the user profile. */
export type CdlClassCode =
  | 'A'
  | 'A-WO-AIR-ELEC'
  | 'A-WO-HYD-ELEC'
  | 'B'
  | 'PASSENGER-BUS';

/** Optional: school identifier used for custom overrides. */
export type SchoolId = string;

/** One scripted step within a section. */
export interface WalkthroughStep {
  label?: string;
  script: string;
  mustSay?: boolean;
  required?: boolean;
  passFail?: boolean;
  skip?: boolean;

  // editor-only extras
  id?: string;
  notes?: string;
  mediaUrl?: string;
  tags?: string[];
}

/** A logical section (e.g., "Engine Compartment") containing steps. */
export interface WalkthroughSection {
  section: string;
  steps: WalkthroughStep[];
  critical?: boolean | 'passFail';
  description?: string;
}

/** A full walkthrough is an ordered list of sections. */
export type WalkthroughScript = WalkthroughSection[];

/** Map from class tokens to their default walkthrough scripts. */
export type WalkthroughMap = Record<WalkthroughClassToken, WalkthroughScript>;

/** Labels map used by the UI (token → human label). */
export type WalkthroughLabels = Record<WalkthroughClassToken, string>;

/** A resolved result from the loader (may include provenance). */
export interface ResolvedWalkthrough {
  script: WalkthroughScript | null;
  isCustom?: boolean;
  sourceHint?: string;
}

/** Arguments for the resolver helper. */
export interface ResolveWalkthroughArgs {
  classType: WalkthroughClassToken | CdlClassCode | string;
  schoolId?: SchoolId | null;
  preferCustom?: boolean;
  softFail?: boolean;
}

// ======================================================================
// Ambient module declarations matching your real aliases:
//   import { resolveWalkthrough, getWalkthroughLabel } from '@walkthrough-data'
//   import { resolveWalkthrough } from '@walkthrough-loaders'
// ======================================================================

declare module '@walkthrough-data' {
  // Defaults API
  export const DEFAULT_WALKTHROUGHS: WalkthroughMap;
  export const DEFAULT_WALKTHROUGH_VERSION: number;
  export function getDefaultWalkthroughByClass(
    classType: WalkthroughClassToken | CdlClassCode | string
  ): WalkthroughScript | null;
  export function getDefaultWalkthroughById(id: string): WalkthroughScript | null;
  export function listDefaultWalkthroughs(): WalkthroughScript[];
  export function validateWalkthroughShape(w: unknown): { ok: boolean; errors: string[] };
  export const WALKTHROUGHS_BY_CLASS: ReadonlyMap<string, unknown>;
  export const WALKTHROUGHS_BY_ID: ReadonlyMap<string, unknown>;

  // Label helper
  export function getWalkthroughLabel(
    classType: WalkthroughClassToken | CdlClassCode | string
  ): string;

  // Loader (root re-export)
  export function resolveWalkthrough(
    classType: WalkthroughClassToken | CdlClassCode | string,
    schoolId?: SchoolId | null
  ): Promise<WalkthroughScript | null>;

  // Types (re-exported for convenience)
  export type {
    WalkthroughClassToken,
    CdlClassCode,
    WalkthroughStep,
    WalkthroughSection,
    WalkthroughScript,
    WalkthroughMap,
    WalkthroughLabels,
    ResolveWalkthroughArgs,
    ResolvedWalkthrough,
    SchoolId,
  };
}

declare module '@walkthrough-loaders' {
  // Direct loader access via loaders alias
  export function resolveWalkthrough(
    classType: WalkthroughClassToken | CdlClassCode | string,
    schoolId?: SchoolId | null
  ): Promise<WalkthroughScript | null>;

  // Optional object-form overload if you add it
  export function resolveWalkthrough(
    args: ResolveWalkthroughArgs
  ): Promise<ResolvedWalkthrough>;

  export type {
    ResolveWalkthroughArgs,
    ResolvedWalkthrough,
    WalkthroughScript,
    WalkthroughSection,
  };
}

// Make this file a module (avoids global augmentations leaking).
export {};
