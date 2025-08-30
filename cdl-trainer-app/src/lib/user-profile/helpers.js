// Path: src/lib/user-profile/helpers.js
// ======================================================================
// Tiny, fast, tree-shakable helpers shared across user-profile modules
// - Email: normalize + validate
// - Objects: stripUndefined, shallowEqual, getByPath
// - Dates: toISODate (local), todayISO, isISODate, isFutureDate
// - Arrays/Strings: ensureArray, uniq
// - Phones: compactPhone, formatPhoneUS
// - Profiles: getBlankUserProfile (legacy-safe)
// ======================================================================

/* ───────────────────────────── Email ───────────────────────────── */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Lowercase + trim. Safe for undefined/null. */
export const normalizeEmail = (e) =>
  String(e || '').trim().toLowerCase()

/** Validate an email after normalization. */
export const isEmail = (e) => EMAIL_RE.test(normalizeEmail(e))

/* ───────────────────────────── Objects ─────────────────────────── */

/** Return a shallow copy with all `undefined` values removed. */
export function stripUndefined(obj = {}) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out
}

/** Very small shallow equality (suitable for plain objects). */
export function shallowEqual(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) if (a[k] !== b[k]) return false
  return true
}

/** Safe dotted-path getter: getByPath(obj, "billing.mode"). */
export function getByPath(obj, path) {
  if (!obj || !path) return undefined
  try {
    return String(path)
      .split('.')
      .reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
  } catch {
    return undefined
  }
}

/* ───────────────────────────── Dates ───────────────────────────── */

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Zero-pad helper. */
const pad2 = (n) => String(n).padStart(2, '0')

/** Convert a value to local YYYY-MM-DD (no timezone surprises). */
export function toISODate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(+d)) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Today as local YYYY-MM-DD. */
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Is a string in strict YYYY-MM-DD shape? */
export function isISODate(s) {
  return typeof s === 'string' && ISO_DATE_RE.test(s)
}

/**
 * True if value represents a calendar date strictly after today.
 * Accepts YYYY-MM-DD, Date, or parseable string.
 */
export function isFutureDate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(+d)) return false
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const t = new Date()
  const tt = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  return dd > tt
}

/* ───────────────────────────── Arrays / Strings ────────────────── */

/** Ensure an array; wrap non-nullish values, otherwise []. */
export function ensureArray(v) {
  return Array.isArray(v) ? v : v != null ? [v] : []
}

/** Deduplicate (preserves first occurrence). */
export function uniq(arr = []) {
  return Array.from(new Set(arr))
}

/* ───────────────────────────── Phones ──────────────────────────── */

/**
 * Compact a phone string to digits only (keeps leading '+', if present).
 * Good for storage/compare; leave presentation to formatters.
 */
export function compactPhone(input) {
  if (!input) return ''
  const s = String(input)
  const hasPlus = s.trim().startsWith('+')
  const digits = s.replace(/\D+/g, '')
  return hasPlus ? `+${digits}` : digits
}

/**
 * Very light US formatter: 10 digits -> "(XXX) XXX-XXXX".
 * Returns null if the digits length !== 10.
 */
export function formatPhoneUS(digitsOnly) {
  const d = String(digitsOnly || '').replace(/\D+/g, '')
  if (d.length !== 10) return null
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/* ───────────────────────────── Profiles ────────────────────────── */

/**
 * Blank/legacy-safe profile scaffold.
 * Keep fields aligned with FIELD_WHITELIST in firestore.js.
 */
export function getBlankUserProfile(uid = '') {
  return {
    id: uid || undefined,
    uid: uid || undefined,
    role: 'student',
    status: 'active',

    // contact
    name: '',
    email: '',
    phone: '',

    // org / assignments
    schoolId: '',
    companyId: '',
    assignedCompany: '',
    assignedInstructor: '',
    assignedInstructorId: '',

    // CDL / overlays
    cdlClass: '',
    overlays: [],
    endorsements: [],
    restrictions: [],
    experience: '',

    // docs
    cdlPermit: '',
    permitPhotoUrl: '',
    permitExpiry: '',
    driverLicenseUrl: '',
    licenseExpiry: '',
    medicalCardUrl: '',
    medCardExpiry: '',

    // vehicle
    vehicleQualified: false,
    truckPlateUrl: '',
    trailerPlateUrl: '',

    // emergency
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',

    // waiver
    waiverSigned: false,
    waiverSignature: '',
    waiverSignatureDate: '',

    // course / schedule
    course: '',
    schedulePref: '',
    scheduleNotes: '',

    // payment / billing
    paymentStatus: '',
    paymentProofUrl: '',
    billing: { mode: '' },

    // accessibility / notes
    accommodation: '',
    studentNotes: '',

    // progress/meta
    profileProgress: 0,
    createdAt: null,
    profileUpdatedAt: null,
    lastUpdatedBy: '',
  }
}

/** Legacy lowercase alias (some old call-sites used this). */
export const getblankuserprofile = (...args) => getBlankUserProfile(...args)