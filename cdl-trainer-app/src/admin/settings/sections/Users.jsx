// src/admin/settings/sections/Users.jsx
// ======================================================================
// Admin Settings — Users & Roles
// - Ties into useUsersSettings({ vm })
// - Configure default role, invite template, and gating rules
// - Dirty tracking, reset, and save actions
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'

import { useUsersSettings } from '../hooks/subhooks/useUsersSettings.js'

import styles from './Section.module.css'

const ROLE_OPTIONS = [
  { value: 'student',    label: 'Student' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'admin',      label: 'Admin' },
]

const TEMPLATE_OPTIONS = [
  { value: 'default',   label: 'Default (recommended)' },
  { value: 'concise',   label: 'Concise' },
  { value: 'detailed',  label: 'Detailed' },
  { value: 'custom-1',  label: 'Custom #1' },
]

export default function Users({ vm }) {
  const u = useUsersSettings({ vm })

  // Local form mirrors subhook draft for snappy edits
  const [form, setForm] = useState(() => ({
    defaultRole: u.draft.defaultRole || 'student',
    inviteEmailTemplate: u.draft.inviteEmailTemplate || 'default',
    requireProfileBeforeEnroll: !!u.draft.requireProfileBeforeEnroll,
  }))

  // Keep local form in sync if prefs reload from server
  useEffect(() => {
    setForm({
      defaultRole: u.draft.defaultRole || 'student',
      inviteEmailTemplate: u.draft.inviteEmailTemplate || 'default',
      requireProfileBeforeEnroll: !!u.draft.requireProfileBeforeEnroll,
    })
  }, [u.draft.defaultRole, u.draft.inviteEmailTemplate, u.draft.requireProfileBeforeEnroll])

  const isDirty = useMemo(() => {
    return (
      form.defaultRole !== (u.draft.defaultRole || 'student') ||
      form.inviteEmailTemplate !== (u.draft.inviteEmailTemplate || 'default') ||
      form.requireProfileBeforeEnroll !== !!u.draft.requireProfileBeforeEnroll
    )
  }, [form, u.draft])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const onReset = () => {
    setForm({
      defaultRole: u.draft.defaultRole || 'student',
      inviteEmailTemplate: u.draft.inviteEmailTemplate || 'default',
      requireProfileBeforeEnroll: !!u.draft.requireProfileBeforeEnroll,
    })
  }

  const onSave = async () => {
    const payload = {
      defaultRole: form.defaultRole,
      inviteEmailTemplate: form.inviteEmailTemplate,
      requireProfileBeforeEnroll: !!form.requireProfileBeforeEnroll,
    }
    u.update(payload)
    await u.save(payload)
  }

  return (
    <section className={styles.section} aria-labelledby="users-heading">
      <h2 id="users-heading" className={styles.heading}>Users &amp; Roles</h2>
      <p className={styles.description}>
        Control the default role for new invites, the email template used,
        and whether students must complete a profile before enrollment.
      </p>

      {/* Default Role */}
      <div className={styles.fieldGroup}>
        <label htmlFor="users-default-role" className={styles.label}>
          Default role for new users
        </label>
        <select
          id="users-default-role"
          name="defaultRole"
          value={form.defaultRole}
          onChange={onChange}
          className={styles.select}
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <small className={styles.help}>
          Used when inviting users from the Admin &rarr; Users page.
          You can still change a user’s role later.
        </small>
      </div>

      {/* Invite Template */}
      <div className={styles.fieldGroup}>
        <label htmlFor="users-invite-template" className={styles.label}>
          Invite email template
        </label>
        <select
          id="users-invite-template"
          name="inviteEmailTemplate"
          value={form.inviteEmailTemplate}
          onChange={onChange}
          className={styles.select}
        >
          {TEMPLATE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <small className={styles.help}>
          Choose the tone and length of the invitation email. You can add custom
          templates later in the superadmin panel.
        </small>
      </div>

      {/* Require profile before enrollment */}
      <div className={styles.fieldGroup}>
        <label className={styles.checkboxRow} htmlFor="users-require-profile">
          <input
            id="users-require-profile"
            type="checkbox"
            name="requireProfileBeforeEnroll"
            checked={form.requireProfileBeforeEnroll}
            onChange={onChange}
          />
          <span>Require student profile before enrollment</span>
        </label>
        <small className={styles.help}>
          Students must complete required profile fields before they can be assigned
          to a class or added to ELDT modules.
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
          Save Users Settings
        </button>
      </div>
    </section>
  )
}