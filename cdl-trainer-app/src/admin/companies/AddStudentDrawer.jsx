// src/admin/companies/AddStudentDrawer.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { auth } from '@utils/firebase.js'
import { updateUserProfileFields } from '@utils/userProfile.js'

import { deriveOverlays } from '@admin/utils/enrollmentAssignments.js'

// Stable regex hoisted outside component so it doesn't trigger useMemo dependency changes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * AddStudentDrawer (slide-over)
 *
 * Props:
 * - open?: boolean (default true)
 * - companyId: string
 * - onClose?: (didSave: boolean) => void
 */
export default function AddStudentDrawer({ open = true, companyId, onClose }) {
  const [form, setForm] = useState({
    email: '',
    name: '',
    course: '',
    cdlClass: '',
    billing: 'employer',
    assignedInstructor: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [render, setRender] = useState(open) // keep in DOM during exit animation

  const ANIM_MS = 240
  const lastActiveRef = useRef(null)
  const panelRef = useRef(null)
  const firstFieldRef = useRef(null)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // Mount/unmount with animation
  useEffect(() => {
    if (open) setRender(true)
    else {
      const t = setTimeout(() => setRender(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [open])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Focus management: save last active, focus first, trap tab, ESC closes
  useEffect(() => {
    if (!open) return
    lastActiveRef.current = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.(false)
      } else if (e.key === 'Tab') {
        trapFocus(e, panelRef.current)
      }
    }
    document.addEventListener('keydown', onKey)
    const id = setTimeout(() => firstFieldRef.current?.focus(), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('keydown', onKey)
      // restore focus
      try { lastActiveRef.current?.focus?.() } catch { /* noop */ }
    }
  }, [open, onClose])

  // Derived overlays
  const overlays = useMemo(
    () => deriveOverlays(form.course, form.cdlClass) || [],
    [form.course, form.cdlClass]
  )
  const canSave = useMemo(() => {
    const email = (form.email || '').trim().toLowerCase()
    const course = (form.course || '').trim()
    const klass = form.cdlClass || ''
    return Boolean(companyId) && EMAIL_RE.test(email) && course && klass
  }, [form.email, form.course, form.cdlClass, companyId])

  // Validate before submit (for messages)
  const validate = () => {
    const email = (form.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return 'Please enter a valid email.'
    if (!(form.course || '').trim()) return 'Please enter a course.'
    if (!form.cdlClass) return 'Please select a CDL class.'
    if (!companyId) return 'Missing companyId; cannot attach student.'
    return ''
  }

  const submit = async (e) => {
    e.preventDefault()
    const msg = validate()
    if (msg) { setError(msg); return }
    setError('')

    const actor = auth?.currentUser?.email || 'admin'
    const email = form.email.trim().toLowerCase()
    const mode = (form.billing || 'employer').toLowerCase()
    const nowIso = new Date().toISOString()

    const payload = {
      email,
      name: form.name?.trim() || '',
      course: form.course?.trim() || '',
      cdlClass: form.cdlClass || '',
      overlays: overlays.length ? overlays : null,
      billing: { mode },
      assignedInstructor: form.assignedInstructor?.trim() || null,
      companyId: companyId || null,
      role: 'student',
      status: 'active',
      verified: {},
      updatedAt: nowIso,
      updatedBy: actor,
      createdAt: nowIso,
      createdBy: actor,
    }

    setSaving(true)
    try {
      await updateUserProfileFields(email, payload, actor)
      onClose?.(true)
    } catch (_err) {
      setError('Failed to save student. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!render) return null
  return createPortal(
    <div
      aria-hidden={!open}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
      }}
    >
      {/* Scrim: interactive element to satisfy a11y rule */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => onClose?.(false)}
        tabIndex={-1}
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.5)',
          opacity: open ? 1 : 0,
          transition: `opacity ${ANIM_MS}ms ease`,
          border: 0,
          padding: 0,
          margin: 0,
          display: 'block',
          cursor: 'default',
        }}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
        style={{
          width: 'min(92vw, 520px)',
          height: '100dvh',
          background: '#fff',
          boxShadow: '0 10px 30px rgba(0,0,0,.2)',
          transform: `translateX(${open ? '0%' : '100%'})`,
          transition: `transform ${ANIM_MS}ms ease`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <header style={{ padding: '16px 16px 10px', borderBottom: '1px solid #eef0f4' }}>
          <h3 id="add-student-title" style={{ margin: 0 }}>Add Student</h3>
        </header>

        {/* Body */}
        <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
          <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
            {/* Email */}
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Email <span style={{ color: '#b00' }}>*</span></span>
              <input
                ref={firstFieldRef}
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                placeholder="student@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </label>

            {/* Name */}
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Name</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="(optional)"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </label>

            {/* Course */}
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Course <span style={{ color: '#b00' }}>*</span></span>
              <input
                type="text"
                required
                placeholder="e.g., ELDT Class A"
                value={form.course}
                onChange={e => set('course', e.target.value)}
              />
              <small style={{ color: '#6b7280' }}>
                Set by admin; students see this as read-only.
              </small>
            </label>

            {/* CDL Class */}
            <label style={{ display: 'grid', gap: 6 }}>
              <span>CDL Class <span style={{ color: '#b00' }}>*</span></span>
              <select
                required
                value={form.cdlClass}
                onChange={e => set('cdlClass', e.target.value)}
              >
                <option value="">Select…</option>
                <option value="A">Class A</option>
                <option value="B">Class B</option>
                <option value="PASSENGER-BUS">Passenger Bus</option>
              </select>
              <small style={{ color: '#6b7280' }}>Drives overlays & walkthrough content.</small>
            </label>

            {/* Billing Mode */}
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Billing Mode</span>
              <select
                value={form.billing}
                onChange={e => set('billing', e.target.value)}
              >
                <option value="employer">Employer</option>
                <option value="individual">Individual</option>
              </select>
              <small style={{ color: '#6b7280' }}>
                If employer-paid, the student’s Payment section is hidden.
              </small>
            </label>

            {/* Assigned Instructor */}
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Assigned Instructor</span>
              <input
                type="text"
                placeholder="(optional)"
                value={form.assignedInstructor}
                onChange={e => set('assignedInstructor', e.target.value)}
              />
            </label>

            {/* Overlays Preview */}
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 500 }}>Overlays (derived)</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {overlays.length ? overlays.map(o => (
                  <span
                    key={o}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#eef2ff',
                      color: '#3730a3',
                      fontSize: 12,
                    }}
                  >
                    {o}
                  </span>
                )) : (
                  <span style={{ color: '#6b7280', fontSize: 12 }}>(none)</span>
                )}
              </div>
              <small style={{ color: '#6b7280' }}>
                Saved automatically based on Course & CDL Class.
              </small>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" style={{ color: '#b91c1c', fontSize: '.95rem' }}>
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: 12,
            borderTop: '1px solid #eef0f4',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn outline"
            onClick={() => onClose?.(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn"
            form={/* ensure it submits the nearest form */ undefined}
            disabled={saving || !canSave}
            onClick={submit}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </aside>
    </div>,
    document.body
  )
}

/* ------------------------------ utils ------------------------------- */
function trapFocus(e, container) {
  if (!container) return
  const focusables = container.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )
  const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'))
  if (!list.length) return
  const first = list[0]
  const last = list[list.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    last.focus(); e.preventDefault()
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus(); e.preventDefault()
  }
}
