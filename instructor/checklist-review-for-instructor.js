// instructor/checklist-review-for-instructor.js

import { db } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, setupNavigation, formatDate } from '../ui-helpers.js';

// === FIELD CONFIG (easy to expand for admin/superadmin) ===
const checklistFields = [
  { key: 'profileVerified', label: 'Profile Approved' },
  { key: 'permitVerified', label: 'Permit Verified' },
  { key: 'vehicleVerified', label: 'Vehicle Verified' },
  { key: 'walkthroughReviewed', label: 'Walkthrough Reviewed' },
  {
    key: 'finalStepCompleted',
    label: 'Final Step: In-person walkthrough & driving portion completed',
  },
];

// === MAIN CHECKLIST REVIEW MODAL ===
export async function renderChecklistReviewForInstructor(
  studentEmail,
  container = document.body,
  role = 'instructor'
) {
  if (!studentEmail) return showToast('No student selected.', 3000, 'error');

  // Remove all prior modals to prevent stacking
  document.querySelectorAll('.modal-overlay').forEach((el) => el.remove());

  // Fetch student profile and ELDT progress data
  let studentData = {},
    eldtData = {},
    auditTrail = [];
  try {
    // Profile
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', studentEmail));
    const snap = await getDocs(q);
    if (!snap.empty) studentData = snap.docs[0].data();
    // Progress
    const progressRef = doc(db, 'eldtProgress', studentEmail);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
      eldtData = progressSnap.data();
      // Fetch audit trail (history subcollection)
      const histSnap = await getDocs(collection(progressRef, 'history'));
      auditTrail = histSnap.docs
        .map((doc) => doc.data())
        .sort(
          (a, b) =>
            (b.updatedAt?.toDate?.() || new Date(b.updatedAt)) -
            (a.updatedAt?.toDate?.() || new Date(a.updatedAt))
        );
    }
  } catch (e) {
    showToast('Checklist fetch error.', 3200, 'error');
  }

  // --- Build Modal ---
  let modal = document.createElement('div');
  modal.className = 'modal-overlay fade-in';
  modal.tabIndex = -1;
  modal.innerHTML = `
    <div class="modal-card checklist-modal" role="dialog" aria-modal="true" aria-label="Checklist Review">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>Review Student Checklist</h2>
      <div class="profile-row"><strong>Name:</strong> ${studentData.name || 'Unknown'}</div>
      <div class="profile-row"><strong>Email:</strong> ${studentData.email || studentEmail}</div>
      <form id="checklist-review-form" style="display:flex;flex-direction:column;gap:1em;">
        ${checklistFields
          .map(
            (f) => `
          <label>
            <input type="checkbox" name="${f.key}" ${eldtData[f.key] ? 'checked' : ''} />
            ${f.label}
          </label>
        `
          )
          .join('')}
        <label>
          Instructor Notes:
          <textarea name="instructorNotes" rows="2" maxlength="300" style="resize:vertical;">${eldtData.instructorNotes || ''}</textarea>
        </label>
        <button type="submit" class="btn primary wide">Save Checklist Review</button>
        <button type="button" class="btn outline" id="close-checklist-modal">Close</button>
      </form>
      ${
        auditTrail.length
          ? `
        <details style="margin-top:1.2em;">
          <summary><b>Audit Trail (History)</b></summary>
          <div style="max-height:120px;overflow:auto;font-size:0.97em;padding-top:8px;">
            ${auditTrail
              .map(
                (entry) => `
              <div>
                <span style="color:#888;">${formatDate(entry.updatedAt)}</span> --
                <b>${entry.role || 'instructor'}</b>
                ${entry.updatedBy ? 'by ' + entry.updatedBy.split('@')[0] : ''}
                ${Object.entries(entry)
                  .filter(
                    ([k, v]) =>
                      k !== 'updatedAt' && k !== 'role' && k !== 'updatedBy'
                  )
                  .map(
                    ([k, v]) =>
                      `<span style="margin-left:7px;">${k}: <b>${v && typeof v === 'boolean' ? (v ? '✔' : '--') : v}</b></span>`
                  )
                  .join('')}
              </div>
            `
              )
              .join('')}
          </div>
        </details>
      `
          : ''
      }
    </div>
  `;
  container.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Modal cleanup function
  function closeModal() {
    modal.remove();
    document.body.style.overflow = '';
    setupNavigation();
  }
  modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
  modal
    .querySelector('#close-checklist-modal')
    ?.addEventListener('click', closeModal);
  modal.focus();
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // --- Form Submit Handler ---
  modal.querySelector('#checklist-review-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    let updateObj = {};
    checklistFields.forEach((f) => {
      updateObj[f.key] = !!fd.get(f.key);
    });
    updateObj.instructorNotes = fd.get('instructorNotes') || '';

    // Include instructor and timestamp for audit log
    updateObj.updatedAt = serverTimestamp();
    updateObj.updatedBy = localStorage.getItem('currentUserEmail') || '';
    updateObj.role = role;

    try {
      // If doc does not exist, create first
      const progressRef = doc(db, 'eldtProgress', studentEmail);
      const progressSnap = await getDoc(progressRef);
      if (!progressSnap.exists()) {
        await setDoc(progressRef, { studentEmail });
      }
      // Update main doc
      await updateDoc(progressRef, updateObj);

      // Save to history/audit log
      await setDoc(doc(collection(progressRef, 'history')), updateObj);

      showToast('Checklist review saved.', 2200, 'success');
      closeModal();
    } catch (err) {
      showToast(
        'Failed to save checklist: ' + (err.message || err),
        4400,
        'error'
      );
    }
  };

  // Accessibility/focus trap
  setTimeout(() => {
    modal.focus();
  }, 70);
}
