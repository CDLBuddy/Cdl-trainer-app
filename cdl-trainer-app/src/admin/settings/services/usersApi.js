// src/admin/settings/services/usersApi.js
// ---------------------------------------------------------------------
// Users API (settings)
// - Default role, invites template, profile requirements
// ---------------------------------------------------------------------

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from '@utils/firebase.js'

const PATH = schoolId => doc(db, 'schools', schoolId)

export async function getUsersPrefs(schoolId) {
  if (!schoolId) {
    return {
      inviteEmailTemplate: 'default',
      defaultRole: 'student',
      requireProfileBeforeEnroll: true,
      requiredFields: ['name', 'phone', 'address'], // used by signup gate if needed
    }
  }
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const p = data.adminPrefs?.users || {}
  return {
    inviteEmailTemplate: p.inviteEmailTemplate || 'default',
    defaultRole: p.defaultRole || 'student',
    requireProfileBeforeEnroll: p.requireProfileBeforeEnroll !== false,
    requiredFields:
      Array.isArray(p.requiredFields) && p.requiredFields.length
        ? p.requiredFields
        : ['name', 'phone', 'address'],
  }
}

export async function saveUsersPrefs(schoolId, partial = {}) {
  if (!schoolId) throw new Error('Missing schoolId')
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const adminPrefs = data.adminPrefs || {}
  const prev = adminPrefs.users || {}
  const next = { ...prev, ...partial }

  await setDoc(
    PATH(schoolId),
    {
      adminPrefs: { ...adminPrefs, users: next },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  return next
}
