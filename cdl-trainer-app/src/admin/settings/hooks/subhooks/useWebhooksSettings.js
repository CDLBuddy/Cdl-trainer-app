// src/admin/settings/hooks/subhooks/useWebhooksSettings.js
// ---------------------------------------------------------------------------
// Admin Settings • Webhooks
// - Lets a school subscribe endpoints to app events (server should dispatch).
// - Store URLs and event lists; validate shape lightly here.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState, useCallback } from 'react'

const KEY = 'webhooks'
// canonical event names you plan to emit (extend freely)
const KNOWN_EVENTS = [
  'invoice.created',
  'invoice.paid',
  'student.enrolled',
  'student.completed',
  'doc.expiring',
]

export function useWebhooksSettings({ vm }) {
  const initial = useMemo(
    () =>
      vm?.prefs?.[KEY] || {
        endpoints: [
          // { url: 'https://example.com/hook', events: ['invoice.paid'] }
        ],
        signatureHeader: '', // optional HMAC header name; secret managed server-side
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
    // sanitize endpoints
    next.endpoints = Array.isArray(next.endpoints)
      ? next.endpoints
          .map(ep => ({
            url:
              typeof ep?.url === 'string' && /^https?:\/\/.+/i.test(ep.url)
                ? ep.url.trim()
                : '',
            events: Array.isArray(ep?.events)
              ? ep.events.filter(e => KNOWN_EVENTS.includes(e))
              : [],
          }))
          .filter(ep => ep.url && ep.events.length)
      : []
    await vm.actions.save({ [KEY]: next })
  }

  return { draft, setDraft, update, save, KNOWN_EVENTS }
}
