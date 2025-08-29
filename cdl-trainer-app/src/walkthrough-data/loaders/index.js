// Path: //src/walkthrough-data/loaders/index.js
// -----------------------------------------------------------------------------
// Loaders barrel (pure, tree-shakable)
// - Re-exports the resolver with stable names
// - Back-compat aliases so older imports keep working
// - No side effects; safe for SSR
// -----------------------------------------------------------------------------

// Be resilient to different export styles during refactors
// (default export, named export, or module-as-function).
import * as _mod from './resolveWalkthrough.js'

// Prefer a default export, then named, then the module itself if it's a fn.
const _candidate =
  (_mod && (_mod.default || _mod.resolveWalkthrough)) ||
  (_mod && typeof _mod === 'function' ? _mod : null)

if (typeof _candidate !== 'function') {
  // Soft failure — keeps this module side-effect free in SSR builds.
  // Consumers will see an error only if they call it.

  throw new Error('[walkthrough-data/loaders] resolveWalkthrough not found.')
}

/** @type {(opts?: any) => Promise<any>} */
export const resolveWalkthrough = _candidate

// Back-compat / nice aliases (pick whichever reads best at call-sites)
export const loadWalkthrough = resolveWalkthrough
export const resolve = resolveWalkthrough

// Default export mirrors common usage: `import resolveWalkthrough from '.../loaders'`
export default resolveWalkthrough
