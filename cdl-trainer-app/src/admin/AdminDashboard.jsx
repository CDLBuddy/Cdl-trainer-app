// src/admin/AdminDashboard.jsx
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc as firestoreDoc,
  deleteDoc,
} from 'firebase/firestore'
import jsPDF from 'jspdf'
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/ToastContext' // ✅ correct source
import { db } from '@utils/firebase.js'

import styles from './AdminDashboard.module.css'

// ------------------------ tiny helpers ------------------------
function daysBetween(dateStr) {
  if (!dateStr) return 9e6
  const dt = new Date(dateStr)
  if (Number.isNaN(dt)) return 9e6
  const now = new Date()
  // positive => future, negative => past
  return Math.floor((dt - now) / (1000 * 60 * 60 * 24))
}
function expirySoon(dateStr) {
  return daysBetween(dateStr) <= 30
}
const clampPct = v => Math.max(0, Math.min(100, Number(v) || 0))

// ------------------------ component ---------------------------
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  // state
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState('')
  const [users, setUsers] = useState([])

  // filters / ui
  const [roleFilter, setRoleFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [search, setSearch] = useState('')
  const [density, setDensity] = useState('cozy') // "cozy" | "compact"

  // pagination (simple client-side)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // debounce search
  const searchRef = useRef(search)
  useEffect(() => {
    const id = setTimeout(() => {
      searchRef.current = search
      setPage(1)
    }, 180)
    return () => clearTimeout(id)
  }, [search])

  // bootstrap fetch
  useEffect(() => {
    const run = async () => {
      const currentUserEmail =
        window.currentUserEmail ||
        localStorage.getItem('currentUserEmail') ||
        null
      if (!currentUserEmail) {
        showToast('No user found. Please log in again.', 'error')
        window.handleLogout?.()
        navigate('/login', { replace: true })
        return
      }

      setLoading(true)

      // fetch current admin (role + school)
      let role = localStorage.getItem('userRole') || 'admin'
      let sid = localStorage.getItem('schoolId') || ''
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', currentUserEmail))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const profile = snap.docs[0].data() || {}
          role = profile.role || role
          sid = profile.schoolId || sid
          localStorage.setItem('userRole', role)
          if (sid) localStorage.setItem('schoolId', sid)
        }
      } catch {
        /* non-fatal */
      }
      setSchoolId(sid)

      if (role !== 'admin' || !sid) {
        showToast('Access denied: Admin role and school required.', 'error')
        window.handleLogout?.()
        navigate('/login', { replace: true })
        return
      }

      // fetch all users for this school
      let allUsers = []
      try {
        const usersSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('schoolId', '==', sid),
            where('role', 'in', ['student', 'instructor', 'admin'])
          )
        )
        allUsers = usersSnap.docs.map(docSnap => {
          const d = docSnap.data() || {}
          return {
            id: docSnap.id,
            name: d.name || 'User',
            email: d.email,
            phone: d.phone || '',
            role: d.role || 'student',
            assignedInstructor: d.assignedInstructor || '',
            assignedCompany: d.assignedCompany || '',
            profileProgress: clampPct(d.profileProgress),
            permitExpiry: d.permitExpiry || '',
            medCardExpiry: d.medCardExpiry || '',
            paymentStatus: d.paymentStatus || '',
            compliance: d.compliance || '',
          }
        })
      } catch {
        showToast('Error fetching users.', 'error')
      }

      setUsers(allUsers)
      setLoading(false)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // derived lists
  const instructorList = useMemo(
    () => users.filter(u => u.role === 'instructor'),
    [users]
  )
  const companyList = useMemo(
    () =>
      Array.from(new Set(users.map(u => u.assignedCompany).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [users]
  )

  const filteredUsers = useMemo(() => {
    const q = searchRef.current.trim().toLowerCase()
    return users.filter(u => {
      if (roleFilter && u.role !== roleFilter) return false
      if (companyFilter && u.assignedCompany !== companyFilter) return false
      if (
        q &&
        !(
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
        )
      )
        return false
      return true
    })
  }, [users, roleFilter, companyFilter])

  // metrics
  const studentCount = useMemo(
    () => users.filter(u => u.role === 'student').length,
    [users]
  )
  const instructorCount = useMemo(
    () => users.filter(u => u.role === 'instructor').length,
    [users]
  )
  const adminCount = useMemo(
    () => users.filter(u => u.role === 'admin').length,
    [users]
  )
  const permitSoon = useMemo(
    () => users.filter(u => expirySoon(u.permitExpiry)).length,
    [users]
  )
  const medSoon = useMemo(
    () => users.filter(u => expirySoon(u.medCardExpiry)).length,
    [users]
  )
  const incomplete = useMemo(
    () => users.filter(u => (u.profileProgress || 0) < 80).length,
    [users]
  )

  // paging slice
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const pageSafe = Math.min(page, pageCount)
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, pageSafe, pageSize])
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  // inline edit handlers (optimistic)
  const updateUser = useCallback(
    async (email, changes) => {
      try {
        setUsers(prev => prev.map(u => (u.email === email ? { ...u, ...changes } : u)))
        await setDoc(
          firestoreDoc(db, 'users', email),
          { ...changes, schoolId },
          { merge: true }
        )
        if (Object.prototype.hasOwnProperty.call(changes, 'role')) {
          await setDoc(
            firestoreDoc(db, 'userRoles', email),
            { role: changes.role, schoolId },
            { merge: true }
          )
        }
        showToast(`Updated user: ${email}`, 'success')
      } catch {
        // revert if failed: refetch would be ideal; quick revert for simple fields
        setUsers(prev => prev.map(u => (u.email === email ? { ...u } : u)))
        showToast('Failed to update user.', 'error')
      }
    },
    [schoolId, showToast]
  )

  const removeUser = useCallback(
    async email => {
      if (!window.confirm(`Remove user: ${email}? This cannot be undone.`)) return
      try {
        await deleteDoc(firestoreDoc(db, 'users', email))
        await deleteDoc(firestoreDoc(db, 'userRoles', email))
        setUsers(prev => prev.filter(u => u.email !== email))
        showToast(`User ${email} removed`, 'success')
      } catch {
        showToast('Failed to remove user.', 'error')
      }
    },
    [showToast]
  )

  // exports
  const exportUsersToCSV = useCallback(
    (list, filename = 'users') => {
      if (!list.length) return showToast('No users to export.', 'error')
      const headers = [
        'name',
        'email',
        'role',
        'assignedCompany',
        'assignedInstructor',
        'profileProgress',
        'permitExpiry',
        'medCardExpiry',
        'paymentStatus',
      ]
      const csv = [
        headers.join(','),
        ...list.map(u =>
          headers
            .map(h => `"${String(u[h] ?? '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        URL.revokeObjectURL(url)
        a.remove()
      }, 200)
      showToast('CSV export downloaded.', 'success')
    },
    [showToast]
  )

  const exportUsersToPDF = useCallback(
    list => {
      if (!list.length) return showToast('No users to export.', 'error')
      const docPdf = new jsPDF()
      docPdf.setFontSize(14)
      docPdf.text('Users List', 10, 16)
      const headers = [
        'Name',
        'Email',
        'Role',
        'Company',
        'Instructor',
        'Profile %',
        'Permit Exp.',
        'MedCard Exp.',
        'Payment',
      ]
      let y = 25
      docPdf.setFontSize(10)
      docPdf.text(headers.join(' | '), 10, y)
      y += 7
      list.forEach(u => {
        const row = [
          u.name,
          u.email,
          u.role,
          u.assignedCompany,
          u.assignedInstructor,
          `${clampPct(u.profileProgress)}%`,
          u.permitExpiry || '',
          u.medCardExpiry || '',
          u.paymentStatus || '',
        ].join(' | ')
        docPdf.text(row, 10, y)
        y += 6
        if (y > 280) {
          docPdf.addPage()
          y = 15
        }
      })
      docPdf.save(`users-export-${new Date().toISOString().slice(0, 10)}.pdf`)
      showToast('PDF export generated.', 'success')
    },
    [showToast]
  )

  // loading
  if (loading) {
    return (
      <Shell title="Admin Dashboard">
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div className="spinner" />
          <p>Loading admin dashboard…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="Admin Dashboard">
      <div
        className={`${styles.wrapper} ${
          density === 'compact' ? styles.compact : ''
        }`}
      >
        {/* Metrics */}
        <div className={styles.kpiRow} role="group" aria-label="Key metrics">
          <div className={styles.kpiCard}>
            <b>👨‍🎓 Students:</b> <span>{studentCount}</span>
          </div>
          <div className={styles.kpiCard}>
            <b>👨‍🏫 Instructors:</b> <span>{instructorCount}</span>
          </div>
          <div className={styles.kpiCard}>
            <b>🛡 Admins:</b> <span>{adminCount}</span>
          </div>
          <div className={`${styles.kpiCard} ${styles.warn}`}>
            <b>🚨 Permit Soon:</b> <span>{permitSoon}</span>
          </div>
          <div className={`${styles.kpiCard} ${styles.warn}`}>
            <b>🚨 Med Card Soon:</b> <span>{medSoon}</span>
          </div>
          <div className={styles.kpiCard}>
            <b>
              📝 <span title="Profile &lt; 80%">Incomplete Profiles</span>:
            </b>{' '}
            <span>{incomplete}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="u-toolbar" style={{ gap: 12 }}>
          <div className="u-field is-inline">
            <label className="u-label" htmlFor="roleFilterSelect">
              Role
            </label>
            <select
              id="roleFilterSelect"
              className="u-select"
              value={roleFilter}
              onChange={e => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="u-field is-inline">
            <label className="u-label" htmlFor="companyFilterSelect">
              Company
            </label>
            <select
              id="companyFilterSelect"
              className="u-select"
              value={companyFilter}
              onChange={e => {
                setCompanyFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              {companyList.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="u-field is-inline" style={{ flex: 1, minWidth: 220 }}>
            <label className="u-label" htmlFor="searchInput">
              Search
            </label>
            <input
              id="searchInput"
              className="u-input"
              type="search"
              placeholder="Name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape' && search) setSearch('')
              }}
            />
          </div>

          <div className="u-field is-inline">
            <label className="u-label" htmlFor="pageSizeSelect">
              Page size
            </label>
            <select
              id="pageSizeSelect"
              className="u-select"
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[10, 25, 50, 100].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <fieldset
            className="u-field is-inline"
            style={{ border: 'none', padding: 0, margin: 0 }}
          >
            <legend className="u-label">Density</legend>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn outline ${density === 'cozy' ? 'is-active' : ''}`}
                onClick={() => setDensity('cozy')}
                title="Cozy spacing"
                aria-pressed={density === 'cozy'}
              >
                Cozy
              </button>
              <button
                type="button"
                className={`btn outline ${density === 'compact' ? 'is-active' : ''}`}
                onClick={() => setDensity('compact')}
                title="Compact spacing"
                aria-pressed={density === 'compact'}
              >
                Compact
              </button>
            </div>
          </fieldset>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="btn outline"
              onClick={() => exportUsersToCSV(filteredUsers)}
            >
              Export CSV
            </button>
            <button
              className="btn outline"
              onClick={() => exportUsersToPDF(filteredUsers)}
            >
              Export PDF
            </button>
            <button
              className="btn outline"
              onClick={() =>
                exportUsersToCSV(
                  filteredUsers.filter(u => expirySoon(u.permitExpiry)),
                  'permit-expiring'
                )
              }
              title="Export users with permits expiring within 30 days"
            >
              Expiring Permits
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="dashboard-card">
          <div className={styles.tableWrap}>
            <table className={styles.table} role="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Company</th>
                  <th scope="col">Assigned Instructor</th>
                  <th scope="col">Profile %</th>
                  <th scope="col">Permit Exp.</th>
                  <th scope="col">MedCard Exp.</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map(u => (
                  <tr
                    key={u.email}
                    className={
                      expirySoon(u.permitExpiry) ? styles.rowWarn : undefined
                    }
                  >
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="u-select is-sm"
                        value={u.role}
                        onChange={e =>
                          updateUser(u.email, { role: e.target.value })
                        }
                        aria-label={`Role for ${u.email}`}
                      >
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="u-input is-sm"
                        type="text"
                        value={u.assignedCompany}
                        onChange={e =>
                          updateUser(u.email, {
                            assignedCompany: e.target.value,
                          })
                        }
                        placeholder="(Company)"
                        aria-label={`Company for ${u.email}`}
                      />
                    </td>
                    <td>
                      <select
                        className="u-select is-sm"
                        value={u.assignedInstructor}
                        onChange={e =>
                          updateUser(u.email, {
                            assignedInstructor: e.target.value,
                          })
                        }
                        aria-label={`Instructor for ${u.email}`}
                      >
                        <option value="">(None)</option>
                        {instructorList.map(inst => (
                          <option key={inst.email} value={inst.email}>
                            {inst.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{clampPct(u.profileProgress)}%</td>
                    <td
                      className={
                        expirySoon(u.permitExpiry) ? styles.expiry : undefined
                      }
                    >
                      {u.permitExpiry || ''}
                    </td>
                    <td
                      className={
                        expirySoon(u.medCardExpiry) ? styles.expiry : undefined
                      }
                    >
                      {u.medCardExpiry || ''}
                    </td>
                    <td>{u.paymentStatus || ''}</td>
                    <td>
                      <button
                        className="btn outline"
                        onClick={() => removeUser(u.email)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {pageSlice.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', opacity: 0.8 }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="u-flex u-flex-between u-wrap"
            style={{ marginTop: 12, gap: 10 }}
          >
            <div>
              Showing{' '}
              <b>
                {filteredUsers.length ? (pageSafe - 1) * pageSize + 1 : 0}–
                {Math.min(pageSafe * pageSize, filteredUsers.length)}
              </b>{' '}
              of <b>{filteredUsers.length}</b>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn outline"
                disabled={pageSafe <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <button
                className="btn outline"
                disabled={pageSafe >= pageCount}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* Admin Sections */}
        <div className="u-grid u-grid-2 u-gap-16">
          <div className="dashboard-card">
            <h3>🏢 Manage Companies</h3>
            <p>Create, edit, and view all companies that send students to your school.</p>
            <button
              className="btn wide"
              style={{ marginTop: 10 }}
              onClick={() => navigate('/admin/companies')}
            >
              Open Companies Page
            </button>
          </div>

          <div className="dashboard-card">
            <h3>📝 Reports & Batch Messaging</h3>
            <p>
              Download user data, filter for missing docs, and message all students or instructors with one click.
              <br />
              <em>(Coming soon: advanced exports, batch reminders, activity logs…)</em>
            </p>
            <button
              className="btn wide"
              style={{ marginTop: 10 }}
              onClick={() => navigate('/admin/reports')}
            >
              Open Reports Page
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}