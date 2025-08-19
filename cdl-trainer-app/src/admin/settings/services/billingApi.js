// src/admin/settings/services/billingApi.js
// ---------------------------------------------------------------------
// Billing API (settings)
// - Reads/writes under schools/{id}.adminPrefs.billing
// - Non-destructive merge of adminPrefs
// ---------------------------------------------------------------------

import { db } from '@utils/firebase.js'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const PATH = (schoolId) => doc(db, 'schools', schoolId)

/** Read billing prefs with sensible defaults */
export async function getBillingPrefs(schoolId) {
  if (!schoolId) return { mode: 'employer', currency: 'USD', invoicePrefix: '', acceptedMethods: ['card'], defaultTermsNetDays: 15, autopay: false }
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const p = data.adminPrefs?.billing || {}
  return {
    mode: p.mode || 'employer',                // 'student' | 'employer'
    currency: p.currency || 'USD',
    invoicePrefix: p.invoicePrefix || '',
    acceptedMethods: Array.isArray(p.acceptedMethods) ? p.acceptedMethods : ['card'],
    defaultTermsNetDays: Number.isFinite(p.defaultTermsNetDays) ? p.defaultTermsNetDays : 15,
    autopay: !!p.autopay,
  }
}

/** Merge + save billing prefs into adminPrefs.billing */
export async function saveBillingPrefs(schoolId, partial = {}) {
  if (!schoolId) throw new Error('Missing schoolId')

  // Read current to merge safely
  const snap = await getDoc(PATH(schoolId))
  const data = snap.exists() ? snap.data() : {}
  const adminPrefs = data.adminPrefs || {}
  const prev = adminPrefs.billing || {}

  const next = { ...prev, ...partial }

  await setDoc(
    PATH(schoolId),
    { adminPrefs: { ...adminPrefs, billing: next }, updatedAt: serverTimestamp() },
    { merge: true }
  )
  return next
}