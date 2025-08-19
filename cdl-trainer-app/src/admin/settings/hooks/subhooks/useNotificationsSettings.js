// src/admin/settings/hooks/subhooks/useNotificationsSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'

export const KEY = 'notifications'

export const DEFAULTS = Object.freeze({
  email: true,
  sms: false,
  weeklyDigest: true,
})

/* ---------------- helpers ---------------- */
const toBool = (v, fallback) => (typeof v === 'boolean' ? v : !!fallback)
const normalizeDraft = (d = {}) => ({
  email:        toBool(d.email,        DEFAULTS.email),
  sms:          toBool(d.sms,          DEFAULTS.sms),
  weeklyDigest: toBool(d.weeklyDigest, DEFAULTS.weeklyDigest),
})

const shallowEq = (a, b) =>
  a.email === b.email &&
  a.sms === b.sms &&
  a.weeklyDigest === b.weeklyDigest

/* ---------------- hook ---------------- */
export function useNotificationsSettings({ vm } = {}) {
  // Seed from saved prefs (or defaults), then normalize.
  const initial = useMemo(
    () => normalizeDraft(vm?.prefs?.[KEY] || DEFAULTS),
    [vm?.prefs]
  )

  const [draft, setDraft] = useState(initial)
  useEffect(() => { setDraft(initial) }, [initial])

  // Mutators
  const update = useCallback(
    (patch) => setDraft(d => normalizeDraft({ ...d, ...patch })),
    []
  )
  const reset = useCallback(() => setDraft(initial), [initial])

  // Derived
  const errors = useMemo(() => ({}), [draft]) // add validation later if needed
  const valid = true
  const dirty = useMemo(() => !shallowEq(draft, initial), [draft, initial])

  // Persistence
  const save = useCallback(
    async (partial) => {
      const payload = normalizeDraft(partial ? { ...draft, ...partial } : draft)
      if (!vm?.actions?.save) return { ok: false, error: 'Save action is unavailable.' }
      try {
        await vm.actions.save({ [KEY]: payload })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err?.message || 'Failed to save notification settings.' }
      }
    },
    [draft, vm?.actions]
  )

  // Convenient field accessors
  const { email, sms, weeklyDigest } = draft

  return {
    // state
    draft,
    defaults: DEFAULTS,
    initial,

    // derived
    dirty,
    valid,
    errors,

    // field accessors
    email,
    sms,
    weeklyDigest,

    // mutators
    setDraft,
    update,
    reset,

    // persistence
    save,

    // meta
    KEY,
  }
}