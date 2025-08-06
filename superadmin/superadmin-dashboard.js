// superadmin/superadmin-dashboard.js

import { db } from '../firebase.js';
import {
  collection,
  getDocs,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast } from '../ui-helpers.js';
import { renderAppShell } from '../ui-shell.js';

// Helper: Fetch Superadmin Platform Stats
async function getSuperadminStats() {
  let schools = 0,
    users = 0,
    complianceAlerts = 0;
  try {
    const schoolsSnap = await getDocs(collection(db, 'schools'));
    schools = schoolsSnap.size;
    const usersSnap = await getDocs(collection(db, 'users'));
    users = usersSnap.size;
    const alertsQuery = query(
      collection(db, 'complianceAlerts'),
      where('resolved', '==', false)
    );
    const alertsSnap = await getDocs(alertsQuery);
    complianceAlerts = alertsSnap.size;
  } catch (e) {
    // Log error as needed
  }
  return { schools, users, complianceAlerts };
}

// === Main Superadmin Dashboard Renderer ===
export async function renderSuperadminDashboard() {
  // ---- Auth Check ----
  const currentUserRole =
    localStorage.getItem('userRole') || window.currentUserRole;
  if (currentUserRole !== 'superadmin') {
    showToast('Access denied: Super Admins only.');
    if (window.handleLogout) window.handleLogout();
    return;
  }

  // ---- Fetch Current Superadmin Info ----
  const currentUserEmail =
    localStorage.getItem('currentUserEmail') || window.currentUserEmail || null;
  let userData = {};
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', currentUserEmail)
    );
    const snap = await getDocs(usersQuery);
    if (!snap.empty) userData = snap.docs[0].data();
  } catch (e) {
    userData = {};
  }

  // ---- Fetch Dashboard Stats ----
  const { schools, users, complianceAlerts } = await getSuperadminStats();

  // ---- Main Content ----
  const mainContent = `
    <div class="superadmin-page" style="max-width:900px;margin:0 auto;">
      <h2 class="dash-head" style="margin-top:1.4em;">
        🏆 Super Admin Panel 
        <span class="role-badge superadmin">Super Admin</span>
      </h2>
      <div class="superadmin-stats-bar" style="display:flex;gap:2.4em;margin-bottom:1.1em;font-weight:600;">
        <span>🏫 Schools: <b>${schools}</b></span>
        <span>👤 Users: <b>${users}</b></span>
        <span style="color:#ff5e5e;">🛡️ Compliance Alerts: <b>${complianceAlerts}</b></span>
      </div>
      <div class="dashboard-card superadmin-profile" style="display:flex;align-items:center;gap:2.4em;">
        ${userData.profilePicUrl ? `<img src="${userData.profilePicUrl}" alt="Profile Photo" style="width:68px;height:68px;border-radius:50%;object-fit:cover;border:2.5px solid #b48aff;">` : ''}
        <div>
          <strong>Name:</strong> ${userData.name || 'Super Admin'}<br>
          <strong>Email:</strong> ${currentUserEmail || ''}
        </div>
      </div>
      <div class="dash-layout superadmin-grid">
        <div class="dashboard-card feature-card">
          <h3>🏫 School Management</h3>
          <p>Create, edit, view, or remove CDL training schools.<br>
          Manage TPR IDs, locations, and compliance status for each site.</p>
          <button class="btn wide" data-nav="superadmin-schools">Manage Schools</button>
        </div>
        <div class="dashboard-card feature-card">
          <h3>👤 User Management</h3>
          <p>Add, remove, or modify instructor, admin, and student accounts.<br>
          Set roles, reset passwords, or assign users to schools.</p>
          <button class="btn wide" data-nav="superadmin-users">Manage Users</button>
        </div>
        <div class="dashboard-card feature-card">
          <h3>🛡️ Compliance Center</h3>
          <p>Audit schools and users for ELDT and FMCSA/State compliance.<br>
          Generate compliance reports or upload supporting documentation.</p>
          <button class="btn wide" data-nav="superadmin-compliance">Compliance Center</button>
        </div>
        <div class="dashboard-card feature-card">
          <h3>💳 Billing & Licensing</h3>
          <p>View or manage school billing info, subscriptions, and license renewals.</p>
          <button class="btn wide" data-nav="superadmin-billing">Billing & Licensing</button>
        </div>
        <div class="dashboard-card feature-card">
          <h3>⚙️ Platform Settings</h3>
          <p>Configure system-wide settings, defaults, and advanced options.</p>
          <button class="btn wide" data-nav="superadmin-settings">Platform Settings</button>
        </div>
        <div class="dashboard-card feature-card">
          <h3>🪵 Audit Logs</h3>
          <p>View platform activity logs, user actions, and system events for security or troubleshooting.</p>
          <button class="btn wide" data-nav="superadmin-logs">View Logs</button>
        </div>
      </div>
    </div>
  `;

  // ---- Render via Universal Shell ----
  await renderAppShell({
    role: 'superadmin',
    user: { name: userData.name, avatarUrl: userData.profilePicUrl },
    mainContent,
    showFooter: true,
    notifications: [],
  });

  // --- Dashboard-specific wiring if needed (none here, all SPA nav)
  // All nav handled via data-nav in shell. If you want custom actions:
  // document.querySelector('[data-nav="superadmin-schools"]')?.addEventListener('click', ...)
}
