// src/admin/companies/add-student/components/FormFields.jsx
import React, { useId, useMemo } from 'react'

import styles from './FormFields.module.css'

/**
 * @param {{
 *   form: {
 *     email?: string,
 *     phone?: string,
 *     name?: string,
 *     course?: string,
 *     cdlClass?: 'A'|'B'|'C'|string,
 *     billing?: 'employer'|'individual'|string,
 *     assignedInstructor?: string,
 *     assignedInstructorId?: string,
 *   },
 *   set: (key: string, value: any) => void,
 *   firstFieldRef: React.RefObject<HTMLInputElement>,
 *   instructors?: Array<{ value: string, label?: string, name?: string, email?: string }>,
 *   instructorsLoading?: boolean
 * }} props
 */
export default function FormFields({
  form,
  set,
  firstFieldRef,
  instructors = [],
  instructorsLoading = false,
}) {
  // Stable, unique IDs for hint/inputs (improves SR experience in drawers)
  const emailId = useId()
  const phoneId = useId()
  const nameId = useId()
  const courseId = useId()
  const classId = useId()
  const billingId = useId()
  const instructorId = useId()

  const contactHintId = `${emailId}-contact-hint`
  const courseHintId = `${courseId}-hint`
  const classHint = `${classId}-hint`
  const billingHint = `${billingId}-hint`
  const instructorHint = `${instructorId}-hint`

  // Normalize instructor option labels defensively
  const instructorOptions = useMemo(
    () =>
      (instructors || []).map(opt => {
        const lbl =
          opt.label ||
          opt.name ||
          opt.email ||
          String(opt.value || '').slice(0, 50)
        return { ...opt, label: lbl }
      }),
    [instructors]
  )

  // When selecting an instructor, store BOTH id and display name (student-facing)
  const onSelectInstructor = id => {
    const found = instructorOptions.find(o => o.value === id)
    const display = found?.label || ''
    set('assignedInstructorId', id || '')
    set('assignedInstructor', id ? display : '')
  }

  return (
    <>
      {/* Contact (Email OR Phone) */}
      <div className={styles.block} aria-describedby={contactHintId}>
        <span className={styles.label}>
          Contact <span className={styles.req}>*</span>
        </span>

        <label htmlFor={emailId} className={styles.subLabel}>
          Email (recommended)
        </label>
        <input
          id={emailId}
          ref={firstFieldRef}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="student@example.com"
          value={form.email || ''}
          onChange={e => set('email', e.target.value)}
          className={styles.input}
        />

        <label htmlFor={phoneId} className={styles.subLabel}>
          or Phone
        </label>
        <input
          id={phoneId}
          type="tel"
          inputMode="tel"
          placeholder="555-555-5555"
          pattern="[0-9+\-() ]{7,}"
          autoComplete="tel"
          value={form.phone || ''}
          onChange={e => set('phone', e.target.value)}
          className={styles.input}
        />

        <small id={contactHintId} className={styles.hint}>
          Provide <strong>at least one</strong>: email or phone.
        </small>
      </div>

      {/* Name */}
      <label htmlFor={nameId} className={styles.block}>
        <span className={styles.label}>Full Name</span>
        <input
          id={nameId}
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="e.g., Alex Johnson"
          value={form.name || ''}
          onChange={e => set('name', e.target.value)}
          className={styles.input}
        />
      </label>

      {/* Course */}
      <label htmlFor={courseId} className={styles.block}>
        <span className={styles.label}>Course</span>
        <input
          id={courseId}
          type="text"
          placeholder="e.g., ELDT Class A – Standard"
          value={form.course || ''}
          onChange={e => set('course', e.target.value)}
          className={styles.input}
          aria-describedby={courseHintId}
        />
        <small id={courseHintId} className={styles.hint}>
          Set by admin; students see this as read-only.
        </small>
      </label>

      {/* CDL Class (A/B/C only) */}
      <label htmlFor={classId} className={styles.block}>
        <span className={styles.label}>
          CDL Class <span className={styles.req}>*</span>
        </span>
        <select
          id={classId}
          required
          aria-required="true"
          value={form.cdlClass || ''}
          onChange={e => set('cdlClass', e.target.value)}
          className={styles.select}
          aria-describedby={classHint}
        >
          <option value="">Select…</option>
          <option value="A">Class A</option>
          <option value="B">Class B</option>
          <option value="C">Class C</option>
        </select>
        <small id={classHint} className={styles.hint}>
          Drives overlays &amp; walkthrough content (read-only for students).
        </small>
      </label>

      {/* Billing */}
      <label htmlFor={billingId} className={styles.block}>
        <span className={styles.label}>Billing Mode</span>
        <select
          id={billingId}
          value={form.billing || 'employer'}
          onChange={e => set('billing', e.target.value)}
          className={styles.select}
          aria-describedby={billingHint}
        >
          <option value="employer">Employer</option>
          <option value="individual">Individual</option>
        </select>
        <small id={billingHint} className={styles.hint}>
          If employer-paid, the Payment section is hidden in the student
          profile.
        </small>
      </label>

      {/* Assigned Instructor (dropdown) */}
      <label htmlFor={instructorId} className={styles.block}>
        <span className={styles.label}>Assigned Instructor</span>
        <select
          id={instructorId}
          value={form.assignedInstructorId || ''}
          onChange={e => onSelectInstructor(e.target.value)}
          className={styles.select}
          aria-describedby={instructorHint}
          disabled={instructorsLoading}
        >
          <option value="">
            {instructorsLoading ? 'Loading…' : '(Unassigned)'}
          </option>
          {instructorOptions.map(opt => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <small id={instructorHint} className={styles.hint}>
          Stored as both <code>assignedInstructorId</code> and a display string
          students can see.
        </small>
      </label>
    </>
  )
}
