// src/admin/communications/components/MessageHistoryTable.jsx

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

import cls from './MessageHistoryTable.module.css'
import { listMessages } from '../services'

/* ----------------------------- small formatters ----------------------------- */
function toDate(value) {
  try {
    if (!value) return null
    return value?.toDate ? value.toDate() : new Date(value)
  } catch {
    return null
  }
}

function fmtWhen(value) {
  const d = toDate(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtChannels(chans) {
  if (!Array.isArray(chans) || chans.length === 0) return '—'
  return chans.join(', ')
}

function fmtAudience(seg) {
  if (!seg) return '—'
  const t = String(seg.type || '').toLowerCase()
  if (t === 'query') return seg.query?.kind || 'query'
  if (t === 'ids') return `IDs (${(seg.ids || []).length})`
  return t || '—'
}

/* -------------------------------- status pill ------------------------------- */
const STATUS_TO_KEY = {
  queued: 'queued',
  scheduled: 'scheduled',
  sending: 'sending',
  sent: 'sent',
  complete: 'sent',
  failed: 'failed',
  error: 'failed',
}

function StatusPill({ status }) {
  const key = STATUS_TO_KEY[String(status || '').toLowerCase()] || 'queued'
  const label = key
  return <span className={`${cls.pill} ${cls[`p_${key}`]}`}>{label}</span>
}

/* --------------------------------- component -------------------------------- */
function MessageHistoryTable({ take = 25 }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listMessages({ take })
      setRows(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(err || new Error('Failed to load messages'))
    } finally {
      setLoading(false)
    }
  }, [take])

  // initial + manual refresh
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await listMessages({ take })
        if (!alive) return
        setRows(Array.isArray(data) ? data : [])
        setError(null)
      } catch (err) {
        if (!alive) return
        setError(err || new Error('Failed to load messages'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [take, refreshTick])

  const empty = useMemo(
    () => !loading && !error && rows.length === 0,
    [loading, error, rows]
  )

  const onRefresh = useCallback(() => {
    // force re-run of effect (keeps code simple + testable)
    setRefreshTick(t => t + 1)
  }, [])

  return (
    <section className={cls.card} aria-labelledby="recent-messages-title">
      <header className={cls.cardHeader}>
        <h3 id="recent-messages-title" className={cls.cardTitle}>Recent Messages</h3>

        <div className={cls.headerActions}>
          <button
            type="button"
            className={cls.refresh}
            onClick={onRefresh}
            aria-label="Refresh list"
            title="Refresh"
            disabled={loading}
          >
            ↻
          </button>
        </div>
      </header>

      <div
        className={cls.table}
        role="table"
        aria-label="Recent messages"
        aria-busy={loading ? 'true' : 'false'}
      >
        <div className={`${cls.row} ${cls.head}`} role="row">
          <div className={cls.cell} role="columnheader">Subject</div>
          <div className={cls.cell} role="columnheader">Channels</div>
          <div className={cls.cell} role="columnheader">Audience</div>
          <div className={cls.cell} role="columnheader">When</div>
          <div className={cls.cell} role="columnheader">Status</div>
          <div className={`${cls.cell} ${cls.r}`} role="columnheader">Counts</div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className={cls.skelRow} role="row" aria-hidden="true">
              <div className={cls.skel} />
              <div className={cls.skel} />
              <div className={cls.skel} />
              <div className={cls.skel} />
              <div className={cls.skel} />
              <div className={cls.skel} />
            </div>
          ))
        )}

        {/* Error state */}
        {error && !loading && (
          <div className={cls.empty} role="row">
            <div className={cls.cell} role="cell" aria-live="assertive">
              Couldn’t load messages.{' '}
              <button type="button" className={cls.linkBtn} onClick={fetchRows}>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {empty && (
          <div className={cls.empty} role="row">
            <div className={cls.cell} role="cell">No messages yet.</div>
          </div>
        )}

        {/* Rows */}
        {!loading && !error && rows.map((m) => {
          const ch = fmtChannels(m.channels)
          const seg = fmtAudience(m.segment)
          const when = m.scheduleAt || m.createdAt
          const titleWhen = toDate(when)?.toLocaleString() || ''
          const targeted = m.counts?.targeted ?? 0
          const sent = m.counts?.sent ?? 0
          const failed = m.counts?.failed ?? 0

          return (
            <div key={m.id} className={cls.row} role="row">
              <div className={cls.cell} role="cell" title={m.subject || '(no subject)'}>
                {m.subject || <i>(no subject)</i>}
              </div>
              <div className={cls.cell} role="cell">{ch}</div>
              <div className={cls.cell} role="cell">{seg}</div>
              <div className={cls.cell} role="cell" title={titleWhen}>{fmtWhen(when)}</div>
              <div className={cls.cell} role="cell"><StatusPill status={m.status} /></div>
              <div className={`${cls.cell} ${cls.r}`} role="cell">
                <span className={cls.counts} title={`sent / targeted (failed: ${failed})`}>
                  {sent}/{targeted}{failed ? ` • ${failed} failed` : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

MessageHistoryTable.propTypes = {
  take: PropTypes.number,
}

export default memo(MessageHistoryTable)