// Path: src/admin/companies/add-company/AddCompanyDrawer.jsx
// ============================================================================
// Admin • Companies • AddCompanyDrawer
// - Right-side drawer to create a new Company
// - Minimal inputs: Name (required), Billing Mode, Contact Email (optional)
// - Flows:
//     1) Create Company
//     2) Create & Add First Student  → parent can deep-link to AddStudentDrawer
// - A11y-first: dialog semantics, initial focus, Escape, focus trap, scroll lock
// - No external deps; pairs with AddCompanyDrawer.module.css
// ============================================================================

import PropTypes from 'prop-types'
import React, {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import styles from './AddCompanyDrawer.module.css'
import useAddCompanyForm from './useAddCompanyForm.js'

const MODE_OPTIONS = [
  { value: 'employer', label: 'Employer-billed' },
  { value: 'individual', label: 'Student-paid' },
]

// Lightweight tabbable detection (kept local to avoid cross-folder deps)
function getTabbables(container) {
  if (!container) return []
  const nodes = Array.from(
    container.querySelectorAll(
      'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )
  )
  return nodes.filter(el => {
    if (!(el instanceof HTMLElement)) return false
    if (el.hasAttribute('disabled')) return false
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    const ti = el.getAttribute('tabindex')
    if (ti != null && Number.parseInt(ti, 10) < 0) return false
    return true
  })
}

function AddCompanyDrawer({ open = false, onClose }) {
  const titleId = useId()
  const descId = useId()
  const nameErrId = `${titleId}-name-err`
  const billErrId = `${titleId}-billing-err`

  const panelRef = useRef(null)
  const firstFieldRef = useRef(null)
  const lastActiveRef = useRef(null)
  const intentRef = useRef('create') // 'create' | 'create-and-add'
  const [closeOnOverlay, setCloseOnOverlay] = useState(true)

  const { values, errors, saving, update, submit } = useAddCompanyForm({
    onSaved: saved => {
      const payload =
        intentRef.current === 'create-and-add'
          ? { ...saved, openAddStudent: true }
          : saved
      onClose?.(payload)
    },
  })

  // -------- Lifecycle: open/close plumbing (focus + scroll lock) ----------
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    // lock scroll
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // remember opener focus
    lastActiveRef.current = document.activeElement

    // initial focus
    const t = setTimeout(() => {
      ;(firstFieldRef.current || panelRef.current)?.focus?.()
    }, 0)

    // keydown: escape + focus trap
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (!saving) onClose?.(false)
        return
      }
      if (e.key !== 'Tab') return
      const tabbables = getTabbables(panelRef.current)
      if (tabbables.length === 0) {
        e.preventDefault()
        panelRef.current?.focus?.()
        return
      }
      const first = tabbables[0]
      const last = tabbables[tabbables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)

    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      // restore focus if possible
      try {
        const el = lastActiveRef.current
        if (el && document.contains(el)) el.focus()
      } catch {
        /* noop */
      }
    }
  }, [open, onClose, saving])

  // (Removed unused stopOverlayFromPanel)

  // Close on background click (disabled while saving)
  const onOverlayMouseDown = useCallback(
    e => {
      if (!closeOnOverlay || saving) return
      if (e.target === e.currentTarget) onClose?.(false)
    },
    [closeOnOverlay, onClose, saving]
  )

  // Submit handlers decide the post-save intent
  const handleCreate = useCallback(async () => {
    if (saving) return
    intentRef.current = 'create'
    await submit()
  }, [submit, saving])

  const handleCreateAndAdd = useCallback(async () => {
    if (saving) return
    intentRef.current = 'create-and-add'
    await submit()
  }, [submit, saving])

  // Allow Enter-to-submit
  const onFormSubmit = useCallback(
    e => {
      e.preventDefault()
      if (saving) return
      handleCreate()
    },
    [handleCreate, saving]
  )

  if (!open) return null

  const hasError = Boolean(errors?.name || errors?.billingMode)
  const canSubmit = !saving && !hasError && values.name.trim().length > 0

  return (
    <div
      className={styles.overlay}
      role="presentation"
      aria-label="Add company drawer overlay"
      data-testid="add-company-drawer"
      onMouseDown={onOverlayMouseDown}
    >
      <aside
        ref={panelRef}
        className={styles.drawer}
        tabIndex={-1}
        aria-live="polite"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h3 id={titleId} className={styles.title}>
              Add Company
            </h3>
            <p id={descId} className={styles.subtitle}>
              Create a new company. You can immediately add the first student
              after saving.
            </p>
          </div>
          <div className={styles.headerActions}>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={closeOnOverlay}
                onChange={e => setCloseOnOverlay(e.target.checked)}
                aria-label="Allow clicking the background to close"
              />
              <span>Overlay closes</span>
            </label>
            <button
              type="button"
              className="btn outline"
              onClick={() => !saving && onClose?.(false)}
              aria-label="Close add company"
              aria-disabled={saving ? 'true' : undefined}
              disabled={saving}
            >
              Close
            </button>
          </div>
        </header>

        {/* Body (wrapped in a form for Enter submit) */}
        <form className={styles.body} onSubmit={onFormSubmit} noValidate>
          {/* Name */}
          <label className={styles.field}>
            <span className={styles.label}>
              Name{' '}
              <span className={styles.req} aria-hidden="true">
                *
              </span>
            </span>
            <input
              ref={firstFieldRef}
              type="text"
              value={values.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Acme Logistics, Inc."
              autoComplete="organization"
              aria-required="true"
              aria-invalid={errors?.name ? 'true' : undefined}
              aria-describedby={errors?.name ? nameErrId : undefined}
            />
            {errors?.name && (
              <small
                id={nameErrId}
                className={styles.error}
                role="status"
                aria-live="polite"
              >
                {errors.name}
              </small>
            )}
          </label>

          {/* Billing Mode */}
          <label className={styles.field}>
            <span className={styles.label}>Billing Mode</span>
            <select
              value={values.billingMode}
              onChange={e => update('billingMode', e.target.value)}
              aria-invalid={errors?.billingMode ? 'true' : undefined}
              aria-describedby={errors?.billingMode ? billErrId : undefined}
            >
              {MODE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors?.billingMode && (
              <small
                id={billErrId}
                className={styles.error}
                role="status"
                aria-live="polite"
              >
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
              onChange={e => update('contactEmail', e.target.value)}
              placeholder="ap@acmelogistics.com"
              inputMode="email"
              autoComplete="email"
            />
          </label>

          {/* Helpful tip */}
          <p className={styles.tip}>
            Tip: Choose <strong>Employer-billed</strong> if invoices are paid by
            the company.&nbsp; Choose <strong>Student-paid</strong> if trainees
            pay individually.
          </p>
        </form>

        {/* Footer */}
        <footer
          className={styles.footer}
          aria-busy={saving ? 'true' : undefined}
        >
          <button
            type="button"
            className="btn outline"
            onClick={() => onClose?.(false)}
            disabled={saving}
          >
            Cancel
          </button>

          <div className={styles.footerActions}>
            <button
              type="button"
              className="btn outline"
              onClick={handleCreateAndAdd}
              disabled={!canSubmit}
              title="Create the company and then add the first student"
              aria-busy={
                saving && intentRef.current === 'create-and-add'
                  ? 'true'
                  : undefined
              }
            >
              {saving && intentRef.current === 'create-and-add'
                ? 'Working…'
                : 'Create & Add First Student'}
            </button>

            <button
              type="submit"
              className="btn"
              onClick={handleCreate}
              disabled={!canSubmit}
              title="Create the company"
              aria-busy={
                saving && intentRef.current === 'create' ? 'true' : undefined
              }
            >
              {saving && intentRef.current === 'create'
                ? 'Saving…'
                : 'Create Company'}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  )
}

AddCompanyDrawer.propTypes = {
  open: PropTypes.bool,
  /**
   * onClose(false | savedCompany | { ...savedCompany, openAddStudent: true })
   * Parent can inspect `openAddStudent` to immediately open AddStudentDrawer with the new company.
   */
  onClose: PropTypes.func,
}

export default memo(AddCompanyDrawer)
