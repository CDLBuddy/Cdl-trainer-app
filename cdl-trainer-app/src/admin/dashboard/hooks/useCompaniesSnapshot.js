// Path: src/admin/dashboard/hooks/useCompaniesSnapshot.js
// ============================================================================
// useCompaniesSnapshot (Admin Dashboard)
// - School‑scoped, lightweight companies overview hook
// - Tries real dashboard API; gracefully falls back to a deterministic mock
// - Returns: { rows, loading, error, refresh, lastUpdated, totalStudents }
// - Row shape: { id, name, studentCount, active, trend: 'up'|'flat'|'down', updatedAt }
// - No top‑level await; Fast Refresh friendly
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Lazy loader for the optional dashboard API module
// (avoids top-level await and keeps bundle split-friendly)
// ---------------------------------------------------------------------------
let _apiPromise = null
async function loadDashboardApi() {
  if (_apiPromise) return _apiPromise
  _apiPromise = import('../services/dashboardApi.js').catch(() => null)
  return _apiPromise
}

// ---------------------------------------------------------------------------
// Mock provider (stable, deterministic) used when real API is absent
// ---------------------------------------------------------------------------
function mockCompaniesSnapshot({ limit = 5 }) {
  const now = Date.now()
  const sample = [
    {
      id: 'acme',
      name: 'ACME Logistics',
      studentCount: 42,
      active: true,
      trend: 'up',
    },
    {
      id: 'roadstar',
      name: 'RoadStar Freight',
      studentCount: 31,
      active: true,
      trend: 'flat',
    },
    {
      id: 'midwest',
      name: 'Midwest Carriers',
      studentCount: 18,
      active: false,
      trend: 'down',
    },
    {
      id: 'north',
      name: 'North Haul LLC',
      studentCount: 11,
      active: true,
      trend: 'up',
    },
    {
      id: 'swift',
      name: 'Swift & Sons',
      studentCount: 8,
      active: true,
      trend: 'flat',
    },
  ]
  return Promise.resolve(
    sample.slice(0, Math.max(1, limit)).map((r, i) => ({
      ...r,
      updatedAt: new Date(now - i * 60 * 60 * 1000).toISOString(),
    }))
  )
}

/**
 * useCompaniesSnapshot
 * @param {{ schoolId?: string, limit?: number, sortBy?: 'name'|'students' }} params
 */
export function useCompaniesSnapshot({
  schoolId,
  limit = 5,
  sortBy = 'name',
} = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const abortRef = useRef(/** @type {AbortController|null} */ (null))

  const fetchOnce = useCallback(async () => {
    // reset when no school selected
    if (!schoolId) {
      try {
        abortRef.current?.abort()
      } catch {
        // intentionally ignored
      }
      setRows([])
      setError('')
      setLastUpdated(null)
      return
    }

    // cancel any in-flight request
    try {
      abortRef.current?.abort()
    } catch {
      // intentionally ignored
    }
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setError('')

    try {
      // Try to load the real dashboard API; fall back to mock if not available
      const mod = await loadDashboardApi()
      const api = mod?.default ?? mod // support either default or named export

      let list = []
      if (api?.companies?.getSnapshot) {
        list = await api.companies.getSnapshot({
          schoolId,
          limit,
          signal: ac.signal,
        })
      } else {
        list = await mockCompaniesSnapshot({ limit })
      }

      if (ac.signal.aborted) return

      // Defensive mapping (shape normalization)
      const mapped = (Array.isArray(list) ? list : []).map(c => ({
        id:
          c.id ??
          c.companyId ??
          String(c.name || 'company')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .slice(0, 64),
        name: String(c.name || 'Company'),
        studentCount: Number.isFinite(c.studentCount)
          ? c.studentCount
          : Number(c.students ?? 0) || 0,
        active:
          'active' in (c || {})
            ? Boolean(c.active)
            : String(c.status || '').toLowerCase() !== 'inactive',
        trend: /** @type {'up'|'flat'|'down'} */ (
          ['up', 'flat', 'down'].includes(String(c.trend)) ? c.trend : 'flat'
        ),
        updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
      }))

      // Client-side sort for tiny lists
      mapped.sort((a, b) => {
        if (sortBy === 'students')
          return b.studentCount - a.studentCount || a.name.localeCompare(b.name)
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

  // initial + deps changes
  useEffect(() => {
    fetchOnce()
    return () => {
      try {
        abortRef.current?.abort()
      } catch {
        // intentionally ignored
      }
    }
  }, [fetchOnce])

  // Derived value: total students in the snapshot
  const totalStudents = useMemo(
    () =>
      rows.reduce(
        (acc, r) =>
          acc + (Number.isFinite(r.studentCount) ? r.studentCount : 0),
        0
      ),
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
