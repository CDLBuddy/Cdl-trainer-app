// src/student/profile/sections/MedicalSection.jsx
import React, { useId, useMemo } from 'react'

import SectionHeader from './SectionHeader.jsx'
import { getSectionStatus } from '../schema/calculators.js'

import Field from '../ui/Field.jsx'
import UploadField from '../ui/UploadField.jsx'

import styles from './sections.module.css'

export default function MedicalSection({ value, onChange, onUpload }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const expiryInvalid = v.medCardExpiry && v.medCardExpiry < today

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('medical', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = (k, val) => onChange?.(k, val)
  const handleSelect = (file) => {
    if (!file) return
    onUpload?.(file, 'students/medical', 'medicalCardUrl')
  }

  return (
    <section id="medical" className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <SectionHeader
        title="Medical Card"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <div id={`${sectionId}-title`} className="visually-hidden">Medical Card</div>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel • Upload your DOT medical certificate and set its expiration date.
      </div>

      <div className={styles.grid2}>
        <UploadField
          label={v.medicalCardUrl ? 'Replace Medical Card Image' : 'Upload Medical Card Image'}
          currentUrl={v.medicalCardUrl}
          accept="image/*"           {/* schema validate: image: true */}
          maxSizeMB={8}              {/* schema validate: maxMB: 8 */}
          imageOnly
          capture="environment"
          previewAlt="Medical card preview"
          onSelectFile={handleSelect}
          ariaDescribedBy={hintId}
        />

        <Field
          type="date"
          label="Medical Card Expiration"
          value={v.medCardExpiry || ''}
          onChange={(val) => setField('medCardExpiry', val)}
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
