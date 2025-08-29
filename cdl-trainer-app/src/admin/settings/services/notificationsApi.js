// src/admin/settings/services/notificationsApi.js
// ---------------------------------------------------------------------
// Notifications API (settings)
// - schools/{id}.adminPrefs.notifications
// ---------------------------------------------------------------------

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

import { db } from '@utils/firebase.js'

const PATH = schoolId => doc(db, 'schools', schoolId)

export async function getNotificationsPrefs(schoolId) {
  if (!schoolId) return { email: true, sms: false, weeklyDigest: true }
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const p = data.adminPrefs?.notifications || {}
  return {
    email: p.email !== false, // default true
    sms: !!p.sms, // default false
    weeklyDigest: p.weeklyDigest !== false, // default true
  }
}

export async function saveNotificationsPrefs(schoolId, partial = {}) {
  if (!schoolId) throw new Error('Missing schoolId')
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const adminPrefs = data.adminPrefs || {}
  const prev = adminPrefs.notifications || {}
  const next = { ...prev, ...partial }

  await setDoc(
    PATH(schoolId),
    {
      adminPrefs: { ...adminPrefs, notifications: next },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  return next
}
