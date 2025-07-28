// superadmin/permissions.js

import { db } from '../firebase.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderSuperadminDashboard } from './superadmin-dashboard.js';

// --- System-wide permissions (expand as needed) ---
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
];

// --- Fetch all schools for assignment ---
async function fetchSchools() {
  try {
    const snap = await db.collection('schools').orderBy('name').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
}

// --- Fetch all users (with search/filter support) ---
async function fetchUsers(search = '') {
  let query = db.collection('users');
  if (search)
    query = query.where('keywords', 'array-contains', search.toLowerCase());
  const snap = await query.orderBy('name').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// --- Fetch permissions audit log (by user) ---
async function fetchAuditLog(userId) {
  try {
    const snap = await db
      .collection('users')
      .doc(userId)
      .collection('permissionsLog')
      .orderBy('timestamp', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  } catch (e) {
    return [];
  }
}

// --- Invite New User Modal ---
function showInviteUserModal(container, schools) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay fade-in';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:430px;">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h3>Invite New User</h3>
      <form id="invite-user-form" style="display:flex;flex-direction:column;gap:1.1em;">
        <input name="name" type="text" placeholder="Full Name" required>
        <input name="email" type="email" placeholder="Email Address" required>
        <select name="role" required>
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="instructor">Instructor</option>
          <option value="student">Student</option>
        </select>
        <label>Assign to School(s):
          <select name="assignedSchools" multiple style="min-height:70px;">
            ${schools.map((s) => `<option value="${s.id}">${s.name} (${s.location || ''})</option>`).join('')}
          </select>
        </label>
        <button class="btn primary" type="submit">Send Invite</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();

  modal.querySelector('#invite-user-form').onsubmit = async (e) => {
    e.preventDefault();
    // Your backend invite logic here!
    showToast('Invite sent (stub only)!');
    modal.remove();
  };
}

// --- Show Audit Log Modal ---
async function showAuditLogModal(userId) {
  const log = await fetchAuditLog(userId);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay fade-in';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:530px;">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h3>Audit Log: Permission Changes</h3>
      <div style="max-height:320px;overflow-y:auto;">
        ${
          log.length === 0
            ? '<div>No changes found.</div>'
            : log
                .map(
                  (entry) => `
          <div class="audit-row">
            <strong>${entry.actorName || '?'}</strong>
            (${entry.actorEmail || '?'}) changed permissions:
            <br>
            <em>${entry.details}</em>
            <br>
            <span style="font-size:0.93em;color:#aaa;">${new Date(entry.timestamp).toLocaleString()}</span>
          </div>
        `
                )
                .join('<hr>')
        }
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();
}

// --- Main UI for managing user permissions ---
export async function renderPermissions(
  container = document.getElementById('app')
) {
  if (!container) return;

  setupNavigation();

  // Fetch schools and users for multi-school assignment
  const [schools, users] = await Promise.all([fetchSchools(), fetchUsers()]);

  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:1080px;margin:0 auto;">
      <h2 class="dash-head">🔑 Permissions & Roles <span class="role-badge superadmin">Super Admin</span></h2>
      <div class="dashboard-card" style="margin-bottom:1.6em;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:1.4em;">
          <button class="btn outline" id="invite-user-btn">+ Invite User</button>
          <input type="search" id="user-search" placeholder="Search users..." style="flex:1 1 250px;min-width:180px;">
        </div>
      </div>
      <div class="dashboard-card" style="overflow-x:auto;">
        <h3>User Roles & Permissions</h3>
        <table class="user-table" style="min-width:990px;">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Current Role</th>
              <th>Change Role</th>
              <th>Schools</th>
              <th>Permissions</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              users.length === 0
                ? `<tr><td colspan="9" style="text-align:center;">No users found.</td></tr>`
                : users
                    .map(
                      (user) => `
                    <tr data-user-id="${user.id}">
                      <td>${user.name || '-'}</td>
                      <td>${user.email || '-'}</td>
                      <td><span class="role-badge ${user.role || 'student'}">${user.role || 'student'}</span></td>
                      <td>
                        <select class="role-select" data-user-id="${user.id}">
                          ${['superadmin','admin','instructor','student','custom']
                            .map(
                              (role) =>
                                `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
                            )
                            .join('')}
                        </select>
                      </td>
                      <td>
                        <select class="school-multi-select" data-user-id="${user.id}" multiple style="min-width:90px;min-height:55px;">
                          ${schools
                            .map(
                              (s) =>
                                `<option value="${s.id}" ${Array.isArray(user.assignedSchools) && user.assignedSchools.includes(s.id) ? 'selected' : ''}>${s.name}</option>`
                            )
                            .join('')}
                        </select>
                      </td>
                      <td>
                        <div class="perm-checkboxes" style="display:flex;flex-wrap:wrap;gap:0.55em;">
                          ${PERMISSIONS_LIST.map(
                            (perm) =>
                              `<label style="font-weight:400;"><input type="checkbox" data-user-id="${user.id}" data-perm="${perm}" ${Array.isArray(user.permissions) && user.permissions.includes(perm) ? 'checked' : ''}>${perm.replace(/_/g, ' ')}</label>`
                          ).join('')}
                        </div>
                      </td>
                      <td>
                        <select class="status-select" data-user-id="${user.id}">
                          <option value="active" ${user.status !== 'disabled' ? 'selected' : ''}>Active</option>
                          <option value="disabled" ${user.status === 'disabled' ? 'selected' : ''}>Disabled</option>
                        </select>
                      </td>
                      <td>
                        <input type="date" class="expiry-input" data-user-id="${user.id}" value="${user.expiryDate || ''}" style="width:124px;">
                      </td>
                      <td>
                        <button class="btn outline save-role-btn" data-user-id="${user.id}">Save</button>
                        <button class="btn" data-user-id="${user.id}" data-action="view-log" title="View Audit Log">Log</button>
                      </td>
                    </tr>
                  `
                    )
                    .join('')
            }
          </tbody>
        </table>
        <button class="btn outline" id="back-to-superadmin-dashboard-btn" style="margin-top:2rem;">⬅ Dashboard</button>
      </div>
    </div>
  `;

  // Invite user modal
  document.getElementById('invite-user-btn')?.addEventListener('click', () => {
    showInviteUserModal(container, schools);
  });

  // Save Role/Permissions handler (per user)
  container.querySelectorAll('.save-role-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const row = container.querySelector(`tr[data-user-id="${userId}"]`);
      const roleSelect = row.querySelector('.role-select');
      const newRole = roleSelect.value;

      // School assignment (multi-select)
      const schoolSelect = row.querySelector('.school-multi-select');
      const assignedSchools = Array.from(schoolSelect.selectedOptions).map(
        (o) => o.value
      );

      // Permissions (checkboxes)
      const permChecks = row.querySelectorAll(
        'input[type="checkbox"][data-perm]'
      );
      const permissions = Array.from(permChecks)
        .filter((c) => c.checked)
        .map((c) => c.dataset.perm);

      // Status/expiry
      const statusSelect = row.querySelector('.status-select');
      const status = statusSelect.value;
      const expiryInput = row.querySelector('.expiry-input');
      const expiryDate = expiryInput.value || null;

      // Update user doc
      try {
        await db.collection('users').doc(userId).update({
          role: newRole,
          assignedSchools,
          permissions,
          status,
          expiryDate,
        });

        // Log change to audit trail
        await db
          .collection('users')
          .doc(userId)
          .collection('permissionsLog')
          .add({
            timestamp: new Date().toISOString(),
            actorEmail: localStorage.getItem('currentUserEmail'),
            actorName: localStorage.getItem('fullName'),
            details: `Role: ${newRole}, Schools: [${assignedSchools.join(', ')}], Perms: [${permissions.join(', ')}], Status: ${status}, Expiry: ${expiryDate}`,
          });

        showToast(`User permissions updated.`);
        btn.disabled = true;
        setTimeout(() => (btn.disabled = false), 1300);
        row.querySelector('td:nth-child(3) .role-badge').textContent = newRole;
        row.querySelector('td:nth-child(3) .role-badge').className =
          `role-badge ${newRole}`;
      } catch (e) {
        showToast('Failed to update role/permissions.');
      }
    });
  });

  // View Audit Log handler
  container
    .querySelectorAll('button[data-action="view-log"]')
    .forEach((btn) => {
      btn.addEventListener('click', async () => {
        await showAuditLogModal(btn.dataset.userId);
      });
    });

  // Change status/role instantly in UI if needed
  container.querySelectorAll('.status-select, .role-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      sel.closest('tr').style.background = '#f0f6ff';
    });
  });

  // Back to dashboard
  document
    .getElementById('back-to-superadmin-dashboard-btn')
    ?.addEventListener('click', () => {
      renderSuperadminDashboard(container);
    });

  // (Future) Search/filter logic
  document
    .getElementById('user-search')
    ?.addEventListener('input', async (e) => {
      showToast('Search/filter coming soon!');
    });
}