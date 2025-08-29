// Path: src/admin/companies/components/CompanyFilters.jsx
// ============================================================================
// CompanyFilters
// - Compact toolbar for list actions: search • export • template • import • bulk
// - A11y-first: toolbar role, labeled controls, proper disabled states
// - Non-breaking props; adds tiny niceties (clear search, reset file input)
// - Stateless; all behavior is delegated via callbacks
// ============================================================================

import PropTypes from 'prop-types'
import React, { memo, useCallback, useId } from 'react'

import './CompanyFilters.module.css'

const noop = () => {}

function CompanyFilters({
  // Search
  search = '',
  setSearch = noop,

  // Exports
  onExportCSV = noop,
  onExportPDF = noop,

  // Template
  onDownloadTemplate = noop,

  // Import
  importInputRef,
  onImportCSV = noop,

  // Bulk
  canBulkDelete = false,
  onBulkDelete = noop,
  canBulkExport = false,
  onBulkExport = noop,

  // Optional slot for extra filters (e.g., billing mode selector)
  children = null,

  className = '',
}) {
  const uid = useId() // base id for controls

  // Reset the hidden file input so the same file can be imported twice in a row
  const handleImportChange = useCallback(
    e => {
      onImportCSV?.(e)
      // Reset the value so onChange will fire if user re-selects the same file
      if (importInputRef?.current) {
        importInputRef.current.value = ''
      } else if (e.target) {
        e.target.value = ''
      }
    },
    [onImportCSV, importInputRef]
  )

  const onClearSearch = useCallback(() => setSearch?.(''), [setSearch])

  return (
    <div
      role="toolbar"
      aria-label="Companies actions"
      className={className}
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: '1em',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {/* Search */}
      <div
        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        <label htmlFor={`${uid}-search`} style={visuallyHidden}>
          Search companies
        </label>
        <input
          id={`${uid}-search`}
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search companies…"
          aria-label="Search companies"
          style={{
            flex: 1,
            minWidth: 200,
            maxWidth: 320,
            padding: '6px 30px 6px 11px',
            borderRadius: 8,
            border: '1px solid #dcdde2',
            outlineOffset: 2,
          }}
        />
        {!!search && (
          <button
            type="button"
            onClick={onClearSearch}
            title="Clear search"
            aria-label="Clear search"
            style={clearXStyle}
          >
            ×
          </button>
        )}
      </div>

      {/* Optional extra filters (e.g., billing mode select) */}
      {children}

      {/* Exports */}
      <button
        className="btn outline"
        type="button"
        onClick={onExportCSV}
        title="Export all rows to CSV"
      >
        Export CSV
      </button>
      <button
        className="btn outline"
        type="button"
        onClick={onExportPDF}
        title="Export all rows to PDF"
      >
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
        id={`${uid}-import`}
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleImportChange}
      />
      <label
        className="btn outline"
        htmlFor={`${uid}-import`}
        style={{ marginBottom: 0, cursor: 'pointer' }}
        title="Import companies from CSV"
      >
        Import CSV
      </label>

      {/* Bulk actions */}
      <button
        className="btn outline"
        type="button"
        disabled={!canBulkDelete}
        aria-disabled={!canBulkDelete}
        onClick={onBulkDelete}
        title={canBulkDelete ? 'Delete selected rows' : 'Select rows to enable'}
        style={{
          color: canBulkDelete ? '#b91c1c' : undefined,
          borderColor: canBulkDelete ? '#b91c1c' : undefined,
        }}
      >
        Delete Selected
      </button>

      <button
        className="btn outline"
        type="button"
        disabled={!canBulkExport}
        aria-disabled={!canBulkExport}
        onClick={onBulkExport}
        title={canBulkExport ? 'Export selected rows' : 'Select rows to enable'}
      >
        Export Selected
      </button>
    </div>
  )
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const clearXStyle = {
  position: 'absolute',
  right: 6,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 22,
  height: 22,
  lineHeight: '20px',
  textAlign: 'center',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
  color: '#6b7280',
}

CompanyFilters.propTypes = {
  search: PropTypes.string,
  setSearch: PropTypes.func,

  onExportCSV: PropTypes.func,
  onExportPDF: PropTypes.func,
  onDownloadTemplate: PropTypes.func,

  importInputRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  onImportCSV: PropTypes.func,

  canBulkDelete: PropTypes.bool,
  onBulkDelete: PropTypes.func,

  canBulkExport: PropTypes.bool,
  onBulkExport: PropTypes.func,

  /** Extra controls slot (e.g., selects, toggles) */
  children: PropTypes.node,
  className: PropTypes.string,
}

export default memo(CompanyFilters)
