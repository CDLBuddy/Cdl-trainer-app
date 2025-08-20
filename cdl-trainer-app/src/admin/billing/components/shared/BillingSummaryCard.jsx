// Path: src/admin/billing/components/shared/BillingSummaryCard.jsx
// ============================================================================
// BillingSummaryCard (shared)
// - Compact, reusable billing snapshot for Company detail drawers/pages
// - Uses PUBLIC bridge: useBillingSummary (no direct API/service imports)
// - Accessible, resilient, and safe to embed anywhere in admin
// ============================================================================

import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { useBillingSummary } from '../../bridges'
import styles from './BillingSummaryCard.module.css'

const MODE_OPTIONS = [
  { value: 'employer', label: 'Employer-billed' },
  { value: 'student',  label: 'Student-paid' },
]

const BillingSummaryCard = memo(function BillingSummaryCard({
  schoolId,
  companyId,
  onOpenBilling,
  className = '',
  title = 'Billing',
  showOpenButton = true,
}) {
  // Bridge returns a safe, normalized shape
  const { summary, setBillingMode, loading, error } = useBillingSummary({ schoolId, companyId })

  const handleOpen = () => {
    if (onOpenBilling) onOpenBilling({ schoolId, companyId })
  }

  // --- Render states ---------------------------------------------------------
  if (loading) {
    return (
      <div className={`${styles.card} ${className}`.trim()} role="region" aria-label="Billing summary" aria-busy="true">
        <header className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.mode}>
            <span className={styles.skeleton} style={{ width: 140 }} />
          </div>
        </header>
        <ul className={styles.kpis}>
          <li><span>Balance</span><strong className={styles.skeleton}>$0</strong></li>
          <li><span>Open Invoices</span><strong className={styles.skeleton}>0</strong></li>
          <li><span>Last Payment</span><strong className={styles.skeleton}>—</strong></li>
        </ul>
        {showOpenButton && (
          <div className={styles.actions}>
            <button className="btn" disabled>Open in Billing</button>
          </div>
        )}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={`${styles.card} ${className}`.trim()} role="region" aria-label="Billing summary">
        <header className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
        </header>
        <p className={styles.empty}>
          {error ? 'Unable to load billing data.' : 'No billing data.'}
          {' '}
          <small className={styles.muted}>
            {error ? String(error) : 'Configure billing to see a summary.'}
          </small>
        </p>
        {showOpenButton && (
          <div className={styles.actions}>
            <button className="btn" onClick={handleOpen}>Open in Billing</button>
          </div>
        )}
      </div>
    )
  }

  // --- Normal render ---------------------------------------------------------
  return (
    <div className={`${styles.card} ${className}`.trim()} role="region" aria-label="Billing summary">
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>

        <label className={styles.mode}>
          <span className={styles.modeLabel}>Mode</span>
          <select
            className={styles.modeSelect}
            value={summary.mode}
            onChange={e => setBillingMode?.(e.target.value)}
            aria-label="Billing mode"
          >
            {MODE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </header>

      <ul className={styles.kpis}>
        <li>
          <span>Balance</span>
          <strong>{summary.balanceLabel}</strong>
        </li>
        <li>
          <span>Open Invoices</span>
          <strong>{Number(summary.openInvoices || 0)}</strong>
        </li>
        <li>
          <span>Last Payment</span>
          <strong>{summary.lastPaymentLabel || '—'}</strong>
        </li>
      </ul>

      {showOpenButton && (
        <div className={styles.actions}>
          <button type="button" className="btn" onClick={handleOpen}>
            Open in Billing
          </button>
          {/* Optional deep link (kept subtle, useful in drawers) */}
          <Link className={`btn outline ${styles.secondaryLink}`} to={`/admin/billing?${new URLSearchParams({
            ...(schoolId ? { schoolId } : {}),
            ...(companyId ? { companyId } : {}),
          }).toString()}`}>
            Full view
          </Link>
        </div>
      )}
    </div>
  )
})

BillingSummaryCard.propTypes = {
  schoolId: PropTypes.string,
  companyId: PropTypes.string,
  onOpenBilling: PropTypes.func,     // ({ schoolId?, companyId? }) => void
  className: PropTypes.string,
  title: PropTypes.string,
  showOpenButton: PropTypes.bool,
}

export default BillingSummaryCard