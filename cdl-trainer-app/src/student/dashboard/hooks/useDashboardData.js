import { useEffect, useState } from 'react'

import { getLatestUpdate } from '../services/updatesApi.js'

export function useDashboardData() {
  const [latestUpdate, setLatestUpdate] = useState(null)
  const [updatesLoading, setUpdatesLoading] = useState(true)
  const [updatesError, setUpdatesError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await getLatestUpdate()
        if (!alive) return
        setLatestUpdate(data || null)
        setUpdatesError(null)
      } catch (err) {
        if (!alive) return
        setUpdatesError(err || new Error('Failed to load updates'))
      } finally {
        if (alive) setUpdatesLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return { latestUpdate, updatesLoading, updatesError }
}