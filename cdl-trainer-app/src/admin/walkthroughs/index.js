// Path: /src/admin/walkthroughs/index.js
// Barrel for Admin Walkthrough Management (no side effects)
// Consumers import from '@admin-walkthroughs'

export { default as WalkthroughManager }  from './WalkthroughManager.jsx'
export { default as WalkthroughList }     from './WalkthroughList.jsx'
export { default as WalkthroughEditor }   from './WalkthroughEditor.jsx'
export { default as WalkthroughPreview }  from './WalkthroughPreview.jsx'
export { default as WalkthroughUpload }   from './WalkthroughUpload.jsx'
export { default as WalkthroughForm }     from './WalkthroughForm.jsx'

// Helpers (resolver/validation utils used by the editor & preview)
export * from './walkthroughHelpers.js'

// Styles (optional; lets consumers import via the alias if desired)
export { default as walkthroughStyles }   from './walkthroughStyles.module.css'