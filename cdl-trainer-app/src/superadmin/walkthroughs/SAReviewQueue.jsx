// src/superadmin/walkthroughs/SAReviewQueue.jsx
// -----------------------------------------------------------------------------
// Superadmin • Review Queue
// - Lists submissions with filters
// - Click a row → SAReviewDetail
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { showToast } from '@utils/ui-helpers.js'
import { listSubmissions } from './saWalkthroughApi.js'
import styles from './saWalkthroughStyles.module.css'

const STATUS_OPTIONS = [
  { value: 'in-review', label: 'In Review', color: '#eab308' }, // amber
  { value: 'changes-requested', label: 'Changes Requested', color: '#ef4444' }, // red
  { value: 'approved', label: 'Approved', color: '#22c55e' }, // green
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
  { value: 'draft', label: 'Draft', color: '#9ca3af' },
]

const statusColorMap = STATUS_OPTIONS.reduce((m, s) => {
  m[s.value] = s.color
  return m
}, {})

/** Tolerant date parser for Firestore Timestamp | number | ISO string */
function toDate(x) {
  try {
    if (!x) return null
    if (typeof x === 'number') return new Date(x)
    if (typeof x === 'object' && typeof x.toDate === 'function') return x.toDate()
    return new Date(x)
  } catch {
    return null
  }
}

export default function SAReviewQueue() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [status, setStatus] = useState('in-review') // default
  const [schoolInput, setSchoolInput] = useState('') // raw text box
  const schoolId = useDebouncedValue(schoolInput.trim(), 250)

  const validStatus = useMemo(() => {
    if (!status) return '' // allow “All”
    const found = STATUS_OPTIONS.find(s => s.value === status)
    return found ? found.value : ''
  }, [status])

  // Fetch whenever filters change
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await listSubmissions({
          status: validStatus || undefined,
          schoolId: schoolId || undefined,
        })
        if (alive) setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('[SAReviewQueue] listSubmissions failed:', err)
        showToast('Failed to load submissions.', { type: 'error' })
        if (alive) setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [validStatus, schoolId])

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1>Walkthrough Review Queue</h1>

        <div className={styles.filters}>
          <label>
            Status:{' '}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="in-review">In Review</option>
              <option value="changes-requested">Changes Requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
              <option value="">All</option>
            </select>
          </label>

          <label>
            School:{' '}
            <input
              value={schoolInput}
              onChange={(e) => setSchoolInput(e.target.value)}
              placeholder="schoolId (optional)"
              inputMode="text"
              spellCheck={false}
              aria-label="Filter by school id"
            />
          </label>
        </div>
      </header>

      {loading ? (
        <div className={styles.placeholder} role="status" aria-live="polite">
          Loading submissions…
        </div>
      ) : !Array.isArray(rows) || rows.length === 0 ? (
        <div className={styles.placeholder}>No submissions match your filters.</div>
      ) : (
        <div className={styles.tableWrap || styles.wrap}>
          <table className={styles.table} role="table">
            <thead>
              <tr>
                <th>School</th>
                <th>Label</th>
                <th>Class</th>
                <th>Overlays</th>
                <th>Status</th>
                <th>Updated</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const dt =
                  toDate(s.updatedAt) ||
                  toDate(s.submittedAt) ||
                  new Date()
                const color = statusColorMap[s.status] || '#111827'
                const border = statusColorMap[s.status] || '#d1d5db'
                return (
                  <tr key={s.id}>
                    <td>{s.schoolId || '—'}</td>
                    <td>{s.label || '—'}</td>
                    <td>{s.classCode || '—'}</td>
                    <td>
                      {Array.isArray(s.overlays) && s.overlays.length
                        ? s.overlays.join(', ')
                        : '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: '#f3f4f6',
                          color,
                          border: `1px solid ${border}`,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.status || '—'}
                      </span>
                    </td>
                    <td>{dt ? dt.toLocaleString() : '—'}</td>
                    <td>
                      <Link
                        className={styles.link}
                        to={`/superadmin/walkthroughs/review/${s.id}`}
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Small debouncer hook (no external dep) */
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}