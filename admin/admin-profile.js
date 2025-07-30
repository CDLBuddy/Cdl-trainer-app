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
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
  } catch (e) {
    userData = {};
  }
  if ((userData.role || 'student') !== 'admin') {
    showToast('Access denied: Admin profile only.');
    renderAdminDashboard();
    return;
  }

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
    <div class="screen-wrapper fade-in profile-page" style="max-width:520px;margin:0 auto;">
      <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;">
        <span style="font-size:1.35em;font-weight:500;color:${accent};">${schoolName}</span>
        ${headerLogo}
      </header>
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
          ${profilePicUrl ? `<img src="${profilePicUrl}" alt="Profile Picture" style="max-width:90px;border-radius:12px;display:block;margin-top:7px;" />` : ''}
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
        <button class="btn primary wide" type="submit" style="background:${accent};border:none;">Save Profile</button>
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

  // Wire up all upload fields (admin profile)
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
      // Upload logo to storage
      const ext = file.name.split('.').pop();
      const logoRef = ref(
        storage,
        `school-logos/${currentSchoolId}/logo.${ext}`
      );
      await uploadBytes(logoRef, file);
      const logoUrl = await getDownloadURL(logoRef);

      // Save to schools collection (central branding)
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

      // Optionally, re-render profile to refresh logo everywhere
      setTimeout(() => renderAdminProfile(container), 600);
    } catch (err) {
      showToast('Logo upload failed: ' + err.message);
    }
  });

  // --- SAVE PROFILE HANDLER ---
  container.querySelector('#admin-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

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
    };

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, updateObj);
        localStorage.setItem('fullName', updateObj.name);
        showToast('✅ Profile saved!');
        renderAdminProfile(container); // re-render for changes
      } else throw new Error('User document not found.');
    } catch (err) {
      showToast('❌ Error saving: ' + err.message);
    }
  };
}
