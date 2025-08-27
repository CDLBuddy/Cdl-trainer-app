// Path: /src/admin/walkthroughs/Upload/index.js
// -----------------------------------------------------------------------------
// Upload barrel
// - Default export: WalkthroughUpload
// - Named export: WalkthroughUpload
// - Re-exports local components/hooks/services for clean, centralized imports.
//
//   import WalkthroughUpload, { services } from '@/admin/walkthroughs/Upload'
// -----------------------------------------------------------------------------

// Main page
export { default as WalkthroughUpload } from './WalkthroughUpload.jsx'
export { default } from './WalkthroughUpload.jsx'

// Subpackages (named re-exports)
export * from './components'
export * from './hooks'
export * from './services'

// Also expose convenient namespaces to avoid name collisions when importing all.
export * as components from './components'
export * as hooks from './hooks'
export * as services from './services'