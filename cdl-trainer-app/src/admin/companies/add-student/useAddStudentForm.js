// Path: src/admin/companies/add-student/useAddStudentForm.js
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { auth } from '@utils/firebase.js'
import { deriveOverlays } from '@admin/utils/enrollmentAssignments.js'

// Use the new barrels (keeps paths stable & swappable)
import { validate as validateForm, canSave as canSaveGuard } from './utils'
import { saveStudent } from './services'

/**
 * useAddStudentForm
 * @param {{ companyId: string, onClose?: (didSave: boolean) => void }} props
 */
export default function useAddStudentForm({ companyId, onClose }) {
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

  // for initial focus from the drawer panel
  const firstFieldRef = useRef(null)
  const focusFirst = useCallback(() => {
    try { firstFieldRef.current?.focus?.() } catch { /* noop */ }
  }, [])

  // stable setter
  const set = useCallback((key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      return next
    })
  }, [])

  // Clear errors reactively when user edits relevant fields
  useEffect(() => {
    if (!error) return
    // If they change any of the fields that can trigger validation to pass, clear the message
    const { email, course, cdlClass } = form
    if (email || course || cdlClass) setError('')
  }, [form.email, form.course, form.cdlClass, error])

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

  // Submit handler
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault?.()
    if (saving) return

    const message = validateForm(form, companyId)
    if (message) {
      setError(message)
      return
    }

    setSaving(true)
    try {
      const actor = auth?.currentUser?.email || 'admin'
      await saveStudent({ form, overlays, companyId, actor })
      onClose?.(true)
    } catch {
      setError('Failed to save student. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [form, overlays, companyId, onClose, saving])

  return {
    form,              // object
    set,               // (key, value) -> void
    overlays,          // string[]
    saving,            // boolean
    error,             // string
    canSave,           // boolean
    handleSubmit,      // (e?) -> Promise<void>
    firstFieldRef,     // ref for initial focus
    focusFirst,        // function to call on open
  }
}