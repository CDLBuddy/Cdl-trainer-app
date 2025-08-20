// src/admin/AdminReports.jsx
// Admin Reports — split, polished, no messaging (handled in /communications)
import PropTypes from 'prop-types'
import React from 'react'

import ExportCompaniesControls from '@admin/ExportCompaniesControls.jsx'
import ExportUsersControls     from '@admin/ExportUsersControls.jsx'

import styles from './AdminReports.module.css'
import { ChecklistCard, FiltersBar, UsersTable } from './components'
import { useReports, useChecklistPdf } from './hooks'

// Keep your existing export controls (standalone atoms)

export default function AdminReports({ currentSchoolId, currentRole }) {
  const {
    brand, companies, loading, error,
    roleFilter, setRoleFilter, search, setSearch,
    filteredUsers,
  } = useReports(currentSchoolId)

  const downloadChecklistPDF = useChecklistPdf()

  if (currentRole !== 'admin') {
    return (
      <div className="dashboard-card" style={{ margin: '2em auto', maxWidth: 460 }}>
        <h3>Access Denied</h3><p>This page is for admins only.</p>
      </div>
    )
  }

  return (
    <div className={`screen-wrapper fade-in ${styles.wrap}`}>
      <header className={styles.head}>
        <h2 className="dash-head">📄 Admin Reports</h2>
        {brand?.schoolName && (
          <div className={styles.scope}>Scope: <span title="Current School">{brand.schoolName}</span></div>
        )}
      </header>

      {loading ? (
        <div className="dashboard-card" role="status" aria-live="polite"><p>Loading reports…</p></div>
      ) : error ? (
        <div className="dashboard-card" role="alert" style={{ border: '1px solid #ff8a8a' }}><p>{error}</p></div>
      ) : (
        <>
          <ChecklistCard onDownload={downloadChecklistPDF} />

          <section className="dashboard-card" style={{ marginBottom: '2em' }}>
            <div className="section-title">Reports & Data Export</div>

            <FiltersBar
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              search={search}
              setSearch={setSearch}
              UsersExport={() => <ExportUsersControls users={filteredUsers} />}
              CompaniesExport={() => <ExportCompaniesControls companies={companies} />}
            />

            <UsersTable rows={filteredUsers} />

            <small style={{ color: '#77a', display: 'block', marginTop: '1em' }}>
              <b>Tips:</b> Exports are scoped to this school. Use filters and search to narrow results before exporting.
            </small>
          </section>
        </>
      )}
    </div>
  )
}

AdminReports.propTypes = {
  currentSchoolId: PropTypes.string,
  currentRole: PropTypes.string,
}
AdminReports.defaultProps = { currentSchoolId: '', currentRole: 'admin' }