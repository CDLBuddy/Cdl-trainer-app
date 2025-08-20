//src/admin/reports/components/UsersTable.jsx
import React from 'react'
import PropTypes from 'prop-types'
import styles from '../AdminReports.module.css'

export default function UsersTable({ rows }) {
  return (
    <div className={styles.tableScroll}>
      {rows.length ? (
        <table style={{ width: '100%', minWidth: 700 }}>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Company</th>
              <th>Permit Expiry</th><th>Profile %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <tr key={u.email || i}>
                <td>{u.name || '-'}</td>
                <td>{u.email || '-'}</td>
                <td><span className={`role-badge ${u.role || ''}`}>{u.role || '-'}</span></td>
                <td>{u.assignedCompany || '-'}</td>
                <td>{u.permitExpiry || '-'}</td>
                <td>{u.profileProgress != null ? `${u.profileProgress}%` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: '2em', textAlign: 'center', color: '#789' }}>No users found.</div>
      )}
    </div>
  )
}
UsersTable.propTypes = { rows: PropTypes.array.isRequired }