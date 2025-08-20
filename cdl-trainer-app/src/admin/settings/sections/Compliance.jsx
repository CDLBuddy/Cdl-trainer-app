// src/admin/settings/sections/Compliance.jsx
// ======================================================================
// Admin Settings — Compliance Section
// - Uses useComplianceSettings({ vm }) for read/write
// - Configure required docs + reminder window
// - Local form state, dirty tracking, reset & save
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'

import { useComplianceSettings } from '../hooks/subhooks/useComplianceSettings.js'

import styles from './Section.module.css'

// A small set of sensible defaults to offer as quick toggles
const COMMON_DOCS = [
  'insurance',
  'bonding',
  'liability waiver',
  'drug screening',
  'driver roster',
]

export default function Compliance({ vm }) {
  const c = useComplianceSettings({ vm })

  // mirror subhook draft into a local form for snappy typing
  const [form, setForm] = useState(() => ({
    requiredDocs: Array.isArray(c.draft.requiredDocs) ? c.draft.requiredDocs : [],
    notifyBeforeDays:
      Number.isFinite(c.draft.notifyBeforeDays) ? c.draft.notifyBeforeDays : 30,
  }))

  // keep local form in sync when prefs reload externally
  useEffect(() => {
    setForm({
      requiredDocs: Array.isArray(c.draft.requiredDocs) ? c.draft.requiredDocs : [],
      notifyBeforeDays:
        Number.isFinite(c.draft.notifyBeforeDays) ? c.draft.notifyBeforeDays : 30,
    })
  }, [c.draft.requiredDocs, c.draft.notifyBeforeDays])

  const isDirty = useMemo(() => {
    const a = JSON.stringify({
      requiredDocs: form.requiredDocs.slice().sort(),
      notifyBeforeDays: Number(form.notifyBeforeDays) || 0,
    })
    const b = JSON.stringify({
      requiredDocs: (Array.isArray(c.draft.requiredDocs) ? c.draft.requiredDocs : []).slice().sort(),
      notifyBeforeDays: Number(c.draft.notifyBeforeDays) || 0,
    })
    return a !== b
  }, [form, c.draft])

  const allDocOptions = useMemo(() => {
    const set = new Set([...(c.draft.requiredDocs || []), ...COMMON_DOCS])
    return Array.from(set)
  }, [c.draft.requiredDocs])

  // ---------- handlers ---------------------------------------------------

  const toggleDoc = (docKey) => {
    setForm((prev) => {
      const set = new Set(prev.requiredDocs || [])
      if (set.has(docKey)) set.delete(docKey)
      else set.add(docKey)
      return { ...prev, requiredDocs: Array.from(set) }
    })
  }

  const [customDoc, setCustomDoc] = useState('')
  const addCustomDoc = () => {
    const key = customDoc.trim()
    if (!key) return
    setForm((prev) => {
      const set = new Set(prev.requiredDocs || [])
      set.add(key)
      return { ...prev, requiredDocs: Array.from(set) }
    })
    setCustomDoc('')
  }

  const onChangeDays = (e) => {
    const val = e.target.value
    // allow empty string while typing; clamp later on save
    setForm((prev) => ({ ...prev, notifyBeforeDays: val }))
  }

  const onReset = () =>
    setForm({
      requiredDocs: Array.isArray(c.draft.requiredDocs) ? c.draft.requiredDocs : [],
      notifyBeforeDays:
        Number.isFinite(c.draft.notifyBeforeDays) ? c.draft.notifyBeforeDays : 30,
    })

  const onSave = async () => {
    // sanitize before saving
    const cleanDays = Math.max(0, Math.min(365, Number(form.notifyBeforeDays) || 0))
    const uniqDocs = Array.from(new Set((form.requiredDocs || []).map(String))).filter(Boolean)
    const payload = { requiredDocs: uniqDocs, notifyBeforeDays: cleanDays }
    c.update(payload)
    await c.save(payload)
  }

  // ---------- render -----------------------------------------------------

  return (
    <section className={styles.section} aria-labelledby="compliance-heading">
      <h2 id="compliance-heading" className={styles.heading}>Compliance</h2>
      <p className={styles.description}>
        Choose which documents are required for your school and when admins should be reminded
        before they expire.
      </p>

      {/* Required documents */}
      <div className={styles.fieldGroup}>
        <label
          className={styles.label}
          htmlFor={
            allDocOptions.length > 0
              ? `doc-${allDocOptions[0].replace(/\s+/g, '-').toLowerCase()}`
              : 'custom-doc-input'
          }
        >
          Required Documents
        </label>
        <div className={styles.listGrid}>
          {allDocOptions.map((doc) => {
            const id = `doc-${doc.replace(/\s+/g, '-').toLowerCase()}`
            const checked = (form.requiredDocs || []).includes(doc)
            return (
              <label key={doc} htmlFor={id} className={styles.checkboxRow}>
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDoc(doc)}
                />
                <span>{doc}</span>
              </label>
            )
          })}
        </div>

        {/* Add custom doc */}
        <div className={styles.row} style={{ gap: 8, marginTop: 8 }}>
          <input
            type="text"
            value={customDoc}
            onChange={(e) => setCustomDoc(e.target.value)}
            placeholder="Add custom requirement (e.g., MVR pull)"
            className={styles.input}
            aria-label="Custom document name"
          />
          <button type="button" className={`btn ${styles.actionBtn}`} onClick={addCustomDoc}>
            Add
          </button>
        </div>
        <small className={styles.help}>
          These requirements are used across enrollment and compliance reports.
        </small>
      </div>

      {/* Reminder window */}
      <div className={styles.fieldGroup}>
        <label htmlFor="notify-days" className={styles.label}>
          Reminder Window (days before expiry)
        </label>
        <input
          id="notify-days"
          type="number"
          min={0}
          max={365}
          inputMode="numeric"
          className={styles.input}
          value={form.notifyBeforeDays}
          onChange={onChangeDays}
          style={{ maxWidth: 140 }}
        />
        <small className={styles.help}>
          We’ll flag items expiring within this window in dashboards and exports.
        </small>
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
          disabled={!isDirty}
          aria-disabled={!isDirty}
          title={!isDirty ? 'No changes to save' : 'Save changes'}
        >
          Save Compliance
        </button>
      </div>
    </section>
  )
}