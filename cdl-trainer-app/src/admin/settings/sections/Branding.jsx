// src/admin/settings/sections/Branding.jsx
// ======================================================================
// Admin Settings — Branding Section
// - Uses vm + useBrandingSettings({ vm })
// - Local form state with dirty tracking, reset, and save
// - Color input + live swatch, logo URL preview
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'
import { useBrandingSettings } from '../hooks/subhooks/useBrandingSettings.js'
import styles from './Section.module.css'

// simple hex color guard (#RGB / #RRGGBB)
const isHex = (v) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || '').trim())

export default function Branding({ vm }) {
  const b = useBrandingSettings({ vm })

  // mirror subhook draft into a local form (snappier typing)
  const [form, setForm] = useState(() => ({
    schoolName: b.schoolName || '',
    primaryColor: b.primaryColor || '#005f73',
    logoUrl: b.logoUrl || '',
  }))

  // keep form in sync if the underlying draft changes
  useEffect(() => {
    setForm({
      schoolName: b.schoolName || '',
      primaryColor: b.primaryColor || '#005f73',
      logoUrl: b.logoUrl || '',
    })
  }, [b.schoolName, b.primaryColor, b.logoUrl])

  const isDirty = useMemo(
    () =>
      JSON.stringify({ schoolName: b.schoolName || '', primaryColor: b.primaryColor || '#005f73', logoUrl: b.logoUrl || '' }) !==
      JSON.stringify(form),
    [b.schoolName, b.primaryColor, b.logoUrl, form]
  )

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onPickColor = (e) => {
    setForm((prev) => ({ ...prev, primaryColor: e.target.value }))
  }

  const onSave = async () => {
    // push local form into subhook draft and persist
    b.update(form)
    await b.save(form)
  }

  const onReset = () =>
    setForm({
      schoolName: b.schoolName || '',
      primaryColor: b.primaryColor || '#005f73',
      logoUrl: b.logoUrl || '',
    })

  const colorValid = isHex(form.primaryColor)

  return (
    <section className={styles.section} aria-labelledby="branding-heading">
      <h2 id="branding-heading" className={styles.heading}>Branding</h2>
      <p className={styles.description}>
        Customize how your school appears in the app and on documents.
      </p>

      {/* School name */}
      <div className={styles.fieldGroup}>
        <label htmlFor="branding-school" className={styles.label}>School Name</label>
        <input
          id="branding-school"
          name="schoolName"
          type="text"
          value={form.schoolName}
          onChange={onChange}
          className={styles.input}
          placeholder="e.g., Coastal CDL Academy"
        />
      </div>

      {/* Primary color with live swatch + color picker */}
      <div className={styles.fieldGroup}>
        <label htmlFor="branding-color" className={styles.label}>Primary Color</label>
        <div className={styles.row} style={{ alignItems: 'center', gap: 8 }}>
          <input
            id="branding-color"
            name="primaryColor"
            type="text"
            value={form.primaryColor}
            onChange={onChange}
            className={styles.input}
            placeholder="#005f73"
            aria-invalid={!colorValid}
            style={{ maxWidth: 160 }}
          />
          <input
            aria-label="Pick primary color"
            type="color"
            value={colorValid ? form.primaryColor : '#005f73'}
            onChange={onPickColor}
            className={styles.colorInput}
          />
          <span
            aria-hidden="true"
            title={colorValid ? form.primaryColor : 'Invalid color'}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #2b2b2b',
              background: colorValid ? form.primaryColor : 'transparent',
              boxShadow: 'inset 0 0 0 1px #00000022',
            }}
          />
        </div>
        {!colorValid && (
          <small className={styles.errorText}>Enter a valid hex color like #0ea5e9 or #0ae.</small>
        )}
      </div>

      {/* Logo URL preview */}
      <div className={styles.fieldGroup}>
        <label htmlFor="branding-logo" className={styles.label}>Logo URL</label>
        <input
          id="branding-logo"
          name="logoUrl"
          type="url"
          value={form.logoUrl}
          onChange={onChange}
          className={styles.input}
          placeholder="https://…/your-logo.png"
        />
        {form.logoUrl ? (
          <div className={styles.previewRow}>
            <img
              src={form.logoUrl}
              alt="School logo preview"
              style={{ height: 60, marginTop: 8, borderRadius: 8 }}
              onError={(e) => { e.currentTarget.style.opacity = 0.5 }}
            />
          </div>
        ) : (
          <small className={styles.help}>Tip: paste an image URL to preview your logo.</small>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={`btn outline ${styles.actionBtn}`}
          onClick={onReset}
          disabled={!isDirty}
          aria-disabled={!isDirty}
          title={!isDirty ? 'No changes to reset' : 'Reset unsaved changes'}
        >
          Reset
        </button>
        <button
          type="button"
          className={`btn ${styles.saveButton}`}
          onClick={onSave}
          disabled={!isDirty || !colorValid}
          aria-disabled={!isDirty || !colorValid}
          title={!isDirty ? 'No changes to save' : (colorValid ? 'Save changes' : 'Fix color first')}
        >
          Save Branding
        </button>
      </div>
    </section>
  )
}