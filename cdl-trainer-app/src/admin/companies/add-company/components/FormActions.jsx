//src/admin/companies/add-company/components/FormActions.jsx
import React from 'react'
import PropTypes from 'prop-types'
import styles from '../AddCompanyDrawer.module.css'

/**
 * Footer actions for AddCompanyDrawer.
 */
export default function FormActions({ saving, canSubmit, onCancel, onCreate, onCreateAndAdd }) {
  return (
    <footer className={styles.footer}>
      <button type="button" className="btn outline" onClick={onCancel} disabled={saving}>
        Cancel
      </button>

      <div className={styles.footerActions}>
        <button
          type="button"
          className="btn outline"
          onClick={onCreateAndAdd}
          disabled={saving || !canSubmit}
          title="Create the company and then add the first student"
        >
          {saving ? 'Working…' : 'Create & Add First Student'}
        </button>

        <button
          type="button"
          className="btn"
          onClick={onCreate}
          disabled={saving || !canSubmit}
          title="Create the company"
        >
          {saving ? 'Saving…' : 'Create Company'}
        </button>
      </div>
    </footer>
  )
}

FormActions.propTypes = {
  saving: PropTypes.bool,
  canSubmit: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onCreateAndAdd: PropTypes.func.isRequired,
}