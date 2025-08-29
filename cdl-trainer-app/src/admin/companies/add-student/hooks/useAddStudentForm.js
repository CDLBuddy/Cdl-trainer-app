// Path: src/admin/companies/add-student/hooks/useAddStudentForm.js
// ============================================================================
// useAddStudentForm
// - Local state + validation (email OR phone) + submission
// - Derives overlays from course/CDL class
// - Loads instructor options via @user-profile (school-scoped)
// - Guards against double-submit; autofocus support
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { auth } from '@utils/firebase.js'

import { deriveOverlays } from '@admin/utils/enrollmentAssignments.js'

import { listInstructors } from '@user-profile'

// Prefer direct import to avoid barrel drift
import saveStudent from '../../add-student/services/saveStudent.js'

/** simple helpers */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const s = x => (x == null ? '' : String(x).trim())
const normEmail = e => s(e).toLowerCase()
const isEmail = e => EMAIL_RE.test(normEmail(e))
const onlyDigits = p => s(p).replace(/\D+/g, '')

function getSchoolId() {
  return window.schoolId || localStorage.getItem('schoolId') || ''
}

/**
 * @typedef {{
 *   email?: string,
 *   phone?: string,
 *   name?: string,
 *   course?: string,
 *   cdlClass?: 'A'|'B'|'C'|string,
 *   billing?: 'employer'|'individual'|string,
 *   assignedInstructor?: string,
 *   assignedInstructorId?: string,
 * }} AddStudentForm
 */

/**
 * useAddStudentForm
 * @param {{ companyId?: string, onClose?: (didSave: boolean) => void }} opts
 */
export default function useAddStudentForm({ companyId = '', onClose }) {
  // --------------------------- State ----------------------------------
  /** @type {[AddStudentForm, Function]} */
  const [form, setForm] = useState(() => ({
    email: '',
    phone: '',
    name: '',
    course: '',
    cdlClass: '',
    billing: 'employer',
    assignedInstructor: '',
    assignedInstructorId: '',
  }))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Instructors list (for dropdown)
  const [instructors, setInstructors] = useState([])
  const [instructorsLoading, setInstructorsLoading] = useState(false)

  // Initial focus target for DrawerShell
  const firstFieldRef = useRef(null)
  const focusFirst = useCallback(() => {
    try {
      firstFieldRef.current?.focus?.()
    } catch {
      /* noop */
    }
  }, [])

  // Stable setter with trimming + normalization for common fields
  const set = useCallback((key, value) => {
    setForm(prev => {
      let v = value
      if (typeof v === 'string') v = v.trim()
      if (key === 'email') v = normEmail(v)
      if (key === 'phone') v = onlyDigits(v) // store digits-only; UI can format
      return { ...prev, [key]: v }
    })
  }, [])

  // ------------------------- Derived data -----------------------------
  const overlays = useMemo(
    () => deriveOverlays(form.course, form.cdlClass) || [],
    [form.course, form.cdlClass]
  )

  // Guard for Save button enablement
  const canSave = useMemo(() => {
    const hasEmail = isEmail(form.email || '')
    const hasPhone = onlyDigits(form.phone || '').length >= 7
    const hasContact = hasEmail || hasPhone
    const hasClass = !!s(form.cdlClass)
    return !saving && hasContact && hasClass
  }, [form.email, form.phone, form.cdlClass, saving])

  // Actor (for audit)
  const actor = useMemo(() => auth?.currentUser?.email || 'admin', [])

  // --------------------------- Effects --------------------------------
  // Load instructors for this school (active only)
  useEffect(() => {
    let mounted = true
    const schoolId = getSchoolId()
    setInstructorsLoading(true)
    listInstructors({ schoolId, activeOnly: true, max: 200 })
      .then(list => {
        if (!mounted) return
        // Map to options: { value, label, name, email }
        const opts = list.map(u => ({
          value: u.email || u.uid || '',
          label: u.name ? `${u.name} (${u.email})` : u.email || 'Unknown',
          name: u.name || '',
          email: u.email || '',
        }))
        setInstructors(opts)
      })
      .catch(() => {
        if (mounted) setInstructors([])
      })
      .finally(() => {
        if (mounted) setInstructorsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Clear errors reactively when the form becomes valid again
  useEffect(() => {
    if (!error) return
    if (canSave) setError('')
  }, [canSave, error])

  // -------------------------- Validation ------------------------------
  function validate() {
    const hasEmail = isEmail(form.email || '')
    const digits = onlyDigits(form.phone || '')
    const hasPhone = digits.length >= 7

    if (!hasEmail && !hasPhone) {
      return 'Provide at least one valid contact: email or phone.'
    }
    if (!s(form.cdlClass)) return 'Please select a CDL class.'
    return ''
  }

  // -------------------------- Handlers --------------------------------
  const handleSubmit = useCallback(
    async e => {
      e?.preventDefault?.()
      if (saving) return

      const msg = validate()
      if (msg) {
        setError(msg)
        // best-effort focus: email first, else phone, else class
        if (!isEmail(form.email || '')) {
          firstFieldRef.current?.focus?.()
        }
        return
      }

      setSaving(true)
      try {
        const result = await saveStudent({
          form: {
            ...form,
            // ensure display kept alongside id (FormFields sets both)
            assignedInstructor: form.assignedInstructor,
          },
          overlays,
          companyId,
          actor,
        })

        if (!result?.ok) {
          setError(result?.error || 'Failed to save student. Please try again.')
          setSaving(false)
          return
        }

        onClose?.(true)
      } catch {
        setError('Failed to save student. Please try again.')
        setSaving(false)
      }
    },
    [saving, form, overlays, companyId, actor, onClose]
  )

  // --------------------------- API ------------------------------------
  return {
    form,
    set,
    overlays,
    instructors,
    instructorsLoading,
    saving,
    error,
    canSave,
    handleSubmit,
    firstFieldRef,
    focusFirst,
  }
}
