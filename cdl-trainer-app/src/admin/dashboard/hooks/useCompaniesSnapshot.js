// Path: src/admin/dashboard/hooks/useCompaniesSnapshot.js
// ============================================================================
// useCompaniesSnapshot
// - School-scoped, lightweight companies overview for the Admin Dashboard
// - Assumes a dashboardApi.companies.getSnapshot({ schoolId, limit }) exists
// - Graceful fallback to a mock provider if the API is missing
// - Returns: { rows, loading, error, refresh, lastUpdated }
// - Each row: { id, name, studentCount, active, trend, updatedAt }
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ---- Optional API (soft import) -------------------------------------------
// Your real implementation will live in src/admin/dashboard/services/dashboardApi.js
// with a shape like: dashboardApi.companies.getSnapshot({ schoolId, limit })
let dashboardApi = null
try {
   
  dashboardApi = await import('../services/dashboardApi.js')
} catch {
  // no-op: fallback mocks used below
}

/** Tiny, deterministic mock for local dev / fallback */
function mockCompaniesSnapshot({ limit = 5 }) {
  const now = Date.now()
  const sample = [
    { id: 'acme',     name: 'ACME Logistics',     studentCount: 42, active: true,  trend: 'up'   },
    { id: 'roadstar', name: 'RoadStar Freight',   studentCount: 31, active: true,  trend: 'flat' },
    { id: 'midwest',  name: 'Midwest Carriers',   studentCount: 18, active: false, trend: 'down' },
    { id: 'north',    name: 'North Haul LLC',     studentCount: 11, active: true,  trend: 'up'   },
    { id: 'swift',    name: 'Swift & Sons',       studentCount: 8,  active: true,  trend: 'flat' },
  ]
  return Promise.resolve(
    sample.slice(0, Math.max(1, limit)).map((r, i) => ({
      ...r,
      updatedAt: new Date(now - i * 60 * 60 * 1000).toISOString(),
    }))
  )
}

/**
 * @param {{ schoolId: string, limit?: number, sortBy?: 'name'|'students' }} params
 */
export function useCompaniesSnapshot({ schoolId, limit = 5, sortBy = 'name' } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const abortRef = useRef(/** @type AbortController|null */(null))

  const fetchOnce = useCallback(async () => {
    if (!schoolId) {
      setRows([])
      setError('')
      setLastUpdated(null)
      return
    }

    // cancel any in-flight request
    try { abortRef.current?.abort() } catch { /* noop */ }
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setError('')

    try {
      let list = []
      if (dashboardApi?.companies?.getSnapshot) {
        // Expected API (you’ll implement this next)
        list = await dashboardApi.companies.getSnapshot({ schoolId, limit, signal: ac.signal })
      } else {
        // Fallback mock
        list = await mockCompaniesSnapshot({ limit })
      }

      if (ac.signal.aborted) return

      // Defensive mapping (shape normalization)
      const mapped = (Array.isArray(list) ? list : []).map((c) => ({
        id: c.id ?? c.companyId ?? String(c.name || 'company').toLowerCase().replace(/\s+/g, '-'),
        name: String(c.name || 'Company'),
        studentCount: Number.isFinite(c.studentCount) ? c.studentCount : Number(c.students ?? 0) || 0,
        active: Boolean(
          'active' in (c || {}) ? c.active : (String(c.status || '').toLowerCase() !== 'inactive')
        ),
        trend: /** @type {'up'|'flat'|'down'} */ (
          ['up', 'flat', 'down'].includes(String(c.trend)) ? c.trend : 'flat'
        ),
        updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
      }))

      // Sorting (client-side, tiny list)
      mapped.sort((a, b) => {
        if (sortBy === 'students') return b.studentCount - a.studentCount || a.name.localeCompare(b.name)
        // default: name
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })

      setRows(mapped)
      setLastUpdated(new Date().toISOString())
    } catch (err) {
      if (!ac.signal.aborted) {
         
        console.error('[useCompaniesSnapshot] fetch error:', err)
        setRows([])
        setError('Failed to load companies.')
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [schoolId, limit, sortBy])

  // initial + school/limit/sort changes
  useEffect(() => {
    fetchOnce()
    return () => {
      try { abortRef.current?.abort() } catch { /* noop */ }
    }
  }, [fetchOnce])

  // Handy derived values (memoized)
  const totalStudents = useMemo(
    () => rows.reduce((acc, r) => acc + (Number.isFinite(r.studentCount) ? r.studentCount : 0), 0),
    [rows]
  )

  return {
    rows,
    loading,
    error,
    refresh: fetchOnce,
    lastUpdated,
    totalStudents,
  }
}

export default useCompaniesSnapshot