// Path: /src/admin/walkthroughs/List/index.js
// -----------------------------------------------------------------------------
// List barrel
// - Default export: WalkthroughList
// - Named export: WalkthroughList
// - Re-exports local components, hooks, and services for tidy imports.
//
//   import WalkthroughList, { useListFilters } from '@/admin/walkthroughs/List'
//
// Notes:
// • Expects ./components/index.js, ./hooks/index.js, and ./services/index.js
//   to exist (simple re-export barrels). If any are missing, I can drop those in.
// -----------------------------------------------------------------------------

// Main page
export { default as WalkthroughList } from './WalkthroughList.jsx'
export { default } from './WalkthroughList.jsx'

// Subpackages
export * from './components'
export * from './hooks'
export * from './services'