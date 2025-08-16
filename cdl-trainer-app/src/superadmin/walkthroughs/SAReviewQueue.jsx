// Path: /src/superadmin/walkthroughs/SAReviewQueue.jsx
// -----------------------------------------------------------------------------
// Superadmin • Review Queue
// - Lists submissions from schools in status: 'in-review' | 'changes-requested' | 'approved'
// - Filters by school, class, status
// - Click row → SAReviewDetail
// - Uses Firestore via saWalkthroughApi.js (replace with your real API later)
// -----------------------------------------------------------------------------

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSubmissions } from './saWalkthroughApi.js'
import styles from './saWalkthroughStyles.module.css'

const statusColors = {
  'in-review':    '#eab308', // amber
  'changes-requested': '#ef4444', // red
  approved:       '#22c55e', // green
  rejected:       '#ef4444',
  draft:          '#9ca3af',
}

export default function SAReviewQueue() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('in-review') // default filter
  const [schoolId, setSchoolId] = useState('')      // optional filter

  useEffect(() => {
    let alive = true
    setLoading(true)
    listSubmissions({ status, schoolId }).then((rows) => {
      if (alive) setItems(rows)
    }).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [status, schoolId])

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1>Walkthrough Review Queue</h1>
        <div className={styles.filters}>
          <label>
            Status:{' '}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="in-review">In Review</option>
              <option value="changes-requested">Changes Requested</option>
              <option value="approved">Approved</option>
              <option value="">All</option>
            </select>
          </label>
          <label>
            School:{' '}
            <input
              placeholder="schoolId (optional)"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            />
          </label>
        </div>
      </header>

      {loading ? (
        <div className={styles.placeholder}>Loading submissions…</div>
      ) : items.length === 0 ? (
        <div className={styles.placeholder}>No submissions match your filters.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>School</th>
              <th>Label</th>
              <th>Class</th>
              <th>Overlays</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.schoolId || '—'}</td>
                <td>{s.label}</td>
                <td>{s.classCode}</td>
                <td>{Array.isArray(s.overlays) && s.overlays.length ? s.overlays.join(', ') : '—'}</td>
                <td>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 6,
                      background: '#f3f4f6',
                      color: statusColors[s.status] || '#111827',
                      border: `1px solid ${statusColors[s.status] || '#d1d5db'}`,
                      fontSize: 12,
                    }}
                  >
                    {s.status}
                  </span>
                </td>
                <td>{new Date(s.updatedAt || s.submittedAt || Date.now()).toLocaleString()}</td>
                <td>
                  <Link className={styles.link} to={`/superadmin/walkthroughs/review/${s.id}`}>
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}