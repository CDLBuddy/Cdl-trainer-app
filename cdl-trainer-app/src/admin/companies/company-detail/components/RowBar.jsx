// Path: /src/admin/companies/company-detail/components/RowBar.jsx
import PropTypes from 'prop-types'
import React, { memo } from 'react'

import styles from './RowBar.module.css'

function RowBar({ label, value, alt = false }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className={styles.wrap}>
      <small className={styles.label}>{label}</small>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`${label} readiness ${clamped}%`}
        className={`${styles.track} ${alt ? styles.alt : ''}`}
        title={`${label}: ${clamped}%`}
      >
        <div className={styles.fill} style={{ width: `${clamped}%` }} />
      </div>

      <small className={styles.value}>{clamped}%</small>
    </div>
  )
}

RowBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  alt: PropTypes.bool,
}

export default memo(RowBar)
