// Path: src/admin/companies/add-student/OverlayChips.jsx
import React, { memo, useMemo } from 'react'
import PropTypes from 'prop-types'
import styles from './OverlayChips.module.css'

/**
 * OverlayChips — render applied overlays as pill chips.
 *
 * Props:
 *  - overlays: string[] (default [])
 *  - className?: string  extra classes for container
 *  - ariaLabel?: string  accessibility label for the chip list
 */
function OverlayChips({ overlays = [], className = '', ariaLabel }) {
  // Normalize early: trim strings, drop empties, dedupe (stable order)
  const items = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const raw of overlays) {
      const v = String(raw ?? '').trim()
      if (!v || seen.has(v)) continue
      seen.add(v)
      out.push(v)
    }
    return out
  }, [overlays])

  if (items.length === 0) {
    return (
      <span className={styles.hint} role="status" aria-live="polite">
        (none)
      </span>
    )
  }

  return (
    <ul
      className={[styles.chips, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel || 'Assigned overlays'}
    >
      {items.map((o) => (
        <li key={o} className={styles.chip} title={o}>
          <span className={styles.chipText}>{o}</span>
        </li>
      ))}
    </ul>
  )
}

OverlayChips.propTypes = {
  overlays: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
}

export default memo(OverlayChips)