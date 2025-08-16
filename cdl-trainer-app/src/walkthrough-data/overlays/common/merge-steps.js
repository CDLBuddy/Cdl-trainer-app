// ======================================================================
// Common overlay helper: merge similar steps
// - Plain-data overlay object (no side effects)
// - Use replace/remove/hide rules to consolidate duplicate steps
// - Frozen (immutable) + light DEV validation
// ======================================================================

/**
 * @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay
 *
 * @typedef {{
 *   op: 'replaceStepText',
 *   match: { stepLabel: string },
 *   to: string
 * }} ReplaceStepTextRule
 *
 * @typedef {{
 *   op: 'removeStep' | 'hideStep',
 *   match: { stepLabel: string }
 * }} RemoveOrHideStepRule
 */

/** @type {WalkthroughOverlay & { rules: Array<ReplaceStepTextRule|RemoveOrHideStepRule> }} */
const overlay = {
  id: 'common:merge-steps',
  meta: {
    title: 'Merge Similar Steps',
    description:
      'Utility overlay to merge or consolidate similar or duplicate steps by renaming, hiding, or removing them.',
    version: 1,
  },
  rules: [
    // --- Examples (left commented for guidance) ------------------------
    // Combine two brake checks into one unified step:
    // { op: 'replaceStepText', match: { stepLabel: 'Brake Check' }, to: 'Full brake system check' },
    // Hide a redundant step that your school doesn’t teach separately:
    // { op: 'hideStep', match: { stepLabel: 'Secondary Brake Check' } },
    // Remove a duplicate step that appears twice in the source:
    // { op: 'removeStep', match: { stepLabel: 'Mirror Adjustment' } },
  ],
}

/* =======================================================================
   DEV validation (no-op in prod builds)
   - Ensures rule shapes are correct to avoid silent failures.
   ======================================================================= */
const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

if (IS_DEV) {
  try {
    if (!(typeof overlay.id === 'string' && overlay.id.length > 0)) {
      // eslint-disable-next-line no-console
      console.warn('[overlays/common:merge-steps] Missing or invalid id')
    }

    if (!Array.isArray(overlay.rules)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[overlays/common:merge-steps] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        if (!r || typeof r !== 'object') {
          // eslint-disable-next-line no-console
          console.warn(
            `[overlays/common:merge-steps] Rule at index ${i} must be an object`
          )
          return
        }

        const op = r.op
        const matchLabel = r?.match?.stepLabel
        const hasMatchLabel = typeof matchLabel === 'string' && matchLabel.length > 0

        if (op === 'replaceStepText') {
          const hasTo = typeof r.to === 'string' && r.to.length > 0
          if (!(hasMatchLabel && hasTo)) {
            // eslint-disable-next-line no-console
            console.warn(
              `[overlays/common:merge-steps] Invalid replaceStepText rule at ${i} — requires match.stepLabel and to`
            )
          }
        } else if (op === 'removeStep' || op === 'hideStep') {
          if (!hasMatchLabel) {
            // eslint-disable-next-line no-console
            console.warn(
              `[overlays/common:merge-steps] Invalid ${op} rule at ${i} — requires match.stepLabel`
            )
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `[overlays/common:merge-steps] Unknown op "${op}" at index ${i}`
          )
        }
      })
    }
  } catch {
    // swallow — never crash in DEV validation
  }
}

/* =======================================================================
   Immutability: deep-freeze overlay and nested objects/arrays.
   ======================================================================= */
function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj
  Object.freeze(obj)
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val)
    }
  }
  return obj
}

deepFreeze(overlay)

export default overlay