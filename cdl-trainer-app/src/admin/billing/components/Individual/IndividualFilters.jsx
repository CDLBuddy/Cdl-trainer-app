// Path: src/admin/billing/components/Individual/IndividualFilters.jsx
import React from 'react'

function IndividualFiltersBase({
  search = '',
  setSearch = () => {},
  status = 'all',
  setStatus = () => {},
  onlyUnreconciled = false,
  setOnlyUnreconciled = () => {},
  onExportCSV = () => {},
}) {
  // Stable IDs (no re-renders) for accessibility associations
  const searchId = 'ind-filters-search'
  const statusId = 'ind-filters-status'
  const unreconId = 'ind-filters-unreconciled'

  return (
    <header
      role="region"
      aria-label="Filters for individual payments"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '12px',
        alignItems: 'center',
      }}
    >
      {/* Search input */}
      <label htmlFor={searchId} className="visually-hidden">
        Search individual payments
      </label>
      <input
        id={searchId}
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search students…"
        aria-label="Search students by name, email, or course"
        style={{
          padding: '6px 10px',
          border: '1px solid #dcdde2',
          borderRadius: 8,
          minWidth: 220,
          flex: '0 1 auto',
        }}
      />

      {/* Status select */}
      <label htmlFor={statusId} className="visually-hidden">
        Filter by payment status
      </label>
      <select
        id={statusId}
        value={status}
        onChange={e => setStatus(e.target.value)}
        aria-label="Filter payments by status"
        style={{
          padding: '6px 10px',
          border: '1px solid #dcdde2',
          borderRadius: 8,
          flex: '0 1 auto',
        }}
      >
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
        <option value="waived">Waived</option>
      </select>

      {/* Unreconciled checkbox */}
      <label
        htmlFor={unreconId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginLeft: 4,
          userSelect: 'none',
          cursor: 'pointer',
        }}
      >
        <input
          id={unreconId}
          type="checkbox"
          checked={onlyUnreconciled}
          onChange={e => setOnlyUnreconciled(e.target.checked)}
        />
        <span style={{ fontSize: 14 }}>Only unreconciled</span>
      </label>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Export button */}
      <button
        type="button"
        className="btn outline"
        onClick={onExportCSV}
        aria-label="Export currently filtered payments to CSV"
      >
        Export CSV
      </button>
    </header>
  )
}

const IndividualFilters = React.memo(IndividualFiltersBase)
export default IndividualFilters