// src/student/profile/sections/LicenseSection.jsx
import React, { useId, useMemo } from 'react'

import Field from '../ui/Field.jsx'
import UploadField from '../ui/UploadField.jsx'

import styles from './sections.module.css'

export default function LicenseSection({ value, onChange, onUpload }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`

  // yyyy-mm-dd for <input type="date"> min attr (today)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const setField = (k, val) => onChange?.(k, val)

  const handleSelect = (file) => {
    if (!file) return
    // Parent handler persists to storage + sets driverLicenseUrl
    onUpload?.(file, 'licenses', 'driverLicenseUrl')
  }

  return (
    <section className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <header className={styles.header}>
        <h3 id={`${sectionId}-title`} className={styles.title}>🪪 Driver License</h3>
        <div id={hintId} className={styles.sub}>
          Upload a clear photo of your current license and set its expiry.
        </div>
      </header>

      <div className={styles.grid2}>
        <UploadField
          label="Driver License"
          currentUrl={v.driverLicenseUrl}
          accept="image/*"
          previewAlt="Driver license preview"
          onSelectFile={handleSelect}
          ariaDescribedBy={hintId}
        />

        <Field
          type="date"
          label="License Expiry"
          value={v.licenseExpiry || ''}
          onChange={(val) => setField('licenseExpiry', val)}
          min={today}
          ariaDescribedBy={hintId}
        />
      </div>
    </section>
  )
}