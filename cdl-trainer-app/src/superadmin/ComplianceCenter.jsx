// src/superadmin/Compliance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../utils/firebase"; // adjust path if needed
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getUserRole } from "../utils/auth";
import { showToast } from "../utils/ui-helpers";

/* =========================
   Small Utilities
========================= */
function daysUntil(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  return Math.floor((d - now) / (1000 * 60 * 60 * 24));
}
function toISO(d) {
  if (!d) return "";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "-";
  }
}
function badgeForRenewal(renewalDate) {
  const d = daysUntil(renewalDate);
  if (d === null) return "-";
  if (d < 0) return <span className="badge badge-fail">Overdue</span>;
  if (d < 30) return <span className="badge badge-warn">{d} days</span>;
  return <span className="badge badge-success">{d} days</span>;
}
function badgeForAudit(lastAuditDate) {
  if (!lastAuditDate) return "-";
  const since = daysUntil(lastAuditDate) * -1;
  if (since > 365) return <span className="badge badge-fail">{since}d ago</span>;
  return <span className="badge badge-success">{since}d ago</span>;
}
function computeMissing(s) {
  const out = [];
  if (!s.lastAuditDate) out.push("No audit date");
  if (!s.curriculumFile) out.push("Missing curriculum");
  if (!s.instructorFiles || !s.instructorFiles.length)
    out.push("No instructor files");
  if (!s.humanTraffickingPolicy) out.push("Missing trafficking cert");
  if (!s.tprStatus || s.tprStatus !== "Active") out.push("TPR problem");
  const du = daysUntil(s.renewalDate);
  if (du !== null && du < 0) out.push("Renewal overdue");
  return out;
}
function computeHealthScore(s) {
  const missing = computeMissing(s).length;
  if (s.complianceFlag) return "red";
  if (missing > 2) return "red";
  if (missing > 0) return "yellow";
  return "green";
}

/* =========================
   Minimal, Accessible Modal
========================= */
function Modal({ open, onClose, maxWidth = 600, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay fade-in" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth }}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

/* ======================================
   Review/Edit Compliance Modal
====================================== */
function ComplianceModal({ school, mode = "view", onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(() => ({
    name: school?.name || "",
    tprId: school?.tprId || "",
    tprStatus: school?.tprStatus || "Active",
    lastAuditDate: toISO(school?.lastAuditDate),
    renewalDate: toISO(school?.renewalDate),
    curriculumFile: school?.curriculumFile || "",
    curriculumVersion: school?.curriculumVersion || "v1",
    instructorFiles: (school?.instructorFiles || []).join(", "),
    humanTraffickingPolicy: !!school?.humanTraffickingPolicy,
    complianceFlag: school?.complianceFlag || "",
    notes: school?.notes || "",
    auditFindings: school?.auditFindings || "",
  }));

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!isEdit) return onClose();

    const payload = {
      name: form.name,
      tprId: form.tprId,
      tprStatus: form.tprStatus,
      lastAuditDate: form.lastAuditDate,
      renewalDate: form.renewalDate,
      curriculumFile: form.curriculumFile,
      curriculumVersion: form.curriculumVersion || "v1",
      instructorFiles: form.instructorFiles
        ? form.instructorFiles.split(",").map((x) => x.trim())
        : [],
      humanTraffickingPolicy: !!form.humanTraffickingPolicy,
      complianceFlag: form.complianceFlag || "",
      notes: form.notes,
      auditFindings: form.auditFindings,
    };

    try {
      await updateDoc(doc(db, "schools", school.id), payload);
      showToast("Compliance info updated!");
      onSaved?.();
      onClose();
    } catch (err) {
      showToast("❌ Failed to update compliance info.");
    }
  }

  return (
    <Modal open={!!school} onClose={onClose} maxWidth={620}>
      <h3 style={{ marginTop: 0 }}>
        {isEdit ? "Edit" : "Review"} Compliance: {school?.name || ""}
      </h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.9em" }}>
        <label>
          School Name:
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            type="text"
            readOnly={!isEdit}
          />
        </label>
        <label>
          TPR ID:
          <input
            name="tprId"
            value={form.tprId}
            onChange={onChange}
            type="text"
            readOnly={!isEdit}
          />
        </label>

        <label>
          FMCSA Status:
          <select
            name="tprStatus"
            value={form.tprStatus}
            onChange={onChange}
            disabled={!isEdit}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending">Pending</option>
          </select>
        </label>

        <label>
          Last Audit:
          <input
            name="lastAuditDate"
            type="date"
            value={form.lastAuditDate}
            onChange={onChange}
            readOnly={!isEdit}
          />
        </label>
        <label>
          Renewal Date:
          <input
            name="renewalDate"
            type="date"
            value={form.renewalDate}
            onChange={onChange}
            readOnly={!isEdit}
          />
        </label>

        <label>
          Curriculum File:
          {isEdit ? (
            <>
              <input
                name="curriculumFile"
                value={form.curriculumFile}
                onChange={onChange}
                type="url"
                placeholder="https://…"
              />
              <input
                name="curriculumVersion"
                value={form.curriculumVersion}
                onChange={onChange}
                type="text"
                placeholder="Version (v1, v2…)"
                style={{ marginTop: 6 }}
              />
            </>
          ) : form.curriculumFile ? (
            <>
              <a href={form.curriculumFile} target="_blank" rel="noreferrer">
                View Curriculum
              </a>{" "}
              <span className="badge badge-version">
                {form.curriculumVersion || "v1"}
              </span>
            </>
          ) : (
            <span className="badge badge-fail">None</span>
          )}
        </label>

        <label>
          Instructor Files:
          {isEdit ? (
            <input
              name="instructorFiles"
              value={form.instructorFiles}
              onChange={onChange}
              type="text"
              placeholder="Links, comma separated"
            />
          ) : school?.instructorFiles?.length ? (
            <span>{school.instructorFiles.join(", ")}</span>
          ) : (
            <span className="badge badge-fail">None</span>
          )}
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Human Trafficking Policy:
          {isEdit ? (
            <input
              type="checkbox"
              name="humanTraffickingPolicy"
              checked={!!form.humanTraffickingPolicy}
              onChange={onChange}
            />
          ) : form.humanTraffickingPolicy ? (
            <span className="badge badge-success">Yes</span>
          ) : (
            <span className="badge badge-fail">No</span>
          )}
        </label>

        <label>
          Compliance Flag/Issue:
          <select
            name="complianceFlag"
            value={form.complianceFlag}
            onChange={onChange}
            disabled={!isEdit}
          >
            <option value="">None</option>
            <option value="audit">Audit/Review</option>
            <option value="renewal">Renewal Due</option>
            <option value="docs">Missing Docs</option>
            <option value="other">Other Issue</option>
          </select>
        </label>

        <label>
          Compliance Notes:
          <textarea
            name="notes"
            rows={3}
            value={form.notes}
            onChange={onChange}
            readOnly={!isEdit}
          />
        </label>

        <label>
          Audit Findings (if any):
          <textarea
            name="auditFindings"
            rows={3}
            value={form.auditFindings}
            onChange={onChange}
            readOnly={!isEdit}
          />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {isEdit && (
            <button className="btn primary wide" type="submit">
              Save Changes
            </button>
          )}
          <button className="btn outline wide" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ======================================
   Deluxe Compliance Center Page
====================================== */
export default function Compliance() {
  const navigate = useNavigate();

  // role guard
  useEffect(() => {
    const role = getUserRole?.() || localStorage.getItem("userRole");
    if (role !== "superadmin") {
      showToast("Access denied: Super Admins only.");
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters/sorting
  const [q, setQ] = useState("");
  const [tprStatus, setTprStatus] = useState(""); // "", Active, Inactive, Suspended, Pending
  const [health, setHealth] = useState(""); // "", green, yellow, red
  const [issue, setIssue] = useState(""); // "", missingDocs, overdueRenewal, noAudit
  const [sortBy, setSortBy] = useState("name"); // name | renewal | lastAudit | health

  // modal
  const [modal, setModal] = useState({ open: false, school: null, mode: "view" });

  // fetch
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "schools"));
        if (!cancel) {
          setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch {
        showToast("Failed to load schools.");
        setSchools([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const view = useMemo(() => {
    let rows = [...schools];

    // search
    const term = q.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.tprId?.toLowerCase().includes(term) ||
          s.location?.toLowerCase().includes(term)
      );
    }

    // filter by TPR status
    if (tprStatus) rows = rows.filter((s) => (s.tprStatus || "Unknown") === tprStatus);

    // filter by health score
    if (health) rows = rows.filter((s) => computeHealthScore(s) === health);

    // issue filters
    if (issue) {
      rows = rows.filter((s) => {
        const missing = computeMissing(s);
        const du = daysUntil(s.renewalDate);
        if (issue === "missingDocs") {
          return (
            missing.includes("Missing curriculum") ||
            missing.includes("No instructor files") ||
            missing.includes("Missing trafficking cert")
          );
        }
        if (issue === "overdueRenewal") return du !== null && du < 0;
        if (issue === "noAudit") return !s.lastAuditDate;
        return true;
      });
    }

    // sort
    rows.sort((a, b) => {
      if (sortBy === "renewal") {
        const ad = a.renewalDate ? new Date(a.renewalDate).getTime() : 0;
        const bd = b.renewalDate ? new Date(b.renewalDate).getTime() : 0;
        return ad - bd; // oldest first
      }
      if (sortBy === "lastAudit") {
        const ad = a.lastAuditDate ? new Date(a.lastAuditDate).getTime() : 0;
        const bd = b.lastAuditDate ? new Date(b.lastAuditDate).getTime() : 0;
        return bd - ad; // newest first (most recently audited first)
      }
      if (sortBy === "health") {
        const rank = { green: 2, yellow: 1, red: 0 };
        return rank[computeHealthScore(b)] - rank[computeHealthScore(a)];
      }
      return (a.name || "").localeCompare(b.name || "");
    });

    return rows;
  }, [schools, q, tprStatus, health, issue, sortBy]);

  function exportCSV() {
    const rows = [
      [
        "School",
        "TPR ID",
        "TPR Status",
        "Renewal",
        "Last Audit",
        "Curriculum",
        "Instructor Files",
        "Human Trafficking",
        "Compliance Score",
        "Alerts",
      ],
      ...view.map((s) => {
        const missing = computeMissing(s);
        return [
          s.name || "",
          s.tprId || "",
          s.tprStatus || "Unknown",
          s.renewalDate ? fmtDate(s.renewalDate) : "",
          s.lastAuditDate ? fmtDate(s.lastAuditDate) : "",
          s.curriculumFile ? `Yes (${s.curriculumVersion || "v1"})` : "Missing",
          s.instructorFiles?.length ? `${s.instructorFiles.length}` : "0",
          s.humanTraffickingPolicy ? "Yes" : "No",
          computeHealthScore(s).toUpperCase(),
          missing.join("; "),
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cdl-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("Compliance CSV exported.");
  }

  async function refresh() {
    const snap = await getDocs(collection(db, "schools"));
    setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  function openModal(school, mode = "view") {
    setModal({ open: true, school, mode });
  }
  function closeModal() {
    setModal({ open: false, school: null, mode: "view" });
  }

  if (loading) {
    return (
      <div className="screen-wrapper" style={{ textAlign: "center", padding: 40 }}>
        <div className="spinner" />
        <p>Loading compliance center…</p>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in compliance-page" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h2 className="dash-head">
        🛡️ Compliance Center <span className="role-badge superadmin">Super Admin</span>
      </h2>

      <div className="dashboard-card" style={{ overflow: "hidden" }}>
        {/* top row */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, marginRight: "auto" }}>School Regulatory Compliance Overview</h3>
          <button className="btn small outline" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        {/* filters */}
        <div className="dashboard-controls" style={{ marginTop: "0.9em" }}>
          <input
            type="search"
            placeholder="Search school / TPR / location"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select value={tprStatus} onChange={(e) => setTprStatus(e.target.value)}>
            <option value="">All TPR Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending">Pending</option>
          </select>
          <select value={health} onChange={(e) => setHealth(e.target.value)}>
            <option value="">All Health</option>
            <option value="green">GREEN</option>
            <option value="yellow">YELLOW</option>
            <option value="red">RED</option>
          </select>
          <select value={issue} onChange={(e) => setIssue(e.target.value)}>
            <option value="">Any Issue</option>
            <option value="missingDocs">Missing Docs</option>
            <option value="overdueRenewal">Overdue Renewal</option>
            <option value="noAudit">No Audit Date</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name (A→Z)</option>
            <option value="renewal">Sort: Renewal (oldest first)</option>
            <option value="lastAudit">Sort: Last Audit (newest first)</option>
            <option value="health">Sort: Health (critical first)</option>
          </select>
        </div>

        {/* table */}
        <div className="user-table-scroll" style={{ marginTop: "1rem" }}>
          <table className="user-table compliance-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>School</th>
                <th>TPR ID</th>
                <th>Status</th>
                <th>Renewal</th>
                <th>Last Audit</th>
                <th>Curriculum</th>
                <th>Instructors</th>
                <th>Human Trafficking</th>
                <th>Compliance Score</th>
                <th>Alerts</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "1.6em", color: "#789" }}>
                    No schools match your filters.
                  </td>
                </tr>
              ) : (
                view.map((s) => {
                  const missing = computeMissing(s);
                  const score = computeHealthScore(s);
                  return (
                    <tr key={s.id}>
                      <td>{s.name || "-"}</td>
                      <td>{s.tprId || "-"}</td>
                      <td>
                        {s.tprStatus === "Active" ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-fail">{s.tprStatus || "Unknown"}</span>
                        )}
                      </td>
                      <td>{s.renewalDate ? badgeForRenewal(s.renewalDate) : "-"}</td>
                      <td>{s.lastAuditDate ? badgeForAudit(s.lastAuditDate) : "-"}</td>
                      <td>
                        {s.curriculumFile ? (
                          <>
                            <a href={s.curriculumFile} target="_blank" rel="noreferrer">
                              View
                            </a>{" "}
                            <span className="badge badge-version">{s.curriculumVersion || "v1"}</span>
                          </>
                        ) : (
                          <span className="badge badge-fail">Missing</span>
                        )}
                      </td>
                      <td>
                        {s.instructorFiles?.length ? (
                          <span className="badge badge-success">✔️ {s.instructorFiles.length}</span>
                        ) : (
                          <span className="badge badge-fail">None</span>
                        )}
                      </td>
                      <td>
                        {s.humanTraffickingPolicy ? (
                          <span className="badge badge-success">Yes</span>
                        ) : (
                          <span className="badge badge-fail">No</span>
                        )}
                      </td>
                      <td>
                        <span className={`compliance-health compliance-${score}`}>
                          {score.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: "#d37a53", fontSize: ".98em" }}>
                        {missing.length ? (
                          missing.join(", ")
                        ) : (
                          <span style={{ color: "#39b970" }}>All good</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="btn small outline"
                            onClick={() => openModal(s, "view")}
                          >
                            Review
                          </button>
                          <button className="btn small" onClick={() => openModal(s, "edit")}>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ margin: "1em 0 .3em", fontSize: ".98em", color: "#77a" }}>
          <b>Note:</b> All compliance changes are logged. Upload latest docs, flag issues, and keep
          audit/renewal dates up to date.
        </div>

        <button
          className="btn outline"
          style={{ marginTop: "1.2rem" }}
          onClick={() => navigate("/superadmin-dashboard")}
        >
          ⬅ Dashboard
        </button>
      </div>

      <ComplianceModal
        school={modal.open ? modal.school : null}
        mode={modal.mode}
        onClose={closeModal}
        onSaved={refresh}
      />
    </div>
  );
}