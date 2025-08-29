// src/admin/reports/components/SubmitToTPRDialog.jsx
// ======================================================================
// SubmitToTPRDialog
// - Confirm-first flow with optional live progress
// - Results mode when a `result` object is provided
// - A11y: proper labelling, focus trap, Esc/overlay close (disabled while submitting)
// - Lean CSS usage; progress has inline fallback styles
// ======================================================================

import PropTypes from 'prop-types'
import React from 'react'
import { createPortal } from 'react-dom'

import styles from './SubmitToTPRDialog.module.css'

export default function SubmitToTPRDialog({
  open,
  onClose,
  onConfirm,
  count = 1,
  isSubmitting: isSubmittingProp,
  summary,
  methodLabel = 'via Training Provider Registry',
  result, // when present => Results mode
  progress = null, // { processed, total, ok, failed } (optional)
}) {
  // Portal target
  const target =
    (typeof document !== 'undefined' &&
      document.getElementById('modal-root')) ||
    (typeof document !== 'undefined' && document.body) ||
    null

  const overlayRef = React.useRef(null)
  const panelRef = React.useRef(null)

  // Internal submitting state if parent is uncontrolled
  const [localSubmitting, setLocalSubmitting] = React.useState(false)
  const isSubmitting =
    typeof isSubmittingProp === 'boolean' ? isSubmittingProp : localSubmitting

  const isResultsMode = !!result
  const plural = count === 1 ? '' : 's'

  // Derived caution (confirm mode only)
  const caution =
    !isResultsMode &&
    (count >= 50
      ? 'This is a large submission and may take a moment.'
      : count >= 10
        ? 'This may take a few seconds.'
        : null)

  // Close helpers (block while submitting)
  const safeClose = React.useCallback(() => {
    if (!isSubmitting) onClose?.()
  }, [isSubmitting, onClose])

  // Async-aware confirm
  const handleConfirm = React.useCallback(async () => {
    if (!onConfirm) return
    try {
      const p = onConfirm()
      if (
        p &&
        typeof p.then === 'function' &&
        typeof isSubmittingProp !== 'boolean'
      ) {
        setLocalSubmitting(true)
        await p
        setLocalSubmitting(false)
      }
    } catch {
      if (typeof isSubmittingProp !== 'boolean') setLocalSubmitting(false)
      // Parent should toast on errors; keep dialog open for retry
    }
  }, [onConfirm, isSubmittingProp])

  // Backdrop click closes (unless submitting)
  const onBackdropMouseDown = e => {
    if (e.target === overlayRef.current) safeClose()
  }

  // ESC to close
  React.useEffect(() => {
    if (!open) return
    const onKey = e => {
      if (e.key === 'Escape') safeClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, safeClose])

  // Focus trap + initial focus
  React.useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current
    const sel =
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    const getFocusables = () =>
      Array.from(panel.querySelectorAll(sel)).filter(
        n => !n.hasAttribute('disabled')
      )
    const focusables = getFocusables()
    focusables[0]?.focus({ preventScroll: true })

    const trap = e => {
      if (e.key !== 'Tab') return
      const f = getFocusables()
      if (!f.length) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = f[0],
        last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', trap)
    return () => panel.removeEventListener('keydown', trap)
  }, [open])

  // IDs for a11y
  const titleId = React.useId()
  const descId = React.useId()

  if (!open || !target) return null

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={onBackdropMouseDown}
      role="presentation"
    >
      <section
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={isSubmitting || undefined}
        tabIndex={-1}
      >
        {/* Header */}
        <header className={styles.header}>
          <h3 id={titleId} className={styles.title}>
            {isResultsMode ? 'Submission Results' : 'Submit to TPR'}
          </h3>
          <button
            type="button"
            aria-label="Close"
            onClick={safeClose}
            disabled={isSubmitting}
            className={styles.close}
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div id={descId} className={styles.body}>
          {isResultsMode ? (
            <ResultsBody result={result} />
          ) : (
            <ConfirmBody
              count={count}
              methodLabel={methodLabel}
              summary={summary}
              caution={caution}
              progress={isSubmitting ? progress : null}
            />
          )}
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={safeClose}
            disabled={isSubmitting}
          >
            {isResultsMode ? 'Close' : 'Cancel'}
          </button>

          {isResultsMode ? (
            <ResultsActions result={result} />
          ) : (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className={styles.spinnerWrap}>
                  <span className={styles.spinner} aria-hidden />
                  Submitting…
                </span>
              ) : (
                `Submit ${count} completion${plural}`
              )}
            </button>
          )}
        </footer>
      </section>
    </div>,
    target
  )
}

/* ------------------------------ Subsections ------------------------------ */

function ConfirmBody({ count, methodLabel, summary, caution, progress }) {
  const showProgress =
    !!progress && Number.isFinite(progress.total) && progress.total > 0
  const fraction = showProgress
    ? Math.max(0, Math.min(1, (progress.processed || 0) / progress.total))
    : 0

  return (
    <>
      <p className={styles.lead}>
        Submit <b>{count}</b> completion{count === 1 ? '' : 's'} {methodLabel}?
      </p>

      {summary ? (
        <div className={styles.summary}>{summary}</div>
      ) : (
        <ul className={styles.list}>
          <li>Trainee identity (name, DOB, CLP/CDL &amp; issuing state)</li>
          <li>
            Program details (Class/endorsements, Theory/BTW status, completion
            date)
          </li>
          <li>Provider info (name, TPR ID + required fields)</li>
        </ul>
      )}

      {caution && !showProgress && <p className={styles.caution}>{caution}</p>}

      {showProgress && (
        <div
          className={styles.progressWrap || ''}
          aria-live="polite"
          aria-label="Submission progress"
        >
          <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>
            {progress.processed}/{progress.total} processed • {progress.ok} ok •{' '}
            {progress.failed} failed
          </div>
          <div
            className={styles.progressBar || ''}
            style={{
              height: 8,
              borderRadius: 999,
              background: 'rgba(0,0,0,.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(fraction * 100)}%`,
                height: '100%',
                background: 'var(--brand-primary, #0b6aa2)',
                transition: 'width .25s ease',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

ConfirmBody.propTypes = {
  count: PropTypes.number.isRequired,
  methodLabel: PropTypes.string.isRequired,
  summary: PropTypes.node,
  caution: PropTypes.string,
  progress: PropTypes.shape({
    processed: PropTypes.number,
    total: PropTypes.number,
    ok: PropTypes.number,
    failed: PropTypes.number,
  }),
}

function ResultsBody({ result }) {
  const ok = !!result?.ok
  const msg =
    result?.message || (ok ? 'Submission completed.' : 'Submission failed.')
  const mode = result?.mode ? String(result.mode) : ''
  const count = Number.isFinite(result?.count)
    ? result.count
    : Number.isFinite(result?.total)
      ? result.total
      : undefined
  const failed = Number.isFinite(result?.failed) ? result.failed : undefined
  const warn = !ok || (failed && failed > 0)

  return (
    <>
      <div
        className={`${styles.resultBanner} ${warn ? styles.resultWarn : styles.resultOk}`}
        role="status"
        aria-live="polite"
      >
        <strong>{ok && !warn ? 'Success' : 'Completed with issues'}</strong>
        <span className={styles.resultMeta}>
          {mode ? ` • mode: ${mode}` : ''}
          {count != null ? ` • records: ${count}` : ''}
          {failed != null ? ` • failed: ${failed}` : ''}
        </span>
        <div className={styles.resultMsg}>{msg}</div>
      </div>

      {/* Always give a JSON peek for auditability */}
      <details className={styles.details}>
        <summary>View raw response</summary>
        <pre className={styles.pre} aria-label="Raw submission response">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </>
  )
}

ResultsBody.propTypes = { result: PropTypes.any }

function ResultsActions({ result }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result ?? {}, null, 2))
    } catch {}
  }
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(result ?? {}, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tpr-submission-result.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return (
    <>
      <button type="button" className={styles.btnGhost} onClick={handleCopy}>
        Copy JSON
      </button>
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={handleDownload}
      >
        Download JSON
      </button>
    </>
  )
}
ResultsActions.propTypes = { result: PropTypes.any }

/* -------------------------------- PropTypes ------------------------------ */

SubmitToTPRDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  count: PropTypes.number,
  isSubmitting: PropTypes.bool,
  summary: PropTypes.node,
  methodLabel: PropTypes.string,
  result: PropTypes.any,
  progress: PropTypes.shape({
    processed: PropTypes.number,
    total: PropTypes.number,
    ok: PropTypes.number,
    failed: PropTypes.number,
  }),
}
