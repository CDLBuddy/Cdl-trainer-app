// src/student/profile/sections/BasicInfoSection.jsx
import React, { useMemo, useRef, useCallback } from 'react'

import Field from '../ui/Field.jsx'
import f from '../ui/fields.module.css'
import UploadField from '../ui/UploadField.jsx'

import s from './sections.module.css'

/**
 * BasicInfoSection
 * Props:
 * - value:  { name, dob, profilePicUrl, ... }
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
  const fileInputRef = useRef(null)
  const preview = useMemo(() => value.profilePicUrl || '', [value.profilePicUrl])

  // --- Derived DOB bounds (YYYY-MM-DD) ---
  const { minDob, maxDob } = useMemo(() => {
    const today = new Date()
    const toISO = d => d.toISOString().slice(0, 10)
    const max = new Date(today) // youngest allowed (today - minAge)
    max.setFullYear(max.getFullYear() - minAgeYears)

    const min = new Date(today) // oldest allowed (today - maxAge)
    min.setFullYear(min.getFullYear() - maxAgeYears)

    return { minDob: toISO(min), maxDob: toISO(max) }
  }, [minAgeYears, maxAgeYears])

  // --- Handlers ---
  const handleName = useCallback((e) => {
    onChange?.('name', e.target.value)
  }, [onChange])

  const handleDob = useCallback((e) => {
    const val = e.target.value
    // Set validity messages inline (native a11y + form UX)
    if (val && (val < minDob || val > maxDob)) {
      e.target.setCustomValidity(`Please enter a valid date of birth between ${minDob} and ${maxDob}.`)
    } else {
      e.target.setCustomValidity('')
    }
    onChange?.('dob', val)
  }, [onChange, minDob, maxDob])

  const handleProfilePic = useCallback(async (file) => {
    if (!file) return

    // Guard: basic size/type checks before any upload
    const MAX_MB = 6
    const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const tooBig = file.size > MAX_MB * 1024 * 1024
    const badType = file.type && !OK_TYPES.includes(file.type.toLowerCase())

    if (tooBig || badType) {
      // Let UploadField show the inline error if it supports it,
      // otherwise we can set a temporary message here (kept minimal).
      alert(
        tooBig
          ? `Please choose an image under ${MAX_MB}MB.`
          : 'Unsupported image type. Use JPG/PNG/WebP.'
      )
      return
    }

    if (typeof onUpload === 'function') {
      await onUpload(file, 'profilePics', 'profilePicUrl')
      return
    }

    // Fallback: local preview so UI still feels responsive
    const url = URL.createObjectURL(file)
    onChange?.('profilePicUrl', url)
  }, [onChange, onUpload])

  const clearPhoto = useCallback(() => {
    onChange?.('profilePicUrl', '')
    // Also clear the hidden input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onChange])

  return (
    <section className={s.section} aria-labelledby="basic-info-h3">
      <h3 id="basic-info-h3" className={s.h3}>Basic Info</h3>

      {/* Name */}
      <Field label="Full Name" required hint="Use your legal name for enrollment & compliance.">
        <input
          className="input"
          type="text"
          placeholder="e.g., Alex Johnson"
          value={value.name || ''}
          onChange={handleName}
          autoComplete="name"
          autoCapitalize="words"
          inputMode="text"
          required
          aria-describedby="name-help"
        />
        <small id="name-help" className={f.hint}>
          This will appear on your school profile and forms.
        </small>
      </Field>

      {/* DOB */}
      <Field
        label="Date of Birth"
        required
        hint={`Allowed range: ${minDob} → ${maxDob}`}
      >
        <input
          className="input"
          type="date"
          value={value.dob || ''}
          onChange={handleDob}
          min={minDob}
          max={maxDob}
          required
          aria-describedby="dob-help"
        />
        <small id="dob-help" className={f.hint}>
          Used for enrollment & compliance forms.
        </small>
      </Field>

      {/* Profile Photo (optional but encouraged) */}
      <div className={f.field}>
        <span className={f.label}>Profile Photo <span className={f.optional}>(optional)</span></span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <UploadField
            label={preview ? 'Change image' : 'Choose image'}
            accept="image/*"
            preview={preview}
            onSelect={handleProfilePic}
            // Optional: constrain preview look via props your UploadField supports
            // shape="rounded" size={88}
          />
          {preview ? (
            <button type="button" className="btn outline" onClick={clearPhoto}>
              Remove
            </button>
          ) : null}
        </div>

        <small className={f.hint}>
          JPG/PNG/WebP, under 6MB. A clear face photo helps instructors recognize you.
        </small>

        {/* Hidden input reference so we can reset it on clear (UploadField holds its own input) */}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} />
      </div>
    </section>
  )
}