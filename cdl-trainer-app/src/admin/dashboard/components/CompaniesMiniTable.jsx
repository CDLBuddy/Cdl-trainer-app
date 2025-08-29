// Path: src/admin/dashboard/components/CompaniesMiniTable.jsx
// ============================================================================
// CompaniesMiniTable
// - Compact dashboard widget summarizing companies at a glance
// - Props:
//     companies: Array<{ id, name, status, studentCount?, instructorCount? }>
//     onView: (companyId) => void          // optional; falls back to link
//     limit: number                        // optional, default 6
//     loading: boolean                     // optional skeleton mode
// - Styling: CompaniesMiniTable.module.css
// ============================================================================

import React, { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'

import styles from './CompaniesMiniTable.module.css'

function StatusPill({ status = 'active' }) {
  const s = String(status || '').toLowerCase()
  const cls =
    s === 'inactive'
      ? styles.pillInactive
      : s === 'pending'
        ? styles.pillPending
        : styles.pillActive
  const label =
    s === 'inactive' ? 'Inactive' : s === 'pending' ? 'Pending' : 'Active'
  return (
    <span className={`${styles.pill} ${cls}`} aria-label={`Status: ${label}`}>
      {label}
    </span>
  )
}

function RowSkeleton() {
  return (
    <tr className={styles.skelRow} aria-hidden>
      <td>
        <span className={styles.skelBlock} style={{ width: '60%' }} />
      </td>
      <td className={styles.num}>
        <span className={styles.skelBlock} style={{ width: '32px' }} />
      </td>
      <td className={styles.num}>
        <span className={styles.skelBlock} style={{ width: '32px' }} />
      </td>
      <td>
        <span className={`${styles.pill} ${styles.pillGhost}`} />
      </td>
      <td className={styles.actions}>
        <span className={styles.skelBtn} />
      </td>
    </tr>
  )
}

function CompaniesMiniTable({
  companies = [],
  onView,
  limit = 6,
  loading = false,
}) {
  const rows = useMemo(() => {
    const list = Array.isArray(companies) ? companies : []
    // Light sort: active first, then by name
    const score = s => (s === 'active' ? 0 : s === 'pending' ? 1 : 2)
    return list
      .slice()
      .sort((a, b) => {
        const byStatus =
          score(String(a.status || '').toLowerCase()) -
          score(String(b.status || '').toLowerCase())
        if (byStatus !== 0) return byStatus
        return String(a.name || '').localeCompare(
          String(b.name || ''),
          undefined,
          { sensitivity: 'base' }
        )
      })
      .slice(0, Math.max(1, limit))
  }, [companies, limit])

  return (
    <section
      className={styles.card}
      aria-label="Companies overview"
      data-widget="companies-mini-table"
    >
      <header className={styles.header}>
        <h3 className={styles.title}>Companies</h3>
        {/* Optional count */}
        <span className={styles.count} aria-live="polite">
          {Array.isArray(companies) ? companies.length : 0} total
        </span>
      </header>

      <div
        className={styles.tableWrap}
        role="group"
        aria-label="Companies table"
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col" className={styles.num}>
                Students
              </th>
              <th scope="col" className={styles.num}>
                Instructors
              </th>
              <th scope="col">Status</th>
              <th scope="col" className={styles.actions}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
                <RowSkeleton key={i} />
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No companies yet.
                </td>
              </tr>
            ) : (
              rows.map(c => (
                <tr key={c.id || c.name}>
                  <td className={styles.nameCell}>
                    <div className={styles.name}>
                      {c.name || 'Untitled Company'}
                    </div>
                    {c.code ? (
                      <div className={styles.subtle}>Code: {c.code}</div>
                    ) : null}
                  </td>
                  <td className={styles.num}>
                    {Number(c.studentCount ?? c.students ?? 0)}
                  </td>
                  <td className={styles.num}>
                    {Number(c.instructorCount ?? c.instructors ?? 0)}
                  </td>
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                  <td className={styles.actions}>
                    {typeof onView === 'function' ? (
                      <button
                        type="button"
                        className="btn outline"
                        onClick={() => onView(c.id)}
                        aria-label={`View ${c.name} details`}
                      >
                        View
                      </button>
                    ) : (
                      <Link
                        className="btn outline"
                        to={`/admin/companies/${encodeURIComponent(c.id ?? '')}`}
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Optional footer slot for “View all” */}
      {!loading &&
        Array.isArray(companies) &&
        companies.length > rows.length && (
          <footer className={styles.footer}>
            <Link
              to="/admin/companies"
              className={styles.viewAllLink}
              aria-label="View all companies"
            >
              View all →
            </Link>
          </footer>
        )}
    </section>
  )
}

export default memo(CompaniesMiniTable)
