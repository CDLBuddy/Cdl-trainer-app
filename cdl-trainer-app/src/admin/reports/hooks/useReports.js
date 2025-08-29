// src/admin/reports/hooks/useReports.js
// ======================================================================
// useReports
// - Loads brand, users, companies for the current school
// - Abortable fetch with graceful fallbacks & light normalization
// - Debounced + deferred text filter + role filter (snappier on big lists)
// - Stable memoized outputs and a refresh() action
// Returned:
//   { brand, users, companies, loading, error,
//     roleFilter, setRoleFilter, search, setSearch,
//     filteredUsers, refresh,
//     // extras (non-breaking):
//     roleOptions, counts, lastLoadedAt, resetFilters }
// ======================================================================

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { loadReportsBundle } from '../services'

// --- helpers --------------------------------------------------------------

const S = v => (v == null ? '' : String(v))

function normalizeBrand(raw = {}) {
  const schoolName = S(
    raw.schoolName || raw.name || raw.displayName || 'Current School'
  )
  return { ...raw, schoolName }
}

function normalizeUser(u = {}) {
  const id =
    u.id ||
    u.uid ||
    u.email ||
    `${S(u.name || u.fullName || u.displayName)}::${S(u.role)}`
  const role = S((u.role || '').toLowerCase())
  const assignedCompany = S(u.assignedCompany || u.company || u.companyName)
  const assignedInstructor = S(u.assignedInstructor || u.instructor || '')

  return {
    id,
    name: S(u.name || u.fullName || u.displayName),
    email: S(u.email),
    role,
    assignedCompany,
    assignedInstructor,
    profileProgress: Number.isFinite(+u.profileProgress)
      ? Math.max(0, Math.min(100, +u.profileProgress))
      : undefined,
    permitExpiry: u.permitExpiry || u.permit_expires || u.clpExpiry || '',
    licenseNumber: S(u.licenseNumber || u.clpNumber || ''),
    _raw: u,
  }
}

function normalizeCompany(c = {}) {
  const id = c.id || c.companyId || S(c.name)
  const name = S(c.name || c.title)
  const studentCount = Number.isFinite(+c.studentCount)
    ? +c.studentCount
    : Array.isArray(c.students)
      ? c.students.length
      : 0
  const expiringSoon = Number.isFinite(+c.expiringSoon) ? +c.expiringSoon : 0
  return { id, name, studentCount, expiringSoon, _raw: c }
}

// --- hook -----------------------------------------------------------------

/**
 * @param {string} schoolId
 * @param {{ debounceMs?: number }} opts
 */
export default function useReports(schoolId, opts = {}) {
  const debounceMs = Number.isFinite(+opts.debounceMs) ? +opts.debounceMs : 180

  // data
  const [brand, setBrand] = useState({ schoolName: '' })
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])

  // status
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastLoadedAt, setLastLoadedAt] = useState(0)

  // filters
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')

  // debounce + defer search for smoother typing on large lists
  const [q, setQ] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQ(S(search).trim().toLowerCase()), debounceMs)
    return () => clearTimeout(t)
  }, [search, debounceMs])
  const dq = useDeferredValue(q)

  // abortable loader
  const abortRef = useRef(null)

  const refresh = useCallback(async () => {
    // cancel previous run
    abortRef.current?.abort?.()
    const ac = new AbortController()
    abortRef.current = ac

    if (!schoolId) {
      setBrand({ schoolName: '' })
      setUsers([])
      setCompanies([])
      setLoading(false)
      setError('')
      setLastLoadedAt(Date.now())
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await loadReportsBundle(schoolId, { signal: ac.signal })
      if (ac.signal.aborted) return

      const nb = normalizeBrand(result?.brand || {})
      const nu = (Array.isArray(result?.users) ? result.users : []).map(
        normalizeUser
      )
      const nc = (Array.isArray(result?.companies) ? result.companies : []).map(
        normalizeCompany
      )

      // stable sort for UX
      nu.sort((a, b) => a.name.localeCompare(b.name))
      nc.sort((a, b) => a.name.localeCompare(b.name))

      setBrand(nb)
      setUsers(nu)
      setCompanies(nc)
      setLastLoadedAt(Date.now())
    } catch (_) {
      if (ac.signal.aborted) return
      setError('Failed to load reports data. Please try again.')
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [schoolId])

  // initial + on school change
  useEffect(() => {
    setUsers([])
    setCompanies([])
    setError('')
    setLoading(true)
    refresh()
  }, [refresh])

  // cleanup abort on unmount
  useEffect(() => () => abortRef.current?.abort?.(), [])

  // derived: filtered users
  const filteredUsers = useMemo(() => {
    let list = users
    if (roleFilter) {
      const rf = S(roleFilter).toLowerCase()
      list = list.filter(u => S(u.role).toLowerCase() === rf)
    }
    if (dq) {
      list = list.filter(u => {
        const contains = v => S(v).toLowerCase().includes(dq)
        const alnum = v =>
          S(v)
            .replace(/[^a-z0-9]/gi, '')
            .toLowerCase()
        return (
          contains(u.name) ||
          contains(u.email) ||
          contains(u.assignedCompany) ||
          contains(u.assignedInstructor) ||
          contains(u.licenseNumber) ||
          // bonus: loose match on license digits without dashes/spaces
          (dq.length >= 3 && alnum(u.licenseNumber).includes(alnum(dq)))
        )
      })
    }
    return list
  }, [users, roleFilter, dq])

  // small, handy extras (non-breaking)
  const roleOptions = useMemo(() => {
    const set = new Set(users.map(u => u.role).filter(Boolean))
    // keep predictable order if present
    const order = ['student', 'instructor', 'admin', 'superadmin']
    return order
      .filter(r => set.has(r))
      .concat([...set].filter(r => !order.includes(r)))
  }, [users])

  const counts = useMemo(() => {
    const total = users.length
    let students = 0,
      instructors = 0,
      admins = 0,
      superadmins = 0
    for (const u of users) {
      if (u.role === 'student') students++
      else if (u.role === 'instructor') instructors++
      else if (u.role === 'admin') admins++
      else if (u.role === 'superadmin') superadmins++
    }
    return { total, students, instructors, admins, superadmins }
  }, [users])

  const resetFilters = useCallback(() => {
    setRoleFilter('')
    setSearch('')
  }, [])

  return {
    // data
    brand,
    users,
    companies,
    // status
    loading,
    error,
    lastLoadedAt,
    // filters
    roleFilter,
    setRoleFilter,
    search,
    setSearch,
    resetFilters,
    // derived
    filteredUsers,
    roleOptions,
    counts,
    // actions
    refresh,
  }
}
