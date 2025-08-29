// src/admin/reports/services/validators.js
// ======================================================================
// Validators
// - Validate a TPR completion payload (shape produced by mappers.js)
// - Presence checks with flexible mirrors (CLP/CDL number & state)
// - Strict date formats (YYYY-MM-DD), value domains, and soft warnings
// - Batch-friendly + UI-safe error strings
// ======================================================================

// Only need pathGet; presence rules are handled locally (more flexible)
import { pathGet } from './fieldMaps.js'

// ---- Allowed domains ----------------------------------------------------

const PROGRAM_TYPES = new Set(['theory', 'btw', 'both'])
const CLASS_TYPES = new Set(['A', 'B', 'C'])
const ENDORSE_CODES = new Set(['N', 'P', 'S', 'T', 'H', 'X', 'NONE'])

// ---- Tiny utils ---------------------------------------------------------

const isNonEmpty = v => v != null && String(v).trim() !== ''
const isISODate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isState2 = v => typeof v === 'string' && /^[A-Z]{2}$/.test(v)
const uniq = (arr = []) => Array.from(new Set(arr))

const pickFirst = (...vals) => {
  for (const v of vals) if (isNonEmpty(v)) return v
  return ''
}

// ---- Core validation ----------------------------------------------------

/**
 * Validate a single TPR payload object.
 * @param {object} payload
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateTPRPayload(payload) {
  const errors = []
  const warnings = []

  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['Payload must be an object'], warnings }
  }

  // Pull common fields with mirrors/fallbacks
  const fullName = pathGet(payload, 'trainee.fullName')
  const dob = pathGet(payload, 'trainee.dob')

  const licNum = pathGet(payload, 'trainee.licenseNumber')
  const clpNum = pathGet(payload, 'trainee.clpNumber')
  const anyNum = pickFirst(licNum, clpNum)

  const licSt = pathGet(payload, 'trainee.licenseState')
  const clpSt = pathGet(payload, 'trainee.clpState')
  const state = pickFirst(licSt, clpSt, pathGet(payload, 'trainee.state'))

  const topCompleted = pathGet(payload, 'completedAt')
  const tCompleted = pathGet(payload, 'training.completedAt')
  const theoryAt = pathGet(payload, 'training.theory.completedAt')
  const btwAt = pathGet(payload, 'training.btw.completedAt')
  const anyCompleted = pickFirst(topCompleted, tCompleted, theoryAt, btwAt)

  const classType = String(
    pathGet(payload, 'training.classType') || ''
  ).toUpperCase()
  const endorsement = String(
    pathGet(payload, 'training.endorsement') || ''
  ).toUpperCase()
  const programType = String(
    pathGet(payload, 'programType') || ''
  ).toLowerCase()

  const tprId = pathGet(payload, 'provider.tprId')

  // 1) Presence (aligns with tprClient.normalizeCompletion and mapper output)
  if (!isNonEmpty(fullName)) errors.push('Missing trainee.fullName')
  if (!isNonEmpty(dob)) errors.push('Missing trainee.dob')
  if (!isNonEmpty(anyNum))
    errors.push('Missing trainee.licenseNumber or trainee.clpNumber')
  if (!isNonEmpty(state))
    errors.push('Missing trainee.licenseState or trainee.clpState')
  if (!isNonEmpty(classType)) errors.push('Missing training.classType')
  if (!isNonEmpty(anyCompleted))
    errors.push(
      'Missing completion date (completedAt/training.completedAt/theory.btw)'
    ) // friendly, covers all
  if (!isNonEmpty(tprId)) errors.push('Missing provider.tprId')

  // 2) Formats / domains
  if (isNonEmpty(dob) && !isISODate(dob)) {
    errors.push('trainee.dob must be YYYY-MM-DD')
  }
  if (isNonEmpty(topCompleted) && !isISODate(topCompleted)) {
    errors.push('completedAt must be YYYY-MM-DD')
  }
  if (isNonEmpty(tCompleted) && !isISODate(tCompleted)) {
    errors.push('training.completedAt must be YYYY-MM-DD')
  }
  if (isNonEmpty(theoryAt) && !isISODate(theoryAt)) {
    errors.push('training.theory.completedAt must be YYYY-MM-DD')
  }
  if (isNonEmpty(btwAt) && !isISODate(btwAt)) {
    errors.push('training.btw.completedAt must be YYYY-MM-DD')
  }

  if (isNonEmpty(state) && !isState2(String(state).toUpperCase())) {
    errors.push('Issuing state must be a 2-letter code (e.g., IN)')
  }

  if (isNonEmpty(programType) && !PROGRAM_TYPES.has(programType)) {
    errors.push(
      `programType must be one of: ${Array.from(PROGRAM_TYPES).join(', ')}`
    )
  }
  if (isNonEmpty(classType) && !CLASS_TYPES.has(classType)) {
    errors.push('training.classType must be A, B, or C')
  }
  if (isNonEmpty(endorsement) && !ENDORSE_CODES.has(endorsement)) {
    errors.push(
      `training.endorsement must be one of: ${Array.from(ENDORSE_CODES).join(', ')}`
    )
  }

  // Light sanity
  const lic = pathGet(payload, 'trainee.licenseNumber')
  if (isNonEmpty(lic) && String(lic).length > 40) {
    warnings.push('trainee.licenseNumber looks unusually long')
  }
  if (isNonEmpty(tprId) && String(tprId).length > 64) {
    warnings.push('provider.tprId looks unusually long')
  }

  // 3) Cross-field consistency (warnings, not hard errors)
  if (
    isNonEmpty(topCompleted) &&
    isNonEmpty(tCompleted) &&
    topCompleted !== tCompleted
  ) {
    warnings.push(
      'completedAt and training.completedAt differ; consumers may prefer them to match'
    )
  }
  if (
    isNonEmpty(licSt) &&
    isNonEmpty(clpSt) &&
    String(licSt).toUpperCase() !== String(clpSt).toUpperCase()
  ) {
    warnings.push(
      'licenseState and clpState differ; ensure issuing state is correct'
    )
  }

  const theoryDone = !!pathGet(payload, 'training.theory.completed')
  const btwDone = !!pathGet(payload, 'training.btw.completed')
  if (PROGRAM_TYPES.has(programType)) {
    if (programType === 'theory' && !theoryDone)
      warnings.push(
        'programType is "theory" but training.theory.completed is false'
      )
    if (programType === 'btw' && !btwDone)
      warnings.push('programType is "btw" but training.btw.completed is false')
    if (programType === 'both' && !(theoryDone && btwDone)) {
      warnings.push(
        'programType is "both" but theory/btw completed flags are not both true'
      )
    }
  }

  // Categories shape
  const categories = pathGet(payload, 'categories')
  if (Array.isArray(categories)) {
    const bad = categories.filter(c => typeof c !== 'string' || !isNonEmpty(c))
    if (bad.length)
      warnings.push(
        'categories contains empty or non-string entries (ignored by some consumers)'
      )
  } else if (categories != null) {
    warnings.push('categories should be an array of strings')
  }

  return {
    ok: errors.length === 0,
    errors: uniq(errors),
    warnings: uniq(warnings),
  }
}

/**
 * Validate many payloads at once (useful before bulk submit).
 * @param {Array<object>} items
 * @returns {{
 *   results: Array<{ index:number, ok:boolean, errors:string[], warnings:string[] }>,
 *   okCount: number,
 *   errorCount: number
 * }}
 */
export function validateTPRPayloads(items = []) {
  const results = (Array.isArray(items) ? items : []).map((p, i) => {
    const r = validateTPRPayload(p)
    return { index: i, ...r }
  })
  const okCount = results.filter(r => r.ok).length
  const errorCount = results.length - okCount
  return { results, okCount, errorCount }
}

/**
 * Convenience: throws a single Error with joined messages if invalid.
 * @param {object} payload
 */
export function assertValidTPRPayload(payload) {
  const r = validateTPRPayload(payload)
  if (!r.ok) {
    const msg = r.errors.join('; ')
    const warn = r.warnings.length
      ? ` (warnings: ${r.warnings.join('; ')})`
      : ''
    throw new Error(`Invalid TPR payload: ${msg}${warn}`)
  }
}
