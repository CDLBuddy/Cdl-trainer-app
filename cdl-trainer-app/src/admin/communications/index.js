// src/admin/communications/index.js
// ======================================================================
// Admin • Communications (barrel)
// - Pure re-exports; no side effects, no CSS/JSX execution
// - Explicit named exports for better DX/tree-shaking
// - Keep paths stable so other barrels can import safely
// ======================================================================

// Page
export { default as AdminCommunications } from './AdminCommunications.jsx'

// Components (export explicitly so consumers don’t need to reach into folders)
export { default as ComposeForm } from './components/ComposeForm.jsx'
export { default as MessageHistoryTable } from './components/MessageHistoryTable.jsx'
export { default as MessageList } from './components/MessageHistoryTable.jsx' // alias
export { default as TemplateList } from './components/TemplateList.jsx'
export { default as QuickAnnounce } from './components/QuickAnnounce.jsx'

// Hooks
export { useComposeMessage } from './hooks/useComposeMessage.js'
export { useMessageHistory } from './hooks/useMessageHistory.js'
export { useTemplates } from './hooks/useTemplates.js'

// Services
export {
  queueMessage,
  listMessages,
  listTemplates,
  upsertTemplate,
} from './services/commsApi.js'

// (Optional) If you still want wildcard barrels for internal use, you can keep:
// export * from './components'
// export * from './hooks'
// export * from './services'
