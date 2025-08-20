// src/admin/settings/sections/Billing.jsx
// ======================================================================
// Admin Settings — Billing Section
// - Uses useAdminSettings VM + useBillingSettings subhook (vm-injected)
// - Local controlled form bound to subhook.draft
// - Dirty tracking, Reset, and Save with proper disable states
// - A11y labels + predictable ids (for CSS modules later)
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'

import { useBillingSettings } from '../hooks/subhooks/useBillingSettings.js'
import { useAdminSettings } from '../hooks/useAdminSettings.js'

import styles from './Section.module.css'

export default function Billing() {
  // VM = source of truth for brand/prefs and actions
  const vm = useAdminSettings()
  const { loading: vmLoading, schoolId } = vm

  // Subhook for this section’s slice (KEY = "billing")
  const { draft, update, save } = useBillingSettings({ vm })

  // Local form state (keeps inputs snappy; syncs when draft changes)
  const [form, setForm] = useState(draft)
  useEffect(() => setForm(draft), [draft])

  // Derived states
  const isReady = Boolean(schoolId) && !vmLoading
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(draft), [form, draft])

  // Handlers
  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    const v = type === 'checkbox' ? checked : value
    setForm(prev => ({ ...prev, [name]: v }))
  }

  const onSave = async () => {
    // Push local form → subhook.draft → persisted via vm.actions.save
    // (update keeps internal draft in sync for other parts of the UI)
    update(form)
    await save(form)
  }

  const onReset = () => setForm(draft)

  if (!schoolId) {
    return (
      <div className={styles.section} role="region" aria-live="polite">
        <div className={styles.sectionError}>No school selected. Billing settings unavailable.</div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className={styles.section} role="region" aria-live="polite">
        <div className={styles.loading}>Loading billing settings…</div>
      </div>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="billing-heading">
      <h2 id="billing-heading" className={styles.heading}>Billing Settings</h2>
      <p className={styles.description}>
        Configure how billing works for your school. These preferences affect invoice defaults
        and behavior across your Billing pages.
      </p>

      {/* Billing Mode */}
      <div className={styles.fieldGroup}>
        <label htmlFor="billing-mode" className={styles.label}>Billing Mode</label>
        <select
          id="billing-mode"
          name="mode"
          value={form.mode ?? 'employer'} // 'student' | 'employer'
          onChange={onChange}
          className={styles.select}
          disabled={vmLoading}
        >
          <option value="student">Direct: Student pays</option>
          <option value="employer">Employer billed</option>
        </select>
        <small className={styles.help}>
          Choose who receives invoices by default. You can still override per invoice.
        </small>
      </div>

      {/* Currency */}
      <div className={styles.fieldGroup}>
        <label htmlFor="billing-currency" className={styles.label}>Currency</label>
        <input
          id="billing-currency"
          type="text"
          name="currency"
          value={form.currency ?? 'USD'}
          onChange={onChange}
          className={styles.input}
          placeholder="USD"
          inputMode="text"
          autoCapitalize="characters"
          disabled={vmLoading}
        />
        <small className={styles.help}>
          ISO currency code (e.g., USD, CAD). Used for formatting totals in exports and invoices.
        </small>
      </div>

      {/* Invoice Prefix */}
      <div className={styles.fieldGroup}>
        <label htmlFor="billing-prefix" className={styles.label}>Invoice Prefix</label>
        <input
          id="billing-prefix"
          type="text"
          name="invoicePrefix"
          value={form.invoicePrefix ?? ''}
          onChange={onChange}
          className={styles.input}
          placeholder="e.g. CDL-"
          disabled={vmLoading}
        />
        <small className={styles.help}>
          Useful to distinguish invoice numbers across multiple schools.
        </small>
      </div>

      {/* Accepted Methods / Terms (if you want to surface them) */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Accepted Payment Methods</label>
        <div className={styles.row}>
          <label className={styles.check}>
            <input
              type="checkbox"
              name="acceptedMethods_card"
              checked={!!(form.acceptedMethods || []).includes('card')}
              onChange={(e) => {
                const has = new Set(form.acceptedMethods || [])
                e.target.checked ? has.add('card') : has.delete('card')
                setForm(prev => ({ ...prev, acceptedMethods: Array.from(has) }))
              }}
              disabled={vmLoading}
            />
            <span>Card</span>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              name="acceptedMethods_ach"
              checked={!!(form.acceptedMethods || []).includes('ach')}
              onChange={(e) => {
                const has = new Set(form.acceptedMethods || [])
                e.target.checked ? has.add('ach') : has.delete('ach')
                setForm(prev => ({ ...prev, acceptedMethods: Array.from(has) }))
              }}
              disabled={vmLoading}
            />
            <span>Bank transfer (ACH)</span>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              name="acceptedMethods_cash"
              checked={!!(form.acceptedMethods || []).includes('cash')}
              onChange={(e) => {
                const has = new Set(form.acceptedMethods || [])
                e.target.checked ? has.add('cash') : has.delete('cash')
                setForm(prev => ({ ...prev, acceptedMethods: Array.from(has) }))
              }}
              disabled={vmLoading}
            />
            <span>Cash/Check</span>
          </label>
        </div>
        <small className={styles.help}>
          These are defaults—actual options may be limited by your processor integration.
        </small>
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="billing-netdays" className={styles.label}>Default Terms (NET)</label>
        <input
          id="billing-netdays"
          type="number"
          name="defaultTermsNetDays"
          value={form.defaultTermsNetDays ?? 15}
          onChange={onChange}
          className={styles.input}
          min={0}
          step={1}
          disabled={vmLoading}
        />
        <small className={styles.help}>
          The default due date offset for new invoices (in days).
        </small>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={`btn outline ${styles.actionBtn}`}
          onClick={onReset}
          disabled={!isDirty || vmLoading}
          aria-disabled={!isDirty || vmLoading}
          title={!isDirty ? 'No changes to reset' : 'Reset unsaved changes'}
        >
          Reset
        </button>
        <button
          type="button"
          className={`btn ${styles.saveButton}`}
          onClick={onSave}
          disabled={!isDirty || vmLoading}
          aria-disabled={!isDirty || vmLoading}
          title={!isDirty ? 'No changes to save' : 'Save changes'}
        >
          Save Billing Settings
        </button>
      </div>
    </section>
  )
}