// Path: src/admin/companies/components/CompanyFilters.jsx
import React, { useId } from 'react'

const noop = () => {}

function CompanyFilters({
  search = '',
  setSearch = noop,

  onExportCSV = noop,
  onExportPDF = noop,
  onDownloadTemplate = noop,

  importInputRef,
  onImportCSV = noop,

  canBulkDelete = false,
  onBulkDelete = noop,

  canBulkExport = false,
  onBulkExport = noop,
}) {
  const importId = useId() // stable, unique id for the hidden file input

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: '1em',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
      role="toolbar"
      aria-label="Companies actions"
    >
      {/* Search */}
      <label htmlFor={`${importId}-search`} style={{ display: 'none' }}>
        Search companies
      </label>
      <input
        id={`${importId}-search`}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search companies…"
        style={{
          flex: 1,
          minWidth: 180,
          maxWidth: 280,
          padding: '6px 11px',
          borderRadius: 8,
          border: '1px solid #ddd',
        }}
        aria-label="Search companies"
      />

      {/* Exports */}
      <button className="btn outline" type="button" onClick={onExportCSV}>
        Export CSV
      </button>
      <button className="btn outline" type="button" onClick={onExportPDF}>
        Export PDF
      </button>

      {/* Template */}
      <button
        className="btn"
        type="button"
        onClick={onDownloadTemplate}
        title="Download CSV template"
      >
        CSV Template
      </button>

      {/* Import */}
      <input
        id={importId}
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={onImportCSV}
      />
      <label className="btn outline" htmlFor={importId} style={{ marginBottom: 0, cursor: 'pointer' }}>
        Import CSV
      </label>

      {/* Bulk actions */}
      <button
        className="btn outline"
        type="button"
        disabled={!canBulkDelete}
        aria-disabled={!canBulkDelete}
        onClick={onBulkDelete}
        style={{ color: '#c00', borderColor: '#c00' }}
      >
        Delete Selected
      </button>

      <button
        className="btn outline"
        type="button"
        disabled={!canBulkExport}
        aria-disabled={!canBulkExport}
        onClick={onBulkExport}
      >
        Export Selected
      </button>
    </div>
  )
}

export default React.memo(CompanyFilters)