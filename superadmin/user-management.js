// superadmin/user-management.js

import { db, auth } from '../firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  showToast,
  setupNavigation,
  showModal,
  closeModal,
} from '../ui-helpers.js';
import { renderSuperadminDashboard } from './superadmin-dashboard.js';

// ==== Data Helpers ====

// Get all users in system
async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
// Get all schools in system
async function getAllSchools() {
  const snap = await getDocs(collection(db, 'schools'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
// Write user log (for audit)
async function logUserAction(userId, action, details = {}) {
  await setDoc(doc(collection(db, 'userLogs')), {
    userId,
    action,
    details,
    changedBy: localStorage.getItem('currentUserEmail') || 'superadmin',
    changedAt: serverTimestamp(),
  });
}

// ==== Main Renderer ====

export async function renderUserManagement(
  container = document.getElementById('app')
) {
  if (!container) return;
  setupNavigation();

  // Fetch users and schools in parallel
  let [users, schools] = await Promise.all([getAllUsers(), getAllSchools()]);
  let filter = { search: '', role: '', school: '', active: 'all' };

  // ====== Render Filter Bar ======
  function renderFilterBar() {
    return `
      <div class="user-filter-bar">
        <input type="text" id="user-search" placeholder="Search user..." value="${filter.search}" aria-label="Search users"/>
        <select id="user-role-filter" aria-label="Filter by role">
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <select id="user-school-filter" aria-label="Filter by school">
          <option value="">All schools</option>
          ${schools.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <select id="user-status-filter" aria-label="Filter by status">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="locked">Locked</option>
        </select>
        <button class="btn outline" id="create-user-btn">+ New User</button>
        <button class="btn outline" id="bulk-actions-btn">Bulk Actions</button>
        <button class="btn outline" id="export-users-btn">Export</button>
      </div>
    `;
  }

  // ====== Filter Users ======
  function filterUsers(users) {
    return users.filter(
      (u) =>
        (filter.search === '' ||
          (u.name && u.name.toLowerCase().includes(filter.search)) ||
          (u.email && u.email.toLowerCase().includes(filter.search))) &&
        (filter.role === '' || u.role === filter.role) &&
        (filter.school === '' ||
          (Array.isArray(u.schools)
            ? u.schools.includes(filter.school)
            : u.assignedSchool === filter.school)) &&
        (filter.active === 'all' ||
          (filter.active === 'locked'
            ? u.locked === true
            : !!u.active === (filter.active === 'active')))
    );
  }

  // ====== Render User Table ======
  function renderTable(users) {
    return `
      <div class="user-table-scroll">
        <table class="user-table" aria-label="User Management Table">
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
            ${users
              .map(
                (u) => `
              <tr>
                <td>${u.name || ''}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>
                  ${
                    Array.isArray(u.schools)
                      ? u.schools
                          .map(
                            (sid) =>
                              schools.find((s) => s.id === sid)?.name || ''
                          )
                          .join(', ')
                      : schools.find((s) => s.id === u.assignedSchool)?.name ||
                        '-'
                  }
                </td>
                <td>
                  ${u.locked ? "<span style='color:#e67c7c'>Locked</span>" : u.active !== false ? 'Active' : "<span style='color:#c44'>Inactive</span>"}
                </td>
                <td>
                  <button class="btn outline btn-sm" data-userid="${u.id}" data-action="view" aria-label="View details">View</button>
                  <button class="btn outline btn-sm" data-userid="${u.id}" data-action="edit" aria-label="Edit user">Edit</button>
                  <button class="btn outline btn-sm" data-userid="${u.id}" data-action="${u.active !== false ? 'deactivate' : 'activate'}">${u.active !== false ? 'Deactivate' : 'Reactivate'}</button>
                  <button class="btn outline btn-sm" data-userid="${u.id}" data-action="impersonate">Impersonate</button>
                  <button class="btn outline btn-sm" data-userid="${u.id}" data-action="lock">${u.locked ? 'Unlock' : 'Lock'}</button>
                  <button class="btn outline btn-sm btn-danger" data-userid="${u.id}" data-action="delete" aria-label="Delete user">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ====== Update Table Only (after filter/search) ======
  function updateUsersTable() {
    const tbodyWrap = container.querySelector('.user-table-scroll');
    if (tbodyWrap) {
      tbodyWrap.innerHTML = renderTable(filterUsers(users));
      // Reattach row action listeners:
      tbodyWrap.querySelectorAll('button[data-userid]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const userId = btn.dataset.userid;
          const action = btn.dataset.action;
          const user = users.find((u) => u.id === userId);
          if (!user) return;
          if (action === 'view' || action === 'edit')
            showUserModal(user, action === 'edit');
          else if (action === 'deactivate') updateUserStatus(user, false);
          else if (action === 'activate') updateUserStatus(user, true);
          else if (action === 'impersonate') impersonateUser(user);
          else if (action === 'lock') lockUser(user, !user.locked);
          else if (action === 'delete') deleteUser(user);
        });
      });
    }
  }

  // ====== Main Page Render ======
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:1100px;margin:0 auto;padding:16px;">
      <h2 class="dash-head">👥 Super Admin: User Management</h2>
      ${renderFilterBar()}
      ${renderTable(filterUsers(users))}
      <div style="margin-top:1.7em; font-size:1em; color:#999;">Total users: ${users.length}</div>
      <button class="btn outline" id="back-to-superadmin-dashboard-btn" style="margin-top:2.2rem;">⬅ Dashboard</button>
    </div>
  `;

  // Back to dashboard
  container
    .querySelector('#back-to-superadmin-dashboard-btn')
    ?.addEventListener('click', () => {
      renderSuperadminDashboard(container);
    });

  // ====== Filter/Sort/Event Handlers (update table only) ======
  container.querySelector('#user-search').addEventListener('input', (e) => {
    filter.search = e.target.value.toLowerCase();
    updateUsersTable();
  });
  container
    .querySelector('#user-role-filter')
    .addEventListener('change', (e) => {
      filter.role = e.target.value;
      updateUsersTable();
    });
  container
    .querySelector('#user-school-filter')
    .addEventListener('change', (e) => {
      filter.school = e.target.value;
      updateUsersTable();
    });
  container
    .querySelector('#user-status-filter')
    .addEventListener('change', (e) => {
      filter.active = e.target.value;
      updateUsersTable();
    });
  container
    .querySelector('#create-user-btn')
    .addEventListener('click', () => showUserModal());
  container
    .querySelector('#bulk-actions-btn')
    .addEventListener('click', showBulkModal);
  container
    .querySelector('#export-users-btn')
    .addEventListener('click', () => exportUsers(filterUsers(users)));

  // ====== Row Actions (first render) ======
  updateUsersTable();

  // ====== Modals ======
  function showUserModal(user = {}, editable = true) {
    showModal(`
      <div class="modal-card user-modal">
        <button class="modal-close" aria-label="Close" onclick="document.querySelector('.modal-overlay').remove()">&times;</button>
        <h2>${user.id ? (editable ? 'Edit' : 'User Details') : 'Create New User'}</h2>
        <form id="user-modal-form" style="display:flex;flex-direction:column;gap:1.1em;">
          <label>Name: <input name="name" type="text" value="${user.name || ''}" required ${!editable ? 'readonly' : ''}/></label>
          <label>Email: <input name="email" type="email" value="${user.email || ''}" required ${!editable ? 'readonly' : ''}/></label>
          <label>Role:
            <select name="role" ${!editable ? 'disabled' : ''}>
              <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
              <option value="instructor" ${user.role === 'instructor' ? 'selected' : ''}>Instructor</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
            </select>
          </label>
          <label>Assigned Schools:
            <select name="schools" multiple size="4" ${!editable ? 'disabled' : ''}>
              ${schools.map((s) => `<option value="${s.id}" ${(user.schools || [user.assignedSchool]).includes?.(s.id) ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
            <small>(Ctrl/Cmd+click for multi-select)</small>
          </label>
          <label>Status:
            <select name="active" ${!editable ? 'disabled' : ''}>
              <option value="true" ${user.active !== false ? 'selected' : ''}>Active</option>
              <option value="false" ${user.active === false ? 'selected' : ''}>Inactive</option>
            </select>
          </label>
          <label>
            <input type="checkbox" name="locked" ${user.locked ? 'checked' : ''} ${!editable ? 'disabled' : ''}/> Account Locked
          </label>
          ${user.apiKey ? `<div><strong>API Key:</strong> <code>${user.apiKey}</code></div>` : ''}
          ${
            user.id && editable
              ? `
            <button class="btn" id="reset-password-btn" type="button">Reset Password</button>
            <button class="btn outline" id="audit-log-btn" type="button">View Audit Log</button>
          `
              : ''
          }
          <button class="btn primary" type="submit">${user.id ? 'Save' : 'Create User'}</button>
        </form>
      </div>
    `);

    document.getElementById('user-modal-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const selectedSchools = [...e.target.schools.selectedOptions].map(
        (o) => o.value
      );
      const formUser = {
        name: fd.get('name').trim(),
        email: fd.get('email').toLowerCase(),
        role: fd.get('role'),
        schools: selectedSchools,
        active: fd.get('active') === 'true',
        locked: fd.get('locked') === 'on',
      };
      try {
        if (user.id) {
          await updateDoc(doc(db, 'users', user.id), formUser);
          logUserAction(user.id, 'update', formUser);
          showToast('User updated!');
        } else {
          await setDoc(doc(collection(db, 'users')), formUser);
          showToast('User created!');
        }
        closeModal();
        renderUserManagement(container); // Full reload after create/update
      } catch (err) {
        showToast('Failed to save user: ' + err.message);
      }
    };

    if (user.id && document.getElementById('reset-password-btn')) {
      document.getElementById('reset-password-btn').onclick = async () => {
        try {
          await auth.sendPasswordResetEmail(user.email);
          showToast('Password reset email sent!');
          logUserAction(user.id, 'reset_password');
        } catch (err) {
          showToast('Failed to send reset email: ' + err.message);
        }
      };
    }
    if (user.id && document.getElementById('audit-log-btn')) {
      document.getElementById('audit-log-btn').onclick = async () => {
        showUserAuditLog(user.id, user.email);
      };
    }
  }

  // ====== Bulk Actions Modal ======
  function showBulkModal() {
    showModal(`
      <div class="modal-card bulk-user-modal">
        <button class="modal-close" aria-label="Close" onclick="document.querySelector('.modal-overlay').remove()">&times;</button>
        <h2>Bulk User Actions (future)</h2>
        <p>Bulk import, multi-user status changes, and more coming soon!</p>
      </div>
    `);
  }

  // ====== Export ======
  function exportUsers(users) {
    const header = ['Name', 'Email', 'Role', 'Schools', 'Status'];
    const rows = users.map((u) => [
      `"${u.name || ''}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${(u.schools || [u.assignedSchool]).map((sid) => schools.find((s) => s.id === sid)?.name).join(';')}"`,
      `"${u.locked ? 'Locked' : u.active !== false ? 'Active' : 'Inactive'}"`,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cdl-users.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Users exported.');
  }

 // ====== Helpers ======
async function updateUserStatus(user, active) {
  try {
    await updateDoc(doc(db, 'users', user.id), { active });
    logUserAction(user.id, active ? 'activate' : 'deactivate');
    showToast(`User ${active ? 'activated' : 'deactivated'}.`);
    renderUserManagement(container);
  } catch (err) {
    showToast('Failed to update user status.');
  }
}

async function lockUser(user, locked) {
  try {
    await updateDoc(doc(db, 'users', user.id), { locked });
    logUserAction(user.id, locked ? 'lock' : 'unlock');
    showToast(`User ${locked ? 'locked' : 'unlocked'}.`);
    renderUserManagement(container);
  } catch (err) {
    showToast('Failed to update lock status.');
  }
}

async function deleteUser(user) {
  if (!confirm(`Delete user ${user.email}? This cannot be undone!`)) return;
  try {
    await deleteDoc(doc(db, 'users', user.id));
    logUserAction(user.id, 'delete');
    showToast('User deleted.');
    renderUserManagement(container);
  } catch (err) {
    showToast('Failed to delete user.');
  }
}

async function impersonateUser(user) {
  // This one is low risk, but you could wrap for consistency
  sessionStorage.setItem('impersonateUserId', user.id);
  showToast(`Now impersonating ${user.name || user.email} (dev mode).`);
  location.reload();
}

async function showUserAuditLog(userId, email) {
  try {
    const logSnap = await getDocs(
      query(collection(db, 'userLogs'), where('userId', '==', userId))
    );
    const logs = logSnap.docs.map((d) => d.data());
    showModal(`
      <div class="modal-card audit-log-modal">
        <button class="modal-close" aria-label="Close" onclick="document.querySelector('.modal-overlay').remove()">&times;</button>
        <h2>Audit Log for ${email}</h2>
        <div style="max-height:340px;overflow:auto;">
          ${
            logs.length
              ? logs
                  .map(
                    (l) => `
            <div>
              <strong>${l.action}</strong> -- ${l.changedAt?.toDate?.().toLocaleString() || ''}<br/>
              <span style="font-size:0.96em;color:#666">${JSON.stringify(l.details)}</span>
              <span style="font-size:0.92em;color:#aaa;float:right">${l.changedBy || ''}</span>
            </div>
            <hr>
          `
                  )
                  .join('')
              : '<div>No log entries for this user yet.</div>'
          }
        </div>
      </div>
    `);
  } catch (err) {
    showToast('Failed to load audit log.');
  }
}