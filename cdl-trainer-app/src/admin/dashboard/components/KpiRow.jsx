// Path: src/admin/dashboard/components/KpiRow.jsx
import React, { memo, useMemo } from 'react'

/**
 * KpiRow
 * --------------------------------------------------------------------------
 * Backward-compatible props:
 *   - styles (CSS module with .kpiRow, .kpiCard, .warn, .deltaUp, .deltaDown)
 *   - studentCount, instructorCount, adminCount, permitSoon, medSoon, incomplete
 *   - onStudentsClick, onInstructorsClick, onAdminsClick, onPermitSoonClick,
 *     onMedSoonClick, onIncompleteClick
 *
 * Enhancements:
 *   - `loading?: boolean` → shows skeletons instead of numbers
 *   - `density?: 'comfortable'|'compact'` → tighter card spacing in compact mode
 *   - `deltas?: Record<string, number>` → shows mini trend arrows (↑/↓) per KPI
 *     Example: { students: +4, permitSoon: -2 }
 *   - better ARIA labelling, test-friendly data attributes, defensive formatting
 */

function KpiRow({
  styles = {},
  // counts
  studentCount,
  instructorCount,
  adminCount,
  permitSoon,
  medSoon,
  incomplete,

  // optional trend deltas by key (e.g., { students: +3 })
  deltas = {},

  // a11y/UX
  loading = false,
  density = 'comfortable',

  // optional click handlers (promotes card → <button>)
  onStudentsClick,
  onInstructorsClick,
  onAdminsClick,
  onPermitSoonClick,
  onMedSoonClick,
  onIncompleteClick,
}) {
  const nf = useMemo(() => new Intl.NumberFormat(), [])

  const toNum = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  const format = (v) => nf.format(toNum(v))

  const spec = [
    {
      key: 'students',
      emoji: '👨‍🎓',
      label: 'Students',
      value: studentCount,
      warn: false,
      onClick: onStudentsClick,
      title: 'Total students',
    },
    {
      key: 'instructors',
      emoji: '👨‍🏫',
      label: 'Instructors',
      value: instructorCount,
      warn: false,
      onClick: onInstructorsClick,
      title: 'Total instructors',
    },
    {
      key: 'admins',
      emoji: '🛡️',
      label: 'Admins',
      value: adminCount,
      warn: false,
      onClick: onAdminsClick,
      title: 'Total admins',
    },
    {
      key: 'permitSoon',
      emoji: '🚨',
      label: 'Permit Soon',
      value: permitSoon,
      warn: true,
      onClick: onPermitSoonClick,
      title: 'Permits expiring in the next 30 days',
    },
    {
      key: 'medSoon',
      emoji: '🚨',
      label: 'Med Card Soon',
      value: medSoon,
      warn: true,
      onClick: onMedSoonClick,
      title: 'Medical cards expiring in the next 30 days',
    },
    {
      key: 'incomplete',
      emoji: '📝',
      label: 'Incomplete Profiles',
      value: incomplete,
      warn: false,
      onClick: onIncompleteClick,
      title: 'Profiles below 80% completion',
    },
  ]

  const rowClass =
    (styles.kpiRow || 'kpi-row') +
    (density === 'compact' ? ` ${styles.compact || 'kpi-row--compact'}` : '')

  return (
    <div
      className={rowClass}
      role="group"
      aria-label="Key metrics"
      aria-live="polite"
    >
      {spec.map(({ key, emoji, label, value, warn, onClick, title }) => {
        const Tag = typeof onClick === 'function' ? 'button' : 'div'
        const className = warn
          ? `${styles.kpiCard || 'kpi-card'} ${styles.warn || 'kpi-card--warn'}`
          : (styles.kpiCard || 'kpi-card')

        const delta = Number.isFinite(Number(deltas[key])) ? Number(deltas[key]) : null
        const isUp = typeof delta === 'number' && delta > 0
        const isDown = typeof delta === 'number' && delta < 0

        return (
          <Tag
            key={key}
            type={Tag === 'button' ? 'button' : undefined}
            className={className}
            data-kpi={key}
            title={title}
            onClick={onClick}
            // reset button appearance when clickable
            style={
              Tag === 'button'
                ? { textAlign: 'left', background: 'inherit', border: 'none', padding: 0, cursor: 'pointer' }
                : undefined
            }
            aria-label={
              loading
                ? `${label}: loading`
                : delta == null
                  ? `${label}: ${format(value)}`
                  : `${label}: ${format(value)} (${delta > 0 ? 'up' : delta < 0 ? 'down' : 'no change'})`
            }
          >
            <div className={styles.kpiHeader || 'kpi-card__header'}>
              <span aria-hidden style={{ marginRight: 6 }}>{emoji}</span>
              <b>{label}</b>
            </div>

            <div className={styles.kpiValue || 'kpi-card__value'}>
              {loading ? (
                <span className={styles.skeleton || 'skeleton'} aria-hidden />
              ) : (
                <span>{format(value)}</span>
              )}

              {/* Optional tiny delta */}
              {!loading && delta != null && delta !== 0 && (
                <span
                  className={
                    isUp
                      ? (styles.deltaUp || 'kpi-delta kpi-delta--up')
                      : (styles.deltaDown || 'kpi-delta kpi-delta--down')
                  }
                  data-delta={delta}
                >
                  <span aria-hidden>{isUp ? '↑' : '↓'}</span>
                  <span className="visually-hidden">
                    {isUp ? 'Increased by ' : 'Decreased by '}
                    {Math.abs(delta)}
                  </span>
                </span>
              )}
            </div>

            {/* Optional helper/description row (screen-reader friendly) */}
            <div className={styles.kpiHint || 'kpi-card__hint'}>
              <span className="visually-hidden">{title}</span>
            </div>
          </Tag>
        )
      })}
    </div>
  )
}

export default memo(KpiRow)