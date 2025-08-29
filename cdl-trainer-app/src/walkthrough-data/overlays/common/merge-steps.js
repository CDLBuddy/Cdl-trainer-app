// src/walkthrough-data/overlays/common/merge-steps.js
// ======================================================================
// Common overlay helper: merge similar steps
// - Plain-data overlay object (no side effects)
// - Use replace/remove/hide rules to consolidate duplicate steps
// - Supports matching by stepLabel OR tag (optionally narrow by section)
// - Frozen (immutable) + light DEV validation
// ======================================================================

/**
 * @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay
 *
 * @typedef {{
 *   op: 'replaceStepText',
 *   match: { stepLabel?: string, tag?: string, section?: string },
 *   to: string
 * }} ReplaceStepTextRule
 *
 * @typedef {{
 *   op: 'removeStep' | 'hideStep',
 *   match: { stepLabel?: string, tag?: string, section?: string }
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
    // Combine two brake checks into one unified step (all sections):
    // { op: 'replaceStepText', match: { stepLabel: 'Brake Check' }, to: 'Full brake system check' },
    // Narrow match to a specific section only:
    // { op: 'hideStep', match: { section: 'In-Cab Inspection', stepLabel: 'Secondary Brake Check' } },
    // Remove duplicates by tag across sections:
    // { op: 'removeStep', match: { tag: 'duplicate' } },
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
      console.warn('[overlays/common:merge-steps] Missing or invalid id')
    }

    if (!Array.isArray(overlay.rules)) {
      console.warn(
        '[overlays/common:merge-steps] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        if (!r || typeof r !== 'object') {
          console.warn(
            `[overlays/common:merge-steps] Rule at index ${i} must be an object`
          )
          return
        }

        const op = r.op
        const m = r.match || {}
        const hasIdentifier =
          (typeof m.stepLabel === 'string' && m.stepLabel.length > 0) ||
          (typeof m.tag === 'string' && m.tag.length > 0)

        if (op === 'replaceStepText') {
          const hasTo = typeof r.to === 'string' && r.to.length > 0
          if (!(hasIdentifier && hasTo)) {
            console.warn(
              `[overlays/common:merge-steps] Invalid replaceStepText rule at ${i} — requires match.stepLabel or match.tag AND "to"`
            )
          }
        } else if (op === 'removeStep' || op === 'hideStep') {
          if (!hasIdentifier) {
            console.warn(
              `[overlays/common:merge-steps] Invalid ${op} rule at ${i} — requires match.stepLabel or match.tag`
            )
          }
        } else {
          console.warn(
            `[overlays/common:merge-steps] Unknown op "${op}" at index ${i}`
          )
        }
      })
    }
  } catch {
    // never crash in DEV validation
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
