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
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

import { renderStudentDashboard } from './student-dashboard.js';

let currentUserEmail = window.currentUserEmail ||
  (window.auth?.currentUser?.email) ||
  localStorage.getItem("currentUserEmail") ||
  null;

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

  // Profile completion calculation
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

  // --------- FULL FORM SECTION STARTS HERE ----------
  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width:480px;margin:0 auto;">
      <h2>👤 Student Profile <span class="role-badge student">Student</span></h2>
      <div class="progress-bar" style="margin-bottom:1.4rem;">
        <div class="progress" style="width:${profileProgress||0}%;"></div>
        <span class="progress-label">${profileProgress||0}% Complete</span>
      </div>
      <form id="profile-form" autocomplete="off" style="display:flex;flex-direction:column;gap:1.1rem;">
        <label>Name:
          <input name="name" type="text" required value="${name}" />
        </label>
        <label>Date of Birth:
          <input name="dob" type="date" required value="${dob}" />
        </label>
        <label>Profile Picture:
          <input name="profilePic" type="file" accept="image/*" />
          ${profilePicUrl ? `<img src="${profilePicUrl}" alt="Profile Picture" style="max-width:70px; margin-top:5px; border-radius:9px;">` : ""}
        </label>
        <label>CDL Class:
          <select name="cdlClass" required>
            <option value="">Select</option>
            <option value="A" ${cdlClass === "A" ? "selected" : ""}>Class A</option>
            <option value="B" ${cdlClass === "B" ? "selected" : ""}>Class B</option>
            <option value="C" ${cdlClass === "C" ? "selected" : ""}>Class C</option>
          </select>
        </label>
        <label>Endorsements:<br>
          ${endorsementOptions.map(opt =>
            `<label style="margin-right:1em;">
              <input type="checkbox" name="endorsements[]" value="${opt.val}" ${endorsements.includes(opt.val) ? "checked" : ""}> ${opt.label}
            </label>`
          ).join("")}
        </label>
        <label>Restrictions:<br>
          ${restrictionOptions.map(opt =>
            `<label style="margin-right:1em;">
              <input type="checkbox" name="restrictions[]" value="${opt.val}" ${restrictions.includes(opt.val) ? "checked" : ""}> ${opt.label}
            </label>`
          ).join("")}
        </label>
        <label>Experience:
          <select name="experience" required>
            <option value="">Select</option>
            <option value="none" ${experience === "none" ? "selected" : ""}>No Experience</option>
            <option value="1-2" ${experience === "1-2" ? "selected" : ""}>1–2 Years</option>
            <option value="3-5" ${experience === "3-5" ? "selected" : ""}>3–5 Years</option>
            <option value="6-10" ${experience === "6-10" ? "selected" : ""}>6–10 Years</option>
            <option value="10+" ${experience === "10+" ? "selected" : ""}>10+ Years</option>
          </select>
        </label>
        <label>Previous Employer:
          <input name="prevEmployer" type="text" value="${prevEmployer}" />
        </label>
        <label>Assigned Company:
          <input name="assignedCompany" type="text" value="${assignedCompany}" />
        </label>
        <label>Assigned Instructor:
          <input name="assignedInstructor" type="text" value="${assignedInstructor}" />
        </label>
        <label>CDL Permit?
          <select name="cdlPermit" required>
            <option value="">Select</option>
            <option value="yes" ${cdlPermit === "yes" ? "selected" : ""}>Yes</option>
            <option value="no" ${cdlPermit === "no" ? "selected" : ""}>No</option>
          </select>
        </label>
        <div id="permit-photo-section" style="display:${cdlPermit === "yes" ? "" : "none"};">
          <label>Permit Photo:
            <input name="permitPhoto" type="file" accept="image/*" />
            ${permitPhotoUrl ? `<img src="${permitPhotoUrl}" alt="Permit Photo" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ""}
          </label>
          <label>Permit Expiry:
            <input name="permitExpiry" type="date" value="${permitExpiry}" />
          </label>
        </div>
        <label>Driver License Upload:
          <input name="driverLicense" type="file" accept="image/*" />
          ${driverLicenseUrl ? `<img src="${driverLicenseUrl}" alt="License" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ""}
        </label>
        <label>License Expiry:
          <input name="licenseExpiry" type="date" value="${licenseExpiry}" />
        </label>
        <label>Medical Card Upload:
          <input name="medicalCard" type="file" accept="image/*" />
          ${medicalCardUrl ? `<img src="${medicalCardUrl}" alt="Medical Card" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ""}
        </label>
        <label>Medical Card Expiry:
          <input name="medCardExpiry" type="date" value="${medCardExpiry}" />
        </label>
        <label>Is Your Vehicle Qualified?
          <select name="vehicleQualified" required>
            <option value="">Select</option>
            <option value="yes" ${vehicleQualified === "yes" ? "selected" : ""}>Yes</option>
            <option value="no" ${vehicleQualified === "no" ? "selected" : ""}>No</option>
          </select>
        </label>
        <div id="vehicle-photos-section" style="display:${vehicleQualified === "yes" ? "" : "none"};">
          <label>Truck Data Plate:
            <input name="truckPlate" type="file" accept="image/*" />
            ${truckPlateUrl ? `<img src="${truckPlateUrl}" alt="Truck Plate" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ""}
          </label>
          <label>Trailer Data Plate:
            <input name="trailerPlate" type="file" accept="image/*" />
            ${trailerPlateUrl ? `<img src="${trailerPlateUrl}" alt="Trailer Plate" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ""}
          </label>
        </div>
        <label>Emergency Contact Name:
          <input name="emergencyName" type="text" value="${emergencyName}" />
        </label>
        <label>Emergency Contact Phone:
          <input name="emergencyPhone" type="tel" value="${emergencyPhone}" />
        </label>
        <label>Emergency Contact Relation:
          <input name="emergencyRelation" type="text" value="${emergencyRelation}" />
        </label>
        <label>Waiver Signed:
          <input name="waiver" type="checkbox" ${waiverSigned ? "checked" : ""} />
        </label>
        <label>Waiver Signature:
          <input name="waiverSignature" type="text" value="${waiverSignature}" />
        </label>
        <label>Course:
          <input name="course" type="text" value="${course}" />
        </label>
        <label>Schedule Preference:
          <input name="schedulePref" type="text" value="${schedulePref}" />
        </label>
        <label>Schedule Notes:
          <textarea name="scheduleNotes">${scheduleNotes}</textarea>
        </label>
        <label>Payment Status:
          <input name="paymentStatus" type="text" value="${paymentStatus}" />
        </label>
        <label>Payment Proof Upload:
          <input name="paymentProof" type="file" accept="image/*" />
          ${paymentProofUrl ? `<img src="${paymentProofUrl}" alt="Payment Proof" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ""}
        </label>
        <label>Accommodation Needs:
          <input name="accommodation" type="text" value="${accommodation}" />
        </label>
        <label>Student Notes:
          <textarea name="studentNotes">${studentNotes}</textarea>
        </label>
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-dashboard-btn" type="button">⬅ Dashboard</button>
      </form>
    </div>
  `;
  // --------- END FORM SECTION ---------

  // Show/hide permit photo section
  container.querySelector('select[name="cdlPermit"]')?.addEventListener('change', function() {
    document.getElementById('permit-photo-section').style.display = this.value === "yes" ? "" : "none";
  });
  // Show/hide vehicle photos section
  container.querySelector('select[name="vehicleQualified"]')?.addEventListener('change', function() {
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
          await updateDoc(snap.docs[0].ref, { [updateField]: downloadURL });
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