// ADD-STUDENT • validations (pure, no side effects)

/** Simple, permissive email check (client-side only). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Return a user-facing error string ('' means valid).
 * Keeps UI copy here so components stay clean.
 * @param {object} form
 * @param {string} companyId
 * @returns {string}
 */
export function validate(form, companyId) {
  const email = (form?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return 'Please enter a valid email.';
  if (!(form?.course || '').trim()) return 'Please enter a course.';
  if (!form?.cdlClass) return 'Please select a CDL class.';
  if (!companyId) return 'Missing companyId; cannot attach student.';
  return '';
}

/**
 * Fast boolean gate the Save button can use.
 * @param {object} formWithCompany - includes companyId
 * @param {boolean} saving
 */
export function canSave(formWithCompany, saving) {
  const { email, course, cdlClass, companyId } = formWithCompany || {};
  const ok =
    Boolean(companyId) &&
    EMAIL_RE.test((email || '').trim().toLowerCase()) &&
    Boolean((course || '').trim()) &&
    Boolean(cdlClass);

  return ok && !saving;
}