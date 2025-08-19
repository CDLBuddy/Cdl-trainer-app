// src/admin/settings/hooks/subhooks/useBillingSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'

/** Logical namespace in adminPrefs */
export const KEY = 'billing'

/** Allowed payment methods (extend as your product supports more) */
const ALLOWED_METHODS = ['card', 'ach', 'cash', 'check', 'invoice', 'wire', 'paypal']

/** Sensible defaults */
export const DEFAULTS = Object.freeze({
  acceptedMethods: ['card'],
  defaultTermsNetDays: 15, // NET-15
  autopay: false,
})

/** Clamp helper */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

/** Normalize user-provided draft to our shape */
function normalizeDraft(d = {}) {
  const methods = Array.isArray(d.acceptedMethods) ? d.acceptedMethods : []
  const deduped = [...new Set(methods.map(String).map(s => s.toLowerCase()))]
  const filtered = deduped.filter(m => ALLOWED_METHODS.includes(m))
  const net = Number.isFinite(+d.defaultTermsNetDays) ? +d.defaultTermsNetDays : DEFAULTS.defaultTermsNetDays
  return {
    acceptedMethods: filtered.length ? filtered : DEFAULTS.acceptedMethods,
    defaultTermsNetDays: clamp(net, 0, 60), // keep reasonable window
    autopay: !!d.autopay,
  }
}

/** Shallow-equality for our tiny drafts */
function isEqual(a, b) {
  return (
    a.autopay === b.autopay &&
    a.defaultTermsNetDays === b.defaultTermsNetDays &&
    a.acceptedMethods.length === b.acceptedMethods.length &&
    a.acceptedMethods.every((v, i) => v === b.acceptedMethods[i])
  )
}

/**
 * useBillingSettings
 * Cohesive VM for the Billing section of Admin Settings.
 * - Reads from vm.prefs.billing
 * - Provides draft state, validation, dirty tracking, save/reset
 */
export function useBillingSettings({ vm } = {}) {
  // Derive the initial normalized draft from prefs (or defaults)
  const initial = useMemo(() => {
    const base = vm?.prefs?.[KEY] || {}
    return normalizeDraft({ ...DEFAULTS, ...base })
  }, [vm?.prefs])

  const [draft, setDraft] = useState(initial)

  // Keep draft in sync when prefs change externally
  useEffect(() => { setDraft(initial) }, [initial])

  // ---- mutations --------------------------------------------------------

  const update = useCallback(
    patch => setDraft(d => normalizeDraft({ ...d, ...patch })),
    []
  )

  const setAcceptedMethods = useCallback(
    arr => setDraft(d => normalizeDraft({ ...d, acceptedMethods: arr })),
    []
  )

  const addMethod = useCallback(
    method =>
      setDraft(d => {
        const m = String(method || '').toLowerCase()
        if (!ALLOWED_METHODS.includes(m)) return d
        if (d.acceptedMethods.includes(m)) return d
        return normalizeDraft({ ...d, acceptedMethods: [...d.acceptedMethods, m] })
      }),
    []
  )

  const removeMethod = useCallback(
    method =>
      setDraft(d => {
        const m = String(method || '').toLowerCase()
        const next = d.acceptedMethods.filter(x => x !== m)
        return normalizeDraft({ ...d, acceptedMethods: next })
      }),
    []
  )

  const toggleMethod = useCallback(
    method =>
      setDraft(d => {
        const m = String(method || '').toLowerCase()
        if (!ALLOWED_METHODS.includes(m)) return d
        const has = d.acceptedMethods.includes(m)
        const next = has ? d.acceptedMethods.filter(x => x !== m) : [...d.acceptedMethods, m]
        return normalizeDraft({ ...d, acceptedMethods: next })
      }),
    []
  )

  const reset = useCallback(() => setDraft(initial), [initial])

  // ---- validation & derived state --------------------------------------

  const errors = useMemo(() => {
    const e = {}
    if (!draft.acceptedMethods?.length) e.acceptedMethods = 'Select at least one payment method.'
    if (!Number.isInteger(draft.defaultTermsNetDays) || draft.defaultTermsNetDays < 0 || draft.defaultTermsNetDays > 60) {
      e.defaultTermsNetDays = 'Net terms must be an integer between 0 and 60.'
    }
    return e
  }, [draft])

  const valid = useMemo(() => Object.keys(errors).length === 0, [errors])
  const dirty = useMemo(() => !isEqual(draft, initial), [draft, initial])

  // ---- persistence ------------------------------------------------------

  const save = useCallback(
    async (partial) => {
      const toSave = normalizeDraft(partial ? { ...draft, ...partial } : draft)
      // Prevent no-op or invalid saves
      if (!valid) return { ok: false, error: 'Fix validation errors before saving.' }
      if (!vm?.actions?.save) return { ok: false, error: 'Save action is unavailable.' }
      try {
        await vm.actions.save({ [KEY]: toSave })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err?.message || 'Failed to save billing settings.' }
      }
    },
    [draft, valid, vm?.actions]
  )

  return {
    // state
    draft,
    initial,
    defaults: DEFAULTS,

    // derived
    valid,
    errors,
    dirty,

    // mutators
    setDraft,
    update,
    reset,

    // payment method helpers
    setAcceptedMethods,
    addMethod,
    removeMethod,
    toggleMethod,

    // persistence
    save,

    // metadata
    KEY,
    ALLOWED_METHODS,
  }
}