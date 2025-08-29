// Path: src/admin/companies/add-company/utils/validations.js
// ============================================================================
// Add-Company • validations (pure, side-effect free)
// - Defensive normalization (trim/lowercase where appropriate)
// - Clear, field-specific error messages
// - Reasonable length/character limits to prevent junk data
// - Optional email validation for contactEmail
// ============================================================================

/** Permissive, client-side email check (server still authoritative). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Company name rule (letters, numbers, space, - ' . &) */
export const NAME_RE = /^[\w\s\-'.&]+$/

/** Limits to keep inputs tidy (mirror UI maxLength where possible). */
export const LIMITS = Object.freeze({
  name: 60,
  contactEmail: 120,
})

/**
 * Validate the Add Company form values.
 * Returns a map of field → error string. (Empty object means valid.)
 *
 * @param {{ name?: string, billingMode?: string, contactEmail?: string }} raw
 * @param {{ requireEmail?: boolean }=} opts
 *   - requireEmail: set true if you want contactEmail to be mandatory in some flows
 */
export function validateCompany(raw = {}, opts = {}) {
  const errors = {}

  // --- normalize -----------------------------------------------------------
  const name = String(raw.name ?? '').trim()
  const billingMode = String(raw.billingMode ?? 'employer')
    .trim()
    .toLowerCase()
  const contactEmail = String(raw.contactEmail ?? '').trim()

  // --- name ---------------------------------------------------------------
  if (!name) {
    errors.name = 'Company name is required.'
  } else {
    if (name.length > LIMITS.name) {
      errors.name = `Name must be ≤ ${LIMITS.name} characters.`
    } else if (!NAME_RE.test(name)) {
      errors.name =
        "Name contains invalid characters. Allowed: letters, numbers, spaces, - ' . &"
    }
  }

  // --- billing mode -------------------------------------------------------
  if (!['employer', 'individual'].includes(billingMode)) {
    errors.billingMode = 'Choose a valid billing mode.'
  }

  // --- contact email (optional unless requireEmail) -----------------------
  if (opts.requireEmail && !contactEmail) {
    errors.contactEmail = 'Contact email is required.'
  } else if (contactEmail) {
    if (contactEmail.length > LIMITS.contactEmail) {
      errors.contactEmail = `Email must be ≤ ${LIMITS.contactEmail} characters.`
    } else if (!EMAIL_RE.test(contactEmail.toLowerCase())) {
      errors.contactEmail = 'Enter a valid email address.'
    }
  }

  return errors
}

/** Convenience: boolean gate you can use for button enablement. */
export function isCompanyValid(raw, opts) {
  return Object.keys(validateCompany(raw, opts)).length === 0
}
