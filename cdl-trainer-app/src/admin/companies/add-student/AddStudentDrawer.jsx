// ============================================================================
// AddStudentDrawer
// - Composable drawer to add a student under a company
// - A11y-first: proper roles, aria-busy, error region, button states
// - Uses useAddStudentForm for data/validation/submission
// - Non-breaking API: ({ open=true, companyId, onClose(result: boolean) })
// - Polished: keyboard submit (⌘/Ctrl+Enter), ESC handled by DrawerShell,
//             autofocus first field, instructor dropdown fed from Firestore.
// ============================================================================

import PropTypes from 'prop-types'
import React, { memo, useCallback, useEffect, useId } from 'react'

import styles from './AddStudentDrawer.module.css'
// Local UI atoms/molecules
import {
  DrawerShell,
  FormActions,
  FormFields,
  OverlayChips,
} from './components'
// Hooks
import { useAddStudentForm } from './hooks'
import useInstructorsList from './hooks/useInstructorList.js'

function AddStudentDrawer({ open = true, companyId, onClose }) {
  const {
    form,
    set,
    overlays,
    error,
    saving,
    canSave,
    handleSubmit,
    firstFieldRef,
  } = useAddStudentForm({ companyId, onClose })

  // Live instructors list with helpful defaults:
  // - include an "(Unassigned)" option
  // - only active instructors
  // - reasonable cap (can raise later)
  const {
    instructors,
    loading: instructorsLoading,
    error: instructorsError,
  } = useInstructorsList({ withUnassigned: true, activeOnly: true, max: 200 })

  // Stable ids for description and error region
  const descId = useId()
  const errorId = error ? `${descId}-error` : undefined

  // Close helper
  const closeFalse = useCallback(() => onClose?.(false), [onClose])

  // Autofocus: when opened, move focus to first field (hook provides ref)
  useEffect(() => {
    if (open) firstFieldRef.current?.focus?.()
  }, [open, firstFieldRef])

  // Keyboard: Cmd/Ctrl + Enter submits the form
  const onKeyDown = useCallback(
    e => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'enter' && canSave && !saving) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [canSave, saving, handleSubmit]
  )

  return (
    <DrawerShell
      open={open}
      title="Add Student"
      onClose={closeFalse}
      ariaDescribedBy={error ? errorId : descId}
      data-testid="add-student-drawer"
    >
      <form
        id="add-student-form"
        onSubmit={handleSubmit}
        className={styles.form}
        aria-describedby={error ? errorId : descId}
        aria-busy={saving ? 'true' : 'false'}
        noValidate
        autoComplete="off"
      >
        {/* Visually hidden description to give screen readers context */}
        <span id={descId} className="sr-only">
          Fill in student details, set course and CDL class, then save to add
          the student to this company. Overlays are derived automatically.
        </span>

        <FormFields
          form={form}
          set={set}
          firstFieldRef={firstFieldRef}
          instructors={instructors}
          instructorsLoading={instructorsLoading}
          onKeyDown={onKeyDown}
        />
        {/* Instructor list status (non-blocking; SR-friendly) */}
        {(instructorsLoading || instructorsError) && (
          <div
            className={styles.hint}
            aria-live="polite"
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            {instructorsLoading ? 'Loading instructors…' : instructorsError}
          </div>
        )}

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
          <div
            role="alert"
            id={errorId}
            className={styles.error}
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* Footer actions (Submit / Cancel) */}
        <FormActions
          saving={saving}
          canSave={canSave}
          error={error}
          onCancel={closeFalse}
          onSubmit={handleSubmit}
          formId="add-student-form"
        />
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
