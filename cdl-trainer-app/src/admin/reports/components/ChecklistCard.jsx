// src/admin/reports/components/ChecklistCard.jsx
// ======================================================================
// DOT/ELDT Compliance Checklist card
// - Themed to your dashboard (dark glass card, subtle accents)
// - Collapsible for long lists, with item counts
// - Keyboard/a11y friendly; no external deps
// - Download button shows busy state if onDownload returns a Promise
// ======================================================================

import PropTypes from 'prop-types'
import React from 'react'

import styles from './ChecklistCard.module.css'
import { DOT_CHECKLIST } from '../hooks/useChecklistPdf.js'

function ChecklistCard({
  onDownload,
  items = DOT_CHECKLIST,
  jurisdiction = 'Indiana',
  collapsed = true,
  initialVisible = 8,
  className = '',
}) {
  const [expanded, setExpanded] = React.useState(!collapsed)
  const [downloading, setDownloading] = React.useState(false)

  const safeItems = React.useMemo(
    () => (Array.isArray(items) ? items.filter(Boolean) : []),
    [items]
  )

  const visible = React.useMemo(
    () => (expanded ? safeItems : safeItems.slice(0, Math.max(0, initialVisible))),
    [expanded, safeItems, initialVisible]
  )

  const hasOverflow = safeItems.length > initialVisible

  const titleId = React.useId()
  const listId = React.useId()

  const handleDownload = React.useCallback(async () => {
    if (typeof onDownload !== 'function') return
    try {
      const maybe = onDownload()
      // If onDownload returns a Promise, show busy state until it resolves.
      if (maybe && typeof maybe.then === 'function') {
        setDownloading(true)
        await maybe
      }
    } finally {
      setDownloading(false)
    }
  }, [onDownload])

  return (
    <section
      className={`${styles.card} ${className}`}
      aria-labelledby={titleId}
      aria-describedby={listId}
      data-expanded={expanded ? 'true' : 'false'}
      data-count={safeItems.length}
    >
      {/* Header */}
      <div className={styles.cardHeader}>
        <div>
          <div id={titleId} className={styles.cardTitle}>
            📝 DOT/ELDT Compliance Checklist ({jurisdiction})
          </div>
          <div className={styles.muted} id={listId}>
            {safeItems.length} item{safeItems.length === 1 ? '' : 's'} • use this list to keep your provider audit-ready.
          </div>
        </div>

        <div className={styles.cardActions}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownload}
            aria-label={`Download ${jurisdiction} checklist as PDF (${safeItems.length} items)`}
            aria-busy={downloading || undefined}
            disabled={downloading}
          >
            {downloading ? 'Generating…' : '⬇️ Download PDF'}
          </button>
        </div>
      </div>

      {/* Body */}
      {safeItems.length === 0 ? (
        <div className={styles.muted} style={{ paddingTop: 6 }}>
          No checklist items configured.
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {visible.map((line, i) => (
              <li key={`chk-${i}`}>
                <span aria-hidden>☐ </span>{line}
              </li>
            ))}
          </ul>

          {/* Footer / controls */}
          <div className={styles.footerBar}>
            {hasOverflow && (
              <button
                type="button"
                className={`btn btn-ghost ${styles.toggleBtn}`}
                onClick={() => setExpanded(v => !v)}
                aria-expanded={expanded}
                aria-controls={listId}
              >
                {expanded ? 'Show less' : `Show all ${safeItems.length}`}
              </button>
            )}
            <span className={styles.tip}>
              Tip: export records first, then archive a signed copy with your submission.
            </span>
          </div>
        </>
      )}
    </section>
  )
}

ChecklistCard.propTypes = {
  onDownload: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.node])),
  jurisdiction: PropTypes.string,
  collapsed: PropTypes.bool,
  initialVisible: PropTypes.number,
  className: PropTypes.string,
}

export default React.memo(ChecklistCard)