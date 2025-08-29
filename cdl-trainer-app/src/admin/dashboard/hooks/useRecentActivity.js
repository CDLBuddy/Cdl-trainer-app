// Path: src/admin/dashboard/hooks/useRecentActivity.js
// ============================================================================
// useRecentActivity
// - Fetches recent activity feed for the Admin Dashboard
// - Dashboard-scoped (schoolId), abort-safe, and refreshable
// - Uses DYNAMIC import for dashboardApi to avoid mixed static/dynamic chunks
// - Returns normalized activity items sorted by newest first
// ============================================================================

// @ts-check

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * @typedef {Object} ActivityItem
 * @property {string} id         Unique identifier
 * @property {string} type       Activity type (e.g., "ENROLLMENT", "CHECKLIST", "NOTE")
 * @property {string} message    Human-readable message
 * @property {string} [actor]    User who triggered the activity
 * @property {Date}   date       When the event occurred
 * @property {any}   [meta]      Extra metadata (optional)
 */

/**
 * @typedef {Object} UseRecentActivityResult
 * @property {boolean} loading
 * @property {ActivityItem[]} data
 * @property {Error|null} error
 * @property {() => Promise<void>} refresh
 */

/* -------------------------------------------------------------------------- */
/* Dynamic loader (cached)                                                    */
/* -------------------------------------------------------------------------- */

let _activityClientPromise = null
const loadActivityClient = async () => {
  if (_activityClientPromise) return _activityClientPromise
  _activityClientPromise = import('../services/dashboardApi.js').then(m => {
    // dashboardApi exports named `activity` and default { activity }
    return m.activity ?? m.default?.activity
  })
  return _activityClientPromise
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function cryptoRandomId() {
  try {
    return (
      globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
    )
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

function safeDate(x) {
  try {
    const d = x instanceof Date ? x : new Date(x)
    return Number.isFinite(d?.getTime?.()) ? d : new Date()
  } catch {
    return new Date()
  }
}

/**
 * Normalize raw API row → ActivityItem.
 * Supports:
 *  - { id, actor, action, timestamp, icon? }     ← current dashboardApi.activity mock/shape
 *  - { id, type, message, actor?, date, meta? }  ← generic shape
 */
function normalizeItem(raw, idx = 0) {
  try {
    const id = String(raw?.id ?? `tmp-${idx}-${Date.now()}`)
    const actor = raw?.actor ? String(raw.actor) : undefined

    // Prefer explicit fields when present
    if (raw?.message || raw?.type || raw?.date) {
      return {
        id,
        type: String(raw?.type ?? 'INFO'),
        message: String(raw?.message ?? 'Updated'),
        actor,
        date: safeDate(raw?.date),
        meta: raw?.meta ?? null,
      }
    }

    // Fallback to dashboardApi.activity shape
    return {
      id,
      type: 'INFO',
      message: String(raw?.action ?? 'Updated'),
      actor,
      date: safeDate(raw?.timestamp),
      meta: raw?.icon ? { icon: raw.icon } : null,
    }
  } catch {
    return {
      id: `bad-${idx}-${cryptoRandomId()}`,
      type: 'ERROR',
      message: 'Malformed activity item',
      date: new Date(),
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Fetch recent activity for the Admin Dashboard.
 * @param {{ schoolId?: string, limit?: number }} params
 * @returns {UseRecentActivityResult}
 */
export function useRecentActivity({ schoolId, limit = 20 } = {}) {
  const [data, setData] = useState(/** @type {ActivityItem[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {Error|null} */ (null))

  // Drop stale responses on fast remounts/navigation
  const reqIdRef = useRef(0)

  const fetchOnce = useCallback(async () => {
    const take = Number.isFinite(+limit) && +limit > 0 ? +limit : 20

    if (!schoolId) {
      setData([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const id = ++reqIdRef.current
    const ctrl = new AbortController()

    try {
      const activityClient = await loadActivityClient()
      if (!activityClient?.getRecent)
        throw new Error('Activity client unavailable')

      const rows = await activityClient.getRecent({
        schoolId,
        limit: take,
        signal: ctrl.signal,
      })

      if (id !== reqIdRef.current) return // ignore stale

      const arr = Array.isArray(rows) ? rows : []
      const items = arr.map(normalizeItem)

      // Sort newest first by date
      items.sort((a, b) => b.date.getTime() - a.date.getTime())

      setData(items)
    } catch (err) {
      if (/** @type {any} */ (err)?.name === 'AbortError') return
      setError(
        err instanceof Error ? err : new Error('Failed to load activity')
      )
      setData([])
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }

    return () => ctrl.abort()
  }, [schoolId, limit])

  const refresh = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  useEffect(() => {
    let cancelled = false
    const currentReqId = reqIdRef.current

    ;(async () => {
      await fetchOnce()
      if (cancelled) return
    })()

    return () => {
      cancelled = true
      // invalidate in-flight responses
      reqIdRef.current = currentReqId + 1
    }
  }, [fetchOnce])

  const memoData = useMemo(() => data, [data])

  return { loading, data: memoData, error, refresh }
}

export default useRecentActivity
