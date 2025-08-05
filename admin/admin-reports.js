// admin/admin-reports.js

import { getCurrentSchoolBranding } from '../school-branding.js';

const currentSchoolId = window.schoolId || localStorage.getItem('schoolId');
const adminRole = window.userRole || localStorage.getItem('userRole') || '';

/**
 * Loads jsPDF dynamically if not already loaded.
 * Returns jsPDF or null.
 */
async function ensureJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await import(
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
  );
  return window.jspdf?.jsPDF || null;
}

/**
 * Renders the Admin Reports page, including compliance checklist,
 * user/company export tools, and tips for admin users.
 */
export function renderAdminReports(container = document.getElementById('app')) {
  if (!container) return;

  // --- Protect with role check ---
  if (adminRole !== 'admin') {
    container.innerHTML = `<div class="dashboard-card" style="margin:2em auto;max-width:440px;">
      <h3>Access Denied</h3>
      <p>This page is for admins only.</p>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:860px;margin:0 auto;">
      <h2 class="dash-head">📄 Admin Reports</h2>
      <section class="dashboard-card compliance-checklist-card" style="margin-bottom: 1.6em;">
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
        <small style="color:#777;display:block;margin-top:0.6em;">
          <b>Tip:</b> Use this checklist to ensure your school or provider is always DOT-compliant.
          Download or export critical records as needed for audits.
        </small>
        <button class="btn outline" id="download-checklist-btn" style="margin-top:0.7em;">
          ⬇️ Download Checklist (PDF)
        </button>
      </section>
      <div style="margin-bottom:1em;">
        <input type="text" id="report-search" placeholder="Search users/companies..." style="padding:6px 12px;width:240px;">
      </div>
      <div style="display:flex;gap:1em;flex-wrap:wrap;margin:1.5em 0;">
        <button class="btn wide" id="export-users-csv-btn">Export Users (CSV)</button>
        <button class="btn wide" id="export-users-pdf-btn">Export Users (PDF)</button>
        <button class="btn wide" id="export-users-expiring-btn">Users: Expiring Permits (CSV)</button>
        <button class="btn wide" id="export-companies-csv-btn">Export Companies (CSV)</button>
        <button class="btn wide" id="export-companies-pdf-btn">Export Companies (PDF)</button>
      </div>
      <div class="dashboard-card">
        <b>Tips:</b> Use filters to only export data for this school. You can also copy data to clipboard after export.
      </div>
    </div>
  `;

  // --- Export checklist as PDF ---
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

  // --- Hook up export buttons ---
  document.getElementById('export-users-csv-btn').onclick = () =>
    window.exportUsersToCSV && exportUsersToCSV(window.adminUserList);
  document.getElementById('export-users-pdf-btn').onclick = () =>
    window.exportUsersToPDF && exportUsersToPDF(window.adminUserList);
  document.getElementById('export-users-expiring-btn').onclick = () =>
    exportUsersExpiringToCSV(window.adminUserList, 30);
  document.getElementById('export-companies-csv-btn').onclick = () =>
    exportCompaniesToCSV(window.adminCompanyList);
  document.getElementById('export-companies-pdf-btn').onclick = () =>
    exportCompaniesToPDF(window.adminCompanyList);

  // --- Live search (filter in page for user/company) ---
  document.getElementById('report-search').oninput = function () {
    const val = this.value.trim().toLowerCase();
    // TODO: Filter the adminUserList/adminCompanyList in the DOM if shown (future feature).
    showToast('Live search will filter data in a future upgrade.');
  };
}

// --- CSV Export Users (same as before, but you can improve) ---
export function exportUsersToCSV(users) {
  if (!users?.length) return alert('No users to export.');
  const filteredUsers = users.filter((u) => u.schoolId === currentSchoolId);
  if (!filteredUsers.length)
    return alert('No users to export for this school.');
  const headers = [
    'Name',
    'Email',
    'Role',
    'Assigned Instructor',
    'Company',
    'Profile Progress',
    'Permit Expiry',
    'MedCard Expiry',
    'Payment Status',
    'Compliance',
  ];
  const rows = filteredUsers.map((u) => [
    `"${u.name || ''}"`,
    `"${u.email || ''}"`,
    `"${u.role || ''}"`,
    `"${u.assignedInstructor || ''}"`,
    `"${u.assignedCompany || ''}"`,
    `"${u.profileProgress || 0}"`,
    `"${u.permitExpiry || ''}"`,
    `"${u.medCardExpiry || ''}"`,
    `"${u.paymentStatus || ''}"`,
    `"${u.compliance || ''}"`,
  ]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');
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

// --- PDF Export Users (same as before, but loads jsPDF automatically) ---
export async function exportUsersToPDF(users) {
  if (!users?.length) return alert('No users to export.');
  const filteredUsers = users.filter((u) => u.schoolId === currentSchoolId);
  if (!filteredUsers.length)
    return alert('No users to export for this school.');
  const jsPDF = await ensureJsPDF();
  if (!jsPDF) return;
  const doc = new jsPDF();
  const colHeaders = [
    'Name',
    'Email',
    'Role',
    'Instructor',
    'Company',
    'Profile %',
    'Permit Exp.',
    'Med Exp.',
    'Payment',
    'Compliance',
  ];
  const rows = filteredUsers.map((u) => [
    u.name || '',
    u.email || '',
    u.role || '',
    u.assignedInstructor || '',
    u.assignedCompany || '',
    (u.profileProgress || 0) + '%',
    u.permitExpiry || '',
    u.medCardExpiry || '',
    u.paymentStatus || '',
    u.compliance || '',
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

// --- Export Companies as CSV ---
export function exportCompaniesToCSV(companies) {
  if (!companies?.length) return alert('No companies to export.');
  const filteredCompanies = companies.filter(
    (c) => c.schoolId === currentSchoolId
  );
  if (!filteredCompanies.length)
    return alert('No companies to export for this school.');
  const headers = ['Name', 'Contact', 'Address', 'Active'];
  const rows = filteredCompanies.map((c) => [
    `"${c.name || ''}"`,
    `"${c.contact || ''}"`,
    `"${c.address || ''}"`,
    `"${c.active ? 'Yes' : 'No'}"`,
  ]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');
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

// --- Export Companies as PDF ---
export async function exportCompaniesToPDF(companies) {
  if (!companies?.length) return alert('No companies to export.');
  const filteredCompanies = companies.filter(
    (c) => c.schoolId === currentSchoolId
  );
  if (!filteredCompanies.length)
    return alert('No companies to export for this school.');
  const jsPDF = await ensureJsPDF();
  if (!jsPDF) return;
  const doc = new jsPDF();
  const colHeaders = ['Name', 'Contact', 'Address', 'Active'];
  const rows = filteredCompanies.map((c) => [
    c.name || '',
    c.contact || '',
    c.address || '',
    c.active ? 'Yes' : 'No',
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

// --- Export Only Users with Expiring Permits ---
export function exportUsersExpiringToCSV(users, days = 30) {
  if (!users?.length) return alert('No users to export.');
  const now = Date.now();
  const ms = days * 24 * 3600 * 1000;
  const soon = now + ms;
  const filtered = users.filter((u) => {
    if (u.schoolId !== currentSchoolId) return false;
    if (!u.permitExpiry) return false;
    const d = new Date(u.permitExpiry);
    return d.getTime() >= now && d.getTime() <= soon;
  });
  if (!filtered.length) return alert('No permits expiring soon.');
  const headers = [
    'Name',
    'Email',
    'Permit Expiry',
    'Role',
    'Assigned Instructor',
    'Company',
  ];
  const rows = filtered.map((u) => [
    `"${u.name || ''}"`,
    `"${u.email || ''}"`,
    `"${u.permitExpiry || ''}"`,
    `"${u.role || ''}"`,
    `"${u.assignedInstructor || ''}"`,
    `"${u.assignedCompany || ''}"`,
  ]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');
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
