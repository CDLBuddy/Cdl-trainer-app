// ui-helpers.js

// --- FIREBASE IMPORTS -------------------------------------------------
import { db, auth } from './firebase.js';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// --- TOAST SYSTEM -----------------------------------------------------
let toastQueue = [];
let isToastVisible = false;

export function showToast(message, duration = 3000, type = 'info') {
  toastQueue.push({ message, duration, type });
  if (!isToastVisible) showNextToast();
}

function showNextToast() {
  if (!toastQueue.length) {
    isToastVisible = false;
    return;
  }
  isToastVisible = true;
  const { message, duration, type } = toastQueue.shift();

  // Remove any existing toasts
  document.querySelectorAll('.toast-message').forEach((t) => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.tabIndex = 0;
  toast.innerHTML = `<span>${message}</span>`;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background =
    type === 'error' ? '#e35656' : type === 'success' ? '#44a368' : '#333';
  toast.style.color = '#fff';
  toast.style.padding = '12px 26px';
  toast.style.fontWeight = '500';
  toast.style.borderRadius = '7px';
  toast.style.opacity = '1';
  toast.style.boxShadow = '0 4px 18px 0 rgba(0,0,0,0.15)';
  toast.style.transition = 'opacity 0.45s cubic-bezier(.4,0,.2,1)';
  toast.style.zIndex = '99999';
  toast.style.cursor = 'pointer';
  document.body.appendChild(toast);

  toast.addEventListener('click', () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
    showNextToast();
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      showNextToast();
    }, 550);
  }, duration);
}

// --- SMART NAVIGATION (barrel/compat) ----------------------------------
export function setupNavigation() {
  // Remove duplicate listeners
  document
    .querySelectorAll('[data-nav]')
    .forEach((btn) => btn.replaceWith(btn.cloneNode(true)));
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const target = btn.getAttribute('data-nav');
        if (target) {
          history.pushState({ page: target }, '', `#${target}`);
          window.dispatchEvent(
            new PopStateEvent('popstate', { state: { page: target } })
          );
        }
      },
      { once: true }
    );
  });
}

// --- PAGE TRANSITION LOADER -------------------------------------------
export function showPageTransitionLoader() {
  const overlay = document.getElementById('page-loader');
  if (overlay) {
    overlay.style.zIndex = '12000';
    overlay.classList.remove('hidden');
  }
}
export function hidePageTransitionLoader() {
  const overlay = document.getElementById('page-loader');
  if (overlay) setTimeout(() => overlay.classList.add('hidden'), 400);
}

// --- MODAL OVERLAY (accessibility, auto-close) ------------------------
export function showModal(html) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}
export function closeModal() {
  document.querySelector('.modal-overlay')?.remove();
}

// --- AI TIP OF THE DAY ------------------------------------------------
export function getRandomAITip() {
  const tips = [
    "Remember to verbally state 'three-point brake check' word-for-word during your walkthrough exam!",
    'Use three points of contact when entering and exiting the vehicle.',
    'Take time to walk around your vehicle and inspect all lights before every trip.',
    'Keep your study streak alive for better memory retention!',
    'Ask your instructor for feedback after each practice test.',
    'When practicing pre-trip, say each step out loud--it helps lock it in.',
    'Focus on sections that gave you trouble last quiz. Practice makes perfect!',
    'Have your permit and ID ready before every test session.',
    'Use your checklist to track what you’ve mastered and what needs more review.',
  ];
  return tips[new Date().getDay() % tips.length];
}
export async function getAITipOfTheDay() {
  const tips = [
    'Review your ELDT checklist daily.',
    'Use flashcards to stay sharp!',
    'Ask the AI Coach about Class A vs B.',
    'Take timed quizzes to simulate the real test.',
    'Complete your checklist for certification.',
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

// --- TYPEWRITER HEADLINE ----------------------------------------------
const _headlines = [
  'CDL Buddy',
  'Your CDL Prep Coach',
  'Study Smarter, Not Harder',
];
let _hw = 0,
  _hc = 0;
export function startTypewriter(custom = null) {
  const el = document.getElementById('headline');
  if (!el) return;
  const headlineArr = custom || _headlines;
  if (_hc < headlineArr[_hw].length) {
    el.textContent += headlineArr[_hw][_hc++];
    setTimeout(() => startTypewriter(custom), 100);
  } else {
    setTimeout(() => {
      el.textContent = '';
      _hc = 0;
      _hw = (_hw + 1) % headlineArr.length;
      startTypewriter(custom);
    }, 2000);
  }
}

// --- DEBOUNCE ---------------------------------------------------------
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// --- CHECKLIST ALERTS -------------------------------------------------
export function getNextChecklistAlert(user = {}) {
  if (!user.cdlClass || !user.cdlPermit || !user.experience) {
    const missing = [];
    if (!user.cdlClass) missing.push('CDL class');
    if (!user.cdlPermit) missing.push('CDL permit status');
    if (!user.experience) missing.push('experience level');
    return `Complete your profile: ${missing.join(', ')}.`;
  }
  if (user.cdlPermit === 'yes' && !user.permitPhotoUrl) {
    return 'Upload a photo of your CDL permit.';
  }
  if (
    user.vehicleQualified === 'yes' &&
    (!user.truckPlateUrl || !user.trailerPlateUrl)
  ) {
    const which = [
      !user.truckPlateUrl ? 'truck' : null,
      !user.trailerPlateUrl ? 'trailer' : null,
    ]
      .filter(Boolean)
      .join(' & ');
    return `Upload your ${which} data plate photo${which.includes('&') ? 's' : ''}.`;
  }
  if (typeof user.lastTestScore === 'number' && user.lastTestScore < 80) {
    return 'Pass a practice test (80%+ required).';
  }
  if (!user.walkthroughProgress || user.walkthroughProgress < 1) {
    return 'Complete at least one walkthrough drill.';
  }
  return 'All required steps complete! 🎉';
}

// --- FADE-IN ON SCROLL ------------------------------------------------
export function initFadeInOnScroll() {
  const observer = new window.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1 }
  );
  document
    .querySelectorAll('.fade-in-on-scroll')
    .forEach((el) => observer.observe(el));
}

// --- AVATAR RENDERING -------------------------------------------------
export function renderAvatar(photoURL, name = '', size = 46) {
  if (photoURL) {
    return `<img src="${photoURL}" alt="${name}'s photo" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1.5px solid #b48aff;">`;
  }
  // fallback SVG with initials
  const initials = (name || 'CDL')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#262647;color:#b48aff;font-weight:600;font-size:${Math.floor(size / 2.2)}px;">${initials}</div>`;
}

// --- FIRESTORE: PROGRESS HELPERS --------------------------------------
export async function updateELDTProgress(userId, fields, options = {}) {
  try {
    const { role = 'student', logHistory = false } = options;
    const progressRef = doc(db, 'eldtProgress', userId);
    const snap = await getDoc(progressRef);

    const updateObj = {
      ...fields,
      lastUpdated: serverTimestamp(),
      role,
    };
    Object.keys(fields).forEach((k) => {
      if (k.endsWith('Complete') && fields[k] === true) {
        updateObj[`${k}dAt`] = serverTimestamp();
      }
    });

    if (snap.exists()) {
      await updateDoc(progressRef, updateObj);
    } else {
      await setDoc(progressRef, { userId, ...updateObj });
    }

    if (logHistory) {
      const historyRef = doc(collection(progressRef, 'history'));
      await setDoc(historyRef, {
        ...fields,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        role,
      });
    }
    return true;
  } catch (err) {
    console.error('❌ Error updating eldtProgress:', err);
    showToast?.(
      'Failed to update progress: ' + (err.message || err),
      4000,
      'error'
    );
    return false;
  }
}
export async function getUserProgress(userId) {
  const progressRef = doc(db, 'eldtProgress', userId);
  const snap = await getDoc(progressRef);
  return snap.exists() ? snap.data() : {};
}

// --- CHECKLIST FIELDS (per role) --------------------------------------
export const studentChecklistFields = [
  { key: 'profileComplete', label: 'Profile Complete' },
  { key: 'permitUploaded', label: 'Permit Uploaded' },
  { key: 'vehicleUploaded', label: 'Vehicle Data Plates Uploaded' },
  { key: 'walkthroughComplete', label: 'Walkthrough Practiced' },
  { key: 'practiceTestPassed', label: 'Practice Test Passed' },
];
export const instructorChecklistFields = [
  { key: 'profileVerified', label: 'Profile Approved' },
  { key: 'permitVerified', label: 'Permit Verified' },
  { key: 'vehicleVerified', label: 'Vehicle Verified' },
  { key: 'walkthroughReviewed', label: 'Walkthrough Reviewed' },
];
export const adminChecklistFields = [
  { key: 'adminUnlocked', label: 'Module Unlocked' },
  { key: 'adminFlagged', label: 'Flagged for Review' },
];

// --- MILESTONE HELPERS ------------------------------------------------
export async function markStudentProfileComplete(studentEmail) {
  await updateELDTProgress(
    studentEmail,
    { profileComplete: true },
    { role: 'student' }
  );
}
export async function markStudentPermitUploaded(studentEmail) {
  await updateELDTProgress(
    studentEmail,
    { permitUploaded: true },
    { role: 'student' }
  );
}
export async function markStudentVehicleUploaded(studentEmail) {
  await updateELDTProgress(
    studentEmail,
    { vehicleUploaded: true },
    { role: 'student' }
  );
}
export async function markStudentWalkthroughComplete(studentEmail) {
  await updateELDTProgress(
    studentEmail,
    { walkthroughComplete: true },
    { role: 'student' }
  );
}
export async function markStudentTestPassed(studentEmail) {
  await updateELDTProgress(
    studentEmail,
    { practiceTestPassed: true },
    { role: 'student' }
  );
}
export async function verifyStudentProfile(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { profileVerified: true },
    { role: 'instructor', logHistory: true }
  );
}
export async function verifyStudentPermit(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { permitVerified: true },
    { role: 'instructor', logHistory: true }
  );
}
export async function verifyStudentVehicle(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { vehicleVerified: true },
    { role: 'instructor', logHistory: true }
  );
}
export async function reviewStudentWalkthrough(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { walkthroughReviewed: true },
    { role: 'instructor', logHistory: true }
  );
}
export async function adminUnlockStudentModule(studentEmail, adminEmail) {
  await updateELDTProgress(
    studentEmail,
    { adminUnlocked: true },
    { role: 'admin', logHistory: true }
  );
}
export async function adminFlagStudent(studentEmail, adminEmail, note = '') {
  await updateELDTProgress(
    studentEmail,
    { adminFlagged: true, adminNote: note },
    { role: 'admin', logHistory: true }
  );
}
export async function adminResetStudentProgress(studentEmail, adminEmail) {
  await updateELDTProgress(
    studentEmail,
    {
      profileComplete: false,
      permitUploaded: false,
      vehicleUploaded: false,
      walkthroughComplete: false,
      practiceTestPassed: false,
    },
    { role: 'admin', logHistory: true }
  );
}
export async function incrementStudentStudyMinutes(studentEmail, minutes) {
  await updateELDTProgress(
    studentEmail,
    { studyMinutes: increment(minutes) },
    { role: 'student' }
  );
}
export async function logStudySession(studentEmail, minutes, context = '') {
  const progressRef = doc(db, 'eldtProgress', studentEmail);
  const historyRef = collection(progressRef, 'studySessions');
  await addDoc(historyRef, {
    minutes,
    context,
    at: new Date().toISOString(),
  });
}

// --- USER INITIALS HELPER ---------------------------------------------
export function getUserInitials(name = '') {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// --- "WHAT'S NEW" ANNOUNCEMENTS ---------------------------------------
import { getLatestUpdate } from './firebase.js';

export function formatDate(dateInput) {
  if (!dateInput) return '-';
  let d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function showLatestUpdate() {
  const updateEl = document.getElementById('latest-update-card');
  if (!updateEl) return;
  updateEl.innerHTML = `<div style="padding:18px;text-align:center;">Loading updates...</div>`;
  const update = await getLatestUpdate();
  if (!update) {
    updateEl.innerHTML = `<div class="update-empty">No recent updates.</div>`;
    return;
  }
  updateEl.innerHTML = `
    <div class="update-banner">
      <div class="update-title">📢 What's New</div>
      <div class="update-content">${update.content || '(No details)'}</div>
      <div class="update-date">${formatDate(update.date)}</div>
    </div>
  `;
}

// --- ROLE BADGE -------------------------------------------------------
export function getRoleBadge(input) {
  const role =
    input?.includes && input.includes('@')
      ? input.includes('admin@')
        ? 'admin'
        : input.includes('instructor@')
          ? 'instructor'
          : input.includes('superadmin@')
            ? 'superadmin'
            : 'student'
      : input || 'student';
  if (!role) return '';
  return `<span class="role-badge ${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`;
}

// --- INFINITE CAROUSEL UTILS ------------------------------------------
export function initCarousel() {
  const track = document.querySelector('.features-inner');
  if (!track) return;
  const half = () => track.scrollWidth / 2;
  let isPaused = false;
  const speed = 1.0;
  ['mouseenter', 'touchstart'].forEach((evt) =>
    track.addEventListener(evt, () => (isPaused = true))
  );
  ['mouseleave', 'touchend'].forEach((evt) =>
    track.addEventListener(evt, () => (isPaused = false))
  );
  function drift() {
    if (!isPaused) track.scrollLeft = (track.scrollLeft + speed) % half();
    requestAnimationFrame(drift);
  }
  requestAnimationFrame(drift); // <--- You need to start the drift loop!
}

// --- ASYNC LOADER UTILITY ---------------------------------------------
export async function withLoader(taskFn, loaderId = 'page-loader') {
  showPageTransitionLoader();
  try {
    return await taskFn();
  } finally {
    hidePageTransitionLoader();
  }
}

// --- ROLE/ORG DETECTORS -----------------------------------------------
export function getCurrentUserRole(userObj = null) {
  return (
    userObj?.role ||
    localStorage.getItem('userRole') ||
    (auth.currentUser && auth.currentUser.role) ||
    'student'
  );
}
export function getCurrentSchoolId(userObj = null) {
  return userObj?.schoolId || localStorage.getItem('schoolId') || 'default';
}

// --- ROLE-AWARE TOASTS -----------------------------------------------
export function showRoleToast(message, role = null, duration = 3200) {
  const type =
    role === 'admin' ? 'error' : role === 'instructor' ? 'success' : 'info';
  showToast(message, duration, type);
}

// --- CSV EXPORTER -----------------------------------------------------
export function exportTableToCSV(tableId, filename = 'export.csv') {
  const table = document.getElementById(tableId);
  if (!table) {
    showToast('Export failed: Table not found.', 2000, 'error');
    return;
  }
  let csv = [];
  for (let row of table.rows) {
    let rowData = [];
    for (let cell of row.cells) {
      rowData.push(`"${cell.innerText.replace(/"/g, '""')}"`);
    }
    csv.push(rowData.join(','));
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// --- POPSTATE NAVIGATION HANDLER --------------------------------------
export function handlePopStateNavigation(navigateFn) {
  window.addEventListener('popstate', (e) => {
    const page =
      (e.state && e.state.page) ||
      (window.location.hash || '').replace(/^#/, '');
    if (page) navigateFn(page);
  });
}
