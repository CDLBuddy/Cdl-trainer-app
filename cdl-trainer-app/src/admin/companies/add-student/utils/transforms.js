// Path: src/admin/companies/add-student/transforms.js
// ============================================================================
// ADD-STUDENT • transforms (pure mappers / normalizers)
// - Side-effect free utilities
// - Keep UI dumb; centralize all stamping + normalization here
// ============================================================================

/**
 * Normalize email for storage (trim + lowercase).
 * @param {string} s
 * @returns {string}
 */
export function normalizeEmail(s) {
  return (s || '').trim().toLowerCase()
}

/**
 * Build the canonical payload your backend expects.
 * - Adds audit stamps (created/updated).
 * - Keeps billing structured for future expansion.
 * - Caller provides overlays + actor (admin email).
 *
 * @param {object} form - Local form state
 * @param {object} opts
 * @param {string} opts.companyId - Company ID
 * @param {string} [opts.actor='admin'] - Who is performing the change
 * @param {string[]} [opts.overlays=[]] - Derived overlays from course/class
 * @returns {object} payload ready for Firestore write
 */
export function toPayload(
  form,
  { companyId, actor = 'admin', overlays = [] } = {}
) {
  const nowIso = new Date().toISOString()
  const mode = String(form?.billing || 'employer').toLowerCase()

  return {
    // Primary fields
    email: normalizeEmail(form?.email),
    name: (form?.name || '').trim(),
    course: (form?.course || '').trim(),
    cdlClass: (form?.cdlClass || '').trim() || '',
    overlays: overlays?.length ? [...new Set(overlays)] : null,
    billing: { mode }, // expandable in the future
    assignedInstructor: (form?.assignedInstructor || '').trim() || null,
    companyId: companyId || null,

    // System / identity
    role: 'student',
    status: 'active',
    verified: {}, // instructor/admin verified fields (initially empty)

    // Audit trail
    createdAt: nowIso,
    createdBy: actor,
    updatedAt: nowIso,
    updatedBy: actor,
  }
}
