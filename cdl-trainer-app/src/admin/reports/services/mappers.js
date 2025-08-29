// src/admin/reports/services/mappers.js
// ======================================================================
// Mappers
// - Map your student/training/provider models to a TPR completion payload
// - Accepts multiple source shapes (loose in, strict out)
// - Normalizes programType/classType/endorsement/dates
// - Mirrors key fields at both top-level and under training.* (compat)
// ======================================================================

import {
  normalizeTrainingType,
  normalizeClassType,
  normalizeEndorsement,
  toISODate,
  pathGet,
} from './fieldMaps.js'

/** Coalesce first non-empty trimmed string */
function coalesceStr(...vals) {
  for (const v of vals) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}
function coalesceDate(...vals) {
  for (const v of vals) {
    const iso = toISODate(v)
    if (iso) return iso
  }
  return ''
}

/** Heuristics to pluck sub-objects from arbitrary rows */
function pluckStudent(input = {}) {
  if (input.student) return input.student
  if (input.trainee) return input.trainee
  if (input.profile) return input.profile
  const maybe =
    input.firstName ||
    input.lastName ||
    input.fullName ||
    input.name ||
    input.email
      ? input
      : {}
  return maybe
}
function pluckTraining(input = {}) {
  if (input.training) return input.training
  if (input.course) return input.course
  return input // some rows are flat
}
function pluckProvider(input = {}) {
  if (input.provider) return input.provider
  if (input.school) return input.school
  if (input.brand) return input.brand
  return {}
}

/**
 * Map (student, training, provider) → TPR completion payload
 * Accepts either:
 *  - { student, training, provider }
 *  - a "row" that contains those pieces (heuristically plucked)
 *  - a canonical cert-like object { trainee, training, provider }
 */
export function toTPRCompletion(src = {}) {
  const isCanonical = !!(src.trainee && src.training && src.provider)

  const student = isCanonical
    ? src.trainee
    : pluckStudent(src.student ? src : src)
  const training = isCanonical
    ? src.training
    : pluckTraining(src.training ? src : src)
  const provider = isCanonical
    ? src.provider
    : pluckProvider(src.provider ? src : src)

  /* ------------------------------ Trainee -------------------------------- */

  const firstName = coalesceStr(
    pathGet(student, 'firstName'),
    pathGet(student, 'first_name')
  )
  const lastName = coalesceStr(
    pathGet(student, 'lastName'),
    pathGet(student, 'last_name')
  )
  const fullName = coalesceStr(
    pathGet(student, 'fullName'),
    pathGet(student, 'name'),
    [firstName, lastName].filter(Boolean).join(' ')
  )

  const dob = coalesceDate(
    pathGet(student, 'dob'),
    pathGet(student, 'dateOfBirth'),
    pathGet(student, 'birthDate')
  )

  // Prefer explicit CLP/CDL fields, but mirror to both so downstream strict checkers pass.
  const clpNumberSrc = coalesceStr(
    pathGet(student, 'clpNumber'),
    pathGet(student, 'clp')
  )
  const licenseNumberSrc = coalesceStr(
    pathGet(student, 'licenseNumber'),
    pathGet(student, 'cdlNumber')
  )
  const anyLicenseNumber = coalesceStr(licenseNumberSrc, clpNumberSrc)

  const clpStateSrc = coalesceStr(pathGet(student, 'clpState'))
  const licenseStateSrc = coalesceStr(
    pathGet(student, 'licenseState'),
    pathGet(student, 'state')
  )
  const anyLicenseState = coalesceStr(licenseStateSrc, clpStateSrc)

  /* ------------------------------ Training ------------------------------- */

  const programType = normalizeTrainingType(
    coalesceStr(
      pathGet(training, 'programType'),
      pathGet(training, 'trainingType'),
      // derive from boolean flags; default to 'both' if ambiguous
      (pathGet(training, 'theory.completed') ||
        pathGet(training, 'theoryCompleted')) &&
        (pathGet(training, 'btw.completed') ||
          pathGet(training, 'btwCompleted'))
        ? 'both'
        : pathGet(training, 'theory.completed') ||
            pathGet(training, 'theoryCompleted')
          ? 'theory'
          : pathGet(training, 'btw.completed') ||
              pathGet(training, 'btwCompleted')
            ? 'btw'
            : 'both'
    )
  )

  const classType = normalizeClassType(
    coalesceStr(
      pathGet(training, 'classType'),
      pathGet(training, 'class'),
      pathGet(training, 'cdlClass')
    )
  )

  const endorsement = normalizeEndorsement(
    coalesceStr(
      pathGet(training, 'endorsement'),
      pathGet(training, 'endorse'),
      pathGet(training, 'endorsements')
    )
  )

  const completedAt = coalesceDate(
    pathGet(training, 'completionDate'),
    pathGet(training, 'completedAt'),
    pathGet(src, 'completedAt') // canonical top-level (cert shape)
  )

  const theoryCompletedAt = coalesceDate(
    pathGet(training, 'theory.completedAt'),
    pathGet(training, 'theoryCompletedAt')
  )
  const btwCompletedAt = coalesceDate(
    pathGet(training, 'btw.completedAt'),
    pathGet(training, 'btwCompletedAt')
  )

  const theoryCompleted = Boolean(
    pathGet(training, 'theory.completed') ??
      pathGet(training, 'theoryCompleted') ??
      false
  )
  const btwCompleted = Boolean(
    pathGet(training, 'btw.completed') ??
      pathGet(training, 'btwCompleted') ??
      false
  )

  const rangeHours =
    Number(
      pathGet(training, 'btw.rangeHours') ??
        pathGet(training, 'rangeHours') ??
        0
    ) || 0
  const publicRoadHours =
    Number(
      pathGet(training, 'btw.publicRoadHours') ??
        pathGet(training, 'roadHours') ??
        0
    ) || 0

  const categoriesRaw = Array.isArray(pathGet(training, 'categories'))
    ? pathGet(training, 'categories')
    : Array.isArray(pathGet(training, 'endorsements'))
      ? pathGet(training, 'endorsements')
      : []
  const categories = Array.from(
    new Set(categoriesRaw.filter(Boolean).map(String))
  )

  /* ------------------------------ Provider -------------------------------- */

  const tprId = coalesceStr(
    pathGet(provider, 'tprId'),
    pathGet(provider, 'TPR_ID')
  )
  const providerName = coalesceStr(
    pathGet(provider, 'name'),
    pathGet(provider, 'providerName')
  )
  const tin = coalesceStr(pathGet(provider, 'tin'), pathGet(provider, 'TIN'))

  /* -------------------------------- Meta ---------------------------------- */

  const meta = {
    studentId: coalesceStr(
      pathGet(src, 'student.id'),
      pathGet(student, 'id'),
      pathGet(src, 'id')
    ),
    company: coalesceStr(
      pathGet(student, 'assignedCompany'),
      pathGet(src, 'assignedCompany')
    ),
    schoolId: coalesceStr(pathGet(src, 'schoolId')),
    recordId: coalesceStr(pathGet(src, 'meta.recordId')),
  }

  /* --------------------------- Final payload ------------------------------ */
  // Mirror key fields at top-level and under training.* for maximum compatibility.
  // Also mirror CLP/CDL identity with best-effort fallbacks.
  const trainee = {
    fullName,
    dob,
    // mirrors so validators that require either form pass:
    clpNumber: clpNumberSrc || anyLicenseNumber || '',
    clpState: clpStateSrc || anyLicenseState || '',
    licenseNumber: anyLicenseNumber || '',
    licenseState: anyLicenseState || '',
  }

  const payload = {
    trainee,
    programType,
    categories,
    completedAt,
    provider: { tprId, name: providerName, tin },
    training: {
      classType,
      endorsement,
      theory: {
        completed: theoryCompleted,
        completedAt: theoryCompletedAt || undefined,
      },
      btw: {
        completed: btwCompleted,
        completedAt: btwCompletedAt || undefined,
        rangeHours,
        publicRoadHours,
      },
      completedAt,
      programType,
    },
    meta,
  }

  return payload
}

/** Map an array of rows/students to TPR completions */
export function toTPRCompletions(rows = []) {
  return (Array.isArray(rows) ? rows : []).map(r => toTPRCompletion(r))
}
