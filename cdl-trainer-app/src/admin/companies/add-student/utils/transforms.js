// ADD-STUDENT • transforms (pure mappers / normalizers)

/** Normalize email for writes. */
export function normalizeEmail(s) {
  return (s || '').trim().toLowerCase();
}

/**
 * Build the canonical payload your backend expects.
 * Keeps all date/actor stamping here so UI stays dumb.
 *
 * @param {object} form
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} [opts.actor='admin'] - who is performing the change
 * @param {string[]} [opts.overlays=[]] - derived from course/class by caller
 */
export function toPayload(form, { companyId, actor = 'admin', overlays = [] } = {}) {
  const nowIso = new Date().toISOString();
  const mode = String(form?.billing || 'employer').toLowerCase();

  return {
    email: normalizeEmail(form?.email),
    name: (form?.name || '').trim(),
    course: (form?.course || '').trim(),
    cdlClass: form?.cdlClass || '',
    overlays: overlays?.length ? overlays : null,
    billing: { mode }, // keep structure to allow future fields
    assignedInstructor: (form?.assignedInstructor || '').trim() || null,
    companyId: companyId || null,

    // system fields
    role: 'student',
    status: 'active',
    verified: {},

    // audit
    updatedAt: nowIso,
    updatedBy: actor,
    createdAt: nowIso,
    createdBy: actor,
  };
}