// src/utils/school-switching.js
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { auth, db } from './firebase'
import { showToast } from './ui-helpers'

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

export function getCurrentUserEmail() {
  return (
    auth.currentUser?.email ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    null
  )
}
export function getCurrentUserRole(fallback = 'student') {
  return localStorage.getItem('userRole') || window.currentUserRole || fallback
}
export function getCurrentSchoolId() {
  return localStorage.getItem('schoolId') || ''
}

// ---------- NEW: Branding preload (logo only for now) ----------
export function applyBrandingForSchool(school) {
  try {
    const logoUrl = school?.logoUrl || ''
    const schoolName = school?.schoolName || school?.name || ''
    localStorage.setItem('branding.logoUrl', logoUrl)
    localStorage.setItem('branding.schoolName', schoolName)
    // broadcast so your layout/topbar can update immediately
    window.dispatchEvent(
      new CustomEvent('branding:updated', { detail: { logoUrl, schoolName } })
    )
  } catch {
    /* no-op */
  }
}

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

/**
 * Switch the active school: saves ID locally, stamps lastSchool server-side,
 * and (optionally) pre-applies branding if you pass the school object.
 */
export async function switchSchool(
  schoolId,
  { persistServer = true, schoolObj = null } = {}
) {
  if (!schoolId) {
    showToast('Invalid school.', 2000, 'error')
    return { ok: false }
  }
  localStorage.setItem('schoolId', schoolId)

  // If the caller passed the school object, apply branding now
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
      /* non-fatal */
    }
  }

  return { ok: true, schoolId }
}
