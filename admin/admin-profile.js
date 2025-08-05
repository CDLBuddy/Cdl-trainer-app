// admin/admin-profile.js
import { db, storage } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderWelcome } from '../welcome.js';
import { renderAdminDashboard } from './admin-dashboard.js';
import { getCurrentSchoolBranding } from '../school-branding.js';

// PDF export utility (jsPDF CDN)
let jsPDF = null;
async function ensureJsPDF() {
  if (!jsPDF) {
    const mod = await import(
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    );
    jsPDF = mod.jspdf.jsPDF;
  }
}

let currentUserEmail =
  window.currentUserEmail || localStorage.getItem('currentUserEmail') || null;
let currentSchoolId =
  window.schoolId || localStorage.getItem('schoolId') || null;

export async function renderAdminProfile(
  container = document.getElementById('app')
) {
  if (!container) container = document.getElementById('app');
  if (!currentUserEmail) {
    showToast('No user found. Please log in again.');
    renderWelcome();
    return;
  }

  // --- Get dynamic branding ---
  const brand = (await getCurrentSchoolBranding?.()) || {};
  if (brand.primaryColor) {
    document.documentElement.style.setProperty(
      '--brand-primary',
      brand.primaryColor
    );
  }
  const headerLogo = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="School Logo" class="dashboard-logo" style="max-width:90px;vertical-align:middle;margin-bottom:3px;">`
    : '';
  const schoolName = brand.schoolName || 'CDL Trainer';
  const accent = brand.primaryColor || '#b48aff';

  // --- Fetch admin user data ---
  let userData = {};
  let lastUpdated = '';
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      lastUpdated = userData.profileUpdatedAt || userData.updatedAt || '';
    }
  } catch (e) {
    userData = {};
  }

  // SECURITY: Enforce admin can only view/edit their own profile and own school
  if (
    (userData.role || 'student') !== 'admin' ||
    userData.schoolId !== currentSchoolId
  ) {
    showToast('Access denied: Admin profile only.');
    renderAdminDashboard();
    return;
  }

  // --- Profile Completion Calculation ---
  const completionFields = [
    'name',
    'phone',
    'companyName',
    'companyAddress',
    'profilePicUrl',
    'emergencyContactName',
    'emergencyContactPhone',
    'emergencyContactRelation',
    'adminWaiverSigned',
    'adminSignature',
  ];
  let completed = completionFields.filter((f) => !!userData[f]).length;
  const profilePercent = Math.floor(
    (completed / completionFields.length) * 100
  );

  // --- Fields and Defaults ---
  const {
    name = '',
    email = currentUserEmail,
    profilePicUrl = '',
    phone = '',
    companyName = '',
    companyAddress = '',
    companyLogoUrl = '',
    adminNotes = '',
    emergencyContactName = '',
    emergencyContactPhone = '',
    emergencyContactRelation = '',
    complianceDocsUrl = '',
    adminWaiverSigned = false,
    adminSignature = '',
  } = userData;

  // --- Preview the latest school logo (branding takes precedence) ---
  let schoolLogoUrl = brand.logoUrl || companyLogoUrl || '/default-logo.svg';

  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width:540px;margin:0 auto;">
      <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;">
        <span style="font-size:1.35em;font-weight:500;color:${accent};">${schoolName}</span>
        ${headerLogo}
      </header>
      <div class="dashboard-card" style="margin-bottom:1.3em;padding:1em;">
        <b>Admin Profile Completion: <span style="color:${profilePercent < 80 ? '#c50' : '#2c7'}">${profilePercent}%</span></b>
        <br>
        <small>Last updated: ${lastUpdated ? new Date(lastUpdated.seconds ? lastUpdated.seconds * 1000 : lastUpdated).toLocaleString() : '(unknown)'}</small>
      </div>
      <h2>👤 Admin Profile <span class="role-badge admin">Admin</span></h2>
      <form id="admin-profile-form" style="display:flex;flex-direction:column;gap:1.1rem;">
        <label>
          Name:
          <input type="text" name="name" value="${name}" required />
        </label>
        <label>
          Email:
          <span style="user-select:all;">${email}</span>
        </label>
        <label>
          Profile Picture:
          <input type="file" name="profilePic" accept="image/*" />
          <img id="admin-profile-pic-preview" src="${profilePicUrl}" alt="Profile Picture" style="max-width:90px;border-radius:12px;display:block;margin-top:7px;" />
        </label>
        <label>
          Phone:
          <input type="tel" name="phone" value="${phone}" placeholder="(Optional)" />
        </label>
        <label>
          School / Company Name:
          <input type="text" name="companyName" value="${companyName}" />
        </label>
        <label>
          School Address:
          <input type="text" name="companyAddress" value="${companyAddress}" />
        </label>
        <div class="logo-upload-section">
          <label for="school-logo-upload">School/Brand Logo:</label>
          <input type="file" id="school-logo-upload" accept="image/*" />
          <img id="current-school-logo" src="${schoolLogoUrl}" alt="School Logo" style="height: 60px; display: block; margin: 12px 0;" />
          <button type="button" id="upload-school-logo-btn" class="btn outline small" style="margin-bottom:10px;">Upload Logo</button>
        </div>
        <label>
          Admin Notes / Memo:
          <textarea name="adminNotes" rows="2">${adminNotes || ''}</textarea>
        </label>
        <details>
          <summary><strong>Emergency Contact</strong></summary>
          <label>Name: <input type="text" name="emergencyContactName" value="${emergencyContactName}" /></label>
          <label>Phone: <input type="tel" name="emergencyContactPhone" value="${emergencyContactPhone}" /></label>
          <label>Relation: <input type="text" name="emergencyContactRelation" value="${emergencyContactRelation}" /></label>
        </details>
        <details>
          <summary><strong>Compliance Documents</strong> (Insurance, Bonding, etc.)</summary>
          <label>Upload Document(s):
            <input type="file" name="complianceDocs" accept="image/*,application/pdf" />
            ${complianceDocsUrl ? `<a href="${complianceDocsUrl}" target="_blank">View</a>` : ''}
          </label>
        </details>
        <label>
          <input type="checkbox" name="adminWaiverSigned" ${adminWaiverSigned ? 'checked' : ''} />
          I acknowledge the code of conduct and compliance requirements.
        </label>
        <label>
          Digital Signature: <input type="text" name="adminSignature" value="${adminSignature || ''}" placeholder="Type or sign your name" />
        </label>
        <div style="display:flex;gap:1em;">
          <button class="btn primary wide" type="submit" style="background:${accent};border:none;">💾 Save Profile</button>
          <button type="button" class="btn outline" id="download-profile-pdf-btn">📄 Download PDF</button>
        </div>
        <button class="btn outline" id="back-to-admin-dashboard-btn" type="button" style="margin-top:0.5rem;">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // NAVIGATION: Back button
  container
    .querySelector('#back-to-admin-dashboard-btn')
    ?.addEventListener('click', () => {
      renderAdminDashboard();
    });

  setupNavigation();

  // --- PROFILE PIC PREVIEW ---
  container
    .querySelector('input[name="profilePic"]')
    ?.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      container.querySelector('#admin-profile-pic-preview').src = url;
    });

  // --- FILE UPLOAD HELPERS ---
  async function handleFileInput(inputName, storagePath, updateField) {
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
        // Update field in Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, { [updateField]: downloadURL });
          showToast(`${updateField.replace(/Url$/, '')} uploaded!`);
          renderAdminProfile(container); // Refresh on upload
        }
      } catch (err) {
        showToast(`Failed to upload ${updateField}: ` + err.message);
      }
    });
  }

  handleFileInput('profilePic', 'profilePics', 'profilePicUrl');
  handleFileInput('complianceDocs', 'complianceDocs', 'complianceDocsUrl');

  // --- SCHOOL LOGO UPLOAD HANDLER ---
  const schoolLogoInput = container.querySelector('#school-logo-upload');
  const schoolLogoBtn = container.querySelector('#upload-school-logo-btn');
  const schoolLogoImg = container.querySelector('#current-school-logo');

  schoolLogoBtn?.addEventListener('click', async () => {
    if (!schoolLogoInput?.files?.length) {
      showToast('Please select a logo file first.');
      return;
    }
    if (!currentSchoolId) {
      showToast('School ID not found. Cannot upload logo.');
      return;
    }
    const file = schoolLogoInput.files[0];
    try {
      // Preview before upload
      const url = URL.createObjectURL(file);
      schoolLogoImg.src = url;

      // Upload logo to storage (for THIS school only)
      const ext = file.name.split('.').pop();
      const logoRef = ref(
        storage,
        `school-logos/${currentSchoolId}/logo.${ext}`
      );
      await uploadBytes(logoRef, file);
      const logoUrl = await getDownloadURL(logoRef);

      // Save to schools collection (central branding, scoped)
      await setDoc(
        doc(db, 'schools', currentSchoolId),
        { logoUrl },
        { merge: true }
      );

      // Save also to admin user profile (optional legacy support)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { companyLogoUrl: logoUrl });
      }

      // Update preview in UI
      schoolLogoImg.src = logoUrl;
      showToast('School logo uploaded!');
      setTimeout(() => renderAdminProfile(container), 800);
    } catch (err) {
      showToast('Logo upload failed: ' + err.message);
    }
  });

  // --- SAVE PROFILE HANDLER ---
  container.querySelector('#admin-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    // --- Emergency Contact validation ---
    if (
      fd.get('emergencyContactName') ||
      fd.get('emergencyContactPhone') ||
      fd.get('emergencyContactRelation')
    ) {
      if (
        !fd.get('emergencyContactName') ||
        !fd.get('emergencyContactPhone') ||
        !fd.get('emergencyContactRelation')
      ) {
        showToast('Please complete all emergency contact fields.');
        return;
      }
    }

    // Build profile update object
    const updateObj = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      companyName: fd.get('companyName'),
      companyAddress: fd.get('companyAddress'),
      adminNotes: fd.get('adminNotes'),
      emergencyContactName: fd.get('emergencyContactName'),
      emergencyContactPhone: fd.get('emergencyContactPhone'),
      emergencyContactRelation: fd.get('emergencyContactRelation'),
      adminWaiverSigned: !!fd.get('adminWaiverSigned'),
      adminSignature: fd.get('adminSignature'),
      profileUpdatedAt: serverTimestamp(),
    };

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, updateObj);

        // --- Add to admin logs (simple version) ---
        await addDoc(collection(db, 'adminLogs'), {
          admin: currentUserEmail,
          schoolId: currentSchoolId,
          update: updateObj,
          updatedAt: new Date().toISOString(),
        });

        localStorage.setItem('fullName', updateObj.name);
        showToast('✅ Profile saved!');
        renderAdminProfile(container); // re-render for changes
      } else throw new Error('User document not found.');
    } catch (err) {
      showToast('❌ Error saving: ' + err.message);
    }
  };

  // --- PDF Download Handler ---
  container
    .querySelector('#download-profile-pdf-btn')
    ?.addEventListener('click', async () => {
      await ensureJsPDF();
      const doc = new jsPDF();
      doc.setFontSize(15);
      doc.text(`${schoolName} - Admin Profile`, 10, 20);
      doc.setFontSize(11);
      const lines = [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Company Name: ${companyName}`,
        `Company Address: ${companyAddress}`,
        `Emergency Contact: ${emergencyContactName || ''} (${emergencyContactRelation || ''}) ${emergencyContactPhone || ''}`,
        `Admin Waiver Signed: ${adminWaiverSigned ? 'Yes' : 'No'}`,
        `Signature: ${adminSignature}`,
        `Notes: ${adminNotes}`,
      ];
      let y = 34;
      lines.forEach((line) => {
        doc.text(line, 10, y);
        y += 8;
      });
      doc.save(`admin-profile-${new Date().toISOString().slice(0, 10)}.pdf`);
    });
}
