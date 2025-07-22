// student/profile.js

import { db, storage } from '../firebase.js';
import {
  showToast,
  setupNavigation,
  markStudentProfileComplete,
  markStudentPermitUploaded,
  markStudentVehicleUploaded
} from '../ui-helpers.js';

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

import { renderStudentDashboard } from './student-dashboard.js';

let currentUserEmail = window.currentUserEmail || null;

export async function renderProfile(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    window.location.reload();
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

  // Options
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

  // Profile completion
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

  // --- HTML ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width:480px;margin:0 auto;">
      <h2>👤 Student Profile <span class="role-badge student">Student</span></h2>
      <div class="progress-bar" style="margin-bottom:1.4rem;">
        <div class="progress" style="width:${profileProgress||0}%;"></div>
        <span class="progress-label">${profileProgress||0}% Complete</span>
      </div>
      <form id="profile-form" autocomplete="off" style="display:flex;flex-direction:column;gap:1.1rem;">
        <!-- ... all your input fields ... (omitted for brevity; see your code above) ... -->
        <!-- ... -->
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-dashboard-btn" type="button">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // Show/hide sections
  container.querySelector('select[name="cdlPermit"]').addEventListener('change', function() {
    document.getElementById('permit-photo-section').style.display = this.value === "yes" ? "" : "none";
  });
  container.querySelector('select[name="vehicleQualified"]').addEventListener('change', function() {
    document.getElementById('vehicle-photos-section').style.display = this.value === "yes" ? "" : "none";
  });

  // Back to dashboard
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderStudentDashboard();
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