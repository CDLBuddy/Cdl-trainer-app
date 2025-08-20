//src/admin/reports/components/FiltersBar.jsx
import React from 'react'
import PropTypes from 'prop-types'
import styles from '../AdminReports.module.css'

export default function FiltersBar({ roleFilter, setRoleFilter, search, setSearch, UsersExport, CompaniesExport }) {
  return (
    <div className={styles.controls}>
      <div style={{ minWidth: 280 }}>
        <label htmlFor="user-role-filter"><b>Filter Users by Role:</b></label>
        <select
          id="user-role-filter"
          className="glass-select"
          style={{ marginLeft: 7 }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <UsersExport />
      <CompaniesExport />

      <div style={{ marginLeft: 'auto' }}>
        <label htmlFor="report-search" className={styles.srOnly}>Search users/companies</label>
        <input
          id="report-search"
          type="text"
          placeholder="Search users/companies..."
          style={{ padding: '6px 12px', width: 280 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
FiltersBar.propTypes = {
  roleFilter: PropTypes.string.isRequired,
  setRoleFilter: PropTypes.func.isRequired,
  search: PropTypes.string.isRequired,
  setSearch: PropTypes.func.isRequired,
  UsersExport: PropTypes.elementType.isRequired,
  CompaniesExport: PropTypes.elementType.isRequired,
}