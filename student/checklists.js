// student/checklists.js

import { db, auth } from '../firebase.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// Import navigation handler
import { handleNavigation } from '../navigation.js';

// ==== Checklist Template ====
export const studentChecklistSectionsTemplate = [
  {
    header: 'Personal Info',
    items: [
      {
        label: 'Profile Complete',
        key: 'profileComplete',
        link: 'student-profile',
        details: 'Complete all required fields in your student profile.',
        readonly: false,
        substeps: null,
      },
    ],
  },
  {
    header: 'Permit & Docs',
    items: [
      {
        label: 'Permit Uploaded',
        key: 'permitUploaded',
        link: 'student-profile',
        details: 'Upload a clear photo of your CDL permit.',
        readonly: false,
        substeps: null,
      },
      {
        label: 'Vehicle Data Plates Uploaded',
        key: 'vehicleUploaded',
        link: 'student-profile',
        details: 'Upload photos of both your truck and trailer data plates.',
        readonly: false,
        substeps: [
          { label: 'Truck Plate', key: 'truckPlateUrl' },
          { label: 'Trailer Plate', key: 'trailerPlateUrl' },
        ],
      },
    ],
  },
  {
    header: 'Testing & Study',
    items: [
      {
        label: 'Practice Test Passed',
        key: 'practiceTestPassed',
        link: 'student-practice-tests',
        details:
          'Score at least 80% on any practice test to unlock the next step.',
        readonly: false,
        substeps: null,
      },
      {
        label: 'Walkthrough Progress',
        key: 'walkthroughComplete',
        link: 'student-walkthrough',
        details: 'Start and complete your CDL vehicle inspection walkthrough.',
        readonly: false,
        substeps: null,
      },
    ],
  },
  {
    header: 'Final Certification',
    items: [
      {
        label: 'Complete in-person walkthrough and driving portion',
        key: 'finalInstructorSignoff',
        link: '',
        details: 'This final step must be marked complete by your instructor.',
        readonly: true,
        substeps: null,
      },
    ],
  },
];

// --- Main Checklist Render ---
export async function renderChecklists(
  container = document.getElementById('app')
) {
  // Defensive: Validate container
  if (!container || typeof container.querySelector !== 'function') {
    container = document.getElementById('app');
    if (!container || typeof container.querySelector !== 'function') {
      console.error('❌ container is not a DOM element:', container);
      showToast('Internal error: Container not ready.');
      return;
    }
  }

  container.innerHTML = `<div class="loader" role="status" aria-live="polite" style="margin:2em auto;text-align:center;">Loading your checklist...</div>`;
  setupNavigation();

  // Robust user/email
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    (auth.currentUser && auth.currentUser.email) ||
    null;

  if (!currentUserEmail) {
    container.innerHTML = `<div role="alert" aria-live="assertive">You must be logged in to view this page.</div>`;
    setupNavigation();
    return;
  }

  // Robust role detection (Firestore takes priority)
  let userRole =
    localStorage.getItem('userRole') || window.currentUserRole || 'student';
  let schoolId = localStorage.getItem('schoolId') || '';
  let userData = {};

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      const validRoles = ['student', 'instructor', 'admin', 'superadmin'];
      if (userData.role && validRoles.includes(userData.role)) {
        userRole = userData.role;
        localStorage.setItem('userRole', userRole);
      }
      if (userData.schoolId) {
        schoolId = userData.schoolId;
        localStorage.setItem('schoolId', schoolId);
      }
    }
  } catch (e) {
    userData = {};
  }

  if (userRole !== 'student') {
    container.innerHTML =
      '<div role="alert" aria-live="assertive">This checklist is only available for students.</div>';
    setupNavigation();
    return;
  }

  // Extract user progress fields
  const cdlClass = userData.cdlClass || '';
  const cdlPermit = userData.cdlPermit || '';
  const permitPhotoUrl = userData.permitPhotoUrl || '';
  const vehicleQualified = userData.vehicleQualified || '';
  const truckPlateUrl = userData.truckPlateUrl || '';
  const trailerPlateUrl = userData.trailerPlateUrl || '';
  const experience = userData.experience || '';
  const lastTestScore =
    typeof userData.lastTestScore === 'number' ? userData.lastTestScore : 0;
  const walkthroughProgress =
    typeof userData.walkthroughProgress === 'number'
      ? userData.walkthroughProgress
      : 0;
  const walkthroughComplete = !!userData.walkthroughComplete;
  const finalInstructorSignoff = !!userData.finalInstructorSignoff;

  // Deep clone checklist template for this session
  const studentChecklistSections = JSON.parse(
    JSON.stringify(studentChecklistSectionsTemplate)
  );

  // Compute checklist step state
  studentChecklistSections[0].items[0].done = !!(
    cdlClass &&
    cdlPermit &&
    experience
  );
  studentChecklistSections[0].items[0].notify =
    !studentChecklistSections[0].items[0].done;

  studentChecklistSections[1].items[0].done =
    cdlPermit === 'yes' && !!permitPhotoUrl;
  studentChecklistSections[1].items[0].notify =
    cdlPermit === 'yes' && !permitPhotoUrl;

  studentChecklistSections[1].items[1].done =
    vehicleQualified === 'yes' && !!truckPlateUrl && !!trailerPlateUrl;
  studentChecklistSections[1].items[1].notify =
    vehicleQualified === 'yes' && (!truckPlateUrl || !trailerPlateUrl);
  if (studentChecklistSections[1].items[1].substeps) {
    studentChecklistSections[1].items[1].substeps[0].done = !!truckPlateUrl;
    studentChecklistSections[1].items[1].substeps[1].done = !!trailerPlateUrl;
  }

  studentChecklistSections[2].items[0].done = lastTestScore >= 80;
  studentChecklistSections[2].items[0].notify = lastTestScore < 80;

  studentChecklistSections[2].items[1].done = walkthroughProgress >= 1;
  studentChecklistSections[2].items[1].notify = walkthroughProgress < 1;

  studentChecklistSections[3].items[0].done =
    walkthroughComplete || finalInstructorSignoff;
  studentChecklistSections[3].items[0].notify =
    !studentChecklistSections[3].items[0].done;

  // Progress percent calculation
  const flatChecklist = studentChecklistSections.flatMap((sec) => sec.items);
  const complete = flatChecklist.filter((x) => x.done).length;
  const percent = Math.round((complete / flatChecklist.length) * 100);

  // Store last percent for fast reload/animation
  const lastPercent =
    parseInt(sessionStorage.getItem('checklistLastPercent'), 10) || 0;
  sessionStorage.setItem('checklistLastPercent', percent);

  const notifyItems = flatChecklist.filter((item) => item.notify);

  // Main UI render
  container.innerHTML = `
    <div class="screen-wrapper fade-in checklist-page" style="max-width:500px;margin:0 auto;">
      <h2 style="display:flex;align-items:center;gap:10px;">📋 Student Checklist</h2>
      ${
        notifyItems.length
          ? `<div class="checklist-alert-banner" role="alert" aria-live="polite" style="background:#ffe3e3;color:#c1272d;border-radius:10px;padding:10px 14px;margin-bottom:15px;display:flex;align-items:center;gap:10px;">
              <span style="font-size:1.3em;">⚠️</span>
              <span>You have steps that need attention before you can complete your training.</span>
            </div>`
          : ''
      }
      <div class="progress-track" style="margin-bottom:18px;position:relative;">
        <div class="progress-fill" style="width:${lastPercent}%;transition:width 0.8s cubic-bezier(.45,1.4,.5,1.02);"></div>
        <span class="progress-label" id="progress-label" aria-live="polite" tabindex="0">${percent}% Complete</span>
      </div>
      ${
        percent === 100
          ? `<div class="completion-badge" aria-live="polite" style="background:#bbffd0;color:#14692d;padding:7px 17px;border-radius:20px;font-weight:600;text-align:center;margin:0 0 12px 0;">
              🎉 All steps complete! Ready for certification.
            </div>`
          : ''
      }
      ${studentChecklistSections
        .map(
          (section) => `
            <div class="checklist-section">
              <h3 class="checklist-section-header">${section.header}</h3>
              <ul class="checklist-list">
                ${section.items
                  .map(
                    (item, idx) => `
                  <li
                    class="checklist-item${item.done ? ' done' : ''}${item.readonly ? ' readonly' : ''}"
                    ${item.notify && !item.done && !item.readonly ? 'aria-current="step"' : ''}
                    tabindex="0"
                  >
                    ${
                      item.notify && !item.done && !item.readonly
                        ? `<span class="notify-bubble" aria-label="Incomplete Step" title="This step needs attention">!</span>`
                        : ''
                    }
                    <div
                      class="checklist-item-main"
                      role="button"
                      aria-expanded="false"
                      aria-controls="details-${section.header.replace(/\s/g, '')}-${idx}"
                      tabindex="0"
                      style="display:flex;align-items:center;gap:8px;min-height:38px;user-select:none;cursor:pointer;"
                    >
                      <span class="checklist-label" style="${item.done ? 'text-decoration:line-through;color:#9fdcb7;' : ''}">
                        ${item.label}
                      </span>
                      <span class="chevron" style="margin-left:auto;font-size:1.1em;color:#999;">&#x25B6;</span>
                      ${
                        item.done
                          ? `<span class="badge badge-success" aria-label="Complete" style="animation:popCheck .28s cubic-bezier(.42,1.85,.5,1.03);">✔</span>`
                          : item.readonly
                            ? `<span class="badge badge-waiting" title="Instructor must complete" aria-label="Instructor Only">🔒</span>`
                            : `<button class="btn outline btn-sm" data-nav="${item.link}">Complete</button>`
                      }
                    </div>
                    <div
                      id="details-${section.header.replace(/\s/g, '')}-${idx}"
                      class="checklist-details"
                      style="display:none;"
                      aria-hidden="true"
                    >
                      ${item.details || ''}
                      ${
                        item.substeps
                          ? `
                        <ul class="substeps">
                          ${item.substeps
                            .map(
                              (ss) => `
                            <li${ss.done ? ' class="done"' : ''}>
                              ${ss.done ? '✅' : "<span style='color:#ff6565;font-size:1.18em;font-weight:900;vertical-align:middle;'>!</span>"} ${ss.label}
                            </li>
                          `
                            )
                            .join('')}
                        </ul>
                      `
                          : ''
                      }
                    </div>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            </div>
          `
        )
        .join('')}
      <button class="btn wide" id="back-to-dashboard-btn" style="margin-top:24px;">⬅ Back to Dashboard</button>
    </div>
  `;

  // Animate progress bar
  setTimeout(() => {
    const bar = container.querySelector('.progress-fill');
    if (bar) {
      bar.style.width = percent + '%';
      // Focus on label for screen readers if 100% or error
      if (percent === 100 || notifyItems.length) {
        const progressLabel = container.querySelector('#progress-label');
        progressLabel && progressLabel.focus();
      }
    }
  }, 50);

  // Confetti celebration (debounced)
  if (percent === 100 && window.confetti && !window.__checklistConfettiFired) {
    window.__checklistConfettiFired = true;
    setTimeout(() => {
      window.confetti();
      setTimeout(() => {
        window.__checklistConfettiFired = false;
      }, 5000);
    }, 700);
  }

  // Expand/collapse checklist details (row is clickable + keyboard)
  container.querySelectorAll('.checklist-item-main').forEach((main) => {
    main.addEventListener('click', function () {
      const li = this.closest('.checklist-item');
      const details = li.querySelector('.checklist-details');
      const chevron = li.querySelector('.chevron');
      if (!details) return;
      const expanded = li.classList.toggle('expanded');
      details.style.display = expanded ? 'block' : 'none';
      details.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      this.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (chevron) chevron.style.transform = expanded ? 'rotate(90deg)' : '';
    });
    main.addEventListener('keyup', function (e) {
      if (e.key === 'Enter' || e.key === ' ') this.click();
    });
  });

  // Checklist navigation using handleNavigation
  container.querySelectorAll('.btn[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target && target.startsWith('student-')) {
        handleNavigation(target);
      } else {
        showToast('This action is not yet available.');
        setupNavigation();
      }
    });
  });

  // Back to dashboard
  container
    .querySelector('#back-to-dashboard-btn')
    ?.addEventListener('click', () => {
      handleNavigation('student-dashboard');
    });

  setupNavigation();
}
