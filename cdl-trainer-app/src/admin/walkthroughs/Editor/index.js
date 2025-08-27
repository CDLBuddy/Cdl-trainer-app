//src/admin/walkthroughs/Editor/index.js
// Path: /src/admin/walkthroughs/Editor/index.js
// -----------------------------------------------------------------------------
// Editor barrel
// - Default export: WalkthroughEditor
// - Named exports for Editor, components, hooks, and local services
// - Keeps imports tidy:  import { WalkthroughEditor, EditorTabs } from './Editor'
// -----------------------------------------------------------------------------

// Component (main page)
export { default as WalkthroughEditor } from './WalkthroughEditor.jsx'
// Also allow `import Editor from './Editor'`
export { default } from './WalkthroughEditor.jsx'

// Components (re-exported from ./components/index.js)
export * from './components'

// Hooks (re-exported from ./hooks/index.js)
export * from './hooks'

// Services — keep local helpers available to consumers of Editor.
// If you later switch these to the shared barrel, you can keep this line
// as a thin proxy without changing import sites.
export * from './services/wtValidation.js'