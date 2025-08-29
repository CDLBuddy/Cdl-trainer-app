// src/student/profile/sections/BasicInfoSection.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Field from '../ui/Field.jsx'
import ui from '../ui/fields.module.css'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import s from './sections.module.css'

/**
 * BasicInfoSection (canonicalized)
 * Props:
 * - value:  {
 *     name, firstName?, lastName?, dob, profilePicUrl,
 *     verified?: { by?: string, at?: string }
 *   }
 * - onChange: (key, value) => void
 * - onUpload?: (file, path, field, checklistFn?) => Promise<void>
 * - minAgeYears?: number   // default 15
 * - maxAgeYears?: number   // default 90
 */

// --- tiny helpers -----------------------------------------------------------
const norm = s =>
  String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
const joinNames = (first, last) => norm([first, last].filter(Boolean).join(' '))

// naive splitter that handles middle names & suffixes reasonably
const splitFullName = full => {
  const parts = norm(full).split(' ')
  if (parts.length === 0 || !parts[0]) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  const suffixes = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv'])
  const first = parts[0]
  let last = parts.slice(1).join(' ')
  // keep suffix with last
  const tail = parts[parts.length - 1].toLowerCase()
  if (suffixes.has(tail) && parts.length > 2) {
    last = parts.slice(1).join(' ')
  }
  return { first, last }
}

export default function BasicInfoSection({
  value = {},
  onChange,
  onUpload,
  minAgeYears = 15,
  maxAgeYears = 90,
}) {
  const [dobInvalid, setDobInvalid] = useState(false)

  // --- Derive missing first/last from existing name (one-time back-compat) ---
  useEffect(() => {
    if (!value) return
    const hasCanon = norm(value.firstName) || norm(value.lastName)
    const full = norm(value.name)
    if (!hasCanon && full) {
      const { first, last } = splitFullName(full)
      if (first) onChange?.('firstName', first)
      if (last) onChange?.('lastName', last)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once

  // --- Derived DOB bounds (YYYY-MM-DD) --------------------------------------
  const { minDob, maxDob } = useMemo(() => {
    const today = new Date()
    const toISO = d => d.toISOString().slice(0, 10)

    const youngest = new Date(today)
    youngest.setFullYear(youngest.getFullYear() - minAgeYears)

    const oldest = new Date(today)
    oldest.setFullYear(oldest.getFullYear() - maxAgeYears)

    return { minDob: toISO(oldest), maxDob: toISO(youngest) }
  }, [minAgeYears, maxAgeYears])

  // --- Section status (chips) -----------------------------------------------
  const status = useMemo(
    () => getSectionStatus('basicInfo', value, value?.verified || {}),
    [value]
  )
  const verifiedBy = value?.verified?.by
  const verifiedAt = value?.verified?.at

  // --- Handlers --------------------------------------------------------------
  const handleFirst = useCallback(
    e => {
      const first = norm(e.target.value)
      const last = norm(value.lastName || '')
      onChange?.('firstName', first)
      onChange?.('name', joinNames(first, last)) // keep full in sync
    },
    [onChange, value.lastName]
  )

  const handleLast = useCallback(
    e => {
      const last = norm(e.target.value)
      const first = norm(value.firstName || '')
      onChange?.('lastName', last)
      onChange?.('name', joinNames(first, last)) // keep full in sync
    },
    [onChange, value.firstName]
  )

  const handleFullNameManual = useCallback(
    e => {
      // Allow editing full name if you want — we still push into first/last
      const full = norm(e.target.value)
      onChange?.('name', full)
      const { first, last } = splitFullName(full)
      if (first) onChange?.('firstName', first)
      if (last || value.lastName) onChange?.('lastName', last)
    },
    [onChange, value.lastName]
  )

  const handleDob = useCallback(
    e => {
      const val = e.target.value
      const isOutOfRange = !!val && (val < minDob || val > maxDob)
      setDobInvalid(isOutOfRange)
      if (isOutOfRange) {
        e.target.setCustomValidity(
          `Enter a valid birth date between ${minDob} and ${maxDob}.`
        )
      } else {
        e.target.setCustomValidity('')
      }
      onChange?.('dob', val)
    },
    [onChange, minDob, maxDob]
  )

  const handleProfilePic = useCallback(
    async file => {
      if (!file) return
      if (typeof onUpload === 'function') {
        await onUpload(file, 'students/profile', 'profilePicUrl')
      } else {
        const url = URL.createObjectURL(file)
        onChange?.('profilePicUrl', url)
      }
    },
    [onUpload, onChange]
  )

  const firstName = value.firstName || ''
  const lastName = value.lastName || ''
  const fullName = value.name || joinNames(firstName, lastName)

  return (
    <section
      id="basicInfo"
      className={s.section}
      aria-labelledby="basic-info-h3"
    >
      <SectionHeader
        title="Basic Information"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      {/* Name (canonical fields) */}
      <div className={s.row2}>
        <Field label="First name" required hint="Use your legal first name.">
          <input
            className={ui.input}
            id="profile_first"
            type="text"
            placeholder="e.g., Alex"
            value={firstName}
            onChange={handleFirst}
            autoComplete="given-name"
            autoCapitalize="words"
            inputMode="text"
            required
          />
        </Field>

        <Field label="Last name" required hint="Use your legal last name.">
          <input
            className={ui.input}
            id="profile_last"
            type="text"
            placeholder="e.g., Johnson"
            value={lastName}
            onChange={handleLast}
            autoComplete="family-name"
            autoCapitalize="words"
            inputMode="text"
            required
          />
        </Field>
      </div>

      {/* Full legal name (stays in sync; editable for convenience) */}
      <Field
        label="Full legal name"
        required
        hint="Appears on enrollment and compliance forms."
      >
        <input
          className={ui.input}
          id="profile_name"
          type="text"
          placeholder="Alex Johnson"
          value={fullName}
          onChange={handleFullNameManual}
          autoComplete="name"
          autoCapitalize="words"
          inputMode="text"
          required
          aria-describedby="name_help"
        />
        <small id="name_help" className={ui.hint}>
          We’ll keep this in sync with your first/last name.
        </small>
      </Field>

      {/* DOB */}
      <Field
        label="Date of birth"
        required
        hint={`Allowed range: ${minDob} → ${maxDob}`}
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

      {/* Profile Photo (optional) */}
      <div className={ui.field}>
        <span className={ui.label}>
          Profile photo <span className={ui.optional}>(optional)</span>
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
          JPG/PNG/WebP, under 8&nbsp;MB. A clear face photo helps instructors
          recognize you.
        </small>
      </div>
    </section>
  )
}
