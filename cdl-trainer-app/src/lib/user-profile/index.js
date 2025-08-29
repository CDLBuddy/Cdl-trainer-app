// src/lib/user-profile/index.js
// ======================================================================
// User Profile Library (barrel)
// - Named exports for tree-shaking
// - Optional default namespace for ergonomic imports
// - Zero side effects
// ======================================================================

// Tree-shakable re-exports (preferred)
export * from './firestore.js'
export * from './helpers.js'
export * from './lists.js'
export * from './normalize.js'
export * from './progress.js'

// Namespace imports so we can safely expose compat names
import * as firestore from './firestore.js'
import * as helpers from './helpers.js'
import * as lists from './lists.js'
import * as normalize from './normalize.js'
import * as progress from './progress.js'

// ---- Back-compat named exports (no hard dependency on source files) ------
// If a function doesn't exist in its module yet, these will be `undefined`,
// which is fine and avoids Rollup “not exported by” errors.
export const subscribeUserProfile    = firestore.subscribeUserProfile
export const onUserProfileSnapshot   = firestore.onUserProfileSnapshot
export const updateUserProfile       = firestore.updateUserProfile
export const updateUserProfileFields = helpers.updateUserProfileFields
export const getBlankUserProfile     = helpers.getBlankUserProfile

/**
 * @typedef {object} UserProfileLib
 * @property {typeof import('./helpers.js')}   helpers
 * @property {typeof import('./normalize.js')} normalize
 * @property {typeof import('./progress.js')}  progress
 * @property {typeof import('./firestore.js')} firestore
 * @property {typeof import('./lists.js')}     lists
 */

// Optional ergonomic default namespace
/** @type {UserProfileLib} */
const UserProfile = { helpers, normalize, progress, firestore, lists }
export default UserProfile
