// src/student/profile/sections/CoursePaymentSection.jsx
import React, { useMemo } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

const PAYMENT_STATUS_OPTIONS = [
  { value: '',        label: 'Select status…' },
  { value: 'unpaid',  label: 'Unpaid' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid',    label: 'Paid' },
]

export default function CoursePaymentSection({ value, onChange, onUpload }) {
  const v = useMemo(() => value || {}, [value])
  const mode = String(v?.billing?.mode || '').toLowerCase()

  const status = useMemo(
    () => getSectionStatus('payment', v, v?.verified || {}),
    [v]
  )

  // Hide completely when employer-paid
  if (mode !== 'individual') return null
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at
  const setField = (k, val) => onChange?.(k, val)

  const handleProofUpload = (file) => {
    if (!file) return
    // Parent handles upload + URL write
    onUpload?.(file, 'students/payments', 'paymentProofUrl')
  }

  const isPaid = String(v.paymentStatus || '').toLowerCase() === 'paid'

  return (
    <section id="payment" className={styles.section} aria-labelledby="payment-title">
      <SectionHeader
        title="Payment"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id="payment-title" className="visually-hidden">Payment</h3>
      <div className={styles.sub}>
        Required for Enrollment • Only shown if you’re paying as an individual.
      </div>

      <div className={styles.grid2}>
        <Select
          label="Payment Status"
          value={v.paymentStatus || ''}
          onChange={val => setField('paymentStatus', val)}
          options={PAYMENT_STATUS_OPTIONS}
          hint="Set to Paid once you’ve completed payment."
        />
      </div>

      {isPaid && (
        <div className={styles.grid}>
          <UploadField
            label="Upload Payment Proof"
            currentUrl={v.paymentProofUrl}
            accept="image/*"
            maxSizeMB={8}
            imageOnly
            capture="environment"
            onSelectFile={handleProofUpload}
            previewAlt="Payment proof"
            hint="Photo/screenshot of a receipt or confirmation • Max 8MB."
          />
        </div>
      )}
    </section>
  )
}
