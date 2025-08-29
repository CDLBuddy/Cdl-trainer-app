//src/admin/reports/components/UsersTable.jsx
import PropTypes from 'prop-types'
import React from 'react'

import styles from './UsersTable.module.css'

/**
 * UsersTable (global users list)
 * - Columns: Name, Email, Role, Company, Permit Expiry, Profile %
 * - Supports loading skeletons, empty state, and optional onOpenStudent action
 * - Row-level memoization to avoid re-renders for unchanged rows
 */
function UsersTable({
  rows = [],
  loading = false,
  emptyMessage = 'No users found.',
  onOpenStudent, // optional; if provided, a "View" action appears for students
}) {
  const data = React.useMemo(() => (Array.isArray(rows) ? rows : []), [rows])

  // one Intl formatter per table (fast + consistent)
  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
    []
  )

  return (
    <div className={styles.tableWrap} role="region" aria-label="Users table">
      <table
        className={styles.table}
        style={{ minWidth: 760 }}
        aria-busy={loading || undefined}
      >
        <thead>
          <tr>
            <th className={styles.th} scope="col">
              Name
            </th>
            <th className={styles.th} scope="col">
              Email
            </th>
            <th className={styles.th} scope="col">
              Role
            </th>
            <th className={styles.th} scope="col">
              Company
            </th>
            <th className={styles.th} scope="col">
              Permit Expiry
            </th>
            <th className={styles.th} scope="col">
              Profile %
            </th>
            {onOpenStudent && (
              <th className={styles.th} scope="col" style={{ width: 1 }} />
            )}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            // Skeleton rows
            Array.from({
              length: Math.max(6, Math.min(10, data.length || 6)),
            }).map((_, i) => (
              <tr key={`skel-${i}`} aria-hidden>
                <td className={styles.td}>
                  <span className={styles.skel} style={{ width: 160 }} />
                </td>
                <td className={styles.td}>
                  <span className={styles.skel} style={{ width: 220 }} />
                </td>
                <td className={styles.td}>
                  <span className={styles.skel} style={{ width: 80 }} />
                </td>
                <td className={styles.td}>
                  <span className={styles.skel} style={{ width: 140 }} />
                </td>
                <td className={styles.td}>
                  <span className={styles.skel} style={{ width: 110 }} />
                </td>
                <td className={styles.td}>
                  <span className={styles.skel} style={{ width: 60 }} />
                </td>
                {onOpenStudent && <td className={styles.td} />}
              </tr>
            ))
          ) : data.length ? (
            data.map((u, i) => {
              const key =
                u?.id ||
                u?.uid ||
                u?.email ||
                `${safeText(u?.name) || 'row'}-${i}`
              return (
                <UserRow
                  key={key}
                  u={u}
                  onOpenStudent={onOpenStudent}
                  dateFmt={dateFmt}
                />
              )
            })
          ) : (
            <tr>
              <td className={styles.td} colSpan={onOpenStudent ? 7 : 6}>
                <div
                  style={{
                    padding: '1.25rem 0',
                    textAlign: 'center',
                    color: '#789',
                  }}
                >
                  {emptyMessage}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

UsersTable.propTypes = {
  rows: PropTypes.array,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  onOpenStudent: PropTypes.func,
}

UsersTable.defaultProps = {
  rows: [],
  loading: false,
  emptyMessage: 'No users found.',
  onOpenStudent: undefined,
}

UsersTable.displayName = 'UsersTable'
export default React.memo(UsersTable)

/* -------------------------------- Row ----------------------------------- */

const UserRow = React.memo(
  function UserRow({ u, onOpenStudent, dateFmt }) {
    const name =
      safeText(u?.name) ||
      safeText(u?.fullName) ||
      safeText(u?.displayName) ||
      '—'
    const email = safeText(u?.email) || '—'
    const roleRaw = String(u?.role || '').toLowerCase()
    const role = roleRaw || '—'
    const company = safeText(u?.assignedCompany) || safeText(u?.company) || '—'
    const permit = formatDateMaybe(u?.permitExpiry, dateFmt) || '—'
    const profile = clampPct(u?.profileProgress)

    const { label: roleLabel, style: roleStyle } = rolePill(role)
    const { label: permitLabel, warn } = expiryLabel(u?.permitExpiry, dateFmt)

    return (
      <tr>
        <th className={styles.td} scope="row" style={{ fontWeight: 600 }}>
          {name}
        </th>
        <td className={styles.td}>
          {email !== '—' ? (
            <a href={`mailto:${email}`} style={{ color: 'inherit' }}>
              {email}
            </a>
          ) : (
            '—'
          )}
        </td>
        <td className={styles.td}>
          <span
            className={styles.pill}
            style={roleStyle}
            title={`Role: ${roleLabel}`}
          >
            {roleLabel}
          </span>
        </td>
        <td className={styles.td}>{company}</td>
        <td className={styles.td}>
          {permit === '—' ? (
            '—'
          ) : (
            <span
              className={`${styles.pill} ${warn ? styles.pillWarn : ''}`}
              title="CLP/CDL permit expiration"
            >
              {permitLabel || permit}
            </span>
          )}
        </td>
        <td className={styles.td}>
          {Number.isFinite(profile) ? (
            <span title={`${profile}%`}>
              <strong>{profile}%</strong>
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 60,
                  height: 6,
                  marginLeft: 8,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,.15)',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${profile}%`,
                    borderRadius: 999,
                    background: 'var(--brand-light, #4e91ad)',
                  }}
                />
              </span>
            </span>
          ) : (
            '—'
          )}
        </td>

        {onOpenStudent && (
          <td className={styles.td} style={{ textAlign: 'right' }}>
            {role === 'student' ? (
              <button
                type="button"
                className={styles.rowAction}
                aria-label={`View ${name}`}
                onClick={() => onOpenStudent?.(u)}
              >
                View
              </button>
            ) : (
              <span className={styles.muted} style={{ fontSize: 12 }}>
                —
              </span>
            )}
          </td>
        )}
      </tr>
    )
  },
  (prev, next) =>
    prev.u === next.u &&
    prev.onOpenStudent === next.onOpenStudent &&
    prev.dateFmt === next.dateFmt
)

UserRow.propTypes = {
  u: PropTypes.object.isRequired,
  onOpenStudent: PropTypes.func,
  dateFmt: PropTypes.object.isRequired, // Intl.DateTimeFormat
}

/* -------------------------- internals -------------------------- */

function safeText(v) {
  return v == null ? '' : String(v).trim()
}

function clampPct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.min(100, Math.round(n)))
}

function formatDateMaybe(v, fmt) {
  if (!v) return ''
  try {
    const dt = new Date(v)
    if (!Number.isFinite(dt.getTime())) return ''
    return fmt ? fmt.format(dt) : dt.toLocaleDateString()
  } catch {
    return ''
  }
}

/** Returns { label, warn } for permit expiry */
function expiryLabel(raw, fmt) {
  const label = formatDateMaybe(raw, fmt)
  if (!label) return { label: '', warn: false }
  try {
    const ms = Date.now()
    const t = new Date(raw).getTime()
    const days = Math.round((t - ms) / (1000 * 60 * 60 * 24))
    return {
      label: days <= 30 ? `${label} • ${Math.max(days, 0)}d` : label,
      warn: days <= 30,
    }
  } catch {
    return { label, warn: false }
  }
}

/** Role pill styling */
function rolePill(role) {
  const base = { label: role || '—', style: {} }
  switch (role) {
    case 'student':
      return {
        label: 'Student',
        style: {
          background: 'rgba(78,145,173,.18)',
          color: 'var(--brand-light, #4e91ad)',
        },
      }
    case 'instructor':
      return {
        label: 'Instructor',
        style: { background: 'rgba(100,181,246,.18)', color: '#60a5fa' },
      }
    case 'admin':
      return {
        label: 'Admin',
        style: {
          background: 'rgba(72,187,120,.18)',
          color: 'var(--success,#48bb78)',
        },
      }
    case 'superadmin':
      return {
        label: 'Super Admin',
        style: {
          background: 'rgba(229,62,62,.18)',
          color: 'var(--error,#e53e3e)',
        },
      }
    default:
      return base
  }
}
