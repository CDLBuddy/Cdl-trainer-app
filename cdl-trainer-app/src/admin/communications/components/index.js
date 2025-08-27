// src/admin/communications/components/index.js
// ======================================================================
// Admin • Communications • Components (barrel)
// - Pure re-exports (no side effects)
// - Keep explicit named exports for better DX + tree-shaking
// - Provide stable alias "MessageList" → MessageHistoryTable
// ======================================================================

export { default as ComposeForm }         from './ComposeForm.jsx'
export { default as MessageHistoryTable } from './MessageHistoryTable.jsx'
export { default as TemplateList }        from './TemplateList.jsx'
export { default as QuickAnnounce }       from './QuickAnnounce.jsx'

// Alias to match page-shell naming that expects "MessageList"
export { default as MessageList }         from './MessageHistoryTable.jsx'