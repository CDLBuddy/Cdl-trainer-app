// Path: src/admin/dashboard/hooks/useDashboardAlerts.js
// ============================================================================
// useDashboardAlerts
// - Fetches dashboard alerts (expiring docs, deadlines, warnings)
// - Dashboard-scoped (schoolId), abort-safe, and refreshable
// - Uses DYNAMIC import for dashboardApi to avoid mixed static/dynamic chunks
// - Returns a stable shape for AlertsCard and similar widgets
// ============================================================================

// @ts-check

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * @typedef {'info'|'warning'|'error'|'success'} Severity
 *
 * @typedef {Object} AlertItem
 * @property {string}   id
 * @property {Severity} severity
 * @property {string}   title
 * @property {string=}  description
 * @property {number=}  count
 * @property {string=}  href
 * @property {string=}  ctaLabel
 * @property {string=}  icon
 * @property {string=}  dueAtISO
 */

/**
 * @typedef {Object} AlertsResult
 * @property {boolean} loading
 * @property {AlertItem[]} items
 * @property {null|Error} error
 * @property {{ total:number, bySeverity: Record<Severity, number> }} stats
 * @property {() => Promise<void>} refresh
 */

/* -------------------------------------------------------------------------- */
/* Dynamic loader (cached)                                                    */
/* -------------------------------------------------------------------------- */

let _alertsClientPromise = null
const loadAlertsClient = async () => {
  if (_alertsClientPromise) return _alertsClientPromise
  _alertsClientPromise = import('../services/dashboardApi.js').then((m) => {
    // dashboardApi exports both named `alerts` and default { alerts }
    return m.alerts ?? m.default?.alerts
  })
  return _alertsClientPromise
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

const asSeverity = (t) => (t === 'warning' || t === 'error' || t === 'info' || t === 'success' ? t : 'info')

/** Map service row → AlertItem (stable keys) */
function mapServiceAlertRow(row) {
  // Service rows look like: { id, type:'warning'|'error'|'info', title, detail?, href?, due? }
  /** @type {AlertItem} */
  return {
    id: String(row?.id ?? cryptoRandomId()),
    severity: asSeverity(row?.type || 'info'),
    title: String(row?.title || 'Alert'),
    description: row?.detail || '',
    href: row?.href || '',
    ctaLabel: row?.cta || undefined,
    dueAtISO: row?.due || undefined,
  }
}

function cryptoRandomId() {
  try {
    return (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

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
    const limit = Number.isFinite(+take) && +take > 0 ? +take : 8

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
      const alertsClient = await loadAlertsClient()
      if (!alertsClient?.get) throw new Error('Alerts client unavailable')

      const rows = await alertsClient.get({ schoolId, signal: ctrl.signal })
      if (id !== reqIdRef.current) return // stale

      const list = Array.isArray(rows) ? rows : []
      const normalized = list.map(mapServiceAlertRow).slice(0, limit)
      setItems(normalized)
    } catch (err) {
      // ignore aborts
      if (/** @type {any} */ (err)?.name === 'AbortError') return
      setError(err instanceof Error ? err : new Error('Failed to load alerts'))
      setItems([])
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }

    // Return a canceller (not used externally here)
    return () => ctrl.abort()
  }, [schoolId, take])

  // Stable alias for UI
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
      // bump reqId to invalidate any in-flight response
      reqIdRef.current = currentReqId + 1
    }
  }, [fetchOnce])

  // Derived stats for quick badges / headers
  const stats = useMemo(() => {
    /** @type {Record<Severity, number>} */
    const bySeverity = { info: 0, warning: 0, error: 0, success: 0 }
    for (const a of items) {
      const sev = asSeverity(a.severity || 'info')
      bySeverity[sev] = (bySeverity[sev] ?? 0) + 1
    }
    return { total: items.length, bySeverity }
  }, [items])

  return { loading, items, error, stats, refresh }
}

export default useDashboardAlerts
