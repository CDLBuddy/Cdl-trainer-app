// src/walkthrough-data/schema.d.ts
// ======================================================================
// Type definitions for CDL walkthrough data + helpers.
// Works in a JS project to give IntelliSense and catch mistakes.
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
  /** Optional short label (e.g., "Oil Level"). */
  label?: string;
  /** Spoken/scripted line the student should learn. */
  script: string;
  /** Mark items the student must explicitly say. */
  mustSay?: boolean;
  /** Required for pass/fail or completion checks. */
  required?: boolean;
  /** Mark steps that are treated as pass/fail (e.g., air-brake check). */
  passFail?: boolean;
  /** For sets where a step is intentionally skipped by equipment type. */
  skip?: boolean;

  /** --- room to grow (editor hints only; non-breaking) --- */
  id?: string;
  notes?: string;
  mediaUrl?: string;      // image/video for visual drills
  tags?: string[];        // search/filter keywords
}

/** A logical section (e.g., "Engine Compartment") containing steps. */
export interface WalkthroughSection {
  section: string;
  steps: WalkthroughStep[];
  /** If true, UI should emphasize the whole section as critical/pass-fail. */
  critical?: boolean | 'passFail';
  /** Optional freeform description to render under the title. */
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
  /** true if script came from a school override rather than defaults. */
  isCustom?: boolean;
  /** where it came from: firestore path, file path, etc. */
  sourceHint?: string;
}

/** Arguments for the resolver helper. */
export interface ResolveWalkthroughArgs {
  /** Class token ("class-a", …) OR CDL code ("A", …). */
  classType: WalkthroughClassToken | CdlClassCode | string;
  /** If provided, attempt to load a school-specific override. */
  schoolId?: SchoolId | null;
  /** If true, prefer custom even if validation fails (then fall back). */
  preferCustom?: boolean;
  /** When true, return {script:null} instead of throwing on load errors. */
  softFail?: boolean;
}

// ======================================================================
// Module declarations matching our import aliases:
//
//   import { getWalkthroughByClass, getWalkthroughLabel } from '@walkthrough'
//   import { resolveWalkthrough } from '@walkthrough/loaders'
// ======================================================================

declare module '@walkthrough' {
  import type {
    WalkthroughClassToken,
    CdlClassCode,
    WalkthroughScript,
    WalkthroughMap,
    WalkthroughLabels,
  } from './schema';

  /** Default scripts keyed by class token. */
  export const DEFAULT_WALKTHROUGHS: WalkthroughMap;

  /** Human-readable labels for tokens. */
  export const WALKTHROUGH_LABELS: WalkthroughLabels;

  /**
   * Resolve a script by CDL class code ("A", "B", …) OR by token
   * ("class-a", "class-b", …). Returns `null` when unknown.
   */
  export function getWalkthroughByClass(
    classType: WalkthroughClassToken | CdlClassCode | string
  ): WalkthroughScript | null;

  /** Safe label lookup for UI (falls back to the raw string). */
  export function getWalkthroughLabel(
    classType: WalkthroughClassToken | CdlClassCode | string
  ): string;

  export type {
    WalkthroughClassToken,
    CdlClassCode,
    WalkthroughScript,
    WalkthroughMap,
    WalkthroughLabels,
  };
}

declare module '@walkthrough/loaders' {
  import type {
    ResolveWalkthroughArgs,
    ResolvedWalkthrough,
    WalkthroughScript,
  } from './schema';

  /**
   * Attempts to load a custom school walkthrough, falling back to defaults.
   * SuperAdmin and dev utils use this to preview overrides.
   */
  export function resolveWalkthrough(
    args: ResolveWalkthroughArgs
  ): Promise<ResolvedWalkthrough>;

  export type { ResolveWalkthroughArgs, ResolvedWalkthrough, WalkthroughScript };
}

// Make this file a module (avoids global augmentations leaking).
export {};