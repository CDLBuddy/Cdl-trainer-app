// Path: src/admin/companies/components/CompanyRow.jsx
import React, { useCallback, useRef } from 'react'

const inputStyle = { width: '97%', padding: '2px 7px' }
const NAME_RE = /^[\w\s\-'.&]+$/

function fmtDate(val) {
  if (!val) return ''
  try {
    const d = typeof val === 'string' ? new Date(val) : val?.toDate?.() || new Date(val)
    return Number.isNaN(d?.getTime?.()) ? '' : d.toLocaleDateString()
  } catch {
    return ''
  }
}

/**
 * CompanyRow
 * Back-compat notes:
 *  - Selection handler: prefers `toggleSelect`, falls back to `onToggle`.
 *  - Save handler: calls onSave(id, payload, rowRef) so parents that expect rowRef still work.
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
}) {
  const rowRef = useRef(null)

  const handleToggle = useCallback(() => {
    // prefer new prop; fallback to old
    if (typeof toggleSelect === 'function') return toggleSelect()
    if (typeof onToggle === 'function') return onToggle()
  }, [toggleSelect, onToggle])

  const onSaveClick = useCallback(() => {
    const root = rowRef.current
    const name    = root.querySelector('.company-name-input')?.value?.trim()    || ''
    const contact = root.querySelector('.company-contact-input')?.value?.trim() || ''
    const address = root.querySelector('.company-address-input')?.value?.trim() || ''
    const status  = (root.querySelector('.company-status-input')?.value || 'active') === 'active'

    if (!name) return showToast('Company name cannot be empty.')
    if (!NAME_RE.test(name)) return showToast('Invalid company name.')

    // Pass payload + rowRef (rowRef is optional for new handler, required by legacy)
    onSave?.(c.id, { name, contact, address, status }, rowRef)
  }, [c?.id, onSave, showToast])

  return (
    <tr ref={rowRef}>
      <td>
        <input
          aria-label={`Select ${c.name || 'company'}`}
          type="checkbox"
          checked={isSelected}
          onChange={handleToggle}
        />
      </td>

      <td>
        <input
          className="company-name-input"
          defaultValue={c.name}
          maxLength={60}
          style={inputStyle}
          aria-label="Company name"
        />
      </td>

      <td>
        <input
          className="company-contact-input"
          defaultValue={c.contact}
          maxLength={60}
          style={inputStyle}
          aria-label="Company contact"
        />
      </td>

      <td>
        <input
          className="company-address-input"
          defaultValue={c.address}
          maxLength={100}
          style={inputStyle}
          aria-label="Company address"
        />
      </td>

      <td>
        <select
          className="company-status-input"
          defaultValue={c.status ? 'active' : 'inactive'}
          style={{ borderRadius: 7 }}
          aria-label="Company status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </td>

      <td>
        <span style={{ fontSize: '.93em' }}>{fmtDate(c.createdAt)}</span>
        <br />
        <span style={{ fontSize: '.87em', color: '#999' }}>{c.createdBy || ''}</span>
      </td>

      <td>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn outline" onClick={onSaveClick}>Save</button>
          <button
            className="btn outline"
            onClick={onRemove}
            style={{ color: '#b22', borderColor: '#b22' }}
          >
            Remove
          </button>
          <button
            className="btn"
            onClick={() => onOpenDetail?.(c.id)}
            title="Open roster & assignments"
          >
            Open
          </button>
          <button
            className="btn outline"
            onClick={() => showToast(`Viewing users for company: ${c.name}`, 3500, 'info')}
          >
            View Users
          </button>
        </div>
      </td>
    </tr>
  )
}

export default React.memo(CompanyRow)