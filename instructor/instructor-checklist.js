// instructor/instructor-checklist.js

import { db } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast } from '../ui-helpers.js';

// --- Named export for Instructor Checklist Modal ---
export async function renderChecklistReviewForInstructor(studentEmail, container = document.body) {
  if (!studentEmail) return showToast("No student selected.");

  // Fetch student profile and progress
  let studentData = {}, eldtData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", studentEmail));
    const snap = await getDocs(q);
    if (!snap.empty) studentData = snap.docs[0].data();
    const progressRef = doc(db, "eldtProgress", studentEmail);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) eldtData = progressSnap.data();
  } catch (e) {
    showToast("Checklist fetch error.");
  }

  // Render modal
  let modal = document.createElement("div");
  modal.className = "modal-overlay fade-in";
  modal.innerHTML = `
    <div class="modal-card checklist-modal">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>Review Student Checklist</h2>
      <div class="profile-row"><strong>Name:</strong> ${studentData.name || "Unknown"}</div>
      <div class="profile-row"><strong>Email:</strong> ${studentData.email}</div>
      <form id="checklist-review-form" style="display:flex;flex-direction:column;gap:1em;">
        <label>
          <input type="checkbox" name="profileVerified" ${eldtData.profileVerified ? "checked" : ""} />
          Profile Approved
        </label>
        <label>
          <input type="checkbox" name="permitVerified" ${eldtData.permitVerified ? "checked" : ""} />
          Permit Verified
        </label>
        <label>
          <input type="checkbox" name="vehicleVerified" ${eldtData.vehicleVerified ? "checked" : ""} />
          Vehicle Verified
        </label>
        <label>
          <input type="checkbox" name="walkthroughReviewed" ${eldtData.walkthroughReviewed ? "checked" : ""} />
          Walkthrough Reviewed
        </label>
        <label>
          <input type="checkbox" name="finalStepCompleted" ${eldtData.finalStepCompleted ? "checked" : ""} />
          <strong>Final Step:</strong> In-person walkthrough &amp; driving portion completed
        </label>
        <label>
          Instructor Notes:
          <textarea name="instructorNotes" rows="2">${eldtData.instructorNotes || ""}</textarea>
        </label>
        <button type="submit" class="btn primary wide">Save Checklist Review</button>
        <button type="button" class="btn outline" id="close-checklist-modal">Close</button>
      </form>
    </div>
  `;
  // Remove previous modals if any
  document.querySelectorAll(".modal-overlay").forEach(el => el.remove());
  document.body.appendChild(modal);

  // Save checklist
  modal.querySelector("#checklist-review-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await updateDoc(doc(db, "eldtProgress", studentEmail), {
        profileVerified: !!fd.get("profileVerified"),
        permitVerified: !!fd.get("permitVerified"),
        vehicleVerified: !!fd.get("vehicleVerified"),
        walkthroughReviewed: !!fd.get("walkthroughReviewed"),
        finalStepCompleted: !!fd.get("finalStepCompleted"),
        instructorNotes: fd.get("instructorNotes") || ""
      });
      showToast("Checklist review saved.");
      modal.remove();
    } catch (err) {
      showToast("Failed to save checklist.");
    }
  };

  // Modal close handlers
  modal.querySelector(".modal-close")?.addEventListener("click", () => modal.remove());
  modal.querySelector("#close-checklist-modal")?.addEventListener("click", () => modal.remove());

  // Body scroll lock while modal is open
  document.body.style.overflow = "hidden";
  modal.addEventListener("transitionend", () => {
    if (!document.body.contains(modal)) {
      document.body.style.overflow = "";
    }
  });
}