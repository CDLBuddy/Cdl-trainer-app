// src/admin/settings/hooks/subhooks/useUsersSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'

export const KEY = 'users'

/** Allowed role choices for new invites (UI can use this) */
export const USER_ROLES = ['student', 'instructor', 'admin']

/** Optional: known invite email template keys (adjust to your system) */
export const INVITE_TEMPLATES = ['default', 'concise', 'employer', 'custom']

export const DEFAULTS = Object.freeze({
  inviteEmailTemplate: 'default',
  defaultRole: 'student',
  requireProfileBeforeEnroll: true,
})

/* ---------------- helpers ---------------- */
const clampRole = r =>
  USER_ROLES.includes(String(r || '').toLowerCase())
    ? String(r).toLowerCase()
    : DEFAULTS.defaultRole

const clampTemplate = t =>
  INVITE_TEMPLATES.includes(String(t || ''))
    ? String(t)
    : DEFAULTS.inviteEmailTemplate

const toBool = (v, fb = false) => (typeof v === 'boolean' ? v : !!fb)

const normalizeDraft = (d = {}) => ({
  inviteEmailTemplate: clampTemplate(d.inviteEmailTemplate),
  defaultRole: clampRole(d.defaultRole),
  requireProfileBeforeEnroll: toBool(
    d.requireProfileBeforeEnroll,
    DEFAULTS.requireProfileBeforeEnroll
  ),
})

const shallowEq = (a, b) =>
  a.inviteEmailTemplate === b.inviteEmailTemplate &&
  a.defaultRole === b.defaultRole &&
  a.requireProfileBeforeEnroll === b.requireProfileBeforeEnroll

/* ---------------- hook ---------------- */
export function useUsersSettings({ vm } = {}) {
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
  const errors = useMemo(() => {
    /** Simple validation – expand as needed */
    const e = {}
    if (!USER_ROLES.includes(draft.defaultRole)) {
      e.defaultRole = 'Invalid default role.'
    }
    if (!INVITE_TEMPLATES.includes(draft.inviteEmailTemplate)) {
      e.inviteEmailTemplate = 'Unknown email template.'
    }
    return e
  }, [draft])

  const valid = useMemo(() => Object.keys(errors).length === 0, [errors])
  const dirty = useMemo(() => !shallowEq(draft, initial), [draft, initial])

  // Persistence
  const save = useCallback(
    async partial => {
      const payload = normalizeDraft(partial ? { ...draft, ...partial } : draft)
      if (!vm?.actions?.save) {
        return { ok: false, error: 'Save action is unavailable.' }
      }
      try {
        await vm.actions.save({ [KEY]: payload })
        return { ok: true }
      } catch (err) {
        return {
          ok: false,
          error: err?.message || 'Failed to save user settings.',
        }
      }
    },
    [draft, vm?.actions]
  )

  // Convenient field accessors
  const { inviteEmailTemplate, defaultRole, requireProfileBeforeEnroll } = draft

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
    inviteEmailTemplate,
    defaultRole,
    requireProfileBeforeEnroll,

    // mutators
    setDraft,
    update,
    reset,

    // persistence
    save,

    // meta
    KEY,
    USER_ROLES,
    INVITE_TEMPLATES,
  }
}
