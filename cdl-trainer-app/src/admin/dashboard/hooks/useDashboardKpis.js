// Path: src/admin/dashboard/hooks/useDashboardKpis.js
// ============================================================================
// useDashboardKpis
// - Fetches KPI counters for the Admin Dashboard
// - Dashboard-scoped (schoolId), abort-safe, and refreshable
// - Returns a stable shape for KpiRow and other widgets
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as dashboardApi from '../services/dashboardApi.js'

/**
 * @typedef {Object} Kpis
 * @property {number} studentCount
 * @property {number} instructorCount
 * @property {number} adminCount
 * @property {number} permitSoon
 * @property {number} medSoon
 * @property {number} incomplete
 */

/**
 * @typedef {Object} UseDashboardKpisResult
 * @property {boolean} loading
 * @property {Kpis & {
 *   total?: number,
 *   percents?: {
 *     students:number, instructors:number, admins:number,
 *     permitSoon:number, medSoon:number, incomplete:number
 *   }
 * }} data
 * @property {Error|null} error
 * @property {() => Promise<void>} refresh
 */

/** Safe number -> int (>=0) */
function ni(x, d = 0) {
  const n = Number.isFinite(x) ? Number(x) : d
  return n < 0 ? 0 : Math.trunc(n)
}

/**
 * Fetch KPIs for the Admin Dashboard.
 * @param {{ schoolId?: string }} params
 * @returns {UseDashboardKpisResult}
 */
export function useDashboardKpis({ schoolId } = {}) {
  const [data, setData] = useState(/** @type {any} */({
    studentCount: 0,
    instructorCount: 0,
    adminCount: 0,
    permitSoon: 0,
    medSoon: 0,
    incomplete: 0,
    total: 0,
    percents: {
      students: 0, instructors: 0, admins: 0,
      permitSoon: 0, medSoon: 0, incomplete: 0,
    },
  }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {Error|null} */(null))

  const reqIdRef = useRef(0)

  const fetchOnce = useCallback(async () => {
    if (!schoolId) {
      setData((d) => ({ ...d,
        studentCount: 0, instructorCount: 0, adminCount: 0,
        permitSoon: 0, medSoon: 0, incomplete: 0, total: 0,
        percents: { students:0, instructors:0, admins:0, permitSoon:0, medSoon:0, incomplete:0 },
      }))
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const id = ++reqIdRef.current
    const ctrl = new AbortController()

    try {
      const res = await dashboardApi.getKpis({ schoolId, signal: ctrl.signal })

      // ignore stale responses
      if (id !== reqIdRef.current) return

      // Defensive normalization
      const k = /** @type {Kpis} */({
        studentCount:   ni(res?.studentCount),
        instructorCount:ni(res?.instructorCount),
        adminCount:     ni(res?.adminCount),
        permitSoon:     ni(res?.permitSoon),
        medSoon:        ni(res?.medSoon),
        incomplete:     ni(res?.incomplete),
      })

      const total = ni(res?.total ?? (k.studentCount + k.instructorCount + k.adminCount))
      const pct = (n) => (total ? Math.round((ni(n) / total) * 100) : 0)

      setData({
        ...k,
        total,
        percents: {
          students: pct(k.studentCount),
          instructors: pct(k.instructorCount),
          admins: pct(k.adminCount),
          permitSoon: pct(k.permitSoon),
          medSoon: pct(k.medSoon),
          incomplete: pct(k.incomplete),
        },
      })
    } catch (err) {
      if (/** @type any */(err)?.name === 'AbortError') return
      setError(err instanceof Error ? err : new Error('Failed to load KPIs'))
      setData((d) => ({ ...d,
        studentCount:0, instructorCount:0, adminCount:0,
        permitSoon:0, medSoon:0, incomplete:0, total:0,
        percents: { students:0, instructors:0, admins:0, permitSoon:0, medSoon:0, incomplete:0 },
      }))
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }

    return () => ctrl.abort()
  }, [schoolId])

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

  // Stable memo (so consumers don’t re-render on identity alone)
  const memoData = useMemo(() => data, [data])

  return { loading, data: memoData, error, refresh }
}

export default useDashboardKpis