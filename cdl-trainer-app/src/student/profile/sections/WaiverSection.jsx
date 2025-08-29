// src/student/profile/sections/WaiverSection.jsx
import React, { useCallback, useId, useMemo } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

/**
 * WaiverSection
 * Props:
 *  - value: { waiverSigned?: boolean, waiverSignature?: string, waiverSignatureDate?: string, verified?: { by?: string, at?: string } }
 *  - onChange: (key:string, value:any) => void
 *  - policyUrl?: string  // optional link to your school waiver/policies page or PDF
 */
export default function WaiverSection({ value, onChange, policyUrl = '' }) {
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

  const set = useCallback((k, val) => onChange?.(k, val), [onChange])

  // When user toggles the checkbox:
  // - On check: set date if missing.
  // - On uncheck: clear signature + date.
  const toggleSigned = useCallback(
    checked => {
      set('waiverSigned', checked)
      if (checked) {
        if (!v.waiverSignatureDate) {
          const iso = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
          set('waiverSignatureDate', iso)
        }
      } else {
        if (v.waiverSignature) set('waiverSignature', '')
        if (v.waiverSignatureDate) set('waiverSignatureDate', '')
      }
    },
    [set, v?.waiverSignature, v?.waiverSignatureDate]
  )

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

      <h3 id={titleId} className="visually-hidden">
        Student Waiver
      </h3>
      <div id={hintId} className={styles.sub}>
        Required for Enrollment • Read, acknowledge, and type your full legal
        name as your electronic signature.
        {policyUrl ? (
          <>
            {' '}
            <a href={policyUrl} target="_blank" rel="noopener noreferrer">
              View waiver / policies
            </a>
            .
          </>
        ) : null}
      </div>

      <div className={styles.grid} aria-describedby={hintId}>
        {/* Acknowledge */}
        <label className={styles.checkline}>
          <input
            type="checkbox"
            checked={signed}
            onChange={e => toggleSigned(e.target.checked)}
            aria-describedby={hintId}
          />
          <span>I have read and agree to the waiver and school policies.</span>
        </label>

        {/* Signature */}
        <Field
          label="Signature (full legal name)"
          placeholder="e.g., Alex J. Johnson"
          value={v.waiverSignature || ''}
          onChange={val => set('waiverSignature', val)}
          required={signatureRequired}
          disabled={signatureDisabled}
          autoComplete="name"
          autoCapitalize="words"
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
            onChange={val => set('waiverSignatureDate', val)}
          />
        )}

        {/* Tiny legal note */}
        <p className={styles.subtle} role="note">
          By checking the box and providing your name, you acknowledge this
          electronic signature has the same legal effect as a handwritten
          signature.
        </p>
      </div>
    </section>
  )
}
