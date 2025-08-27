// Path: src/admin/communications/hooks/useTemplates.js
// Template list + save helper. Keeps UI logic simple & testable.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listTemplates, upsertTemplate } from '../services'

export function useTemplates() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTemplates()
      if (!alive.current) return
      setItems(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      if (!alive.current) return
      setError(err || new Error('Failed to load templates'))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    refresh()
    return () => { alive.current = false }
  }, [refresh])

  const save = useCallback(async (tpl) => {
    const res = await upsertTemplate(tpl)
    await refresh()
    return res
  }, [refresh])

  const empty = useMemo(() => !loading && !error && items.length === 0, [loading, error, items])

  return { items, loading, error, empty, refresh, save }
}