// Path: src/admin/dashboard/components/BillingSummary.jsx
// ============================================================================
// BillingSummary (dashboard widget)
// - Thin, read-only KPIs sourced from Billing’s PUBLIC surface (no internals)
// - Graceful loading/empty states with minimal layout shift
// - Accessible semantics + keyboard-friendly actions
// - Deep workflows live in /admin/billing (linked with optional filters)
// ============================================================================

import React, { memo, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import styles from './BillingSummary.module.css'
import { useBillingSummary } from '@admin/billing' // public surface

// --- local helpers -----------------------------------------------------------
function formatCurrencyCents(cents = 0, opts = {}) {
  const dollars = (Number(cents) || 0) / 100
  return dollars.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    ...opts,
  })
}

function buildBillingHref({ schoolId, companyId } = {}) {
  const params = new URLSearchParams()
  if (schoolId) params.set('schoolId', schoolId)
  if (companyId) params.set('companyId', companyId)
  const qs = params.toString()
  return `/admin/billing${qs ? `?${qs}` : ''}`
}

// --- component ---------------------------------------------------------------
const BillingSummary = memo(function BillingSummary({
  schoolId,
  companyId = null,
  className = '',
  title = 'Billing',
  compact = false, // if true, shows only the KPI row
}) {
  // Public, stable shape: { summary: { mode, balance, balanceLabel, openInvoices, lastPaymentLabel }, loading }
  const { summary, loading } = useBillingSummary({ schoolId, mode: 'employer' })

  // Local "fake" refresh: visual feedback only. Real data refresh occurs in Billing.
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = () => {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 650)
  }

  const kpis = useMemo(() => {
    if (!summary) {
      return {
        openInvoices: 0,
        openAmountLabel: formatCurrencyCents(0),
        lastPaymentLabel: '—',
        overdueCount: 0, // detailed overdue lives in Billing page
        overdueAmountLabel: formatCurrencyCents(0),
      }
    }
    return {
      openInvoices: Number(summary.openInvoices || 0),
      openAmountLabel:
        summary.balanceLabel || formatCurrencyCents(summary.balance || 0),
      lastPaymentLabel: summary.lastPaymentLabel || '—',
      overdueCount: 0,
      overdueAmountLabel: formatCurrencyCents(0),
    }
  }, [summary])

  const busy = loading || refreshing
  const billingHref = buildBillingHref({ schoolId, companyId })

  return (
    <section
      className={`${styles.card} ${className}`.trim()}
      aria-label="Billing summary"
      aria-busy={busy}
      data-testid="dashboard-billing-summary"
    >
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn outline"
            onClick={onRefresh}
            disabled={busy}
            title="Refresh billing snapshot"
          >
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link className="btn" to={billingHref}>
            Open Billing
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className={styles.kpis} aria-live="polite">
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Open Invoices</div>
          <div className={styles.kpiValue}>
            {busy ? <span className={styles.skeleton}>00</span> : kpis.openInvoices}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Open Amount</div>
          <div className={styles.kpiValue}>
            {busy ? (
              <span className={styles.skeleton}>$0,000</span>
            ) : (
              kpis.openAmountLabel
            )}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Last Payment</div>
          <div className={styles.kpiValue}>
            {busy ? <span className={styles.skeleton}>—</span> : kpis.lastPaymentLabel}
          </div>
        </div>
        <div
          className={styles.kpi}
          title="Detailed overdue metrics available in Billing"
        >
          <div className={styles.kpiLabel}>Overdue</div>
          <div className={`${styles.kpiValue} ${styles.muted}`}>
            {busy ? (
              <span className={styles.skeleton}>0 / $0</span>
            ) : (
              <>
                {kpis.overdueCount} / {kpis.overdueAmountLabel}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compact mode hides preview blocks to keep dashboard tight */}
      {compact ? null : (
        <>
          {/* Overdue preview (read-only on dashboard) */}
          <div className={styles.block}>
            <div className={styles.blockHeader}>
              <strong>Overdue Invoices</strong>
              <Link className={styles.inlineLink} to={billingHref}>
                View all
              </Link>
            </div>
            <p className={styles.empty}>
              Overdue details live in <Link to={billingHref}>Billing</Link>.
            </p>
          </div>

          {/* Reconciliation preview (read-only on dashboard) */}
          <div className={styles.block}>
            <div className={styles.blockHeader}>
              <strong>Unreconciled Payments</strong>
              <Link className={styles.inlineLink} to={billingHref}>
                Review
              </Link>
            </div>
            <p className={styles.empty}>
              Reconciliation is managed in <Link to={billingHref}>Billing</Link>.
            </p>
          </div>
        </>
      )}
    </section>
  )
})

BillingSummary.propTypes = {
  schoolId: PropTypes.string,
  companyId: PropTypes.string,
  className: PropTypes.string,
  title: PropTypes.string,
  compact: PropTypes.bool,
}

export default BillingSummary