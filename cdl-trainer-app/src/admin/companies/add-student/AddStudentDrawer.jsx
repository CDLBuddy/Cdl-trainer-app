// Path: src/admin/companies/add-student/AddStudentDrawer.jsx
// ============================================================================
// AddStudentDrawer
// - Composable drawer to add a student under a company
// - A11y-first: proper roles, aria-busy, error region, button states
// - Uses useAddStudentForm for data/validation/submission
// - Non-breaking API: ({ open=true, companyId, onClose(result: boolean) })
// ============================================================================

import PropTypes from 'prop-types'
import React, { memo, useCallback, useEffect, useId } from 'react'

// Keep all UI atoms/molecules coming from the local components barrel
import styles from './AddStudentDrawer.module.css'
import { DrawerShell, FormActions, FormFields, OverlayChips } from './components'
import useAddStudentForm from './hooks/useAddStudentForm.js'

function AddStudentDrawer({ open = true, companyId, onClose }) {
  const {
    form, set, overlays, error, saving, canSave,
    handleSubmit, firstFieldRef,
  } = useAddStudentForm({ companyId, onClose })

  // Accessible, stable id for the description/error block
  const descId = useId()
  const errorId = error ? `${descId}-error` : undefined

  // Close helpers
  const closeFalse = useCallback(() => onClose?.(false), [onClose])

  // Autofocus: when opened, move focus to first field (hook provides ref)
  useEffect(() => {
    if (open) firstFieldRef.current?.focus?.()
  }, [open, firstFieldRef])

  return (
    <DrawerShell
      open={open}
      title="Add Student"
      onClose={closeFalse}
      ariaDescribedBy={error ? errorId : descId}
      // Shared, styled footer actions (buttons + error summary)
      footer={
        <FormActions
          saving={saving}
          canSave={canSave}
          error={error}
          onCancel={closeFalse}
          onSubmit={handleSubmit}
          formId="add-student-form"
        />
      }
    >
      <form
        id="add-student-form"
        onSubmit={handleSubmit}
        className={styles.form}
        aria-describedby={error ? errorId : descId}
        aria-busy={saving ? 'true' : 'false'}
        noValidate
      >
        {/* Visually hidden description to give screen readers context */}
        <span id={descId} className="sr-only">
          Fill in student details, then save to add the student to this company.
        </span>

        <FormFields
          form={form}
          set={set}
          firstFieldRef={firstFieldRef}
        />

        {/* Derived overlays */}
        <div className={styles.block}>
          <div className={styles.labelRow}>
            <span className={styles.labelStrong}>Overlays (derived)</span>
          </div>
          <OverlayChips overlays={overlays} ariaLabel="Derived overlays" />
          <small className={styles.hint}>
            Saved automatically based on Course &amp; CDL Class.
          </small>
        </div>

        {/* Error region (also surfaced in footer via FormActions) */}
        {error && (
          <div role="alert" id={errorId} className={styles.error}>
            {error}
          </div>
        )}
      </form>
    </DrawerShell>
  )
}

AddStudentDrawer.propTypes = {
  open: PropTypes.bool,
  companyId: PropTypes.string, // can be undefined for general add
  /** onClose receives a boolean: true if saved, false if cancelled */
  onClose: PropTypes.func,
}

AddStudentDrawer.defaultProps = {
  open: true,
  companyId: undefined,
  onClose: undefined,
}

export default memo(AddStudentDrawer)