// src/superadmin/walkthroughs/SAReviewDetail.jsx
// -----------------------------------------------------------------------------
// Superadmin • Review Detail
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// Reuse Admin preview so the “student view” matches what admins see
import WalkthroughPreview from '@admin/walkthroughs/WalkthroughPreview.jsx'

// Prefer shared validator; fall back gracefully if export names differ
import * as WTValidate from '@walkthrough-utils/validateWalkthroughs.js'

import { showToast } from '@utils/ui-helpers.js'
import {
  getSubmission,
  approveAndPublish,
  requestChanges,
  rejectSubmission,
  getCurrentPublishedForToken,
} from './SaWalkthroughApi.js'

import styles from './saWalkthroughStyles.module.css'

// -----------------------------------------------------------------------------
// Fallback validator (only used if shared one isn't available)
// -----------------------------------------------------------------------------
function localValidate(w) {
  const errors = []
  if (!w) errors.push('Missing submission payload')
  if (w && !w.id) errors.push('Missing: id')
  if (w && !w.label) errors.push('Missing: label')
  if (w && !w.classCode) errors.push('Missing: classCode')
  if (!Array.isArray(w?.script)) errors.push('Script must be an array')
  return { ok: errors.length === 0, errors }
}

// Try a few common export names without exploding
function runValidation(w) {
  const fns = [
    WTValidate.validateWalkthroughShape,
    WTValidate.validateSingleWalkthrough,
    WTValidate.validateSingle,
    WTValidate.validate, // just in case
  ].filter(Boolean)
  try {
    if (fns.length) return fns[0](w)
  } catch (e) {
    console.warn('Shared validator threw; falling back:', e)
  }
  return localValidate(w)
}

function coerceDate(x) {
  try {
    if (!x) return null
    if (typeof x === 'number') return new Date(x)
    if (typeof x === 'object' && typeof x.toDate === 'function') return x.toDate()
    return new Date(x)
  } catch {
    return null
  }
}

export default function SAReviewDetail() {
  const { schoolId, submissionId } = useParams()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(null)

  // Load submission + current published for same token (if any)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        if (!schoolId || !submissionId) {
          setItem(null)
          return
        }
        const doc = await getSubmission({ schoolId, submissionId })
        if (!alive) return
        setItem(doc || null)

        if (doc?.token && doc?.schoolId) {
          const live = await getCurrentPublishedForToken(doc.schoolId, doc.token)
          if (alive) setPublished(live || null)
        } else if (alive) {
          setPublished(null)
        }
      } catch (err) {
        console.error('Failed to load submission:', err)
        showToast('Failed to load submission.', { type: 'error' })
        if (alive) setItem(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [schoolId, submissionId])

  const validation = useMemo(() => runValidation(item), [item])

  if (loading) {
    return <div className={styles.placeholder}>Loading submission…</div>
  }

  if (!item) {
    return (
      <div className={styles.placeholder}>
        Submission not found. <Link to="/superadmin/walkthroughs/review">Back to queue</Link>
      </div>
    )
  }

  async function onApprove() {
    if (!validation.ok) return
    setBusy(true)
    try {
      await approveAndPublish(item)
      showToast('Approved and published.', { type: 'success' })
      navigate('/superadmin/walkthroughs/review', { replace: true })
    } catch (err) {
      console.error(err)
      showToast('Publish failed. Try again.', { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function onRequestChanges() {
    const note = window.prompt('Describe required changes for the admin:')
    if (!note) return
    setBusy(true)
    try {
      await requestChanges({
        schoolId: item.schoolId,
        submissionId: item.id,
        note,
      })
      showToast('Requested changes sent to admin.', { type: 'success' })
      navigate('/superadmin/walkthroughs/review', { replace: true })
    } catch (err) {
      console.error(err)
      showToast('Could not send request. Try again.', { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function onReject() {
    if (!window.confirm('Reject this submission? This can’t be undone.')) return
    setBusy(true)
    try {
      await rejectSubmission({
        schoolId: item.schoolId,
        submissionId: item.id,
      })
      showToast('Submission rejected.', { type: 'success' })
      navigate('/superadmin/walkthroughs/review', { replace: true })
    } catch (err) {
      console.error(err)
      showToast('Reject failed. Try again.', { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const updated = coerceDate(published?.updatedAt)

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1>Review: {item.label}</h1>
          <p className={styles.meta}>
            School: <b>{item.schoolId || '—'}</b> • Class: <b>{item.classCode || '—'}</b> • Version:{' '}
            <b>{item.version ?? '—'}</b>
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={busy || !validation.ok}
            aria-disabled={busy || !validation.ok}
            onClick={onApprove}
            className={styles.primary}
          >
            Approve &amp; Publish
          </button>
          <button
            type="button"
            disabled={busy}
            aria-disabled={busy}
            onClick={onRequestChanges}
            className={styles.secondary}
          >
            Request Changes
          </button>
          <button
            type="button"
            disabled={busy}
            aria-disabled={busy}
            onClick={onReject}
            className={styles.danger}
          >
            Reject
          </button>
        </div>
      </header>

      {!validation.ok && (
        <div className={styles.alert} role="alert">
          <strong>Validation issues:</strong>
          <ul>{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {item.reviewNotes && (
        <div className={styles.noteBox}>
          <strong>Previous notes:</strong> {item.reviewNotes}
        </div>
      )}

      <WalkthroughPreview
        item={{
          id: item.id,
          label: item.label,
          classCode: item.classCode,
          token: item.token,
          script: item.script,
          version: item.version,
        }}
        onClose={() => {}}
      />

      {published && (
        <div className={styles.compareBox}>
          <strong>Current published for token “{item.token}”:</strong>{' '}
          <span>
            {published.label} (v{published.version})
            {updated ? ` — ${updated.toLocaleString()}` : ''}
          </span>
        </div>
      )}

      <footer className={styles.footer}>
        <Link to="/superadmin/walkthroughs/review">← Back to queue</Link>
      </footer>
    </div>
  )
}