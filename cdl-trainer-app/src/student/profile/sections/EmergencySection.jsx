// src/student/profile/sections/EmergencySection.jsx
import React, { useCallback, useId, useMemo, useState } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'
import ui from '../ui/fields.module.css'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

const DEFAULT_PHONE_PATTERN = '[0-9\\-\\(\\)\\+ ]{10,15}'

// Light US formatter for a 10-digit number → "(XXX) XXX-XXXX"
// If 11 digits starting with "1", it trims the leading 1 then formats.
function formatPhoneUSLike(input = '') {
  const digits = String(input).replace(/\D+/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return null
}

/**
 * EmergencySection
 * Props:
 * - value:         { emergencyName, emergencyPhone, emergencyRelation, verified? }
 * - onChange:      (key, value) => void
 * - phonePattern?: string (optional) — defaults to 10–15 chars of digits/() +-space
 */
export default function EmergencySection({
  value,
  onChange,
  phonePattern = DEFAULT_PHONE_PATTERN,
}) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const hintId = `${sectionId}-hint`

  const status = useMemo(
    () => getSectionStatus('emergency', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = useCallback((k, val) => onChange?.(k, val), [onChange])

  const [phoneInvalid, setPhoneInvalid] = useState(false)

  const handlePhoneInput = useCallback(
    (e) => {
      const val = e.target.value
      // rely on native pattern validity (works with our pattern string)
      const invalid = !!val && !e.target.checkValidity()
      setPhoneInvalid(invalid)
      setField('emergencyPhone', val)
    },
    [setField]
  )

  const handlePhoneBlur = useCallback(() => {
    const formatted = formatPhoneUSLike(v.emergencyPhone)
    if (formatted) setField('emergencyPhone', formatted)
  }, [v?.emergencyPhone, setField])

  return (
    <section id="emergency" className={styles.section} aria-labelledby={titleId}>
      <SectionHeader
        title="Emergency Contact"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id={titleId} className="visually-hidden">Emergency Contact</h3>
      <div id={hintId} className={styles.sub}>
        Required for Enrollment • Used for safety and compliance.
      </div>

      <div className={styles.grid2}>
        {/* Contact Name */}
        <Field label="Contact Name" required hint="Full name of your emergency contact.">
          <input
            className={ui.input}
            id={`${sectionId}-name`}
            type="text"
            placeholder="e.g., Jordan Smith"
            value={v.emergencyName || ''}
            onChange={(e) => setField('emergencyName', e.target.value)}
            autoComplete="name"
            autoCapitalize="words"
            inputMode="text"
            required
            aria-describedby={hintId}
          />
        </Field>

        {/* Phone */}
        <Field
          label="Phone"
          required
          hint={
            phoneInvalid
              ? 'Please enter a valid phone number.'
              : 'Digits, spaces, parentheses, + or - (10–15 characters).'
          }
        >
          <input
            className={`${ui.input} ${phoneInvalid ? ui.inputInvalid : ''}`}
            id={`${sectionId}-phone`}
            type="tel"
            inputMode="tel"
            placeholder="(555) 555-5555"
            pattern={phonePattern}
            value={v.emergencyPhone || ''}
            onChange={handlePhoneInput}
            onBlur={handlePhoneBlur}
            autoComplete="tel"
            aria-describedby={hintId}
            aria-invalid={phoneInvalid || undefined}
            onInvalid={(e) => {
              // Provide a clear native message when pattern fails
              e.target.setCustomValidity('Enter a valid phone number (10–15 characters).')
            }}
            onInput={(e) => e.currentTarget.setCustomValidity('')}
          />
        </Field>
      </div>

      <div className={styles.grid}>
        {/* Relation */}
        <Field label="Relation" required hint="How this person is related to you.">
          <input
            className={ui.input}
            id={`${sectionId}-relation`}
            type="text"
            placeholder="Parent, spouse, friend…"
            value={v.emergencyRelation || ''}
            onChange={(e) => setField('emergencyRelation', e.target.value)}
            autoComplete="relationship"
            required
            aria-describedby={hintId}
          />
        </Field>
      </div>
    </section>
  )
}