// src/walkthrough-data/overlays/common/rename-sections.js
// ======================================================================
// Common overlay helper: rename sections
// - Plain-data overlay object (no side effects)
// - Optionally generate rules from a simple mapping (RENAME_MAP)
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

// Optional convenience: define simple from→to pairs here to auto-build rules.
// Keep empty by default so the module is a no-op until configured.
const RENAME_MAP = Object.freeze({
  // 'Engine Compartment': 'Hood Area',
  // 'In-Cab': 'Cab / Interior',
})

/** @type {RenameSectionRule[]} */
const GENERATED_RULES = Object.entries(RENAME_MAP).map(([from, to]) => ({
  op: 'renameSection',
  match: { section: String(from) },
  to: String(to),
}))

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
    // --- Hand-authored examples (leave commented for guidance) ---------
    // { op: 'renameSection', match: { section: 'Engine Compartment' }, to: 'Hood Area' },
    // { op: 'renameSection', match: { section: 'In-Cab' }, to: 'Cab / Interior' },

    // --- Auto-generated from RENAME_MAP --------------------------------
    ...GENERATED_RULES,
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
    const hasId = typeof overlay.id === 'string' && overlay.id.length > 0
    if (!hasId) {
      console.warn('[overlays/common:rename-sections] Missing or invalid id')
    }

    if (!Array.isArray(overlay.rules)) {
      console.warn(
        '[overlays/common:rename-sections] rules must be an array; got:',
        typeof overlay.rules
      )
    } else {
      overlay.rules.forEach((r, i) => {
        const okOp = r && r.op === 'renameSection'
        const from = r?.match?.section
        const to = r?.to
        const okFrom = typeof from === 'string' && from.trim().length > 0
        const okTo = typeof to === 'string' && to.trim().length > 0
        if (!(okOp && okFrom && okTo)) {
          console.warn(
            `[overlays/common:rename-sections] Invalid rule at index ${i}:`,
            r
          )
        } else if (from.trim() === to.trim()) {
          console.warn(
            `[overlays/common:rename-sections] Rule ${i} renames a section to the same name ("${from}").`
          )
        }
      })
    }
  } catch {
    // swallow — never crash in DEV validation
  }
}

/* =======================================================================
   Immutability: deep-freeze overlay and nested arrays/objects.
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
