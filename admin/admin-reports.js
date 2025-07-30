// admin/admin-reports.js

/**
 * Renders the Admin Reports page, including a DOT/ELDT compliance checklist,
 * user/company export tools, and tips for admin users.
 * @param {HTMLElement} container
 */
export function renderAdminReports(container = document.getElementById('app')) {
  if (!container) return;
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
      <p>
        Use the buttons below to export user or company data as CSV or PDF.<br>
        <span style="color:#888;">(Feature: More reports coming soon!)</span>
      </p>
      <div style="display:flex;gap:1em;flex-wrap:wrap;margin:1.5em 0;">
        <button class="btn wide" onclick="window.exportUsersToCSV && exportUsersToCSV(window.adminUserList)">
          Export Users (CSV)
        </button>
        <button class="btn wide" onclick="window.exportUsersToPDF && exportUsersToPDF(window.adminUserList)">
          Export Users (PDF)
        </button>
        <button class="btn wide" onclick="window.exportCompaniesToCSV && exportCompaniesToCSV(window.adminCompanyList)">
          Export Companies (CSV)
        </button>
        <button class="btn wide" onclick="window.exportCompaniesToPDF && exportCompaniesToPDF(window.adminCompanyList)">
          Export Companies (PDF)
        </button>
      </div>
      <div class="dashboard-card">
        <b>Tips:</b> Make sure user and company data is loaded before exporting. Only users with admin privileges can export reports.
      </div>
    </div>
  `;

  // Optional: Download checklist as PDF (uses jsPDF if loaded)
  document.getElementById('download-checklist-btn').onclick = () => {
    if (window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
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
      checklist.forEach(item => {
        doc.text('☐ ' + item, 14, y);
        y += 9;
      });
      doc.save('IN_DOT_ELDT_Checklist.pdf');
    } else {
      alert('PDF export requires jsPDF. Please include it in your HTML.');
    }
  };
}

/**
 * Export user data as CSV.
 * @param {Array} users - Array of user objects.
 */
export function exportUsersToCSV(users) {
  if (!users?.length) return alert('No users to export.');
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
  const rows = users.map((u) => [
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

/**
 * Export user data as a PDF.
 * @param {Array} users - Array of user objects.
 */
export function exportUsersToPDF(users) {
  if (!users?.length) return alert('No users to export.');
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert('PDF export requires jsPDF. Please include it in your HTML.');
    return;
  }
  const doc = new jsPDF();
  const colHeaders = [
    'Name', 'Email', 'Role', 'Instructor', 'Company',
    'Profile %', 'Permit Exp.', 'Med Exp.', 'Payment', 'Compliance'
  ];
  const rows = users.map((u) => [
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

/**
 * Export company data as CSV (placeholder for future).
 * @param {Array} companies - Array of company objects.
 */
export function exportCompaniesToCSV(companies) {
  alert('Company CSV export coming soon!');
}

/**
 * Export company data as PDF (placeholder for future).
 * @param {Array} companies - Array of company objects.
 */
export function exportCompaniesToPDF(companies) {
  alert('Company PDF export coming soon!');
}

/**
 * Example: Export batch reminders/report (future placeholder).
 */
export function exportBatchReport(type, data) {
  // type: e.g., "missingPermit", "incompleteProfiles", etc.
  // data: array of relevant rows.
  alert(`Batch report (${type}) export coming soon!`);
}