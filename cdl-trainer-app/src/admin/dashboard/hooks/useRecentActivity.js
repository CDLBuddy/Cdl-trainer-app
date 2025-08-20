// Path: src/admin/dashboard/hooks/useRecentActivity.js
// ============================================================================
// useRecentActivity
// - Fetches recent activity feed for the Admin Dashboard
// - Dashboard-scoped (schoolId), abort-safe, and refreshable
// - Returns normalized activity items sorted by newest first
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as dashboardApi from '../services/dashboardApi.js'

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

/**
 * Normalize raw API result → ActivityItem
 */
function normalizeItem(raw, idx = 0) {
  try {
    return {
      id: String(raw?.id ?? `tmp-${idx}-${Date.now()}`),
      type: String(raw?.type ?? 'UNKNOWN'),
      message: String(raw?.message ?? 'No details'),
      actor: raw?.actor ? String(raw.actor) : undefined,
      date: raw?.date ? new Date(raw.date) : new Date(),
      meta: raw?.meta ?? null,
    }
  } catch {
    return {
      id: `bad-${idx}-${Date.now()}`,
      type: 'ERROR',
      message: 'Malformed activity item',
      date: new Date(),
    }
  }
}

/**
 * Fetch recent activity for the Admin Dashboard.
 * @param {{ schoolId?: string, limit?: number }} params
 * @returns {UseRecentActivityResult}
 */
export function useRecentActivity({ schoolId, limit = 20 } = {}) {
  const [data, setData] = useState(/** @type {ActivityItem[]} */([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {Error|null} */(null))

  const reqIdRef = useRef(0)

  const fetchOnce = useCallback(async () => {
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
      const res = await dashboardApi.getRecentActivity({
        schoolId,
        limit,
        signal: ctrl.signal,
      })

      if (id !== reqIdRef.current) return // ignore stale
      const arr = Array.isArray(res) ? res : []
      const items = arr.map(normalizeItem)

      // Sort newest first by date
      items.sort((a, b) => b.date.getTime() - a.date.getTime())

      setData(items)
    } catch (err) {
      if (/** @type any */(err)?.name === 'AbortError') return
      setError(err instanceof Error ? err : new Error('Failed to load activity'))
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
    ;(async () => {
      await fetchOnce()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
      reqIdRef.current++ // invalidate in-flight responses
    }
  }, [fetchOnce])

  const memoData = useMemo(() => data, [data])

  return { loading, data: memoData, error, refresh }
}

export default useRecentActivity