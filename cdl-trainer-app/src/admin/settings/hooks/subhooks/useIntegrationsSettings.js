// src/admin/settings/hooks/subhooks/useIntegrationsSettings.js
// ---------------------------------------------------------------------------
// Admin Settings • Integrations
// - Tracks connection state & lightweight config for third-party systems.
// - Secrets/keys should be handled server-side; store only flags/ids/urls here.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState, useCallback } from 'react'

const KEY = 'integrations'

export function useIntegrationsSettings({ vm }) {
  const initial = useMemo(
    () =>
      vm?.prefs?.[KEY] || {
        stripeConnected: false,
        stripeAccountId: '', // reference only (no secrets)
        quickbooksConnected: false,
        quickbooksRealmId: '', // reference only
        zapierWebhookUrl: '', // optional outbound automation
      },
    [vm?.prefs]
  )

  const [draft, setDraft] = useState(initial)
  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const update = useCallback(patch => setDraft(d => ({ ...d, ...patch })), [])

  async function save(partial = draft) {
    // small guard: URL sanity for zapierWebhookUrl
    const next = { ...partial }
    if (
      next.zapierWebhookUrl &&
      !/^https?:\/\/.+/i.test(next.zapierWebhookUrl)
    ) {
      // Don’t block save; just normalize
      next.zapierWebhookUrl = ''
    }
    await vm.actions.save({ [KEY]: next })
  }

  return { draft, setDraft, update, save }
}
