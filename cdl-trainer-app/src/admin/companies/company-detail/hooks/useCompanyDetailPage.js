//src/admin/companies/company-detail/hooks/useCompanyDetailPage.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { db } from '@utils/firebase.js'

import {
  getBTWReadiness,
  getEnrollmentReadiness,
} from '@student/profile/schema/calculators.js'

import { pct } from '../utils/format.js'

function mapUserDoc(ds) {
  const u = ds.data() || {}
  return {
    email: u.email || ds.id,
    name: u.name || '(no name)',
    course: u.course || '—',
    cdlClass: u.cdlClass || '—',
    billing: u.billing || { mode: '—' },
    assignedInstructor: u.assignedInstructor || '—',
    profile: u,
  }
}

export default function useCompanyDetailPage(companyId, showToast) {
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [roster, setRoster] = useState([])

  // search/filters/sort
  const [search, setSearch] = useState('')
  const [billingFilter, setBillingFilter] = useState('all')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const loadCompany = useCallback(async () => {
    if (!companyId) return null
    const snap = await getDoc(doc(db, 'companies', companyId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }, [companyId])

  const loadRoster = useCallback(async () => {
    if (!companyId) return []
    const qy = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('companyId', '==', companyId)
    )
    const uSnap = await getDocs(qy)
    const rows = []
    uSnap.forEach(ds => rows.push(mapUserDoc(ds)))
    rows.sort((a, b) => a.name.localeCompare(b.name))
    return rows
  }, [companyId])

  // initial load
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const [c, r] = await Promise.all([loadCompany(), loadRoster()])
        if (!alive) return
        setCompany(c)
        setRoster(r)
      } catch (e) {
        console.error('[useCompanyDetailPage] load failed', e)
        showToast?.('Failed to load company roster.', 3000, 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [loadCompany, loadRoster, showToast])

  // enrich → filter → sort
  const enriched = useMemo(
    () =>
      roster.map(r => ({
        ...r,
        _enroll: pct(getEnrollmentReadiness(r.profile)),
        _btw: pct(getBTWReadiness(r.profile)),
        _billingMode: String(r.billing?.mode || '—').toLowerCase(),
        _instructor: String(r.assignedInstructor || '—'),
      })),
    [roster]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let rows = enriched
    if (term) {
      rows = rows.filter(
        r =>
          (r.name || '').toLowerCase().includes(term) ||
          (r.email || '').toLowerCase().includes(term) ||
          (r.course || '').toLowerCase().includes(term) ||
          (r.cdlClass || '').toLowerCase().includes(term) ||
          (r._instructor || '').toLowerCase().includes(term)
      )
    }
    if (billingFilter !== 'all')
      rows = rows.filter(r => r._billingMode === billingFilter)
    if (onlyUnassigned)
      rows = rows.filter(r => !r._instructor || r._instructor === '—')
    return rows
  }, [enriched, search, billingFilter, onlyUnassigned])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const collator = new Intl.Collator(undefined, {
      sensitivity: 'base',
      numeric: true,
    })
    const byText = (a, b) => collator.compare(a ?? '', b ?? '') * dir
    const byNum = (a, b) => ((a ?? 0) - (b ?? 0)) * dir
    const sorter =
      {
        name: (a, b) => byText(a.name, b.name),
        course: (a, b) => byText(a.course, b.course),
        cdlClass: (a, b) => byText(a.cdlClass, b.cdlClass),
        billing: (a, b) => byText(a._billingMode, b._billingMode),
        instructor: (a, b) => byText(a._instructor, b._instructor),
        enroll: (a, b) => byNum(a._enroll, b._enroll),
        btw: (a, b) => byNum(a._btw, b._btw),
      }[sortKey] || ((a, b) => byText(a.name, b.name))
    return filtered.slice().sort(sorter)
  }, [filtered, sortKey, sortDir])

  const toggleSort = useCallback(key => {
    setSortKey(prevKey => {
      if (prevKey === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        return prevKey
      }
      setSortDir('asc')
      return key
    })
  }, [])

  return {
    loading,
    company,
    sorted,
    search,
    setSearch,
    billingFilter,
    setBillingFilter,
    onlyUnassigned,
    setOnlyUnassigned,
    sortKey,
    sortDir,
    toggleSort,
    reloadRoster: async () => setRoster(await loadRoster()),
  }
}
