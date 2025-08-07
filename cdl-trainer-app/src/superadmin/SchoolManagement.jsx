import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";                 // <- adjust if needed
import { showToast } from "../utils/ui-helpers";        // <- your toast helper
import { getUserRole } from "../utils/auth";            // <- role check helper

/* ============================================================================
   Helpers
   ========================================================================== */

// Compute next custom ID like "school003"
async function getNextSchoolId() {
  const snap = await getDocs(collection(db, "schools"));
  const ids = snap.docs
    .map((d) => d.id)
    .filter((id) => /^school\d+$/.test(id));
  const maxNum = Math.max(0, ...ids.map((id) => parseInt(id.replace("school", ""), 10)));
  const next = String(maxNum + 1).padStart(3, "0");
  return `school${next}`;
}

// CSV export
function escapeCSV(s) {
  return `"${String(s ?? "").replace(/"/g, '""')}"`;
}
function schoolsToCSV(schools) {
  if (!schools.length) return "";
  const cols = [
    "id",
    "name",
    "location",
    "address",
    "tprId",
    "status",
    "tprExpiry",
    "rangeAddress",
    "contactName",
    "contactEmail",
    "contactPhone",
    "notes",
    "createdAt",
    "updatedAt",
  ];
  const header = cols.join(",");
  const body = schools
    .map((s) =>
      cols
        .map((k) => (typeof s[k] === "object" ? escapeCSV(JSON.stringify(s[k])) : escapeCSV(s[k])))
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

// Status badge visual
function StatusBadge({ status }) {
  const map = {
    Active: "badge-active",
    Pending: "badge-pending",
    Suspended: "badge-suspended",
    Expired: "badge-expired",
  };
  const cls = map[status] || "badge-neutral";
  return <span className={`badge ${cls}`}>{status || "Unknown"}</span>;
}

/* ============================================================================
   Modals (Edit / Profile)
   ========================================================================== */

function Modal({ children, onClose, maxWidth = 560 }) {
  return createPortal(
    <div className="modal-overlay fade-in" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth }}>
        <button
          className="modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          &times;
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

function SchoolProfileModal({ school, onClose }) {
  return (
    <Modal onClose={onClose} maxWidth={560}>
      <h3>School Profile</h3>
      <div><strong>Name:</strong> {school.name}</div>
      <div><strong>Location:</strong> {school.location}</div>
      <div><strong>Address:</strong> {school.address || "-"}</div>
      <div><strong>TPR ID:</strong> {school.tprId || "-"}</div>
      <div><strong>Status:</strong> <StatusBadge status={school.status} /></div>
      <div><strong>Expiry:</strong> {school.tprExpiry || "-"}</div>
      <div>
        <strong>Contact:</strong>{" "}
        {school.contactName || "-"}, {school.contactEmail || "-"}, {school.contactPhone || "-"}
      </div>
      <div><strong>Range:</strong> {school.rangeAddress || "-"}</div>
      <div><strong>Notes:</strong> {school.notes || "-"}</div>
      <div>
        <strong>Change Log:</strong>
        <ul style={{ fontSize: "0.97em" }}>
          {Array.isArray(school.changeLog) && school.changeLog.length ? (
            school.changeLog.map((l, idx) => (
              <li key={idx}>
                {l.date || ""}: {l.change || ""} by {l.by || "?"}
              </li>
            ))
          ) : (
            <li>No history yet</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}

function EditSchoolModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    location: initial?.location || "",
    address: initial?.address || "",
    tprId: initial?.tprId || "",
    status: initial?.status || "Active",
    tprExpiry: initial?.tprExpiry || "",
    rangeAddress: initial?.rangeAddress || "",
    contactName: initial?.contactName || "",
    contactEmail: initial?.contactEmail || "",
    contactPhone: initial?.contactPhone || "",
    notes: initial?.notes || "",
  }));
  const isEditing = !!initial?.id;

  function updateField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <h3>{isEditing ? "Edit School / Provider" : "Add New School / Provider"}</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.8em" }}>
        <input name="name" type="text" placeholder="School/Provider Name" value={form.name} onChange={updateField} required />
        <input name="location" type="text" placeholder="Location (City, State)" value={form.location} onChange={updateField} required />
        <input name="address" type="text" placeholder="Full Address" value={form.address} onChange={updateField} />
        <input name="tprId" type="text" placeholder="TPR ID" value={form.tprId} onChange={updateField} required />
        <select name="status" value={form.status} onChange={updateField}>
          {["Active", "Pending", "Suspended", "Expired"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input name="tprExpiry" type="date" value={form.tprExpiry} onChange={updateField} />
        <input name="rangeAddress" type="text" placeholder="Range Address (optional)" value={form.rangeAddress} onChange={updateField} />
        <input name="contactName" type="text" placeholder="Contact Person" value={form.contactName} onChange={updateField} />
        <input name="contactEmail" type="email" placeholder="Contact Email" value={form.contactEmail} onChange={updateField} required />
        <input name="contactPhone" type="tel" placeholder="Contact Phone" value={form.contactPhone} onChange={updateField} />
        <textarea name="notes" rows={2} placeholder="Internal notes, reminders, audit flags..." value={form.notes} onChange={updateField} />
        <button className="btn primary" type="submit">
          {isEditing ? "Save Changes" : "Add School"}
        </button>
      </form>
    </Modal>
  );
}

/* ============================================================================
   Main Component
   ========================================================================== */

export default function SchoolManagement() {
  const navigate = useNavigate();

  // Role guard (superadmin only)
  useEffect(() => {
    const role = getUserRole?.() || localStorage.getItem("userRole") || "";
    if (role !== "superadmin") {
      showToast("Access denied: Super Admins only.");
      navigate("/login");
    }
  }, [navigate]);

  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [queryText, setQueryText] = useState("");
  const [selected, setSelected] = useState(new Set());

  // Modals
  const [profileSchool, setProfileSchool] = useState(null); // view modal
  const [editSchool, setEditSchool] = useState(null);       // edit/add modal (initial data or null)

  // Fetch schools (ordered by name)
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "schools"), orderBy("name")));
        if (!mounted) return;
        setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        showToast("Failed to load schools.", 3200, "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    const f = queryText.trim().toLowerCase();
    if (!f) return schools;
    return schools.filter((s) =>
      [s.name, s.tprId, s.location, s.status, s.address]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(f))
    );
  }, [schools, queryText]);

  // Selection
  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll(checked) {
    setSelected(checked ? new Set(filtered.map((s) => s.id)) : new Set());
  }

  // Create / Update
  async function handleSaveNew(form) {
    try {
      const newId = await getNextSchoolId();
      const payload = {
        ...form,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true,
        logoUrl: "/public/default-logo.svg",
        website: "",
        subHeadline: "",
        changeLog: [
          {
            date: new Date().toISOString(),
            change: "School created",
            by: "Superadmin",
          },
        ],
      };
      await setDoc(doc(db, "schools", newId), payload);
      setSchools((prev) => [...prev, { id: newId, ...payload }].sort((a, b) => a.name.localeCompare(b.name)));
      showToast("School added!", 2200, "success");
      setEditSchool(null);
    } catch (e) {
      showToast("Failed to add school.", 3200, "error");
    }
  }

  async function handleSaveEdit(form, schoolId) {
    try {
      const updates = {
        ...form,
        updatedAt: new Date().toISOString(),
        changeLog: [
          ...(schools.find((s) => s.id === schoolId)?.changeLog || []),
          {
            date: new Date().toISOString(),
            change: "School updated",
            by: "Superadmin",
          },
        ],
      };
      await updateDoc(doc(db, "schools", schoolId), updates);
      setSchools((prev) =>
        prev
          .map((s) => (s.id === schoolId ? { ...s, ...updates } : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast("School updated!", 2200, "success");
      setEditSchool(null);
    } catch {
      showToast("Failed to update school.", 3200, "error");
    }
  }

  // Delete (single / bulk)
  async function handleDeleteOne(id) {
    if (!window.confirm("Delete this school/provider? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "schools", id));
      setSchools((prev) => prev.filter((s) => s.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast("School deleted.", 2200, "success");
    } catch {
      showToast("Failed to delete school.", 3200, "error");
    }
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} schools? This cannot be undone.`)) return;
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => deleteDoc(doc(db, "schools", id))));
      setSchools((prev) => prev.filter((s) => !selected.has(s.id)));
      setSelected(new Set());
      showToast(`${ids.length} school(s) deleted.`, 2200, "success");
    } catch {
      showToast("Bulk delete failed.", 3200, "error");
    }
  }

  // Export CSV
  function handleExportCSV() {
    const csv = schoolsToCSV(schools);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cdl_schools.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 800);
  }

  // Render
  if (loading) {
    return (
      <div className="screen-wrapper centered-page">
        <div className="loading-spinner" />
        <p>Loading schools…</p>
      </div>
    );
  }

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const anySelected = selected.size > 0;

  return (
    <div className="screen-wrapper fade-in" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h2 className="dash-head">
        🏫 School Management <span className="role-badge superadmin">Super Admin</span>
      </h2>

      {/* Add / Search / CSV / Bulk */}
      <div className="dashboard-card" style={{ marginBottom: "1.8em" }}>
        <div style={{ display: "flex", gap: "0.8em", flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={() => setEditSchool({})}>+ Add School</button>
          <input
            type="search"
            placeholder="Search by name, TPR, location, status…"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            style={{ flex: "1 1 280px", minWidth: 220 }}
          />
          <button className="btn outline" onClick={handleExportCSV}>Download CSV</button>
          <button className="btn danger" disabled={!anySelected} onClick={handleBulkDelete}>
            Delete Selected
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card" style={{ overflowX: "auto" }}>
        <table className="user-table" style={{ width: "100%", minWidth: 900 }}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th>Name</th>
              <th>Location</th>
              <th>Address</th>
              <th>TPR ID</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center" }}>No schools found.</td>
              </tr>
            ) : (
              filtered.map((school) => (
                <tr key={school.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(school.id)}
                      onChange={() => toggleSelect(school.id)}
                    />
                  </td>
                  <td>
                    <button
                      className="link-like"
                      onClick={() => setProfileSchool(school)}
                      title="View profile"
                    >
                      {school.name || "-"}
                    </button>
                  </td>
                  <td>{school.location || "-"}</td>
                  <td style={{ maxWidth: 220, wordBreak: "break-word" }}>{school.address || "-"}</td>
                  <td>{school.tprId || "-"}</td>
                  <td><StatusBadge status={school.status} /></td>
                  <td>{school.tprExpiry || "-"}</td>
                  <td>{school.contactName || "-"}</td>
                  <td style={{ maxWidth: 220, wordBreak: "break-word" }}>{school.contactEmail || "-"}</td>
                  <td>{school.contactPhone || "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn outline" onClick={() => setEditSchool(school)}>Edit</button>
                      <button className="btn danger" onClick={() => handleDeleteOne(school.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <button
          className="btn outline"
          style={{ marginTop: "1.6rem" }}
          onClick={() => navigate("/superadmin")}
        >
          ⬅ Dashboard
        </button>
      </div>

      {/* View Profile Modal */}
      {profileSchool && (
        <SchoolProfileModal
          school={profileSchool}
          onClose={() => setProfileSchool(null)}
        />
      )}

      {/* Add/Edit Modal */}
      {editSchool !== null && (
        <EditSchoolModal
          initial={editSchool.id ? editSchool : null}
          onClose={() => setEditSchool(null)}
          onSave={(form) =>
            editSchool.id
              ? handleSaveEdit(form, editSchool.id)
              : handleSaveNew(form)
          }
        />
      )}
    </div>
  );
}