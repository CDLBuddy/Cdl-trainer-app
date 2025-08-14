// src/student/profile/sections/PermitSection.jsx
import React, { useId, useMemo } from 'react'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'
import Field from '../ui/Field.jsx'
import styles from './sections.module.css'

export default function PermitSection({ value, onChange, onUpload, afterUpload }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`
  const hasPermit = v.cdlPermit === 'yes'

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const setField = (k, val) => onChange?.(k, val)
  const handleUpload = async (file) => {
    if (!file) return
    // Persist and allow caller to react (e.g., mark checklist)
    await onUpload?.(file, 'permits', 'permitPhotoUrl', afterUpload)
  }

  return (
    <section className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <header className={styles.header}>
        <h3 id={`${sectionId}-title`} className={styles.title}>🪪 CDL Permit</h3>
        <div id={hintId} className={styles.sub}>
          If you already have a permit, upload a clear photo and set the expiry date.
        </div>
      </header>

      <div className={styles.grid2}>
        <Select
          label="Do you have a CDL permit?"
          required
          value={v.cdlPermit || ''}
          onChange={(val) => setField('cdlPermit', val)}
          options={[
            { value: '', label: 'Select…' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          ariaDescribedBy={hintId}
        />

        {hasPermit && (
          <Field
            type="date"
            label="Permit Expiry"
            value={v.permitExpiry || ''}
            onChange={(val) => setField('permitExpiry', val)}
            min={today}                       // avoid past dates
            ariaDescribedBy={hintId}
          />
        )}
      </div>

      {hasPermit && (
        <div className={styles.grid}>
          <UploadField
            label="Permit Photo"
            currentUrl={v.permitPhotoUrl}
            accept="image/*,application/pdf"  // allow scans/PDFs
            onSelectFile={handleUpload}
            previewAlt="CDL permit"
            ariaDescribedBy={hintId}
          />
        </div>
      )}
    </section>
  )
}