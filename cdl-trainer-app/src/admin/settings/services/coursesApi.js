// src/admin/settings/services/coursesApi.js
// ---------------------------------------------------------------------
// Courses API (settings)
// - ELDT/practice/walkthrough feature toggles per school
// ---------------------------------------------------------------------

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

import { db } from '@utils/firebase.js'

const PATH = (schoolId) => doc(db, 'schools', schoolId)

export async function getCoursesPrefs(schoolId) {
  if (!schoolId) return { enableELDT: true, enablePractice: true, enableWalkthrough: true }
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const p = data.adminPrefs?.courses || {}
  return {
    enableELDT: p.enableELDT !== false,
    enablePractice: p.enablePractice !== false,
    enableWalkthrough: p.enableWalkthrough !== false,
  }
}

export async function saveCoursesPrefs(schoolId, partial = {}) {
  if (!schoolId) throw new Error('Missing schoolId')
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const adminPrefs = data.adminPrefs || {}
  const prev = adminPrefs.courses || {}
  const next = { ...prev, ...partial }

  await setDoc(
    PATH(schoolId),
    { adminPrefs: { ...adminPrefs, courses: next }, updatedAt: serverTimestamp() },
    { merge: true }
  )
  return next
}