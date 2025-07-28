// instructor/instructor-profile.js

import { db, storage } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  uploadBytes,
  getDownloadURL,
  ref,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderWelcome } from '../welcome.js';
import { renderInstructorDashboard } from './instructor-dashboard.js';

// Use global or pass in as param
let currentUserEmail =
  window.currentUserEmail || localStorage.getItem('currentUserEmail') || null;

export async function renderInstructorProfile(
  container = document.getElementById('app')
) {
  if (!container) return;

  if (!currentUserEmail) {
    showToast('No user found. Please log in again.');
    renderWelcome();
    return;
  }

  // Fetch instructor profile
  let userData = {};
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
  } catch (e) {
    userData = {};
  }
  if ((userData.role || 'student') !== 'instructor') {
    showToast('Access denied: Instructor profile only.');
    renderInstructorDashboard();
    return;
  }

  // --- Profile fields ---
  const {
    name = '',
    email = currentUserEmail,
    profilePicUrl = '',
    experience = '',
    phone = '',
    availability = '',
    licenseClass = '',
    licenseNumber = '',
    licenseExp = '',
    preferredContact = '',
    sessionLog = [],
    feedback = '',
    complianceChecked = false,
    adminNotes = '',
    active = true,
    assignedStudents = [],
  } = userData;

  // Compliance alert
  const complianceMissing = !licenseClass || !licenseNumber || !licenseExp;
  let complianceAlert = complianceMissing
    ? `<div class="alert warning" style="margin-bottom:1em;">⚠️ Please complete your instructor license info below.</div>`
    : `<div class="alert success" style="margin-bottom:1em;">✅ All required compliance info current!</div>`;

  // Assigned students (read only)
  const assignedStudentsHtml =
    Array.isArray(assignedStudents) && assignedStudents.length
      ? assignedStudents
          .map((s, i) => `<div>#${i + 1}: ${s.name || s.email}</div>`)
          .join('')
      : '<i>No students assigned yet.</i>';

  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width: 540px; margin: 0 auto;">
      <h2>👤 Instructor Profile <span class="role-badge instructor">Instructor</span></h2>
      ${complianceAlert}
      <form id="instructor-profile-form" style="display:flex;flex-direction:column;gap:1.3rem;">
        <label>Name:<input type="text" name="name" value="${name}" required /></label>
        <label>Email:<span style="user-select:all;">${email}</span></label>
        <label>Profile Picture:
          <input type="file" name="profilePic" accept="image/*" />
          ${profilePicUrl ? `<img src="${profilePicUrl}" alt="Profile Picture" style="max-width:90px;border-radius:12px;display:block;margin-top:7px;" />` : ''}
        </label>
        <label>Phone:<input type="tel" name="phone" value="${phone}" placeholder="(Optional)" /></label>
        <label>Experience:
          <select name="experience" required>
            <option value="">Select</option>
            <option value="none" ${experience === 'none' ? 'selected' : ''}>No experience</option>
            <option value="1-2" ${experience === '1-2' ? 'selected' : ''}>1–2 years</option>
            <option value="3-5" ${experience === '3-5' ? 'selected' : ''}>3–5 years</option>
            <option value="6-10" ${experience === '6-10' ? 'selected' : ''}>6–10 years</option>
            <option value="10+" ${experience === '10+' ? 'selected' : ''}>10+ years</option>
          </select>
        </label>
        <details>
          <summary><strong>Availability & Schedule</strong></summary>
          <label>Days/Times Available:<br>
            <input type="text" name="availability" value="${availability}" placeholder="e.g. Mon-Fri, 8am-4pm" />
          </label>
        </details>
        <details>
          <summary><strong>Instructor License Info</strong> ${complianceMissing ? '<span style="color:#e67c7c;">(Required)</span>' : ''}</summary>
          <label>CDL Class:
            <select name="licenseClass">
              <option value="">Select</option>
              <option value="A" ${licenseClass === 'A' ? 'selected' : ''}>A</option>
              <option value="B" ${licenseClass === 'B' ? 'selected' : ''}>B</option>
              <option value="C" ${licenseClass === 'C' ? 'selected' : ''}>C</option>
            </select>
          </label>
          <label>CDL License #:
            <input type="text" name="licenseNumber" value="${licenseNumber}" />
          </label>
          <label>License Expiration:
            <input type="date" name="licenseExp" value="${licenseExp}" />
          </label>
        </details>
        <label>Preferred Contact Method:
          <select name="preferredContact">
            <option value="">Select</option>
            <option value="email" ${preferredContact === 'email' ? 'selected' : ''}>Email</option>
            <option value="phone" ${preferredContact === 'phone' ? 'selected' : ''}>Phone</option>
            <option value="sms" ${preferredContact === 'sms' ? 'selected' : ''}>SMS/Text</option>
          </select>
        </label>
        <details>
          <summary><strong>Session Log</strong> (Auto-generated, read-only)</summary>
          <div style="font-size:0.96em;">
            ${
              Array.isArray(sessionLog) && sessionLog.length
                ? sessionLog
                    .map(
                      (s, i) =>
                        `<div>#${i + 1}: ${s.date || '--'} &mdash; ${s.type || 'Session'} &mdash; ${s.student || ''}</div>`
                    )
                    .join('')
                : '<i>No sessions logged yet.</i>'
            }
          </div>
        </details>
        <details>
          <summary><strong>Feedback (optional)</strong></summary>
          <textarea name="feedback" rows="3" placeholder="Feedback, notes, or suggestions...">${feedback}</textarea>
        </details>
        <details>
          <summary><strong>Assigned Students</strong> (readonly)</summary>
          <div style="font-size:0.96em;">${assignedStudentsHtml}</div>
        </details>
        <details>
          <summary><strong>Admin Notes</strong> (staff only)</summary>
          <textarea name="adminNotes" rows="2" disabled placeholder="Visible to staff/admin only">${adminNotes}</textarea>
        </details>
        <label>
          <input type="checkbox" name="active" ${active ? 'checked' : ''} disabled />
          Active Instructor <span style="font-size:0.98em;color:#888;">(Set by admin)</span>
        </label>
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-instructor-dashboard-btn" type="button" style="margin-top:0.5rem;">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // Back button handler
  document
    .getElementById('back-to-instructor-dashboard-btn')
    ?.addEventListener('click', () => {
      renderInstructorDashboard();
    });

  setupNavigation();

  // Profile picture upload
  container
    .querySelector('input[name="profilePic"]')
    ?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const storageRef = ref(storage, `profilePics/${currentUserEmail}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        // Save to Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, 'users', snap.docs[0].id), {
            profilePicUrl: downloadURL,
          });
        }
        showToast('Profile picture uploaded!');
        renderInstructorProfile(container); // Refresh
      } catch (err) {
        showToast('Failed to upload profile picture: ' + err.message);
      }
    });

  // Save handler
  container.querySelector('#instructor-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);

    const name = fd.get('name').trim();
    const experience = fd.get('experience');
    const phone = fd.get('phone')?.trim() || '';
    const availability = fd.get('availability')?.trim() || '';
    const licenseClass = fd.get('licenseClass') || '';
    const licenseNumber = fd.get('licenseNumber')?.trim() || '';
    const licenseExp = fd.get('licenseExp') || '';
    const preferredContact = fd.get('preferredContact') || '';
    const feedback = fd.get('feedback')?.trim() || '';

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDocRef = snap.docs[0].ref;
        await updateDoc(userDocRef, {
          name,
          experience,
          phone,
          availability,
          licenseClass,
          licenseNumber,
          licenseExp,
          preferredContact,
          feedback,
        });
        localStorage.setItem('fullName', name);

        showToast('✅ Profile saved!');
        renderInstructorProfile(container); // Refresh for compliance check
      } else {
        throw new Error('User document not found');
      }
    } catch (err) {
      showToast('❌ Error saving profile: ' + err.message);
    }
  };
}
