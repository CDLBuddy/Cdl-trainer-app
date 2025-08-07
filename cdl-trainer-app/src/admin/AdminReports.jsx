import React, { useEffect, useState } from "react";
import { getCurrentSchoolBranding } from "../utils/school-branding";
import { showToast } from "../utils/ui-helpers";
// You should pass these as props, fetch from Firestore, or via context/provider:
import { fetchUsersForSchool, fetchCompaniesForSchool } from "../utils/admin-data";
let jsPDF = null;

const DOT_CHECKLIST = [
  "School/provider registered in FMCSA TPR",
  "Instructor qualifications (certificates, resumes) on file",
  "Student records: progress, completion status, exam attempts",
  "Copy of CDL permit & medical card for each student",
  "Training curriculum/lesson records retained",
  "Range & behind-the-wheel hours tracked for each student",
  "Assessment & skills test records (including scores)",
  "Student completion reported to TPR (export available)",
  "All records retained for at least 3 years (FMCSA & Indiana BMV)",
];

function ensureJsPDF() {
  if (jsPDF) return Promise.resolve(jsPDF);
  return import("jspdf").then((mod) => (jsPDF = mod.jsPDF));
}

// ========== MAIN COMPONENT ==========
const AdminReports = ({ currentSchoolId, currentRole }) => {
  const [brand, setBrand] = useState({});
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [userExportType, setUserExportType] = useState("csv");
  const [companyExportType, setCompanyExportType] = useState("csv");
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkTarget, setBulkTarget] = useState("all");
  const [bulkStatus, setBulkStatus] = useState("");

  useEffect(() => {
    (async () => {
      setBrand(await getCurrentSchoolBranding());
      // Fetch users & companies (implement these yourself)
      const [userList, companyList] = await Promise.all([
        fetchUsersForSchool(currentSchoolId),
        fetchCompaniesForSchool(currentSchoolId),
      ]);
      setUsers(userList);
      setCompanies(companyList);
    })();
    // eslint-disable-next-line
  }, [currentSchoolId]);

  useEffect(() => {
    let filtered = users;
    if (roleFilter) filtered = filtered.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.assignedCompany && u.assignedCompany.toLowerCase().includes(q))
      );
    }
    setFilteredUsers(filtered);
  }, [users, roleFilter, search]);

  // ========== EXPORTS ==========
  const exportUsersToCSV = (list) => {
    if (!list?.length) return showToast("No users to export.");
    const headers = [
      "Name",
      "Email",
      "Role",
      "Assigned Instructor",
      "Company",
      "Profile Progress",
      "Permit Expiry",
      "MedCard Expiry",
      "Payment Status",
      "Compliance",
    ];
    const rows = list.map((u) => [
      u.name || "",
      u.email || "",
      u.role || "",
      u.assignedInstructor || "",
      u.assignedCompany || "",
      u.profileProgress || "",
      u.permitExpiry || "",
      u.medCardExpiry || "",
      u.paymentStatus || "",
      u.compliance || "",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((x) => `"${x}"`).join(",")),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cdl-users-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const exportUsersToPDF = async (list) => {
    if (!list?.length) return showToast("No users to export.");
    await ensureJsPDF();
    const doc = new jsPDF();
    const colHeaders = [
      "Name",
      "Email",
      "Role",
      "Instructor",
      "Company",
      "Profile %",
      "Permit Exp.",
      "Med Exp.",
      "Payment",
      "Compliance",
    ];
    const rows = list.map((u) => [
      u.name || "",
      u.email || "",
      u.role || "",
      u.assignedInstructor || "",
      u.assignedCompany || "",
      (u.profileProgress || 0) + "%",
      u.permitExpiry || "",
      u.medCardExpiry || "",
      u.paymentStatus || "",
      u.compliance || "",
    ]);
    doc.setFontSize(16);
    doc.text("CDL User Export", 14, 18);
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
    doc.save("cdl-users-export.pdf");
  };

  const exportUsersExpiringToCSV = (list, days = 30) => {
    if (!list?.length) return showToast("No users to export.");
    const now = Date.now();
    const soon = now + days * 24 * 3600 * 1000;
    const filtered = list.filter((u) => {
      if (!u.permitExpiry) return false;
      const d = new Date(u.permitExpiry);
      return d.getTime() >= now && d.getTime() <= soon;
    });
    if (!filtered.length) return showToast("No permits expiring soon.");
    const headers = [
      "Name",
      "Email",
      "Permit Expiry",
      "Role",
      "Assigned Instructor",
      "Company",
    ];
    const rows = filtered.map((u) => [
      u.name || "",
      u.email || "",
      u.permitExpiry || "",
      u.role || "",
      u.assignedInstructor || "",
      u.assignedCompany || "",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((x) => `"${x}"`).join(",")),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cdl-users-permits-expiring.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const exportCompaniesToCSV = (list) => {
    if (!list?.length) return showToast("No companies to export.");
    const headers = ["Name", "Contact", "Address", "Active"];
    const rows = list.map((c) => [
      c.name || "",
      c.contact || "",
      c.address || "",
      c.active ? "Yes" : "No",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((x) => `"${x}"`).join(",")),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cdl-companies-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const exportCompaniesToPDF = async (list) => {
    if (!list?.length) return showToast("No companies to export.");
    await ensureJsPDF();
    const doc = new jsPDF();
    const colHeaders = ["Name", "Contact", "Address", "Active"];
    const rows = list.map((c) => [
      c.name || "",
      c.contact || "",
      c.address || "",
      c.active ? "Yes" : "No",
    ]);
    doc.setFontSize(16);
    doc.text("CDL Company Export", 14, 18);
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
    doc.save("cdl-companies-export.pdf");
  };

  // ========== PDF Download of Checklist ==========
  const downloadChecklistPDF = async () => {
    await ensureJsPDF();
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("DOT/ELDT Compliance Checklist (Indiana)", 14, 18);
    doc.setFontSize(11);
    let y = 28;
    DOT_CHECKLIST.forEach((item) => {
      doc.text("☐ " + item, 14, y);
      y += 9;
    });
    doc.save("IN_DOT_ELDT_Checklist.pdf");
  };

  // ========== Mass Messaging Handler ==========
  const sendBulkMessage = () => {
    if (!bulkMsg.trim()) {
      setBulkStatus("Please enter a message.");
      return;
    }
    setBulkStatus("Sending...");
    setTimeout(() => {
      setBulkStatus("Announcement sent!");
      setBulkMsg("");
    }, 900);
  };

  // ========== RENDER ==========
  if (currentRole !== "admin") {
    return (
      <div className="dashboard-card" style={{ margin: "2em auto", maxWidth: 440 }}>
        <h3>Access Denied</h3>
        <p>This page is for admins only.</p>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in" style={{ maxWidth: 940, margin: "0 auto" }}>
      <h2 className="dash-head">📄 Admin Reports & Messaging</h2>

      {/* Compliance Checklist */}
      <section className="dashboard-card compliance-checklist-card" style={{ marginBottom: "1.5em" }}>
        <h3>📝 DOT/ELDT Compliance Checklist (Indiana)</h3>
        <ul style={{ marginLeft: "1em" }}>
          {DOT_CHECKLIST.map((line, idx) => (
            <li key={idx}>☐ {line}</li>
          ))}
        </ul>
        <small style={{ color: "#77a", display: "block", marginTop: "0.6em" }}>
          <b>Tip:</b> Use this checklist to ensure your school or provider is always DOT-compliant.
          Download or export critical records as needed for audits.
        </small>
        <button className="btn btn-outline" style={{ marginTop: "0.7em" }} onClick={downloadChecklistPDF}>
          ⬇️ Download Checklist (PDF)
        </button>
      </section>

      {/* Exports Card */}
      <section className="dashboard-card" style={{ marginBottom: "2em" }}>
        <div className="section-title">Reports & Data Export</div>
        <div className="dashboard-controls" style={{ flexWrap: "wrap", gap: "1.2em", marginBottom: "1em" }}>
          <div style={{ minWidth: 280 }}>
            <label htmlFor="user-role-filter"><b>Filter Users by Role:</b></label>
            <select
              id="user-role-filter"
              className="glass-select"
              style={{ marginLeft: 7 }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ minWidth: 260 }}>
            <label htmlFor="export-users-type"><b>Export Users:</b></label>
            <select
              id="export-users-type"
              className="glass-select"
              style={{ marginLeft: 7 }}
              value={userExportType}
              onChange={(e) => setUserExportType(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="expiring">Expiring Permits (CSV)</option>
            </select>
            <button
              className="btn"
              style={{ marginLeft: 7 }}
              onClick={() => {
                if (userExportType === "csv") exportUsersToCSV(filteredUsers);
                else if (userExportType === "pdf") exportUsersToPDF(filteredUsers);
                else if (userExportType === "expiring") exportUsersExpiringToCSV(filteredUsers, 30);
              }}
            >
              Download
            </button>
          </div>
          <div style={{ minWidth: 260 }}>
            <label htmlFor="export-companies-type"><b>Export Companies:</b></label>
            <select
              id="export-companies-type"
              className="glass-select"
              style={{ marginLeft: 7 }}
              value={companyExportType}
              onChange={(e) => setCompanyExportType(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              className="btn"
              style={{ marginLeft: 7 }}
              onClick={() => {
                if (companyExportType === "csv") exportCompaniesToCSV(companies);
                else if (companyExportType === "pdf") exportCompaniesToPDF(companies);
              }}
            >
              Download
            </button>
          </div>
        </div>
        <div style={{ marginBottom: "1.3em" }}>
          <input
            type="text"
            id="report-search"
            placeholder="Search users/companies..."
            style={{ padding: "6px 12px", width: 260 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="user-table-scroll" style={{ background: "rgba(10,40,60,0.07)", borderRadius: 13 }}>
          {filteredUsers.length ? (
            <table className="user-table" style={{ width: "100%", minWidth: 650 }}>
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
                {filteredUsers.map((u, i) => (
                  <tr key={u.email || i}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role || ""}`}>{u.role}</span>
                    </td>
                    <td>{u.assignedCompany}</td>
                    <td>{u.permitExpiry}</td>
                    <td>{u.profileProgress != null ? `${u.profileProgress}%` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "2em", textAlign: "center", color: "#789" }}>
              No users found.
            </div>
          )}
        </div>
        <small style={{ color: "#77a", display: "block", marginTop: "1em" }}>
          <b>Tips:</b> All exports are scoped to this school only. Use filters and search before downloading.
        </small>
      </section>

      {/* Bulk Messaging Card */}
      <section className="dashboard-card" style={{ marginBottom: "2em" }}>
        <div className="section-title">Mass Messaging & Announcements</div>
        <div style={{ marginBottom: "0.8em" }}>
          <label htmlFor="bulk-message-target"><b>Target:</b></label>
          <select
            id="bulk-message-target"
            className="glass-select"
            style={{ marginLeft: 7 }}
            value={bulkTarget}
            onChange={(e) => setBulkTarget(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="student">All Students</option>
            <option value="instructor">All Instructors</option>
            <option value="admin">All Admins</option>
            <option value="company">All Companies</option>
          </select>
        </div>
        <textarea
          id="bulk-message-body"
          rows={4}
          style={{
            width: "99%",
            maxWidth: 590,
            padding: 12,
            borderRadius: 8,
            border: "1.3px solid #bbefff",
            background: "rgba(245,255,255,0.9)",
            fontSize: "1em",
            marginBottom: "0.6em",
            resize: "vertical",
          }}
          placeholder="Write your message or announcement…"
          value={bulkMsg}
          onChange={(e) => setBulkMsg(e.target.value)}
        />
        <div>
          <button className="btn" id="send-bulk-message-btn" onClick={sendBulkMessage}>
            Send Announcement
          </button>
          <small
            id="bulk-message-status"
            style={{
              marginLeft: "1em",
              color: bulkStatus === "Announcement sent!" ? "#28c47c" : "#76b4d6",
              fontWeight: 600,
            }}
          >
            {bulkStatus}
          </small>
        </div>
        <div style={{ marginTop: "0.9em" }}>
          <small style={{ color: "#77a" }}>
            Use for school-wide announcements, reminders, or urgent alerts.<br />
            <b>Note:</b> Private messaging to individual users is coming soon.
          </small>
        </div>
      </section>
    </div>
  );
};

export default AdminReports;
