// admin/admin-users.js

import { db } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import {
  exportUsersToCSV,
  exportUsersToPDF,
  exportUsersExpiringToCSV,
} from './admin-reports.js';

const adminRole = window.userRole || localStorage.getItem('userRole') || '';

export async function renderAdminUsers(
  container = document.getElementById('app')
) {
  container = container || document.getElementById('app');

  // --- Permission check ---
  if (adminRole !== 'admin') {
    container.innerHTML = `<div class="dashboard-card" style="margin:2em auto;max-width:440px;">
      <h3>Access Denied</h3>
      <p>This page is for admins only.</p>
    </div>`;
    return;
  }

  let adminSchoolId =
    localStorage.getItem('schoolId') ||
    (window.schoolId ? window.schoolId : null);

  if (!adminSchoolId) {
    showToast('No schoolId found for current admin.', 4000, 'error');
    container.innerHTML =
      '<div class="screen-wrapper"><h2>Error: No school assigned to this admin account.</h2></div>';
    return;
  }

  // --- Fetch ONLY users from this school ---
  let schoolUsers = [];
  try {
    let usersSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('role', 'in', ['student', 'instructor', 'admin']),
        where('assignedSchools', 'array-contains', adminSchoolId)
      )
    );
    schoolUsers = usersSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

    if (schoolUsers.length === 0) {
      usersSnap = await getDocs(
        query(
          collection(db, 'users'),
          where('role', 'in', ['student', 'instructor', 'admin']),
          where('schoolId', '==', adminSchoolId)
        )
      );
      schoolUsers = usersSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
    }
  } catch (e) {
    schoolUsers = [];
    showToast('Failed to load users.', 4200);
    console.error('Admin user fetch error', e);
  }

  // --- Instructors & Companies (for dropdowns) ---
  const instructorList = schoolUsers.filter((u) => u.role === 'instructor');
  const companyList = Array.from(
    new Set(schoolUsers.map((u) => u.assignedCompany).filter(Boolean))
  );

  // --- Render UI ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in admin-users-page" style="padding: 24px; max-width: 1160px; margin: 0 auto;">
      <h2>👥 Manage Users</h2>
      <div style="margin-bottom:1em;">
        <input type="text" id="user-search" placeholder="🔍 Search users..." style="padding:6px 14px;width:220px;">
        <button class="btn outline small" id="export-csv-btn" title="Export visible users as CSV">Export CSV</button>
        <button class="btn outline small" id="export-pdf-btn" title="Export visible users as PDF">Export PDF</button>
        <button class="btn outline small" id="export-expiring-btn" title="Export users with expiring permits">Permits Expiring (CSV)</button>
      </div>
      <div class="dashboard-card" style="margin-bottom:1.3rem;">
        <div style="margin-bottom:1em;">
          <label>Filter by Role:
            <select id="user-role-filter">
              <option value="">All</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
          </label>
          <label style="margin-left:1em;">Company:
            <select id="user-company-filter">
              <option value="">All</option>
              ${companyList.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="user-table-scroll">
          <table class="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
                <th>Assigned Instructor</th>
                <th>Profile %</th>
                <th>Permit Exp.</th>
                <th>MedCard Exp.</th>
                <th>Phone</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="user-table-body">
              ${schoolUsers
                .map((user) => {
                  // Highlight permits expiring within 30 days
                  let expiring = '';
                  if (user.permitExpiry) {
                    const now = new Date();
                    const exp = new Date(user.permitExpiry);
                    const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                    if (days >= 0 && days <= 30)
                      expiring = ' style="color:#e02;font-weight:bold;"';
                  }
                  return `
                <tr data-user="${user.email}">
                  <td>${user.name || 'User'}</td>
                  <td>${user.email}</td>
                  <td>
                    <select class="role-select" data-user="${user.email}">
                      <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                      <option value="instructor" ${user.role === 'instructor' ? 'selected' : ''}>Instructor</option>
                      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" class="company-input" data-user="${user.email}" value="${user.assignedCompany || ''}" placeholder="(Company)" style="width:100px;"/>
                  </td>
                  <td>
                    <select class="instructor-select" data-user="${user.email}">
                      <option value="">(None)</option>
                      ${instructorList
                        .map(
                          (inst) => `
                        <option value="${inst.email}" ${user.assignedInstructor === inst.email ? 'selected' : ''}>${inst.name}</option>
                      `
                        )
                        .join('')}
                    </select>
                  </td>
                  <td>${user.profileProgress || 0}%</td>
                  <td${expiring}>${user.permitExpiry || ''}</td>
                  <td>${user.medCardExpiry || ''}</td>
                  <td>${user.phone || ''}</td>
                  <td>${user.paymentStatus || ''}</td>
                  <td>
                    <button class="btn outline btn-remove-user" data-user="${user.email}">Remove</button>
                  </td>
                </tr>
              `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
      <button class="btn outline wide" id="back-to-admin-dashboard-btn" style="margin-top:1.3rem;">⬅ Back to Dashboard</button>
    </div>
  `;

  setupNavigation();

  // --- UI Filtering ---
  const roleFilter = container.querySelector('#user-role-filter');
  const companyFilter = container.querySelector('#user-company-filter');
  const searchInput = container.querySelector('#user-search');
  roleFilter?.addEventListener('change', filterUserTable);
  companyFilter?.addEventListener('change', filterUserTable);
  searchInput?.addEventListener('input', filterUserTable);

  function filterUserTable() {
    const roleVal = roleFilter.value;
    const companyVal = companyFilter.value;
    const searchVal = searchInput.value.trim().toLowerCase();
    const rows = container.querySelectorAll('#user-table-body tr');
    rows.forEach((row) => {
      const roleCell = row.querySelector('.role-select')?.value || '';
      const companyCell = row.querySelector('.company-input')?.value || '';
      const nameCell = row.children[0].textContent.toLowerCase();
      const emailCell = row.children[1].textContent.toLowerCase();
      let show = true;
      if (roleVal && roleCell !== roleVal) show = false;
      if (companyVal && companyCell !== companyVal) show = false;
      if (
        searchVal &&
        !(
          nameCell.includes(searchVal) ||
          emailCell.includes(searchVal) ||
          companyCell.toLowerCase().includes(searchVal)
        )
      )
        show = false;
      row.style.display = show ? '' : 'none';
    });
  }

  // --- EXPORT: Get visible users in table (filtered) ---
  function getVisibleUsers() {
    const rows = container.querySelectorAll('#user-table-body tr');
    const visible = [];
    rows.forEach((row, idx) => {
      if (row.style.display !== 'none') visible.push(schoolUsers[idx]);
    });
    return visible;
  }

  container.querySelector('#export-csv-btn')?.addEventListener('click', () => {
    exportUsersToCSV(getVisibleUsers());
  });
  container.querySelector('#export-pdf-btn')?.addEventListener('click', () => {
    exportUsersToPDF(getVisibleUsers());
  });
  container
    .querySelector('#export-expiring-btn')
    ?.addEventListener('click', () => {
      exportUsersExpiringToCSV(getVisibleUsers(), 30);
    });

  // --- Role Change Handler ---
  container.querySelectorAll('.role-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const userEmail = select.getAttribute('data-user');
      const newRole = select.value;
      try {
        await setDoc(
          doc(db, 'users', userEmail),
          { role: newRole },
          { merge: true }
        );
        await setDoc(
          doc(db, 'userRoles', userEmail),
          { role: newRole },
          { merge: true }
        );
        showToast(`Role updated for ${userEmail}`);
        renderAdminUsers(container); // Refresh UI
      } catch (err) {
        showToast('Failed to update role.');
      }
    });
  });

  // --- Company Assignment Handler ---
  container.querySelectorAll('.company-input').forEach((input) => {
    input.addEventListener('blur', async () => {
      const userEmail = input.getAttribute('data-user');
      const newCompany = input.value.trim();
      try {
        await setDoc(
          doc(db, 'users', userEmail),
          { assignedCompany: newCompany },
          { merge: true }
        );
        showToast(`Company assigned to ${userEmail}`);
      } catch (err) {
        showToast('Failed to assign company.');
      }
    });
  });

  // --- Instructor Assignment Handler ---
  container.querySelectorAll('.instructor-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const userEmail = select.getAttribute('data-user');
      const newInstructor = select.value;
      try {
        await setDoc(
          doc(db, 'users', userEmail),
          { assignedInstructor: newInstructor },
          { merge: true }
        );
        showToast(`Instructor assigned to ${userEmail}`);
        renderAdminUsers(container); // Refresh UI
      } catch (err) {
        showToast('Failed to assign instructor.');
      }
    });
  });

  // --- Remove User Handler ---
  container.querySelectorAll('.btn-remove-user').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userEmail = btn.getAttribute('data-user');
      if (!confirm(`Remove user: ${userEmail}? This cannot be undone.`)) return;
      try {
        await deleteDoc(doc(db, 'users', userEmail));
        await deleteDoc(doc(db, 'userRoles', userEmail));
        showToast(`User ${userEmail} removed`);
        renderAdminUsers(container); // Refresh UI
      } catch (err) {
        showToast('Failed to remove user.');
      }
    });
  });

  // --- Back to Dashboard ---
  container
    .querySelector('#back-to-admin-dashboard-btn')
    ?.addEventListener('click', () => {
      import('./admin-dashboard.js').then((mod) => mod.renderAdminDashboard());
    });
}
