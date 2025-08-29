// Path: src/admin/companies/add-company/utils/transforms.js
// ============================================================================
// Add-Company • transforms (pure, side-effect free)
// - Normalizes raw form values → canonical Firestore payload
// - Safe defaults for optional fields
// - Optional audit + school stamping kept here so the UI stays dumb
// - Compatible with existing companiesApi schema (name/contact/address/status/...)
// ============================================================================

/** Company name rule (letters, numbers, space, - ' . &) — mirrors other modules. */
export const NAME_RE = /^[\w\s\-'.&]+$/

/** Permissive client-side email check (server remains source of truth). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Normalize a string: toString → trim. */
function s(x) {
  return String(x ?? '').trim()
}

/** Lowercase + trim email (returns '' if invalid/empty). */
export function normalizeEmail(x) {
  const e = s(x).toLowerCase()
  return e && EMAIL_RE.test(e) ? e : ''
}

/**
 * Build the canonical Company payload your backend expects.
 *
 * Notes:
 * - Keeps old fields (`contact`, `address`, `status`, audit stamps) so it
 *   plays nicely with existing list/export code.
 * - Adds `billing` object + `contactEmail` if provided.
 * - If `opts.actor`/`opts.schoolId` are omitted, they're simply not set.
 *
 * @param {{ name?: string, billingMode?: 'employer'|'individual', contactEmail?: string }} form
 * @param {{ schoolId?: string, actor?: string }=} opts
 * @returns {object} Firestore-ready payload
 */
export function toCompanyPayload(form = {}, opts = {}) {
  const nowIso = new Date().toISOString()

  // --- normalize inputs ----------------------------------------------------
  const name = s(form.name)
  const modeRaw = s(form.billingMode || 'employer').toLowerCase()
  const billingMode = modeRaw === 'individual' ? 'individual' : 'employer' // clamp to allowed
  const contactEmail = normalizeEmail(form.contactEmail)

  // Guard name here (keeps services simple; UI should also validate)
  const safeName =
    name && NAME_RE.test(name)
      ? name
      : name /* still pass through */ || '(unnamed)'

  // --- baseline payload (compatible with companiesApi) ---------------------
  const payload = {
    // primary fields
    name: safeName,
    // legacy/compat fields your list/exports already use:
    contact: '', // (kept for compatibility; empty by default)
    address: '', // (optional; not collected in this drawer)
    status: true, // new companies start Active

    // new structured field
    billing: { mode: billingMode },

    // optional email if provided (omit entirely if blank)
    ...(contactEmail ? { contactEmail } : {}),

    // scope (optional; include if caller has it)
    ...(opts.schoolId ? { schoolId: opts.schoolId } : {}),

    // audit stamps (optional but recommended)
    ...(opts.actor ? { createdBy: opts.actor, updatedBy: opts.actor } : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  return payload
}

/**
 * Convenience: minimal payload for UI state (no audit/school). Useful when
 * you want to keep services responsible for stamping + scoping.
 */
export function toMinimalCompanyPayload(form = {}) {
  return toCompanyPayload(form)
}
