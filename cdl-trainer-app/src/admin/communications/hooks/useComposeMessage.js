// Path: src/admin/communications/hooks/useComposeMessage.js
// =============================================================================
// useComposeMessage
// - Manages a message draft with channels, template, variables, segment & schedule
// - Validates based on selected channels (e.g., subject required for email)
// - Reads channel feature flags from env (VITE_COMMS_EMAIL / VITE_COMMS_SMS)
// - Normalizes payload before calling queueMessage()
// - Tiny utilities for toggling channels, attaching templates, etc.
// =============================================================================

import { useMemo, useState, useCallback } from 'react'
import { queueMessage } from '../services'

// Channel allowlist (must match the service)
const CHANNELS = /** @type {const} */ (['inapp', 'email', 'sms'])

/** Feature flags (runtime) */
const FLAGS = {
  email: (import.meta.env?.VITE_COMMS_EMAIL ?? '1') !== '0',
  sms:   (import.meta.env?.VITE_COMMS_SMS   ?? '0') === '1',
}

/** Guard & normalize channels against allowlist + flags */
function normalizeChannels(list) {
  const base = Array.isArray(list) && list.length ? list : ['inapp']
  const filtered = base
    .map(String)
    .map((c) => c.toLowerCase())
    .filter((c) => CHANNELS.includes(c))
    .filter((c) => (c === 'email' ? FLAGS.email : c === 'sms' ? FLAGS.sms : true))
  return filtered.length ? filtered : ['inapp']
}

/** Default “send to everyone” segment */
const DEFAULT_SEGMENT = { type: 'query', query: { kind: 'students:all' } }

/** Convert various date inputs into a Date or null */
function toDateLike(v) {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'number') return new Date(v)
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * @typedef {{
 *   defaultChannels?: ('inapp'|'email'|'sms')[],
 *   role?: 'admin'|'instructor',
 *   scope?: { schoolId?: string|null, companyId?: string|null }
 * }} Options
 */

/**
 * useComposeMessage
 * @param {Options} [opts]
 */
export function useComposeMessage(
  { defaultChannels = ['inapp'], role = 'admin', scope = {} } = {}
) {
  // ---------- draft state ----------
  const [draft, setDraft] = useState(() => ({
    channels: normalizeChannels(defaultChannels),
    subject: '',
    bodyHtml: '',
    bodyText: '',
    templateId: null,
    variables: /** @type {Record<string, any>} */ ({}),
    segment: DEFAULT_SEGMENT,
    scheduleAt: null, // Date | string | number | null
    ...scope,         // optional schoolId/companyId from caller
  }))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(/** @type {Error|null} */ (null))

  // ---------- derived ----------
  const allowedChannels = useMemo(() => ({
    inapp: true,
    email: FLAGS.email,
    sms: FLAGS.sms,
  }), [])

  const channels = useMemo(
    () => normalizeChannels(draft.channels),
    [draft.channels]
  )

  const requiresSubject = channels.includes('email')
  const hasBody = !!(draft.bodyHtml?.trim() || draft.bodyText?.trim() || draft.templateId)

  const validation = useMemo(() => {
    /** @type {Record<string, string|undefined>} */
    const v = {}
    if (requiresSubject && !draft.subject?.trim()) v.subject = 'Subject is required for email.'
    if (!hasBody) v.body = 'Provide HTML/Text or select a template.'
    if (!channels.length) v.channels = 'At least one channel must be selected.'
    return v
  }, [requiresSubject, hasBody, channels.length, draft.subject])

  const valid = useMemo(() => Object.keys(validation).length === 0, [validation])
  const canSend = valid && !sending

  // Character/length hints
  const counts = useMemo(() => ({
    subject: draft.subject?.length || 0,
    bodyHtml: draft.bodyHtml?.length || 0,
    bodyText: draft.bodyText?.length || 0,
  }), [draft.subject, draft.bodyHtml, draft.bodyText])

  // ---------- mutators ----------
  const setField = useCallback((key, value) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }, [])

  const setChannels = useCallback((list) => {
    setDraft((d) => ({ ...d, channels: normalizeChannels(list) }))
  }, [])

  const toggleChannel = useCallback((code) => {
    setDraft((d) => {
      const cur = new Set(normalizeChannels(d.channels))
      const c = String(code).toLowerCase()
      if (!CHANNELS.includes(c)) return d
      // ignore toggling disabled channels
      if ((c === 'email' && !FLAGS.email) || (c === 'sms' && !FLAGS.sms)) return d
      if (cur.has(c)) cur.delete(c)
      else cur.add(c)
      const next = normalizeChannels([...cur])
      return { ...d, channels: next }
    })
  }, [])

  const setSegment = useCallback((segment) => {
    setDraft((d) => ({ ...d, segment: segment || DEFAULT_SEGMENT }))
  }, [])

  const setSchedule = useCallback((at) => {
    setDraft((d) => ({ ...d, scheduleAt: toDateLike(at) }))
  }, [])

  const attachTemplate = useCallback((templateId) => {
    setDraft((d) => ({
      ...d,
      templateId: templateId || null,
      // Keep body fields; caller can clear if template should own the body
    }))
  }, [])

  const detachTemplate = useCallback(() => {
    setDraft((d) => ({ ...d, templateId: null }))
  }, [])

  const reset = useCallback((overrides = {}) => {
    setDraft({
      channels: normalizeChannels(defaultChannels),
      subject: '',
      bodyHtml: '',
      bodyText: '',
      templateId: null,
      variables: {},
      segment: DEFAULT_SEGMENT,
      scheduleAt: null,
      ...scope,
      ...overrides,
    })
    setError(null)
  }, [defaultChannels, scope])

  // ---------- send ----------
  const send = useCallback(async () => {
    setSending(true)
    setError(null)
    try {
      // Basic client-side validation
      if (!valid) throw new Error(Object.values(validation)[0] || 'Message is not valid.')

      const payload = {
        role,
        schoolId: draft.schoolId ?? null,
        companyId: draft.companyId ?? null,

        channels,
        subject: draft.subject || '',
        bodyHtml: draft.bodyHtml || null,
        bodyText: draft.bodyText || null,

        templateId: draft.templateId || null,
        variables: draft.variables || {},

        segment: draft.segment || DEFAULT_SEGMENT,
        scheduleAt: draft.scheduleAt || null, // service normalizes to Timestamp
      }

      const res = await queueMessage(payload)
      return res // { id }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setSending(false)
    }
  }, [channels, draft, role, valid, validation])

  return {
    // state
    draft,
    sending,
    error,

    // derived
    channels,
    allowedChannels,
    requiresSubject,
    counts,
    validation,
    valid,
    canSend,

    // mutators
    setField,
    setChannels,
    toggleChannel,
    setSegment,
    setSchedule,
    attachTemplate,
    detachTemplate,
    reset,

    // action
    send,
  }
}

export default useComposeMessage