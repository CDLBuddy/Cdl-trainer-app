// src/student/walkthrough/drills/index.js
// ======================================================================
// WALKTHROUGH DRILLS BARREL (side-effect free, treeshake-friendly)
// - Keeps existing default exports (no breaking changes)
// - Adds DRILL_TYPES union + helpers
// - Exposes optional lazy loaders for code-splitting (opt-in)
// - JSDoc typedefs for great editor hints
// ======================================================================

// @ts-check

/* -------------------------------- Types -------------------------------- */
/**
 * Discrete drill identifiers used throughout the Walkthrough page.
 * @typedef {'fill'|'order'|'type'|'visual'} DrillType
 */

/* ------------------------------ Constants ------------------------------ */
/** @type {readonly DrillType[]} */
export const DRILL_TYPES = /** @type {const} */ (['fill', 'order', 'type', 'visual'])

/* --------------------------- Eager re-exports --------------------------- */
/** Keep current API stable */
export { default as FillClozeDrill }  from './FillClozeDrill.jsx'
export { default as OrderStepsDrill } from './OrderStepsDrill.jsx'
export { default as TypePhraseDrill } from './TypePhraseDrill.jsx'
export { default as VisualRecallDrill } from './VisualRecallDrill.jsx'

/* ------------------------- Optional lazy loaders ------------------------ */
/**
 * On-demand loaders (useful if you decide to code-split drills later).
 * Usage (opt-in):
 *   const { default: FillClozeDrill } = await loadFillClozeDrill();
 */
export const loadFillClozeDrill   = () => import('./FillClozeDrill.jsx')
export const loadOrderStepsDrill  = () => import('./OrderStepsDrill.jsx')
export const loadTypePhraseDrill  = () => import('./TypePhraseDrill.jsx')
export const loadVisualRecallDrill = () => import('./VisualRecallDrill.jsx')

/**
 * Map of drill loaders for dynamic selection:
 *   const Comp = (await drillsLazy.visual()).default
 */
export const drillsLazy = Object.freeze({
  fill:   loadFillClozeDrill,
  order:  loadOrderStepsDrill,
  type:   loadTypePhraseDrill,
  visual: loadVisualRecallDrill,
})