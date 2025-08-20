// Path: src/admin/dashboard/components/ComplianceRadar.jsx
// ============================================================================
// ComplianceRadar
// - Pure-SVG radar/spider chart for quick compliance snapshot
// - Props:
//     title?: string
//     metrics?: Array<{ label: string, value: number }>  // 0..100
//     target?: number                                    // 0..100 guideline ring (default 100)
// - Notes:
//   • No external chart libs. Works with your theme tokens.
//   • Handles empty/degenerate input gracefully.
//   • Keyboard/AT-friendly with aria + fallback list.
// ============================================================================

import React, { memo, useMemo } from 'react'
import styles from './ComplianceRadar.module.css'

function clamp01(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

function toPolarPoints(values = [], size = 220, padding = 18) {
  // values are 0..1
  const cx = size / 2
  const cy = size / 2
  const rMax = (size / 2) - padding
  const n = values.length || 1
  const step = (Math.PI * 2) / n
  // Start at -90deg so first axis is up
  return values.map((t, i) => {
    const a = -Math.PI / 2 + i * step
    const r = rMax * clamp01(t)
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
}

function pathFromPoints(pts) {
  if (!pts.length) return ''
  const [x0, y0] = pts[0]
  return `M ${x0} ${y0} ` + pts.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z'
}

function ringPath(size = 220, padding = 18, frac = 1) {
  const cx = size / 2
  const cy = size / 2
  const r = ((size / 2) - padding) * clamp01(frac)
  return `M ${cx - r} ${cy}
          a ${r} ${r} 0 1 0 ${r * 2} 0
          a ${r} ${r} 0 1 0 -${r * 2} 0`
}

function axisLine(size = 220, padding = 18, i = 0, n = 1) {
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) - padding
  const a = -Math.PI / 2 + i * ((Math.PI * 2) / n)
  const x = cx + r * Math.cos(a)
  const y = cy + r * Math.sin(a)
  return `M ${cx} ${cy} L ${x} ${y}`
}

const DEFAULTS = [
  { label: 'TPR Registered', value: 82 },
  { label: 'Instructor Docs', value: 90 },
  { label: 'Student Records', value: 74 },
  { label: 'Permit + Med', value: 68 },
  { label: 'Hours Tracked', value: 76 },
  { label: 'Assessments', value: 71 },
  { label: 'TPR Reported', value: 64 },
  { label: '3yr Retention', value: 88 },
]

function ComplianceRadar({
  title = 'Compliance Snapshot',
  metrics = DEFAULTS,
  target = 100,
  size = 240,
  padding = 20,
}) {
  // Normalize to 0..1 for layout
  const vals01 = useMemo(
    () => (Array.isArray(metrics) ? metrics : [])
      .map(m => clamp01((Number(m?.value) || 0) / 100)),
    [metrics]
  )

  const points = useMemo(
    () => toPolarPoints(vals01, size, padding),
    [vals01, size, padding]
  )
  const polygonPath = useMemo(() => pathFromPoints(points), [points])

  const n = metrics?.length || 0
  const targetFrac = clamp01((Number(target) || 100) / 100)

  // Simple overall average for the header percentage
  const avg = useMemo(() => {
    if (!vals01.length) return 0
    return Math.round((vals01.reduce((a, b) => a + b, 0) / vals01.length) * 100)
  }, [vals01])

  return (
    <section
      className={styles.card}
      aria-label="Compliance snapshot"
      role="region"
      data-widget="compliance-radar"
    >
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.badge} aria-label={`Average compliance ${avg}%`}>
          {avg}%
        </div>
      </header>

      <div className={styles.chart} role="img" aria-label={`Radar chart with ${n} axes`}>
        {n === 0 ? (
          <div className={styles.empty}>No data</div>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size} ${size}`}
            preserveAspectRatio="xMidYMid meet"
            className={styles.svg}
          >
            {/* Rings (100%, 75%, 50%, 25%) */}
            {[1, 0.75, 0.5, 0.25].map((frac, i) => (
              <path
                key={i}
                d={ringPath(size, padding, frac)}
                className={styles.ring}
              />
            ))}

            {/* Target ring */}
            {targetFrac > 0 && targetFrac < 1 && (
              <path
                d={ringPath(size, padding, targetFrac)}
                className={styles.target}
              />
            )}

            {/* Axes */}
            {Array.from({ length: n }).map((_, i) => (
              <path key={i} d={axisLine(size, padding, i, n)} className={styles.axis} />
            ))}

            {/* Filled polygon */}
            <path d={polygonPath} className={styles.area} />

            {/* Vertices */}
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" className={styles.dot} />
            ))}
          </svg>
        )}
      </div>

      {/* Legend / fallback list for accessibility */}
      {n > 0 && (
        <ul className={styles.legend}>
          {metrics.map((m, i) => (
            <li key={i} className={styles.legendItem}>
              <span className={styles.legendSwatch} aria-hidden />
              <span className={styles.legendLabel}>{m.label}</span>
              <span className={styles.legendValue}>{Math.round(Number(m.value) || 0)}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default memo(ComplianceRadar)