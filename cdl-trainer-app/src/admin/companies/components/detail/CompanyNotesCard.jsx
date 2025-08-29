// Path: src/admin/companies/components/detail/CompanyNotesCard.jsx
// ============================================================================
// CompanyNotesCard
// - Lightweight notes feed + composer
// - A11y-first: roles, aria-live updates, keyboard submit (⌘/Ctrl + Enter)
// - Graceful loading/empty states; optional delete; character counter
// - Non-breaking: onAdd remains the only required interaction
// ============================================================================

import PropTypes from 'prop-types'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import styles from './CompanyCards.module.css'

/**
 * @typedef {{ id?:string, text:string, author?:string, createdAtLabel?:string }} CompanyNote
 */

export default function CompanyNotesCard({
  notes = [],
  loading = false,
  error = '',
  onAdd, // (text) => Promise<void> | void
  onDelete, // optional: (note) => Promise<void> | void
  maxLength = 1000,
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const statusRef = useRef(null)
  const remaining = Math.max(0, maxLength - draft.length)
  const tooLong = draft.length > maxLength
  const canSubmit = draft.trim().length > 0 && !tooLong && !busy

  // Announce status changes for screen readers
  useEffect(() => {
    if (!statusMsg) return
    const t = setTimeout(() => setStatusMsg(''), 1200)
    return () => clearTimeout(t)
  }, [statusMsg])

  async function handleAdd() {
    const text = draft.trim()
    if (!text || busy) return
    try {
      setBusy(true)
      await onAdd?.(text)
      setDraft('')
      setStatusMsg('Note added.')
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
      e.preventDefault()
      handleAdd()
    }
  }

  const countsLabel = useMemo(() => {
    const n = notes?.length || 0
    return n === 1 ? '1 note' : `${n} notes`
  }, [notes?.length])

  return (
    <section
      className={styles.card}
      aria-label="Company notes"
      aria-busy={!!loading}
    >
      <header className={styles.header}>
        <h3 className={styles.title}>Notes &amp; Activity</h3>
        <div className={styles.actions}>
          <small className={styles.meta}>
            {loading ? (
              <span className={styles.skeleton} style={{ width: 40 }} />
            ) : (
              countsLabel
            )}
          </small>
        </div>
      </header>

      {/* Live region for add/delete confirmations */}
      <div
        aria-live="polite"
        aria-atomic="true"
        ref={statusRef}
        className={styles.meta}
        style={{ minHeight: 0, fontSize: 12 }}
      >
        {statusMsg}
      </div>

      {/* Body */}
      {loading ? (
        <div className={styles.list} role="list" aria-label="Loading notes">
          <div className={styles.row} role="listitem">
            <span className={styles.skeleton} style={{ width: 320 }} />
          </div>
          <div className={styles.row} role="listitem">
            <span className={styles.skeleton} style={{ width: 260 }} />
          </div>
        </div>
      ) : error ? (
        <p className={styles.empty} role="alert">
          Unable to load notes. {String(error)}
        </p>
      ) : notes.length === 0 ? (
        <p className={styles.empty}>No notes yet. Start the thread below.</p>
      ) : (
        <ul
          className={styles.list}
          style={{ margin: 0, padding: 0, listStyle: 'none' }}
          aria-label="Notes"
        >
          {notes.map(n => (
            <li
              key={n.id || n.createdAtLabel || n.text.slice(0, 16)}
              className={styles.row}
            >
              <div style={{ display: 'grid', gap: 4 }}>
                <div
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {n.text}
                </div>
                <div className={styles.meta}>
                  {n.author ? <strong>{n.author}</strong> : '—'}
                  {n.createdAtLabel ? ` • ${n.createdAtLabel}` : ''}
                </div>
              </div>
              {onDelete && (
                <div className={styles.actions}>
                  <button
                    className="btn small outline"
                    onClick={async () => {
                      if (busy) return
                      setBusy(true)
                      try {
                        await onDelete(n)
                        setStatusMsg('Note deleted.')
                      } finally {
                        setBusy(false)
                      }
                    }}
                    aria-label="Delete note"
                    title="Delete note"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Composer */}
      <div className={styles.actions} style={{ alignItems: 'end' }}>
        <label style={{ flex: 1, display: 'grid', gap: 6 }}>
          <span className={styles.meta}>New note</span>
          <textarea
            rows={3}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add a note… (⌘/Ctrl + Enter to save)"
            aria-label="Add a note"
            aria-invalid={tooLong || undefined}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              border: '1px solid var(--cd-border)',
              resize: 'vertical',
              minHeight: 64,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <small className={styles.meta}>
              {tooLong ? (
                <span style={{ color: '#b91c1c' }}>
                  {remaining * -1} over limit
                </span>
              ) : (
                `${remaining} characters left`
              )}
            </small>
            <small className={styles.meta}>Press ⌘/Ctrl + Enter to save</small>
          </div>
        </label>
        <button className="btn" onClick={handleAdd} disabled={!canSubmit}>
          {busy ? 'Saving…' : 'Add'}
        </button>
      </div>
    </section>
  )
}

CompanyNotesCard.propTypes = {
  /** Notes to display, most-recent-first recommended */
  notes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      text: PropTypes.string.isRequired,
      author: PropTypes.string,
      createdAtLabel: PropTypes.string,
    })
  ),
  /** Loading state for skeletons */
  loading: PropTypes.bool,
  /** Optional error message for error state */
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  /** Add handler (receives the note text) */
  onAdd: PropTypes.func,
  /** Optional delete handler (receives the note object) */
  onDelete: PropTypes.func,
  /** Maximum characters allowed in the composer */
  maxLength: PropTypes.number,
}
