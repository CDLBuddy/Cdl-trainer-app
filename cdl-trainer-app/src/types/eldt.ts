// Path: src/types/eldt.ts
// ======================================================================
// ELDT / TPR Domain Types (single source of truth)
// - Enums (as const arrays) + literal unions
// - Canonical TPRCompletion payload shape (mirrors your validators)
// - CSV row type for bulk uploads
// - Lightweight runtime type guards + normalization helpers
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

/* ---------------------------- Normalizers (new) --------------------------- */
/**
 * Accepts common user/UIs strings and normalizes to a ProgramType.
 * Returns undefined if it cannot be normalized.
 */
export function normalizeProgramType(v: unknown): ProgramType | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim().toLowerCase()
  const map: Record<string, ProgramType> = {
    theory: 'theory',
    classroom: 'theory',

    btw: 'btw',
    'behindthewheel': 'btw',
    'behind-the-wheel': 'btw',
    'behind the wheel': 'btw',

    both: 'both',
    combined: 'both',
  }
  return map[s]
}

/**
 * Accepts strings like "A", "class a", "cdl-a" and normalizes to "A" | "B" | "C".
 */
export function normalizeClassType(v: unknown): ClassType | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim().toUpperCase().replace(/\s+/g, '')
  const map: Record<string, ClassType> = {
    A: 'A',
    CLASSA: 'A',
    'CDLA': 'A',
    'CDL-A': 'A',

    B: 'B',
    CLASSB: 'B',
    'CDLB': 'B',
    'CDL-B': 'B',

    C: 'C',
    CLASSC: 'C',
    'CDLC': 'C',
    'CDL-C': 'C',
  }
  return map[s]
}

/**
 * Accepts endorsement letters or common names (case-insensitive).
 * Returns a valid code letter (N,P,S,T,H,X) or '' for none.
 */
export function normalizeEndorsement(v: unknown): Endorsement | '' | undefined {
  if (v == null) return ''
  if (typeof v !== 'string') return undefined
  const s = v.trim().toUpperCase()

  // explicit "none" / empty
  if (s === '' || s === 'NONE' || s === 'N/A' || s === 'NA' || s === 'NO') return ''

  // letter codes
  if (EndorsementSet.has(s as Endorsement)) return s as Endorsement

  // common names -> letters
  const map: Record<string, Endorsement | ''> = {
    TANK: 'N',
    TANKER: 'N',

    PASSENGER: 'P',

    SCHOOLBUS: 'S',
    'SCHOOL BUS': 'S',

    'DOUBLE': 'T',
    'DOUBLES': 'T',
    'TRIPLE': 'T',
    'TRIPLES': 'T',
    'DOUBLE/TRIPLE': 'T',
    'DOUBLES/TRIPLES': 'T',

    HAZMAT: 'H',
    HAZARDOUS: 'H',
    HAZARDOUSMATERIALS: 'H',

    // X = Tank + Hazmat
    'X': 'X',
    'TANK+HAZMAT': 'X',
    'TANK HAZMAT': 'X',
    'HAZMAT+TANK': 'X',
  }

  // normalize spaces and punctuation for lookup
  const key = s.replace(/[^\w]/g, '')
  return map[key]
}

/**
 * Formats various inputs into an ISODate (YYYY-MM-DD, UTC).
 * Returns undefined for invalid inputs.
 */
export function toISODate(input: unknown): ISODate | undefined {
  if (typeof input === 'string') {
    const t = input.trim()
    if (isISODateString(t)) return t as ISODate

    // Try to parse common formats like MM/DD/YYYY or YYYY/MM/DD
    const mdy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(t)
    if (mdy) {
      const mm = Number(mdy[1])
      const dd = Number(mdy[2])
      const yyyy = Number(mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3])
      const d = new Date(Date.UTC(yyyy, mm - 1, dd))
      if (!Number.isNaN(d.getTime())) return fmtDateUTC(d)
    }

    // fallback: Date.parse for other reasonable strings
    const d = new Date(t)
    if (!Number.isNaN(d.getTime())) return fmtDateUTC(d)
    return undefined
  }

  if (input instanceof Date) {
    if (!Number.isNaN(input.getTime())) return fmtDateUTC(input)
    return undefined
  }

  if (typeof input === 'number') {
    const d = new Date(input)
    if (!Number.isNaN(d.getTime())) return fmtDateUTC(d)
    return undefined
  }

  return undefined
}

function fmtDateUTC(d: Date): ISODate {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}` as ISODate
}

/* ----------------------------- Re-exports (nice) -------------------------- */
/** Useful at call sites that want both list + type */
export const PROGRAM_TYPES_LIST = PROGRAM_TYPES
export const CLASS_TYPES_LIST = CLASS_TYPES
export const ENDORSEMENTS_LIST = ENDORSE_CODES
