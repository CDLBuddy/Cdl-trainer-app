// Path: src/admin/companies/components/detail/CompanyOverviewCard.jsx
// ============================================================================
// CompanyOverviewCard
// - One-glance company summary with status/billing pills + KPIs
// - Graceful loading skeletons; neutral defaults
// - A11y-first semantics; tiny helpers local to file
// - Non-breaking: accepts a loose `company` + `stats` object
// ============================================================================

import PropTypes from 'prop-types'
import React, { useMemo } from 'react'

import styles from './CompanyCards.module.css'

function Pill({ tone = 'default', children, title }) {
  const palette =
    tone === 'success'
      ? { bg: '#ecfdf5', fg: '#065f46' }
      : tone === 'warn'
        ? { bg: '#fff7ed', fg: '#9a3412' }
        : tone === 'error'
          ? { bg: '#fef2f2', fg: '#991b1b' }
          : tone === 'muted'
            ? { bg: '#f3f4f6', fg: '#374151' }
            : { bg: '#eef2ff', fg: '#4338ca' }
  return (
    <span
      className={styles.meta}
      title={title}
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.fg}22`,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function modeLabel(mode) {
  const m = String(mode || '').toLowerCase()
  if (m === 'employer') return 'Employer-billed'
  if (m === 'individual' || m === 'student') return 'Student-paid'
  return '—'
}

export default function CompanyOverviewCard({ company, stats, loading }) {
  // company: { id?, name, status, billingMode } | null
  // stats:   { activeStudents, openEnrollments, lastActivityLabel } | null
  const name = company?.name || '(No name)'
  const status = company?.status || '—'
  const billingMode = company?.billingMode || '—'

  const statusTone = useMemo(() => {
    const s = String(status).toLowerCase()
    if (s === 'active') return 'success'
    if (s === 'paused' || s === 'pending') return 'muted'
    if (s === 'at-risk' || s === 'overdue') return 'warn'
    if (s === 'suspended' || s === 'inactive') return 'error'
    return 'muted'
  }, [status])

  const kpis = useMemo(
    () => ({
      active: stats?.activeStudents ?? 0,
      open: stats?.openEnrollments ?? 0,
      last: stats?.lastActivityLabel || '—',
    }),
    [stats]
  )

  return (
    <section
      className={styles.card}
      aria-label="Company overview"
      aria-busy={!!loading}
    >
      <header className={styles.header}>
        <h3 className={styles.title}>Overview</h3>

        {/* Status + Billing mode pills */}
        <div className={styles.actions} style={{ gap: 6 }}>
          {loading ? (
            <>
              <span className={styles.skeleton} style={{ width: 110 }} />
              <span className={styles.skeleton} style={{ width: 140 }} />
            </>
          ) : (
            <>
              <Pill tone={statusTone} title="Company status">
                {status}
              </Pill>
              <Pill tone="default" title="Default billing mode">
                {modeLabel(billingMode)}
              </Pill>
            </>
          )}
        </div>
      </header>

      {/* Name + optional ID */}
      <div className={styles.meta} style={{ marginTop: -6, marginBottom: 2 }}>
        {loading ? (
          <span className={styles.skeleton} style={{ width: 180 }} />
        ) : (
          <>
            <strong>{name}</strong>
            {company?.id ? (
              <>
                {' '}
                • <span className={styles.meta}>ID: {company.id}</span>
              </>
            ) : null}
          </>
        )}
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Active Students</div>
          <div className={styles.kpiValue}>
            {loading ? (
              <span className={styles.skeleton} style={{ width: 28 }} />
            ) : (
              kpis.active
            )}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Open Enrollments</div>
          <div className={styles.kpiValue}>
            {loading ? (
              <span className={styles.skeleton} style={{ width: 28 }} />
            ) : (
              kpis.open
            )}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Last Activity</div>
          <div className={styles.kpiValue}>
            {loading ? (
              <span className={styles.skeleton} style={{ width: 120 }} />
            ) : (
              kpis.last
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

CompanyOverviewCard.propTypes = {
  company: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.string,
    billingMode: PropTypes.string,
  }),
  stats: PropTypes.shape({
    activeStudents: PropTypes.number,
    openEnrollments: PropTypes.number,
    lastActivityLabel: PropTypes.string,
  }),
  loading: PropTypes.bool,
}
