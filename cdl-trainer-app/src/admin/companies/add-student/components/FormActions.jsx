// Path: src/admin/companies/add-student/components/FormActions.jsx
import React from 'react'
import PropTypes from 'prop-types'
import styles from './FormActions.module.css'

/**
 * FormActions — footer actions for the Add Student drawer.
 *
 * Props:
 * - saving: boolean
 * - canSave: boolean
 * - error?: string
 * - onCancel: () => void
 * - onSubmit: (e?: React.FormEvent | React.MouseEvent) => void
 * - formId?: string   // optional: if your inputs live in a <form id="...">
 */
export default function FormActions({
  saving = false,
  canSave = false,
  error = '',
  onCancel,
  onSubmit,
  formId,
}) {
  return (
    <footer className={styles.footer}>
      {/* Left side: error message (if any) */}
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className={styles.alert}
        >
          {error}
        </div>
      ) : (
        <div style={{ marginRight: 'auto' }} />
      )}

      {/* Cancel button */}
      <button
        type="button"
        className="btn outline"
        onClick={onCancel}
        aria-label="Cancel and close form"
      >
        Cancel
      </button>

      {/* Save / Submit button */}
      <button
        type={formId ? 'submit' : 'button'}
        form={formId || undefined}
        className="btn primary"
        disabled={saving || !canSave}
        onClick={formId ? undefined : onSubmit}
        aria-busy={saving ? 'true' : 'false'}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </footer>
  )
}

FormActions.propTypes = {
  saving: PropTypes.bool,
  canSave: PropTypes.bool,
  error: PropTypes.string,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  formId: PropTypes.string,
}