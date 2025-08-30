// Path: src/admin/companies/add-student/AddStudentDrawer.jsx
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
// Local UI atoms/molecules (barrel)
import {
  DrawerShell,
  FormActions,
  FormFields,
  OverlayChips,
} from './components/index.js'
// Hooks
import { useAddStudentForm } from './hooks/index.js'
import useInstructorList from './hooks/useInstructorList.js'

/**
 * @param {Object} props
 * @param {boolean=} props.open
 * @param {string=} props.companyId
 * @param {(result:boolean)=>void=} props.onClose
 */
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

  // Live instructors list with helpful defaults
  const {
    instructors = [],
    loading: instructorsLoading,
    error: instructorsError,
  } = useInstructorList({ withUnassigned: true, activeOnly: true, max: 200 })

  // Stable ids for description and error region
  const descId = useId()
  const errorId = error ? `${descId}-error` : undefined

  // Close helper (boolean contract preserved)
  const closeFalse = useCallback(() => onClose?.(false), [onClose])

  // Autofocus: when opened, move focus to first field (hook provides ref)
  useEffect(() => {
    if (open) firstFieldRef.current?.focus?.()
  }, [open, firstFieldRef])

  // Keyboard: Cmd/Ctrl + Enter submits the form
  const onFormKeyDown = useCallback(
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
        onSubmit={e => {
          e.preventDefault()
          handleSubmit()
        }}
        className={styles.form}
        aria-describedby={error ? errorId : descId}
        aria-busy={saving ? 'true' : 'false'}
        noValidate
        autoComplete="off"
      >
        {/* Visually hidden description to give screen readers context */}
        <span id={descId} className="sr-only">
          Fill in student details, set Course and CDL Class, then save to add
          the student to this company. Overlays are derived automatically.
        </span>

        <FormFields
          form={form}
          set={set}
          firstFieldRef={firstFieldRef}
          instructors={instructors}
          instructorsLoading={!!instructorsLoading}
          onFirstFieldKeyDown={onFormKeyDown}
        />

        {/* Instructor list status (non-blocking; SR-friendly) */}
        {(instructorsLoading || instructorsError) && (
          <div
            className={styles.hint}
            aria-live="polite"
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            {instructorsLoading ? 'Loading instructors…' : String(instructorsError)}
          </div>
        )}

        {/* Derived overlays */}
        <div className={styles.block}>
          <div className={styles.labelRow}>
            <span className={styles.labelStrong}>Overlays (derived)</span>
          </div>
          <OverlayChips overlays={overlays || []} ariaLabel="Derived overlays" />
          <small className={styles.hint}>
            Saved automatically based on Course &amp; CDL Class.
          </small>
        </div>

        {/* Error region (also surfaced in footer via FormActions) */}
        {!!error && (
          <div
            role="alert"
            id={errorId}
            className={styles.error}
            aria-live="polite"
            aria-atomic="true"
          >
            {String(error)}
          </div>
        )}

        {/* Footer actions (Submit / Cancel) */}
        <FormActions
          saving={!!saving}
          canSave={!!canSave}
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
  /** Company under which to create the student (optional) */
  companyId: PropTypes.string,
  /** onClose receives a boolean: true if saved, false if cancelled */
  onClose: PropTypes.func,
}

AddStudentDrawer.defaultProps = {
  open: true,
  companyId: undefined,
  onClose: undefined,
}

export default memo(AddStudentDrawer)