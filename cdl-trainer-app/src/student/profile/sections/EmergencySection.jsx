// src/student/profile/sections/EmergencySection.jsx
import React, { useCallback, useId } from 'react'
import Field from '../ui/Field.jsx'
import styles from './sections.module.css'

const PHONE_PATTERN = '[0-9\\-\\(\\)\\+ ]{10,15}'

function formatPhoneUS(digits) {
  // very light formatter: 10 digits => (XXX) XXX-XXXX
  if (digits.length !== 10) return null
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 6)
  const p3 = digits.slice(6)
  return `(${p1}) ${p2}-${p3}`
}

export default function EmergencySection({ value, onChange }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`

  const setField = useCallback(
    (k, val) => onChange?.(k, val),
    [onChange]
  )

  const handlePhoneBlur = useCallback(
    (raw) => {
      const digits = String(raw || '').replace(/\D+/g, '')
      const formatted = formatPhoneUS(digits)
      if (formatted) setField('emergencyPhone', formatted)
    },
    [setField]
  )

  return (
    <section className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <header className={styles.header}>
        <h3 id={`${sectionId}-title`} className={styles.title}>🆘 Emergency Contact</h3>
        <div id={hintId} className={styles.sub}>Required for safety and compliance</div>
      </header>

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
          pattern={PHONE_PATTERN}
          inputMode="tel"
          placeholder="(555) 555-5555"
          value={v.emergencyPhone || ''}
          onChange={val => setField('emergencyPhone', val)}
          onBlur={() => handlePhoneBlur(v.emergencyPhone)}
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