// Path: src/admin/companies/components/CompaniesTable.jsx
// ============================================================================
// CompaniesTable
// - A11y-first, stateless table wrapper for rendering CompanyRow items
// - Indeterminate “Select all” when partially selected
// - Graceful empty state; memoized for perf
// - Non-breaking: matches existing CompanyRow API
// ============================================================================

import PropTypes from 'prop-types'
import React, { memo, useEffect, useMemo, useRef } from 'react'

import './CompaniesTable.module.css'
import CompanyRow from './CompanyRow.jsx'

/**
 * Props:
 *  - rows: Array<Company>
 *  - allChecked: boolean
 *  - onToggleAll: (checked:boolean) => void
 *  - selectedSet: Set<string>
 *  - onToggleRow: (id:string) => void
 *  - onSaveRow: (id:string, rowRef?:React.RefObject) => Promise<void> | void
 *  - onRemoveRow: (id:string) => Promise<void> | void
 *  - onOpenDetail: (id:string) => void
 *  - showToast: (msg:string, ms?:number, tone?:'info'|'error'|'success') => void
 *  - className?: string
 */
function CompaniesTable({
  rows = [],
  allChecked = false,
  onToggleAll,
  selectedSet = new Set(),
  onToggleRow,
  onSaveRow,
  onRemoveRow,
  onOpenDetail,
  showToast,
  className = '',
}) {
  const hasRows = Array.isArray(rows) && rows.length > 0
  const selCount = selectedSet?.size ?? 0
  const headerCbRef = useRef(null)

  // Set the header checkbox "indeterminate" state for partial selection
  useEffect(() => {
    if (!headerCbRef.current) return
    headerCbRef.current.indeterminate = !allChecked && selCount > 0
  }, [allChecked, selCount])

  const colSpan = 7

  const captionText = useMemo(() => {
    if (!hasRows) return 'Companies table: no results.'
    return `Companies table: ${rows.length} companies, ${selCount} selected.`
  }, [hasRows, rows.length, selCount])

  return (
    <div
      style={{ overflowX: 'auto' }}
      className={className}
      role="region"
      aria-label="Companies table region"
      data-testid="companies-table-region"
    >
      <table
        className="companies-table"
        style={{ width: '100%', minWidth: 760 }}
      >
        <caption
          style={{
            position: 'absolute',
            left: -9999,
            top: 'auto',
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
        >
          {captionText}
        </caption>

        <thead>
          <tr>
            <th scope="col" style={{ width: 40 }}>
              <input
                ref={headerCbRef}
                aria-label="Select all companies"
                type="checkbox"
                checked={allChecked}
                onChange={e => onToggleAll?.(e.target.checked)}
              />
            </th>
            <th scope="col">Name</th>
            <th scope="col">Contact</th>
            <th scope="col">Address</th>
            <th scope="col">Status</th>
            <th scope="col">Created / By</th>
            <th scope="col" style={{ width: 260 }}>
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {!hasRows ? (
            <tr>
              <td
                colSpan={colSpan}
                style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  padding: '12px 8px',
                }}
              >
                No companies found for this school.
              </td>
            </tr>
          ) : (
            rows.map(c => (
              <CompanyRow
                key={c.id}
                company={c}
                isSelected={selectedSet.has(c.id)}
                // ✅ aligned to CompanyRow API
                toggleSelect={() => onToggleRow?.(c.id)}
                onSave={onSaveRow}
                onRemove={() => onRemoveRow?.(c.id)}
                onOpenDetail={onOpenDetail}
                showToast={showToast}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

CompaniesTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired }))
    .isRequired,
  allChecked: PropTypes.bool,
  onToggleAll: PropTypes.func,
  selectedSet: PropTypes.instanceOf(Set),
  onToggleRow: PropTypes.func,
  onSaveRow: PropTypes.func,
  onRemoveRow: PropTypes.func,
  onOpenDetail: PropTypes.func,
  showToast: PropTypes.func,
  className: PropTypes.string,
}

export default memo(CompaniesTable)
