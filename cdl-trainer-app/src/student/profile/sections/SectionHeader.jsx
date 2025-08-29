// Path: src/student/profile/sections/SectionHeader.jsx
// ============================================================================
// SectionHeader
// - Consistent title + status chip used across Profile sections
// - A11y-friendly: clear chip labels, polite live region
// - Defensive: accepts Firestore Timestamp | Date | ISO string for verifiedAt
// - Stable API used in all sections: { title, status, verifiedBy, verifiedAt }
// ============================================================================

import React, { useMemo } from 'react'

import { formatWhen } from './SectionHeader.helpers' // ✅ moved out to avoid fast-refresh rule
import styles from './sections.module.css'

/**
 * @typedef {'complete'|'pending-verify'|'missing'} SectionStatus
 */

/** Internal status normalization (accepts a few aliases) */
function normalizeStatus(v) {
  const s = String(v || '').toLowerCase()
  if (s === 'complete' || s === 'verified' || s === 'ok') return 'complete'
  if (s === 'pending-verify' || s === 'pending' || s === 'awaiting')
    return 'pending-verify'
  return 'missing'
}

/** Human labels used for the chip + screen readers (kept internal) */
const STATUS_LABELS = Object.freeze({
  complete: {
    text: '✅ Verified',
    aria: 'Section complete and verified',
    className: `${styles.chip} ${styles.chipOk}`,
  },
  'pending-verify': {
    text: '⏳ Awaiting verification',
    aria: 'Section awaiting staff verification',
    className: `${styles.chip} ${styles.chipPending}`,
  },
  missing: {
    text: '⚠ Missing info',
    aria: 'Section has missing information',
    className: `${styles.chip} ${styles.chipWarn}`,
  },
})

/**
 * SectionHeader
 * Displays a section title and a status chip with optional verification meta.
 *
 * @param {{
 *   title: string,
 *   status?: SectionStatus | string,
 *   verifiedBy?: string,
 *   verifiedAt?: any, // Date | Firestore Timestamp | ISO string
 *   className?: string
 * }} props
 */
export default function SectionHeader({
  title,
  status = 'missing',
  verifiedBy,
  verifiedAt,
  className = '',
}) {
  const s = useMemo(() => normalizeStatus(status), [status])
  const chip = STATUS_LABELS[s] || STATUS_LABELS.missing

  const meta =
    s === 'complete' && (verifiedBy || verifiedAt)
      ? `• ${verifiedBy ? `by ${verifiedBy} ` : ''}${formatWhen(verifiedAt)}`
      : ''

  return (
    <div className={`${styles.sectionHeader} ${className}`} data-status={s}>
      <h3 className={styles.sectionTitle}>{title}</h3>

      <div className={styles.sectionMeta}>
        <span
          className={chip.className}
          aria-label={chip.aria}
          aria-live="polite"
        >
          {chip.text}
        </span>
        {meta && <span className={styles.sectionSubtle}>{meta}</span>}
      </div>
    </div>
  )
}
