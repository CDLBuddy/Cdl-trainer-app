// Path: /src/admin/companies/company-detail/components/DetailHeader.jsx
import React, { memo, useCallback } from 'react'
import PropTypes from 'prop-types'
import styles from './DetailHeader.module.css'
import { visuallyHidden } from '../utils/format.js'

function DetailHeader({
  companyId, name,
  search, onSearch,
  onBack, onAdd, onExport,
  billingFilter, setBillingFilter,
  onlyUnassigned, setOnlyUnassigned,
}) {
  const clearSearch = useCallback(() => onSearch(''), [onSearch])

  return (
    <header className={styles.header}>
      {/* Title */}
      <div className={styles.titleBlock}>
        <div className={styles.name} title={name || '(No name)'}>{name || '(No name)'}</div>
        <div className={styles.subtle}>{companyId}</div>
      </div>

      {/* Controls */}
      <div className={styles.controls} role="toolbar" aria-label="Roster actions">
        {/* Search */}
        <div className={styles.searchWrap}>
          <label htmlFor="company-roster-search" style={visuallyHidden}>Search roster</label>
          <input
            id="company-roster-search"
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search roster…"
            aria-label="Search roster"
            className={styles.search}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {!!search && (
            <button
              type="button"
              className={styles.clear}
              onClick={clearSearch}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Billing filter */}
        <label htmlFor="billing-filter" style={visuallyHidden}>Billing mode filter</label>
        <select
          id="billing-filter"
          value={billingFilter}
          onChange={(e) => setBillingFilter(e.target.value)}
          title="Billing mode filter"
          aria-label="Filter by billing mode"
          className={styles.select}
        >
          <option value="all">All billing</option>
          <option value="employer">Employer</option>
          <option value="individual">Individual</option>
        </select>

        {/* Unassigned toggle */}
        <label className={styles.checkboxWrap}>
          <input
            type="checkbox"
            checked={onlyUnassigned}
            onChange={(e) => setOnlyUnassigned(e.target.checked)}
            aria-label="Show unassigned only"
          />
          <span>Unassigned only</span>
        </label>

        {/* Actions */}
        <button className="btn outline" onClick={onExport} title="Export visible roster to CSV">
          Export CSV
        </button>
        <button className="btn" onClick={onAdd} aria-haspopup="dialog" title="Add a student to this company">
          + Add Student
        </button>
        <button className="btn outline" onClick={onBack} title="Back to Companies">
          ⬅ Back
        </button>
      </div>
    </header>
  )
}

DetailHeader.propTypes = {
  companyId: PropTypes.string,
  name: PropTypes.string,
  search: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  billingFilter: PropTypes.string.isRequired,
  setBillingFilter: PropTypes.func.isRequired,
  onlyUnassigned: PropTypes.bool.isRequired,
  setOnlyUnassigned: PropTypes.func.isRequired,
}

export default memo(DetailHeader)