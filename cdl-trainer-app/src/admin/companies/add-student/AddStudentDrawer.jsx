// Path: src/admin/companies/add-student/AddStudentDrawer.jsx
import React from 'react'
import DrawerShell from './DrawerShell.jsx'
import FormFields from './FormFields.jsx'
import OverlayChips from './OverlayChips.jsx'
import useAddStudentForm from './useAddStudentForm.js'
import styles from './AddStudentDrawer.module.css'

export default function AddStudentDrawer({ open = true, companyId, onClose }) {
  const {
    form, set, overlays, error, saving, canSave,
    handleSubmit, firstFieldRef
  } = useAddStudentForm({ companyId, onClose })

  const errorId = error ? 'add-student-error' : undefined

  return (
    <DrawerShell
      open={open}
      title="Add Student"
      onClose={() => onClose?.(false)}
      footer={
        <div className={styles.footer}>
          <button type="button" className="btn outline" onClick={() => onClose?.(false)}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn"
            form="add-student-form"
            disabled={!canSave || saving}
            aria-disabled={!canSave || saving}
            aria-busy={saving ? 'true' : 'false'}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <form
        id="add-student-form"
        onSubmit={handleSubmit}
        className={styles.form}
        aria-describedby={errorId}
        aria-busy={saving ? 'true' : 'false'}
        noValidate
      >
        <FormFields
          form={form}
          set={set}
          firstFieldRef={firstFieldRef}
        />

        <div className={styles.block}>
          <div className={styles.labelRow}>
            <span className={styles.labelStrong}>Overlays (derived)</span>
          </div>
          <OverlayChips overlays={overlays} />
          <small className={styles.hint}>Saved automatically based on Course &amp; CDL Class.</small>
        </div>

        {error && (
          <div role="alert" id={errorId} className={styles.error}>
            {error}
          </div>
        )}
      </form>
    </DrawerShell>
  )
}