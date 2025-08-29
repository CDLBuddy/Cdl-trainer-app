// src/communications/hooks/index.js
// ======================================================================
// Communications • Hooks (barrel)
// - Pure re-exports (no side effects)
// - Stable paths for consumers
// - Named exports only for better tree-shaking
// ======================================================================

/** Inbox reader: fetches announcements for a role/school/company */
export { useInbox } from './useInbox.js'

/**
 * Unread helper:
 * - Persists a “last seen” timestamp per role/scope
 * - Returns { unread, lastSeen, newestMs, markAllRead, markSeenThrough, ... }
 * Alias: useUnread
 */
export {
  useUnreadAnnouncements as useUnread,
  useUnreadAnnouncements,
} from './useUnread.js'
