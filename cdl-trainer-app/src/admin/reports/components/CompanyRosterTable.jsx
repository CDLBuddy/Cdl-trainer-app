// src/admin/reports/components/CompanyRosterTable.jsx
// ======================================================================
// CompanyRosterTable
// - Purpose-built roster view for a single company
// - Safe getters (student shape can vary), ready-status heuristic
// - Accessible table, sticky header, mobile-friendly overflow
// - Lightweight skeleton while loading
// - Memoized table + rows to reduce re-renders
// ======================================================================

import PropTypes from 'prop-types'
import React from 'react'

import styles from './CompanyRosterTable.module.css'
import StatusPill from './StatusPill.jsx'

/* ------------------------------- Helpers -------------------------------- */

const norm = v => (v == null ? '' : String(v).trim())

const getFullName = s => {
  const direct = norm(s?.fullName || s?.name)
  if (direct) return direct
  const fn = norm(s?.firstName || s?.first_name)
  const ln = norm(s?.lastName || s?.last_name)
  const combo = `${fn} ${ln}`.trim()
  return combo || norm(s?.email) || 'Student'
}

const getDOB = s => norm(s?.dob || s?.dateOfBirth || s?.birthDate)

const getLicenseNum = s =>
  norm(s?.clpNumber || s?.clp || s?.licenseNumber || s?.license)

const getLicenseState = s => norm(s?.clpState || s?.licenseState || s?.state)

const getTraining = s => {
  const t = s?.training || s?.course || {}
  return {
    classType:
      norm(t?.classType || t?.class || t?.program || '').replace(
        /^class\s*/i,
        ''
      ) || 'A',
    endorsement: norm(t?.endorsement || t?.endorse || ''),
    theory: {
      completed: !!(t?.theory?.completed ?? t?.theoryCompleted),
      completedAt: norm(t?.theory?.completedAt || t?.theoryCompletedAt),
    },
    btw: {
      completed: !!(
        t?.btw?.completed ??
        t?.behindTheWheelCompleted ??
        t?.rangeCompleted
      ),
      completedAt: norm(t?.btw?.completedAt || t?.btwCompletedAt),
      rangeHours: Number(t?.btw?.rangeHours ?? t?.rangeHours ?? 0) || 0,
      publicRoadHours:
        Number(t?.btw?.publicRoadHours ?? t?.roadHours ?? 0) || 0,
    },
    completionDate: norm(t?.completionDate || t?.completedAt),
  }
}

const isReadyForTPRFromTraining = t =>
  Boolean(
    t.theory.completed &&
      t.btw.completed &&
      (t.completionDate || t.theory.completedAt || t.btw.completedAt)
  )

const fmtDate = (v, fmt) => {
  if (!v) return ''
  try {
    const d = new Date(v)
    if (!Number.isFinite(d.getTime())) return v
    return fmt ? fmt.format(d) : d.toLocaleDateString()
  } catch {
    return v
  }
}

/* ------------------------------ Skeletons -------------------------------- */

const RowSkeleton = React.memo(function RowSkeleton({ cols = 8 }) {
  const widths = [220, 110, 130, 80, 120, 120, 120, 80]
  return (
    <tr aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <td className={styles.td} key={i}>
          <span className={styles.skel} style={{ width: widths[i] || 100 }} />
        </td>
      ))}
    </tr>
  )
})

/* --------------------------------- UI ----------------------------------- */

function CompanyRosterTable({
  students = [],
  loading = false,
  onOpenStudent,
  emptyMessage = 'No students found for this company.',
  'aria-label': ariaLabel = 'Company roster table',
}) {
  // Stable collator + date formatter (fast + localized)
  const collator = React.useMemo(
    () => new Intl.Collator(undefined, { sensitivity: 'base' }),
    []
  )
  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
    []
  )

  const rows = React.useMemo(() => {
    const list = Array.isArray(students) ? students : []
    return [...list].sort((a, b) =>
      collator.compare(getFullName(a), getFullName(b))
    )
  }, [students, collator])

  const showActions = !!onOpenStudent

  return (
    <div className={styles.wrap} role="region" aria-label={ariaLabel}>
      <table className={styles.table} aria-busy={loading || undefined}>
        <thead className={styles.thead}>
          <tr>
            <TH>Student</TH>
            <TH>DOB</TH>
            <TH>CLP/CDL #</TH>
            <TH>State</TH>
            <TH>Class</TH>
            <TH>Completed</TH>
            <TH>Status</TH>
            {showActions && <TH align="right">Actions</TH>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <RowSkeleton key={i} cols={showActions ? 8 : 7} />
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td className={styles.td} colSpan={showActions ? 8 : 7}>
                <div className={styles.empty}>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            rows.map((s, idx) => {
              const name = getFullName(s)
              const dob = getDOB(s)
              const lic = getLicenseNum(s)
              const st = getLicenseState(s)
              const t = getTraining(s)
              const ready = isReadyForTPRFromTraining(t)
              const completed =
                t.completionDate ||
                t.btw.completedAt ||
                t.theory.completedAt ||
                ''
              const key = s.id || s.uid || s.email || `${name}-${idx}`

              return (
                <tr key={key} className={styles.row}>
                  <TD>
                    <div className={styles.name}>{name}</div>
                    {s?.email && (
                      <div className={styles.email}>
                        <a href={`mailto:${String(s.email)}`}>
                          {String(s.email)}
                        </a>
                      </div>
                    )}
                  </TD>
                  <TD>{fmtDate(dob, dateFmt) || '—'}</TD>
                  <TD>{lic || '—'}</TD>
                  <TD>{st || '—'}</TD>
                  <TD>
                    <span className={styles.bold}>
                      Class {t.classType || 'A'}
                    </span>
                    {t.endorsement ? (
                      <span className={styles.muted}> • {t.endorsement}</span>
                    ) : null}
                  </TD>
                  <TD>{completed ? fmtDate(completed, dateFmt) : '—'}</TD>
                  <TD>
                    <div className={styles.statusCol}>
                      <StatusPill
                        kind={ready ? 'success' : 'warning'}
                        label={ready ? 'Ready for TPR' : 'Not Ready'}
                        soft
                        size="md"
                      />
                      <div className={styles.substatus}>
                        {t.theory.completed ? 'Theory ✓' : 'Theory —'}
                        {' · '}
                        {t.btw.completed ? 'BTW ✓' : 'BTW —'}
                      </div>
                    </div>
                  </TD>
                  {showActions && (
                    <TD align="right">
                      <button
                        type="button"
                        className={styles.rowAction}
                        onClick={() => onOpenStudent?.(s)}
                        title="View report"
                        aria-label={`View ${name}`}
                      >
                        View
                      </button>
                    </TD>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

CompanyRosterTable.propTypes = {
  students: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  onOpenStudent: PropTypes.func,
  emptyMessage: PropTypes.string,
  'aria-label': PropTypes.string,
}

CompanyRosterTable.displayName = 'CompanyRosterTable'
export default React.memo(CompanyRosterTable)

/* ------------------------------ Subcomponents ---------------------------- */

function TH({ children, align = 'left' }) {
  return (
    <th className={styles.th} scope="col" style={{ textAlign: align }}>
      {children}
    </th>
  )
}
TH.propTypes = {
  children: PropTypes.node,
  align: PropTypes.oneOf(['left', 'right', 'center']),
}

function TD({ children, align = 'left' }) {
  return (
    <td className={styles.td} style={{ textAlign: align }}>
      {children}
    </td>
  )
}
TD.propTypes = {
  children: PropTypes.node,
  align: PropTypes.oneOf(['left', 'right', 'center']),
}
