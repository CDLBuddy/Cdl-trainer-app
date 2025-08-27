// Path: src/lib/user-profile/index.js
// ======================================================================
// User Profile Library (barrel)
// - Named exports for tree-shaking
// - Optional default namespace for ergonomic imports
// - Zero side effects
// ======================================================================

// Named re-exports (preferred: enables tree-shaking)
export * from './helpers.js'
export * from './normalize.js'
export * from './progress.js'
export * from './firestore.js'
export * from './lists.js'

// Optional grouped namespaces (ergonomic default import)
// NOTE: Using the default namespace may pull more code into a given chunk
// than strictly necessary. Prefer named imports in performance-critical code.
import * as helpers from './helpers.js'
import * as normalize from './normalize.js'
import * as progress from './progress.js'
import * as firestore from './firestore.js'
import * as lists from './lists.js'

/**
 * @typedef {object} UserProfileLib
 * @property {typeof import('./helpers.js')}   helpers
 * @property {typeof import('./normalize.js')} normalize
 * @property {typeof import('./progress.js')}  progress
 * @property {typeof import('./firestore.js')} firestore
 * @property {typeof import('./lists.js')}     lists
 */

/** @type {UserProfileLib} */
const UserProfile = { helpers, normalize, progress, firestore, lists }
export default UserProfile