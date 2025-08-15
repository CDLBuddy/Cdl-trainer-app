// src/superadmin/UserManagement.jsx

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore'
import React, { useEffect, useState } from 'react'

import { db, auth } from '@utils/firebase.js' // Adjust path!

import { showToast } from '@/components/ToastContext.js' // Optional: swap for your toast solution

// --- Modal Component ---
function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="modal-overlay" tabIndex={-1} aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  )
}

export default function UserManagement() {
  // State
  const [users, setUsers] = useState([])
  const [schools, setSchools] = useState([])
  const [filter, setFilter] = useState({
    search: '',
    role: '',
    school: '',
    active: 'all',
  })
  const [modal, setModal] = useState({ open: false, type: '', user: null })
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch all users and schools on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [usersSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'schools')),
      ])
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setSchools(schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchData()
  }, [])

  // --- Filtering logic ---
  function filterUsers(users) {
    return users.filter(u => {
      const search =
        filter.search === '' ||
        (u.name && u.name.toLowerCase().includes(filter.search)) ||
        (u.email && u.email.toLowerCase().includes(filter.search))
      const role = filter.role === '' || u.role === filter.role
      const school =
        filter.school === '' ||
        (Array.isArray(u.schools)
          ? u.schools.includes(filter.school)
          : u.assignedSchool === filter.school)
      const status =
        filter.active === 'all'
          ? true
          : filter.active === 'locked'
            ? u.locked === true
            : !!u.active === (filter.active === 'active')
      return search && role && school && status
    })
  }

  // --- Actions ---
  async function updateUserStatus(user, active) {
    try {
      await updateDoc(doc(db, 'users', user.id), { active })
      await logUserAction(user.id, active ? 'activate' : 'deactivate')
      showToast(`User ${active ? 'activated' : 'deactivated'}.`)
      reloadUsers()
    } catch (_err) {
      showToast('Failed to update user status.')
    }
  }

  async function lockUser(user, locked) {
    try {
      await updateDoc(doc(db, 'users', user.id), { locked })
      await logUserAction(user.id, locked ? 'lock' : 'unlock')
      showToast(`User ${locked ? 'locked' : 'unlocked'}.`)
      reloadUsers()
    } catch {
      showToast('Failed to update lock status.')
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete user ${user.email}? This cannot be undone!`))
      return
    try {
      await deleteDoc(doc(db, 'users', user.id))
      await logUserAction(user.id, 'delete')
      showToast('User deleted.')
      reloadUsers()
    } catch {
      showToast('Failed to delete user.')
    }
  }

  async function impersonateUser(user) {
    sessionStorage.setItem('impersonateUserId', user.id)
    showToast(
      `Now impersonating ${user.name || user.email} (dev mode, reload page).`
    )
    window.location.reload()
  }

  async function reloadUsers() {
    const usersSnap = await getDocs(collection(db, 'users'))
    setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  async function logUserAction(userId, action, details = {}) {
    await setDoc(doc(collection(db, 'userLogs')), {
      userId,
      action,
      details,
      changedBy: localStorage.getItem('currentUserEmail') || 'superadmin',
      changedAt: serverTimestamp(),
    })
  }

  // --- Export users to CSV ---
  function exportUsers(usersToExport) {
    const header = ['Name', 'Email', 'Role', 'Schools', 'Status']
    const rows = usersToExport.map(u => [
      `"${u.name || ''}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${(u.schools || [u.assignedSchool])
        .map(sid => schools.find(s => s.id === sid)?.name)
        .join(';')}"`,
      `"${u.locked ? 'Locked' : u.active !== false ? 'Active' : 'Inactive'}"`,
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cdl-users.csv'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Users exported.')
  }

  // --- Audit Log Modal ---
  async function openAuditLogModal(user) {
    try {
      const logSnap = await getDocs(
        query(collection(db, 'userLogs'), where('userId', '==', user.id))
      )
      setAuditLogs(logSnap.docs.map(d => d.data()))
      setModal({ open: true, type: 'audit', user })
    } catch {
      showToast('Failed to load audit log.')
    }
  }

  // --- Password Reset ---
  async function resetPassword(user) {
    try {
      await auth.sendPasswordResetEmail(user.email)
      showToast('Password reset email sent!')
      await logUserAction(user.id, 'reset_password')
    } catch (err) {
      showToast('Failed to send reset email: ' + err.message)
    }
  }

  // --- User Create/Edit Modal (reuse for both) ---
  function openUserModal(user = {}, editable = true) {
    setModal({
      open: true,
      type: 'user',
      user,
      editable,
    })
  }

  function openBulkModal() {
    setModal({ open: true, type: 'bulk' })
  }

  // --- Handlers ---
  function handleInput(e) {
    setFilter(f => ({
      ...f,
      [e.target.name]: e.target.value,
    }))
  }

  // --- Render ---
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 60 }}>
        <div className="spinner" />
        <p>Loading users…</p>
      </div>
    )
  }

  const filteredUsers = filterUsers(users)

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}
    >
      <h2 className="dash-head">👥 Super Admin: User Management</h2>
      {/* --- Filter Bar --- */}
      <div
        className="user-filter-bar"
        style={{
          marginBottom: 18,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.7em',
        }}
      >
        <input
          type="text"
          name="search"
          id="user-search"
          placeholder="Search user…"
          aria-label="Search users"
          value={filter.search}
          onChange={handleInput}
        />
        <select
          name="role"
          id="user-role-filter"
          aria-label="Filter by role"
          value={filter.role}
          onChange={handleInput}
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <select
          name="school"
          id="user-school-filter"
          aria-label="Filter by school"
          value={filter.school}
          onChange={handleInput}
        >
          <option value="">All schools</option>
          {schools.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="active"
          id="user-status-filter"
          aria-label="Filter by status"
          value={filter.active}
          onChange={handleInput}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="locked">Locked</option>
        </select>
        <button className="btn outline" onClick={() => openUserModal()}>
          + New User
        </button>
        <button className="btn outline" onClick={openBulkModal}>
          Bulk Actions
        </button>
        <button
          className="btn outline"
          onClick={() => exportUsers(filteredUsers)}
        >
          Export
        </button>
      </div>
      {/* --- User Table --- */}
      <div className="user-table-scroll">
        <table className="user-table" aria-label="User Management Table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>School(s)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td>{u.name || ''}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {Array.isArray(u.schools)
                    ? u.schools
                        .map(sid => schools.find(s => s.id === sid)?.name || '')
                        .join(', ')
                    : schools.find(s => s.id === u.assignedSchool)?.name || '-'}
                </td>
                <td>
                  {u.locked ? (
                    <span style={{ color: '#e67c7c' }}>Locked</span>
                  ) : u.active !== false ? (
                    'Active'
                  ) : (
                    <span style={{ color: '#c44' }}>Inactive</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn outline btn-sm"
                    onClick={() => openUserModal(u, false)}
                  >
                    View
                  </button>
                  <button
                    className="btn outline btn-sm"
                    onClick={() => openUserModal(u, true)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn outline btn-sm"
                    onClick={() => updateUserStatus(u, u.active === false)}
                  >
                    {u.active !== false ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    className="btn outline btn-sm"
                    onClick={() => impersonateUser(u)}
                  >
                    Impersonate
                  </button>
                  <button
                    className="btn outline btn-sm"
                    onClick={() => lockUser(u, !u.locked)}
                  >
                    {u.locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    className="btn outline btn-sm btn-danger"
                    onClick={() => deleteUser(u)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn outline btn-sm"
                    onClick={() => openAuditLogModal(u)}
                  >
                    Audit Log
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '1.7em', fontSize: '1em', color: '#999' }}>
        Total users: {users.length}
      </div>
      {/* --- Modal Render --- */}
      <Modal
        open={modal.open && modal.type === 'user'}
        onClose={() => setModal({ open: false })}
      >
        <UserModal
          user={modal.user}
          schools={schools}
          editable={modal.editable}
          onClose={() => setModal({ open: false })}
          reloadUsers={reloadUsers}
          resetPassword={resetPassword}
          openAuditLogModal={openAuditLogModal}
        />
      </Modal>
      <Modal
        open={modal.open && modal.type === 'audit'}
        onClose={() => setModal({ open: false })}
      >
        <AuditLogModal logs={auditLogs} user={modal.user} />
      </Modal>
      <Modal
        open={modal.open && modal.type === 'bulk'}
        onClose={() => setModal({ open: false })}
      >
        <BulkUserModal />
      </Modal>
    </div>
  )
}

// --- User Create/Edit/View Modal ---
function UserModal({
  user = {},
  schools = [],
  editable = true,
  onClose,
  reloadUsers,
  resetPassword,
  openAuditLogModal,
}) {
  const [formUser, setFormUser] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'student',
    schools: user.schools || [],
    active: user.active !== false,
    locked: user.locked || false,
  })

  function handleChange(e) {
    const { name, value, type, checked, options } = e.target
    if (type === 'checkbox') {
      setFormUser(u => ({ ...u, [name]: checked }))
    } else if (type === 'select-multiple') {
      setFormUser(u => ({
        ...u,
        schools: [...options].filter(o => o.selected).map(o => o.value),
      }))
    } else {
      setFormUser(u => ({ ...u, [name]: value }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (user.id) {
        await updateDoc(doc(db, 'users', user.id), formUser)
        showToast('User updated!')
      } else {
        await setDoc(doc(collection(db, 'users')), formUser)
        showToast('User created!')
      }
      onClose()
      reloadUsers()
    } catch (err) {
      showToast('Failed to save user: ' + err.message)
    }
  }

  return (
    <>
      <h2>
        {user.id ? (editable ? 'Edit' : 'User Details') : 'Create New User'}
      </h2>
      <form
        id="user-modal-form"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.1em' }}
        onSubmit={handleSubmit}
      >
        <label>
          Name:
          <input
            name="name"
            type="text"
            value={formUser.name}
            required
            readOnly={!editable}
            onChange={handleChange}
          />
        </label>
        <label>
          Email:
          <input
            name="email"
            type="email"
            value={formUser.email}
            required
            readOnly={!editable}
            onChange={handleChange}
          />
        </label>
        <label>
          Role:
          <select
            name="role"
            value={formUser.role}
            onChange={handleChange}
            disabled={!editable}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </label>
        <label>
          Assigned Schools:
          <select
            name="schools"
            multiple
            size="4"
            value={formUser.schools}
            onChange={handleChange}
            disabled={!editable}
          >
            {schools.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <small>(Ctrl/Cmd+click for multi-select)</small>
        </label>
        <label>
          Status:
          <select
            name="active"
            value={formUser.active ? 'true' : 'false'}
            onChange={e =>
              setFormUser(u => ({
                ...u,
                active: e.target.value === 'true',
              }))
            }
            disabled={!editable}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            name="locked"
            checked={formUser.locked}
            disabled={!editable}
            onChange={handleChange}
          />{' '}
          Account Locked
        </label>
        {user.apiKey && (
          <div>
            <strong>API Key:</strong> <code>{user.apiKey}</code>
          </div>
        )}
        {user.id && editable && (
          <div style={{ display: 'flex', gap: '0.7em' }}>
            <button
              className="btn"
              type="button"
              onClick={() => resetPassword(user)}
            >
              Reset Password
            </button>
            <button
              className="btn outline"
              type="button"
              onClick={() => openAuditLogModal(user)}
            >
              View Audit Log
            </button>
          </div>
        )}
        <button className="btn primary" type="submit">
          {user.id ? 'Save' : 'Create User'}
        </button>
      </form>
    </>
  )
}

// --- Audit Log Modal ---
function AuditLogModal({ logs = [], user }) {
  return (
    <>
      <h2>
        Audit Log for <span style={{ color: '#1e88e5' }}>{user?.email}</span>
      </h2>
      <div style={{ maxHeight: 340, overflow: 'auto' }}>
        {logs.length ? (
          logs.map((l, i) => (
            <div key={i}>
              <strong>{l.action}</strong> --{' '}
              {l.changedAt?.toDate?.().toLocaleString?.() || l.changedAt || ''}
              <br />
              <span style={{ fontSize: '0.96em', color: '#666' }}>
                {JSON.stringify(l.details)}
              </span>
              <span
                style={{
                  fontSize: '0.92em',
                  color: '#aaa',
                  float: 'right',
                }}
              >
                {l.changedBy || ''}
              </span>
              <hr />
            </div>
          ))
        ) : (
          <div>No log entries for this user yet.</div>
        )}
      </div>
    </>
  )
}

// --- Bulk Actions Modal (stub for future) ---
function BulkUserModal() {
  return (
    <>
      <h2>Bulk User Actions (future)</h2>
      <p>Bulk import, multi-user status changes, and more coming soon!</p>
    </>
  )
}
