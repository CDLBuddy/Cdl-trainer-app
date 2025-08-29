// src/student/profile/sections/CoursePaymentSection.jsx
import React, { useMemo, useCallback } from 'react'

import { getSectionStatus } from '../schema/calculators.js'
import Select from '../ui/Select.jsx'
import UploadField from '../ui/UploadField.jsx'

import SectionHeader from './SectionHeader.jsx'
import styles from './sections.module.css'

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select status…' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
]

// Normalize payer mode across shapes we’ve used in admin/student
function normalizePayerMode(v = {}) {
  const raw =
    v?.billing?.mode ??
    v?.billingMode ??
    v?.billing?.payerDefault ?? // admin snapshot field
    ''
  return String(raw).trim().toLowerCase()
}

export default function CoursePaymentSection({
  value = {},
  onChange,
  onUpload,
}) {
  const v = useMemo(() => value || {}, [value])

  // Honor both: parent already hides when employer, but be defensive here too
  const payer = normalizePayerMode(v)
  const isEmployerPaid = [
    'employer',
    'company',
    'sponsor',
    'corporate',
  ].includes(payer)
  if (isEmployerPaid) return null

  const status = useMemo(
    () => getSectionStatus('payment', v, v?.verified || {}),
    [v]
  )
  const verifiedBy = v?.verified?.by
  const verifiedAt = v?.verified?.at

  const setField = useCallback((k, val) => onChange?.(k, val), [onChange])

  const handleProofUpload = useCallback(
    file => {
      if (!file) return
      // Parent handles upload + URL write
      onUpload?.(file, 'students/payments', 'paymentProofUrl')
    },
    [onUpload]
  )

  const isPaid = String(v.paymentStatus || '').toLowerCase() === 'paid'
  const hasProof = !!v.paymentProofUrl

  return (
    <section
      id="payment"
      className={styles.section}
      aria-labelledby="payment-title"
    >
      <SectionHeader
        title="Payment"
        status={status}
        verifiedBy={verifiedBy}
        verifiedAt={verifiedAt}
      />

      <h3 id="payment-title" className="visually-hidden">
        Payment
      </h3>
      <div className={styles.sub}>
        Required for Enrollment • Only shown if you’re paying as an individual.
      </div>

      <div className={styles.grid2}>
        <Select
          label="Payment Status"
          value={v.paymentStatus || ''}
          onChange={val => setField('paymentStatus', val)}
          options={PAYMENT_STATUS_OPTIONS}
          hint="Set to Paid after you’ve completed payment."
          aria-describedby="payment-hint"
        />
      </div>

      {isPaid && (
        <div className={styles.grid} aria-live="polite">
          <UploadField
            label={hasProof ? 'Replace Payment Proof' : 'Upload Payment Proof'}
            currentUrl={v.paymentProofUrl}
            accept="image/*"
            maxSizeMB={8}
            imageOnly
            capture="environment"
            onSelectFile={handleProofUpload}
            previewAlt="Payment proof"
            hint="Photo/screenshot of a receipt or confirmation • Max 8MB."
          />
          {hasProof && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn outline"
                onClick={() => setField('paymentProofUrl', '')}
                aria-label="Remove uploaded payment proof"
              >
                Remove proof
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
