// src/student/profile/sections/PermitSection.jsx
import React, { useId, useMemo, useState, useCallback, useEffect } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'
import ui from '../ui/fields.module.css'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

export default function PermitSection({ value, onChange, onUpload, afterUpload }) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const hintId = `${sectionId}-hint`
  const helpId = `${sectionId}-expiry-help`

  const hasPermit = String(v.cdlPermit || '').toLowerCase() === 'yes'

  // yyyy-mm-dd for <input type="date">
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [expiryInvalid, setExpiryInvalid] = useState(
    !!(hasPermit && v.permitExpiry && v.permitExpiry < today)
  )

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('permit', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = useCallback((k, val) => onChange?.(k, val), [onChange])

  const handlePermitChange = useCallback(
    (val) => {
      setField('cdlPermit', val)
      // If switching to "No", clear dependent fields to keep schema tidy
      if (String(val).toLowerCase() !== 'yes') {
        setField('permitExpiry', '')
        setField('permitPhotoUrl', '')
        setExpiryInvalid(false)
      }
    },
    [setField]
  )

  const handleExpiryChange = useCallback(
    (e) => {
      const val = e.target.value
      const invalid = !!val && val < today
      setExpiryInvalid(invalid)
      if (invalid) e.target.setCustomValidity('Expiration must be in the future.')
      else e.target.setCustomValidity('')
      setField('permitExpiry', val)
    },
    [setField, today]
  )

  const handleUpload = useCallback(
    async (file) => {
      if (!file) return
      // Persist and allow caller to react (e.g., mark checklist)
      await onUpload?.(file, 'students/permits', 'permitPhotoUrl', afterUpload)
    },
    [onUpload, afterUpload]
  )

  // If something external toggles hasPermit to false, keep validity state in sync
  useEffect(() => {
    if (!hasPermit) setExpiryInvalid(false)
  }, [hasPermit])

  return (
    <section id="permit" className={styles.section} aria-labelledby={titleId}>
      <SectionHeader
        title="CDL Permit"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id={titleId} className="visually-hidden">CDL Permit</h3>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel • If you already have a permit, upload a clear photo and set the expiry date.
      </div>

      <div className={styles.grid2}>
        <Select
          label="Do you have a CDL permit?"
          required
          value={v.cdlPermit || ''}
          onChange={handlePermitChange}
          options={[
            { value: '', label: 'Select…' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          ariaDescribedBy={hintId}
        />

        {hasPermit && (
          <Field label="Permit Expiration" required>
            <input
              className={`${ui.input} ${expiryInvalid ? ui.inputInvalid : ''}`}
              id={`${sectionId}-permit-expiry`}
              type="date"
              value={v.permitExpiry || ''}
              onChange={handleExpiryChange}
              min={today} // future-only per schema (future: true)
              required
              aria-describedby={`${hintId} ${helpId}`}
              aria-invalid={expiryInvalid || undefined}
              onInput={(e) => e.currentTarget.setCustomValidity('')}
            />
            <small id={helpId} className={expiryInvalid ? styles.errorText : styles.subtle}>
              {expiryInvalid ? 'Expiration must be in the future.' : 'Must be a future date.'}
            </small>
          </Field>
        )}
      </div>

      {hasPermit && (
        <div className={styles.grid}>
          <div className={styles.fieldGroup}>
            <UploadField
              label={v.permitPhotoUrl ? 'Replace Permit Photo' : 'Upload Permit Photo'}
              currentUrl={v.permitPhotoUrl}
              accept="image/*"     // schema validate: image: true
              maxSizeMB={8}        // schema validate: maxMB: 8
              imageOnly
              capture="environment"
              onSelectFile={handleUpload}
              previewAlt="CDL permit"
              ariaDescribedBy={hintId}
            />
            {v.permitPhotoUrl ? (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => setField('permitPhotoUrl', '')}
                >
                  Remove
                </button>
              </div>
            ) : null}
            <p className={styles.subtle} style={{ marginTop: 6 }}>
              Accepted formats: JPG/PNG/WebP • Max 8&nbsp;MB. Make sure your name, number, and dates are readable.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}