// Path: src/admin/dashboard/components/ActivityFeed.jsx
// ============================================================================
// ActivityFeed
// - Dashboard widget showing recent actions/events
// - Accepts BOTH legacy items { actor, action, timestamp } and
//   new items { actor, message, date } from hooks/services.
// - Props:
//     items?: Array<{
//       id?: string;
//       actor?: string;
//       action?: string;         // legacy
//       message?: string;        // new
//       timestamp?: string|number|Date; // legacy
//       date?: string|number|Date;      // new
//       meta?: Record<string, any>;
//     }>
//     maxItems?: number                (default 10)
//     emptyText?: string               (default "No recent activity")
//     onItemClick?: (item) => void     (optional)
//     renderItem?: (item) => ReactNode (optional override)
//     showRelativeTime?: boolean       (default true)
// - A11y: region + list semantics, time titles, keyboard activation
// ============================================================================

import React, { memo, useMemo, useCallback } from 'react'

import styles from './ActivityFeed.module.css'

function toDate(value) {
  if (value instanceof Date) return value
  if (value == null) return new Date(NaN)
  const n = Number(value)
  return Number.isFinite(n) ? new Date(n) : new Date(String(value))
}

function formatTimeAbsolute(d) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return d.toLocaleString?.() || String(d)
  }
}

function formatTimeRelative(d) {
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    const ms = d.getTime() - Date.now()
    const mins = Math.round(ms / 60000)
    const hours = Math.round(ms / 3600000)
    const days = Math.round(ms / 86400000)
    if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
    return rtf.format(days, 'day')
  } catch {
    return formatTimeAbsolute(d)
  }
}

/** Normalize item to a common view model (does not mutate the original). */
function normalize(item, i) {
  const actor = item?.actor ?? 'Someone'
  const action = item?.action ?? item?.message ?? ''
  const when = item?.timestamp ?? item?.date
  const d = toDate(when)
  const id =
    item?.id ??
    `${String(actor)}-${String(action).slice(0, 24)}-${Number.isFinite(d.getTime()) ? d.getTime() : i}`

  return { id, actor, action, date: d, raw: item }
}

function ActivityFeed({
  items = [],
  maxItems = 10,
  emptyText = 'No recent activity',
  onItemClick,
  renderItem,
  showRelativeTime = true,
}) {
  const list = useMemo(() => {
    const arr = Array.isArray(items) ? items : []
    const norm = arr.map(normalize)
    norm.sort((a, b) => {
      const ta = a.date.getTime()
      const tb = b.date.getTime()
      const fa = Number.isFinite(ta) ? 1 : 0
      const fb = Number.isFinite(tb) ? 1 : 0
      // valid dates first, then newest → oldest
      return fb - fa || tb - ta
    })
    return norm.slice(0, Math.max(0, maxItems | 0))
  }, [items, maxItems])

  const handleActivate = useCallback(
    (e, item) => {
      if (typeof onItemClick !== 'function') return
      if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onItemClick(item.raw ?? item)
      }
    },
    [onItemClick]
  )

  return (
    <section className={styles.feed} aria-label="Recent activity">
      <header className={styles.header}>
        <h3 className={styles.title}>Activity Feed</h3>
      </header>

      {list.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {list.map(item => {
            const isValidDate = Number.isFinite(item.date.getTime())
            const absolute = isValidDate ? formatTimeAbsolute(item.date) : ''
            const relative = isValidDate ? formatTimeRelative(item.date) : ''
            const timeLabel = showRelativeTime && relative ? relative : absolute

            // Escape hatch for a completely custom row renderer
            if (typeof renderItem === 'function') {
              return (
                <li key={item.id} className={styles.item}>
                  {renderItem(item.raw)}
                </li>
              )
            }

            const interactive = typeof onItemClick === 'function'

            return (
              <li key={item.id} className={styles.item}>
                <div className={styles.meta}>
                  <span className={styles.actor}>{item.actor}</span>
                  <span className={styles.action}>{item.action}</span>
                </div>

                {timeLabel && (
                  <time
                    className={styles.time}
                    dateTime={isValidDate ? item.date.toISOString() : undefined}
                    title={absolute}
                    aria-label={absolute ? `at ${absolute}` : undefined}
                  >
                    {timeLabel}
                  </time>
                )}

                {interactive && (
                  <button
                    type="button"
                    className={styles.itemBtn}
                    onClick={e => handleActivate(e, item)}
                    onKeyDown={e => handleActivate(e, item)}
                    aria-label="Open activity detail"
                  >
                    ↗
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default memo(ActivityFeed)
