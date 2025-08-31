// src/utils/ui-helpers.js
// ===================================================
// React + Vite friendly UI helpers
// Centralized tips, checklists, progress, etc.
// Toaster is provided by compat shim + ToastProvider.
// Robust to mixed eldtProgress keys (email OR studentId).
// ===================================================

// --- FIREBASE IMPORTS -------------------------------------------------
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

import { showToast } from '@components/toast-compat.js'
import { auth, db } from '@utils/firebase.js'

// ===================================================
// LEGACY-TO-COMPAT TOAST EXPORTS (keep for callers)
// ===================================================
export function registerToastHandler() {
  /* legacy no-op; kept for compatibility */
}

// Light heuristic for a suggested next step
export function getNextChecklistAlert(progress = {}) {
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
  const next = order.find(k => progress?.[k] !== true)
  if (!next) return null
  return { key: next, title: 'Next step', message: labels[next], type: 'info' }
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  } catch {
    return null
  }
}

export async function showLatestUpdate() {
  const root = document.getElementById('latest-update-card')
  if (!root) return

  // Loading state
  root.innerHTML = ''
  const loading = document.createElement('div')
  loading.style.padding = '18px'
  loading.style.textAlign = 'center'
  loading.textContent = 'Loading updates...'
  root.appendChild(loading)

  const update = await fetchLatestUpdate()
  root.innerHTML = ''

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

  const safeRole = typeof role === 'string' ? role.replace(/[^\w-]/g, '').toLowerCase() : 'student'
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
  } catch {
    return getCurrentUserRole(userObj)
  }
}

export function getCurrentSchoolId(userObj = null) {
  return userObj?.schoolId || localStorage.getItem('schoolId') || 'default'
}

export function showRoleToast(message, role = null, duration = 3200) {
  const type = role === 'admin' ? 'error' : role === 'instructor' ? 'success' : 'info'
  showToast(message, type, duration)
}

// ===================================================
// ASYNC LOADER WRAPPER
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
// FIRESTORE: ELDT PROGRESS HELPERS (robust to key type)
// - Some code writes eldtProgress/<email>, others use eldtProgress/<studentId>.
// - We read *both* and write to *both* when we can resolve a mapping.
// ===================================================

/** lowercased, trimmed string */
const S = v => (v == null ? '' : String(v).trim())
const SL = v => S(v).toLowerCase()

/** try to map an email → studentId by looking up /students */
async function findStudentIdByEmail(email) {
  try {
    if (!email || !email.includes('@')) return ''
    const q = query(collection(db, 'students'), where('email', '==', SL(email)), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) return snap.docs[0].id
  } catch {
    /* non-fatal */
  }
  return ''
}

/**
 * Resolve all progress doc ids we should touch for a given user identifier.
 * - If an email is provided, returns [email, studentId?]
 * - If a non-email id is provided, returns [id]
 */
async function resolveProgressDocIds(userIdOrEmail) {
  const id = S(userIdOrEmail)
  if (!id) return []
  if (id.includes('@')) {
    const sid = await findStudentIdByEmail(id)
    return sid ? [SL(id), sid] : [SL(id)]
  }
  return [id]
}

/**
 * Upsert progress fields for a user; optionally append to history.
 * Writes to all resolved eldtProgress docs (email + studentId when known).
 * @param {string} userIdOrEmail
 * @param {object} fields
 * @param {{role?: 'student'|'instructor'|'admin'|'superadmin', logHistory?: boolean}} options
 */
export async function updateELDTProgress(userIdOrEmail, fields, options = {}) {
  const ids = await resolveProgressDocIds(userIdOrEmail)
  if (!ids.length) return false

  try {
    const { role = 'student', logHistory = false } = options
    const baseUpdate = { ...fields, lastUpdated: serverTimestamp(), role }

    // stamp *_Complete booleans
    for (const k of Object.keys(fields)) {
      if (k.endsWith('Complete') && fields[k] === true) {
        baseUpdate[`${k}At`] = serverTimestamp()
      }
    }

    // write to all resolved doc ids
    await Promise.all(
      ids.map(async id => {
        const ref = doc(db, 'eldtProgress', id)
        const snap = await getDoc(ref)
        if (snap.exists()) await updateDoc(ref, baseUpdate)
        else await setDoc(ref, { userId: id, ...baseUpdate })
        if (logHistory) {
          const historyRef = collection(ref, 'history')
          await addDoc(historyRef, {
            ...fields,
            updatedAt: serverTimestamp(),
            updatedBy: id,
            role,
          })
        }
      })
    )
    return true
  } catch (e) {
     
    console.error('❌ Error updating eldtProgress:', e)
    showToast(`Failed to update progress: ${e?.message || e}`, 'error', 4000)
    return false
  }
}

/**
 * Read progress for a user by email OR studentId.
 * Prefers the email doc when present, else falls back to studentId.
 */
export async function getUserProgress(userIdOrEmail) {
  const ids = await resolveProgressDocIds(userIdOrEmail)
  if (!ids.length) return {}
  // Prefer the first id (email if given); if empty, try the next
  for (let i = 0; i < ids.length; i++) {
    try {
      const ref = doc(db, 'eldtProgress', ids[i])
      const snap = await getDoc(ref)
      if (snap.exists()) return snap.data() || {}
    } catch {
      /* try next id */
    }
  }
  return {}
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
    { adminFlagged: true, adminNote: String(note || ''), lastActionBy: adminEmail || null },
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
  const ref = doc(db, 'eldtProgress', SL(studentEmail))
  const historyRef = collection(ref, 'studySessions')
  await addDoc(historyRef, {
    minutes: Number(minutes) || 0,
    context: String(context || ''),
    at: new Date().toISOString(),
  })
}

// Re-export for legacy callers importing from @utils/ui-helpers
export { showToast } from '@/components/toast-compat.js'