// src/student/profile/sections/VehicleSection.jsx
import React, { useId, useMemo } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

export default function VehicleSection({ value, onChange, onUpload }) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const hintId = `${sectionId}-hint`
  const qualified = String(v.vehicleQualified || '').toLowerCase() === 'yes'

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('vehicle', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = (k, val) => onChange?.(k, val)
  const upTruck = (file) => onUpload?.(file, 'students/vehicle', 'truckPlateUrl')
  const upTrailer = (file) => onUpload?.(file, 'students/vehicle', 'trailerPlateUrl')

  return (
    <section id="vehicle" className={styles.section} aria-labelledby={`${sectionId}-title`}>
      <SectionHeader
        title="Vehicle (If Applicable)"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <div id={`${sectionId}-title`} className="visually-hidden">Vehicle (If Applicable)</div>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel only if you will use your own vehicle.
      </div>

      <div className={styles.grid2}>
        <Select
          label="Will you use your own vehicle for training?"
          required
          value={v.vehicleQualified || ''}
          onChange={(val) => setField('vehicleQualified', val)}
          options={[
            { value: '', label: 'Select…' },
            { value: 'yes', label: 'Yes, I will bring one' },
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
            accept="image/*"
            maxSizeMB={8}
            imageOnly
            capture="environment"
            onSelectFile={upTruck}
            previewAlt="Truck data plate"
          />
          <UploadField
            label="Trailer Data Plate"
            currentUrl={v.trailerPlateUrl}
            accept="image/*"
            maxSizeMB={8}
            imageOnly
            capture="environment"
            onSelectFile={upTrailer}
            previewAlt="Trailer data plate"
          />
        </div>
      )}

      {qualified && (
        <p className={styles.subtle} role="note">
          Tip: Stand square to the plate and fill the frame. If your photo is blurry, try again in brighter light.
        </p>
      )}
    </section>
  )
}
