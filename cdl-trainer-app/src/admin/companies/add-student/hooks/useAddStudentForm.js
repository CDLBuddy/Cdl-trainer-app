// Path: src/admin/companies/add-student/useAddStudentForm.js
// ============================================================================
// useAddStudentForm
// - Local state + validation + submission for AddStudentDrawer
// - Derives overlays from course/CDL class
// - Guards against double-submit; restores focus; clear, typed-ish JSDoc
// ============================================================================

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'

import { auth } from '@utils/firebase.js'

import { deriveOverlays } from '@admin/utils/enrollmentAssignments.js'

// Barrels (stable, swappable)
import { saveStudent } from './services'
import { validate as validateForm, canSave as canSaveGuard } from './utils'

/**
 * @typedef {{ email:string, name:string, course:string, cdlClass:string, billing:'employer'|'individual', assignedInstructor:string }} AddStudentForm
 */

/**
 * useAddStudentForm
 * @param {{ companyId: string, onClose?: (didSave: boolean) => void }} props
 */
export default function useAddStudentForm({ companyId, onClose }) {
  // --------------------------- State ----------------------------------
  /** @type {[AddStudentForm, Function]} */
  const [form, setForm] = useState(() => ({
    email: '',
    name: '',
    course: '',
    cdlClass: '',
    billing: 'employer',
    assignedInstructor: '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Initial focus target for DrawerShell
  const firstFieldRef = useRef(null)
  const focusFirst = useCallback(() => {
    try { firstFieldRef.current?.focus?.() } catch { /* noop */ }
  }, [])

  // Stable setter with trimming + normalization for certain fields
  const set = useCallback((key, value) => {
    setForm(prev => {
      let v = value
      if (typeof v === 'string') v = v.trim()
      if (key === 'email') v = String(v || '').toLowerCase()
      return { ...prev, [key]: v }
    })
  }, [])

  // ------------------------- Derived data -----------------------------
  // Derived overlays from course + class (kept in sync with admin policy)
  const overlays = useMemo(
    () => deriveOverlays(form.course, form.cdlClass) || [],
    [form.course, form.cdlClass]
  )

  // Guard for Save button enablement
  const canSave = useMemo(
    () => canSaveGuard({ ...form, companyId }, saving),
    [form, companyId, saving]
  )

  // Actor (email) used for auditing; memoize to avoid churn
  const actor = useMemo(
    () => auth?.currentUser?.email || 'admin',
    []
  )

  // --------------------------- Effects --------------------------------
  // Clear errors reactively when the form becomes valid again
  useEffect(() => {
    if (!error) return
    const msg = validateForm(form, companyId)
    if (!msg) setError('')
  }, [form, companyId, error])

  // -------------------------- Handlers --------------------------------
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault?.()
    if (saving) return

    const message = validateForm(form, companyId)
    if (message) {
      setError(message)
      // shift focus to first invalid-ish field (best-effort)
      if (/email/i.test(message)) firstFieldRef.current?.focus?.()
      return
    }

    setSaving(true)
    try {
      await saveStudent({ form, overlays, companyId, actor })
      onClose?.(true)
    } catch {
      setError('Failed to save student. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [form, overlays, companyId, actor, onClose, saving])

  // --------------------------- API ------------------------------------
  return {
    form,              // object
    set,               // (key, value) -> void  (trims strings; lowercases email)
    overlays,          // string[]
    saving,            // boolean
    error,             // string
    canSave,           // boolean
    handleSubmit,      // (e?) -> Promise<void>
    firstFieldRef,     // ref for initial focus
    focusFirst,        // function to call on open
  }
}