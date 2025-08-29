// Path: src/admin/dashboard/components/AlertsCard.jsx
// ============================================================================
// AlertsCard
// - Dashboard widget to display system or user alerts
// - Self-contained; style via AlertsCard.module.css
// - Props:
//     alerts?: Array<{ id?:string; type?:'info'|'warning'|'error'|'success';
//                      message:string; timestamp?:string|number|Date }>
//     title?: string
//     emptyText?: string
//     maxVisible?: number (default 5)
// ============================================================================

import React, { memo, useMemo } from 'react'

import styles from './AlertsCard.module.css'

function toDate(value) {
  if (value instanceof Date) return value
  const n = Number(value)
  return Number.isFinite(n) ? new Date(n) : new Date(String(value || ''))
}

function AlertsCard({
  alerts = [],
  title = 'Alerts',
  emptyText = 'No alerts available',
  maxVisible = 5,
}) {
  const visible = useMemo(() => {
    const arr = Array.isArray(alerts) ? alerts : []
    return arr.slice(0, maxVisible)
  }, [alerts, maxVisible])

  return (
    <section className={styles.card} aria-label="Alerts">
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
      </header>

      {visible.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((alert, i) => {
            const key = alert.id ?? `alert-${i}`
            const d = toDate(alert.timestamp)
            const dateLabel = Number.isFinite(d.getTime())
              ? d.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null
            const type = alert.type ?? 'info'
            return (
              <li key={key} className={`${styles.item} ${styles[type]}`}>
                <span className={styles.icon} aria-hidden="true" />
                <span className={styles.message}>{alert.message}</span>
                {dateLabel && (
                  <time className={styles.time} dateTime={d.toISOString()}>
                    {dateLabel}
                  </time>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default memo(AlertsCard)
