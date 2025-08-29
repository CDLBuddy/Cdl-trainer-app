// Path: src/types/eldt.ts
// ======================================================================
// ELDT / TPR Domain Types (single source of truth)
// - Enums (as const arrays) + literal unions
// - Canonical TPRCompletion payload shape (mirrors your validators)
// - CSV row type for bulk uploads
// - Lightweight runtime type guards (isProgramType, isClassType, …)
// ======================================================================

/** YYYY-MM-DD (UTC, no time zone) */
export type ISODate =
  `${number}${number}${number}${number}-${number}${number}-${number}${number}`

/* ------------------------------ Domains ---------------------------------- */

export const PROGRAM_TYPES = ['theory', 'btw', 'both'] as const
export type ProgramType = (typeof PROGRAM_TYPES)[number]

export const CLASS_TYPES = ['A', 'B', 'C'] as const
export type ClassType = (typeof CLASS_TYPES)[number]

export const ENDORSE_CODES = ['N', 'P', 'S', 'T', 'H', 'X', 'NONE'] as const
export type Endorsement = (typeof ENDORSE_CODES)[number]

/** Runtime sets (handy for validation without importing validators.js) */
export const ProgramTypeSet = new Set(PROGRAM_TYPES)
export const ClassTypeSet = new Set(CLASS_TYPES)
export const EndorsementSet = new Set(ENDORSE_CODES)

/* ---------------------------- Provider block ----------------------------- */

export interface ProviderAddress {
  street?: string
  city?: string
  state?: string
  zip?: string
}

export interface ProviderProfile {
  /** FMCSA Training Provider Registry ID */
  tprId: string
  /** Display name */
  name?: string
  /** Tax ID (TIN/EIN), if you store it */
  tin?: string
  /** Helpful contact metadata (optional; not submitted to TPR) */
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: ProviderAddress
}

/* ----------------------------- Trainee block ----------------------------- */

export interface Trainee {
  fullName: string
  firstName?: string
  lastName?: string
  dob: ISODate
  /** CLP/CDL number (whichever you store) */
  licenseNumber?: string
  /** CLP/CDL issuing state (2-letter) */
  licenseState?: string
  /** If you track CLP separately */
  clpNumber?: string
  clpState?: string
  clpIssued?: ISODate
  email?: string
  id?: string
}

/* ----------------------------- Training block ---------------------------- */

export interface TheoryPart {
  completed?: boolean
  completedAt?: ISODate
  /** Optional extra detail, not required by TPR */
  scorePct?: number
}

export interface BtwPart {
  completed?: boolean
  completedAt?: ISODate
  rangeHours?: number
  publicRoadHours?: number
  vehicleType?: string
}

export interface Training {
  classType: ClassType
  endorsement: Endorsement | '' // '' = none
  programType: ProgramType
  theory?: TheoryPart
  btw?: BtwPart
  /** Some consumers expect this nested field */
  completedAt?: ISODate
  /** Kept for back-compat with older UI bits */
  completionDate?: ISODate
  /** Often mirrors endorsements; consumer-defined */
  categories?: string[]
  /** Extra flags you may carry */
  restrictionsLifted?: string[]
}

/* ----------------------------- Meta & Root ------------------------------- */

export interface CertMeta {
  /** Your internal record id (e.g., for audit/reprint) */
  recordId?: string
  /** ISO instant (when this payload was built) */
  createdAt?: string
  /** Useful if you scope by school in multi-tenant envs */
  schoolId?: string
  /** Optional schema marker for downstream parsers */
  schema?: string
}

/**
 * Canonical TPR completion payload.
 * Mirrors key fields at both top level and under training.*
 * This matches validators.js expectations exactly.
 */
export interface TPRCompletion {
  trainee: Trainee
  provider: ProviderProfile
  training: Training
  /** Top-level mirror (validators read this) */
  programType: ProgramType
  /** Optional consumer field (can mirror training.categories) */
  categories?: string[]
  /** Top-level mirror (validators read this) */
  completedAt?: ISODate
  meta?: Record<string, unknown> & CertMeta
}

/* ------------------------------- CSV shape -------------------------------- */

export interface TprCsvRow {
  ProviderTPRID: string
  ProviderName: string
  CDLClass: ClassType
  Endorsement: Endorsement | '' // '' allowed by importer
  TraineeFullName: string
  TraineeDOB: ISODate
  CLPNumber: string
  CLPIssuingState: string // 2-letter
  CompletionDate: ISODate
  TheoryCompleted: 'Y' | 'N'
  BTWCompleted: 'Y' | 'N'
}

/* ----------------------------- Type guards -------------------------------- */

export function isISODateString(v: unknown): v is ISODate {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
export function isProgramType(v: unknown): v is ProgramType {
  return typeof v === 'string' && ProgramTypeSet.has(v as ProgramType)
}
export function isClassType(v: unknown): v is ClassType {
  return typeof v === 'string' && ClassTypeSet.has(v as ClassType)
}
export function isEndorsement(v: unknown): v is Endorsement {
  return typeof v === 'string' && EndorsementSet.has(v as Endorsement)
}

/* ----------------------------- Re-exports (nice) -------------------------- */
/** Useful at call sites that want both list + type */
export const PROGRAM_TYPES_LIST = PROGRAM_TYPES
export const CLASS_TYPES_LIST = CLASS_TYPES
export const ENDORSEMENTS_LIST = ENDORSE_CODES
