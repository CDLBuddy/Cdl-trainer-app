// src/student/profile/sections/LicenseSection.jsx
import React, { useId, useMemo } from 'react'

import SectionHeader from './SectionHeader.jsx'
import { getSectionStatus } from '../schema/calculators.js'

import Field from '../ui/Field.jsx'
import UploadField from '../ui/UploadField.jsx'

import styles from './sections.module.css'

export default function LicenseSection({ value, onChange, onUpload }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const expiryInvalid = v.licenseExpiry && v.licenseExpiry < today

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('license', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = (k, val) => onChange?.(k, val)

  const handleSelect = (file) => {
    if (!file) return
    // Parent handler persists to storage + sets driverLicenseUrl
    onUpload?.(file, 'students/licenses', 'driverLicenseUrl')
  }

  return (
    <section id="license" className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <SectionHeader
        title="Driver License"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <div id={`${sectionId}-title`} className="visually-hidden">Driver License</div>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel • Upload a clear photo of your current license and set its expiration date.
      </div>

      <div className={styles.grid2}>
        <UploadField
          label={v.driverLicenseUrl ? 'Replace License Image' : 'Upload License Image'}
          currentUrl={v.driverLicenseUrl}
          accept="image/*"
          maxSizeMB={8}
          imageOnly
          capture="environment"
          previewAlt="Driver license preview"
          onSelectFile={handleSelect}
          ariaDescribedBy={hintId}
        />

        <Field
          type="date"
          label="License Expiration"
          value={v.licenseExpiry || ''}
          onChange={(val) => setField('licenseExpiry', val)}
          min={today} // future-only per schema (future: true)
          ariaDescribedBy={`${hintId} ${sectionId}-expiry-help`}
          ariaInvalid={expiryInvalid || undefined}
        >
          <small
            id={`${sectionId}-expiry-help`}
            className={expiryInvalid ? styles.errorText : styles.subtle}
          >
            {expiryInvalid ? 'Expiration must be in the future.' : 'Must be a future date.'}
          </small>
        </Field>
      </div>
    </section>
  )
}
