// src/lib/user-profile/index.js
// ======================================================================
// User Profile Library (barrel)
// - Pure barrel: no direct references to possibly-missing named exports
// - Re-exports everything from leaf modules (tree-shakable)
// - Optional default namespace export for ergonomics
// - Zero side effects
// ======================================================================

// 1) Tree-shakable re-exports (preferred import style)
export * from './firestore.js'
export * from './helpers.js'
export * from './lists.js'
export * from './normalize.js'
export * from './progress.js'

// 2) Safe default namespace (does NOT assume specific named exports exist)
import * as firestore from './firestore.js'
import * as helpers from './helpers.js'
import * as lists from './lists.js'
import * as normalize from './normalize.js'
import * as progress from './progress.js'

const UserProfile = { firestore, helpers, lists, normalize, progress }
export default UserProfile