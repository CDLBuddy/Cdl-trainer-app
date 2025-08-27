// Path: src/admin/communications/hooks/useMessageHistory.js
// Lightweight history loader with optional polling and a manual refresh.
// Pure React; no Firestore listeners (so it stays cheap).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listMessages } from '../services'

/**
 * @param {{
 *   take?: number,
 *   pollMs?: number|null,     // e.g. 15000 to refresh every 15s (pauses when tab hidden)
 * }} [opts]
 */
export function useMessageHistory(opts = {}) {
  const { take = 25, pollMs = null } = opts
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listMessages({ take })
      if (!alive.current) return
      setRows(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      if (!alive.current) return
      setError(err || new Error('Failed to load messages'))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [take])

  // initial load
  useEffect(() => {
    alive.current = true
    refresh()
    return () => { alive.current = false }
  }, [refresh])

  // optional polling (polite: skip when tab hidden)
  useEffect(() => {
    if (!pollMs || pollMs <= 0) return
    let t = null
    const tick = () => {
      if (document?.hidden) return // don’t spam while backgrounded
      refresh().catch(() => {})
    }
    t = setInterval(tick, pollMs)
    return () => { if (t) clearInterval(t) }
  }, [pollMs, refresh])

  const empty = useMemo(() => !loading && !error && rows.length === 0, [loading, error, rows])

  return { rows, loading, error, empty, refresh }
}