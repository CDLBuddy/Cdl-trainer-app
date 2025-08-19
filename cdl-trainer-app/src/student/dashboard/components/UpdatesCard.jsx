import React from 'react'
import styles from '../dashboard.module.css'

function formatDate(dateInput) {
  try {
    const d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

export default function UpdatesCard({ loading, error, update }) {
  return (
    <section className={styles.updateCard} aria-labelledby="whats-new-title">
      <div className={styles.updateHeader}>
        <span id="whats-new-title">📢 What’s New</span>
      </div>

      {loading ? (
        <div className={styles.updateBody} aria-busy="true">
          <div className={styles.updateSkeleton} />
          <div className={styles.updateSkeleton} style={{ width: '70%' }} />
        </div>
      ) : error ? (
        <div className={styles.updateBody}>
          <div className={styles.updateEmpty}>Couldn’t load updates. Try again later.</div>
        </div>
      ) : update ? (
        <div className={styles.updateBody}>
          <div className={styles.updateContent}>{update.content || '(No details)'}</div>
          <div className={styles.updateMeta}>{formatDate(update.date)}</div>
        </div>
      ) : (
        <div className={styles.updateBody}>
          <div className={styles.updateEmpty}>No recent updates.</div>
        </div>
      )}
    </section>
  )
}