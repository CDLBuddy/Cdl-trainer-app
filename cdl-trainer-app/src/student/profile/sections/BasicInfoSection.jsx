// src/student/profile/sections/BasicInfoSection.jsx
import React, { useMemo, useCallback, useState } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'
import ui from '../ui/fields.module.css'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import s from './sections.module.css'

/**
 * BasicInfoSection
 * Props:
 * - value:  { name, dob, profilePicUrl, verified?: { by, at, ... } }
 * - onChange: (key, value) => void
 * - onUpload?: (file, path, field, checklistFn?) => Promise<void>
 * - minAgeYears?: number   // default 15
 * - maxAgeYears?: number   // default 90
 */
export default function BasicInfoSection({
  value = {},
  onChange,
  onUpload,
  minAgeYears = 15,
  maxAgeYears = 90,
}) {
  const [dobInvalid, setDobInvalid] = useState(false)

  // --- Derived DOB bounds (YYYY-MM-DD) ---
  const { minDob, maxDob } = useMemo(() => {
    const today = new Date()
    const toISO = d => d.toISOString().slice(0, 10)

    const youngest = new Date(today) // today - minAgeYears
    youngest.setFullYear(youngest.getFullYear() - minAgeYears)

    const oldest = new Date(today) // today - maxAgeYears
    oldest.setFullYear(oldest.getFullYear() - maxAgeYears)

    return { minDob: toISO(oldest), maxDob: toISO(youngest) }
  }, [minAgeYears, maxAgeYears])

  // --- Section status (chips) ---
  const status = useMemo(
    () => getSectionStatus('basicInfo', value, value?.verified || {}),
    [value]
  )
  const verifiedBy = value?.verified?.by
  const verifiedAt = value?.verified?.at

  // --- Handlers ---
  const handleName = useCallback(
    (e) => onChange?.('name', e.target.value),
    [onChange]
  )

  const handleDob = useCallback(
    (e) => {
      const val = e.target.value
      const isOutOfRange = !!val && (val < minDob || val > maxDob)
      setDobInvalid(isOutOfRange)
      // optional native constraint message for better a11y UX
      if (isOutOfRange) {
        e.target.setCustomValidity(`Enter a valid birth date between ${minDob} and ${maxDob}.`)
      } else {
        e.target.setCustomValidity('')
      }
      onChange?.('dob', val)
    },
    [onChange, minDob, maxDob]
  )

  const handleProfilePic = useCallback(
    async (file) => {
      if (!file) return
      if (typeof onUpload === 'function') {
        // delegate upload → parent writes profilePicUrl
        await onUpload(file, 'students/profile', 'profilePicUrl')
      } else {
        // graceful fallback: local object URL (will be replaced when saved)
        const url = URL.createObjectURL(file)
        onChange?.('profilePicUrl', url)
      }
    },
    [onUpload, onChange]
  )

  return (
    <section id="basicInfo" className={s.section} aria-labelledby="basic-info-h3">
      <SectionHeader
        title="Basic Information"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      {/* Name */}
      <Field
        label="Full Name"
        required
        hint="Required for Enrollment • Use your legal name for school and compliance."
      >
        <input
          className={ui.input}
          id="profile_name"
          type="text"
          placeholder="e.g., Alex Johnson"
          value={value.name || ''}
          onChange={handleName}
          autoComplete="name"
          autoCapitalize="words"
          inputMode="text"
          required
          aria-describedby="name_help"
        />
        <small id="name_help" className={ui.hint}>
          This appears on your school profile and forms.
        </small>
      </Field>

      {/* DOB */}
      <Field
        label="Date of Birth"
        required
        hint={`Required for Enrollment • Allowed range: ${minDob} → ${maxDob}`}
      >
        <input
          className={ui.input}
          id="profile_dob"
          type="date"
          value={value.dob || ''}
          onChange={handleDob}
          min={minDob}
          max={maxDob}
          required
          aria-describedby="dob_help"
          aria-invalid={dobInvalid || undefined}
        />
        <small id="dob_help" className={dobInvalid ? ui.errorText : ui.hint}>
          {dobInvalid
            ? `Enter a date between ${minDob} and ${maxDob}.`
            : 'Used for enrollment & compliance forms.'}
        </small>
      </Field>

      {/* Profile Photo (optional but encouraged) */}
      <div className={ui.field}>
        <span className={ui.label}>
          Profile Photo <span className={ui.optional}>(optional)</span>
        </span>

        <div className={ui.uploadRow}>
          <UploadField
            label={value.profilePicUrl ? 'Replace image' : 'Upload image'}
            currentUrl={value.profilePicUrl}
            onSelectFile={handleProfilePic}
            hint="Accepted: image/* • Max 8MB"
            accept="image/*"
            maxSizeMB={8}
            imageOnly
            capture="environment"
          />
          {value.profilePicUrl && (
            <button
              type="button"
              className="btn outline"
              onClick={() => onChange?.('profilePicUrl', '')}
            >
              Remove
            </button>
          )}
        </div>

        <small className={ui.hint}>
          JPG/PNG/WebP, under 8&nbsp;MB. A clear face photo helps instructors recognize you.
        </small>
      </div>
    </section>
  )
}
