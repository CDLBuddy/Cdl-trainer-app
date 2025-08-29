// src/admin/settings/hooks/subhooks/useComplianceSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'

export const KEY = 'compliance'

export const DEFAULTS = Object.freeze({
  requiredDocs: ['insurance', 'bonding'], // ids/keys you recognize in UI
  notifyBeforeDays: 30, // reminder lead time
})

/* ---------------- helpers ---------------- */

const uniqueStrings = (arr = []) =>
  Array.from(new Set((Array.isArray(arr) ? arr : []).map(String)))

function normalizeDraft(d = {}) {
  const days = Number.isFinite(+d.notifyBeforeDays)
    ? Math.max(0, +d.notifyBeforeDays)
    : DEFAULTS.notifyBeforeDays
  return {
    requiredDocs: uniqueStrings(
      d.requiredDocs?.length ? d.requiredDocs : DEFAULTS.requiredDocs
    ),
    notifyBeforeDays: days,
  }
}

const shallowEq = (a, b) =>
  a.notifyBeforeDays === b.notifyBeforeDays &&
  a.requiredDocs.length === b.requiredDocs.length &&
  a.requiredDocs.every((v, i) => v === b.requiredDocs[i])

/* ---------------- hook ---------------- */

export function useComplianceSettings({ vm } = {}) {
  // seed from saved prefs → normalize
  const base = useMemo(
    () => normalizeDraft(vm?.prefs?.[KEY] || DEFAULTS),
    [vm?.prefs]
  )

  const [draft, setDraft] = useState(base)
  useEffect(() => {
    setDraft(base)
  }, [base])

  const update = useCallback(
    patch => setDraft(d => normalizeDraft({ ...d, ...patch })),
    []
  )

  const setRequiredDocs = useCallback(
    docs => setDraft(d => normalizeDraft({ ...d, requiredDocs: docs })),
    []
  )
  const addRequiredDoc = useCallback(
    docKey =>
      setDraft(d =>
        normalizeDraft({ ...d, requiredDocs: [...d.requiredDocs, docKey] })
      ),
    []
  )
  const removeRequiredDoc = useCallback(
    docKey =>
      setDraft(d =>
        normalizeDraft({
          ...d,
          requiredDocs: d.requiredDocs.filter(x => x !== docKey),
        })
      ),
    []
  )
  const setNotifyBeforeDays = useCallback(
    n => setDraft(d => normalizeDraft({ ...d, notifyBeforeDays: n })),
    []
  )

  const reset = useCallback(() => setDraft(base), [base])

  // validation
  const errors = useMemo(() => {
    const e = {}
    if (!Array.isArray(draft.requiredDocs) || draft.requiredDocs.length === 0) {
      e.requiredDocs = 'Select at least one required document.'
    }
    if (
      !Number.isFinite(draft.notifyBeforeDays) ||
      draft.notifyBeforeDays < 0 ||
      draft.notifyBeforeDays > 365
    ) {
      e.notifyBeforeDays = 'Lead time must be between 0 and 365 days.'
    }
    return e
  }, [draft])

  const valid = useMemo(() => Object.keys(errors).length === 0, [errors])
  const dirty = useMemo(() => !shallowEq(draft, base), [draft, base])

  // persistence
  const save = useCallback(
    async partial => {
      const toSave = normalizeDraft(partial ? { ...draft, ...partial } : draft)
      if (!valid)
        return { ok: false, error: 'Fix validation errors before saving.' }
      if (!vm?.actions?.save)
        return { ok: false, error: 'Save action is unavailable.' }
      try {
        await vm.actions.save({ [KEY]: toSave })
        return { ok: true }
      } catch (err) {
        return {
          ok: false,
          error: err?.message || 'Failed to save compliance settings.',
        }
      }
    },
    [draft, valid, vm?.actions]
  )

  return {
    // state
    draft,
    defaults: DEFAULTS,
    initial: base,

    // derived
    valid,
    errors,
    dirty,

    // field accessors
    requiredDocs: draft.requiredDocs,
    notifyBeforeDays: draft.notifyBeforeDays,

    // mutators
    setDraft,
    update,
    setRequiredDocs,
    addRequiredDoc,
    removeRequiredDoc,
    setNotifyBeforeDays,
    reset,

    // persistence
    save,

    // meta
    KEY,
  }
}
