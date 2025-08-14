// src/student/profile/sections/CoursePaymentSection.jsx
import React, { useCallback } from 'react'
import Field from '../ui/Field.jsx'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'
import styles from './sections.module.css'

const PAYMENT_STATUS_OPTIONS = [
  { value: '',        label: 'Select status…' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid',    label: 'Paid' },
  { value: 'waived',  label: 'Waived (admin)' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: '',          label: 'Select method…' },
  { value: 'cash',      label: 'Cash' },
  { value: 'card',      label: 'Card' },
  { value: 'ach',       label: 'ACH' },
  { value: 'check',     label: 'Check' },
  { value: 'financing', label: 'Financing' },
  { value: 'other',     label: 'Other' },
]

export default function CoursePaymentSection({ value, onChange, onUpload }) {
  const v = value || {}

  const setField = useCallback(
    (key, val) => onChange?.(key, val),
    [onChange]
  )

  const handleProofUpload = useCallback(
    (file) => onUpload?.(file, 'payments', 'paymentProofUrl'),
    [onUpload]
  )

  return (
    <section className={styles.section} aria-labelledby="course-payment-h3">
      <header className={styles.header}>
        <h3 id="course-payment-h3" className={styles.title}>💳 Course & Payment</h3>
        <div className={styles.sub}>Optional but recommended</div>
      </header>

      {/* Course + Status */}
      <div className={styles.grid2}>
        <Field
          label="Course"
          value={v.course || ''}
          onChange={val => setField('course', val)}
          placeholder="ELDT Class A"
          hint="What program are you enrolled in?"
        />
        <Select
          label="Payment Status"
          value={v.paymentStatus || ''}
          onChange={val => setField('paymentStatus', val)}
          options={PAYMENT_STATUS_OPTIONS}
          hint="Used for admin reporting."
        />
      </div>

      {/* Method + Amount */}
      <div className={styles.grid2}>
        <Select
          label="Payment Method"
          value={v.paymentMethod || ''}
          onChange={val => setField('paymentMethod', val)}
          options={PAYMENT_METHOD_OPTIONS}
        />
        <Field
          label="Amount (USD)"
          type="number"
          min="0"
          step="0.01"
          value={v.paymentAmount ?? ''}
          onChange={val => setField('paymentAmount', val)}
          placeholder="e.g., 1200.00"
        />
      </div>

      {/* Paid on + Receipt */}
      <div className={styles.grid2}>
        <Field
          label="Paid On"
          type="date"
          value={v.paymentDate || ''}
          onChange={val => setField('paymentDate', val)}
        />
        <Field
          label="Receipt / Ref ID"
          value={v.paymentRef || ''}
          onChange={val => setField('paymentRef', val)}
          placeholder="Optional"
        />
      </div>

      {/* Schedule */}
      <div className={styles.grid2}>
        <Field
          label="Schedule Preference"
          value={v.schedulePref || ''}
          onChange={val => setField('schedulePref', val)}
          placeholder="Weekdays, evenings, weekends…"
          hint="We’ll do our best to accommodate."
        />
        <Field
          label="Schedule Notes"
          as="textarea"
          rows={3}
          value={v.scheduleNotes || ''}
          onChange={val => setField('scheduleNotes', val)}
          placeholder="Anything we should know"
        />
      </div>

      {/* Proof of payment (image) */}
      <div className={styles.grid}>
        <UploadField
          label="Payment Proof"
          accept="image/*"
          preview={v.paymentProofUrl || ''}
          onSelect={handleProofUpload}
          previewAlt="Payment proof"
          hint="Upload a photo/screenshot of a receipt or confirmation."
        />
      </div>
    </section>
  )
}