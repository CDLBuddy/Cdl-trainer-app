// src/student/profile/sections/WaiverSection.jsx
import React, { useId, useMemo } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

export default function WaiverSection({ value, onChange }) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const hintId = `${sectionId}-hint`
  const signed = !!v.waiverSigned

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('waiver', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const set = (k, val) => onChange?.(k, val)

  // When user checks the box the first time, set a signed date if empty.
  const toggleSigned = (checked) => {
    set('waiverSigned', checked)
    if (checked && !v.waiverSignatureDate) {
      const iso = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      set('waiverSignatureDate', iso)
    }
  }

  const signatureDisabled = !signed
  const signatureRequired = signed

  return (
    <section id="waiver" className={styles.section} aria-labelledby={titleId}>
      <SectionHeader
        title="Student Waiver"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id={titleId} className="visually-hidden">Student Waiver</h3>
      <div id={hintId} className={styles.sub}>
        Required for Enrollment • Read, acknowledge, and type your full legal name as your electronic signature.
      </div>

      <div className={styles.grid} aria-describedby={hintId}>
        {/* Acknowledge */}
        <label className={styles.checkline}>
          <input
            type="checkbox"
            checked={signed}
            onChange={(e) => toggleSigned(e.target.checked)}
            aria-describedby={hintId}
          />
          <span>I have read and agree to the waiver and school policies.</span>
        </label>

        {/* Signature */}
        <Field
          label="Signature (full legal name)"
          placeholder="e.g., Alex J. Johnson"
          value={v.waiverSignature || ''}
          onChange={(val) => set('waiverSignature', val)}
          required={signatureRequired}
          disabled={signatureDisabled}
          hint={
            signed
              ? 'This serves as your electronic signature.'
              : 'Check the box above to enable.'
          }
        />

        {/* Optional captured date — shown once acknowledged */}
        {signed && (
          <Field
            type="date"
            label="Signature Date"
            value={v.waiverSignatureDate || ''}
            onChange={(val) => set('waiverSignatureDate', val)}
          />
        )}

        {/* Tiny legal note */}
        <p className={styles.subtle} role="note">
          By checking the box and providing your name, you acknowledge that this electronic signature
          has the same legal effect as a handwritten signature.
        </p>
      </div>
    </section>
  )
}
