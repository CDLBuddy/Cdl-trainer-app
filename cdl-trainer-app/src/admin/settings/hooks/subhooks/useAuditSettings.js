// src/admin/settings/hooks/subhooks/useAuditSettings.js
// ---------------------------------------------------------------------------
// Admin Settings • Audit
// - Controls which activities are recorded with higher fidelity.
// - Your logging layer should check these flags when writing entries.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState, useCallback } from 'react'

const KEY = 'audit'

export function useAuditSettings({ vm }) {
  const initial = useMemo(
    () =>
      vm?.prefs?.[KEY] || {
        trackExports: true, // CSV/PDF data exports
        trackUserDeletions: true,
        trackBillingChanges: true,
        redactSensitiveFields: true, // when true, masks tokens/PII in logs
      },
    [vm?.prefs]
  )

  const [draft, setDraft] = useState(initial)
  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const update = useCallback(patch => setDraft(d => ({ ...d, ...patch })), [])

  async function save(partial = draft) {
    const next = {
      trackExports: !!partial.trackExports,
      trackUserDeletions: !!partial.trackUserDeletions,
      trackBillingChanges: !!partial.trackBillingChanges,
      redactSensitiveFields: partial.redactSensitiveFields !== false, // default true
    }
    await vm.actions.save({ [KEY]: next })
  }

  return { draft, setDraft, update, save }
}
