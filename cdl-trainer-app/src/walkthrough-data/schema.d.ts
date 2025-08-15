// src/walkthrough-data/schema.d.ts
// ======================================================================
// Type definitions for CDL walkthrough data (JS-friendly).
// Ambient module declarations that match your Vite aliases.
// ======================================================================

// ---------- Core domain types -----------------------------------------

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

  // Booleans that influence UI or grading
  mustSay?: boolean;
  required?: boolean;
  passFail?: boolean;
  skip?: boolean;

  // editor-only / optional
  id?: string;
  notes?: string;
  mediaUrl?: string;
  /** Optional tags to support overlay targeting (e.g., ['air-brake']). */
  tags?: string[];
}

/** A logical section (e.g., "Engine Compartment") containing steps. */
export interface WalkthroughSection {
  section: string;
  steps: WalkthroughStep[];
  /** Highlight or pass/fail emphasis. */
  critical?: boolean | 'passFail';
  description?: string;
}

/** A full walkthrough is an ordered list of sections. */
export type WalkthroughScript = WalkthroughSection[];

/** Dataset wrapper used in defaults. */
export interface WalkthroughDataset {
  id: string;
  classCode: CdlClassCode | string;
  label: string;
  version?: number;
  sections: WalkthroughScript;
}

/** token → default script */
export type WalkthroughMap = Record<WalkthroughClassToken, WalkthroughScript>;
/** token → human label */
export type WalkthroughLabels = Record<WalkthroughClassToken, string>;

// ---------- Overlay system (optional but supported by loader v2) ------------

export interface OverlayMatch {
  section: string;       // required section title
  stepLabel?: string;    // optional step label
  tag?: string;          // optional tag filter
}

export type OverlayRule =
  | { op: 'renameSection'; match: OverlayMatch; to: string }
  | { op: 'replaceSectionSteps'; match: OverlayMatch; steps: WalkthroughStep[] }
  | { op: 'appendSteps'; match: OverlayMatch; steps: WalkthroughStep[] }
  | { op: 'removeStep'; match: OverlayMatch } // by stepLabel OR tag
  | { op: 'replaceStepText'; match: OverlayMatch; to: string };

export interface WalkthroughOverlay {
  id?: string;
  rules: OverlayRule[];
}

/** Local shorthand for common restriction overlays. */
export type RestrictionCode = 'E' | 'LZ' | 'O';

// ---------- Resolver results/args ------------------------------------------

export interface ResolvedWalkthrough {
  script: WalkthroughScript | null;
  isCustom?: boolean;
  sourceHint?: string;   // e.g., 'defaults', 'school:XYZ', 'defaults+school-overlay'
  applied?: string[];    // overlay IDs applied
}

export interface ResolveWalkthroughArgs {
  classType: WalkthroughClassToken | CdlClassCode | string;
  schoolId?: SchoolId | null;
  preferCustom?: boolean;
  softFail?: boolean;
  /** Optional restriction overlays to apply, in order. */
  restrictions?: RestrictionCode[];
}

// ======================================================================
// Ambient module declarations matching your real aliases.
// ======================================================================

/**
 * Root public API (what app code should usually import):
 *   import { resolveWalkthrough, getWalkthroughLabel } from '@walkthrough-data'
 */
declare module '@walkthrough-data' {
  export const DEFAULT_WALKTHROUGHS: import('./schema').WalkthroughMap;
  export const DEFAULT_WALKTHROUGH_VERSION: number;

  export function getWalkthroughByClass(
    classType: import('./schema').WalkthroughClassToken |
               import('./schema').CdlClassCode |
               string
  ): import('./schema').WalkthroughScript | null;

  export function getWalkthroughLabel(
    classType: import('./schema').WalkthroughClassToken |
               import('./schema').CdlClassCode |
               string
  ): string;

  export function listDefaultWalkthroughs(): import('./schema').WalkthroughDataset[];
  export function getDefaultWalkthroughByClass(
    classCode: import('./schema').CdlClassCode | string
  ): import('./schema').WalkthroughDataset | null;
  export function getDefaultWalkthroughById(
    id: string
  ): import('./schema').WalkthroughDataset | null;
  export function validateWalkthroughShape(
    w: unknown
  ): { ok: boolean; errors: string[] };

  export const WALKTHROUGHS_BY_CLASS: ReadonlyMap<string, import('./schema').WalkthroughDataset>;
  export const WALKTHROUGHS_BY_ID: ReadonlyMap<string, import('./schema').WalkthroughDataset>;

  // Loader (simple + object-form overload)
  export function resolveWalkthrough(
    classType: import('./schema').WalkthroughClassToken |
               import('./schema').CdlClassCode |
               string,
    schoolId?: import('./schema').SchoolId | null
  ): Promise<import('./schema').WalkthroughScript | null>;
  export function resolveWalkthrough(
    args: import('./schema').ResolveWalkthroughArgs
  ): Promise<import('./schema').ResolvedWalkthrough>;
}

/**
 * Direct loader access via the loaders alias:
 *   import { resolveWalkthrough } from '@walkthrough-loaders'
 */
declare module '@walkthrough-loaders' {
  export function resolveWalkthrough(
    classType: import('./schema').WalkthroughClassToken |
               import('./schema').CdlClassCode |
               string,
    schoolId?: import('./schema').SchoolId | null
  ): Promise<import('./schema').WalkthroughScript | null>;

  export function resolveWalkthrough(
    args: import('./schema').ResolveWalkthroughArgs
  ): Promise<import('./schema').ResolvedWalkthrough>;

  // Handy type re-exports for callers using this alias
  export type {
    ResolveWalkthroughArgs,
    ResolvedWalkthrough,
    WalkthroughScript,
    WalkthroughSection,
    RestrictionCode,
    WalkthroughOverlay,
    OverlayRule,
  } from './schema';
}

/**
 * Defaults folder (dataset-level API). Helpful for admin/editors:
 *   import { listDefaultWalkthroughs } from '@walkthrough-defaults'
 */
declare module '@walkthrough-defaults' {
  export const DEFAULT_WALKTHROUGHS: ReadonlyArray<import('./schema').WalkthroughDataset>;
  export const DEFAULT_WALKTHROUGH_VERSION: number;

  export function listDefaultWalkthroughs(): import('./schema').WalkthroughDataset[];
  export function getDefaultWalkthroughByClass(
    classCode: import('./schema').CdlClassCode | string
  ): import('./schema').WalkthroughDataset | null;
  export function getDefaultWalkthroughById(
    id: string
  ): import('./schema').WalkthroughDataset | null;

  export function validateWalkthroughShape(
    w: unknown
  ): { ok: boolean; errors: string[] };

  export const WALKTHROUGHS_BY_CLASS: ReadonlyMap<string, import('./schema').WalkthroughDataset>;
  export const WALKTHROUGHS_BY_ID: ReadonlyMap<string, import('./schema').WalkthroughDataset>;
}

/**
 * Utils alias (nice for data tooling):
 *   import { parseCsv, parseMarkdown, validateWalkthroughs } from '@walkthrough-utils'
 *   import type { WalkthroughScript } from '@walkthrough-utils'
 */
declare module '@walkthrough-utils' {
  // Runtime helpers
  export function parseCsv(raw: string): unknown[];
  export function parseMarkdown(raw: string): string;
  export function validateWalkthroughs(
    datasets: unknown[]
  ): { ok: boolean; errors: string[] };

  // Type re-exports (so callers can import types from this alias)
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
    RestrictionCode,
    WalkthroughOverlay,
    OverlayRule,
  } from './schema';
}

// Make this file a module (prevents global augmentations from leaking).
export {};