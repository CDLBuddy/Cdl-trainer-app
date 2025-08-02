// student/profile.js

import { db, storage } from '../firebase.js';
import {
  showToast,
  setupNavigation,
  markStudentProfileComplete,
  markStudentPermitUploaded,
  markStudentVehicleUploaded,
} from '../ui-helpers.js';

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';

import { renderStudentDashboard } from './student-dashboard.js';
import { getCurrentSchoolBranding } from '../school-branding.js';
import { getWalkthroughLabel } from '../walkthrough-data'; // ✅ Centralized CDL class label import

// --- DRY: Get current user email ---
function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    window.auth?.currentUser?.email ||
    localStorage.getItem('currentUserEmail') ||
    null
  );
}

// --- Utility: HTML-escape ---
function escapeHTML(str) {
  return (str || '').replace(
    /[&<>"'`]/g,
    (s) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;',
      })[s]
  );
}

export async function renderProfile(
  container = document.getElementById('app')
) {
  if (!container) return;
  const currentUserEmail = getCurrentUserEmail();
  if (!currentUserEmail) {
    showToast('No user found. Please log in again.');
    window.location.reload();
    return;
  }
  // --- SCHOOL BRANDING (Accent, Logo, School Name) ---
  const brand = (await getCurrentSchoolBranding?.()) || {};
  if (brand.primaryColor) {
    document.documentElement.style.setProperty(
      '--brand-primary',
      brand.primaryColor
    );
  }
  const accent = brand.primaryColor || '#b48aff';
  const schoolLogo = brand.logoUrl || '';
  const schoolDisplayName = brand.schoolName || '';

  // --- FETCH user data by doc ID ---
  let userData = {};
  let userDocRef = doc(db, 'users', currentUserEmail);
  try {
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      userData = userSnap.data();
    } else {
      showToast('Profile not found.');
      window.location.reload();
      return;
    }
  } catch {
    userData = {};
  }

  // --- Enforce role and schoolId from Firestore ---
  const userRole = userData.role || 'student';
  const schoolId = userData.schoolId || '';
  const status = userData.status || 'active';

  // --- Fields & defaults ---
  const {
    name = '',
    dob = '',
    profilePicUrl = '',
    cdlClass = '',
    endorsements = [],
    restrictions = [],
    experience = '',
    prevEmployer = '',
    assignedCompany = '',
    assignedInstructor = '',
    cdlPermit = '',
    permitPhotoUrl = '',
    permitExpiry = '',
    driverLicenseUrl = '',
    licenseExpiry = '',
    medicalCardUrl = '',
    medCardExpiry = '',
    vehicleQualified = '',
    truckPlateUrl = '',
    trailerPlateUrl = '',
    emergencyName = '',
    emergencyPhone = '',
    emergencyRelation = '',
    waiverSigned = false,
    waiverSignature = '',
    course = '',
    schedulePref = '',
    scheduleNotes = '',
    paymentStatus = '',
    paymentProofUrl = '',
    accommodation = '',
    studentNotes = '',
    profileProgress = 0,
    profileUpdatedAt = null,
    lastUpdatedBy = '',
  } = userData;

  // --- For accessibility: phone pattern and label ids ---
  const phonePattern = '[0-9\\-\\(\\)\\+ ]{10,15}';

  // --- Profile completion calculation ---
  function calcProgress(fd) {
    let total = 15, filled = 0;
    if (fd.get('name')) filled++;
    if (fd.get('dob')) filled++;
    if (profilePicUrl || fd.get('profilePic')?.size) filled++;
    if (fd.get('cdlClass')) filled++;
    if (fd.getAll('endorsements[]').length) filled++;
    if (fd.getAll('restrictions[]').length) filled++;
    if (fd.get('experience')) filled++;
    if (fd.get('cdlPermit')) filled++;
    if (permitPhotoUrl || fd.get('permitPhoto')?.size) filled++;
    if (driverLicenseUrl || fd.get('driverLicense')?.size) filled++;
    if (medicalCardUrl || fd.get('medicalCard')?.size) filled++;
    if (vehicleQualified) filled++;
    if (truckPlateUrl || fd.get('truckPlate')?.size) filled++;
    if (emergencyName && emergencyPhone) filled++;
    if (fd.get('waiver')) filled++;
    return Math.round((filled / total) * 100);
  }

  // --- Field options ---
  const endorsementOptions = [
    { val: 'H', label: 'Hazmat (H)' },
    { val: 'N', label: 'Tanker (N)' },
    { val: 'T', label: 'Double/Triple Trailers (T)' },
    { val: 'P', label: 'Passenger (P)' },
    { val: 'S', label: 'School Bus (S)' },
    { val: 'AirBrakes', label: 'Air Brakes' },
    { val: 'Other', label: 'Other' },
  ];
  const restrictionOptions = [
    { val: 'auto', label: 'Remove Automatic Restriction' },
    { val: 'airbrake', label: 'Remove Air Brake Restriction' },
    { val: 'refresher', label: 'One-day Refresher' },
    { val: 'roadtest', label: 'Road Test Prep' },
  ];

  // --- Inactive status UI ---
  if (status !== 'active') {
    container.innerHTML = `
      <div class="screen-wrapper fade-in profile-page" style="max-width:480px;margin:0 auto;">
        <h2>Profile Inactive</h2>
        <p>Your profile is currently inactive. Please contact your instructor or school admin for details.</p>
        <button class="btn outline" id="back-to-dashboard-btn" type="button">⬅ Dashboard</button>
      </div>`;
    document
      .getElementById('back-to-dashboard-btn')
      ?.addEventListener('click', () => renderStudentDashboard());
    setupNavigation();
    return;
  }

  container.innerHTML = `
  <div class="screen-wrapper fade-in profile-page" style="max-width:480px;margin:0 auto;">
    <h2 style="color:${accent};display:flex;align-items:center;gap:12px;">
      ${schoolLogo ? `<img src="${schoolLogo}" alt="School Logo" style="height:36px;border-radius:8px;background:#fff;margin-right:3px;box-shadow:0 1px 5px #0001;">` : ''}
      👤 Student Profile 
      <span class="role-badge student" style="background:${accent};color:#fff;">Student</span>
      ${schoolDisplayName ? `<span class="school-badge" style="margin-left:5px;padding:2px 10px 2px 7px;background:${accent}18;border-radius:8px;color:${accent};font-size:.98em;vertical-align:middle;">${escapeHTML(schoolDisplayName)}</span>` : ''}
    </h2>
    <div style="font-size:0.99em; color:#bbb; margin-bottom:0.5em;">
      <strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}
      ${profileUpdatedAt ? `&nbsp;|&nbsp;<span aria-label="Profile last updated">Last updated: ${new Date(profileUpdatedAt.seconds ? profileUpdatedAt.seconds * 1000 : profileUpdatedAt).toLocaleString()}</span>` : ''}
    </div>
    <div class="progress-bar" style="margin-bottom:1.4rem;">
      <div class="progress" style="width:${profileProgress || 0}%;background:${accent};"></div>
      <span class="progress-label">${profileProgress || 0}% Complete</span>
    </div>
    <form id="profile-form" autocomplete="off" style="display:flex;flex-direction:column;gap:1.1rem;">
      <label for="name">Name:
        <input id="name" name="name" type="text" required value="${escapeHTML(name)}" />
      </label>
      <label for="dob">Date of Birth:
        <input id="dob" name="dob" type="date" required value="${dob}" />
      </label>
      <label for="profilePic">Profile Picture:
        <input id="profilePic" name="profilePic" type="file" accept="image/*" aria-label="Profile Picture" />
        ${profilePicUrl ? `<img src="${profilePicUrl}" alt="Profile Picture" style="max-width:70px; margin-top:5px; border-radius:9px;">` : ''}
      </label>
      <label for="cdlClass">CDL Class:
        <select id="cdlClass" name="cdlClass" required>
          <option value="">Select</option>
          <option value="A" ${cdlClass === 'A' ? 'selected' : ''}>Class A</option>
          <option value="A-WO-AIR-ELEC" ${cdlClass === 'A-WO-AIR-ELEC' ? 'selected' : ''}>Class A w/o Air/Electric</option>
          <option value="A-WO-HYD-ELEC" ${cdlClass === 'A-WO-HYD-ELEC' ? 'selected' : ''}>Class A w/o Hydraulic/Electric</option>
          <option value="B" ${cdlClass === 'B' ? 'selected' : ''}>Class B</option>
          <option value="PASSENGER-BUS" ${cdlClass === 'PASSENGER-BUS' ? 'selected' : ''}>Passenger Bus</option>
        </select>
      </label>
      <label>Endorsements:<br>
        ${endorsementOptions
          .map(
            (opt) =>
              `<label style="margin-right:1em;">
            <input type="checkbox" name="endorsements[]" value="${opt.val}" ${endorsements.includes(opt.val) ? 'checked' : ''}> ${opt.label}
          </label>`
          )
          .join('')}
      </label>
      <label>Restrictions:<br>
        ${restrictionOptions
          .map(
            (opt) =>
              `<label style="margin-right:1em;">
            <input type="checkbox" name="restrictions[]" value="${opt.val}" ${restrictions.includes(opt.val) ? 'checked' : ''}> ${opt.label}
          </label>`
          )
          .join('')}
      </label>
      <label for="experience">Experience:
        <select id="experience" name="experience" required>
          <option value="">Select</option>
          <option value="none" ${experience === 'none' ? 'selected' : ''}>No Experience</option>
          <option value="1-2" ${experience === '1-2' ? 'selected' : ''}>1–2 Years</option>
          <option value="3-5" ${experience === '3-5' ? 'selected' : ''}>3–5 Years</option>
          <option value="6-10" ${experience === '6-10' ? 'selected' : ''}>6–10 Years</option>
          <option value="10+" ${experience === '10+' ? 'selected' : ''}>10+ Years</option>
        </select>
      </label>
      <label for="prevEmployer">Previous Employer:
        <input id="prevEmployer" name="prevEmployer" type="text" value="${escapeHTML(prevEmployer)}" />
      </label>
      <label for="assignedCompany">Assigned Company:
        <input id="assignedCompany" name="assignedCompany" type="text" value="${escapeHTML(assignedCompany)}" />
      </label>
      <label for="assignedInstructor">Assigned Instructor:
        <input id="assignedInstructor" name="assignedInstructor" type="text" value="${escapeHTML(assignedInstructor)}" />
      </label>
      <label for="cdlPermit">CDL Permit?
        <select id="cdlPermit" name="cdlPermit" required>
          <option value="">Select</option>
          <option value="yes" ${cdlPermit === 'yes' ? 'selected' : ''}>Yes</option>
          <option value="no" ${cdlPermit === 'no' ? 'selected' : ''}>No</option>
        </select>
      </label>
      <div id="permit-photo-section" style="display:${cdlPermit === 'yes' ? '' : 'none'};">
        <label for="permitPhoto">Permit Photo:
          <input id="permitPhoto" name="permitPhoto" type="file" accept="image/*" aria-label="Permit Photo" />
          ${permitPhotoUrl ? `<img src="${permitPhotoUrl}" alt="Permit Photo" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ''}
        </label>
        <label for="permitExpiry">Permit Expiry:
          <input id="permitExpiry" name="permitExpiry" type="date" value="${permitExpiry}" />
        </label>
      </div>
      <label for="driverLicense">Driver License Upload:
        <input id="driverLicense" name="driverLicense" type="file" accept="image/*" aria-label="Driver License" />
        ${driverLicenseUrl ? `<img src="${driverLicenseUrl}" alt="License" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ''}
      </label>
      <label for="licenseExpiry">License Expiry:
        <input id="licenseExpiry" name="licenseExpiry" type="date" value="${licenseExpiry}" />
      </label>
      <label for="medicalCard">Medical Card Upload:
        <input id="medicalCard" name="medicalCard" type="file" accept="image/*" aria-label="Medical Card" />
        ${medicalCardUrl ? `<img src="${medicalCardUrl}" alt="Medical Card" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ''}
      </label>
      <label for="medCardExpiry">Medical Card Expiry:
        <input id="medCardExpiry" name="medCardExpiry" type="date" value="${medCardExpiry}" />
      </label>
      <label for="vehicleQualified">Is Your Vehicle Qualified?
        <select id="vehicleQualified" name="vehicleQualified" required>
          <option value="">Select</option>
          <option value="yes" ${vehicleQualified === 'yes' ? 'selected' : ''}>Yes</option>
          <option value="no" ${vehicleQualified === 'no' ? 'selected' : ''}>No</option>
        </select>
      </label>
      <div id="vehicle-photos-section" style="display:${vehicleQualified === 'yes' ? '' : 'none'};">
        <label for="truckPlate">Truck Data Plate:
          <input id="truckPlate" name="truckPlate" type="file" accept="image/*" aria-label="Truck Plate" />
          ${truckPlateUrl ? `<img src="${truckPlateUrl}" alt="Truck Plate" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ''}
        </label>
        <label for="trailerPlate">Trailer Data Plate:
          <input id="trailerPlate" name="trailerPlate" type="file" accept="image/*" aria-label="Trailer Plate" />
          ${trailerPlateUrl ? `<img src="${trailerPlateUrl}" alt="Trailer Plate" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ''}
        </label>
      </div>
      <label for="emergencyName">Emergency Contact Name:
        <input id="emergencyName" name="emergencyName" type="text" required value="${escapeHTML(emergencyName)}" />
      </label>
      <label for="emergencyPhone">Emergency Contact Phone:
        <input id="emergencyPhone" name="emergencyPhone" type="tel" required value="${escapeHTML(emergencyPhone)}" pattern="${phonePattern}" />
      </label>
      <label for="emergencyRelation">Emergency Contact Relation:
        <input id="emergencyRelation" name="emergencyRelation" type="text" required value="${escapeHTML(emergencyRelation)}" />
      </label>
      <label for="waiver">Waiver Signed:
        <input id="waiver" name="waiver" type="checkbox" ${waiverSigned ? 'checked' : ''} />
      </label>
      <label for="waiverSignature">Waiver Signature:
        <input id="waiverSignature" name="waiverSignature" type="text" value="${escapeHTML(waiverSignature)}" />
      </label>
      <label for="course">Course:
        <input id="course" name="course" type="text" value="${escapeHTML(course)}" />
      </label>
      <label for="schedulePref">Schedule Preference:
        <input id="schedulePref" name="schedulePref" type="text" value="${escapeHTML(schedulePref)}" />
      </label>
      <label for="scheduleNotes">Schedule Notes:
        <textarea id="scheduleNotes" name="scheduleNotes">${escapeHTML(scheduleNotes)}</textarea>
      </label>
      <label for="paymentStatus">Payment Status:
        <input id="paymentStatus" name="paymentStatus" type="text" value="${escapeHTML(paymentStatus)}" />
      </label>
      <label for="paymentProof">Payment Proof Upload:
        <input id="paymentProof" name="paymentProof" type="file" accept="image/*" aria-label="Payment Proof" />
        ${paymentProofUrl ? `<img src="${paymentProofUrl}" alt="Payment Proof" style="max-width:90px;margin-top:5px;border-radius:8px;">` : ''}
      </label>
      <label for="accommodation">Accommodation Needs:
        <input id="accommodation" name="accommodation" type="text" value="${escapeHTML(accommodation)}" />
      </label>
      <label for="studentNotes">Student Notes:
        <textarea id="studentNotes" name="studentNotes">${escapeHTML(studentNotes)}</textarea>
      </label>
      <button class="btn primary wide" id="save-profile-btn" type="submit" style="background:${accent};border:none;">Save Profile</button>
      <button class="btn outline" id="back-to-dashboard-btn" type="button">⬅ Dashboard</button>
    </form>
    <div style="margin-top:1.5rem;font-size:1em;color:${accent};">
      <strong>Your selected CDL Class:</strong> <span style="font-weight:600">${getCdlClassLabel(cdlClass) || '<i>Not selected</i>'}</span>
    </div>
  </div>
`;

  // --- Show/hide permit photo section
  container
    .querySelector('select[name="cdlPermit"]')
    ?.addEventListener('change', function () {
      document.getElementById('permit-photo-section').style.display =
        this.value === 'yes' ? '' : 'none';
    });
  // Show/hide vehicle photos section
  container
    .querySelector('select[name="vehicleQualified"]')
    ?.addEventListener('change', function () {
      document.getElementById('vehicle-photos-section').style.display =
        this.value === 'yes' ? '' : 'none';
    });

  // --- Back to dashboard ---
  document
    .getElementById('back-to-dashboard-btn')
    ?.addEventListener('click', () => {
      renderStudentDashboard();
    });

  // --- FILE UPLOAD HELPERS (with checklist marking) ---
  async function handleFileInput(
    inputName,
    storagePath,
    updateField,
    checklistFn = null
  ) {
    const input = container.querySelector(`input[name="${inputName}"]`);
    if (!input) return;
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const storageRef = ref(
          storage,
          `${storagePath}/${currentUserEmail}-${Date.now()}`
        );
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        // Update Firestore by doc ID
        await updateDoc(userDocRef, { [updateField]: downloadURL });
        showToast(`${updateField.replace(/Url$/, '')} uploaded!`);
        if (typeof checklistFn === 'function')
          await checklistFn(currentUserEmail);
        renderProfile(container); // refresh to show
      } catch (err) {
        showToast(`Failed to upload ${updateField}: ` + err.message);
      }
    });
  }
  // All uploads with checklist logic
  handleFileInput(
    'profilePic',
    'profilePics',
    'profilePicUrl',
    markStudentProfileComplete
  );
  handleFileInput(
    'permitPhoto',
    'permits',
    'permitPhotoUrl',
    markStudentPermitUploaded
  );
  handleFileInput('driverLicense', 'licenses', 'driverLicenseUrl');
  handleFileInput('medicalCard', 'medCards', 'medicalCardUrl');

  // Data plates (when both uploaded, mark vehicle uploaded)
  let truckUploaded = !!truckPlateUrl,
    trailerUploaded = !!trailerPlateUrl;
  handleFileInput(
    'truckPlate',
    'vehicle-plates',
    'truckPlateUrl',
    async (email) => {
      truckUploaded = true;
      if (truckUploaded && trailerUploaded)
        await markStudentVehicleUploaded(email);
    }
  );
  handleFileInput(
    'trailerPlate',
    'vehicle-plates',
    'trailerPlateUrl',
    async (email) => {
      trailerUploaded = true;
      if (truckUploaded && trailerUploaded)
        await markStudentVehicleUploaded(email);
    }
  );
  handleFileInput('paymentProof', 'payments', 'paymentProofUrl');

  // --- SAVE PROFILE HANDLER (defensive, disables submit while saving) ---
  container.querySelector('#profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    const fd = new FormData(e.target);

    // Emergency contact must have all fields
    if (
      !fd.get('emergencyName') ||
      !fd.get('emergencyPhone') ||
      !fd.get('emergencyRelation')
    ) {
      showToast('Please fill in all emergency contact fields.', 3300, 'error');
      saveBtn.disabled = false;
      return;
    }

    // Only save allowed fields, NOT role or schoolId
    const updateObj = {
      name: fd.get('name'),
      dob: fd.get('dob'),
      cdlClass: fd.get('cdlClass'),
      endorsements: fd.getAll('endorsements[]'),
      restrictions: fd.getAll('restrictions[]'),
      experience: fd.get('experience'),
      prevEmployer: fd.get('prevEmployer'),
      assignedCompany: fd.get('assignedCompany'),
      assignedInstructor: fd.get('assignedInstructor'),
      cdlPermit: fd.get('cdlPermit'),
      permitExpiry: fd.get('permitExpiry'),
      licenseExpiry: fd.get('licenseExpiry'),
      medCardExpiry: fd.get('medCardExpiry'),
      vehicleQualified: fd.get('vehicleQualified'),
      emergencyName: fd.get('emergencyName'),
      emergencyPhone: fd.get('emergencyPhone'),
      emergencyRelation: fd.get('emergencyRelation'),
      course: fd.get('course'),
      schedulePref: fd.get('schedulePref'),
      scheduleNotes: fd.get('scheduleNotes'),
      paymentStatus: fd.get('paymentStatus'),
      accommodation: fd.get('accommodation'),
      studentNotes: fd.get('studentNotes'),
      waiverSigned: !!fd.get('waiver'),
      waiverSignature: fd.get('waiverSignature'),
      profileProgress: calcProgress(fd),
      profileUpdatedAt: serverTimestamp(),
      lastUpdatedBy: currentUserEmail,
    };

    try {
      await updateDoc(userDocRef, updateObj);
      await markStudentProfileComplete(currentUserEmail);
      showToast('✅ Profile saved!');
      renderProfile(container);
    } catch (err) {
      showToast('❌ Error saving: ' + err.message);
      saveBtn.disabled = false;
    }
  };

  setupNavigation();
}
// === CDL Class Label Export ===
export function getCdlClassLabel(classKey) {
  return getWalkthroughLabel(classKey);
}