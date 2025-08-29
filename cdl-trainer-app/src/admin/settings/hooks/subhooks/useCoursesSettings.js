// src/admin/settings/hooks/subhooks/useCoursesSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'

export const KEY = 'courses'

export const DEFAULTS = Object.freeze({
  enableELDT: true,
  enablePractice: true,
  enableWalkthrough: true,
})

/* ---------------- helpers ---------------- */

const toBool = (v, fallback) => (typeof v === 'boolean' ? v : !!fallback)
const normalizeDraft = (d = {}) => ({
  enableELDT: toBool(d.enableELDT, DEFAULTS.enableELDT),
  enablePractice: toBool(d.enablePractice, DEFAULTS.enablePractice),
  enableWalkthrough: toBool(d.enableWalkthrough, DEFAULTS.enableWalkthrough),
})

const shallowEq = (a, b) =>
  a.enableELDT === b.enableELDT &&
  a.enablePractice === b.enablePractice &&
  a.enableWalkthrough === b.enableWalkthrough

/* ---------------- hook ---------------- */

export function useCoursesSettings({ vm } = {}) {
  // Seed from saved prefs (or defaults), then normalize.
  const initial = useMemo(
    () => normalizeDraft(vm?.prefs?.[KEY] || DEFAULTS),
    [vm?.prefs]
  )

  const [draft, setDraft] = useState(initial)
  useEffect(() => {
    setDraft(initial)
  }, [initial])

  // Mutators
  const update = useCallback(
    patch => setDraft(d => normalizeDraft({ ...d, ...patch })),
    []
  )
  const reset = useCallback(() => setDraft(initial), [initial])

  // Derived
  const errors = useMemo(() => ({}), []) // no complex validation yet
  const valid = true
  const dirty = useMemo(() => !shallowEq(draft, initial), [draft, initial])

  // Persistence
  const save = useCallback(
    async partial => {
      const payload = normalizeDraft(partial ? { ...draft, ...partial } : draft)
      if (!vm?.actions?.save)
        return { ok: false, error: 'Save action is unavailable.' }
      try {
        await vm.actions.save({ [KEY]: payload })
        return { ok: true }
      } catch (err) {
        return {
          ok: false,
          error: err?.message || 'Failed to save course settings.',
        }
      }
    },
    [draft, vm?.actions]
  )

  // Convenient field accessors
  const { enableELDT, enablePractice, enableWalkthrough } = draft

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
    enableELDT,
    enablePractice,
    enableWalkthrough,

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
