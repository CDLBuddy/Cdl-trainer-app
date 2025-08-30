//src/student/walkthrough/components/ProgressBar.jsx
import PropTypes from 'prop-types'
import React, { useId, useMemo } from 'react'
import styles from './ProgressBar.module.css'

export default function ProgressBar({ value, max = 4, label = 'Drill progress' }) {
  const titleId = useId()

  // Clamp and compute %
  const { v, m, pct } = useMemo(() => {
    const m = Math.max(1, Number(max) || 1)
    const v = Math.max(0, Math.min(m, Number(value) || 0))
    return { v, m, pct: Math.round((v / m) * 100) }
  }, [value, max])

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <strong id={titleId} className={styles.heading}>{label}</strong>
        <span className={styles.perc} aria-hidden>{pct}%</span>
      </div>

      {/* native element brings built-in semantics */}
      <progress
        value={v}
        max={m}
        className={styles.progress}
        aria-labelledby={titleId}
        aria-valuenow={v}
        aria-valuemax={m}
      />

      <span className={styles.caption}>
        {v}/{m} drills completed
      </span>
    </div>
  )
}

ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number,
  label: PropTypes.string,
}