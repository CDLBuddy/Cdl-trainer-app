// Path: /src/admin/walkthroughs/index.js
// -----------------------------------------------------------------------------
// Barrel exports for the Admin Walkthrough Management module.
// Purpose:
// - Provide clean, short imports like:
//     import { WalkthroughManager, WalkthroughEditor } from '@admin-walkthroughs'
// - Keep JSX components and helpers discoverable in one place.
// -----------------------------------------------------------------------------

// Pages / main components
export { default as WalkthroughManager }   from './WalkthroughManager.jsx'
export { default as WalkthroughList }      from './WalkthroughList.jsx'
export { default as WalkthroughEditor }    from './WalkthroughEditor.jsx'
export { default as WalkthroughPreview }   from './WalkthroughPreview.jsx'
export { default as WalkthroughUpload }    from './WalkthroughUpload.jsx'
export { default as WalkthroughForm }      from './WalkthroughForm.jsx'

// Helpers (parsers/validators/adapters)
// NOTE: These are placeholders for now; we’ll replace with real implementations.
export * from './walkthroughHelpers.js'

// Styles (optional re-export if you want consumers to import via the alias)
// Usage example in a component:
//   import styles from '@admin-walkthroughs/walkthroughStyles.module.css'
export { default as walkthroughStyles } from './walkthroughStyles.module.css'