// src/utils/ui-helpers.js
// ===================================================
// React + Vite friendly UI helpers
// Centralized tips, checklists, progress, etc.
// Toaster is provided by compat shim + ToastContext.
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

// Prefer alias here to avoid resolver edge cases
import { showToast } from '@components/toast-compat.js'
import { db, auth } from '@utils/firebase.js'

// Toast: use compat (routes to React provider when bound, DOM otherwise)

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
// SMALL UTILITIES
// ===================================================
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ===================================================
// "WHAT'S NEW" / LATEST UPDATE
// ===================================================
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
    return null
  }
}

// Legacy imperative version (safe no-op if the element is missing)
export async function showLatestUpdate() {
  const updateEl = document.getElementById('latest-update-card')
  if (!updateEl) return
  updateEl.innerHTML = `<div style="padding:18px;text-align:center;">Loading updates...</div>`
  const update = await fetchLatestUpdate()
  if (!update) {
    updateEl.innerHTML = `<div class="update-empty">No recent updates.</div>`
    return
  }
  updateEl.innerHTML = `
    <div class="update-banner">
      <div class="update-title">📢 What's New</div>
      <div class="update-content">${update.content || '(No details)'} </div>
      <div class="update-date">${formatDate(update.date)}</div>
    </div>
  `
}

// ===================================================
// ROLE HELPERS
// ===================================================
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
  if (!role) return ''
  return `<span class="role-badge ${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`
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
  showToast(message, type, duration) // compat supports both arg orders
}

// ===================================================
// ASYNC LOADER UTILITY
// ===================================================
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
export { showToast }
