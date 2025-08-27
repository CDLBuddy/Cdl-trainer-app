// src/communications/hooks/useUnread.js
/**
 * Unread counter for the recipient inbox.
 * - Persists a per-user/role/scope "last seen" timestamp in localStorage
 * - Works with Firestore Timestamp, Date, ISO string, or number
 * - SSR-safe (guards localStorage/window)
 *
 * Returns:
 *  { items, loading, error, unread, lastSeen, newestMs,
 *    markAllRead, markSeenThrough, setLastSeen }
 *
 * Options:
 *  - role, schoolId, companyId, take
 *  - markOnMount?: boolean  (if true, auto-mark as read after first load)
 */
import { useEffect, useMemo, useState } from 'react'
import { useInbox } from './useInbox.js'

const hasWindow = () => typeof window !== 'undefined'

/** TS | Date | ISO | number -> ms (0 on failure) */
function tsToMs(ts) {
  try {
    if (!ts) return 0
    if (typeof ts === 'number') return Number.isFinite(ts) ? ts : 0
    if (typeof ts?.toMillis === 'function') return ts.toMillis()
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    const n = d?.getTime?.()
    return Number.isFinite(n) ? n : 0
  } catch { return 0 }
}

/** Per-user-ish key so multiple users on one device don’t collide */
function storageKeyFor({ role, schoolId, companyId }) {
  const r = role || 'student'
  const s = schoolId || 'default'
  const c = companyId || 'default'
  const userHint =
    (hasWindow() &&
      (localStorage.getItem('currentUserEmail') ||
       localStorage.getItem('uid'))) ||
    'anon'
  return `inbox:lastSeen:${r}:${s}:${c}:${userHint}`
}

function readLS(key, fallback = 0) {
  if (!hasWindow()) return fallback
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) ? v : fallback
  } catch { return fallback }
}
function writeLS(key, value) {
  if (!hasWindow()) return
  try { localStorage.setItem(key, String(value)) } catch { /* ignore */ }
}

export function useUnreadAnnouncements({
  role,
  schoolId,
  companyId,
  take = 20,
  markOnMount = false,
} = {}) {
  // Let useInbox infer missing role/scope; it exposes the resolved role.
  const { items, loading, error, role: resolvedRole } =
    useInbox({ role, schoolId, companyId, take })

  const key = useMemo(
    () => storageKeyFor({ role: resolvedRole || role, schoolId, companyId }),
    [resolvedRole, role, schoolId, companyId]
  )

  // Load once per key
  const [lastSeen, setLastSeen] = useState(() => readLS(key, 0))

  // Persist whenever it changes
  useEffect(() => { writeLS(key, lastSeen) }, [key, lastSeen])

  // Find newest message timestamp (max across list)
  const newestMs = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return 0
    let max = 0
    for (const m of items) {
      const when = tsToMs(m?.scheduleAt || m?.createdAt)
      if (when > max) max = when
    }
    return max
  }, [items])

  // Count unread vs lastSeen
  const unread = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return 0
    const seen = lastSeen || 0
    let n = 0
    for (const m of items) {
      const when = tsToMs(m?.scheduleAt || m?.createdAt)
      if (when > seen) n++
    }
    return n
  }, [items, lastSeen])

  // Mark helpers
  const markAllRead = () => {
    const now = Date.now()
    setLastSeen(Math.max(now, newestMs || now))
  }
  const markSeenThrough = (through) => {
    const t = tsToMs(through)
    if (!t) return
    setLastSeen(prev => (t > prev ? t : prev))
  }

  // Optional: auto-mark after first successful load
  useEffect(() => {
    if (!markOnMount || loading || !newestMs) return
    setLastSeen(prev => (newestMs > prev ? newestMs : prev))
    // run once per key/newestMs pair
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markOnMount, loading, newestMs, key])

  return {
    items,
    loading,
    error,
    unread,
    lastSeen,
    newestMs,
    markAllRead,
    markSeenThrough,
    setLastSeen,
  }
}