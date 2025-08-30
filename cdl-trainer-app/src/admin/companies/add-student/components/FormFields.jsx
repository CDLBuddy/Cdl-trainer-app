// Path: src/admin/companies/add-student/components/FormFields.jsx
import PropTypes from 'prop-types'
import React, { useCallback, useId, useMemo } from 'react'

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
  const onSelectInstructor = useCallback(
    id => {
      const found = instructorOptions.find(o => o.value === id)
      const display = found?.label || ''
      set('assignedInstructorId', id || '')
      set('assignedInstructor', id ? display : '')
    },
    [instructorOptions, set]
  )

  // Gentle validation: at least email OR phone
  const contactMissing =
    !(form?.email && String(form.email).trim()) &&
    !(form?.phone && String(form.phone).trim())

  // Trim helpers on blur to avoid accidental spaces
  const trimSet = useCallback(
    (key, v) => set(key, typeof v === 'string' ? v.trim() : v),
    [set]
  )

  return (
    <>
      {/* Contact (Email OR Phone) */}
      <div
        className={styles.block}
        aria-describedby={contactHintId}
        data-testid="field-contact"
      >
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
          onBlur={e => trimSet('email', e.target.value)}
          className={styles.input}
          aria-invalid={contactMissing ? 'true' : 'false'}
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
          onBlur={e => trimSet('phone', e.target.value)}
          className={styles.input}
          aria-invalid={contactMissing ? 'true' : 'false'}
        />

        <small id={contactHintId} className={styles.hint}>
          Provide <strong>at least one</strong>: email or phone.
        </small>
      </div>

      {/* Name */}
      <label htmlFor={nameId} className={styles.block} data-testid="field-name">
        <span className={styles.label}>Full Name</span>
        <input
          id={nameId}
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="e.g., Alex Johnson"
          value={form.name || ''}
          onChange={e => set('name', e.target.value)}
          onBlur={e => trimSet('name', e.target.value)}
          className={styles.input}
        />
      </label>

      {/* Course */}
      <label
        htmlFor={courseId}
        className={styles.block}
        data-testid="field-course"
      >
        <span className={styles.label}>Course</span>
        <input
          id={courseId}
          type="text"
          placeholder="e.g., ELDT Class A – Standard"
          value={form.course || ''}
          onChange={e => set('course', e.target.value)}
          onBlur={e => trimSet('course', e.target.value)}
          className={styles.input}
          aria-describedby={courseHintId}
        />
        <small id={courseHintId} className={styles.hint}>
          Set by admin; students see this as read-only.
        </small>
      </label>

      {/* CDL Class (A/B/C only) */}
      <label
        htmlFor={classId}
        className={styles.block}
        data-testid="field-cdl-class"
      >
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
      <label
        htmlFor={billingId}
        className={styles.block}
        data-testid="field-billing"
      >
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
      <label
        htmlFor={instructorId}
        className={styles.block}
        data-testid="field-instructor"
      >
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

FormFields.propTypes = {
  form: PropTypes.object.isRequired,
  set: PropTypes.func.isRequired,
  firstFieldRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) })
    .isRequired,
  instructors: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string,
      name: PropTypes.string,
      email: PropTypes.string,
    })
  ),
  instructorsLoading: PropTypes.bool,
}