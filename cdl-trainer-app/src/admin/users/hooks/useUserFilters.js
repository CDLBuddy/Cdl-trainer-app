// Path: src/admin/dashboard/hooks/subhooks/useUserFilters.js
// ============================================================================
// useUserFilters
// - Local role/company/search filters with debounced search
// - Backward compatible return shape (roleFilter, setRoleFilter, ...)
// - Extras: configurable debounce, case-insensitive filtering, bulk setters,
//           hasActiveFilters, clearFilters
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * @typedef {Object} UseUserFiltersOptions
 * @property {number} [debounceMs=180]        Debounce for search input
 * @property {Array<string>} [searchKeys]     Keys to include in text search
 */

/**
 * @param {{ users: Array<Record<string, any>>, options?: UseUserFiltersOptions }} params
 */
export function useUserFilters({ users, options = {} }) {
  const {
    debounceMs = 180,
    // sensible defaults — can be expanded without breaking callers
    searchKeys = ['name', 'email', 'assignedCompany'],
  } = options

  const [roleFilter, setRoleFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [search, setSearch] = useState('')

  // Debounced search value
  const searchRef = useRef(search)
  useEffect(() => {
    const id = setTimeout(() => {
      searchRef.current = search
    }, Math.max(0, debounceMs | 0))
    return () => clearTimeout(id)
  }, [search, debounceMs])

  // Build a normalized text blob for each user for fast includes()
  const filteredUsers = useMemo(() => {
    const q = (searchRef.current || '').trim().toLowerCase()
    const wantRole = (roleFilter || '').trim()
    const wantCompany = (companyFilter || '').trim().toLowerCase()

    // Precompute search accessors once
    const pick = (obj, key) => {
      const v = obj?.[key]
      return typeof v === 'string' ? v : v == null ? '' : String(v)
    }

    /** Case-insensitive equality for company filtering */
    const eqCi = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase()

    return (Array.isArray(users) ? users : []).filter((u) => {
      // Role filter (exact)
      if (wantRole && String(u?.role || '') !== wantRole) return false

      // Company filter (case-insensitive)
      if (wantCompany && !eqCi(u?.assignedCompany || '', wantCompany)) return false

      // Text search across selected keys
      if (q) {
        const haystack = searchKeys
          .map((k) => pick(u, k))
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [users, roleFilter, companyFilter, searchKeys])

  // Unique, sorted company list (case-insensitive uniqueness, stable label)
  const companyList = useMemo(() => {
    const set = new Map()
    for (const u of Array.isArray(users) ? users : []) {
      const raw = (u?.assignedCompany || '').trim()
      if (!raw) continue
      const key = raw.toLowerCase()
      // prefer the first-seen capitalization
      if (!set.has(key)) set.set(key, raw)
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b))
  }, [users])

  // Quality-of-life extras (non-breaking)
  const hasActiveFilters = Boolean(
    (roleFilter || '').trim() ||
      (companyFilter || '').trim() ||
      (search || '').trim()
  )

  const clearFilters = () => {
    setRoleFilter('')
    setCompanyFilter('')
    setSearch('')
  }

  const setFilters = (next = {}) => {
    if ('role' in next || 'roleFilter' in next)
      setRoleFilter((next.role ?? next.roleFilter) || '')
    if ('company' in next || 'companyFilter' in next)
      setCompanyFilter((next.company ?? next.companyFilter) || '')
    if ('search' in next) setSearch(next.search || '')
  }

  return {
    // original, expected API (backward compatible)
    roleFilter,
    setRoleFilter,
    companyFilter,
    setCompanyFilter,
    search,
    setSearch,
    filteredUsers,
    companyList,

    // extras (optional to use)
    hasActiveFilters,
    clearFilters,
    setFilters,
  }
}