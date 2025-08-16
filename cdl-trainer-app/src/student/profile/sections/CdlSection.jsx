// src/student/profile/sections/CdlSection.jsx
import React, { useMemo } from 'react'

import { getWalkthroughLabel } from '@walkthrough-data'

import { getSectionStatus } from '../schema/calculators.js'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

/**
 * CdlSection (read-only for students)
 * Props:
 * - value: { course, cdlClass, overlays?: string[], assignedInstructor? , verified? }
 * - onChange?: (key, val) => void   // accepted but unused (read-only)
 * - onToggle?: (key, val) => void   // accepted but unused (read-only)
 */
export default function CdlSection({ value = {} /* onChange, onToggle, read-only */ }) {
  const overlays = useMemo(
    () => (Array.isArray(value.overlays) ? value.overlays.filter(Boolean) : []),
    [value.overlays]
  )

  const status = useMemo(
    () => getSectionStatus('cdlInfo', value, value?.verified || {}),
    [value]
  )
  const verifiedBy = value?.verified?.by
  const verifiedAt = value?.verified?.at

  const prettyClass = getWalkthroughLabel?.(value.cdlClass) || value.cdlClass || ''

  return (
    <section id="cdlInfo" className={styles.section} aria-labelledby="cdl-info-title">
      <SectionHeader
        title="CDL Assignment (Admin-set)"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id="cdl-info-title" className="visually-hidden">CDL Assignment</h3>

      {/* Read-only summary card */}
      <div
        className={styles.readonlyCard}
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          padding: '12px 14px',
          background: 'var(--panel, #fff)',
        }}
        aria-live="polite"
      >
        <Row label="Course">
          {value.course ? value.course : <i>Not set</i>}
        </Row>

        <Row label="CDL Class">
          {prettyClass ? prettyClass : <i>Not set</i>}
        </Row>

        <Row label="Overlays / Restrictions">
          {overlays.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {overlays.map((o) => (
                <span
                  key={o}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: 1.4,
                    background: 'rgba(59,130,246,0.12)',
                    color: '#1e40af',
                    border: '1px solid rgba(59,130,246,0.35)',
                  }}
                >
                  {o}
                </span>
              ))}
            </div>
          ) : (
            <i>None</i>
          )}
        </Row>

        <Row label="Assigned Instructor">
          {value.assignedInstructor ? value.assignedInstructor : <i>Unassigned</i>}
        </Row>
      </div>

      <p className={styles.sub} style={{ marginTop: 8 }}>
        These fields are set by your school and are read-only. Contact your administrator if something looks off.
      </p>
    </section>
  )
}

/** Small helper for consistent read-only rows */
function Row({ label, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 8,
        alignItems: 'start',
        padding: '6px 0',
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: 'var(--muted-foreground, #6b7280)',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ minWidth: 0, wordBreak: 'break-word' }}>{children}</div>
    </div>
  )
}
