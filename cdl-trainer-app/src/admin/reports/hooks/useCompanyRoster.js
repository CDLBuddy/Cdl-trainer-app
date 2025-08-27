// src/admin/reports/hooks/useCompanyRoster.js
// ======================================================================
// useCompanyRoster
// - Loads a single company's roster for a given school
// - Abortable fetch with graceful fallbacks
// - Optional local fallback from `users` prop
// - Normalizes student shape for downstream tables
// - Query filter + manual refresh
// Returned shape:
//   { students, loading, error, query, setQuery, refresh, lastUpdated }
// ======================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** Safe string */
const S = (v) => (v == null ? '' : String(v))

/** Best-effort name */
function fullName(s = {}) {
  return (
    S(s.fullName || s.name) ||
    `${S(s.firstName || s.first_name)} ${S(s.lastName || s.last_name)}`.trim() ||
    S(s.email) ||
    'Student'
  )
}

/** Normalize a raw student record into a consistent shape used by roster table */
function normalizeStudent(raw = {}) {
  const training = raw.training || raw.course || {}
  const theory = training.theory || {}
  const btw = training.btw || {}

  return {
    id: raw.id || raw.uid || raw.email || `${fullName(raw)}-${S(raw.licenseNumber || raw.clpNumber)}`,
    email: S(raw.email),
    fullName: fullName(raw),
    dob: S(raw.dob || raw.dateOfBirth || raw.birthDate),
    clpNumber: S(raw.clpNumber || raw.clp),
    clpState: S(raw.clpState),
    licenseNumber: S(raw.licenseNumber || raw.license),
    licenseState: S(raw.licenseState || raw.state),
    companyId: S(raw.assignedCompanyId || raw.companyId || raw.assignedCompany || raw.company),
    training: {
      classType: S(training.classType || training.class || training.program || '').replace(/^class\s*/i, '') || 'A',
      endorsement: S(training.endorsement || training.endorse || ''),
      completionDate: S(training.completionDate || training.completedAt),
      theory: {
        completed: !!(theory.completed ?? raw.theoryCompleted),
        completedAt: S(theory.completedAt || raw.theoryCompletedAt),
      },
      btw: {
        completed: !!(btw.completed ?? raw.behindTheWheelCompleted ?? raw.rangeCompleted),
        completedAt: S(btw.completedAt || raw.btwCompletedAt),
        rangeHours: Number(btw.rangeHours ?? raw.rangeHours ?? 0) || 0,
        publicRoadHours: Number(btw.publicRoadHours ?? raw.roadHours ?? 0) || 0,
      },
    },
    _raw: raw,
  }
}

/** Default fetcher (override via opts.fetcher if you have a client) */
async function defaultFetchRoster({ schoolId, companyId, signal }) {
  if (!schoolId || !companyId) return []
  const qs = new URLSearchParams({ s: schoolId, c: companyId })
  const url = `/api/reports/roster?${qs}`

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal,
  })
  // Accept 204/empty as "no students" without throwing
  if (res.status === 204) return []
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const ct = res.headers.get('content-type') || ''
  if (!/\bjson\b/i.test(ct)) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

/**
 * useCompanyRoster
 * @param {{
 *   schoolId?: string,
 *   companyId?: string,
 *   users?: Array<object>,                // optional local fallback source
 *   fetcher?: (args:{schoolId:string,companyId:string,signal?:AbortSignal})=>Promise<Array<object>>,
 * }} params
 */
export default function useCompanyRoster({ schoolId = '', companyId = '', users = [], fetcher = defaultFetchRoster } = {}) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [lastUpdated, setLastUpdated] = useState(0)

  const abortRef = useRef(null)
  const cacheRef = useRef(new Map()) // key => normalized array

  const cacheKey = `${S(schoolId)}::${S(companyId)}`

  const load = useCallback(async () => {
    setError('')
    if (!schoolId || !companyId) {
      setStudents([])
      setLoading(false)
      setLastUpdated(Date.now())
      return
    }

    // Cached result
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      setStudents(cached)
      setLoading(false)
      setLastUpdated(Date.now())
      return
    }

    // Abort previous
    abortRef.current?.abort?.()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    try {
      const raw = await fetcher({ schoolId, companyId, signal: ac.signal })
      const normalized = (Array.isArray(raw) ? raw : []).map(normalizeStudent)
      // stable sort by name
      normalized.sort((a, b) => a.fullName.localeCompare(b.fullName))
      cacheRef.current.set(cacheKey, normalized)
      setStudents(normalized)
      setLastUpdated(Date.now())
    } catch (e) {
      if (ac.signal.aborted) return
      // Local fallback from supplied users list (if any)
      try {
        const local = (Array.isArray(users) ? users : [])
          .filter(u => S(u.assignedCompany || u.companyId || u.company) === S(companyId))
          .map(normalizeStudent)
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
        setStudents(local)
        setError(`Roster service unavailable; showing local data (${e?.message || e})`)
      } catch {
        setStudents([])
        setError(`Failed to load roster (${e?.message || e})`)
      }
    } finally {
      setLoading(false)
    }
  }, [schoolId, companyId, users, fetcher, cacheKey])

  // Initial + dependency loads
  useEffect(() => {
    // clear when switching companies/schools
    setStudents([])
    setError('')
    setQuery('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, companyId])

  // Manual refresh (busts cache)
  const refresh = useCallback(() => {
    cacheRef.current.delete(cacheKey)
    return load()
  }, [cacheKey, load])

  // Query filtering
  const filtered = useMemo(() => {
    const list = Array.isArray(students) ? students : []
    const q = S(query).toLowerCase().trim()
    if (!q) return list
    return list.filter((s) => {
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        S(s.licenseNumber).toLowerCase().includes(q) ||
        S(s.clpNumber).toLowerCase().includes(q)
      )
    })
  }, [students, query])

  return {
    students: filtered,
    loading,
    error,
    query,
    setQuery,
    refresh,
    lastUpdated,
  }
}