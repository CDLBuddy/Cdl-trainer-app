// src/student/dashboard/components/KpiCard.jsx
import PropTypes from 'prop-types'
import React, { memo, useId, useMemo } from 'react'

import cls from './KpiCard.module.css'

/**
 * KPI card with optional progress visualization.
 *
 * Props:
 *  - title (string)
 *  - value (number|string|null)  // numeric shows progress when showBar=true
 *  - unit (string)               // default '%'
 *  - hint (string)
 *  - loading (bool)              // skeleton state
 *  - showBar (bool)              // default true when value is a finite number
 *  - min (number)                // clamp lower bound for progress (default 0)
 *  - max (number)                // clamp upper bound for progress (default 100)
 *  - decimals (0|1|2|3)          // numeric display precision (default 0)
 *  - variant ('default'|'ok'|'warn'|'info') // visual accent
 */
function KpiCard({
  title,
  value,
  unit = '%',
  hint,
  loading = false,
  showBar,
  min = 0,
  max = 100,
  decimals = 0,
  variant = 'default',
}) {
  const titleId = useId()
  const hintId = hint ? `${titleId}-hint` : undefined

  const { isNumber, displayValue, pct, shouldShowBar } = useMemo(() => {
    const isNum = Number.isFinite(value)
    const clamped = isNum ? Math.max(min, Math.min(max, Number(value))) : null
    const range = Math.max(1e-9, max - min)
    const percent = isNum ? Math.round(((clamped - min) / range) * 100) : null
    const formatted = isNum
      ? Number(value).toFixed(Math.min(3, Math.max(0, decimals)))
      : (value ?? '--')

    const show = typeof showBar === 'boolean' ? showBar : isNum // default behavior

    return {
      isNumber: isNum,
      displayValue: formatted,
      pct: percent,
      shouldShowBar: show,
    }
  }, [value, min, max, decimals, showBar])

  return (
    <article
      className={`${cls.kpiCard} ${cls[`v_${variant}`] || ''}`}
      aria-labelledby={titleId}
      aria-describedby={hintId}
      role="group"
    >
      <h3 id={titleId} className={cls.kpiTitle}>
        {title}
      </h3>

      <div className={cls.kpiValue} aria-live="polite">
        {loading ? <span className={cls.skelBlock} /> : displayValue}
        {!loading && unit && <span className={cls.kpiUnit}>{unit}</span>}
      </div>

      {!loading && shouldShowBar && isNumber && (
        <div
          className={cls.progressTrack}
          role="progressbar"
          aria-label={`${title} progress`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Number(value)}
          data-pct={pct}
        >
          <div className={cls.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      {hint && (
        <p id={hintId} className={cls.kpiHint}>
          {hint}
        </p>
      )}
    </article>
  )
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  unit: PropTypes.string,
  hint: PropTypes.string,
  loading: PropTypes.bool,
  showBar: PropTypes.bool,
  min: PropTypes.number,
  max: PropTypes.number,
  decimals: PropTypes.oneOf([0, 1, 2, 3]),
  variant: PropTypes.oneOf(['default', 'ok', 'warn', 'info']),
}

export default memo(KpiCard)
