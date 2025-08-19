// ADD-STUDENT • service: saveStudent
// - Validates + normalizes the form
// - Builds canonical payload via transforms
// - Persists via updateUserProfileFields
// - Returns a small result object (ok / error) so UIs can branch cleanly

import { updateUserProfileFields } from '@utils/userProfile.js'
import { validate } from '../utils/validations.js'
import { toPayload, normalizeEmail } from '../utils/transforms.js'

/**
 * Persist (create/update) a student profile seed.
 * Idempotent: re-saves same email with latest admin inputs.
 *
 * @param {object} opts
 * @param {object} opts.form
 * @param {string[]} [opts.overlays=[]] - derived from course/class by caller
 * @param {string} opts.companyId
 * @param {string} [opts.actor='admin@system'] - who performs the change
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export default async function saveStudent({
  form,
  overlays = [],
  companyId,
  actor = 'admin@system',
}) {
  // 1) Validate early with user-friendly copy
  const error = validate(form, companyId)
  if (error) return { ok: false, error }

  // 2) Normalize + build canonical payload
  const email = normalizeEmail(form?.email)
  const safeOverlays = Array.isArray(overlays) ? overlays.filter(Boolean) : []
  const payload = toPayload(form, { companyId, actor, overlays: safeOverlays })

  // 3) Persist
  try {
    await updateUserProfileFields(email, payload, actor)
    return { ok: true }
  } catch (e) {
    // Add context for logs while returning a clean message to UI
    console.error('saveStudent failed:', e)
    return {
      ok: false,
      error: 'Failed to save student. Please check your connection and try again.',
    }
  }
}

// (Optional) Named export if you prefer:
// export { saveStudent as default }