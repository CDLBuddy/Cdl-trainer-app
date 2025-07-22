// profile.js

import { db, storage } from './firebase.js';
import {
  showToast,
  setupNavigation,
  markStudentProfileComplete,
  markStudentPermitUploaded,
  markStudentVehicleUploaded
} from './ui-helpers.js';

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// Only import renderDashboard if you have modularized it!
import { renderDashboard } from './dashboard-student.js';

// Use global currentUserEmail, or refactor if needed
let currentUserEmail = window.currentUserEmail || null;

export async function renderProfile(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    window.location.reload(); // fallback, avoids circular import!
    return;
  }

  // Fetch user data
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
    else { showToast("Profile not found."); window.location.reload(); return; }
  } catch { userData = {}; }

  // Fields & defaults
  const {
    name = "", dob = "", profilePicUrl = "",
    cdlClass = "", endorsements = [], restrictions = [],
    experience = "", prevEmployer = "", assignedCompany = "",
    assignedInstructor = "", cdlPermit = "", permitPhotoUrl = "",
    permitExpiry = "", driverLicenseUrl = "", licenseExpiry = "",
    medicalCardUrl = "", medCardExpiry = "",
    vehicleQualified = "", truckPlateUrl = "", trailerPlateUrl = "",
    emergencyName = "", emergencyPhone = "", emergencyRelation = "",
    waiverSigned = false, waiverSignature = "",
    course = "", schedulePref = "", scheduleNotes = "",
    paymentStatus = "", paymentProofUrl = "",
    accommodation = "", studentNotes = "",
    profileProgress = 0
  } = userData;

  // Endorsement & restriction options
  const endorsementOptions = [
    { val: "H", label: "Hazmat (H)" },
    { val: "N", label: "Tanker (N)" },
    { val: "T", label: "Double/Triple Trailers (T)" },
    { val: "P", label: "Passenger (P)" },
    { val: "S", label: "School Bus (S)" },
    { val: "AirBrakes", label: "Air Brakes" },
    { val: "Other", label: "Other" }
  ];
  const restrictionOptions = [
    { val: "auto", label: "Remove Automatic Restriction" },
    { val: "airbrake", label: "Remove Air Brake Restriction" },
    { val: "refresher", label: "One-day Refresher" },
    { val: "roadtest", label: "Road Test Prep" }
  ];

  // Profile completion progress
  function calcProgress(fd) {
    let total = 15, filled = 0;
    if (fd.get("name")) filled++;
    if (fd.get("dob")) filled++;
    if (profilePicUrl || fd.get("profilePic")?.size) filled++;
    if (fd.get("cdlClass")) filled++;
    if (fd.getAll("endorsements[]").length) filled++;
    if (fd.getAll("restrictions[]").length) filled++;
    if (fd.get("experience")) filled++;
    if (fd.get("cdlPermit")) filled++;
    if (permitPhotoUrl || fd.get("permitPhoto")?.size) filled++;
    if (driverLicenseUrl || fd.get("driverLicense")?.size) filled++;
    if (medicalCardUrl || fd.get("medicalCard")?.size) filled++;
    if (vehicleQualified) filled++;
    if (truckPlateUrl || fd.get("truckPlate")?.size) filled++;
    if (emergencyName && emergencyPhone) filled++;
    if (fd.get("waiver")) filled++;
    return Math.round((filled / total) * 100);
  }

  // HTML
  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width:480px;margin:0 auto;">
      <h2>👤 Student Profile <span class="role-badge student">Student</span></h2>
      <div class="progress-bar" style="margin-bottom:1.4rem;">
        <div class="progress" style="width:${profileProgress||0}%;"></div>
        <span class="progress-label">${profileProgress||0}% Complete</span>
      </div>
      <form id="profile-form" autocomplete="off" style="display:flex;flex-direction:column;gap:1.1rem;">
        <!-- all your input fields as provided... -->
        <label>Name: <input type="text" name="name" value="${name}" required /></label>
        <label>Date of Birth: <input type="date" name="dob" value="${dob}" required /></label>
        <label>Profile Picture: <input type="file" name="profilePic" accept="image/*" />${profilePicUrl ? `<img src="${profilePicUrl}" style="max-width:90px;border-radius:10px;display:block;margin:7px 0;">` : ""}</label>
        <label>CDL Class:
          <select name="cdlClass" required>
            <option value="">Select</option>
            <option value="A" ${cdlClass==="A"?"selected":""}>Class A</option>
            <option value="B" ${cdlClass==="B"?"selected":""}>Class B</option>
            <option value="C" ${cdlClass==="C"?"selected":""}>Class C</option>
          </select>
        </label>
        <label>Endorsements:
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${endorsementOptions.map(opt => `
              <label style="font-weight:400;">
                <input type="checkbox" name="endorsements[]" value="${opt.val}" ${endorsements.includes(opt.val) ? "checked" : ""}/> ${opt.label}
              </label>
            `).join("")}
          </div>
        </label>
        <label>Restrictions/Upgrades:
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${restrictionOptions.map(opt => `
              <label style="font-weight:400;">
                <input type="checkbox" name="restrictions[]" value="${opt.val}" ${restrictions.includes(opt.val) ? "checked" : ""}/> ${opt.label}
              </label>
            `).join("")}
          </div>
        </label>
        <label>Experience:
          <select name="experience" required>
            <option value="">Select</option>
            <option value="none" ${experience==="none"?"selected":""}>No experience</option>
            <option value="1-2" ${experience==="1-2"?"selected":""}>1–2 years</option>
            <option value="3-5" ${experience==="3-5"?"selected":""}>3–5 years</option>
            <option value="6-10" ${experience==="6-10"?"selected":""}>6–10 years</option>
            <option value="10+" ${experience==="10+"?"selected":""}>10+ years</option>
          </select>
        </label>
        <label>Previous Employer: <input type="text" name="prevEmployer" value="${prevEmployer}" /></label>
        <label>Assigned Company: <input type="text" name="assignedCompany" value="${assignedCompany}" /></label>
        <label>Assigned Instructor: <input type="text" name="assignedInstructor" value="${assignedInstructor}" /></label>
        <label>CDL Permit?
          <select name="cdlPermit" required>
            <option value="">Select</option>
            <option value="yes" ${cdlPermit==="yes"?"selected":""}>Yes</option>
            <option value="no" ${cdlPermit==="no"?"selected":""}>No</option>
          </select>
        </label>
        <div id="permit-photo-section" style="${cdlPermit==="yes"?"":"display:none"}">
          <label>Permit Expiry: <input type="date" name="permitExpiry" value="${permitExpiry||""}" /></label>
          <label>Permit Photo: <input type="file" name="permitPhoto" accept="image/*" />${permitPhotoUrl ? `<img src="${permitPhotoUrl}" style="max-width:70px;margin:7px 0;">` : ""}</label>
        </div>
        <label>Driver License: <input type="file" name="driverLicense" accept="image/*,application/pdf" />${driverLicenseUrl ? `<a href="${driverLicenseUrl}" target="_blank">View</a>` : ""}</label>
        <label>License Expiry: <input type="date" name="licenseExpiry" value="${licenseExpiry||""}" /></label>
        <label>Medical Card: <input type="file" name="medicalCard" accept="image/*,application/pdf" />${medicalCardUrl ? `<a href="${medicalCardUrl}" target="_blank">View</a>` : ""}</label>
        <label>Medical Card Expiry: <input type="date" name="medCardExpiry" value="${medCardExpiry||""}" /></label>
        <label>Does your training/testing vehicle qualify?
          <select name="vehicleQualified" required>
            <option value="">Select</option>
            <option value="yes" ${vehicleQualified==="yes"?"selected":""}>Yes</option>
            <option value="no" ${vehicleQualified==="no"?"selected":""}>No</option>
          </select>
        </label>
        <div id="vehicle-photos-section" style="${vehicleQualified==="yes"?"":"display:none"}">
          <label>Truck Data Plate: <input type="file" name="truckPlate" accept="image/*" />${truckPlateUrl ? `<img src="${truckPlateUrl}" style="max-width:70px;margin:7px 0;">` : ""}</label>
          <label>Trailer Data Plate: <input type="file" name="trailerPlate" accept="image/*" />${trailerPlateUrl ? `<img src="${trailerPlateUrl}" style="max-width:70px;margin:7px 0;">` : ""}</label>
        </div>
        <label>Emergency Contact Name: <input type="text" name="emergencyName" value="${emergencyName}" /></label>
        <label>Emergency Contact Phone: <input type="tel" name="emergencyPhone" value="${emergencyPhone}" /></label>
        <label>Relationship: <input type="text" name="emergencyRelation" value="${emergencyRelation}" /></label>
        <label>Course Selected: <input type="text" name="course" value="${course}" /></label>
        <label>Schedule Preference: <input type="text" name="schedulePref" value="${schedulePref}" /></label>
        <label>Scheduling Notes: <textarea name="scheduleNotes">${scheduleNotes||""}</textarea></label>
        <label>Payment Status:
          <select name="paymentStatus">
            <option value="">Select</option>
            <option value="paid" ${paymentStatus==="paid"?"selected":""}>Paid in Full</option>
            <option value="deposit" ${paymentStatus==="deposit"?"selected":""}>Deposit Paid</option>
            <option value="balance" ${paymentStatus==="balance"?"selected":""}>Balance Due</option>
          </select>
        </label>
        <label>Payment Proof: <input type="file" name="paymentProof" accept="image/*,application/pdf" />${paymentProofUrl ? `<a href="${paymentProofUrl}" target="_blank">View</a>` : ""}</label>
        <label>Accommodation Requests: <textarea name="accommodation">${accommodation||""}</textarea></label>
        <label>Student Notes: <textarea name="studentNotes">${studentNotes||""}</textarea></label>
        <label><input type="checkbox" name="waiver" ${waiverSigned ? "checked" : ""} required /> I have read and agree to the liability waiver.</label>
        <label>Digital Signature: <input type="text" name="waiverSignature" value="${waiverSignature||""}" /></label>
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-dashboard-btn" type="button">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // Show/hide dynamic sections
  container.querySelector('select[name="cdlPermit"]').addEventListener('change', function() {
    document.getElementById('permit-photo-section').style.display = this.value === "yes" ? "" : "none";
  });
  container.querySelector('select[name="vehicleQualified"]').addEventListener('change', function() {
    document.getElementById('vehicle-photos-section').style.display = this.value === "yes" ? "" : "none";
  });

  // Back to dashboard
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  // --- FILE UPLOAD HELPERS (with checklist marking) ---
  async function handleFileInput(inputName, storagePath, updateField, checklistFn = null) {
    const input = container.querySelector(`input[name="${inputName}"]`);
    if (!input) return;
    input.addEventListener("change", async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const storageRef = ref(storage, `${storagePath}/${currentUserEmail}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        // Update Firestore
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), { [updateField]: downloadURL });
          showToast(`${updateField.replace(/Url$/,"")} uploaded!`);
          if (typeof checklistFn === "function") await checklistFn(currentUserEmail);
          renderProfile(container); // refresh to show
        }
      } catch (err) {
        showToast(`Failed to upload ${updateField}: ` + err.message);
      }
    });
  }

  // All uploads with checklist logic
  handleFileInput("profilePic", "profilePics", "profilePicUrl", markStudentProfileComplete);
  handleFileInput("permitPhoto", "permits", "permitPhotoUrl", markStudentPermitUploaded);
  handleFileInput("driverLicense", "licenses", "driverLicenseUrl");
  handleFileInput("medicalCard", "medCards", "medicalCardUrl");

  // Data plates (when both uploaded, mark vehicle uploaded)
  let truckUploaded = !!truckPlateUrl, trailerUploaded = !!trailerPlateUrl;
  handleFileInput("truckPlate", "vehicle-plates", "truckPlateUrl", async (email) => {
    truckUploaded = true;
    if (truckUploaded && trailerUploaded) await markStudentVehicleUploaded(email);
  });
  handleFileInput("trailerPlate", "vehicle-plates", "trailerPlateUrl", async (email) => {
    trailerUploaded = true;
    if (truckUploaded && trailerUploaded) await markStudentVehicleUploaded(email);
  });
  handleFileInput("paymentProof", "payments", "paymentProofUrl");

  // --- SAVE PROFILE HANDLER ---
  container.querySelector("#profile-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const updateObj = {
      name: fd.get("name"), dob: fd.get("dob"), cdlClass: fd.get("cdlClass"),
      endorsements: fd.getAll("endorsements[]"),
      restrictions: fd.getAll("restrictions[]"),
      experience: fd.get("experience"),
      prevEmployer: fd.get("prevEmployer"), assignedCompany: fd.get("assignedCompany"),
      assignedInstructor: fd.get("assignedInstructor"),
      cdlPermit: fd.get("cdlPermit"), permitExpiry: fd.get("permitExpiry"),
      licenseExpiry: fd.get("licenseExpiry"), medCardExpiry: fd.get("medCardExpiry"),
      vehicleQualified: fd.get("vehicleQualified"),
      emergencyName: fd.get("emergencyName"), emergencyPhone: fd.get("emergencyPhone"),
      emergencyRelation: fd.get("emergencyRelation"),
      course: fd.get("course"), schedulePref: fd.get("schedulePref"),
      scheduleNotes: fd.get("scheduleNotes"), paymentStatus: fd.get("paymentStatus"),
      accommodation: fd.get("accommodation"), studentNotes: fd.get("studentNotes"),
      waiverSigned: !!fd.get("waiver"), waiverSignature: fd.get("waiverSignature"),
      profileProgress: calcProgress(fd)
    };

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, updateObj);
        await markStudentProfileComplete(currentUserEmail);
        showToast("✅ Profile saved!");
        renderProfile(container);
      } else throw new Error("User document not found.");
    } catch (err) {
      showToast("❌ Error saving: " + err.message);
    }
  };

  setupNavigation();
}