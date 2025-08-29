// src/admin/settings/sections/Courses.jsx
// ======================================================================
// Admin Settings — Courses Section
// - Uses useCoursesSettings({ vm }) for read/write
// - Toggle which course experiences are enabled for this school
// - Local form state, dirty tracking, reset & save
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'

import { useCoursesSettings } from '../hooks/subhooks/useCoursesSettings.js'

import styles from './Section.module.css'

export default function Courses({ vm }) {
  const c = useCoursesSettings({ vm })

  // Mirror subhook draft into local form for snappy typing
  const [form, setForm] = useState(() => ({
    enableELDT: !!c.draft.enableELDT,
    enablePractice: !!c.draft.enablePractice,
    enableWalkthrough: !!c.draft.enableWalkthrough,
  }))

  // Keep local form in sync if prefs reload externally
  useEffect(() => {
    setForm({
      enableELDT: !!c.draft.enableELDT,
      enablePractice: !!c.draft.enablePractice,
      enableWalkthrough: !!c.draft.enableWalkthrough,
    })
  }, [c.draft.enableELDT, c.draft.enablePractice, c.draft.enableWalkthrough])

  const isDirty = useMemo(() => {
    return (
      form.enableELDT !== !!c.draft.enableELDT ||
      form.enablePractice !== !!c.draft.enablePractice ||
      form.enableWalkthrough !== !!c.draft.enableWalkthrough
    )
  }, [form, c.draft])

  // Handlers
  const toggle = key => setForm(prev => ({ ...prev, [key]: !prev[key] }))

  const onReset = () =>
    setForm({
      enableELDT: !!c.draft.enableELDT,
      enablePractice: !!c.draft.enablePractice,
      enableWalkthrough: !!c.draft.enableWalkthrough,
    })

  const onSave = async () => {
    const payload = {
      enableELDT: !!form.enableELDT,
      enablePractice: !!form.enablePractice,
      enableWalkthrough: !!form.enableWalkthrough,
    }
    c.update(payload)
    await c.save(payload)
  }

  return (
    <section className={styles.section} aria-labelledby="courses-heading">
      <h2 id="courses-heading" className={styles.heading}>
        Courses
      </h2>
      <p className={styles.description}>
        Choose which learning experiences are available to your students.
      </p>

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.enableELDT}
            onChange={() => toggle('enableELDT')}
          />
          <span>ELDT (theory & records)</span>
        </label>
        <small className={styles.help}>
          Enables ELDT theory modules and completion reporting.
        </small>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.enablePractice}
            onChange={() => toggle('enablePractice')}
          />
          <span>Practice Tests</span>
        </label>
        <small className={styles.help}>
          Unlocks test engine, practice banks, and results.
        </small>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.enableWalkthrough}
            onChange={() => toggle('enableWalkthrough')}
          />
          <span>Walkthrough / Pre-Trip</span>
        </label>
        <small className={styles.help}>
          Provides guided pre-trip walkthroughs and checklists.
        </small>
      </div>

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
          Save Course Settings
        </button>
      </div>
    </section>
  )
}
