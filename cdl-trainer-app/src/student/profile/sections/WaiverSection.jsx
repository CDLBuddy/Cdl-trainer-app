// src/student/profile/sections/WaiverSection.jsx
import React, { useId } from 'react'

import Field from '../ui/Field.jsx'

import styles from './sections.module.css'

export default function WaiverSection({ value, onChange }) {
  const v = value || {}
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const hintId = `${sectionId}-hint`
  const signed = !!v.waiverSigned

  const set = (k, val) => onChange?.(k, val)

  // When user checks the box the first time, set a signed date if empty.
  const toggleSigned = (checked) => {
    set('waiverSigned', checked)
    if (checked && !v.waiverSignatureDate) {
      // ISO date (YYYY-MM-DD) so it fits a date input if you add one later
      const iso = new Date().toISOString().slice(0, 10)
      set('waiverSignatureDate', iso)
    }
  }

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <header className={styles.header}>
        <h3 id={titleId} className={styles.title}>✅ Waiver</h3>
        <div id={hintId} className={styles.sub}>
          Read, acknowledge, and type your full legal name as your electronic signature.
        </div>
      </header>

      <div className={styles.grid} aria-describedby={hintId}>
        {/* Acknowledge */}
        <label className={styles.checkline}>
          <input
            type="checkbox"
            checked={signed}
            onChange={(e) => toggleSigned(e.target.checked)}
            aria-describedby={hintId}
          />
          <span>
            I have read and agree to the waiver and school policies.
          </span>
        </label>

        {/* Signature */}
        <Field
          label="Signature (full legal name)"
          placeholder="e.g., Alex J. Johnson"
          value={v.waiverSignature || ''}
          onChange={(val) => set('waiverSignature', val)}
          required={signed}
          disabled={!signed}
          hint={signed ? 'This serves as your electronic signature.' : 'Check the box above to enable.'}
        />

        {/* (Optional) Captured date — shown once acknowledged */}
        {signed && (
          <Field
            type="date"
            label="Signature Date"
            value={v.waiverSignatureDate || ''}
            onChange={(val) => set('waiverSignatureDate', val)}
          />
        )}

        {/* Tiny legal note */}
        <p className={styles.note} role="note">
          By checking the box and providing your name, you acknowledge that this
          electronic signature has the same legal effect as a handwritten signature.
        </p>
      </div>
    </section>
  )
}