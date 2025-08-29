// src/admin/communications/services/index.js
// ======================================================================
// Admin • Communications • Services (barrel)
// - Pure named exports that forward to the Firebase-backed service
// - Easy to swap implementations later without touching callers
// ======================================================================

export {
  listMessages,
  listTemplates,
  queueMessage,
  upsertTemplate,
} from './commsApi.js'
