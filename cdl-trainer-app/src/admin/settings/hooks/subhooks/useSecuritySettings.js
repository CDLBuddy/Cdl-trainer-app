// src/admin/settings/hooks/subhooks/useSecuritySettings.js
// ---------------------------------------------------------------------------
// Admin Settings • Security
// - School-level auth posture (2FA, password policy, session timeout).
// - Your auth middleware can read these to enforce requirements.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react'

const KEY = 'security'

export function useSecuritySettings({ vm }) {
  const initial = useMemo(
    () =>
      vm?.prefs?.[KEY] || {
        require2FA: false,
        sessionTimeoutMins: 60, // idle sign-out
        passwordPolicy: {
          minLength: 8,
          requireUpper: true,
          requireNumber: true,
          requireSymbol: false,
        },
      },
    [vm?.prefs]
  )

  const [draft, setDraft] = useState(initial)
  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const update = useCallback(patch => setDraft(d => ({ ...d, ...patch })), [])

  async function save(partial = draft) {
    const next = { ...partial }
    // normalize/guards
    next.sessionTimeoutMins = Math.max(5, Number(next.sessionTimeoutMins || 60))
    const p = next.passwordPolicy || {}
    next.passwordPolicy = {
      minLength: Math.max(6, Number(p.minLength || 8)),
      requireUpper: !!p.requireUpper,
      requireNumber: !!p.requireNumber,
      requireSymbol: !!p.requireSymbol,
    }
    await vm.actions.save({ [KEY]: next })
  }

  return { draft, setDraft, update, save }
}
