// admin/admin-dashboard.js

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast } from '../ui-helpers.js';
import { renderAdminProfile } from './admin-profile.js';
import { renderAppShell } from '../ui-shell.js';

// Lazy load jsPDF for PDF export
let jsPDF = null;
async function ensureJsPDF() {
  if (!jsPDF) {
    const mod = await import(
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    );
    jsPDF = mod.jspdf.jsPDF;
  }
}

export async function renderAdminDashboard() {
  // --- Get current user ---
  const currentUserEmail =
    window.currentUserEmail || localStorage.getItem('currentUserEmail') || null;
  if (!currentUserEmail) {
    showToast('No user found. Please log in again.');
    if (window.handleLogout) window.handleLogout();
    return;
  }

  // --- Get user and school info ---
  let userData = {};
  let userRole = localStorage.getItem('userRole') || 'admin';
  let schoolId = localStorage.getItem('schoolId');
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole;
      schoolId = userData.schoolId || schoolId;
      localStorage.setItem('userRole', userRole);
      if (schoolId) localStorage.setItem('schoolId', schoolId);
    }
  } catch (e) {
    userData = {};
  }
  if (userRole !== 'admin' || !schoolId) {
    showToast('Access denied: Admin role and school required.');
    if (window.handleLogout) window.handleLogout();
    return;
  }

  // --- Fetch users for this admin's school ---
  let allUsers = [];
  try {
    const usersSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('schoolId', '==', schoolId),
        where('role', 'in', ['student', 'instructor', 'admin'])
      )
    );
    usersSnap.forEach((doc) => {
      const d = doc.data();
      allUsers.push({
        name: d.name || 'User',
        email: d.email,
        phone: d.phone || '',
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
    console.error('Admin user fetch error', e);
  }

  // --- Metrics and Alerts ---
  const studentCount = allUsers.filter((u) => u.role === 'student').length;
  const instructorCount = allUsers.filter((u) => u.role === 'instructor').length;
  const adminCount = allUsers.filter((u) => u.role === 'admin').length;
  const permitSoon = allUsers.filter((u) => expirySoon(u.permitExpiry)).length;
  const medSoon = allUsers.filter((u) => expirySoon(u.medCardExpiry)).length;
  const incomplete = allUsers.filter((u) => u.profileProgress < 80).length;
  const instructorList = allUsers.filter((u) => u.role === 'instructor');
  const companyList = Array.from(
    new Set(allUsers.map((u) => u.assignedCompany).filter(Boolean))
  );

  // --- MAIN CONTENT HTML (only the inside for the shell) ---
  const mainContent = `
    <button class="btn" id="edit-admin-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div style="display:flex;gap:1.5em;flex-wrap:wrap;margin-bottom:2em;">
      <div class="dashboard-card" style="min-width:190px;"><b>👨‍🎓 Students:</b> <span>${studentCount}</span></div>
      <div class="dashboard-card" style="min-width:190px;"><b>👨‍🏫 Instructors:</b> <span>${instructorCount}</span></div>
      <div class="dashboard-card" style="min-width:190px;"><b>📝 Incomplete Profiles:</b> <span>${incomplete}</span></div>
      <div class="dashboard-card warn" style="min-width:190px;background:#fff5f5;"><b>🚨 Permit Expiring Soon:</b> <span>${permitSoon}</span></div>
      <div class="dashboard-card warn" style="min-width:190px;background:#fff5f5;"><b>🚨 Med Card Expiring Soon:</b> <span>${medSoon}</span></div>
    </div>
    <div class="dashboard-card">
      <h3>👥 Manage Users</h3>
      <div style="margin-bottom:1em;display:flex;gap:1em;">
        <label>Filter by Role:
          <select id="user-role-filter">
            <option value="">All</option>
            <option value="student">Students</option>
            <option value="instructor">Instructors</option>
            <option value="admin">Admins</option>
          </select>
        </label>
        <label>Company:
          <select id="user-company-filter">
            <option value="">All</option>
            ${companyList.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </label>
        <input type="text" id="user-search" placeholder="Search by name/email" style="flex:1;min-width:140px;padding:6px 11px;border-radius:7px;border:1px solid #ddd;">
        <button class="btn outline" id="export-csv-btn" type="button">Export CSV</button>
        <button class="btn outline" id="export-pdf-btn" type="button">Export PDF</button>
        <button class="btn outline" id="expiring-btn" type="button" style="color:#c80;">Export Expiring Permits</button>
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
                <tr data-user="${user.email}" class="${expirySoon(user.permitExpiry) ? 'row-warn' : ''}">
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
                          (inst) =>
                            `<option value="${inst.email}" ${user.assignedInstructor === inst.email ? 'selected' : ''}>${inst.name}</option>`
                        )
                        .join('')}
                    </select>
                  </td>
                  <td>${user.profileProgress || 0}%</td>
                  <td style="${expirySoon(user.permitExpiry) ? 'color:#b10;' : ''}">${user.permitExpiry || ''}</td>
                  <td style="${expirySoon(user.medCardExpiry) ? 'color:#b10;' : ''}">${user.medCardExpiry || ''}</td>
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
    <div class="dashboard-card">
      <h3>🏢 Manage Companies</h3>
      <p>Create, edit, and view all companies who send students to your school.</p>
      <button class="btn wide" data-nav="admin-companies" style="margin-top:10px;">Open Companies Page</button>
    </div>
    <div class="dashboard-card">
      <h3>📝 Reports & Batch Messaging</h3>
      <p>
        Download user data, filter for missing docs, and message all students or instructors with one click.<br>
        <em>(Coming soon: Download/export, batch reminders, activity logs...)</em>
      </p>
      <button class="btn wide" data-nav="admin-reports" style="margin-top:10px;">Open Reports Page</button>
    </div>
  `;

  // --- Render universal shell ---
  await renderAppShell({
    role: 'admin',
    user: { name: userData.name },
    mainContent,
    showFooter: true,
    notifications: [],
  });

  // --- Dashboard-specific event handlers (after shell render) ---

  // Profile
  document
    .getElementById('edit-admin-profile-btn')
    ?.addEventListener('click', () => renderAdminProfile());

  // Filtering
  const roleFilter = document.getElementById('user-role-filter');
  const companyFilter = document.getElementById('user-company-filter');
  const searchInput = document.getElementById('user-search');
  roleFilter?.addEventListener('change', filterUserTable);
  companyFilter?.addEventListener('change', filterUserTable);
  searchInput?.addEventListener('input', filterUserTable);

  function filterUserTable() {
    const roleVal = roleFilter.value;
    const companyVal = companyFilter.value;
    const searchVal = searchInput.value.trim().toLowerCase();
    const rows = document.querySelectorAll('#user-table-body tr');
    rows.forEach((row) => {
      const roleCell = row.querySelector('.role-select')?.value || '';
      const companyCell = row.querySelector('.company-input')?.value || '';
      const nameCell = row.cells[0]?.textContent?.toLowerCase() || '';
      const emailCell = row.cells[1]?.textContent?.toLowerCase() || '';
      let show = true;
      if (roleVal && roleCell !== roleVal) show = false;
      if (companyVal && companyCell !== companyVal) show = false;
      if (
        searchVal &&
        !nameCell.includes(searchVal) &&
        !emailCell.includes(searchVal)
      )
        show = false;
      row.style.display = show ? '' : 'none';
    });
  }

  // --- CSV Export ---
  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    exportUsersToCSV(filteredUserRows());
  });

  // --- PDF Export ---
  document.getElementById('export-pdf-btn')?.addEventListener('click', async () => {
    await exportUsersToPDF(filteredUserRows());
  });

  // --- Expiring Permits Export ---
  document.getElementById('expiring-btn')?.addEventListener('click', () => {
    const expiring = filteredUserRows().filter((u) =>
      expirySoon(u.permitExpiry)
    );
    exportUsersToCSV(expiring, 'permit-expiring');
  });

  // --- Role Change Handler ---
  document.querySelectorAll('.role-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const userEmail = select.getAttribute('data-user');
      const newRole = select.value;
      try {
        await setDoc(
          doc(db, 'users', userEmail),
          { role: newRole, schoolId },
          { merge: true }
        );
        await setDoc(
          doc(db, 'userRoles', userEmail),
          { role: newRole, schoolId },
          { merge: true }
        );
        showToast(`Role updated for ${userEmail}`);
        renderAdminDashboard();
      } catch (err) {
        showToast('Failed to update role.');
      }
    });
  });

  // --- Company Assignment Handler ---
  document.querySelectorAll('.company-input').forEach((input) => {
    input.addEventListener('blur', async () => {
      const userEmail = input.getAttribute('data-user');
      const newCompany = input.value.trim();
      try {
        await setDoc(
          doc(db, 'users', userEmail),
          { assignedCompany: newCompany, schoolId },
          { merge: true }
        );
        showToast(`Company assigned to ${userEmail}`);
      } catch (err) {
        showToast('Failed to assign company.');
      }
    });
  });

  // --- Instructor Assignment Handler ---
  document.querySelectorAll('.instructor-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const userEmail = select.getAttribute('data-user');
      const newInstructor = select.value;
      try {
        await setDoc(
          doc(db, 'users', userEmail),
          { assignedInstructor: newInstructor, schoolId },
          { merge: true }
        );
        showToast(`Instructor assigned to ${userEmail}`);
        renderAdminDashboard();
      } catch (err) {
        showToast('Failed to assign instructor.');
      }
    });
  });

  // --- Remove User Handler ---
  document.querySelectorAll('.btn-remove-user').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userEmail = btn.getAttribute('data-user');
      if (!confirm(`Remove user: ${userEmail}? This cannot be undone.`)) return;
      try {
        await deleteDoc(doc(db, 'users', userEmail));
        await deleteDoc(doc(db, 'userRoles', userEmail));
        showToast(`User ${userEmail} removed`);
        renderAdminDashboard();
      } catch (err) {
        showToast('Failed to remove user.');
      }
    });
  });

  // Helper: Check if expiry (YYYY-MM-DD or ISO) is within 30 days or past
  function expirySoon(expiryDate) {
    if (!expiryDate) return false;
    let date =
      typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    if (isNaN(date)) return false;
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(now.getDate() + 30);
    return date < soon;
  }

  // Helper: get only filtered user data from visible table rows
  function filteredUserRows() {
    const rows = document.querySelectorAll('#user-table-body tr');
    const data = [];
    rows.forEach((row) => {
      if (row.style.display === 'none') return;
      const cells = row.children;
      data.push({
        name: cells[0]?.textContent || '',
        email: cells[1]?.textContent || '',
        role: cells[2]?.querySelector('select')?.value || '',
        assignedCompany: cells[3]?.querySelector('input')?.value || '',
        assignedInstructor: cells[4]?.querySelector('select')?.value || '',
        profileProgress: cells[5]?.textContent || '',
        permitExpiry: cells[6]?.textContent || '',
        medCardExpiry: cells[7]?.textContent || '',
        paymentStatus: cells[8]?.textContent || '',
      });
    });
    return data;
  }

  // --- CSV Export utility ---
  function exportUsersToCSV(users, filename = 'users') {
    if (!users.length) return showToast('No users to export.');
    const headers = Object.keys(users[0]);
    const csv = [
      headers.join(','),
      ...users.map((u) =>
        headers
          .map((h) => `"${(u[h] ?? '').toString().replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- PDF Export utility ---
  async function exportUsersToPDF(users) {
    if (!users.length) return showToast('No users to export.');
    await ensureJsPDF();
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Users List', 10, 16);
    const headers = Object.keys(users[0]);
    let y = 25;
    doc.setFontSize(10);
    doc.text(headers.join(' | '), 10, y);
    y += 7;
    users.forEach((u) => {
      doc.text(headers.map((h) => u[h] ?? '').join(' | '), 10, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
    });
    doc.save(`users-export-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}