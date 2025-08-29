// src/admin/communications/hooks/index.js
// ======================================================================
// Admin • Communications • Hooks (barrel)
// - Pure named exports (no defaults, no side effects)
// - Keeps import sites tidy: `import { useComposeMessage } from '@admin/communications'`
// ======================================================================

export { useComposeMessage } from './useComposeMessage.js'
export { useMessageHistory } from './useMessageHistory.js'
export { useTemplates } from './useTemplates.js'
