import React from 'react'
import styles from '../dashboard.module.css'

export default function KpiCard({ title, value, unit = '%', hint }) {
  const pct = typeof value === 'number' ? value : null
  return (
    <article className={styles.kpiCard}>
      <h3 className={styles.kpiTitle}>{title}</h3>
      <div className={styles.kpiValue}>
        {value}<span className={styles.kpiUnit}>{unit}</span>
      </div>
      {pct != null && (
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}
      {hint && <p className={styles.kpiHint}>{hint}</p>}
    </article>
  )
}