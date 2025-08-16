// Path: /src/superadmin/walkthroughs/SAReviewDetail.jsx
// -----------------------------------------------------------------------------
// Superadmin • Review Detail
// - Loads a specific submission by :submissionId
// - Validates, previews (reuses Admin WalkthroughPreview), and publishes
// - Actions: Approve & Publish, Request Changes (note), Reject
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import WalkthroughPreview from '@admin/walkthroughs/WalkthroughPreview.jsx'
import { validateWalkthroughShape } from '@walkthrough-utils'
import {
  getSubmission,
  approveAndPublish,
  requestChanges,
  rejectSubmission,
  getCurrentPublishedForToken,
} from './saWalkthroughApi.js'
import styles from './saWalkthroughStyles.module.css'

export default function SAReviewDetail() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(null) // current live for diff context

  useEffect(() => {
    let alive = true
    setLoading(true)
    getSubmission(submissionId).then(async (doc) => {
      if (!alive) return
      setItem(doc)
      if (doc?.token) {
        const live = await getCurrentPublishedForToken(doc.schoolId, doc.token)
        if (alive) setPublished(live)
      }
    }).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [submissionId])

  const validation = useMemo(() => {
    if (!item) return { ok: false, errors: ['Missing submission'] }
    return validateWalkthroughShape({
      id: item.id,
      classCode: item.classCode,
      label: item.label,
      sections: item.script,
    })
  }, [item])

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

  const approve = async () => {
    setBusy(true)
    try {
      await approveAndPublish(item)
      navigate('/superadmin/walkthroughs/review', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const askChanges = async () => {
    const note = window.prompt('Describe required changes for the admin:')
    if (!note) return
    setBusy(true)
    try {
      await requestChanges(item.id, note)
      navigate('/superadmin/walkthroughs/review', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const reject = async () => {
    if (!window.confirm('Reject this submission? This can’t be undone.')) return
    setBusy(true)
    try {
      await rejectSubmission(item.id)
      navigate('/superadmin/walkthroughs/review', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1>Review: {item.label}</h1>
          <p className={styles.meta}>
            School: <b>{item.schoolId || '—'}</b> • Class: <b>{item.classCode}</b> • Version: <b>{item.version}</b>
          </p>
        </div>
        <div className={styles.actions}>
          <button disabled={busy || !validation.ok} onClick={approve} className={styles.primary}>
            Approve & Publish
          </button>
          <button disabled={busy} onClick={askChanges} className={styles.secondary}>
            Request Changes
          </button>
          <button disabled={busy} onClick={reject} className={styles.danger}>
            Reject
          </button>
        </div>
      </header>

      {!validation.ok && (
        <div className={styles.alert}>
          <strong>Validation issues:</strong>
          <ul>{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {item.reviewNotes && (
        <div className={styles.noteBox}>
          <strong>Previous notes:</strong> {item.reviewNotes}
        </div>
      )}

      {/* Reuse the Admin preview so student view matches */}
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

      {/* Optional: show a light “current vs submission” context */}
      {published && (
        <div className={styles.compareBox}>
          <strong>Current published for token "{item.token}":</strong>{' '}
          <span>{published.label} (v{published.version}) — {new Date(published.updatedAt).toLocaleString()}</span>
        </div>
      )}

      <footer className={styles.footer}>
        <Link to="/superadmin/walkthroughs/review">← Back to queue</Link>
      </footer>
    </div>
  )
}