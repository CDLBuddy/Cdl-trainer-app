// src/utils/school-switching.js
// ======================================================================
// School Switching Utilities
// - No direct toasts (pass an optional notify callback)
// - SSR-safe guards for window/localStorage
// - Branding event uses shared BRAND_EVENT; also emits "school:switched"
// - Applies primary color to CSS vars when a school object is supplied
// ======================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

import { auth, db } from './firebase.js'
import { BRAND_EVENT } from './school-branding.js'

// Non-visual event fired after a successful switch
export const SCHOOL_SWITCHED_EVENT = 'school:switched'

// ----------------------------------------------------------------------
// SSR-safe runtime helpers
// ----------------------------------------------------------------------
const IS_BROWSER =
  typeof window !== 'undefined' && typeof document !== 'undefined'

function getLS(key, fallback = null) {
  if (!IS_BROWSER) return fallback
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function setLS(key, value) {
  if (!IS_BROWSER) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* no-op */
  }
}

function setCSSVar(name, value) {
  if (!IS_BROWSER) return
  try {
    document.documentElement.style.setProperty(name, value)
  } catch {
    /* no-op */
  }
}

function setMetaThemeColor(color) {
  if (!IS_BROWSER || !color) return
  try {
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', color)
  } catch {
    /* no-op */
  }
}

// ----------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------
export function getDashboardRoute(role) {
  switch (role) {
    case 'superadmin':
      return '/superadmin/dashboard'
    case 'admin':
      return '/admin/dashboard'
    case 'instructor':
      return '/instructor/dashboard'
    case 'student':
    default:
      return '/student/dashboard'
  }
}

// ----------------------------------------------------------------------
// Current user/school getters (safe)
// ----------------------------------------------------------------------
export function getCurrentUserEmail() {
  if (auth?.currentUser?.email) return auth.currentUser.email
  if (IS_BROWSER && window.currentUserEmail) return window.currentUserEmail
  return getLS('currentUserEmail', null)
}

export function getCurrentUserRole(fallback = 'student') {
  if (IS_BROWSER && window.currentUserRole) return window.currentUserRole
  return getLS('userRole', fallback)
}

export function getCurrentSchoolId() {
  return getLS('schoolId', '')
}

// ----------------------------------------------------------------------
// Branding preload & broadcast
// Applies basic branding pieces and primary color CSS vars immediately.
// Prefer the full branding module for richer behavior when available.
// ----------------------------------------------------------------------
export function applyBrandingForSchool(school) {
  if (!school) return
  try {
    const logoUrl = school?.logoUrl || ''
    const schoolName = school?.schoolName || school?.name || ''
    const primaryColor = school?.primaryColor || ''

    // lightweight cache
    setLS('branding.logoUrl', logoUrl)
    setLS('branding.schoolName', schoolName)
    if (primaryColor) setLS('branding.primaryColor', primaryColor)

    // apply CSS vars to align with theme tokens
    if (primaryColor) {
      setCSSVar('--brand-primary', primaryColor)
      setCSSVar('--brand-light', primaryColor)
      setCSSVar('--accent', primaryColor)
      setMetaThemeColor(primaryColor)
    }

    // broadcast using shared constant
    if (IS_BROWSER) {
      window.dispatchEvent(
        new CustomEvent(BRAND_EVENT, {
          detail: { logoUrl, schoolName, primaryColor },
        })
      )
    }
  } catch {
    /* no-op */
  }
}

// ----------------------------------------------------------------------
// Data helpers
// NOTE: This returns all schools (including disabled). If you need a
// filtered list, use your fetchSchoolsFromFirestore() helper instead.
// ----------------------------------------------------------------------
export async function listAllSchools() {
  const snap = await getDocs(collection(db, 'schools'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getUserAssignedSchoolIds(email) {
  let assigned = []

  const rolesSnap = await getDocs(
    query(collection(db, 'userRoles'), where('email', '==', email))
  )
  rolesSnap.forEach(docSnap => {
    const d = docSnap.data()
    if (Array.isArray(d.assignedSchools)) assigned = d.assignedSchools
    else if (d.schoolId) assigned = [d.schoolId]
    else if (Array.isArray(d.schools)) assigned = d.schools // legacy
  })

  if (assigned.length === 0) {
    const userDoc = await getDoc(doc(db, 'users', email))
    if (userDoc.exists()) {
      const d = userDoc.data()
      if (d?.schoolId) assigned = [d.schoolId]
    }
  }
  return assigned
}

export function computeAllowedSchools(userRole, userSchoolIds, allSchools) {
  if (userRole === 'superadmin' || userSchoolIds.includes('all'))
    return allSchools
  if (!userSchoolIds.length) return []
  const set = new Set(userSchoolIds)
  return allSchools.filter(s => set.has(s.id))
}

// ----------------------------------------------------------------------
// Switch school (decoupled toasts; emits events)
// Options:
//   - persistServer: boolean (default true)
//   - schoolObj: optional school object to immediately apply branding
//   - notify: optional function (msg: string, opts?: { variant?: 'error'|'info'|'success' })
// ----------------------------------------------------------------------
export async function switchSchool(
  schoolId,
  { persistServer = true, schoolObj = null, notify } = {}
) {
  if (!schoolId) {
    // No direct toast here (ESLint rule); let caller decide
    notify?.('Invalid school.', { variant: 'error' })
    return { ok: false }
  }

  setLS('schoolId', schoolId)

  // If provided, apply branding immediately
  if (schoolObj) applyBrandingForSchool(schoolObj)

  const email = getCurrentUserEmail()
  if (persistServer && email) {
    try {
      await setDoc(
        doc(db, 'users', email),
        { lastSchoolId: schoolId, lastSchoolSwitchedAt: serverTimestamp() },
        { merge: true }
      )
    } catch {
      // non-fatal
    }
  }

  // Notify the app shell / dashboards to refresh school-scoped data
  if (IS_BROWSER) {
    try {
      window.dispatchEvent(
        new CustomEvent(SCHOOL_SWITCHED_EVENT, {
          detail: { schoolId, at: Date.now() },
        })
      )
    } catch {
      /* no-op */
    }
  }

  return { ok: true, schoolId }
}