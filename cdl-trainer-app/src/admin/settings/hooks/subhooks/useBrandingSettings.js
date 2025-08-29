// src/admin/settings/hooks/subhooks/useBrandingSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'

export const KEY = 'branding'

export const DEFAULTS = Object.freeze({
  schoolName: '',
  primaryColor: '#0b5a6e',
  logoUrl: '',
})

/* ---------- helpers ---------- */

const isHex = v => /^#(?:[0-9a-f]{3}){1,2}$/i.test(v || '')
const normHex = v => {
  if (!v) return DEFAULTS.primaryColor
  const s = String(v).trim()
  if (isHex(s)) return s.toLowerCase()
  // Accept "0b5a6e" → "#0b5a6e"
  if (/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return `#${s.toLowerCase()}`
  return DEFAULTS.primaryColor
}
const isUrl = v => /^(?:https?:)?\/\//i.test(v || '') || v?.startsWith('/')

function normalizeDraft(d = {}) {
  return {
    schoolName: String(d.schoolName ?? '').slice(0, 120),
    primaryColor: normHex(d.primaryColor ?? DEFAULTS.primaryColor),
    logoUrl: String(d.logoUrl ?? ''),
  }
}

const shallowEq = (a, b) =>
  a.schoolName === b.schoolName &&
  a.primaryColor === b.primaryColor &&
  a.logoUrl === b.logoUrl

/* ---------- hook ---------- */

export function useBrandingSettings({ vm } = {}) {
  // Compose a base from saved prefs and current brand (server-side branding)
  const base = useMemo(() => {
    const saved = vm?.prefs?.[KEY] || {}
    const serverBrand = vm?.brand || {}
    // prefs override server branding, then normalize
    return normalizeDraft({ ...serverBrand, ...DEFAULTS, ...saved })
  }, [vm?.prefs, vm?.brand])

  const [draft, setDraft] = useState(base)
  useEffect(() => {
    setDraft(base)
  }, [base])

  /* mutations */
  const update = useCallback(
    patch => setDraft(d => normalizeDraft({ ...d, ...patch })),
    []
  )
  const setSchoolName = useCallback(
    v => setDraft(d => normalizeDraft({ ...d, schoolName: v })),
    []
  )
  const setPrimaryColor = useCallback(
    v => setDraft(d => normalizeDraft({ ...d, primaryColor: v })),
    []
  )
  const setLogoUrl = useCallback(
    v => setDraft(d => normalizeDraft({ ...d, logoUrl: v })),
    []
  )
  const reset = useCallback(() => setDraft(base), [base])

  /* validation & derived */
  const errors = useMemo(() => {
    const e = {}
    if (!draft.schoolName?.trim()) e.schoolName = 'School name is required.'
    if (!isHex(draft.primaryColor))
      e.primaryColor = 'Use a valid hex color (e.g., #0b5a6e).'
    if (draft.logoUrl && !isUrl(draft.logoUrl))
      e.logoUrl = 'Logo must be an absolute URL or a site-relative path.'
    return e
  }, [draft])

  const valid = useMemo(() => Object.keys(errors).length === 0, [errors])
  const dirty = useMemo(() => !shallowEq(draft, base), [draft, base])

  /* persistence */
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
          error: err?.message || 'Failed to save branding settings.',
        }
      }
    },
    [draft, valid, vm?.actions]
  )

  /* public API */
  return {
    // state
    draft,
    defaults: DEFAULTS,
    initial: base,

    // derived
    valid,
    errors,
    dirty,

    // field accessors (with server-brand fallbacks for display)
    schoolName: draft.schoolName || vm?.brand?.schoolName || '',
    primaryColor:
      draft.primaryColor || vm?.brand?.primaryColor || DEFAULTS.primaryColor,
    logoUrl: draft.logoUrl || vm?.brand?.logoUrl || '',

    // mutators
    setDraft,
    update,
    setSchoolName,
    setPrimaryColor,
    setLogoUrl,
    reset,

    // persistence
    save,

    // meta
    KEY,
  }
}
