// ======================================================================
// Phase overlay: Pre-trip inspection
// - Applies adjustments specific to the "pre-trip" exam phase
// - Plain-data overlay (no side effects), frozen + DEV validation
// ======================================================================

/**
 * @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay
 *
 * // Common ops your engine supports in this phase context:
 * @typedef {{
 *   op: 'replaceSectionSteps',
 *   match: { section: string },
 *   steps: Array<any>
 * }} ReplaceSectionStepsRule
 *
 * @typedef {{
 *   op: 'appendSteps',
 *   match: { section: string },
 *   steps: Array<any>
 * }} AppendStepsRule
 *
 * @typedef {{
 *   op: 'removeSection' | 'hideSection',
 *   match: { section: string }
 * }} RemoveOrHideSectionRule
 */

/** @type {WalkthroughOverlay & { rules: Array<ReplaceSectionStepsRule|AppendStepsRule|RemoveOrHideSectionRule> }} */
const overlay = {
  id: 'phase:pre-trip',
  meta: {
    title: 'Phase: Pre-Trip Inspection',
    description:
      'Focuses the walkthrough on pre-trip content; lets you replace, append, hide, or remove sections to match exam emphasis.',
    version: 1,
  },
  rules: [
    // ================= EXAMPLES (leave commented) =======================
    // Keep only pre-trip content by clearing unrelated sections:
    // { op: 'replaceSectionSteps', match: { section: 'Post-trip' }, steps: [] },
    // { op: 'hideSection', match: { section: 'Road Test' } },
    //
    // Add a school-required reminder to a section:
    // {
    //   op: 'appendSteps',
    //   match: { section: 'In-Cab' },
    //   steps: [{ script: 'State/verify emergency equipment is present.' }],
    // },
    //
    // Replace a section’s steps with a standardized set:
    // {
    //   op: 'replaceSectionSteps',
    //   match: { section: 'Engine Compartment' },
    //   steps: [
    //     { script: 'Check oil level.' },
    //     { script: 'Check coolant level.' },
    //     { script: 'Inspect belts and hoses.' },
    //   ],
    // },
  ],
}

/* =======================================================================
   DEV validation (no-op in prod builds)
   ======================================================================= */
const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

if (IS_DEV) {
  try {
    if (!(typeof overlay.id === 'string' && overlay.id.length > 0)) {
      // eslint-disable-next-line no-console
      console.warn('[overlays/phases:pre-trip] Missing or invalid id')
    }

    if (!Array.isArray(overlay.rules)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[overlays/phases:pre-trip] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        if (!r || typeof r !== 'object') {
          // eslint-disable-next-line no-console
          console.warn(
            `[overlays/phases:pre-trip] Rule at index ${i} must be an object`
          )
          return
        }
        const op = r.op
        const section = r?.match?.section
        const hasSection = typeof section === 'string' && section.length > 0

        if (op === 'replaceSectionSteps' || op === 'appendSteps') {
          const hasSteps = Array.isArray(r.steps)
          if (!(hasSection && hasSteps)) {
            // eslint-disable-next-line no-console
            console.warn(
              `[overlays/phases:pre-trip] Invalid ${op} rule at ${i} — requires match.section and steps[]`
            )
          }
        } else if (op === 'removeSection' || op === 'hideSection') {
          if (!hasSection) {
            // eslint-disable-next-line no-console
            console.warn(
              `[overlays/phases:pre-trip] Invalid ${op} rule at ${i} — requires match.section`
            )
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `[overlays/phases:pre-trip] Unknown op "${op}" at index ${i}`
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