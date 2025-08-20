//src/admin/reports/hooks/useReports.js
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadReportsBundle } from '../services'

export default function useReports(schoolId) {
  const [brand, setBrand] = useState({})
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim().toLowerCase()), 180)
    return () => clearTimeout(t)
  }, [search])

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { brand, users, companies } = await loadReportsBundle(schoolId)
      setBrand(brand); setUsers(users); setCompanies(companies)
    } catch (e) {
      setError('Failed to load reports data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { refresh() }, [refresh])

  const filteredUsers = useMemo(() => {
    let list = users
    if (roleFilter) list = list.filter(u => u.role === roleFilter)
    if (q) {
      list = list.filter(u => {
        const inStr = (s) => (s || '').toLowerCase().includes(q)
        return inStr(u.name) || inStr(u.email) || inStr(u.assignedCompany) || inStr(u.assignedInstructor)
      })
    }
    return list
  }, [users, roleFilter, q])

  return {
    // data
    brand, users, companies,
    // status
    loading, error,
    // filters
    roleFilter, setRoleFilter, search, setSearch,
    // derived
    filteredUsers,
    // actions
    refresh,
  }
}