// Path: /src/admin/walkthroughs/Preview/index.js
// -----------------------------------------------------------------------------
// Preview barrel
// - Default export: WalkthroughPreview
// - Named export: WalkthroughPreview
// - Re-exports local components/hooks/services for clean imports.
//
//   import WalkthroughPreview, { PreviewHeader } from '@/admin/walkthroughs/Preview'
// -----------------------------------------------------------------------------

// Main page
export { default as WalkthroughPreview } from './WalkthroughPreview.jsx'
export { default } from './WalkthroughPreview.jsx'

// Subpackages
export * from './components'
export * from './hooks'
export * from './services'
