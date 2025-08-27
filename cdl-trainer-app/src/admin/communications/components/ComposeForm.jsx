// Path: src/admin/communications/components/ComposeForm.jsx
import React, { useMemo, useState, useCallback } from 'react'
import PropTypes from 'prop-types'

import { useComposeMessage } from '../hooks'
import { useTemplates } from '../hooks'
import { useToast } from '@components/ToastProvider.jsx'

import cls from './ComposeForm.module.css'

// ---- small helpers ----------------------------------------------------
function toLocalInputValue(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const AUDIENCE_PRESETS = [
  { value: 'students:all',        label: 'All Students' },
  { value: 'students:enrolled',   label: 'Enrolled Students' },
  { value: 'students:not-started',label: 'Not Started (students)' },
  { value: 'instructors:all',     label: 'All Instructors' },
]

// ---- component --------------------------------------------------------
export default function ComposeForm({
  role = 'admin',
  defaultChannels = ['inapp'],
  scope = {},
  onSent,
}) {
  const toast = useToast?.()
  const {
    draft,
    setField,
    setChannels,
    toggleChannel,
    setSegment,
    setSchedule,
    attachTemplate,
    detachTemplate,
    channels,
    allowedChannels,
    requiresSubject,
    counts,
    validation,
    valid,
    canSend,
    sending,
    send,
    error,
    reset,
  } = useComposeMessage({ defaultChannels, role, scope })

  const { templates = [], loading: loadingTpl } = useTemplates?.() || {}

  // JSON variables editor (simple UX)
  const [varsText, setVarsText] = useState(() =>
    JSON.stringify(draft.variables || {}, null, 2)
  )
  const [varsErr, setVarsErr] = useState(null)

  const handleVarsBlur = useCallback(() => {
    try {
      const obj = varsText.trim() ? JSON.parse(varsText) : {}
      setField('variables', obj)
      setVarsErr(null)
    } catch (e) {
      setVarsErr('Invalid JSON')
    }
  }, [varsText, setField])

  const onTemplateChange = useCallback((e) => {
    const id = e.target.value
    if (!id) detachTemplate()
    else attachTemplate(id)
  }, [attachTemplate, detachTemplate])

  const onAudienceChange = useCallback((e) => {
    const kind = e.target.value
    setSegment({ type: 'query', query: { kind } })
  }, [setSegment])

  const onScheduleChange = useCallback((e) => {
    const v = e.target.value // yyyy-mm-ddThh:mm or ''
    setSchedule(v ? new Date(v) : null)
  }, [setSchedule])

  const onSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!canSend) return
    try {
      const { id } = await send()
      toast?.showToast?.('Message queued', { type: 'success' })
      onSent?.(id)
      reset({ subject: '', bodyHtml: '', bodyText: '', templateId: null })
      setVarsText('{}')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast?.showToast?.(msg || 'Failed to queue message', { type: 'error' })
    }
  }, [canSend, send, toast, onSent, reset])

  const subjectHelp = useMemo(() => {
    if (requiresSubject) return 'Required for email.'
    return 'Optional (shown for email if provided).'
  }, [requiresSubject])

  return (
    <section className={cls.card} aria-labelledby="compose-title">
      <header className={cls.header}>
        <h3 id="compose-title" className={cls.title}>✍️ Compose Message</h3>
        <p className={cls.subtitle}>
          Choose channels, audience, and content. You can schedule or send now.
        </p>
      </header>

      <form className={cls.form} onSubmit={onSubmit} noValidate>
        {/* Channels */}
        <fieldset className={cls.fieldset}>
          <legend className={cls.legend}>Channels</legend>
          <div className={cls.channelsRow}>
            <label className={cls.channel}>
              <input
                type="checkbox"
                checked={channels.includes('inapp')}
                onChange={() => toggleChannel('inapp')}
              />
              <span>In-App</span>
            </label>

            <label className={cls.channel} aria-disabled={!allowedChannels.email}>
              <input
                type="checkbox"
                checked={channels.includes('email')}
                onChange={() => toggleChannel('email')}
                disabled={!allowedChannels.email}
              />
              <span>Email{!allowedChannels.email ? ' (disabled)' : ''}</span>
            </label>

            <label className={cls.channel} aria-disabled={!allowedChannels.sms}>
              <input
                type="checkbox"
                checked={channels.includes('sms')}
                onChange={() => toggleChannel('sms')}
                disabled={!allowedChannels.sms}
              />
              <span>SMS{!allowedChannels.sms ? ' (disabled)' : ''}</span>
            </label>
          </div>
          {validation.channels && (
            <div role="alert" className={cls.error}>{validation.channels}</div>
          )}
        </fieldset>

        {/* Audience */}
        <div className={cls.rowGrid}>
          <div className={cls.field}>
            <label className={cls.label} htmlFor="aud">
              Audience
            </label>
            <select
              id="aud"
              className={cls.select}
              onChange={onAudienceChange}
              value={draft.segment?.query?.kind || 'students:all'}
            >
              {AUDIENCE_PRESETS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <p className={cls.help}>Preset segments. Advanced filters can come later.</p>
          </div>

          {/* Schedule */}
          <div className={cls.field}>
            <label className={cls.label} htmlFor="schedule">
              Schedule (optional)
            </label>
            <input
              id="schedule"
              type="datetime-local"
              className={cls.input}
              value={toLocalInputValue(draft.scheduleAt)}
              onChange={onScheduleChange}
            />
            <p className={cls.help}>
              Leave empty to send immediately. Uses your local timezone.
            </p>
          </div>
        </div>

        {/* Template */}
        <div className={cls.field}>
          <label className={cls.label} htmlFor="tpl">Template</label>
          <select
            id="tpl"
            className={cls.select}
            value={draft.templateId || ''}
            onChange={onTemplateChange}
            disabled={loadingTpl}
          >
            <option value="">— None —</option>
            {(templates || []).map(t => (
              <option key={t.id} value={t.id}>{t.name || t.id}</option>
            ))}
          </select>
          <p className={cls.help}>
            Selecting a template doesn’t erase your body fields; it’s merged at send time.
          </p>
        </div>

        {/* Subject */}
        <div className={cls.field}>
          <label className={cls.label} htmlFor="subject">
            Subject {requiresSubject && <span aria-hidden>•</span>}
          </label>
          <input
            id="subject"
            className={cls.input}
            type="text"
            value={draft.subject}
            onChange={(e) => setField('subject', e.target.value)}
            aria-invalid={!!validation.subject}
            placeholder="e.g., Welcome to CDL Trainer!"
          />
          <div className={cls.metaRow}>
            <p className={cls.help}>{subjectHelp}</p>
            <span className={cls.count}>{counts.subject}</span>
          </div>
          {validation.subject && (
            <div role="alert" className={cls.error}>{validation.subject}</div>
          )}
        </div>

        {/* Body (HTML) */}
        <div className={cls.field}>
          <label className={cls.label} htmlFor="bodyHtml">Body (HTML or plain text)</label>
          <textarea
            id="bodyHtml"
            className={cls.textarea}
            rows={8}
            value={draft.bodyHtml}
            onChange={(e) => setField('bodyHtml', e.target.value)}
            placeholder="<p>Thanks for enrolling…</p>"
          />
          <div className={cls.metaRow}>
            <p className={cls.help}>You can keep this empty if the template renders the body.</p>
            <span className={cls.count}>{counts.bodyHtml}</span>
          </div>
        </div>

        {/* Body (fallback text) */}
        <div className={cls.field}>
          <label className={cls.label} htmlFor="bodyText">Text fallback (optional)</label>
          <textarea
            id="bodyText"
            className={cls.textarea}
            rows={4}
            value={draft.bodyText}
            onChange={(e) => setField('bodyText', e.target.value)}
            placeholder="Thanks for enrolling…"
          />
          <div className={cls.metaRow}>
            <p className={cls.help}>Used for SMS or email clients that prefer text.</p>
            <span className={cls.count}>{counts.bodyText}</span>
          </div>
        </div>

        {/* Variables (JSON) */}
        <div className={cls.field}>
          <label className={cls.label} htmlFor="vars">Template variables (JSON)</label>
          <textarea
            id="vars"
            className={cls.textareaMono}
            rows={6}
            value={varsText}
            onChange={(e) => setVarsText(e.target.value)}
            onBlur={handleVarsBlur}
            spellCheck={false}
          />
          <div className={cls.metaRow}>
            <p className={cls.help}>Example: {"{ \"firstName\": \"Alex\" }"}</p>
            {varsErr && <span role="alert" className={cls.error}>{varsErr}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className={cls.actions}>
          <button
            type="submit"
            className={cls.btnPrimary}
            disabled={!canSend}
            aria-disabled={!canSend}
          >
            {sending ? 'Queuing…' : (draft.scheduleAt ? 'Schedule Message' : 'Send Now')}
          </button>
          <button
            type="button"
            className={cls.btnGhost}
            onClick={() => reset()}
            disabled={sending}
          >
            Clear
          </button>
          {!valid && (
            <span className={cls.error} aria-live="polite">
              {Object.values(validation)[0]}
            </span>
          )}
          {error && (
            <span className={cls.error} aria-live="assertive">
              {String(error.message || error)}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

ComposeForm.propTypes = {
  role: PropTypes.oneOf(['admin', 'instructor']),
  defaultChannels: PropTypes.arrayOf(PropTypes.oneOf(['inapp', 'email', 'sms'])),
  scope: PropTypes.shape({
    schoolId: PropTypes.string,
    companyId: PropTypes.string,
  }),
  onSent: PropTypes.func,
}