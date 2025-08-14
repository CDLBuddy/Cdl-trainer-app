// src/student/profile/sections/MedicalSection.jsx
import React, { useId, useMemo } from 'react'

import Field from '../ui/Field.jsx'
import UploadField from '../ui/UploadField.jsx'

import styles from './sections.module.css'

export default function MedicalSection({ value, onChange, onUpload }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const setField = (k, val) => onChange?.(k, val)
  const handleSelect = (file) => {
    if (!file) return
    onUpload?.(file, 'medCards', 'medicalCardUrl')
  }

  return (
    <section className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <header className={styles.header}>
        <h3 id={`${sectionId}-title`} className={styles.title}>🏥 Medical Card</h3>
        <div id={hintId} className={styles.sub}>
          Upload your DOT medical certificate and set its expiry date.
        </div>
      </header>

      <div className={styles.grid2}>
        <UploadField
          label="Medical Card"
          currentUrl={v.medicalCardUrl}
          accept="image/*,application/pdf"
          previewAlt="Medical card preview"
          onSelectFile={handleSelect}
          ariaDescribedBy={hintId}
        />

        <Field
          type="date"
          label="Medical Card Expiry"
          value={v.medCardExpiry || ''}
          onChange={(val) => setField('medCardExpiry', val)}
          min={today}
          ariaDescribedBy={hintId}
        />
      </div>
    </section>
  )
}