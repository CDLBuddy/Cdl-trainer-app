// src/admin/AdminReports.jsx
import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import {
  fetchUsersForSchool,
  fetchCompaniesForSchool,
} from '@utils/admin-data.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

import ExportCompaniesControls from './ExportCompaniesControls.jsx'
import ExportUsersControls from './ExportUsersControls.jsx'

// Lazy-load jsPDF only for checklist download (keeps bundle light)
let _jsPDF = null
async function ensureJsPDF() {
  if (_jsPDF) return _jsPDF
  const mod = await import('jspdf')
  _jsPDF = mod.jsPDF
  return _jsPDF
}

const DOT_CHECKLIST = [
  'School/provider registered in FMCSA TPR',
  'Instructor qualifications (certificates, resumes) on file',
  'Student records: progress, completion status, exam attempts',
  'Copy of CDL permit & medical card for each student',
  'Training curriculum/lesson records retained',
  'Range & behind-the-wheel hours tracked for each student',
  'Assessment & skills test records (including scores)',
  'Student completion reported to TPR (export available)',
  'All records retained for at least 3 years (FMCSA & Indiana BMV)',
]

const AdminReports = ({ currentSchoolId, currentRole }) => {
  const [brand, setBrand] = useState(null)
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')

  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // Debounce search for smoother typing
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(search.trim().toLowerCase()), 180)
    return () => clearTimeout(id)
  }, [search])

  // Load branding, users, companies
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setLoadErr('')
        const [b, userList, companyList] = await Promise.all([
          getCurrentSchoolBranding(),
          fetchUsersForSchool(currentSchoolId),
          fetchCompaniesForSchool(currentSchoolId),
        ])
        if (cancelled) return
        setBrand(b || {})
        setUsers(Array.isArray(userList) ? userList : [])
        setCompanies(Array.isArray(companyList) ? companyList : [])
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setLoadErr('Failed to load reports data. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentSchoolId])

  const filteredUsers = useMemo(() => {
    let list = users
    if (roleFilter) list = list.filter(u => u.role === roleFilter)
    if (debouncedQ) {
      list = list.filter(u => {
        const q = debouncedQ
        return (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.assignedCompany && u.assignedCompany.toLowerCase().includes(q)) ||
          (u.assignedInstructor &&
            u.assignedInstructor.toLowerCase().includes(q))
        )
      })
    }
    return list
  }, [users, roleFilter, debouncedQ])

  const downloadChecklistPDF = useCallback(async () => {
    const jsPDF = await ensureJsPDF()
    const doc = new jsPDF({ unit: 'pt', compress: true })
    doc.setFontSize(16)
    doc.text('DOT/ELDT Compliance Checklist (Indiana)', 32, 32)
    doc.setFontSize(11)
    let y = 56
    DOT_CHECKLIST.forEach(item => {
      doc.text(`\u2610  ${item}`, 32, y) // ☐
      y += 20
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        y = 40
      }
    })
    doc.save('IN_DOT_ELDT_Checklist.pdf')
  }, [])

  if (currentRole !== 'admin') {
    return (
      <div
        className="dashboard-card"
        style={{ margin: '2em auto', maxWidth: 460 }}
      >
        <h3>Access Denied</h3>
        <p>This page is for admins only.</p>
      </div>
    )
  }

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ maxWidth: 1000, margin: '0 auto' }}
    >
      <header style={{ marginBottom: '1rem' }}>
        <h2 className="dash-head">📄 Admin Reports & Messaging</h2>
        {brand?.schoolName && (
          <div style={{ color: '#6b8a99', fontWeight: 600 }}>
            Scope: <span title="Current School">{brand.schoolName}</span>
          </div>
        )}
      </header>

      {loading ? (
        <div className="dashboard-card" role="status" aria-live="polite">
          <p>Loading reports…</p>
        </div>
      ) : loadErr ? (
        <div
          className="dashboard-card"
          role="alert"
          style={{ border: '1px solid #ff8a8a' }}
        >
          <p>{loadErr}</p>
        </div>
      ) : (
        <>
          {/* Compliance checklist */}
          <section
            className="dashboard-card compliance-checklist-card"
            style={{ marginBottom: '1.5em' }}
          >
            <h3>📝 DOT/ELDT Compliance Checklist (Indiana)</h3>
            <ul style={{ marginLeft: '1em', marginTop: '.6em' }}>
              {DOT_CHECKLIST.map((line, idx) => (
                <li key={idx}>☐ {line}</li>
              ))}
            </ul>
            <small
              style={{ color: '#77a', display: 'block', marginTop: '0.6em' }}
            >
              <b>Tip:</b> Use this checklist to ensure your provider stays
              audit-ready. Export records as needed.
            </small>
            <button
              className="btn btn-outline"
              style={{ marginTop: '0.7em' }}
              onClick={downloadChecklistPDF}
            >
              ⬇️ Download Checklist (PDF)
            </button>
          </section>

          {/* Reports & Export */}
          <section className="dashboard-card" style={{ marginBottom: '2em' }}>
            <div className="section-title">Reports & Data Export</div>

            {/* Filters + Export controls */}
            <div
              className="dashboard-controls"
              style={{ flexWrap: 'wrap', gap: '1.2em', marginBottom: '1em' }}
            >
              <div style={{ minWidth: 280 }}>
                <label htmlFor="user-role-filter">
                  <b>Filter Users by Role:</b>
                </label>
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

              {/* Users export (component) */}
              <ExportUsersControls users={filteredUsers} />

              {/* Companies export (component) */}
              <ExportCompaniesControls companies={companies} />
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.3em' }}>
              <label htmlFor="report-search" className="sr-only">
                Search users/companies
              </label>
              <input
                type="text"
                id="report-search"
                placeholder="Search users/companies..."
                style={{ padding: '6px 12px', width: 280 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Users table */}
            <div
              className="user-table-scroll"
              style={{ background: 'rgba(10,40,60,0.07)', borderRadius: 13 }}
            >
              {filteredUsers.length ? (
                <table
                  className="user-table"
                  style={{ width: '100%', minWidth: 700 }}
                >
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Company</th>
                      <th>Permit Expiry</th>
                      <th>Profile %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.email || i}>
                        <td>{u.name || '-'}</td>
                        <td>{u.email || '-'}</td>
                        <td>
                          <span className={`role-badge ${u.role || ''}`}>
                            {u.role || '-'}
                          </span>
                        </td>
                        <td>{u.assignedCompany || '-'}</td>
                        <td>{u.permitExpiry || '-'}</td>
                        <td>
                          {u.profileProgress != null
                            ? `${u.profileProgress}%`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{ padding: '2em', textAlign: 'center', color: '#789' }}
                >
                  No users found.
                </div>
              )}
            </div>

            <small
              style={{ color: '#77a', display: 'block', marginTop: '1em' }}
            >
              <b>Tips:</b> Exports are scoped to this school. Use filters and
              search to narrow results before exporting.
            </small>
          </section>

          {/* Mass Messaging */}
          <MassMessagingCard users={users} companies={companies} />
        </>
      )}
    </div>
  )
}

AdminReports.propTypes = {
  currentSchoolId: PropTypes.string,
  currentRole: PropTypes.string,
}

AdminReports.defaultProps = {
  currentSchoolId: '',
  currentRole: 'admin',
}

// Subcomponent: Mass Messaging (kept local, not exported)
function MassMessagingCard({ users, companies }) {
  const [bulkMsg, setBulkMsg] = useState('')
  const [bulkTarget, setBulkTarget] = useState('all')
  const [status, setStatus] = useState('')

  const totalUsers = users?.length || 0
  const totalCompanies = companies?.length || 0

  const sendBulkMessage = useCallback(() => {
    if (!bulkMsg.trim()) {
      setStatus('Please enter a message.')
      return
    }
    setStatus('Sending…')
    // TODO: Hook this to your backend (Cloud Function / email / Firestore)
    setTimeout(() => {
      setStatus('Announcement sent!')
      setBulkMsg('')
    }, 900)
  }, [bulkMsg])

  return (
    <section className="dashboard-card" style={{ marginBottom: '2em' }}>
      <div className="section-title">Mass Messaging & Announcements</div>

      <div style={{ marginBottom: '0.8em' }}>
        <label htmlFor="bulk-message-target">
          <b>Target:</b>
        </label>
        <select
          id="bulk-message-target"
          className="glass-select"
          style={{ marginLeft: 7 }}
          value={bulkTarget}
          onChange={e => setBulkTarget(e.target.value)}
        >
          <option value="all">All Users ({totalUsers})</option>
          <option value="student">All Students</option>
          <option value="instructor">All Instructors</option>
          <option value="admin">All Admins</option>
          <option value="company">All Companies ({totalCompanies})</option>
        </select>
      </div>

      <label htmlFor="bulk-message-body" className="sr-only">
        Announcement message
      </label>
      <textarea
        id="bulk-message-body"
        rows={4}
        style={{
          width: '99%',
          maxWidth: 640,
          padding: 12,
          borderRadius: 8,
          border: '1.3px solid #bbefff',
          background: 'rgba(245,255,255,0.9)',
          fontSize: '1em',
          marginBottom: '0.6em',
          resize: 'vertical',
        }}
        placeholder="Write your message or announcement…"
        value={bulkMsg}
        onChange={e => setBulkMsg(e.target.value)}
      />

      <div>
        <button
          className="btn"
          id="send-bulk-message-btn"
          onClick={sendBulkMessage}
        >
          Send Announcement
        </button>
        <small
          id="bulk-message-status"
          style={{
            marginLeft: '1em',
            color: status === 'Announcement sent!' ? '#28c47c' : '#76b4d6',
            fontWeight: 600,
          }}
          aria-live="polite"
        >
          {status}
        </small>
      </div>

      <div style={{ marginTop: '0.9em' }}>
        <small style={{ color: '#77a' }}>
          Use for school-wide announcements, reminders, or urgent alerts.
          <br />
          <b>Note:</b> Private one-to-one messaging is coming soon.
        </small>
      </div>
    </section>
  )
}

MassMessagingCard.propTypes = {
  users: PropTypes.array,
  companies: PropTypes.array,
}

MassMessagingCard.defaultProps = {
  users: [],
  companies: [],
}

export default AdminReports
