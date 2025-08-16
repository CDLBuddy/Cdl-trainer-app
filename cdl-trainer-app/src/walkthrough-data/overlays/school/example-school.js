// ======================================================================
// Example school overlay
// - Customizes walkthrough content for a specific school
// - Plain-data overlay (no side effects), frozen + DEV validation
// ======================================================================

/**
 * @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay
 *
 * @typedef {{
 *   op: 'renameSection',
 *   match: { section: string },
 *   to: string
 * }} RenameSectionRule
 *
 * @typedef {{
 *   op: 'replaceSectionSteps',
 *   match: { section: string },
 *   steps: Array<any>
 * }} ReplaceSectionStepsRule
 */

/** @type {WalkthroughOverlay & { rules: Array<RenameSectionRule|ReplaceSectionStepsRule> }} */
const overlay = {
  id: 'school:EXAMPLE',
  meta: {
    title: 'School: Example',
    description:
      'Demonstrates how to create a school-specific overlay to rename sections, replace steps, or otherwise customize content for one school.',
    version: 1,
  },
  rules: [
    // ================= EXAMPLES (leave commented) =======================
    // Rename "Engine Compartment" to "Under the Hood":
    // { op: 'renameSection', match: { section: 'Engine Compartment' }, to: 'Under the Hood' },
    //
    // Replace steps for a section:
    // {
    //   op: 'replaceSectionSteps',
    //   match: { section: 'Coupling System' },
    //   steps: [
    //     { script: 'Inspect fifth wheel for proper height.' },
    //     { script: 'Check kingpin lock mechanism.' },
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
      console.warn('[overlays/school:example-school] Missing or invalid id')
    }

    if (!Array.isArray(overlay.rules)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[overlays/school:example-school] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        if (!r || typeof r !== 'object') {
          // eslint-disable-next-line no-console
          console.warn(
            `[overlays/school:example-school] Rule at index ${i} must be an object`
          )
          return
        }
        const op = r.op
        if (op === 'renameSection') {
          const okMatch =
            r?.match && typeof r.match.section === 'string' && r.match.section.length > 0
          const okTo = typeof r.to === 'string' && r.to.length > 0
          if (!(okMatch && okTo)) {
            // eslint-disable-next-line no-console
            console.warn(
              `[overlays/school:example-school] Invalid renameSection rule at ${i}`
            )
          }
        } else if (op === 'replaceSectionSteps') {
          const okMatch =
            r?.match && typeof r.match.section === 'string' && r.match.section.length > 0
          const okSteps = Array.isArray(r.steps)
          if (!(okMatch && okSteps)) {
            // eslint-disable-next-line no-console
            console.warn(
              `[overlays/school:example-school] Invalid replaceSectionSteps rule at ${i}`
            )
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `[overlays/school:example-school] Unknown op "${op}" at index ${i}`
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