// Path: /src/admin/walkthroughs/Form/index.js
// -----------------------------------------------------------------------------
// Form barrel
// - Default export: WalkthroughForm
// - Named export: WalkthroughForm
// - Re-exports local components, hooks, and form validation helpers
// - Keeps imports tidy across the app:
//
//   import WalkthroughForm, {
//     deepClone,
//     ensureScriptShape,
//     validateScript,
//   } from '@/admin/walkthroughs/Form'
//
// -----------------------------------------------------------------------------

// Main page
export { default as WalkthroughForm } from './WalkthroughForm.jsx'
export { default } from './WalkthroughForm.jsx'

// Subpackages (must have their own index.js if you want granular imports)
export * from './components'
export * from './hooks'

// Services: expose validation helpers directly from the barrel
export {
  deepClone,
  ensureScriptShape,
  validateScript,
} from './services/wtValidation.js'