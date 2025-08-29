// Path: /src/admin/companies/company-detail/components/RosterTable.jsx
import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import styles from './RosterTable.module.css'
import SortableTH from './SortableTH.jsx'
import RowBar from './RowBar.jsx'

function RosterTable({
  rows = [],
  companyName = 'company',
  sortKey, sortDir, toggleSort,
  onVerify,
  visuallyHidden,
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <div className={styles.empty}>No students found for this company.</div>
  }

  return (
    <div className={styles.wrap} role="region" aria-label="Company roster">
      <table className={`${styles.table} table`} style={{ minWidth: 860 }}>
        {/* a11y: visually-hidden caption fed from parent util */}
        <caption style={visuallyHidden}>
          {`Roster table: ${rows.length} students for ${companyName}.`}
        </caption>

        {/* optional width hints keep columns stable */}
        <colgroup>
          <col /> {/* Student */}
          <col style={{ width: 260 }} /> {/* Email */}
          <col style={{ width: 140 }} /> {/* Course */}
          <col style={{ width: 100 }} /> {/* Class */}
          <col style={{ width: 120 }} /> {/* Billing */}
          <col style={{ width: 160 }} /> {/* Instructor */}
          <col style={{ width: 180 }} /> {/* Readiness */}
          <col style={{ width: 170 }} /> {/* Actions */}
        </colgroup>

        <thead>
          <tr>
            <SortableTH
              label="Student"
              active={sortKey === 'name'}
              dir={sortDir}
              onClick={() => toggleSort('name')}
            />
            <SortableTH label="Email" asStatic />
            <SortableTH
              label="Course"
              active={sortKey === 'course'}
              dir={sortDir}
              onClick={() => toggleSort('course')}
            />
            <SortableTH
              label="Class"
              active={sortKey === 'cdlClass'}
              dir={sortDir}
              onClick={() => toggleSort('cdlClass')}
            />
            <SortableTH
              label="Billing"
              active={sortKey === 'billing'}
              dir={sortDir}
              onClick={() => toggleSort('billing')}
            />
            <SortableTH
              label="Instructor"
              active={sortKey === 'instructor'}
              dir={sortDir}
              onClick={() => toggleSort('instructor')}
            />
            <SortableTH
              label="Readiness"
              active={sortKey === 'enroll' || sortKey === 'btw'}
              dir={sortDir}
              onClick={() => toggleSort(sortKey === 'enroll' ? 'btw' : 'enroll')}
              title="Click to sort Enroll/BTW"
            />
            <th scope="col">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const billing = String(r.billing?.mode || '—')
            const billingLabel = billing.charAt(0).toUpperCase() + billing.slice(1)
            return (
              <tr key={r.email} tabIndex={-1}>
                <td>{r.name}</td>
                <td className={styles.code}>{r.email}</td>
                <td>{r.course}</td>
                <td>{r.cdlClass}</td>
                <td>{billingLabel}</td>
                <td>{r.assignedInstructor || '—'}</td>
                <td>
                  <div className={styles.bars}>
                    <RowBar label="Enroll" value={r._enroll ?? 0} />
                    <RowBar label="BTW" value={r._btw ?? 0} alt />
                  </div>
                </td>
                <td className={styles.actions}>
                  <button
                    className="btn small"
                    onClick={() => onVerify(r.email)}
                    title={`Verify ${r.name || r.email}`}
                  >
                    Verify
                  </button>
                  <Link
                    className="btn small outline"
                    to={`/instructor/verify/${encodeURIComponent(r.email)}`}
                    title="Open verification"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

RosterTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  companyName: PropTypes.string,
  sortKey: PropTypes.string.isRequired,
  sortDir: PropTypes.oneOf(['asc', 'desc']).isRequired,
  toggleSort: PropTypes.func.isRequired,
  onVerify: PropTypes.func.isRequired,
  visuallyHidden: PropTypes.object,
}

export default memo(RosterTable)