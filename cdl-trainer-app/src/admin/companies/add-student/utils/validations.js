// Path: src/admin/companies/add-student/utils/validations.js
// ============================================================================
// ADD-STUDENT • validations (pure, no side effects)
// - Centralizes client-side field rules + user-facing copy
// - Back-compat: `validate(form, companyId)` still returns a string
// - Extras: `validateDetailed` (with `field`), `isEmailValid`, `canSave`
// ============================================================================

/** Simple, permissive email check (client-side only). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Canonical field names for focusing + analytics */
export const FIELD = /** @type const */ ({
  EMAIL: 'email',
  COURSE: 'course',
  CDL_CLASS: 'cdlClass',
  COMPANY_ID: 'companyId',
})

/**
 * Normalize/sanitize the bits we validate.
 * Keeps guards uniform across validate() and canSave().
 */
function coerce(form, companyId) {
  return {
    email: String(form?.email || '').trim().toLowerCase(),
    course: String(form?.course || '').trim(),
    cdlClass: String(form?.cdlClass || ''),
    companyId: String(companyId || ''),
  }
}

/** Lightweight email validator for reuse. */
export function isEmailValid(email) {
  return EMAIL_RE.test(String(email || '').trim().toLowerCase())
}

/**
 * Back-compat API:
 * Return a user-facing error string ('' means valid).
 * Keeps UI copy here so components stay clean.
 * @param {object} form
 * @param {string} companyId
 * @returns {string}
 */
export function validate(form, companyId) {
  const v = coerce(form, companyId)
  if (!isEmailValid(v.email)) return 'Please enter a valid email.'
  if (!v.course) return 'Please enter a course.'
  if (!v.cdlClass) return 'Please select a CDL class.'
  if (!v.companyId) return 'Missing companyId; cannot attach student.'
  return ''
}

/**
 * Detailed validator: returns { valid, error, field }.
 * Useful for focusing the first invalid field and for telemetry.
 *
 * @param {object} form
 * @param {string} companyId
 * @returns {{ valid: boolean, error: string, field?: keyof typeof FIELD }}
 */
export function validateDetailed(form, companyId) {
  const v = coerce(form, companyId)

  if (!isEmailValid(v.email)) {
    return { valid: false, error: 'Please enter a valid email.', field: FIELD.EMAIL }
  }
  if (!v.course) {
    return { valid: false, error: 'Please enter a course.', field: FIELD.COURSE }
  }
  if (!v.cdlClass) {
    return { valid: false, error: 'Please select a CDL class.', field: FIELD.CDL_CLASS }
  }
  if (!v.companyId) {
    return { valid: false, error: 'Missing companyId; cannot attach student.', field: FIELD.COMPANY_ID }
  }
  return { valid: true, error: '' }
}

/**
 * Fast boolean gate the Save button can use.
 * @param {object} formWithCompany - includes companyId
 * @param {boolean} saving
 * @returns {boolean}
 */
export function canSave(formWithCompany, saving) {
  const email = String(formWithCompany?.email || '').trim().toLowerCase()
  const course = String(formWithCompany?.course || '').trim()
  const cdlClass = String(formWithCompany?.cdlClass || '')
  const companyId = String(formWithCompany?.companyId || '')

  const ok =
    Boolean(companyId) &&
    EMAIL_RE.test(email) &&
    Boolean(course) &&
    Boolean(cdlClass)

  return ok && !saving
}