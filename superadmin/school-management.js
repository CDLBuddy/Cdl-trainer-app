import { db } from '../firebase.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderSuperadminDashboard } from './superadmin-dashboard.js';

// --- Status badge helper ---
function getStatusBadge(status) {
  const statusMap = {
    "Active":   '<span class="badge badge-active">Active</span>',
    "Pending":  '<span class="badge badge-pending">Pending</span>',
    "Suspended":'<span class="badge badge-suspended">Suspended</span>',
    // eslint-disable-next-line prettier/prettier
    "Expired":  '<span class="badge badge-expired">Expired</span>'
  };
  return statusMap[status] || `<span class="badge badge-neutral">${status||"Unknown"}</span>`;
}

// --- CSV Export Helper ---
function schoolsToCSV(schools) {
  if (!schools.length) return "";
  const keys = Object.keys(schools[0]);
  const escape = s => `"${String(s||"").replace(/"/g,'""')}"`;
  const header = keys.join(",");
  const rows = schools.map(s =>
    keys.map(k => escape(typeof s[k]==="object" ? JSON.stringify(s[k]) : s[k])).join(",")
  );
  return [header, ...rows].join("\n");
}

// --- School Profile Modal ---
function showSchoolProfile(school) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay fade-in";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:560px;">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h3>School Profile</h3>
      <div><strong>Name:</strong> ${school.name}</div>
      <div><strong>Location:</strong> ${school.location}</div>
      <div><strong>Address:</strong> ${school.address || "-"}</div>
      <div><strong>TPR ID:</strong> ${school.tprId}</div>
      <div><strong>Status:</strong> ${getStatusBadge(school.status)}</div>
      <div><strong>Expiry:</strong> ${school.tprExpiry || "-"}</div>
      <div><strong>Contact:</strong> ${school.contactName || "-"}, ${school.contactEmail || "-"}, ${school.contactPhone || "-"}</div>
      <div><strong>Range:</strong> ${school.rangeAddress || "-"}</div>
      <div><strong>Assigned Instructors:</strong> ${(school.instructors||[]).join(", ") || "-"}</div>
      <div><strong>Notes:</strong> ${school.notes||"-"}</div>
      <div><strong>Change Log:</strong>
        <ul style="font-size:0.97em;">
          ${
            Array.isArray(school.changeLog) && school.changeLog.length
              ? school.changeLog.map(l =>
                  `<li>${l.date || ""}: ${l.change || ""} by ${l.by || "?"}</li>`
                ).join("")
              : "<li>No history yet</li>"
          }
        </ul>
      </div>
    </div>
  `;
  modal.querySelector(".modal-close").onclick = () => modal.remove();
  document.body.appendChild(modal);
}

export async function renderSchoolManagement(container = document.getElementById("app")) {
  if (!container) return;

  // ——- UI Loading State ——-
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:980px;margin:0 auto;">
      <h2 class="dash-head">🏫 School Management <span class="role-badge superadmin">Super Admin</span></h2>
      <div class="dashboard-card" style="margin-bottom:2.2em;">
        <h3>Add New School / Provider</h3>
        <form id="school-form" style="display:flex;flex-wrap:wrap;gap:1.2em;">
          <input name="name" type="text" placeholder="School/Provider Name" required style="flex:1 1 320px;">
          <input name="location" type="text" placeholder="Location (City, State)" required style="flex:1 1 180px;">
          <input name="address" type="text" placeholder="Full Address (Street, City, State)" style="flex:1 1 320px;">
          <input name="tprId" type="text" placeholder="TPR ID" required style="flex:1 1 120px;">
          <input name="status" type="text" placeholder="Status (Active/Pending)" style="flex:1 1 120px;">
          <input name="tprExpiry" type="date" placeholder="TPR Expiry" style="flex:1 1 140px;">
          <input name="rangeAddress" type="text" placeholder="Range Address (optional)" style="flex:1 1 220px;">
          <input name="contactName" type="text" placeholder="Contact Person" style="flex:1 1 140px;">
          <input name="contactEmail" type="email" placeholder="Contact Email" style="flex:1 1 180px;">
          <input name="contactPhone" type="tel" placeholder="Contact Phone" style="flex:1 1 120px;">
          <textarea name="notes" placeholder="Internal notes, reminders, audit flags..." style="flex:1 1 280px;"></textarea>
          <button class="btn primary" type="submit" style="flex:1 1 120px;min-width:140px;">Add School</button>
        </form>
      </div>
      <div class="dashboard-card">
        <h3>All Schools / Providers</h3>
        <input id="school-search" type="search" placeholder="Search by name, TPR, location, status..." style="width:260px;margin-bottom:8px;">
        <button class="btn outline" id="download-csv-btn" style="margin-bottom:8px;margin-left:14px;">Download CSV</button>
        <form id="bulk-action-form" style="margin-bottom:10px;">
          <button class="btn danger" id="bulk-delete-btn" type="button" disabled>Delete Selected</button>
        </form>
        <div id="schools-table-wrap"><div class="loading-spinner"></div></div>
        <button class="btn outline" id="back-to-superadmin-dashboard-btn" style="margin-top:2rem;">⬅ Dashboard</button>
      </div>
      <div id="edit-school-modal" style="display:none;"></div>
    </div>
  `;

  setupNavigation();
  
  // --- Fetch and Render Schools ---
  let schools = [];
  try {
    const snap = await db.collection("schools").orderBy("name").get();
    schools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    showToast("Failed to load schools.");
    schools = [];
  }

  // --- Render Table with Search/Filter ---
  function renderSchoolsTable(filter = "") {
    let filtered = schools;
    if (filter) {
      const f = filter.toLowerCase();
      filtered = schools.filter(s =>
        [s.name, s.tprId, s.location, s.status, s.address].some(val =>
          (val||"").toLowerCase().includes(f)
        )
      );
    }
    const tbody = filtered.length
      ? filtered.map(school => `
        <tr data-school-id="${school.id}">
          <td><input type="checkbox" class="school-select" value="${school.id}"></td>
          <td><a href="#" class="school-profile-link" data-school-id="${school.id}">${school.name || "-"}</a></td>
          <td>${school.location || "-"}</td>
          <td>${school.address || "-"}</td>
          <td>${school.tprId || "-"}</td>
          <td>${getStatusBadge(school.status)}</td>
          <td>${school.tprExpiry || "-"}</td>
          <td>${school.contactName || "-"}</td>
          <td>${school.contactEmail || "-"}</td>
          <td>${school.contactPhone || "-"}</td>
          <td>
            <button class="btn outline edit-school-btn" data-school-id="${school.id}">Edit</button>
            <button class="btn danger delete-school-btn" data-school-id="${school.id}">Delete</button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="11" style="text-align:center;">No schools found.</td></tr>`;
    document.getElementById("schools-table-wrap").innerHTML = `
      <table class="user-table" style="width:100%;margin-top:0.8em;">
        <thead>
          <tr>
            <th><input type="checkbox" id="select-all-schools"></th>
            <th>Name</th>
            <th>Location</th>
            <th>Address</th>
            <th>TPR ID</th>
            <th>Status</th>
            <th>Expiry</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${tbody}</tbody>
      </table>
    `;
    // Enable row click/view, edit/delete
    document.querySelectorAll(".school-profile-link").forEach(link => {
      link.onclick = e => {
        e.preventDefault();
        const schoolId = link.dataset.schoolId;
        const school = schools.find(s => s.id === schoolId);
        if (school) showSchoolProfile(school);
      };
    });
    document.querySelectorAll(".edit-school-btn").forEach(btn => {
      btn.onclick = async () => {
        const schoolId = btn.dataset.schoolId;
        const school = schools.find(s => s.id === schoolId);
        if (!school) return;
        const modal = document.getElementById("edit-school-modal");
        modal.style.display = "block";
        modal.innerHTML = `
          <div class="modal-overlay fade-in">
            <div class="modal-card" style="max-width:480px;">
              <button class="modal-close" aria-label="Close">&times;</button>
              <h3>Edit School / Provider</h3>
              <form id="edit-school-form">
                <input name="name" type="text" value="${school.name || ""}" required>
                <input name="location" type="text" value="${school.location || ""}" required>
                <input name="address" type="text" value="${school.address || ""}">
                <input name="tprId" type="text" value="${school.tprId || ""}" required>
                <input name="status" type="text" value="${school.status || ""}">
                <input name="tprExpiry" type="date" value="${school.tprExpiry || ""}">
                <input name="rangeAddress" type="text" value="${school.rangeAddress || ""}">
                <input name="contactName" type="text" value="${school.contactName || ""}">
                <input name="contactEmail" type="email" value="${school.contactEmail || ""}">
                <input name="contactPhone" type="tel" value="${school.contactPhone || ""}">
                <textarea name="notes" rows="2">${school.notes || ""}</textarea>
                <button class="btn primary" type="submit" style="margin-top:1em;">Save Changes</button>
              </form>
            </div>
          </div>
        `;
        // Close modal
        modal.querySelector(".modal-close").onclick = () => {
          modal.style.display = "none";
          modal.innerHTML = "";
        };
        // Edit submit
        modal.querySelector("#edit-school-form").onsubmit = async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const updates = {
            name: fd.get("name").trim(),
            location: fd.get("location").trim(),
            address: fd.get("address")?.trim() || "",
            tprId: fd.get("tprId").trim(),
            status: fd.get("status")?.trim() || "Active",
            tprExpiry: fd.get("tprExpiry") || "",
            rangeAddress: fd.get("rangeAddress")?.trim() || "",
            contactName: fd.get("contactName")?.trim() || "",
            contactEmail: fd.get("contactEmail")?.trim() || "",
            contactPhone: fd.get("contactPhone")?.trim() || "",
            notes: fd.get("notes")?.trim() || "",
            updatedAt: new Date().toISOString(),
            // Add to change log
            changeLog: [
              ...(school.changeLog || []),
              { date: new Date().toISOString(), change: "School updated", by: "Superadmin" }
            ]
          };
          try {
            await db.collection("schools").doc(schoolId).update(updates);
            showToast("School updated!");
            modal.style.display = "none";
            modal.innerHTML = "";
            // Reload schools
            schools = schools.map(s => s.id === schoolId ? { ...s, ...updates } : s);
            renderSchoolsTable(document.getElementById("school-search").value);
          } catch (e) {
            showToast("Failed to update school.");
          }
        };
      };
    });
    document.querySelectorAll(".delete-school-btn").forEach(btn => {
      btn.onclick = async () => {
        const schoolId = btn.dataset.schoolId;
        // Modal confirm (more modern than alert)
        if (!window.confirm("Are you sure you want to delete this school/provider? This action cannot be undone.")) return;
        try {
          await db.collection("schools").doc(schoolId).delete();
          showToast("School deleted.");
          schools = schools.filter(s => s.id !== schoolId);
          renderSchoolsTable(document.getElementById("school-search").value);
        } catch (e) {
          showToast("Failed to delete school.");
        }
      };
    });

    // Bulk select/delete
    const selectAll = document.getElementById("select-all-schools");
    const allBoxes = document.querySelectorAll(".school-select");
    selectAll.onclick = () => {
      allBoxes.forEach(box => box.checked = selectAll.checked);
      document.getElementById("bulk-delete-btn").disabled = !selectAll.checked && !Array.from(allBoxes).some(b=>b.checked);
    };
    allBoxes.forEach(box => {
      box.onchange = () => {
        document.getElementById("bulk-delete-btn").disabled = !Array.from(allBoxes).some(b=>b.checked);
      };
    });

    document.getElementById("bulk-delete-btn").onclick = async () => {
      const ids = Array.from(document.querySelectorAll(".school-select:checked")).map(b => b.value);
      if (!ids.length) return;
      if (!window.confirm(`Delete ${ids.length} schools? This cannot be undone.`)) return;
      try {
        for (const id of ids) {
          await db.collection("schools").doc(id).delete();
          schools = schools.filter(s => s.id !== id);
        }
        showToast(`${ids.length} school(s) deleted.`);
        renderSchoolsTable(document.getElementById("school-search").value);
      } catch (e) {
        showToast("Bulk delete failed.");
      }
    };
  }

  // --- Search ---
  document.getElementById("school-search").oninput = e => {
    renderSchoolsTable(e.target.value);
  };

  // --- Download CSV ---
  document.getElementById("download-csv-btn").onclick = () => {
    const csv = schoolsToCSV(schools);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cdl_schools.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // --- Add New School ---
  document.getElementById("school-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newSchool = {
      name: fd.get("name").trim(),
      location: fd.get("location").trim(),
      address: fd.get("address")?.trim() || "",
      tprId: fd.get("tprId").trim(),
      status: fd.get("status")?.trim() || "Active",
      tprExpiry: fd.get("tprExpiry") || "",
      rangeAddress: fd.get("rangeAddress")?.trim() || "",
      contactName: fd.get("contactName")?.trim() || "",
      contactEmail: fd.get("contactEmail")?.trim() || "",
      contactPhone: fd.get("contactPhone")?.trim() || "",
      notes: fd.get("notes")?.trim() || "",
      createdAt: new Date().toISOString(),
      changeLog: [
        { date: new Date().toISOString(), change: "School created", by: "Superadmin" }
      ]
    };
    try {
      await db.collection("schools").add(newSchool);
      showToast("School added!");
      // Refresh data
      const snap = await db.collection("schools").orderBy("name").get();
      schools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderSchoolsTable(document.getElementById("school-search").value);
      e.target.reset();
    } catch (e) {
      showToast("Failed to add school.");
    }
  };

  // --- Back to dashboard ---
  document.getElementById("back-to-superadmin-dashboard-btn").onclick = () => {
    renderSuperadminDashboard(container);
  };

  // --- First render ---
  renderSchoolsTable();
}