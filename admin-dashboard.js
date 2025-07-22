// admin-dashboard.js

import { db, auth } from "./firebase.js";
import {
  collection, query, where, getDocs, setDoc, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast, setupNavigation } from "./ui-helpers.js";
import { renderWelcome } from "./welcome.js";
import { renderDashboard } from "./dashboard-student.js"; // fallback for non-admins
import { renderAdminProfile } from "./admin-profile.js";   // to be modularized

let currentUserEmail = window.currentUserEmail || null;

export async function renderAdminDashboard(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // Defensive role fallback
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "admin";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "admin";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) {
    userData = {};
  }
  if (userRole !== "admin") {
    showToast("Access denied: Admin role required.");
    renderDashboard();
    return;
  }

  // --- Fetch All Users ---
  let allUsers = [];
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(doc => {
      const d = doc.data();
      allUsers.push({
        name: d.name || "User",
        email: d.email,
        role: d.role || "student",
        assignedInstructor: d.assignedInstructor || "",
        assignedCompany: d.assignedCompany || "",
        id: doc.id,
        profileProgress: d.profileProgress || 0,
        permitExpiry: d.permitExpiry || "",
        medCardExpiry: d.medCardExpiry || "",
        paymentStatus: d.paymentStatus || "",
        compliance: d.compliance || "",
      });
    });
  } catch (e) {
    allUsers = [];
    console.error("Admin user fetch error", e);
  }

  // --- Fetch Instructor List (for assignments) ---
  const instructorList = allUsers.filter(u => u.role === "instructor");
  // --- Fetch Company List (future feature, supports client companies) ---
  const companyList = Array.from(new Set(allUsers.map(u => u.assignedCompany).filter(Boolean)));

  // --- Render Admin Dashboard Layout ---
  container.innerHTML = `
    <h2 class="dash-head">Welcome, Admin! <span class="role-badge admin">Admin</span></h2>
    <button class="btn" id="edit-admin-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div class="dash-layout">
      <section class="dash-metrics">

        <div class="dashboard-card">
          <h3>👥 Manage Users</h3>
          <div style="margin-bottom:1em;">
            <label>Filter by Role:
              <select id="user-role-filter">
                <option value="">All</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Admins</option>
              </select>
            </label>
            <label style="margin-left:1em;">Company:
              <select id="user-company-filter">
                <option value="">All</option>
                ${companyList.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="user-table-scroll">
            <table class="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Assigned Instructor</th>
                  <th>Profile %</th>
                  <th>Permit Exp.</th>
                  <th>MedCard Exp.</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="user-table-body">
                ${allUsers.map(user => `
                  <tr data-user="${user.email}">
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>
                      <select class="role-select" data-user="${user.email}">
                        <option value="student" ${user.role === "student" ? "selected" : ""}>Student</option>
                        <option value="instructor" ${user.role === "instructor" ? "selected" : ""}>Instructor</option>
                        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                      </select>
                    </td>
                    <td>
                      <input type="text" class="company-input" data-user="${user.email}" value="${user.assignedCompany || ""}" placeholder="(Company)" style="width:100px;"/>
                    </td>
                    <td>
                      <select class="instructor-select" data-user="${user.email}">
                        <option value="">(None)</option>
                        ${instructorList.map(inst => `
                          <option value="${inst.email}" ${user.assignedInstructor === inst.email ? "selected" : ""}>${inst.name}</option>
                        `).join("")}
                      </select>
                    </td>
                    <td>${user.profileProgress || 0}%</td>
                    <td>${user.permitExpiry || ""}</td>
                    <td>${user.medCardExpiry || ""}</td>
                    <td>${user.paymentStatus || ""}</td>
                    <td>
                      <button class="btn outline btn-remove-user" data-user="${user.email}">Remove</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="dashboard-card">
          <h3>🏢 Manage Companies</h3>
          <p>Create, edit, and view all companies who send students to your school. (Coming soon)</p>
          <button class="btn" id="add-company-btn" style="margin-top:10px;">+ Add Company</button>
        </div>

        <div class="dashboard-card">
          <h3>📝 Reports & Batch Messaging</h3>
          <p>
            Download user data, filter for missing docs, and message all students or instructors with one click.<br>
            <em>(Coming soon: Download/export, batch reminders, activity logs...)</em>
          </p>
        </div>
      </section>
      <button class="rail-btn logout wide-logout" id="logout-btn" aria-label="Logout">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="12" height="16" rx="2" stroke="#ff8080" stroke-width="2"/>
          <path d="M17 15l4-3-4-3m4 3H10" stroke="#ff8080" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="label">Logout</span>
      </button>
    </div>
  `;

  setupNavigation();

  // --- View/Edit My Profile (Admin) ---
  container.querySelector("#edit-admin-profile-btn")?.addEventListener("click", () => {
    renderAdminProfile();
  });

  // --- Filter Logic (role/company) ---
  const roleFilter = container.querySelector("#user-role-filter");
  const companyFilter = container.querySelector("#user-company-filter");
  roleFilter?.addEventListener("change", filterUserTable);
  companyFilter?.addEventListener("change", filterUserTable);

  function filterUserTable() {
    const roleVal = roleFilter.value;
    const companyVal = companyFilter.value;
    const rows = container.querySelectorAll("#user-table-body tr");
    rows.forEach(row => {
      const roleCell = row.querySelector(".role-select")?.value || "";
      const companyCell = row.querySelector(".company-input")?.value || "";
      let show = true;
      if (roleVal && roleCell !== roleVal) show = false;
      if (companyVal && companyCell !== companyVal) show = false;
      row.style.display = show ? "" : "none";
    });
  }

  // --- Role Change Handler ---
  container.querySelectorAll(".role-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const userEmail = select.getAttribute("data-user");
      const newRole = select.value;
      try {
        await setDoc(doc(db, "users", userEmail), { role: newRole }, { merge: true });
        await setDoc(doc(db, "userRoles", userEmail), { role: newRole }, { merge: true });
        showToast(`Role updated for ${userEmail}`);
        renderAdminDashboard(container);
      } catch (err) {
        showToast("Failed to update role.");
      }
    });
  });

  // --- Company Assignment Handler ---
  container.querySelectorAll(".company-input").forEach(input => {
    input.addEventListener("blur", async () => {
      const userEmail = input.getAttribute("data-user");
      const newCompany = input.value.trim();
      try {
        await setDoc(doc(db, "users", userEmail), { assignedCompany: newCompany }, { merge: true });
        showToast(`Company assigned to ${userEmail}`);
      } catch (err) {
        showToast("Failed to assign company.");
      }
    });
  });

  // --- Instructor Assignment Handler ---
  container.querySelectorAll(".instructor-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const userEmail = select.getAttribute("data-user");
      const newInstructor = select.value;
      try {
        await setDoc(doc(db, "users", userEmail), { assignedInstructor: newInstructor }, { merge: true });
        showToast(`Instructor assigned to ${userEmail}`);
        renderAdminDashboard(container);
      } catch (err) {
        showToast("Failed to assign instructor.");
      }
    });
  });

  // --- Remove User Handler ---
  container.querySelectorAll(".btn-remove-user").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const userEmail = btn.getAttribute("data-user");
      if (!confirm(`Remove user: ${userEmail}? This cannot be undone.`)) return;
      try {
        await deleteDoc(doc(db, "users", userEmail));
        await deleteDoc(doc(db, "userRoles", userEmail));
        showToast(`User ${userEmail} removed`);
        renderAdminDashboard(container);
      } catch (err) {
        showToast("Failed to remove user.");
      }
    });
  });

  // --- Add Company Button (future) ---
  container.querySelector("#add-company-btn")?.addEventListener("click", () => {
    showToast("Add company: Coming soon!");
    // TODO: Open company creation modal/form
  });

  // --- Logout ---
  container.querySelector("#logout-btn")?.addEventListener("click", async () => {
    await auth.signOut();
    localStorage.clear();
    renderWelcome();
  });
}