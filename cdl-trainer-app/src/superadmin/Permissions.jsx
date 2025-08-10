// src/superadmin/Permissions.jsx
import {
  collection,
  query as fsQuery,
  orderBy,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getUserRole } from '@utils/auth.js'
import { db } from '@utils/firebase.js' // adjust if needed
import { showToast } from '@utils/ui-helpers.js'

/* =========================
   Constants / Helpers
========================= */
const PERMISSIONS_LIST = [
  'manage_users',
  'manage_schools',
  'edit_compliance',
  'view_billing',
  'manage_settings',
  'view_reports',
  'assign_roles',
  'edit_students',
  'read_only',
]

function debounce(fn, wait = 300) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

/* =========================
   Invite User Modal (stub)
========================= */
function InviteUserModal({ schools, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [assigned, setAssigned] = useState([])

  function toggleAssigned(id) {
    setAssigned(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id)
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    // TODO: Hook up your real invite flow
    showToast('Invite sent (stub).')
    onClose?.()
  }

  return (
    <div className="modal-overlay fade-in" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <h3>Invite New User</h3>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <select
            name="role"
            required
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="">Select Role</option>
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
          </select>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>
              Assign to School(s)
            </label>
            <div
              className="glass-card"
              style={{
                padding: 8,
                maxHeight: 160,
                overflow: 'auto',
                borderRadius: 10,
              }}
            >
              {schools.map(s => (
                <label
                  key={s.id}
                  style={{ display: 'flex', gap: 8, marginBottom: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={assigned.includes(s.id)}
                    onChange={() => toggleAssigned(s.id)}
                  />
                  <span>
                    {s.name}
                    {s.location ? ` (${s.location})` : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button className="btn primary" type="submit">
            Send Invite
          </button>
        </form>
      </div>
    </div>
  )
}

/* =========================
   Audit Log Modal
========================= */
function AuditLogModal({ userId, email, onClose, logs }) {
  return (
    <div className="modal-overlay fade-in" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 560 }}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <h3>Audit Log: Permission Changes</h3>
        <div style={{ fontSize: '.95em', color: '#8fb', marginBottom: 8 }}>
          {email}
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {logs.length ? (
            logs.map((l, idx) => (
              <div key={idx} style={{ padding: '8px 0' }}>
                <strong>{l.actorName || '?'}</strong> ({l.actorEmail || '?'})
                <br />
                <em style={{ color: '#cfe' }}>{l.details}</em>
                <div style={{ fontSize: '.92em', color: '#9ab' }}>
                  {l.timestamp ? new Date(l.timestamp).toLocaleString() : '--'}
                </div>
                <hr style={{ opacity: 0.2 }} />
              </div>
            ))
          ) : (
            <div>No changes found.</div>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================
   Page Component
========================= */
export default function Permissions() {
  const navigate = useNavigate()

  // Guard
  useEffect(() => {
    const role = getUserRole?.() || localStorage.getItem('userRole')
    if (role !== 'superadmin') {
      showToast('Access denied: Super Admins only.')
      navigate('/login', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [schools, setSchools] = useState([])
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [auditOpenFor, setAuditOpenFor] = useState(null) // { userId, email, logs }

  const [loading, setLoading] = useState(true)

  // Fetch schools & users
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        // Schools
        const sSnap = await getDocs(
          fsQuery(collection(db, 'schools'), orderBy('name'))
        )
        const s = sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        if (!cancelled) setSchools(s)

        // Users (basic; client-side search below)
        const uSnap = await getDocs(
          fsQuery(collection(db, 'users'), orderBy('name'))
        )
        const u = uSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          __dirty: false, // local flag to highlight unsaved edits
          __pending: false,
        }))
        if (!cancelled) setUsers(u)
      } catch (_e) {
        if (!cancelled) {
          showToast('Failed to load users or schools.')
          setUsers([])
          setSchools([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Derived filtered users (client-side search by name/email)
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    )
  }, [users, search])

  const onChangeSearch = useMemo(
    () =>
      debounce(val => {
        setSearch(val)
      }, 250),
    []
  )

  // Helpers to mutate local rows
  function markDirty(userId) {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, __dirty: true } : u))
    )
  }
  function setField(userId, field, value) {
    setUsers(prev =>
      prev.map(u =>
        u.id === userId ? { ...u, [field]: value, __dirty: true } : u
      )
    )
  }
  function togglePermission(userId, perm) {
    setUsers(prev =>
      prev.map(u => {
        if (u.id !== userId) return u
        const list = Array.isArray(u.permissions) ? u.permissions.slice() : []
        const idx = list.indexOf(perm)
        if (idx >= 0) list.splice(idx, 1)
        else list.push(perm)
        return { ...u, permissions: list, __dirty: true }
      })
    )
  }
  function toggleSchool(userId, schoolId) {
    setUsers(prev =>
      prev.map(u => {
        if (u.id !== userId) return u
        const list = Array.isArray(u.assignedSchools)
          ? u.assignedSchools.slice()
          : []
        const has = list.includes(schoolId)
        const next = has
          ? list.filter(x => x !== schoolId)
          : [...list, schoolId]
        return { ...u, assignedSchools: next, __dirty: true }
      })
    )
  }

  // Save row
  async function saveUser(user) {
    setUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, __pending: true } : u))
    )
    try {
      const payload = {
        role: user.role || 'student',
        assignedSchools: Array.isArray(user.assignedSchools)
          ? user.assignedSchools
          : [],
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        status: user.status || 'active',
        expiryDate: user.expiryDate || null,
      }
      await updateDoc(doc(db, 'users', user.id), payload)

      // Audit log
      await addDoc(collection(doc(db, 'users', user.id), 'permissionsLog'), {
        timestamp: new Date().toISOString(),
        actorEmail: localStorage.getItem('currentUserEmail') || '',
        actorName: localStorage.getItem('fullName') || '',
        details: `Role: ${payload.role}, Schools: [${payload.assignedSchools.join(
          ', '
        )}], Perms: [${payload.permissions.join(', ')}], Status: ${
          payload.status
        }, Expiry: ${payload.expiryDate || ''}`,
      })

      showToast('User permissions updated.')
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id ? { ...u, __dirty: false, __pending: false } : u
        )
      )
    } catch (_e) {
      showToast('Failed to update role/permissions.')
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, __pending: false } : u))
      )
    }
  }

  // Audit log modal open
  async function openAudit(user) {
    try {
      const snap = await getDocs(
        fsQuery(
          collection(doc(db, 'users', user.id), 'permissionsLog'),
          orderBy('timestamp', 'desc')
        )
      )
      const logs = snap.docs.map(d => d.data())
      setAuditOpenFor({ userId: user.id, email: user.email, logs })
    } catch {
      setAuditOpenFor({ userId: user.id, email: user.email, logs: [] })
    }
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Role', 'Schools', 'Permissions', 'Status', 'Expires'],
      ...filteredUsers.map(u => [
        u.name || '',
        u.email || '',
        u.role || '',
        (u.assignedSchools || []).join(';'),
        (u.permissions || []).join(';'),
        u.status || 'active',
        u.expiryDate || '',
      ]),
    ]
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cdl-permissions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    showToast('Permissions CSV exported.')
  }

  if (loading) {
    return (
      <div
        className="screen-wrapper"
        style={{ textAlign: 'center', padding: 40 }}
      >
        <div className="spinner" />
        <p>Loading permissions…</p>
      </div>
    )
  }

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ maxWidth: 1120, margin: '0 auto' }}
    >
      <h2 className="dash-head">
        🔑 Permissions & Roles{' '}
        <span className="role-badge superadmin">Super Admin</span>
      </h2>

      {/* Toolbar */}
      <div className="dashboard-card" style={{ marginBottom: '1.4em' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <button className="btn outline" onClick={() => setInviteOpen(true)}>
            + Invite User
          </button>
          <input
            type="search"
            placeholder="Search users…"
            onChange={e => onChangeSearch(e.target.value)}
            style={{ flex: '1 1 260px', minWidth: 180 }}
            aria-label="Search users"
          />
          <button className="btn outline" onClick={exportCSV}>
            Export CSV
          </button>
          <button
            className="btn"
            onClick={() => navigate('/superadmin-dashboard')}
          >
            ⬅ Dashboard
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card" style={{ overflowX: 'auto' }}>
        <h3>User Roles & Permissions</h3>
        <table className="user-table" style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Name</th>
              <th>Email</th>
              <th>Current Role</th>
              <th>Change Role</th>
              <th style={{ minWidth: 180 }}>Schools</th>
              <th>Permissions</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!filteredUsers.length ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: 'center',
                    padding: '1.2em',
                    color: '#789',
                  }}
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const roleBadgeClass = `role-badge ${u.role || 'student'}`
                return (
                  <tr
                    key={u.id}
                    style={{
                      background: u.__dirty
                        ? 'rgba(187, 239, 255, 0.08)'
                        : 'transparent',
                      transition: 'background .2s',
                    }}
                  >
                    <td>{u.name || '--'}</td>
                    <td>{u.email || '--'}</td>
                    <td>
                      <span className={roleBadgeClass}>
                        {u.role || 'student'}
                      </span>
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={u.role || 'student'}
                        onChange={e => setField(u.id, 'role', e.target.value)}
                      >
                        {[
                          'superadmin',
                          'admin',
                          'instructor',
                          'student',
                          'custom',
                        ].map(r => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div
                        className="glass-card"
                        style={{
                          padding: 8,
                          borderRadius: 10,
                          maxHeight: 120,
                          overflow: 'auto',
                        }}
                      >
                        {schools.map(s => (
                          <label
                            key={s.id}
                            style={{ display: 'flex', gap: 8, marginBottom: 6 }}
                          >
                            <input
                              type="checkbox"
                              checked={(u.assignedSchools || []).includes(s.id)}
                              onChange={() => toggleSchool(u.id, s.id)}
                            />
                            <span>{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '.5em',
                        }}
                      >
                        {PERMISSIONS_LIST.map(p => (
                          <label key={p} style={{ fontWeight: 400 }}>
                            <input
                              type="checkbox"
                              checked={(u.permissions || []).includes(p)}
                              onChange={() => togglePermission(u.id, p)}
                            />
                            <span style={{ marginLeft: 6 }}>
                              {p.replace(/_/g, ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={u.status || 'active'}
                        onChange={e => setField(u.id, 'status', e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        value={u.expiryDate || ''}
                        onChange={e =>
                          setField(u.id, 'expiryDate', e.target.value)
                        }
                        style={{ width: 140 }}
                      />
                    </td>
                    <td>
                      <div
                        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                      >
                        <button
                          className="btn outline"
                          disabled={!u.__dirty || u.__pending}
                          onClick={() => saveUser(u)}
                          title={
                            !u.__dirty ? 'No changes to save' : 'Save changes'
                          }
                        >
                          {u.__pending ? 'Saving…' : 'Save'}
                        </button>
                        <button className="btn" onClick={() => openAudit(u)}>
                          Log
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        <div style={{ marginTop: '1rem', fontSize: '.95em', color: '#8aa' }}>
          Showing {filteredUsers.length} users{search ? ' (filtered)' : ''}.
        </div>
      </div>

      {inviteOpen && (
        <InviteUserModal
          schools={schools}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {auditOpenFor && (
        <AuditLogModal
          userId={auditOpenFor.userId}
          email={auditOpenFor.email}
          logs={auditOpenFor.logs || []}
          onClose={() => setAuditOpenFor(null)}
        />
      )}
    </div>
  )
}

/* =========================
   Notes / TODOs:
   - If you want server-side search, add a 'keywords' array to user docs
     and use a Firestore 'array-contains' query for prefix tokens.
   - Consider pagination (Load More) if your users list grows large.
========================= */
