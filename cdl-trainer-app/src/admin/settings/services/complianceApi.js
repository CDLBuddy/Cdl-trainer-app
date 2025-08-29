// src/admin/settings/services/complianceApi.js
// ---------------------------------------------------------------------
// Compliance API (settings)
// - Document requirements & reminder windows
// ---------------------------------------------------------------------

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from '@utils/firebase.js'

const PATH = schoolId => doc(db, 'schools', schoolId)

export async function getCompliancePrefs(schoolId) {
  if (!schoolId)
    return { requiredDocs: ['insurance', 'bonding'], notifyBeforeDays: 30 }
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const p = data.adminPrefs?.compliance || {}
  return {
    requiredDocs:
      Array.isArray(p.requiredDocs) && p.requiredDocs.length
        ? p.requiredDocs
        : ['insurance', 'bonding'],
    notifyBeforeDays: Number.isFinite(p.notifyBeforeDays)
      ? p.notifyBeforeDays
      : 30,
  }
}

export async function saveCompliancePrefs(schoolId, partial = {}) {
  if (!schoolId) throw new Error('Missing schoolId')
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const adminPrefs = data.adminPrefs || {}
  const prev = adminPrefs.compliance || {}
  const next = { ...prev, ...partial }

  await setDoc(
    PATH(schoolId),
    {
      adminPrefs: { ...adminPrefs, compliance: next },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  return next
}
