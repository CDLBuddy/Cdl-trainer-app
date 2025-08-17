// src/student/profile/sections/PermitSection.jsx
import React, { useId, useMemo } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

export default function PermitSection({ value, onChange, onUpload, afterUpload }) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const hintId = `${sectionId}-hint`
  const hasPermit = String(v.cdlPermit || '').toLowerCase() === 'yes'

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('permit', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = (k, val) => onChange?.(k, val)
  const handleUpload = async (file) => {
    if (!file) return
    // Persist and allow caller to react (e.g., mark checklist)
    await onUpload?.(file, 'students/permits', 'permitPhotoUrl', afterUpload)
  }

  const expiryInvalid = hasPermit && v.permitExpiry && v.permitExpiry < today

  return (
    <section id="permit" className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <SectionHeader
        title="CDL Permit"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <div id={`${sectionId}-title`} className="visually-hidden">CDL Permit</div>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel • If you already have a permit, upload a clear photo and set the expiry date.
      </div>

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
            label="Permit Expiration"
            value={v.permitExpiry || ''}
            onChange={(val) => setField('permitExpiry', val)}
            min={today} // future-only per schema (future: true)
            ariaDescribedBy={`${hintId} ${sectionId}-expiry-help`}
            ariaInvalid={expiryInvalid || undefined}
          >
            {/* inline hint/error */}
            <small
              id={`${sectionId}-expiry-help`}
              className={expiryInvalid ? styles.errorText : styles.subtle}
            >
              {expiryInvalid
                ? 'Expiration must be in the future.'
                : `Must be a future date.`}
            </small>
          </Field>
        )}
      </div>

      {hasPermit && (
        <div className={styles.grid}>
          <UploadField
            label="Permit Photo"
            currentUrl={v.permitPhotoUrl}
            accept="image/*"            // schema validate: image: true
            maxSizeMB={8}               // schema validate: maxMB: 8
            imageOnly
            capture="environment"
            onSelectFile={handleUpload}
            previewAlt="CDL permit"
            ariaDescribedBy={hintId}
          />
          <p className={styles.subtle}>Accepted formats: JPG/PNG/WebP • Max 8&nbsp;MB.</p>
        </div>
      )}
    </section>
  )
}
