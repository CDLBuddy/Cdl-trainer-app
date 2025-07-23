// admin/admin-reports.js

// ===== PDF EXPORT DEPENDENCY =====
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// window.jspdf.jsPDF will be available

// ===== CSV EXPORT (No dependencies needed) =====

/**
 * Export user data as CSV.
 * @param {Array} users - Array of user objects.
 */
export function exportUsersToCSV(users) {
  if (!users?.length) return alert("No users to export.");
  const headers = [
    "Name", "Email", "Role", "Assigned Instructor", "Company", "Profile Progress", 
    "Permit Expiry", "MedCard Expiry", "Payment Status", "Compliance"
  ];
  const rows = users.map(u => [
    `"${u.name || ''}"`,
    `"${u.email || ''}"`,
    `"${u.role || ''}"`,
    `"${u.assignedInstructor || ''}"`,
    `"${u.assignedCompany || ''}"`,
    `"${u.profileProgress || 0}"`,
    `"${u.permitExpiry || ''}"`,
    `"${u.medCardExpiry || ''}"`,
    `"${u.paymentStatus || ''}"`,
    `"${u.compliance || ''}"`
  ]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cdl-users-export.csv";
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
  if (!users?.length) return alert("No users to export.");
  // Ensure jsPDF is available
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert("PDF export requires jsPDF. Please include it in your HTML.");
    return;
  }

  const doc = new jsPDF();
  const colHeaders = [
    "Name", "Email", "Role", "Instructor", "Company", 
    "Profile %", "Permit Exp.", "Med Exp.", "Payment", "Compliance"
  ];
  const rows = users.map(u => [
    u.name || '',
    u.email || '',
    u.role || '',
    u.assignedInstructor || '',
    u.assignedCompany || '',
    (u.profileProgress || 0) + "%",
    u.permitExpiry || '',
    u.medCardExpiry || '',
    u.paymentStatus || '',
    u.compliance || ''
  ]);

  doc.setFontSize(16);
  doc.text("CDL User Export", 14, 18);
  doc.setFontSize(10);

  // Simple auto-table logic
  let y = 28;
  colHeaders.forEach((h, i) => doc.text(h, 14 + i * 26, y));
  y += 7;
  rows.forEach(row => {
    row.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * 26, y, { maxWidth: 26 });
    });
    y += 7;
    if (y > 270) { // Page break
      doc.addPage();
      y = 20;
    }
  });

  doc.save("cdl-users-export.pdf");
}

/**
 * Export company data as CSV (placeholder for future).
 * @param {Array} companies - Array of company objects.
 */
export function exportCompaniesToCSV(companies) {
  alert("Company CSV export coming soon!");
}

/**
 * Export company data as PDF (placeholder for future).
 * @param {Array} companies - Array of company objects.
 */
export function exportCompaniesToPDF(companies) {
  alert("Company PDF export coming soon!");
}

/**
 * Example: Export batch reminders/report (future placeholder).
 */
export function exportBatchReport(type, data) {
  // type: e.g., "missingPermit", "incompleteProfiles", etc.
  // data: array of relevant rows.
  alert(`Batch report (${type}) export coming soon!`);
}