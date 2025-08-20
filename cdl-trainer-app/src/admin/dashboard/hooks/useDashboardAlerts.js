// Path: src/admin/dashboard/hooks/useDashboardAlerts.js
// ============================================================================
// useDashboardAlerts
// - Fetches dashboard alerts (expiring docs, deadlines, warnings)
// - Dashboard-scoped (schoolId), abort-safe, and refreshable
// - Returns a stable shape for AlertsCard and similar widgets
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as dashboardApi from '../services/dashboardApi.js'

/**
 * @typedef {'info'|'warning'|'error'|'success'} Severity
 *
 * @typedef {Object} AlertItem
 * @property {string} id
 * @property {Severity} severity
 * @property {string} title
 * @property {string=} description
 * @property {number=} count
 * @property {string=} href
 * @property {string=} ctaLabel
 * @property {string=} icon
 * @property {string=} dueAtISO
 */

/**
 * @typedef {Object} AlertsResult
 * @property {boolean} loading
 * @property {AlertItem[]} items
 * @property {null|Error} error
 * @property {{ total:number, bySeverity: Record<Severity, number> }} stats
 * @property {() => Promise<void>} refresh
 */

/**
 * Fetch alerts for the Admin Dashboard.
 * @param {{ schoolId?: string, take?: number }} params
 * @returns {AlertsResult}
 */
export function useDashboardAlerts({ schoolId, take = 8 } = {}) {
  const [items, setItems] = useState(/** @type {AlertItem[]} */([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {Error|null} */(null))

  // Track latest request to drop stale responses (e.g., fast re-mounts)
  const reqIdRef = useRef(0)

  const fetchOnce = useCallback(async () => {
    if (!schoolId) {
      setItems([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const id = ++reqIdRef.current
    const ctrl = new AbortController()

    try {
      const res = await dashboardApi.getAlerts({ schoolId, signal: ctrl.signal })
      // ignore stale results
      if (id !== reqIdRef.current) return

      // Defensive normalize: slice to requested take
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
      setItems(list.slice(0, Math.max(1, take)))
    } catch (err) {
      // ignore aborts
      if (/** @type any */(err)?.name === 'AbortError') return
      setError(err instanceof Error ? err : new Error('Failed to load alerts'))
      setItems([])
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }

    // Return a canceller for callers if they want it (we don't use it here)
    return () => ctrl.abort()
  }, [schoolId, take])

  // Stable alias for UI
  const refresh = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await fetchOnce()
      if (cancelled) return
    }
    run()
    return () => {
      cancelled = true
      // bump reqId to invalidate any in-flight response
      reqIdRef.current++
    }
  }, [fetchOnce])

  // Derived stats for quick badges / headers
  const stats = useMemo(() => {
    /** @type {Record<Severity, number>} */
    const bySeverity = { info: 0, warning: 0, error: 0, success: 0 }
    for (const a of items) {
      const sev = /** @type {Severity} */(a.severity || 'info')
      bySeverity[sev] = (bySeverity[sev] ?? 0) + (a.count ? 1 : 1)
    }
    return { total: items.length, bySeverity }
  }, [items])

  return { loading, items, error, stats, refresh }
}

export default useDashboardAlerts