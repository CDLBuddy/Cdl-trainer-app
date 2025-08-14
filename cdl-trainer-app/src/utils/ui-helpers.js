// src/utils/ui-helpers.js
// ===================================================
// React + Vite friendly UI helpers
// Centralized tips, checklists, progress, etc.
// Toaster is provided by compat shim + ToastProvider.
// ===================================================

// --- FIREBASE IMPORTS -------------------------------------------------
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore'

// Prefer aliases to avoid resolver edge cases (configure in vite.config.js)
import { showToast } from '@components/toast-compat.js'
import { db, auth } from '@utils/firebase.js'

// Back-compat: several files import the toast hook and helpers from here.
// Keep these exports so you don’t have to edit every caller at once.
export { useToast } from '@components/useToast.js'
export function registerToastHandler() {
  // Legacy no-op (kept for compatibility).
  // Historically used to bind a global toast function before React was mounted.
}
export function getNextChecklistAlert(progress = {}) {
  // Lightweight heuristic to suggest the next checklist step
  const order = [
    'profileComplete',
    'permitUploaded',
    'vehicleUploaded',
    'walkthroughComplete',
    'practiceTestPassed',
  ]
  const labels = {
    profileComplete: 'Complete your profile',
    permitUploaded: 'Upload your CLP/permit',
    vehicleUploaded: 'Upload your vehicle info',
    walkthroughComplete: 'Finish your walkthrough practice',
    practiceTestPassed: 'Pass a practice test',
  }
  const next = order.find((k) => progress?.[k] !== true)
  if (!next) return null
  return {
    key: next,
    title: 'Next step',
    message: labels[next],
    type: 'info',
  }
}

// ===================================================
// SMALL UTILITIES (shared)
// ===================================================

/** Basic HTML-escape to safely render untrusted strings into the DOM */
function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Debounce helper (trailing) */
export function debounce(fn, wait) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = window.setTimeout(() => fn(...args), wait)
  }
}

export function getUserInitials(name = '') {
  if (!name) return 'U'
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDate(dateInput) {
  if (!dateInput) return '-'
  const d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ===================================================
// PAGE TRANSITION LOADER (optional DOM overlay)
// ===================================================
export function showPageTransitionLoader() {
  const overlay = document.getElementById('page-loader')
  if (overlay) {
    overlay.style.zIndex = '12000'
    overlay.classList.remove('hidden')
  }
}

export function hidePageTransitionLoader() {
  const overlay = document.getElementById('page-loader')
  if (overlay) window.setTimeout(() => overlay.classList.add('hidden'), 400)
}

// ===================================================
// AI TIPS
// ===================================================
const STATIC_TIPS = [
  "Remember to verbally state 'three-point brake check' word-for-word during your walkthrough exam!",
  'Use three points of contact when entering and exiting the vehicle.',
  'Take time to walk around your vehicle and inspect all lights before every trip.',
  'Keep your study streak alive for better memory retention!',
  'Ask your instructor for feedback after each practice test.',
  'When practicing pre-trip, say each step out loud—it helps lock it in.',
  'Focus on sections that gave you trouble last quiz. Practice makes perfect!',
  'Have your permit and ID ready before every test session.',
  'Use your checklist to track what you’ve mastered and what needs more review.',
]

export function getRandomAITip() {
  // Simple deterministic rotation by weekday
  return STATIC_TIPS[new Date().getDay() % STATIC_TIPS.length]
}

export async function getAITipOfTheDay() {
  const tips = [
    'Review your ELDT checklist daily.',
    'Use flashcards to stay sharp!',
    'Ask the AI Coach about Class A vs B.',
    'Take timed quizzes to simulate the real test.',
    'Complete your checklist for certification.',
  ]
  return tips[Math.floor(Math.random() * tips.length)]
}

// ===================================================
// TYPEWRITER HEADLINE (legacy optional)
// ===================================================
const _headlines = ['CDL Buddy', 'Your CDL Prep Coach', 'Study Smarter, Not Harder']
let _hw = 0
let _hc = 0

export function startTypewriter(custom = null) {
  const el = document.getElementById('headline')
  if (!el) return
  const headlineArr = custom || _headlines
  if (_hc < headlineArr[_hw].length) {
    el.textContent += headlineArr[_hw][_hc++]
    window.setTimeout(() => startTypewriter(custom), 100)
  } else {
    window.setTimeout(() => {
      el.textContent = ''
      _hc = 0
      _hw = (_hw + 1) % headlineArr.length
      startTypewriter(custom)
    }, 2000)
  }
}

// ===================================================
// "WHAT'S NEW" / LATEST UPDATE
// ===================================================
/**
 * Fetch the latest update from Firestore.
 * @returns {Promise<object|null>}
 */
export async function fetchLatestUpdate() {
  try {
    const q = query(collection(db, 'updates'), orderBy('date', 'desc'), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const docSnap = snap.docs[0]
      return { id: docSnap.id, ...docSnap.data() }
    }
    const fallback = await getDoc(doc(db, 'updates', 'latest'))
    return fallback.exists() ? fallback.data() : null
  } catch (_e) {
    // Non-fatal: UI can show "No recent updates."
    return null
  }
}

/**
 * Legacy imperative renderer (safe: avoids unsafe HTML injection).
 * Renders into #latest-update-card if present.
 */
export async function showLatestUpdate() {
  const root = document.getElementById('latest-update-card')
  if (!root) return

  // Loading state
  root.innerHTML = '' // clear
  const loading = document.createElement('div')
  loading.style.padding = '18px'
  loading.style.textAlign = 'center'
  loading.textContent = 'Loading updates...'
  root.appendChild(loading)

  const update = await fetchLatestUpdate()
  root.innerHTML = '' // clear

  if (!update) {
    const empty = document.createElement('div')
    empty.className = 'update-empty'
    empty.textContent = 'No recent updates.'
    root.appendChild(empty)
    return
  }

  const banner = document.createElement('div')
  banner.className = 'update-banner'

  const title = document.createElement('div')
  title.className = 'update-title'
  title.textContent = '📢 What’s New'

  const content = document.createElement('div')
  content.className = 'update-content'
  // Escape user-provided content to avoid XSS
  content.innerHTML = escapeHTML(update.content || '(No details)')

  const date = document.createElement('div')
  date.className = 'update-date'
  date.textContent = formatDate(update.date)

  banner.appendChild(title)
  banner.appendChild(content)
  banner.appendChild(date)
  root.appendChild(banner)
}

// ===================================================
// ROLE HELPERS
// ===================================================

/**
 * Render a small role badge (HTML string).
 * Note: result is a string; when inserting into the DOM, prefer element.textContent
 * for the role label if you’re not expecting HTML.
 */
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
      : input || 'student'

  const safeRole =
    typeof role === 'string'
      ? role.replace(/[^\w-]/g, '').toLowerCase()
      : 'student'

  const label = safeRole.charAt(0).toUpperCase() + safeRole.slice(1)
  return `<span class="role-badge ${safeRole}">${escapeHTML(label)}</span>`
}

export function getCurrentUserRole(userObj = null) {
  return (
    userObj?.role ||
    localStorage.getItem('userRole') ||
    (auth.currentUser && auth.currentUser.role) ||
    'student'
  )
}

export async function getCurrentUserRoleAsync(userObj = null) {
  try {
    if (userObj?.role) return userObj.role
    if (!auth?.currentUser) return getCurrentUserRole(userObj)
    const token = await auth.currentUser.getIdTokenResult(true)
    return token.claims.role || getCurrentUserRole(userObj)
  } catch (_e) {
    return getCurrentUserRole(userObj)
  }
}

export function getCurrentSchoolId(userObj = null) {
  return userObj?.schoolId || localStorage.getItem('schoolId') || 'default'
}

export function showRoleToast(message, role = null, duration = 3200) {
  const type = role === 'admin' ? 'error' : role === 'instructor' ? 'success' : 'info'
  // Compat supports both (msg,type,duration) and (msg,duration,type)
  showToast(message, type, duration)
}

// ===================================================
// ASYNC LOADER WRAPPER
// ===================================================
/** Wrap a promise-returning function with a page overlay loader. */
export async function withLoader(taskFn) {
  showPageTransitionLoader()
  try {
    return await taskFn()
  } finally {
    hidePageTransitionLoader()
  }
}

// ===================================================
// FIRESTORE: ELDT PROGRESS HELPERS
// ===================================================

/**
 * Upsert progress fields for a user; optionally append to history.
 * @param {string} userId
 * @param {object} fields
 * @param {{role?: 'student'|'instructor'|'admin'|'superadmin', logHistory?: boolean}} options
 */
export async function updateELDTProgress(userId, fields, options = {}) {
  try {
    const { role = 'student', logHistory = false } = options
    const progressRef = doc(db, 'eldtProgress', userId)
    const snap = await getDoc(progressRef)

    const updateObj = {
      ...fields,
      lastUpdated: serverTimestamp(),
      role,
    }

    // Automatically add timestamp fields for *_Complete booleans
    Object.keys(fields).forEach(k => {
      if (k.endsWith('Complete') && fields[k] === true) {
        updateObj[`${k}At`] = serverTimestamp()
      }
    })

    if (snap.exists()) {
      await updateDoc(progressRef, updateObj)
    } else {
      await setDoc(progressRef, { userId, ...updateObj })
    }

    if (logHistory) {
      const historyRef = collection(progressRef, 'history')
      await addDoc(historyRef, {
        ...fields,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        role,
      })
    }
    return true
  } catch (_e) {
    console.error('❌ Error updating eldtProgress:', _e)
    showToast(`Failed to update progress: ${_e?.message || _e}`, 'error', 4000)
    return false
  }
}

export async function getUserProgress(userId) {
  const progressRef = doc(db, 'eldtProgress', userId)
  const snap = await getDoc(progressRef)
  return snap.exists() ? snap.data() : {}
}

// --- CHECKLIST MILESTONES ---------------------------------------------
export async function markStudentProfileComplete(studentEmail) {
  await updateELDTProgress(studentEmail, { profileComplete: true }, { role: 'student' })
}
export async function markStudentPermitUploaded(studentEmail) {
  await updateELDTProgress(studentEmail, { permitUploaded: true }, { role: 'student' })
}
export async function markStudentVehicleUploaded(studentEmail) {
  await updateELDTProgress(studentEmail, { vehicleUploaded: true }, { role: 'student' })
}
export async function markStudentWalkthroughComplete(studentEmail) {
  await updateELDTProgress(studentEmail, { walkthroughComplete: true }, { role: 'student' })
}
export async function markStudentTestPassed(studentEmail) {
  await updateELDTProgress(studentEmail, { practiceTestPassed: true }, { role: 'student' })
}
export async function verifyStudentProfile(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { profileVerified: true, lastVerifiedBy: instructorEmail || null },
    { role: 'instructor', logHistory: true }
  )
}
export async function verifyStudentPermit(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { permitVerified: true, lastVerifiedBy: instructorEmail || null },
    { role: 'instructor', logHistory: true }
  )
}
export async function verifyStudentVehicle(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { vehicleVerified: true, lastVerifiedBy: instructorEmail || null },
    { role: 'instructor', logHistory: true }
  )
}
export async function reviewStudentWalkthrough(studentEmail, instructorEmail) {
  await updateELDTProgress(
    studentEmail,
    { walkthroughReviewed: true, lastVerifiedBy: instructorEmail || null },
    { role: 'instructor', logHistory: true }
  )
}
export async function adminUnlockStudentModule(studentEmail, adminEmail) {
  await updateELDTProgress(
    studentEmail,
    { adminUnlocked: true, lastActionBy: adminEmail || null },
    { role: 'admin', logHistory: true }
  )
}
export async function adminFlagStudent(studentEmail, adminEmail, note = '') {
  await updateELDTProgress(
    studentEmail,
    {
      adminFlagged: true,
      adminNote: String(note || ''),
      lastActionBy: adminEmail || null,
    },
    { role: 'admin', logHistory: true }
  )
}
export async function adminResetStudentProgress(studentEmail, _adminEmail) {
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
  )
}
export async function incrementStudentStudyMinutes(studentEmail, minutes) {
  const m = Number(minutes) || 0
  if (!m) return
  await updateELDTProgress(studentEmail, { studyMinutes: increment(m) }, { role: 'student' })
}
export async function logStudySession(studentEmail, minutes, context = '') {
  const progressRef = doc(db, 'eldtProgress', studentEmail)
  const historyRef = collection(progressRef, 'studySessions')
  await addDoc(historyRef, {
    minutes: Number(minutes) || 0,
    context: String(context || ''),
    at: new Date().toISOString(),
  })
}

// Re-export for legacy callers importing from @utils/ui-helpers
export { showToast } from '@/components/ToastContext.js'
