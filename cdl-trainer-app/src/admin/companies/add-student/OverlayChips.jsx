// Path: src/admin/companies/add-student/OverlayChips.jsx
import React from 'react'
import styles from './AddStudentDrawer.module.css'

/**
 * OverlayChips — render applied overlays as pill chips.
 *
 * Props:
 *  - overlays: string[] (default [])
 *  - className?: string  extra classes for container
 *  - ariaLabel?: string  accessibility label for the chip list
 */
export default function OverlayChips({ overlays = [], className = '', ariaLabel }) {
  if (!overlays.length) {
    return (
      <span
        className={styles.hint}
        role="status"
        aria-live="polite"
      >
        (none)
      </span>
    )
  }

  return (
    <ul
      className={[styles.chips, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel || 'Assigned overlays'}
    >
      {overlays.map((o) => (
        <li key={o} className={styles.chip}>
          {o}
        </li>
      ))}
    </ul>
  )
}