// admin/admin-companies.js

import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast, setupNavigation } from "../ui-helpers.js";

// Named export for admin companies page
export async function renderAdminCompanies(container = document.getElementById("app")) {
  if (!container) return;

  // --- Fetch all companies (unique assignedCompany values) ---
  let companies = [];
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const seen = new Set();
    usersSnap.forEach(docSnap => {
      const c = docSnap.data().assignedCompany;
      if (c && !seen.has(c)) {
        companies.push({ name: c });
        seen.add(c);
      }
    });
  } catch (e) {
    companies = [];
    showToast("Failed to load companies.", 4200);
    console.error("Admin companies fetch error", e);
  }

  // --- Render company management UI ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in admin-companies-page" style="padding: 24px; max-width: 780px; margin: 0 auto;">
      <h2>🏢 Manage Companies</h2>
      <div class="dashboard-card" style="margin-bottom:1.3rem;">
        <form id="add-company-form" style="display:flex;gap:0.7em;margin-bottom:1.1em;">
          <input type="text" name="companyName" placeholder="New Company Name" required style="flex:1;min-width:160px;">
          <button class="btn" type="submit">+ Add Company</button>
        </form>
        <table class="company-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>Company Name</th>
              <th style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${companies.map(c => `
              <tr data-company="${c.name}">
                <td>
                  <input class="company-name-input" value="${c.name}" style="width:90%;padding:2px 7px;" />
                </td>
                <td>
                  <button class="btn outline btn-save-company" data-company="${c.name}">Save</button>
                  <button class="btn outline btn-remove-company" data-company="${c.name}" style="margin-left:6px;">Remove</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <button class="btn outline wide" id="back-to-admin-dashboard-btn" style="margin-top:1.3rem;">⬅ Back to Dashboard</button>
    </div>
  `;

  setupNavigation();

  // --- Add company handler (creates a "company" doc) ---
  container.querySelector("#add-company-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const companyName = form.companyName.value.trim();
    if (!companyName) return showToast("Enter a company name.");
    try {
      // Add to "companies" collection
      await addDoc(collection(db, "companies"), { name: companyName, createdAt: new Date().toISOString() });
      showToast("Company added!");
      renderAdminCompanies(container); // Refresh
    } catch (err) {
      showToast("Failed to add company.");
    }
  });

  // --- Save company (rename, future fields) ---
  container.querySelectorAll(".btn-save-company").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const oldName = btn.dataset.company;
      const row = btn.closest("tr");
      const input = row.querySelector(".company-name-input");
      const newName = input.value.trim();
      if (!newName) return showToast("Company name cannot be empty.");
      if (newName === oldName) return;
      try {
        // Find company doc by oldName
        const q = query(collection(db, "companies"), where("name", "==", oldName));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const companyDoc = snap.docs[0];
          await updateDoc(companyDoc.ref, { name: newName });
          showToast("Company updated.");
          renderAdminCompanies(container);
        }
      } catch (err) {
        showToast("Failed to update company.");
      }
    });
  });

  // --- Remove company (deletes from companies collection) ---
  container.querySelectorAll(".btn-remove-company").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const name = btn.dataset.company;
      if (!confirm(`Remove company "${name}"? This cannot be undone.`)) return;
      try {
        const q = query(collection(db, "companies"), where("name", "==", name));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await deleteDoc(doc(db, "companies", snap.docs[0].id));
          showToast(`Company "${name}" removed.`);
          renderAdminCompanies(container);
        }
      } catch (err) {
        showToast("Failed to remove company.");
      }
    });
  });

  // --- Back to Dashboard ---
  container.querySelector("#back-to-admin-dashboard-btn")?.addEventListener("click", () => {
    import("./admin-dashboard.js").then(mod => mod.renderAdminDashboard());
  });
}