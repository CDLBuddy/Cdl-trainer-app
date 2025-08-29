// Path: src/admin/communications/components/QuickAnnounce.jsx
import PropTypes from 'prop-types'
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useComposeMessage } from '../hooks'

import cls from './QuickAnnounce.module.css'

/**
 * Ultra-fast broadcast composer.
 * - Defaults to in-app only, immediate send, “all students” segment.
 * - Soft-resets subject/body after successful send (keeps channels).
 * - Cmd/Ctrl+Enter to send.
 * - Optional persistence (sessionStorage) so draft survives a stray nav.
 */
export default function QuickAnnounce({
  role = 'admin',
  scope = {}, // { schoolId?, companyId? }
  defaultChannels = ['inapp'], // 'inapp' | 'email' (add more later)
  persistKey = null, // e.g. 'admin:quick-announce'
  onSent,
}) {
  const subjectId = useId()
  const bodyId = useId()

  const SUBJECT_MAX = 140
  const BODY_MAX = 1000

  const { draft, setDraft, valid, sending, send } = useComposeMessage({
    defaultChannels,
    role,
    scope,
  })

  // -------------------- draft persistence (optional) --------------------
  const storageKey = useMemo(() => {
    if (!persistKey) return null
    const sid = scope?.schoolId || '*'
    const cid = scope?.companyId || '*'
    return `${persistKey}:${role}:${sid}:${cid}`
  }, [persistKey, role, scope?.schoolId, scope?.companyId])

  // Load persisted draft once
  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === 'object') {
          setDraft(d => ({
            ...d,
            channels:
              Array.isArray(saved.channels) && saved.channels.length
                ? saved.channels
                : d.channels,
            subject:
              typeof saved.subject === 'string' ? saved.subject : d.subject,
            bodyHtml:
              typeof saved.bodyHtml === 'string' ? saved.bodyHtml : d.bodyHtml,
          }))
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Save on changes (debounced)
  const saveTimer = useRef(null)
  useEffect(() => {
    if (!storageKey) return
    try {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            channels: draft.channels,
            subject: draft.subject,
            bodyHtml: draft.bodyHtml,
          })
        )
      }, 250)
    } catch {
      /* ignore */
    }
    return () => clearTimeout(saveTimer.current)
  }, [storageKey, draft.channels, draft.subject, draft.bodyHtml])

  // -------------------- UI state --------------------
  const [ack, setAck] = useState(null)
  const liveRef = useRef(null)

  const trimmedSubject = String(draft.subject || '').trim()
  const trimmedBody = String(draft.bodyHtml || '').trim()

  const toggleChannel = ch => {
    setDraft(d => {
      const set = new Set(d.channels || [])
      set.has(ch) ? set.delete(ch) : set.add(ch)
      return { ...d, channels: [...set] }
    })
  }

  const canSend = useMemo(() => {
    const hasChannel =
      Array.isArray(draft.channels) && draft.channels.length > 0
    const hasContent = trimmedSubject.length > 0 || trimmedBody.length > 0
    return !sending && hasChannel && hasContent && valid
  }, [
    sending,
    draft.channels,
    valid,
    trimmedSubject.length,
    trimmedBody.length,
  ])

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!canSend) return

    try {
      const res = await send() // hook queues with current draft
      setAck({ type: 'ok', msg: 'Message queued for delivery.' })
      onSent?.(res)
      // announce for screen reader users
      if (liveRef.current) liveRef.current.textContent = 'Message queued.'
      // soft reset (keep channels)
      setDraft(d => ({ ...d, subject: '', bodyHtml: '' }))

      // clear persisted content after successful send
      if (storageKey) {
        try {
          sessionStorage.removeItem(storageKey)
        } catch {
          // intentionally ignore error
        }
      }
    } catch (err) {
      setAck({ type: 'err', msg: err?.message || 'Failed to send.' })
      if (liveRef.current) liveRef.current.textContent = 'Sending failed.'
    } finally {
      // auto-hide toast
      setTimeout(() => setAck(null), 3500)
      // No need to return a cleanup function here
    }
  }

  const onEditorKeyDown = e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      onSubmit(e)
    }
  }

  return (
    <section className={cls.card} aria-labelledby="qa-title">
      <header className={cls.header}>
        <h3 id="qa-title" className={cls.title}>
          🚀 Quick Announce
        </h3>

        <div
          className={cls.channels}
          role="group"
          aria-label="Delivery channels"
        >
          <label className={cls.chip}>
            <input
              type="checkbox"
              checked={draft.channels?.includes('inapp') || false}
              onChange={() => toggleChannel('inapp')}
            />
            <span>In-app</span>
          </label>
          <label className={cls.chip}>
            <input
              type="checkbox"
              checked={draft.channels?.includes('email') || false}
              onChange={() => toggleChannel('email')}
            />
            <span>Email</span>
          </label>
        </div>
      </header>

      <form className={cls.body} onSubmit={onSubmit}>
        <div className={cls.field}>
          <label htmlFor={subjectId} className={cls.label}>
            Subject
          </label>
          <div className={cls.inputWrap}>
            <input
              id={subjectId}
              className={cls.input}
              type="text"
              placeholder="Short, clear subject"
              value={draft.subject || ''}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  subject: e.target.value.slice(0, SUBJECT_MAX),
                }))
              }
              maxLength={SUBJECT_MAX}
              data-testid="qa-subject"
            />
            <span className={cls.count} aria-hidden>
              {trimmedSubject.length}/{SUBJECT_MAX}
            </span>
          </div>
        </div>

        <div className={cls.field}>
          <label htmlFor={bodyId} className={cls.label}>
            Message
          </label>
          <div className={cls.inputWrap}>
            <textarea
              id={bodyId}
              className={`${cls.input} ${cls.textarea}`}
              placeholder="Write a quick announcement…"
              value={draft.bodyHtml || ''}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  bodyHtml: e.target.value.slice(0, BODY_MAX),
                }))
              }
              rows={4}
              onKeyDown={onEditorKeyDown}
              data-testid="qa-body"
            />
            <span className={cls.count} aria-hidden>
              {trimmedBody.length}/{BODY_MAX}
            </span>
          </div>
          <p className={cls.hint}>
            Tip: press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send.
          </p>
        </div>

        <div className={cls.actions}>
          <button
            type="submit"
            className={cls.primary}
            disabled={!canSend}
            data-testid="qa-send"
          >
            {sending ? 'Sending…' : 'Send Now'}
          </button>
          <span
            ref={liveRef}
            className={cls.live}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          />
        </div>

        {ack && (
          <div
            className={`${cls.ack} ${ack.type === 'ok' ? cls.ok : cls.err}`}
            role="alert"
          >
            {ack.msg}
          </div>
        )}
      </form>
    </section>
  )
}

QuickAnnounce.propTypes = {
  role: PropTypes.oneOf(['admin', 'instructor', 'superadmin', 'student']),
  scope: PropTypes.object,
  defaultChannels: PropTypes.arrayOf(PropTypes.string),
  persistKey: PropTypes.string,
  onSent: PropTypes.func,
}
