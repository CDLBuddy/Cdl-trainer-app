// Path: /src/admin/walkthroughs/Manager/index.js
// -----------------------------------------------------------------------------
// Manager barrel
// - Default export: WalkthroughManager
// - Named export: WalkthroughManager
// - Re-exports local components/hooks/services for tidy imports.
//
//   import WalkthroughManager, { useManagerState } from '@/admin/walkthroughs/Manager'
//
// Notes:
// • Expects ./components/index.js, ./hooks/index.js, and ./services/index.js
//   to exist (simple re-export barrels).
// -----------------------------------------------------------------------------

// Main page
export { default as WalkthroughManager } from './WalkthroughManager.jsx'
export { default } from './WalkthroughManager.jsx'

// Subpackages
export * from './components'
export * from './hooks'
export * from './services'