// instructor/student-profile.js

import { db } from '../firebase.js';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  showToast,
  setupNavigation,
  verifyStudentProfile,
  verifyStudentPermit,
  verifyStudentVehicle,
  reviewStudentWalkthrough
} from '../ui-helpers.js';

import { renderInstructorDashboard } from './instructor-dashboard.js';
import { renderChecklistReviewForInstructor } from './instructor-checklist.js';

export async function renderStudentProfileForInstructor(studentEmail, container = document.getElementById("app")) {
  if (!container) return;
  if (!studentEmail) {
    showToast("No student selected.", 3000, "error");
    renderInstructorDashboard();
    return;
  }

  // Fetch student profile
  let userData = {};
  try {
    const userRef = doc(db, "users", studentEmail);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      userData = userSnap.data();
    } else {
      showToast("Student profile not found.", 4000, "error");
      renderInstructorDashboard();
      return;
    }
  } catch (e) {
    showToast("Error loading profile.", 4000, "error");
    renderInstructorDashboard();
    return;
  }

  // Fetch instructor review data (checklist/milestones)
  let eldtProgress = {};
  try {
    const progressRef = doc(db, "eldtProgress", studentEmail);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
      eldtProgress = progressSnap.data();
    }
  } catch (e) {
    eldtProgress = {};
  }

  // Prepare profile fields
  const {
    name = "",
    dob = "",
    profilePicUrl = "",
    cdlClass = "",
    endorsements = [],
    restrictions = [],
    experience = "",
    prevEmployer = "",
    assignedCompany = "",
    assignedInstructor = "",
    cdlPermit = "",
    permitPhotoUrl = "",
    permitExpiry = "",
    driverLicenseUrl = "",
    licenseExpiry = "",
    medicalCardUrl = "",
    medCardExpiry = "",
    vehicleQualified = "",
    truckPlateUrl = "",
    trailerPlateUrl = "",
    emergencyName = "",
    emergencyPhone = "",
    emergencyRelation = "",
    waiverSigned = false,
    waiverSignature = "",
    course = "",
    schedulePref = "",
    scheduleNotes = "",
    paymentStatus = "",
    paymentProofUrl = "",
    accommodation = "",
    studentNotes = "",
    profileProgress = 0
  } = userData;

  // UI Render
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:540px;margin:0 auto;">
      <h2>
        👤 Student Profile
        <span class="role-badge student">Student</span>
        <span class="role-badge instructor-view">Instructor View</span>
      </h2>
      <div class="profile-meta" style="display:flex;gap:1.4rem;align-items:center;margin-bottom:1.4rem;">
        ${profilePicUrl
          ? `<img src="${profilePicUrl}" alt="Profile" style="width:64px;height:64px;border-radius:13px;object-fit:cover;">`
          : `<div style="width:64px;height:64px;border-radius:13px;background:#292b49;display:flex;align-items:center;justify-content:center;font-size:2em;color:#b48aff;">${(name||"?").charAt(0)}</div>`
        }
        <div>
          <div style="font-size:1.18em;font-weight:600;">${name}</div>
          <div style="color:#979ad1;">${cdlClass ? `CDL Class: <b>${cdlClass}</b>` : "No class set"}</div>
          <div style="color:#aaa;font-size:0.96em;">${studentEmail}</div>
        </div>
      </div>
      <div class="progress-bar" style="margin-bottom:1.2rem;">
        <div class="progress" style="width:${profileProgress || 0}%"></div>
        <span class="progress-label">${profileProgress || 0}% Complete</span>
      </div>
      <div class="profile-details glass-card" style="padding:1.2rem;">
        <div><strong>DOB:</strong> ${dob ? dob : "-"}</div>
        <div><strong>Experience:</strong> ${experience ? experience : "-"}</div>
        <div><strong>Endorsements:</strong> ${endorsements.length ? endorsements.join(", ") : "-"}</div>
        <div><strong>Restrictions:</strong> ${restrictions.length ? restrictions.join(", ") : "-"}</div>
        <div><strong>CDL Permit:</strong> ${cdlPermit === "yes" ? "✔️ Yes" : (cdlPermit === "no" ? "❌ No" : "-")}</div>
        <div>
          <strong>Permit Photo:</strong>
          ${permitPhotoUrl ? `<a href="${permitPhotoUrl}" target="_blank" style="color:#b48aff;text-decoration:underline;">View</a>` : "-"}
        </div>
        <div><strong>Permit Expiry:</strong> ${permitExpiry || "-"}</div>
        <div>
          <strong>License Upload:</strong>
          ${driverLicenseUrl ? `<a href="${driverLicenseUrl}" target="_blank" style="color:#b48aff;text-decoration:underline;">View</a>` : "-"}
        </div>
        <div><strong>License Expiry:</strong> ${licenseExpiry || "-"}</div>
        <div>
          <strong>Medical Card:</strong>
          ${medicalCardUrl ? `<a href="${medicalCardUrl}" target="_blank" style="color:#b48aff;text-decoration:underline;">View</a>` : "-"}
        </div>
        <div><strong>Medical Card Expiry:</strong> ${medCardExpiry || "-"}</div>
        <div>
          <strong>Vehicle Qualified:</strong> ${vehicleQualified === "yes" ? "✔️ Yes" : (vehicleQualified === "no" ? "❌ No" : "-")}
        </div>
        <div>
          <strong>Truck Plate:</strong>
          ${truckPlateUrl ? `<a href="${truckPlateUrl}" target="_blank" style="color:#b48aff;text-decoration:underline;">View</a>` : "-"}
        </div>
        <div>
          <strong>Trailer Plate:</strong>
          ${trailerPlateUrl ? `<a href="${trailerPlateUrl}" target="_blank" style="color:#b48aff;text-decoration:underline;">View</a>` : "-"}
        </div>
        <div><strong>Emergency Contact:</strong> ${emergencyName || "-"} (${emergencyRelation || ""})<br>
        <span style="color:#b48aff;">${emergencyPhone || ""}</span></div>
        <div><strong>Waiver Signed:</strong> ${waiverSigned ? "✔️" : "❌"} (${waiverSignature || "-"})</div>
        <div><strong>Notes:</strong> ${studentNotes || "-"}</div>
      </div>
      <div class="glass-card" style="margin-top:1.2rem; padding:1.2rem;">
        <strong>Instructor Actions</strong>
        <div style="margin:0.5em 0;">
          <button class="btn outline" id="verify-profile-btn">✔️ Approve Profile</button>
          <button class="btn outline" id="verify-permit-btn">✔️ Approve Permit</button>
          <button class="btn outline" id="verify-vehicle-btn">✔️ Approve Vehicle</button>
          <button class="btn outline" id="review-walkthrough-btn">👀 Review Walkthrough</button>
        </div>
        <div style="margin:0.7em 0 0.2em 0;">
          <textarea id="instructor-note" style="width:100%;min-height:50px;" placeholder="Add a note for this student..."></textarea>
          <button class="btn" id="save-note-btn" style="margin-top:6px;">💾 Save Note</button>
        </div>
        <div>
          <button class="btn" id="back-to-dashboard-btn" style="margin-top:14px;">⬅ Back to Dashboard</button>
        </div>
      </div>
      <div class="glass-card" style="margin-top:1.1rem;">
        <button class="btn outline" id="checklist-review-btn">📋 Review Full Checklist</button>
      </div>
    </div>
  `;

  // Navigation/event handlers
  setupNavigation();

  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderInstructorDashboard();
  });

  // Approve actions
  document.getElementById("verify-profile-btn")?.addEventListener("click", async () => {
    await verifyStudentProfile(studentEmail, localStorage.getItem("currentUserEmail"));
    showToast("Profile verified!", 2300, "success");
  });
  document.getElementById("verify-permit-btn")?.addEventListener("click", async () => {
    await verifyStudentPermit(studentEmail, localStorage.getItem("currentUserEmail"));
    showToast("Permit verified!", 2300, "success");
  });
  document.getElementById("verify-vehicle-btn")?.addEventListener("click", async () => {
    await verifyStudentVehicle(studentEmail, localStorage.getItem("currentUserEmail"));
    showToast("Vehicle verified!", 2300, "success");
  });
  document.getElementById("review-walkthrough-btn")?.addEventListener("click", async () => {
    await reviewStudentWalkthrough(studentEmail, localStorage.getItem("currentUserEmail"));
    showToast("Walkthrough reviewed!", 2300, "success");
  });

  // Save instructor note
  document.getElementById("save-note-btn")?.addEventListener("click", async () => {
    const note = document.getElementById("instructor-note").value.trim();
    if (!note) {
      showToast("Note is empty.", 1700, "error");
      return;
    }
    // Save note to a subcollection for audit/history
    const notesRef = collection(doc(db, "users", studentEmail), "instructorNotes");
    await addDoc(notesRef, {
      note,
      by: localStorage.getItem("currentUserEmail"),
      at: serverTimestamp()
    });
    showToast("Note saved.", 1800, "success");
    document.getElementById("instructor-note").value = "";
  });

  // Checklist review
  document.getElementById("checklist-review-btn")?.addEventListener("click", () => {
    renderChecklistReviewForInstructor(studentEmail, container);
  });
}