//src/admin/walkthroughs/List/hooks/useWalkthroughList.js
import { useCallback, useMemo, useState } from 'react'

import { sourceFrom } from '../services/listUtils.js'

export function useWalkthroughList(items) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [klass, setKlass] = useState('all')
  const [source, setSource] = useState('all')
  const [sortKey, setSortKey] = useState('updatedAt')
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'

  const classes = useMemo(() => {
    const s = new Set(
      (items || []).map(i => (i.classCode || '').toUpperCase()).filter(Boolean)
    )
    return ['all', ...Array.from(s)]
  }, [items])

  const setSort = useCallback(
    key => {
      setSortDir(d =>
        key === sortKey ? (d === 'asc' ? 'desc' : 'asc') : 'asc'
      )
      setSortKey(key)
    },
    [sortKey]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = (items || []).filter(it => {
      const st = it.status || 'draft'
      if (status !== 'all' && st !== status) return false
      const cc = (it.classCode || '').toUpperCase()
      if (klass !== 'all' && cc !== klass) return false
      const src = sourceFrom(it)
      if (source !== 'all' && src !== source) return false
      if (!needle) return true
      const blob = [it.label, it.classCode, it.token, it.id, src]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(needle)
    })

    const dir = sortDir === 'asc' ? 1 : -1
    const getVal = row => {
      if (sortKey === 'updatedAt') return +new Date(row.updatedAt || 0)
      if (sortKey === 'label') return String(row.label || '').toLowerCase()
      if (sortKey === 'classCode')
        return String(row.classCode || '').toUpperCase()
      if (sortKey === 'version') return Number(row.version ?? -1)
      return 0
    }

    return base
      .map((v, i) => ({ v, i }))
      .sort((a, b) => {
        const av = getVal(a.v)
        const bv = getVal(b.v)
        if (av < bv) return -1 * dir
        if (av > bv) return 1 * dir
        return a.i - b.i // stabilize
      })
      .map(x => x.v)
  }, [items, q, status, klass, source, sortKey, sortDir])

  const onRowKey = useCallback((e, _id) => {
    // Consumers bind specific handlers on the row; this just normalizes keys
    // Enter → Preview, E → Edit
    if (e.key === 'Enter') {
      e.currentTarget?.querySelector('[data-action="preview"]')?.click()
    } else if (e.key?.toLowerCase() === 'e') {
      e.currentTarget?.querySelector('[data-action="edit"]')?.click()
    }
  }, [])

  return {
    q,
    setQ,
    status,
    setStatus,
    klass,
    setKlass,
    source,
    setSource,
    classes,
    sortKey,
    sortDir,
    setSort,
    filtered,
    onRowKey,
  }
}
