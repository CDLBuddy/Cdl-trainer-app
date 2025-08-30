// Path: src/admin/walkthroughs/shared/index.js
// -----------------------------------------------------------------------------
// Shared barrel (deluxe)
// - Centralizes exports for shared hooks + services
// - Namespaces + star re-exports (tree-shakable)
// - Direct convenience re-exports for common helpers
// - Explicit index.js paths to avoid resolver ambiguity
// -----------------------------------------------------------------------------

/* ───────────── Namespaces (ESM namespace re-exports) ───────────── */
export * as hooks from './hooks/index.js'
export * as services from './services/index.js'

/* ───────────── Star re-exports (tree-shakable) ───────────── */
export * from './hooks/index.js'
export * from './services/index.js'

/* ───────────── Convenience direct exports ───────────── */
// Walkthrough helpers
export {
  cloneDeep,
  inferLabelFromToken,
  nextId,
  nowIso,
  toToken,
} from './services/walkthroughHelpers.js'

// Validation helpers
export { ensureScriptShape, validateScript } from './services/wtValidation.js'

/* ───────────── Hooks (compat + typo alias) ─────────────
   NOTE: useScriptState exports as a **named** export. There is no default.
*/
export { useScriptState } from './hooks/useScriptState.js'
// Historical typo alias some code referenced:
export { useScriptState as useScriptsState } from './hooks/useScriptState.js'

/* ───────────── Optional default namespace ───────────── */
import * as hooksNS from './hooks/index.js'
import * as servicesNS from './services/index.js'

const shared = { services: servicesNS, hooks: hooksNS }
export default shared