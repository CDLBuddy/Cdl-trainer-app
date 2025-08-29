// Path: src/admin/billing/components/Employer/EmployerFilters.jsx
import React, { memo, useId, useCallback } from 'react'

/**
 * EmployerFilters
 * - Controlled search + status filter + CSV export
 * - A11y: explicit labels with ids; toolbar role; keyboard-friendly
 *
 * Props (unchanged):
 *   search: string
 *   setSearch: (val: string) => void
 *   status: 'all'|'unpaid'|'partial'|'paid'
 *   setStatus: (val: string) => void
 *   onExportCSV: () => void
 */
function EmployerFilters({
  search = '',
  setSearch = () => {},
  status = 'all',
  setStatus = () => {},
  onExportCSV = () => {},
}) {
  // Stable, unique ids for label/controls
  const searchId = useId()
  const statusId = useId()

  const onSearchKeyDown = useCallback(
    e => {
      // Quality-of-life: ESC clears search
      if (e.key === 'Escape' && search) {
        e.stopPropagation()
        setSearch('')
      }
    },
    [search, setSearch]
  )

  return (
    <header
      role="toolbar"
      aria-label="Employer invoice actions"
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 10,
        alignItems: 'center',
      }}
    >
      {/* Search */}
      <div style={{ display: 'grid', gap: 4 }}>
        <label htmlFor={searchId} style={{ fontSize: 12, color: '#6b7280' }}>
          Search company or PO
        </label>
        <input
          id={searchId}
          type="search"
          inputMode="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search company or PO…"
          aria-label="Search employer invoices"
          style={{
            padding: '6px 10px',
            border: '1px solid #dcdde2',
            borderRadius: 8,
            minWidth: 220,
          }}
        />
      </div>

      {/* Status filter */}
      <div style={{ display: 'grid', gap: 4 }}>
        <label htmlFor={statusId} style={{ fontSize: 12, color: '#6b7280' }}>
          Status
        </label>
        <select
          id={statusId}
          value={status}
          onChange={e => setStatus(e.target.value)}
          aria-label="Filter by status"
          style={{
            padding: '6px 10px',
            border: '1px solid #dcdde2',
            borderRadius: 8,
          }}
        >
          <option value="all">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Spacer pushes actions to the right */}
      <div style={{ flex: 1 }} />

      {/* Export */}
      <button
        type="button"
        className="btn outline"
        onClick={onExportCSV}
        title="Export the filtered invoices to CSV"
        aria-label="Export filtered invoices to CSV"
      >
        Export CSV
      </button>
    </header>
  )
}

export default memo(EmployerFilters)
