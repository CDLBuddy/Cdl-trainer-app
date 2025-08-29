// src/walkthrough-data/overlays/phases/skills-test.js
// ======================================================================
// Phase overlay: Skills test
// - Applies adjustments specific to the "skills test" exam phase
// - Plain-data overlay (no side effects), frozen + DEV validation
// ======================================================================

// @ts-check

/**
 * @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay
 *
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
  id: 'phase:skills-test',
  meta: {
    title: 'Phase: Skills Test',
    description:
      'Focuses the walkthrough on skills-test maneuvers (backing, alley dock, offset, parallel, etc.). Allows section-level replace/append/hide/remove.',
    version: 1,
  },
  rules: [
    // ================= EXAMPLES (leave commented) =======================
    // Append parallel parking instructions to the Backing section:
    // {
    //   op: 'appendSteps',
    //   match: { section: 'Backing' },
    //   steps: [{ script: 'Parallel park (sight-side or blind-side) per examiner.' }],
    // },
    //
    // Replace a section with a standardized maneuver set:
    // {
    //   op: 'replaceSectionSteps',
    //   match: { section: 'Alley Dock' },
    //   steps: [
    //     { script: 'Position vehicle at start line, wheels straight.' },
    //     { script: 'Back into the simulated dock within boundary lines.' },
    //     { script: 'Stop, set brake, honk as required by examiner.' },
    //   ],
    // },
    //
    // Hide sections not part of the skills test focus:
    // { op: 'hideSection', match: { section: 'In-Cab' } },
    // { op: 'hideSection', match: { section: 'Engine Compartment' } },
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
    if (!(typeof overlay.id === 'string' && overlay.id.trim().length > 0)) {
      console.warn('[overlays/phases:skills-test] Missing or invalid id')
    }

    if (!Array.isArray(overlay.rules)) {
      console.warn(
        '[overlays/phases:skills-test] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        if (!r || typeof r !== 'object') {
          console.warn(
            `[overlays/phases:skills-test] Rule at index ${i} must be an object`
          )
          return
        }

        const op = /** @type {any} */ (r).op
        const section = /** @type {any} */ (r)?.match?.section
        const hasSection = typeof section === 'string' && section.length > 0

        if (op === 'replaceSectionSteps' || op === 'appendSteps') {
          const hasSteps = Array.isArray(/** @type {any} */ (r).steps)
          if (!(hasSection && hasSteps)) {
            console.warn(
              `[overlays/phases:skills-test] Invalid ${op} rule at ${i} — requires match.section and steps[]`
            )
          }
        } else if (op === 'removeSection' || op === 'hideSection') {
          if (!hasSection) {
            console.warn(
              `[overlays/phases:skills-test] Invalid ${op} rule at ${i} — requires match.section`
            )
          }
        } else {
          console.warn(
            `[overlays/phases:skills-test] Unknown op "${op}" at index ${i}`
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
