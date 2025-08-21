// Path: src/admin/companies/add-company/useAddCompanyForm.js
// ============================================================================
// useAddCompanyForm
// - Local form state for AddCompanyDrawer
// - Trims inputs, validates, prevents double-submits
// - Optional duplicate-name check if your services expose it
// - Clean return API: values/errors/saving + helpers (update, setMany, reset, canSubmit, submit)
// ============================================================================

import { useCallback, useMemo, useState } from 'react'

import { saveCompany } from '@admin/companies/add-company/services/index.js'
import { existsByNameInSchool as _existsByNameInSchool } from '@admin/companies/services/index.js'

import { toCompanyPayload } from './utils/transforms.js'
import { validateCompany } from './utils/validations.js'

/**
 * @typedef {{ name: string, billingMode: 'employer'|'individual', contactEmail: string }} CompanyFormValues
 */

/**
 * @param {{
 *   onSaved?: (saved: any) => void,
 *   onError?: (message: string, err?: unknown) => void,
 *   /** Optional context for duplicate checks / audit fields *\/
 *   schoolId?: string,
 *   actorEmail?: string,
 * }} options
 */
export default function useAddCompanyForm({ onSaved, onError, schoolId, actorEmail } = {}) {
  const [values, setValues] = useState(/** @type {CompanyFormValues} */({
    name: '',
    billingMode: 'employer',
    contactEmail: '',
  }))
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */({}))
  const [saving, setSaving] = useState(false)

  // ------------- helpers ----------------------------------------------------

  /** Replace a single field value; clears that field's error, if present. */
  const update = useCallback((field, v) => {
    setValues((s) => ({ ...s, [field]: v }))
    setErrors((e) => (e[field] ? { ...e, [field]: '' } : e))
  }, [])

  /** Shallow-merge many values at once (does not clear errors automatically). */
  const setMany = useCallback((patch) => {
    setValues((s) => ({ ...s, ...patch }))
  }, [])

  /** Reset to pristine defaults. */
  const reset = useCallback(() => {
    setValues({ name: '', billingMode: 'employer', contactEmail: '' })
    setErrors({})
    setSaving(false)
  }, [])

  /** Derived button gate. */
  const canSubmit = useMemo(
    () => !saving && !!values.name.trim(),
    [saving, values.name]
  )

  // ------------- submit -----------------------------------------------------

  const submit = useCallback(async () => {
    // normalize inputs before validation
    const cleaned = {
      name: (values.name || '').trim(),
      billingMode: (values.billingMode || 'employer').toLowerCase(),
      contactEmail: (values.contactEmail || '').trim(),
    }

    const errs = validateCompany(cleaned, { schoolId })
    setErrors(errs)
    if (Object.keys(errs).some((k) => !!errs[k])) return false

    // Optional duplicate-name check if service is exported
    try {
      if (schoolId && typeof _existsByNameInSchool === 'function') {
        // If the function is present, use it; otherwise skip silently.
         
        const already = await _existsByNameInSchool(schoolId, cleaned.name)
        if (already) {
          setErrors((e) => ({ ...e, name: 'A company with this name already exists.' }))
          return false
        }
      }
    } catch {
      // Non-fatal: allow creation to continue if the duplicate check fails (network, etc.)
    }

    setSaving(true)
    try {
      // If your transform supports context (actor/school), pass it.
      const payload = toCompanyPayload(cleaned, { schoolId, actor: actorEmail })
      const saved = await saveCompany(payload)
      onSaved?.(saved)
      return saved
    } catch (err) {
      // Surface a friendly error and allow the caller to handle it too
      const msg = 'Failed to create company. Please try again.'
      setErrors((e) => ({ ...e, form: msg }))
      onError?.(msg, err)
      return false
    } finally {
      setSaving(false)
    }
  }, [values, schoolId, actorEmail, onSaved, onError])

  // ------------- API --------------------------------------------------------

  return {
    // state
    values,
    errors,
    saving,

    // derived
    canSubmit,

    // mutators
    update,     // (field, value)
    setMany,    // (partial)
    reset,

    // actions
    submit,     // () => Promise<false|any>
  }
}