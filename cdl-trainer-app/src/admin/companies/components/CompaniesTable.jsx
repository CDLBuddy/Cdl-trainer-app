// Path: src/admin/companies/components/CompaniesTable.jsx
import React from 'react'
import CompanyRow from './CompanyRow.jsx'

/**
 * CompaniesTable
 * A11y-friendly, stateless table wrapper for rendering CompanyRow items.
 *
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
 *  - className?: string  // optional wrapper class
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

  return (
    <div style={{ overflowX: 'auto' }} className={className} role="region" aria-label="Companies table">
      <table className="companies-table" style={{ width: '100%', minWidth: 760 }} role="table">
        <thead>
          <tr>
            <th scope="col" style={{ width: 40 }}>
              <input
                aria-label="Select all companies"
                type="checkbox"
                checked={allChecked}
                onChange={(e) => onToggleAll?.(e.target.checked)}
              />
            </th>
            <th scope="col">Name</th>
            <th scope="col">Contact</th>
            <th scope="col">Address</th>
            <th scope="col">Status</th>
            <th scope="col">Created / By</th>
            <th scope="col" style={{ width: 260 }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {!hasRows ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#799', padding: '12px 8px' }}>
                No companies found for this school.
              </td>
            </tr>
          ) : (
            rows.map((c) => (
              <CompanyRow
                key={c.id}
                company={c}
                isSelected={selectedSet.has(c.id)}
                toggleSelect={() => onToggleRow?.(c.id)}       {/* ✅ aligned to CompanyRow API */}
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

export default React.memo(CompaniesTable)