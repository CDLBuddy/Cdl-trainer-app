// src/student/profile/sections/EmergencySection.jsx
import React, { useCallback, useId, useMemo } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

const DEFAULT_PHONE_PATTERN = '[0-9\\-\\(\\)\\+ ]{10,15}'

function formatPhoneUS(digits) {
  // very light formatter: 10 digits => (XXX) XXX-XXXX
  if (digits.length !== 10) return null
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 6)
  const p3 = digits.slice(6)
  return `(${p1}) ${p2}-${p3}`
}

/**
 * EmergencySection
 * Props:
 * - value:       { emergencyName, emergencyPhone, emergencyRelation, verified? }
 * - onChange:    (key, value) => void
 * - phonePattern?: string (optional) — falls back to DEFAULT_PHONE_PATTERN
 */
export default function EmergencySection({ value, onChange, phonePattern = DEFAULT_PHONE_PATTERN }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`

  // derive status chip using schema helpers
  const status = useMemo(
    () => getSectionStatus('emergency', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = useCallback((k, val) => onChange?.(k, val), [onChange])

  const handlePhoneBlur = useCallback(() => {
    const digits = String(v.emergencyPhone || '').replace(/\D+/g, '')
    const formatted = formatPhoneUS(digits)
    if (formatted) setField('emergencyPhone', formatted)
  }, [v?.emergencyPhone, setField])

  return (
    <section id="emergency" className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <SectionHeader
        title="Emergency Contact"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <div id={`${sectionId}-title`} className="visually-hidden">Emergency Contact</div>
      <div id={hintId} className={styles.sub}>
        Required for Enrollment • Used for safety and compliance.
      </div>

      <div className={styles.grid2}>
        <Field
          label="Contact Name"
          required
          value={v.emergencyName || ''}
          onChange={val => setField('emergencyName', val)}
          placeholder="e.g., Jordan Smith"
          autoComplete="name"
          ariaDescribedBy={hintId}
        />
        <Field
          type="tel"
          label="Phone"
          required
          pattern={phonePattern}
          inputMode="tel"
          placeholder="(555) 555-5555"
          value={v.emergencyPhone || ''}
          onChange={val => setField('emergencyPhone', val)}
          onBlur={handlePhoneBlur}
          autoComplete="tel"
          ariaDescribedBy={hintId}
        />
      </div>

      <div className={styles.grid}>
        <Field
          label="Relation"
          required
          value={v.emergencyRelation || ''}
          onChange={val => setField('emergencyRelation', val)}
          placeholder="Parent, spouse, friend…"
          ariaDescribedBy={hintId}
        />
      </div>
    </section>
  )
}
