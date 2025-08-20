// Path: src/admin/companies/components/CompanyRow.jsx
// ============================================================================
// CompanyRow
// - Inline-edit row with selection, save/remove, and deep-link actions
// - Back-compat preserved:
//     • Selection handler prefers `toggleSelect`, falls back to `onToggle`
//     • Save handler calls onSave(id, payload, rowRef)
// - A11y-first: explicit labels, keyboard submit (Enter / ⌘/Ctrl+S)
// - Defensive parsing for Firestore Timestamps & ISO strings
// ============================================================================

import PropTypes from 'prop-types'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const inputStyle = { width: '97%', padding: '2px 7px' }
const NAME_RE = /^[\w\s\-'.&]+$/

function fmtDate(val) {
  if (!val) return ''
  try {
    const d =
      typeof val === 'string'
        ? new Date(val)
        : typeof val?.toDate === 'function'
        ? val.toDate()
        : new Date(val)
    return Number.isNaN(d?.getTime?.()) ? '' : d.toLocaleDateString()
  } catch {
    return ''
  }
}

function StatusSelect({ defaultValue }) {
  return (
    <select
      className="company-status-input"
      defaultValue={defaultValue}
      style={{ borderRadius: 7, padding: '2px 6px' }}
      aria-label="Company status"
    >
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  )
}

/**
 * CompanyRow
 */
function CompanyRow({
  company: c,
  isSelected = false,
  // new prop name (preferred)
  toggleSelect,
  // old prop name (back-compat)
  onToggle,
  onSave,
  onRemove,
  onOpenDetail,
  showToast = () => {},
  confirmRemove = true,
}) {
  const rowRef = useRef(null)
  const [busy, setBusy] = useState(false)

  // Derived defaults (defensive)
  const companyName = useMemo(() => c?.name || '', [c?.name])
  const companyContact = useMemo(() => c?.contact || '', [c?.contact])
  const companyAddress = useMemo(() => c?.address || '', [c?.address])
  const statusDefault = useMemo(() => (c?.status ? 'active' : 'inactive'), [c?.status])

  const handleToggle = useCallback(() => {
    if (typeof toggleSelect === 'function') return toggleSelect()
    if (typeof onToggle === 'function') return onToggle()
  }, [toggleSelect, onToggle])

  const readInputs = useCallback(() => {
    const root = rowRef.current
    const name = root?.querySelector('.company-name-input')?.value?.trim() || ''
    const contact = root?.querySelector('.company-contact-input')?.value?.trim() || ''
    const address = root?.querySelector('.company-address-input')?.value?.trim() || ''
    const status = (root?.querySelector('.company-status-input')?.value || 'active') === 'active'
    return { name, contact, address, status }
  }, [])

  const validate = useCallback(
    ({ name }) => {
      if (!name) {
        showToast('Company name cannot be empty.', 3000, 'error')
        return false
      }
      if (!NAME_RE.test(name)) {
        showToast('Invalid company name. Allowed: letters, numbers, spaces, - \' . &', 4200, 'error')
        return false
      }
      return true
    },
    [showToast]
  )

  const onSaveClick = useCallback(async () => {
    const payload = readInputs()
    if (!validate(payload)) return
    try {
      setBusy(true)
      await onSave?.(c.id, payload, rowRef)
      showToast('Company saved.', 2000, 'success')
    } catch (e) {
       
      console.error('[CompanyRow] save failed', e)
      showToast('Failed to save company.', 3000, 'error')
    } finally {
      setBusy(false)
    }
  }, [c?.id, onSave, readInputs, validate, showToast])

  const onRemoveClick = useCallback(async () => {
    if (confirmRemove) {
      const ok = window.confirm(`Remove “${c?.name || 'this company'}”? This cannot be undone.`)
      if (!ok) return
    }
    try {
      setBusy(true)
      await onRemove?.(c?.id)
      showToast('Company removed.', 2000, 'success')
    } catch (e) {
       
      console.error('[CompanyRow] remove failed', e)
      showToast('Failed to remove company.', 3000, 'error')
    } finally {
      setBusy(false)
    }
  }, [c?.name, c?.id, onRemove, showToast, confirmRemove])

  // Keyboard: Enter saves in focused input; ⌘/Ctrl+S saves anywhere inside row
  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const onKey = (e) => {
      const isModS = (e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)
      const isEnter = e.key === 'Enter'
      if (isModS || isEnter) {
        e.preventDefault()
        onSaveClick()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [onSaveClick])

  return (
    <tr ref={rowRef} aria-busy={busy}>
      {/* Select */}
      <td>
        <input
          aria-label={`Select ${c?.name || 'company'}`}
          type="checkbox"
          checked={isSelected}
          onChange={handleToggle}
        />
      </td>

      {/* Name */}
      <td>
        <input
          className="company-name-input"
          defaultValue={companyName}
          maxLength={60}
          style={inputStyle}
          aria-label="Company name"
          placeholder="Acme Logistics"
        />
      </td>

      {/* Contact */}
      <td>
        <input
          className="company-contact-input"
          defaultValue={companyContact}
          maxLength={60}
          style={inputStyle}
          aria-label="Company contact"
          placeholder="ap@acme.com"
        />
      </td>

      {/* Address */}
      <td>
        <input
          className="company-address-input"
          defaultValue={companyAddress}
          maxLength={100}
          style={inputStyle}
          aria-label="Company address"
          placeholder="123 Industrial Way, Phoenix AZ"
        />
      </td>

      {/* Status */}
      <td>
        <StatusSelect defaultValue={statusDefault} />
      </td>

      {/* Created / By */}
      <td>
        <span style={{ fontSize: '.93em' }}>{fmtDate(c?.createdAt)}</span>
        <br />
        <span style={{ fontSize: '.87em', color: '#999' }}>{c?.createdBy || ''}</span>
      </td>

      {/* Actions */}
      <td>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn outline" onClick={onSaveClick} disabled={busy} title="Save (Enter or ⌘/Ctrl+S)">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            className="btn outline"
            onClick={onRemoveClick}
            disabled={busy}
            style={{ color: '#b22', borderColor: '#b22' }}
            title="Remove company"
          >
            Remove
          </button>
          <button
            className="btn"
            onClick={() => onOpenDetail?.(c?.id)}
            disabled={busy}
            title="Open roster & assignments"
          >
            Open
          </button>
          <button
            className="btn outline"
            onClick={() => showToast(`Viewing users for company: ${c?.name || c?.id}`, 3500, 'info')}
            disabled={busy}
            title="View users"
          >
            View Users
          </button>
        </div>
      </td>
    </tr>
  )
}

CompanyRow.propTypes = {
  company: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    contact: PropTypes.string,
    address: PropTypes.string,
    status: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]), // bool legacy or 'active'/'inactive'
    createdAt: PropTypes.any, // Firestore Timestamp | Date | ISO
    createdBy: PropTypes.string,
  }).isRequired,
  isSelected: PropTypes.bool,
  toggleSelect: PropTypes.func,
  onToggle: PropTypes.func,
  onSave: PropTypes.func,
  onRemove: PropTypes.func,
  onOpenDetail: PropTypes.func,
  showToast: PropTypes.func,
  confirmRemove: PropTypes.bool,
}

export default memo(CompanyRow)