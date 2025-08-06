// admin/admin-reports.js

import { getCurrentSchoolBranding } from '../school-branding.js';

// Context: Always work in the current school
const currentSchoolId = window.schoolId || localStorage.getItem('schoolId');
const adminRole = window.userRole || localStorage.getItem('userRole') || '';

/** ========== PDF Export Utility ========== */
async function ensureJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
  return window.jspdf?.jsPDF || null;
}

/** ========== Main Renderer ========== */
export function renderAdminReports(container = document.getElementById('app')) {
  if (!container) return;

  // Role guard
  if (adminRole !== 'admin') {
    container.innerHTML = `
      <div class="dashboard-card" style="margin:2em auto;max-width:440px;">
        <h3>Access Denied</h3>
        <p>This page is for admins only.</p>
      </div>
    `;
    return;
  }

  // --- Core data ---
  const users = (window.adminUserList || []).filter(u => u.schoolId === currentSchoolId);
  const companies = (window.adminCompanyList || []).filter(c => c.schoolId === currentSchoolId);

  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:940px;margin:0 auto;">
      <h2 class="dash-head">📄 Admin Reports & Messaging</h2>

      <!-- Compliance Checklist -->
      <section class="dashboard-card compliance-checklist-card" style="margin-bottom: 1.5em;">
        <h3>📝 DOT/ELDT Compliance Checklist (Indiana)</h3>
        <ul style="margin-left:1em;">
          <li>☐ School/provider <b>registered in FMCSA TPR</b></li>
          <li>☐ <b>Instructor qualifications</b> (certificates, resumes) on file</li>
          <li>☐ <b>Student records:</b> progress, completion status, exam attempts</li>
          <li>☐ <b>Copy of CDL permit</b> & medical card for each student</li>
          <li>☐ <b>Training curriculum/lesson</b> records retained</li>
          <li>☐ <b>Range & behind-the-wheel</b> hours tracked for each student</li>
          <li>☐ <b>Assessment & skills test</b> records (including scores)</li>
          <li>☐ <b>Student completion</b> reported to TPR (export available)</li>
          <li>☐ <b>All records retained for at least 3 years</b> (per FMCSA & Indiana BMV)</li>
        </ul>
        <small style="color:#77a;display:block;margin-top:0.6em;">
          <b>Tip:</b> Use this checklist to ensure your school or provider is always DOT-compliant.
          Download or export critical records as needed for audits.
        </small>
        <button class="btn btn-outline" id="download-checklist-btn" style="margin-top:0.7em;">
          ⬇️ Download Checklist (PDF)
        </button>
      </section>

      <!-- Exports Card -->
      <section class="dashboard-card" style="margin-bottom:2em;">
        <div class="section-title">Reports & Data Export</div>
        <div class="dashboard-controls" style="flex-wrap:wrap;gap:1.2em;margin-bottom:1em;">
          <div style="min-width:280px;">
            <label for="user-role-filter"><b>Filter Users by Role:</b></label>
            <select id="user-role-filter" class="glass-select" style="margin-left:7px;">
              <option value="">All</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style="min-width:260px;">
            <label for="export-users-type"><b>Export Users:</b></label>
            <select id="export-users-type" class="glass-select" style="margin-left:7px;">
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="expiring">Expiring Permits (CSV)</option>
            </select>
            <button class="btn" id="export-users-btn" style="margin-left:7px;">Download</button>
          </div>
          <div style="min-width:260px;">
            <label for="export-companies-type"><b>Export Companies:</b></label>
            <select id="export-companies-type" class="glass-select" style="margin-left:7px;">
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
            <button class="btn" id="export-companies-btn" style="margin-left:7px;">Download</button>
          </div>
        </div>
        <div style="margin-bottom:1.3em;">
          <input type="text" id="report-search" placeholder="Search users/companies..." style="padding:6px 12px;width:260px;">
        </div>
        <div id="report-table" class="user-table-scroll" style="background:rgba(10,40,60,0.07);border-radius:13px;"></div>
        <small style="color:#77a;display:block;margin-top:1em;">
          <b>Tips:</b> All exports are scoped to this school only.
          Use filters and search before downloading.
        </small>
      </section>

      <!-- Bulk Messaging Card -->
      <section class="dashboard-card" style="margin-bottom:2em;">
        <div class="section-title">Mass Messaging & Announcements</div>
        <div style="margin-bottom:0.8em;">
          <label for="bulk-message-target"><b>Target:</b></label>
          <select id="bulk-message-target" class="glass-select" style="margin-left:7px;">
            <option value="all">All Users</option>
            <option value="student">All Students</option>
            <option value="instructor">All Instructors</option>
            <option value="admin">All Admins</option>
            <option value="company">All Companies</option>
          </select>
        </div>
        <textarea id="bulk-message-body" rows="4" style="width:99%;max-width:590px;padding:12px;border-radius:8px;border:1.3px solid #bbefff;background:rgba(245,255,255,0.9);font-size:1em;margin-bottom:0.6em;resize:vertical;" placeholder="Write your message or announcement…"></textarea>
        <div>
          <button class="btn" id="send-bulk-message-btn">Send Announcement</button>
          <small id="bulk-message-status" style="margin-left:1em;color:#76b4d6;font-weight:600;"></small>
        </div>
        <div style="margin-top:0.9em;">
          <small style="color:#77a;">
            Use for school-wide announcements, reminders, or urgent alerts.<br>
            <b>Note:</b> Private messaging to individual users is coming soon.
          </small>
        </div>
      </section>
    </div>
  `;

  /** ========== Checklist PDF Download ========== */
  document.getElementById('download-checklist-btn').onclick = async () => {
    const jsPDF = await ensureJsPDF();
    if (!jsPDF) return alert('PDF export requires jsPDF.');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('DOT/ELDT Compliance Checklist (Indiana)', 14, 18);
    doc.setFontSize(11);
    const checklist = [
      'School/provider registered in FMCSA TPR',
      'Instructor qualifications (certificates, resumes) on file',
      'Student records: progress, completion status, exam attempts',
      'Copy of CDL permit & medical card for each student',
      'Training curriculum/lesson records retained',
      'Range & behind-the-wheel hours tracked for each student',
      'Assessment & skills test records (including scores)',
      'Student completion reported to TPR (export available)',
      'All records retained for at least 3 years (FMCSA & Indiana BMV)',
    ];
    let y = 28;
    checklist.forEach((item) => {
      doc.text('☐ ' + item, 14, y);
      y += 9;
    });
    doc.save('IN_DOT_ELDT_Checklist.pdf');
  };

  /** ========== Export Users Logic ========== */
  document.getElementById('export-users-btn').onclick = async () => {
    const type = document.getElementById('export-users-type').value;
    const roleFilter = document.getElementById('user-role-filter').value;
    const filtered = users.filter(u => !roleFilter || u.role === roleFilter);
    if (!filtered.length) return alert('No users to export.');
    if (type === 'csv') exportUsersToCSV(filtered);
    else if (type === 'pdf') await exportUsersToPDF(filtered);
    else if (type === 'expiring') exportUsersExpiringToCSV(filtered, 30);
  };

  /** ========== Export Companies Logic ========== */
  document.getElementById('export-companies-btn').onclick = async () => {
    const type = document.getElementById('export-companies-type').value;
    if (!companies.length) return alert('No companies to export.');
    if (type === 'csv') exportCompaniesToCSV(companies);
    else if (type === 'pdf') await exportCompaniesToPDF(companies);
  };

  /** ========== Live Search & Table Filtering ========== */
  let lastSearch = '';
  function renderTable() {
    const role = document.getElementById('user-role-filter').value;
    const q = lastSearch.toLowerCase().trim();
    let filtered = users;
    if (role) filtered = filtered.filter(u => u.role === role);
    if (q) {
      filtered = filtered.filter(
        u =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.assignedCompany && u.assignedCompany.toLowerCase().includes(q))
      );
    }
    if (!filtered.length) {
      document.getElementById('report-table').innerHTML = `<div style="padding:2em;text-align:center;color:#789;">No users found.</div>`;
      return;
    }
    // Table
    document.getElementById('report-table').innerHTML = `
      <table class="user-table" style="width:100%;min-width:650px;">
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
          ${filtered
            .map(
              (u) => `
            <tr>
              <td>${u.name || ''}</td>
              <td>${u.email || ''}</td>
              <td><span class="role-badge ${u.role || ''}">${u.role || ''}</span></td>
              <td>${u.assignedCompany || ''}</td>
              <td>${u.permitExpiry || ''}</td>
              <td>${u.profileProgress != null ? u.profileProgress + '%' : ''}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }
  document.getElementById('user-role-filter').onchange = renderTable;
  document.getElementById('report-search').oninput = function () {
    lastSearch = this.value;
    renderTable();
  };
  renderTable();

  /** ========== Bulk Messaging/Announcements ========== */
  document.getElementById('send-bulk-message-btn').onclick = async () => {
    const target = document.getElementById('bulk-message-target').value;
    const body = document.getElementById('bulk-message-body').value.trim();
    const status = document.getElementById('bulk-message-status');
    status.textContent = '';
    if (!body) {
      status.textContent = 'Please enter a message.';
      status.style.color = '#e44';
      return;
    }
    // Simulate sending (replace with real backend call)
    status.textContent = 'Sending...';
    status.style.color = '#76b4d6';
    setTimeout(() => {
      status.textContent = 'Announcement sent!';
      status.style.color = '#28c47c';
      document.getElementById('bulk-message-body').value = '';
    }, 900);
  };
}

/** ========== Export Helpers ========== */
export function exportUsersToCSV(users) {
  if (!users?.length) return alert('No users to export.');
  const headers = [
    'Name', 'Email', 'Role', 'Assigned Instructor', 'Company',
    'Profile Progress', 'Permit Expiry', 'MedCard Expiry', 'Payment Status', 'Compliance',
  ];
  const rows = users.map((u) => [
    `"${u.name || ''}"`, `"${u.email || ''}"`, `"${u.role || ''}"`,
    `"${u.assignedInstructor || ''}"`, `"${u.assignedCompany || ''}"`,
    `"${u.profileProgress || 0}"`, `"${u.permitExpiry || ''}"`,
    `"${u.medCardExpiry || ''}"`, `"${u.paymentStatus || ''}"`,
    `"${u.compliance || ''}"`,
  ]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cdl-users-export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function exportUsersToPDF(users) {
  if (!users?.length) return alert('No users to export.');
  const jsPDF = await ensureJsPDF();
  if (!jsPDF) return;
  const doc = new jsPDF();
  const colHeaders = [
    'Name', 'Email', 'Role', 'Instructor', 'Company',
    'Profile %', 'Permit Exp.', 'Med Exp.', 'Payment', 'Compliance',
  ];
  const rows = users.map((u) => [
    u.name || '', u.email || '', u.role || '', u.assignedInstructor || '',
    u.assignedCompany || '', (u.profileProgress || 0) + '%',
    u.permitExpiry || '', u.medCardExpiry || '', u.paymentStatus || '', u.compliance || '',
  ]);
  doc.setFontSize(16);
  doc.text('CDL User Export', 14, 18);
  doc.setFontSize(10);
  let y = 28;
  colHeaders.forEach((h, i) => doc.text(h, 14 + i * 26, y));
  y += 7;
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * 26, y, { maxWidth: 26 });
    });
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
  doc.save('cdl-users-export.pdf');
}

export function exportCompaniesToCSV(companies) {
  if (!companies?.length) return alert('No companies to export.');
  const headers = ['Name', 'Contact', 'Address', 'Active'];
  const rows = companies.map((c) => [
    `"${c.name || ''}"`, `"${c.contact || ''}"`, `"${c.address || ''}"`, `"${c.active ? 'Yes' : 'No'}"`,
  ]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cdl-companies-export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function exportCompaniesToPDF(companies) {
  if (!companies?.length) return alert('No companies to export.');
  const jsPDF = await ensureJsPDF();
  if (!jsPDF) return;
  const doc = new jsPDF();
  const colHeaders = ['Name', 'Contact', 'Address', 'Active'];
  const rows = companies.map((c) => [
    c.name || '', c.contact || '', c.address || '', c.active ? 'Yes' : 'No',
  ]);
  doc.setFontSize(16);
  doc.text('CDL Company Export', 14, 18);
  doc.setFontSize(10);
  let y = 28;
  colHeaders.forEach((h, i) => doc.text(h, 14 + i * 45, y));
  y += 7;
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * 45, y, { maxWidth: 45 });
    });
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
  doc.save('cdl-companies-export.pdf');
}

export function exportUsersExpiringToCSV(users, days = 30) {
  if (!users?.length) return alert('No users to export.');
  const now = Date.now();
  const ms = days * 24 * 3600 * 1000;
  const soon = now + ms;
  const filtered = users.filter((u) => {
    if (!u.permitExpiry) return false;
    const d = new Date(u.permitExpiry);
    return d.getTime() >= now && d.getTime() <= soon;
  });
  if (!filtered.length) return alert('No permits expiring soon.');
  const headers = ['Name', 'Email', 'Permit Expiry', 'Role', 'Assigned Instructor', 'Company'];
  const rows = filtered.map((u) => [
    `"${u.name || ''}"`, `"${u.email || ''}"`, `"${u.permitExpiry || ''}"`,
    `"${u.role || ''}"`, `"${u.assignedInstructor || ''}"`, `"${u.assignedCompany || ''}"`,
  ]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cdl-users-permits-expiring.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}