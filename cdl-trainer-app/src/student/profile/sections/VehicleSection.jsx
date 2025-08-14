// src/student/profile/sections/VehicleSection.jsx
import React, { useId } from 'react'

import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'

import styles from './sections.module.css'

export default function VehicleSection({ value, onChange, onUpload }) {
  const v = value || {}
  const sectionId = useId()
  const hintId = `${sectionId}-hint`
  const qualified = v.vehicleQualified === 'yes'

  const setField = (k, val) => onChange?.(k, val)
  const upTruck = (file) =>
    onUpload?.(file, 'vehicle-plates', 'truckPlateUrl')
  const upTrailer = (file) =>
    onUpload?.(file, 'vehicle-plates', 'trailerPlateUrl')

  return (
    <section className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <header className={styles.header}>
        <h3 id={`${sectionId}-title`} className={styles.title}>🚛 Vehicle Qualification</h3>
        <div id={hintId} className={styles.sub}>
          If you’ll test in your own rig, we need clear photos (or scans) of both data plates.
        </div>
      </header>

      <div className={styles.grid2}>
        <Select
          label="Is your vehicle qualified?"
          required
          value={v.vehicleQualified || ''}
          onChange={(val) => setField('vehicleQualified', val)}
          options={[
            { value: '', label: 'Select…' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          ariaDescribedBy={hintId}
        />
      </div>

      {qualified && (
        <div className={styles.grid2} aria-describedby={hintId}>
          <UploadField
            label="Truck Data Plate"
            currentUrl={v.truckPlateUrl}
            accept="image/*,application/pdf"
            onSelectFile={upTruck}
            previewAlt="Truck data plate"
          />
          <UploadField
            label="Trailer Data Plate"
            currentUrl={v.trailerPlateUrl}
            accept="image/*,application/pdf"
            onSelectFile={upTrailer}
            previewAlt="Trailer data plate"
          />
        </div>
      )}

      {qualified && (
        <p className={styles.note} role="note">
          Tip: Stand square to the plate and fill the frame. If the photo is blurry, upload a PDF scan instead.
        </p>
      )}
    </section>
  )
}