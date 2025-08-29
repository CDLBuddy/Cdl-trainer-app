// src/admin/reports/services/fieldMaps.js
// ======================================================================
// Field Maps + Helpers
// - Canonical keys used across the app
// - Normalizers for class/endorsement/trainingType/date
// - Required-field validator with deep path support
// - Canonical → TPR map (thin transform layer for API payloads)
// ======================================================================

/** Canonical training type constants (internal) */
export const TRAINING_TYPES = {
  THEORY: 'theory',
  BTW: 'btw',
  BOTH: 'both',
}

/** Canonical CDL class labels (A/B/C) */
export const CLASS_LABELS = {
  A: 'Class A',
  B: 'Class B',
  C: 'Class C',
}

/** Canonical endorsements (FMCSA letters -> friendly label) */
export const ENDORSEMENT_LABELS = {
  N: 'Tank',
  P: 'Passenger',
  S: 'School Bus',
  T: 'Doubles/Triples',
  H: 'Hazmat',
  X: 'Tank + Hazmat',
  NONE: 'None',
}

/** App-wide canonical required fields (deep paths) */
export const REQUIRED_FIELDS = [
  'trainee.fullName',
  'trainee.dob',
  'trainee.state',
  'trainee.licenseNumber', // CLP or CDL #
  'programType', // theory|btw|both
  'completedAt', // YYYY-MM-DD
  'provider.tprId',
]

/**
 * Canonical → TPR API key mapping
 * (Adjust these to match your real TPR service. They’re used by mappers.)
 */
export const CANONICAL_TO_TPR = {
  'trainee.fullName': 'trainee.fullName',
  'trainee.dob': 'trainee.dob',
  'trainee.state': 'trainee.state',
  'trainee.licenseNumber': 'trainee.licenseNumber',
  programType: 'training.programType',
  completedAt: 'training.completedAt',
  'provider.tprId': 'provider.tprId',
  // Optional but common:
  'training.classType': 'training.classType',
  'training.endorsement': 'training.endorsement',
  'training.theory.completed': 'training.theory.completed',
  'training.btw.completed': 'training.btw.completed',
}

/* --------------------------------------------------------------------- */
/* Deep-path helpers (no external deps)                                   */
/* --------------------------------------------------------------------- */

export function pathGet(obj, path, fallback = undefined) {
  if (!obj || !path) return fallback
  const parts = String(path).split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return fallback
    cur = cur[p]
  }
  return cur
}

export function pathSet(obj, path, value) {
  if (!obj || !path) return obj
  const parts = String(path).split('.')
  let cur = obj
  for (let i = 0; i < parts.length; i += 1) {
    const k = parts[i]
    if (i === parts.length - 1) {
      cur[k] = value
    } else {
      cur[k] = cur[k] && typeof cur[k] === 'object' ? cur[k] : {}
      cur = cur[k]
    }
  }
  return obj
}

export const pathHas = (obj, path) =>
  pathGet(obj, path, undefined) !== undefined

/* --------------------------------------------------------------------- */
/* Normalizers                                                            */
/* --------------------------------------------------------------------- */

export function normalizeTrainingType(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase()
  if (s === TRAINING_TYPES.THEORY || s === 't') return TRAINING_TYPES.THEORY
  if (s === TRAINING_TYPES.BTW || s === 'range' || s === 'road')
    return TRAINING_TYPES.BTW
  if (s === TRAINING_TYPES.BOTH || s === 'all') return TRAINING_TYPES.BOTH
  // Heuristics: accept “theory|btw|both” in any order; default BOTH if ambiguous
  if (/(theory).*(btw)|(btw).*(theory)/.test(s)) return TRAINING_TYPES.BOTH
  return TRAINING_TYPES.BOTH
}

export function normalizeClassType(v) {
  const s = String(v || '')
    .trim()
    .toUpperCase()
    .replace(/^CLASS\s*/i, '')
  return s === 'A' || s === 'B' || s === 'C' ? s : 'A'
}

export function normalizeEndorsement(v) {
  const s = String(v || '')
    .trim()
    .toUpperCase()
  if (!s) return 'NONE'
  const map = { N: 'N', P: 'P', S: 'S', T: 'T', H: 'H', X: 'X', NONE: 'NONE' }
  // Accept words too
  if (/haz(mat)?/i.test(s)) return 'H'
  if (/pass/i.test(s)) return 'P'
  if (/school/i.test(s)) return 'S'
  if (/tank/i.test(s)) return 'N'
  if (/double|triple/i.test(s)) return 'T'
  if (/x(?![a-z])/i.test(s)) return 'X'
  return map[s] || 'NONE'
}

/** Coerce to YYYY-MM-DD if a date-like value is provided; else '' */
export function toISODate(v) {
  if (!v) return ''
  try {
    const d = v instanceof Date ? v : new Date(v)
    if (!Number.isFinite(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

/* --------------------------------------------------------------------- */
/* Validation                                                             */
/* --------------------------------------------------------------------- */

export function validateRequired(obj, required = REQUIRED_FIELDS) {
  const missing = []
  for (const p of required) {
    const val = pathGet(obj, p, undefined)
    const ok = !(val === undefined || val === null || String(val).trim() === '')
    if (!ok) missing.push(p)
  }
  return { ok: missing.length === 0, missing }
}

/** Convenience that returns user-friendly messages */
export function validateWithMessages(obj, required = REQUIRED_FIELDS) {
  const { ok, missing } = validateRequired(obj, required)
  if (ok) return { ok, messages: [] }
  const messages = missing.map(p => {
    switch (p) {
      case 'trainee.fullName':
        return 'Trainee full name is required'
      case 'trainee.dob':
        return 'Date of birth is required'
      case 'trainee.state':
        return 'Issuing state (CLP/CDL) is required'
      case 'trainee.licenseNumber':
        return 'CLP/CDL number is required'
      case 'programType':
        return 'Program type (theory/btw/both) is required'
      case 'completedAt':
        return 'Completion date is required'
      case 'provider.tprId':
        return 'Provider TPR ID is required'
      default:
        return `${p} is required`
    }
  })
  return { ok: false, messages }
}

/* --------------------------------------------------------------------- */
/* Display helpers                                                        */
/* --------------------------------------------------------------------- */

export function displayClassLabel(v) {
  return CLASS_LABELS[normalizeClassType(v)] || CLASS_LABELS.A
}
export function displayEndorsementLabel(v) {
  const key = normalizeEndorsement(v)
  return ENDORSEMENT_LABELS[key] || ENDORSEMENT_LABELS.NONE
}
export function displayTrainingTypeLabel(v) {
  const t = normalizeTrainingType(v)
  if (t === TRAINING_TYPES.THEORY) return 'Theory'
  if (t === TRAINING_TYPES.BTW) return 'Behind-the-Wheel'
  return 'Theory + BTW'
}

/* --------------------------------------------------------------------- */
/* Tiny example mapper (optional; used by your mappers.toTPRCompletion)   */
/* --------------------------------------------------------------------- */

// Given a canonical certificate-like object, create a minimal TPR-ish payload.
// Your real mapper can import these helpers and expand safely.
export function mapCanonicalToTPR(obj) {
  const out = {}
  for (const [from, to] of Object.entries(CANONICAL_TO_TPR)) {
    const val = pathGet(obj, from, undefined)
    if (val !== undefined) pathSet(out, to, val)
  }
  // Normalize a few fields that TPR typically expects
  const programType = normalizeTrainingType(pathGet(obj, 'programType', 'both'))
  pathSet(out, 'training.programType', programType)
  const cls = normalizeClassType(pathGet(obj, 'training.classType', 'A'))
  pathSet(out, 'training.classType', cls)
  const end = normalizeEndorsement(pathGet(obj, 'training.endorsement', 'NONE'))
  pathSet(out, 'training.endorsement', end)
  const iso = toISODate(pathGet(obj, 'completedAt'))
  if (iso) pathSet(out, 'training.completedAt', iso)
  return out
}

/* --------------------------------------------------------------------- */
/* Notes                                                                  */
/* - Keep this file dependency-light; other layers (validators/mappers)   */
/*   can import from here to stay consistent.                             */
/* - If your TPR API fields change, update CANONICAL_TO_TPR + the few     */
/*   normalizations above and the rest of the app won’t need refactors.   */
/* --------------------------------------------------------------------- */
