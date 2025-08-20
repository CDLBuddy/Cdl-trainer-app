// Path: src/admin/companies/add-student/FormFields.jsx
import React from 'react'
import styles from './FormFields.module.css'

/**
 * FormFields — controlled inputs for Add Student drawer.
 *
 * @param {{
 *   form: {
 *     email: string,
 *     name: string,
 *     course: string,
 *     cdlClass: string,
 *     billing: string,
 *     assignedInstructor: string,
 *   },
 *   set: (key: string, value: any) => void,
 *   firstFieldRef: React.RefObject<HTMLInputElement>
 * }} props
 */
export default function FormFields({ form, set, firstFieldRef }) {
  return (
    <>
      {/* Email */}
      <label htmlFor="student-email" className={styles.block}>
        <span className={styles.label}>
          Email <span className={styles.req}>*</span>
        </span>
        <input
          id="student-email"
          ref={firstFieldRef}
          type="email"
          required
          aria-required="true"
          inputMode="email"
          autoComplete="email"
          placeholder="student@example.com"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className={styles.input}
        />
      </label>

      {/* Name */}
      <label htmlFor="student-name" className={styles.block}>
        <span className={styles.label}>Name</span>
        <input
          id="student-name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="(optional)"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className={styles.input}
        />
      </label>

      {/* Course */}
      <label htmlFor="student-course" className={styles.block}>
        <span className={styles.label}>
          Course <span className={styles.req}>*</span>
        </span>
        <input
          id="student-course"
          type="text"
          required
          aria-required="true"
          placeholder="e.g., ELDT Class A"
          value={form.course}
          onChange={(e) => set('course', e.target.value)}
          className={styles.input}
          aria-describedby="course-hint"
        />
        <small id="course-hint" className={styles.hint}>
          Set by admin; students see this as read-only.
        </small>
      </label>

      {/* CDL Class */}
      <label htmlFor="student-cdl-class" className={styles.block}>
        <span className={styles.label}>
          CDL Class <span className={styles.req}>*</span>
        </span>
        <select
          id="student-cdl-class"
          required
          aria-required="true"
          value={form.cdlClass}
          onChange={(e) => set('cdlClass', e.target.value)}
          className={styles.select}
          aria-describedby="cdl-hint"
        >
          <option value="">Select…</option>
          <option value="A">Class A</option>
          <option value="B">Class B</option>
          <option value="PASSENGER-BUS">Passenger Bus</option>
        </select>
        <small id="cdl-hint" className={styles.hint}>
          Drives overlays & walkthrough content.
        </small>
      </label>

      {/* Billing */}
      <label htmlFor="student-billing" className={styles.block}>
        <span className={styles.label}>Billing Mode</span>
        <select
          id="student-billing"
          value={form.billing}
          onChange={(e) => set('billing', e.target.value)}
          className={styles.select}
          aria-describedby="billing-hint"
        >
          <option value="employer">Employer</option>
          <option value="individual">Individual</option>
        </select>
        <small id="billing-hint" className={styles.hint}>
          If employer-paid, Payment section is hidden for students.
        </small>
      </label>

      {/* Instructor */}
      <label htmlFor="student-instructor" className={styles.block}>
        <span className={styles.label}>Assigned Instructor</span>
        <input
          id="student-instructor"
          type="text"
          placeholder="(optional)"
          value={form.assignedInstructor}
          onChange={(e) => set('assignedInstructor', e.target.value)}
          className={styles.input}
        />
      </label>
    </>
  )
}