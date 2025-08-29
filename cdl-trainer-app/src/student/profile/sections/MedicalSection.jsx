// src/student/profile/sections/MedicalSection.jsx
import React, { useCallback, useId, useMemo, useState } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'
import ui from '../ui/fields.module.css'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

export default function MedicalSection({ value, onChange, onUpload }) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const hintId = `${sectionId}-hint`
  const helpId = `${sectionId}-expiry-help`

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [expiryInvalid, setExpiryInvalid] = useState(
    !!(v.medCardExpiry && v.medCardExpiry < today)
  )

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('medical', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = useCallback((k, val) => onChange?.(k, val), [onChange])

  const handleSelect = useCallback(
    file => {
      if (!file) return
      // Parent handler persists to storage + sets medicalCardUrl
      onUpload?.(file, 'students/medical', 'medicalCardUrl')
    },
    [onUpload]
  )

  const handleExpiryChange = useCallback(
    e => {
      const val = e.target.value
      const invalid = !!val && val < today
      setExpiryInvalid(invalid)
      // Native constraint feedback for better a11y
      if (invalid) {
        e.target.setCustomValidity('Expiration must be in the future.')
      } else {
        e.target.setCustomValidity('')
      }
      setField('medCardExpiry', val)
    },
    [setField, today]
  )

  return (
    <section id="medical" className={styles.section} aria-labelledby={titleId}>
      <SectionHeader
        title="Medical Card"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id={titleId} className="visually-hidden">
        Medical Card
      </h3>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel • Upload your DOT medical certificate
        and set its expiration date.
      </div>

      <div className={styles.grid2}>
        {/* Medical card upload */}
        <div className={styles.fieldGroup}>
          <UploadField
            label={
              v.medicalCardUrl
                ? 'Replace Medical Card Image'
                : 'Upload Medical Card Image'
            }
            currentUrl={v.medicalCardUrl}
            accept="image/*"
            maxSizeMB={8}
            imageOnly
            capture="environment"
            previewAlt="Medical card preview"
            onSelectFile={handleSelect}
            ariaDescribedBy={hintId}
          />
          {v.medicalCardUrl ? (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn outline"
                onClick={() => setField('medicalCardUrl', '')}
              >
                Remove
              </button>
            </div>
          ) : null}
          <small className={styles.subtle}>
            JPG/PNG/WebP • Max 8&nbsp;MB • Ensure your name and dates are
            readable.
          </small>
        </div>

        {/* Medical card expiration */}
        <Field label="Medical Card Expiration" required>
          <input
            className={`${ui.input} ${expiryInvalid ? ui.inputInvalid : ''}`}
            id={`${sectionId}-medcard-expiry`}
            type="date"
            value={v.medCardExpiry || ''}
            onChange={handleExpiryChange}
            min={today} // future-only per schema
            required
            aria-describedby={`${hintId} ${helpId}`}
            aria-invalid={expiryInvalid || undefined}
            onInput={e => e.currentTarget.setCustomValidity('')}
          />
          <small
            id={helpId}
            className={expiryInvalid ? styles.errorText : styles.subtle}
          >
            {expiryInvalid
              ? 'Expiration must be in the future.'
              : 'Must be a future date.'}
          </small>
        </Field>
      </div>
    </section>
  )
}
