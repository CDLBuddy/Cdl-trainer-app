// src/student/profile/sections/LicenseSection.jsx
import React, { useCallback, useId, useMemo, useState } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'
import ui from '../ui/fields.module.css'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

export default function LicenseSection({ value, onChange, onUpload }) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const hintId = `${sectionId}-hint`
  const helpId = `${sectionId}-expiry-help`

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [expiryInvalid, setExpiryInvalid] = useState(
    !!(v.licenseExpiry && v.licenseExpiry < today)
  )

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('license', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = useCallback((k, val) => onChange?.(k, val), [onChange])

  const handleSelect = useCallback(
    file => {
      if (!file) return
      // Parent handler persists to storage + sets driverLicenseUrl
      onUpload?.(file, 'students/licenses', 'driverLicenseUrl')
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
      setField('licenseExpiry', val)
    },
    [setField, today]
  )

  return (
    <section id="license" className={styles.section} aria-labelledby={titleId}>
      <SectionHeader
        title="Driver License"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id={titleId} className="visually-hidden">
        Driver License
      </h3>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel • Upload a clear photo of your current
        license and set its expiration date.
      </div>

      <div className={styles.grid2}>
        {/* License image upload */}
        <div className={styles.fieldGroup}>
          <UploadField
            label={
              v.driverLicenseUrl
                ? 'Replace License Image'
                : 'Upload License Image'
            }
            currentUrl={v.driverLicenseUrl}
            accept="image/*"
            maxSizeMB={8}
            imageOnly
            capture="environment"
            previewAlt="Driver license preview"
            onSelectFile={handleSelect}
            ariaDescribedBy={hintId}
          />
          {v.driverLicenseUrl ? (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn outline"
                onClick={() => setField('driverLicenseUrl', '')}
              >
                Remove
              </button>
            </div>
          ) : null}
          <small className={styles.subtle}>
            JPG/PNG/WebP • Max 8&nbsp;MB • Make sure all text is readable.
          </small>
        </div>

        {/* License expiration */}
        <Field label="License Expiration" required>
          <input
            className={`${ui.input} ${expiryInvalid ? ui.inputInvalid : ''}`}
            id={`${sectionId}-license-expiry`}
            type="date"
            value={v.licenseExpiry || ''}
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
