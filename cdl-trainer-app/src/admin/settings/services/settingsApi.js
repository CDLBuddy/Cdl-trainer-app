// src/admin/settings/services/settingsApi.js
// ======================================================================
// Admin Settings API (Firestore)
// - Storage of settings is on the schools/{schoolId} doc
// - Reads normalize into { brand, prefs }
// - Updates support partial writes for { brand } and/or { prefs }
//   * brand fields map to flat school fields: schoolName, logoUrl, primaryColor
//   * prefs are shallow-merged into adminPrefs
// ======================================================================

import { db } from '@utils/firebase.js'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

/**
 * Normalize a schools/{id} snapshot into our app shape.
 * @param {any} data
 * @returns {{ brand: {schoolName:string, logoUrl:string, primaryColor:string}, prefs: Record<string,any> }}
 */
function normalize(data = {}) {
  // Accept either flat fields or a nested brand object (defensive)
  const brandSrc = {
    schoolName: data.schoolName ?? data?.brand?.schoolName ?? '',
    logoUrl: data.logoUrl ?? data?.brand?.logoUrl ?? '',
    primaryColor: data.primaryColor ?? data?.brand?.primaryColor ?? '',
  }

  return {
    brand: brandSrc,
    prefs: data.adminPrefs || {},
  }
}

/**
 * Read settings for a school.
 * @param {string|null|undefined} schoolId
 */
export async function getSettings(schoolId) {
  if (!schoolId) return { brand: {}, prefs: {} }
  const ref = doc(db, 'schools', schoolId)
  const snap = await getDoc(ref)
  return snap.exists() ? normalize(snap.data()) : { brand: {}, prefs: {} }
}

/**
 * Update settings for a school.
 * Supports partial updates:
 *   updateSettings(id, { brand: {...} })
 *   updateSettings(id, { prefs: {...} })
 *   updateSettings(id, { brand: {...}, prefs: {...} })
 *
 * NOTE: Prefs are shallow-merged at the top level (e.g. billing/users/etc).
 * If you need deep merges inside a single prefs key, call this with that key merged already.
 *
 * @param {string} schoolId
 * @param {{brand?: Record<string,any>, prefs?: Record<string,any>}} partial
 */
export async function updateSettings(schoolId, partial = {}) {
  if (!schoolId) throw new Error('Missing schoolId')

  const ref = doc(db, 'schools', schoolId)

  // Build the update payload
  /** @type {Record<string, any>} */
  const update = { updatedAt: serverTimestamp() }

  // Brand → map into flat school fields (keeps backwards compat)
  if (partial.brand && typeof partial.brand === 'object') {
    const { schoolName, logoUrl, primaryColor, ...rest } = partial.brand
    if (typeof schoolName === 'string') update.schoolName = schoolName
    if (typeof logoUrl === 'string') update.logoUrl = logoUrl
    if (typeof primaryColor === 'string') update.primaryColor = primaryColor

    // Optionally also persist a nested brand object for future use
    // (handy if you later want to expand branding without adding more top-level fields)
    update.brand = {
      ...(rest || {}),
      ...(typeof schoolName === 'string' ? { schoolName } : {}),
      ...(typeof logoUrl === 'string' ? { logoUrl } : {}),
      ...(typeof primaryColor === 'string' ? { primaryColor } : {}),
    }
  }

  // Prefs → shallow-merge into adminPrefs
  if (partial.prefs && typeof partial.prefs === 'object') {
    // Fetch current prefs so we can merge safely
    const currentSnap = await getDoc(ref).catch(() => null)
    const current = currentSnap?.exists() ? (currentSnap.data()?.adminPrefs || {}) : {}

    update.adminPrefs = { ...current, ...partial.prefs }
  }

  // Firestore merge write
  await setDoc(ref, update, { merge: true })
}