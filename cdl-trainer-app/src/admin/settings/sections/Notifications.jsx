// src/admin/settings/sections/Notifications.jsx
// ======================================================================
// Admin Settings — Notifications Section
// - Uses useNotificationsSettings({ vm }) for read/write
// - Toggle channels + weekly digest
// - Local form state, dirty tracking, reset & save
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'

import { useNotificationsSettings } from '../hooks/subhooks/useNotificationsSettings.js'

import styles from './Section.module.css'

export default function Notifications({ vm }) {
  const n = useNotificationsSettings({ vm })

  // Mirror subhook draft into local form for snappy edits
  const [form, setForm] = useState(() => ({
    email: !!n.draft.email,
    sms: !!n.draft.sms,
    weeklyDigest: !!n.draft.weeklyDigest,
  }))

  // Keep local form in sync when prefs reload
  useEffect(() => {
    setForm({
      email: !!n.draft.email,
      sms: !!n.draft.sms,
      weeklyDigest: !!n.draft.weeklyDigest,
    })
  }, [n.draft.email, n.draft.sms, n.draft.weeklyDigest])

  const isDirty = useMemo(() => {
    return (
      form.email !== !!n.draft.email ||
      form.sms !== !!n.draft.sms ||
      form.weeklyDigest !== !!n.draft.weeklyDigest
    )
  }, [form, n.draft])

  const toggle = key => setForm(prev => ({ ...prev, [key]: !prev[key] }))

  const onReset = () => {
    setForm({
      email: !!n.draft.email,
      sms: !!n.draft.sms,
      weeklyDigest: !!n.draft.weeklyDigest,
    })
  }

  const onSave = async () => {
    const payload = {
      email: !!form.email,
      sms: !!form.sms,
      weeklyDigest: !!form.weeklyDigest,
    }
    n.update(payload)
    await n.save(payload)
  }

  return (
    <section className={styles.section} aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className={styles.heading}>
        Notifications
      </h2>
      <p className={styles.description}>
        Choose how your school receives important updates and summaries.
      </p>

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.email}
            onChange={() => toggle('email')}
          />
          <span>Email alerts</span>
        </label>
        <small className={styles.help}>
          Enrollment changes, expiring permits/med cards, payment events.
        </small>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.sms}
            onChange={() => toggle('sms')}
          />
          <span>SMS alerts</span>
        </label>
        <small className={styles.help}>
          Requires a verified texting number (Twilio/other). Carrier fees may
          apply.
        </small>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.weeklyDigest}
            onChange={() => toggle('weeklyDigest')}
          />
          <span>Weekly digest (email)</span>
        </label>
        <small className={styles.help}>
          A concise summary of activity and upcoming expirations every Monday.
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
          Save Notification Settings
        </button>
      </div>
    </section>
  )
}
