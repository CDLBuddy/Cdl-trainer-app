// src/walkthrough-data/overlays/school/example-school.js
// ======================================================================
// Example school overlay
// - Customizes walkthrough content for a specific school
// - Plain-data overlay (no side effects), frozen + DEV validation
// ======================================================================

// @ts-check

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
    const hasId = typeof overlay.id === 'string' && overlay.id.length > 0
    if (!hasId) {
      console.warn('[overlays/school:example-school] Missing or invalid id')
    } else if (!/^school:/i.test(overlay.id)) {
      console.warn(
        `[overlays/school:example-school] Id should start with "school:" — got "${overlay.id}"`
      )
    }

    if (!Array.isArray(overlay.rules)) {
      console.warn(
        '[overlays/school:example-school] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        if (!r || typeof r !== 'object') {
          console.warn(
            `[overlays/school:example-school] Rule at index ${i} must be an object`
          )
          return
        }
        const op = r.op
        const section = /** @type {any} */ (r)?.match?.section
        const hasSection = typeof section === 'string' && section.length > 0

        if (op === 'renameSection') {
          const hasTo =
            typeof (/** @type {any} */ (r).to) === 'string' &&
            !!(/** @type {any} */ (r).to)
          if (!(hasSection && hasTo)) {
            console.warn(
              `[overlays/school:example-school] Invalid renameSection rule at ${i} — requires match.section and to`
            )
          }
        } else if (op === 'replaceSectionSteps') {
          const hasSteps = Array.isArray(/** @type {any} */ (r).steps)
          if (!(hasSection && hasSteps)) {
            console.warn(
              `[overlays/school:example-school] Invalid replaceSectionSteps rule at ${i} — requires match.section and steps[]`
            )
          }
        } else {
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
