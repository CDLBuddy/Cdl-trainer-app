// src/student/profile/sections/VehicleSection.jsx
import React, { useCallback, useEffect, useId, useMemo } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

export default function VehicleSection({ value, onChange, onUpload }) {
  const v = useMemo(() => value || {}, [value])
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const hintId = `${sectionId}-hint`

  const qualified = String(v.vehicleQualified || '').toLowerCase() === 'yes'

  // status chip via schema helpers
  const status = useMemo(
    () => getSectionStatus('vehicle', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = useCallback((k, val) => onChange?.(k, val), [onChange])

  const handleQualifiedChange = useCallback(
    val => {
      setField('vehicleQualified', val)
      // If switching away from "Yes", clear dependent fields
      if (String(val).toLowerCase() !== 'yes') {
        setField('truckPlateUrl', '')
        setField('trailerPlateUrl', '')
      }
    },
    [setField]
  )

  const upTruck = useCallback(
    async file => {
      if (!file) return
      if (typeof onUpload === 'function') {
        await onUpload(file, 'students/vehicle', 'truckPlateUrl')
      } else {
        // graceful fallback (preview only)
        const url = URL.createObjectURL(file)
        setField('truckPlateUrl', url)
      }
    },
    [onUpload, setField]
  )

  const upTrailer = useCallback(
    async file => {
      if (!file) return
      if (typeof onUpload === 'function') {
        await onUpload(file, 'students/vehicle', 'trailerPlateUrl')
      } else {
        const url = URL.createObjectURL(file)
        setField('trailerPlateUrl', url)
      }
    },
    [onUpload, setField]
  )

  // keep URLs cleared if something external flips qualified → no
  useEffect(() => {
    if (!qualified && (v.truckPlateUrl || v.trailerPlateUrl)) {
      setField('truckPlateUrl', '')
      setField('trailerPlateUrl', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualified])

  return (
    <section id="vehicle" className={styles.section} aria-labelledby={titleId}>
      <SectionHeader
        title="Vehicle (If Applicable)"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id={titleId} className="visually-hidden">
        Vehicle (If Applicable)
      </h3>
      <div id={hintId} className={styles.sub}>
        Required before Behind-the-Wheel only if you will use your own vehicle.
      </div>

      <div className={styles.grid2}>
        <Select
          label="Will you use your own vehicle for training?"
          required
          value={v.vehicleQualified || ''}
          onChange={handleQualifiedChange}
          options={[
            { value: '', label: 'Select…' },
            { value: 'yes', label: 'Yes, I will bring one' },
            { value: 'no', label: 'No' },
          ]}
          ariaDescribedBy={hintId}
        />
      </div>

      {qualified && (
        <>
          <div className={styles.grid2} aria-describedby={hintId}>
            <div>
              <UploadField
                label={
                  v.truckPlateUrl
                    ? 'Replace Truck Data Plate'
                    : 'Truck Data Plate'
                }
                currentUrl={v.truckPlateUrl}
                accept="image/*"
                maxSizeMB={8}
                imageOnly
                capture="environment"
                onSelectFile={upTruck}
                previewAlt="Truck data plate"
              />
              {v.truckPlateUrl ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => setField('truckPlateUrl', '')}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <UploadField
                label={
                  v.trailerPlateUrl
                    ? 'Replace Trailer Data Plate'
                    : 'Trailer Data Plate'
                }
                currentUrl={v.trailerPlateUrl}
                accept="image/*"
                maxSizeMB={8}
                imageOnly
                capture="environment"
                onSelectFile={upTrailer}
                previewAlt="Trailer data plate"
              />
              {v.trailerPlateUrl ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => setField('trailerPlateUrl', '')}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <p className={styles.subtle} role="note">
            Tip: Stand square to the plate and fill the frame. If your photo is
            blurry, try again in brighter light.
          </p>
        </>
      )}
    </section>
  )
}
