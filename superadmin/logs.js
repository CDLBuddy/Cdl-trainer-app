// superadmin/logs.js

import { db } from '../firebase.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderSuperadminDashboard } from './superadmin-dashboard.js';

// -- Utility: fetch all logs with optional filters --
async function fetchLogs({ dateFrom, dateTo, user, role, action, school, keyword } = {}) {
  let ref = db.collection("systemLogs").orderBy("timestamp", "desc");
  // Add client-side filtering for now, backend if collection grows
  let snap = await ref.limit(400).get();
  let logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  if (dateFrom) logs = logs.filter(l => l.timestamp && l.timestamp >= dateFrom);
  if (dateTo) logs = logs.filter(l => l.timestamp && l.timestamp <= dateTo + "T23:59:59");
  if (user) logs = logs.filter(l => l.userEmail && l.userEmail.includes(user));
  if (role) logs = logs.filter(l => l.userRole === role);
  if (action) logs = logs.filter(l => l.action === action);
  if (school) logs = logs.filter(l => l.schoolId === school || l.schoolName === school);
  if (keyword) logs = logs.filter(l =>
    (l.details || "").toLowerCase().includes(keyword.toLowerCase()) ||
    (l.target || "").toLowerCase().includes(keyword.toLowerCase())
  );
  return logs;
}

// -- CSV Export utility --
function exportLogsToCSV(logs) {
  const csv = [
    "Time,User,Role,School,Action,Target,Details",
    ...logs.map(l =>
      `"${new Date(l.timestamp).toLocaleString()}","${l.userName || l.userEmail}","${l.userRole}","${l.schoolName || ""}","${l.action}","${l.target}","${(l.details || "").replace(/"/g, '""')}"`
    )
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `cdl-logs-${Date.now()}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
}

export async function renderLogs(container = document.getElementById("app")) {
  if (!container) return;
  setupNavigation();

  // --- Filters state ---
  let filters = {
    dateFrom: "",
    dateTo: "",
    user: "",
    role: "",
    action: "",
    school: "",
    keyword: ""
  };

  // Fetch logs initially
  let logs = await fetchLogs(filters);

  // -- Fetch all actions/roles/schools for filter dropdowns (stub for now) --
  const allActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();
  const allRoles = [...new Set(logs.map(l => l.userRole).filter(Boolean))].sort();
  const allSchools = [...new Set(logs.map(l => l.schoolName || l.schoolId).filter(Boolean))].sort();

  // --- Render toolbar and table ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:1200px;margin:0 auto;">
      <h2 class="dash-head">📜 System Logs <span class="role-badge superadmin">Super Admin</span></h2>
      <div class="dashboard-card">
        <h3>Recent Actions & Audit Trail</h3>
        <div class="logs-toolbar" style="margin-bottom:1.2em;display:flex;flex-wrap:wrap;gap:1.1em;align-items:center;">
          <label>Date From: <input type="date" id="log-date-from" /></label>
          <label>Date To: <input type="date" id="log-date-to" /></label>
          <input type="text" id="log-user-filter" placeholder="User email/name" style="width:135px;">
          <select id="log-role-filter"><option value="">All Roles</option>${allRoles.map(r => `<option value="${r}">${r}</option>`).join("")}</select>
          <select id="log-action-filter"><option value="">All Actions</option>${allActions.map(a => `<option value="${a}">${a}</option>`).join("")}</select>
          <select id="log-school-filter"><option value="">All Schools</option>${allSchools.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
          <input type="text" id="log-keyword-filter" placeholder="Search details..." style="width:145px;">
          <button class="btn outline" id="export-csv-btn">Export CSV</button>
        </div>
        <table class="logs-table" style="width:100%;">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Role</th>
              <th>School</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${
              logs.length === 0
                ? `<tr><td colspan="7" style="text-align:center;">No logs found.</td></tr>`
                : logs.slice(0, 100).map(log => `
                    <tr class="${/fail|error|denied|delete/i.test(log.action) ? "log-row-error" : ""}">
                      <td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td>
                      <td>${log.userName || log.userEmail || "-"}</td>
                      <td>${log.userRole || "-"}</td>
                      <td>${log.schoolName || log.schoolId || "-"}</td>
                      <td>${log.action || "-"}</td>
                      <td>${log.target || "-"}</td>
                      <td style="font-size:.97em;max-width:310px;word-break:break-word;">${log.details || ""}</td>
                    </tr>
                  `).join('')
            }
          </tbody>
        </table>
        <div style="font-size:.94em;color:#888;margin:1.2em 0 0.3em;">
          Showing most recent ${logs.length > 100 ? 100 : logs.length} of ${logs.length} logs. Export for full history.
        </div>
        <button class="btn outline" id="back-to-superadmin-dashboard-btn" style="margin-top:2rem;">⬅ Dashboard</button>
      </div>
    </div>
  `;

  // --- Filter handlers ---
  function updateFilters() {
    filters = {
      dateFrom: container.querySelector("#log-date-from").value,
      dateTo: container.querySelector("#log-date-to").value,
      user: container.querySelector("#log-user-filter").value.trim(),
      role: container.querySelector("#log-role-filter").value,
      action: container.querySelector("#log-action-filter").value,
      school: container.querySelector("#log-school-filter").value,
      keyword: container.querySelector("#log-keyword-filter").value.trim()
    };
  }
  container.querySelectorAll(".logs-toolbar input, .logs-toolbar select").forEach(el => {
    el.addEventListener("change", async () => {
      updateFilters();
      logs = await fetchLogs(filters);
      // re-render table body only
      const tbody = container.querySelector(".logs-table tbody");
      tbody.innerHTML = logs.length
        ? logs.slice(0, 100).map(log => `
            <tr class="${/fail|error|denied|delete/i.test(log.action) ? "log-row-error" : ""}">
              <td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td>
              <td>${log.userName || log.userEmail || "-"}</td>
              <td>${log.userRole || "-"}</td>
              <td>${log.schoolName || log.schoolId || "-"}</td>
              <td>${log.action || "-"}</td>
              <td>${log.target || "-"}</td>
              <td style="font-size:.97em;max-width:310px;word-break:break-word;">${log.details || ""}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="7" style="text-align:center;">No logs found for filter.</td></tr>`;
    });
  });

  // CSV export
  document.getElementById("export-csv-btn")?.addEventListener("click", () => {
    exportLogsToCSV(logs);
  });

  // Back to dashboard
  document.getElementById("back-to-superadmin-dashboard-btn")?.addEventListener("click", () => {
    renderSuperadminDashboard(container);
  });
}