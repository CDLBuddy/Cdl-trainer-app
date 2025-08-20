//src/admin/companies/add-company/components/FormFields.jsx
import React, { forwardRef } from 'react'
import PropTypes from 'prop-types'
import styles from '../AddCompanyDrawer.module.css'

const MODE_OPTIONS = [
  { value: 'employer',  label: 'Employer-billed' },
  { value: 'individual', label: 'Student-paid' },
]

/**
 * Fields for AddCompanyDrawer.
 * Delegates state to parent via { values, errors, onChange }.
 */
const FormFields = forwardRef(function FormFields(
  { values, errors, onChange },
  firstFieldRef
) {
  return (
    <>
      {/* Name */}
      <label className={styles.field}>
        <span className={styles.label}>
          Name <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <input
          ref={firstFieldRef}
          type="text"
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Acme Logistics, Inc."
          aria-required="true"
          aria-invalid={Boolean(errors?.name) || undefined}
          aria-describedby={errors?.name ? 'company-name-error' : undefined}
        />
        {errors?.name && (
          <small id="company-name-error" className={styles.error}>
            {errors.name}
          </small>
        )}
      </label>

      {/* Billing Mode */}
      <label className={styles.field}>
        <span className={styles.label}>Billing Mode</span>
        <select
          value={values.billingMode}
          onChange={(e) => onChange('billingMode', e.target.value)}
          aria-invalid={Boolean(errors?.billingMode) || undefined}
          aria-describedby={errors?.billingMode ? 'company-billing-error' : undefined}
        >
          {MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {errors?.billingMode && (
          <small id="company-billing-error" className={styles.error}>
            {errors.billingMode}
          </small>
        )}
      </label>

      {/* Contact Email (optional) */}
      <label className={styles.field}>
        <span className={styles.label}>Contact Email (optional)</span>
        <input
          type="email"
          value={values.contactEmail}
          onChange={(e) => onChange('contactEmail', e.target.value)}
          placeholder="ap@acmelogistics.com"
          inputMode="email"
        />
      </label>

      <p className={styles.tip}>
        Tip: Choose <strong>Employer-billed</strong> if invoices are paid by the company.  
        Choose <strong>Student-paid</strong> if trainees pay individually.
      </p>
    </>
  )
})

FormFields.propTypes = {
  values: PropTypes.shape({
    name: PropTypes.string,
    billingMode: PropTypes.string,
    contactEmail: PropTypes.string,
  }).isRequired,
  errors: PropTypes.object,
  onChange: PropTypes.func.isRequired, // (field, value) => void
}

export default FormFields