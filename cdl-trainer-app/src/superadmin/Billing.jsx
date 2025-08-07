// src/superadmin/Billings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../utils/firebase"; // adjust if your path differs
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getUserRole } from "../utils/auth"; // role helper (fallback to localStorage if needed)
import { showToast } from "../utils/ui-helpers"; // toast hooks into your theme
// Optional: create a matching stylesheet if you want extra tweaks (glass theme already covers a lot)
// import "./billings.css";

/* =========================
   Small Utilities
========================= */
function formatDate(d) {
  if (!d) return "-";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return new Date(date).toLocaleDateString();
  } catch {
    return "-";
  }
}
function toISODateInput(d) {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/* =========================
   Minimal, Accessible Modal
========================= */
function Modal({ open, onClose, children, maxWidth = 560 }) {
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
   Billing View/Edit Modal (reusable)
====================================== */
function BillingFormModal({ mode = "view", school, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(() => ({
    name: school?.name || "",
    location: school?.location || "",
    tprId: school?.tprId || "",
    billingPlan: school?.billingPlan || "Standard",
    isActive: !!school?.isActive,
    renewalDate: toISODateInput(school?.renewalDate),
    lastPaymentDate: toISODateInput(school?.lastPaymentDate),
    invoiceUrl: school?.invoiceUrl || "",
    licensingDocs: (school?.licensingDocs || []).join(", "),
    billingNotes: school?.billingNotes || "",
    manualOverride: school?.manualOverride || "",
  }));

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "isActive" ? value === "true" : value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!isEdit) return onClose();

    try {
      const licensingDocs =
        form.licensingDocs.trim().length > 0
          ? form.licensingDocs.split(",").map((x) => x.trim())
          : [];
      const updated = {
        name: form.name,
        location: form.location,
        tprId: form.tprId,
        billingPlan: form.billingPlan,
        isActive: !!form.isActive,
        renewalDate: form.renewalDate || "",
        lastPaymentDate: form.lastPaymentDate || "",
        invoiceUrl: form.invoiceUrl || "",
        licensingDocs,
        billingNotes: form.billingNotes,
        manualOverride: form.manualOverride,
      };
      await updateDoc(doc(db, "schools", school.id), updated);
      showToast("Billing info updated!");
      onSaved?.();
      onClose();
    } catch (err) {
      showToast("❌ Failed to update billing info.");
    }
  }

  return (
    <Modal open={!!school} onClose={onClose} maxWidth={600}>
      <h3 style={{ marginTop: 0 }}>
        {isEdit ? "Edit" : "View"} Billing: {school?.name || ""}
      </h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.9em" }}>
        <label>
          School Name:
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            readOnly={!isEdit}
            type="text"
          />
        </label>

        <label>
          Location:
          <input
            name="location"
            value={form.location}
            onChange={onChange}
            readOnly={!isEdit}
            type="text"
          />
        </label>

        <label>
          TPR ID:
          <input
            name="tprId"
            value={form.tprId}
            onChange={onChange}
            readOnly={!isEdit}
            type="text"
          />
        </label>

        <label>
          Billing Plan:
          <select
            name="billingPlan"
            value={form.billingPlan}
            onChange={onChange}
            disabled={!isEdit}
          >
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Custom">Custom/Manual</option>
          </select>
        </label>

        <label>
          Status:
          <select
            name="isActive"
            value={form.isActive ? "true" : "false"}
            onChange={onChange}
            disabled={!isEdit}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
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
          Last Payment Date:
          <input
            name="lastPaymentDate"
            type="date"
            value={form.lastPaymentDate}
            onChange={onChange}
            readOnly={!isEdit}
          />
        </label>

        <label>
          Invoice URL:
          {isEdit ? (
            <input
              name="invoiceUrl"
              value={form.invoiceUrl}
              onChange={onChange}
              type="url"
              placeholder="https://… (optional)"
            />
          ) : form.invoiceUrl ? (
            <a href={form.invoiceUrl} target="_blank" rel="noreferrer">
              Download Invoice
            </a>
          ) : (
            <span className="badge badge-neutral">None</span>
          )}
        </label>

        <label>
          Licensing Docs:
          {isEdit ? (
            <input
              name="licensingDocs"
              value={form.licensingDocs}
              onChange={onChange}
              type="text"
              placeholder="Links, comma separated"
            />
          ) : school?.licensingDocs?.length ? (
            school.licensingDocs.map((url, i) => (
              <React.Fragment key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  License {i + 1}
                </a>
                {i < school.licensingDocs.length - 1 ? ", " : ""}
              </React.Fragment>
            ))
          ) : (
            <span className="badge badge-neutral">None</span>
          )}
        </label>

        <label>
          Billing Notes:
          <textarea
            name="billingNotes"
            value={form.billingNotes}
            onChange={onChange}
            readOnly={!isEdit}
            rows={3}
          />
        </label>

        <label>
          Manual Override:
          {isEdit ? (
            <input
              name="manualOverride"
              value={form.manualOverride}
              onChange={onChange}
              type="text"
              placeholder="e.g. comp, discount, note"
            />
          ) : school?.manualOverride ? (
            <span>{school.manualOverride}</span>
          ) : (
            <span className="badge badge-neutral">None</span>
          )}
        </label>

        <div style={{ display: "flex", gap: "0.6em", marginTop: "0.4em" }}>
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
   Main Deluxe Billings Page
====================================== */
export default function Billings() {
  const navigate = useNavigate();

  // --- Role guard (defense-in-depth; Router already has guards) ---
  useEffect(() => {
    const role = getUserRole?.() || localStorage.getItem("userRole");
    if (role !== "superadmin") {
      showToast("Access denied: Super Admins only.");
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // data
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters/sorting
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState(""); // "", "Standard", "Premium", "Enterprise", "Custom"
  const [status, setStatus] = useState(""); // "", "active", "inactive", "overdue"
  const [sortBy, setSortBy] = useState("name"); // "name" | "renewal" | "lastPayment"

  // modal
  const [modal, setModal] = useState({ open: false, school: null, mode: "view" });

  // fetch once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "schools"));
        if (!cancelled) {
          setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch {
        showToast("Failed to load schools or billing info.");
        setSchools([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // derived view (search/filter/sort)
  const view = useMemo(() => {
    let rows = [...schools];

    const term = q.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.location?.toLowerCase().includes(term) ||
          s.tprId?.toLowerCase().includes(term)
      );
    }

    if (plan) rows = rows.filter((s) => (s.billingPlan || "Standard") === plan);

    if (status) {
      rows = rows.filter((s) => {
        const isActive = !!s.isActive;
        const overdue =
          s.renewalDate && new Date(s.renewalDate).getTime() < Date.now();
        switch (status) {
          case "active":
            return isActive;
          case "inactive":
            return !isActive;
          case "overdue":
            return !!overdue;
          default:
            return true;
        }
      });
    }

    rows.sort((a, b) => {
      if (sortBy === "renewal") {
        const ad = a.renewalDate ? new Date(a.renewalDate).getTime() : 0;
        const bd = b.renewalDate ? new Date(b.renewalDate).getTime() : 0;
        return ad - bd; // oldest first
      }
      if (sortBy === "lastPayment") {
        const ad = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
        const bd = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
        return bd - ad; // newest first
      }
      return (a.name || "").localeCompare(b.name || ""); // default by name
    });

    return rows;
  }, [schools, q, plan, status, sortBy]);

  // export
  function exportCSV() {
    const rows = [
      [
        "School Name",
        "Location",
        "TPR ID",
        "Plan",
        "Status",
        "Renewal",
        "Last Payment",
        "Invoice",
        "Licensing Docs",
        "Notes",
      ],
      ...view.map((school) => [
        school.name || "",
        school.location || "",
        school.tprId || "",
        school.billingPlan || "Standard",
        school.isActive ? "Active" : "Inactive",
        school.renewalDate ? formatDate(school.renewalDate) : "",
        school.lastPaymentDate ? formatDate(school.lastPaymentDate) : "",
        school.invoiceUrl || "",
        school.licensingDocs?.length ? school.licensingDocs.join(", ") : "",
        school.billingNotes || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cdl-schools-billing-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    showToast("Billing CSV exported.");
  }

  // modal helpers
  function openModal(school, mode = "view") {
    setModal({ open: true, school, mode });
  }
  function closeModal() {
    setModal({ open: false, school: null, mode: "view" });
  }
  async function refreshAfterSave() {
    const snap = await getDocs(collection(db, "schools"));
    setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  if (loading) {
    return (
      <div className="screen-wrapper" style={{ textAlign: "center", padding: 40 }}>
        <div className="spinner" />
        <p>Loading billing & licensing…</p>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in billing-page" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h2 className="dash-head">
        💳 Billing & Licensing <span className="role-badge superadmin">Super Admin</span>
      </h2>

      <div className="dashboard-card" style={{ overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "flex", gap: "0.7em", flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0, marginRight: "auto" }}>
            Manage School Subscriptions, Licensing & Payments
          </h3>
          <button className="btn small outline" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="dashboard-controls" style={{ marginTop: "0.9em" }}>
          <input
            type="search"
            placeholder="Search name / location / TPR"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">All Plans</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Custom">Custom</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="overdue">Renewal Overdue</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name (A→Z)</option>
            <option value="renewal">Sort: Renewal (oldest first)</option>
            <option value="lastPayment">Sort: Last Payment (newest first)</option>
          </select>
        </div>

        {/* Table */}
        <div className="user-table-scroll" style={{ marginTop: "1rem" }}>
          <table className="user-table schools-billing-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>School Name</th>
                <th>Location</th>
                <th>TPR ID</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Renewal</th>
                <th>Last Payment</th>
                <th>Invoice</th>
                <th>Licensing Docs</th>
                <th>Notes</th>
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
                view.map((school) => {
                  const overdue =
                    school.renewalDate &&
                    new Date(school.renewalDate).getTime() < Date.now();
                  return (
                    <tr key={school.id}>
                      <td>{school.name || "-"}</td>
                      <td>{school.location || "-"}</td>
                      <td>{school.tprId || "-"}</td>
                      <td>{school.billingPlan || "Standard"}</td>
                      <td>
                        {school.isActive ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-fail">Inactive</span>
                        )}{" "}
                        {overdue && (
                          <span className="badge badge-fail">Renewal Overdue</span>
                        )}
                      </td>
                      <td>{school.renewalDate ? formatDate(school.renewalDate) : "-"}</td>
                      <td>{school.lastPaymentDate ? formatDate(school.lastPaymentDate) : "-"}</td>
                      <td>
                        {school.invoiceUrl ? (
                          <a href={school.invoiceUrl} target="_blank" rel="noreferrer">
                            Download
                          </a>
                        ) : (
                          <span className="badge badge-neutral">No Invoice</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        {school.licensingDocs?.length ? (
                          school.licensingDocs.map((url, i) => (
                            <React.Fragment key={url}>
                              <a href={url} target="_blank" rel="noreferrer">
                                Lic {i + 1}
                              </a>
                              {i < school.licensingDocs.length - 1 ? ", " : ""}
                            </React.Fragment>
                          ))
                        ) : (
                          <span className="badge badge-neutral">None</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 240, wordBreak: "break-word", fontSize: ".96em" }}>
                        {school.billingNotes || ""}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="btn small outline"
                            onClick={() => openModal(school, "view")}
                          >
                            View
                          </button>
                          <button
                            className="btn small"
                            onClick={() => openModal(school, "edit")}
                          >
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

        <div className="billing-hint" style={{ margin: "1em 0 .3em", fontSize: ".98em", color: "#77a" }}>
          <b>Note:</b> All changes are logged for audit. Export full records or upload
          invoices/licensing docs as needed.
        </div>

        <button
          className="btn outline"
          style={{ marginTop: "1.2rem" }}
          onClick={() => navigate("/superadmin-dashboard")}
        >
          ⬅ Dashboard
        </button>
      </div>

      {/* Modal */}
      <BillingFormModal
        mode={modal.mode}
        school={modal.open ? modal.school : null}
        onClose={closeModal}
        onSaved={refreshAfterSave}
      />
    </div>
  );
}