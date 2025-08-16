// ======================================================================
// Common overlay helper: rename sections
// - Plain-data overlay object (no side effects)
// - Frozen (immutable) + light DEV validation
// ======================================================================

/**
 * @typedef {import('@walkthrough-loaders').WalkthroughOverlay} WalkthroughOverlay
 * @typedef {{
 *   op: 'renameSection',
 *   match: { section: string },
 *   to: string
 * }} RenameSectionRule
 */

/** @type {WalkthroughOverlay & { rules: RenameSectionRule[] }} */
const overlay = {
  id: 'common:rename-sections',
  // Optional human context (ignored by the engine but useful in logs/inspections)
  meta: {
    title: 'Rename Sections',
    description:
      'Utility overlay to rename one or more sections by exact name match.',
    version: 1,
  },
  rules: [
    // --- Examples (leave commented for guidance) -----------------------
    // { op: 'renameSection', match: { section: 'Engine Compartment' }, to: 'Hood Area' },
    // { op: 'renameSection', match: { section: 'In-Cab' }, to: 'Cab / Interior' },
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
    const seenId = typeof overlay.id === 'string' && overlay.id.length > 0
    if (!seenId) {
      // eslint-disable-next-line no-console
      console.warn('[overlays/common:rename-sections] Missing or invalid id')
    }

    if (!Array.isArray(overlay.rules)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[overlays/common:rename-sections] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        const okOp = r && r.op === 'renameSection'
        const okMatch = r && r.match && typeof r.match.section === 'string'
        const okTo = r && typeof r.to === 'string'
        if (!(okOp && okMatch && okTo)) {
          // eslint-disable-next-line no-console
          console.warn(
            `[overlays/common:rename-sections] Invalid rule at index ${i}:`,
            r
          )
        }
      })
    }
  } catch {
    // swallow — never crash in DEV validation
  }
}

/* =======================================================================
   Immutability: shallow-freeze overlay and nested arrays/objects.
   (Engine treats overlays as read-only.)
   ======================================================================= */
function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj
  Object.freeze(obj)
  for (const key of Object.keys(obj)) {
    // Already frozen? skip.
    if (obj[key] && typeof obj[key] === 'object' && !Object.isFrozen(obj[key])) {
      deepFreeze(obj[key])
    }
  }
  return obj
}

deepFreeze(overlay)

export default overlay