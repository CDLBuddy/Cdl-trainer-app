// Path: src/admin/billing/components/StatusPill.jsx
import PropTypes from 'prop-types'
import React, { forwardRef, memo } from 'react'

import { getAllowedStatuses } from './statusMap.js'
import styles from './StatusPill.module.css'

/** Normalize incoming value -> canonical token (tolerates common aliases). */
function normalize(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return ''
  const map = {
    // employer
    unpaid: 'unpaid',
    partial: 'partial',
    paid: 'paid',
    // individual
    pending: 'pending',
    waived: 'waived',
    // friendly aliases
    'partially paid': 'partial',
    'incomplete': 'pending',
    'not paid': 'unpaid',
    'fully paid': 'paid',
  }
  return map[v] || v
}

/** Minimal class joiner (no deps). */
function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * StatusPill
 * Back-compat props: { value, individual }
 * Extras:
 *  - size: "sm" | "md" (default "sm")
 *  - title: custom tooltip
 *  - className: external classes to merge
 *  - as: render tag (default "span")
 *  - showDot: decorative dot at left
 *  - ariaLive: 'off' | 'polite' | 'assertive' (default 'off')
 *  - scope: 'employer' | 'individual' (optional explicit override for `individual` boolean)
 *  - children: optional custom label; if provided, replaces auto label
 */
const StatusPill = forwardRef(function StatusPill(
  {
    value,
    individual = false,
    scope,                 // optional explicit scope wins over boolean
    size = 'sm',
    title,
    className = '',
    as: As = 'span',
    showDot = false,
    ariaLive = 'off',
    children,              // optional custom content
    ...rest
  },
  ref
) {
  const canonical = normalize(value)
  const isIndividual = scope ? scope === 'individual' : Boolean(individual)
  const allowed = getAllowedStatuses(isIndividual)
  const isKnown = canonical && allowed.includes(canonical)
  const autoLabel = canonical || '—'
  const label = children ?? autoLabel

  const sizeClass = size === 'md' ? styles.md : styles.sm
  const statusClass = isKnown ? styles[canonical] : styles.unknown
  const pillClass = cx(styles.pill, sizeClass, statusClass, className)

  return (
    <As
      ref={ref}
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
      aria-label={typeof label === 'string' ? `Status: ${label}` : undefined}
      className={pillClass}
      title={title || (isKnown ? autoLabel : 'unknown')}
      data-scope={isIndividual ? 'individual' : 'employer'}
      data-status={canonical || 'unknown'}
      {...rest}
    >
      {showDot && <span aria-hidden className={styles.dot} />}
      <span className={styles.text}>{label}</span>
    </As>
  )
})

StatusPill.propTypes = {
  value: PropTypes.any,
  individual: PropTypes.bool,
  scope: PropTypes.oneOf(['employer', 'individual']),
  size: PropTypes.oneOf(['sm', 'md']),
  title: PropTypes.string,
  className: PropTypes.string,
  as: PropTypes.elementType,
  showDot: PropTypes.bool,
  ariaLive: PropTypes.oneOf(['off', 'polite', 'assertive']),
  children: PropTypes.node,
}

export default memo(StatusPill)

/** Optional named export if you want to reuse the canonicalizer elsewhere. */
// Moved normalizeStatus export to normalizeStatus.js for Fast Refresh compatibility.