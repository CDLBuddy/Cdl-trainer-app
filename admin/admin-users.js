// admin/admin-users.js

import { db } from '../firebase.js';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, setupNavigation } from '../ui-helpers.js';

/**
 * Renders the main admin users management page.
 * @param {HTMLElement} container
 */
export async function renderAdminUsers(
  container = document.getElementById('app')
) {
  if (!container) return;

  // --- Fetch all users ---
  let allUsers = [];
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach((doc) => {
      const d = doc.data();
      allUsers.push({
        name: d.name || 'User',
        email: d.email,
        role: d.role || 'student',
        assignedInstructor: d.assignedInstructor || '',
        assignedCompany: d.assignedCompany || '',
        id: doc.id,
        profileProgress: d.profileProgress || 0,
        permitExpiry: d.permitExpiry || '',
        medCardExpiry: d.medCardExpiry || '',
        paymentStatus: d.paymentStatus || '',
        compliance: d.compliance || '',
      });
    });
  } catch (e) {
    allUsers = [];
    showToast('Failed to load users.', 4200);
    console.error('Admin user fetch error', e);
  }

  // --- Instructor & Company lists ---
  const instructorList = allUsers.filter((u) => u.role === 'instructor');
  const companyList = Array.from(
    new Set(allUsers.map((u) => u.assignedCompany).filter(Boolean))
  );

  // --- Render UI ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in admin-users-page" style="padding: 24px; max-width: 1160px; margin: 0 auto;">
      <h2>👥 Manage Users</h2>
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
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="user-table-body">
              ${allUsers
                .map(
                  (user) => `
                <tr data-user="${user.email}">
                  <td>${user.name}</td>
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
                  <td>${user.permitExpiry || ''}</td>
                  <td>${user.medCardExpiry || ''}</td>
                  <td>${user.paymentStatus || ''}</td>
                  <td>
                    <button class="btn outline btn-remove-user" data-user="${user.email}">Remove</button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
      <button class="btn outline wide" id="back-to-admin-dashboard-btn" style="margin-top:1.3rem;">⬅ Back to Dashboard</button>
    </div>
  `;

  setupNavigation();

  // --- Filtering ---
  const roleFilter = container.querySelector('#user-role-filter');
  const companyFilter = container.querySelector('#user-company-filter');
  roleFilter?.addEventListener('change', filterUserTable);
  companyFilter?.addEventListener('change', filterUserTable);

  function filterUserTable() {
    const roleVal = roleFilter.value;
    const companyVal = companyFilter.value;
    const rows = container.querySelectorAll('#user-table-body tr');
    rows.forEach((row) => {
      const roleCell = row.querySelector('.role-select')?.value || '';
      const companyCell = row.querySelector('.company-input')?.value || '';
      let show = true;
      if (roleVal && roleCell !== roleVal) show = false;
      if (companyVal && companyCell !== companyVal) show = false;
      row.style.display = show ? '' : 'none';
    });
  }

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
