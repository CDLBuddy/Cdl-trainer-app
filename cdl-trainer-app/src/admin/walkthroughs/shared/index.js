// Path: /src/admin/walkthroughs/shared/index.js
// -----------------------------------------------------------------------------
// Shared barrel (deluxe)
// - Centralizes exports for shared hooks + services
// - Gives both star re-exports and tidy namespaces
// - Also re-exports the most-used helpers directly to avoid deep imports
//
//   import { services, hooks } from '@/admin/walkthroughs/shared'
//   import { validateScript } from '@/admin/walkthroughs/shared'
// -----------------------------------------------------------------------------

// Namespaced access
export * as hooks from './hooks'
export * as services from './services'

// Star re-exports (tree-shakeable)
export * from './hooks'
export * from './services'

// ---- Direct, convenience re-exports (avoid deep import paths) --------------
export {
  cloneDeep,
  inferLabelFromToken,
  nextId,
  nowIso,
  // walkthroughHelpers
  toToken,
} from './services/walkthroughHelpers.js'
export {
  // wtValidation
  ensureScriptShape,
  validateScript,
} from './services/wtValidation.js'

// Common hook (export with and without the historical typo)
export { default as useScriptState } from './hooks/useScriptState.js'

// Optional default namespace object
import * as hooks from './hooks'
import * as services from './services'

const shared = { services, hooks }
export default shared
