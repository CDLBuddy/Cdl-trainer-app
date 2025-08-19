// src/admin/settings/hooks/subhooks/useDataRetentionSettings.js
// ---------------------------------------------------------------------------
// Admin Settings • Data Retention
// - Configures cleanup windows for logs/PII (your backend cron enforces them).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState, useCallback } from 'react'

const KEY = 'dataRetention'

export function useDataRetentionSettings({ vm }) {
  const initial = useMemo(
    () =>
      vm?.prefs?.[KEY] || {
        logsDays: 365,          // audit logs retained for N days
        piiRetentionDays: 730,  // PII retained for N days
        purgeEnabled: false,    // safety toggle
      },
    [vm?.prefs]
  )

  const [draft, setDraft] = useState(initial)
  useEffect(() => { setDraft(initial) }, [initial])

  const update = useCallback(patch => setDraft(d => ({ ...d, ...patch })), [])

  async function save(partial = draft) {
    const next = { ...partial }
    next.logsDays = Math.max(30, Number(next.logsDays || 365))
    next.piiRetentionDays = Math.max(90, Number(next.piiRetentionDays || 730))
    next.purgeEnabled = !!next.purgeEnabled
    await vm.actions.save({ [KEY]: next })
  }

  return { draft, setDraft, update, save }
}