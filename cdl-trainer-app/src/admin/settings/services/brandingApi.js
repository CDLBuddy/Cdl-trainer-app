// src/admin/settings/services/brandingApi.js
// ---------------------------------------------------------------------
// Branding API
// - Read/update school branding (name, primaryColor, logoUrl)
// - Upload logo to Firebase Storage
// ---------------------------------------------------------------------

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage'

import { db, storage } from '@utils/firebase.js'

/** Get current branding (normalized to your app shape) */
export async function getBranding(schoolId) {
  if (!schoolId) return { schoolName: '', primaryColor: '', logoUrl: '' }
  const ref = doc(db, 'schools', schoolId)
  const snap = await getDoc(ref)
  const data = snap.exists() ? snap.data() : {}
  return {
    schoolName: data.schoolName || '',
    primaryColor: data.primaryColor || '',
    logoUrl: data.logoUrl || '',
  }
}

/** Save branding (non-destructive merge) */
export async function saveBranding(schoolId, partial = {}) {
  if (!schoolId) throw new Error('Missing schoolId')
  const ref = doc(db, 'schools', schoolId)
  const payload = {}

  if (partial.schoolName != null) payload.schoolName = partial.schoolName
  if (partial.primaryColor != null) payload.primaryColor = partial.primaryColor
  if (partial.logoUrl != null) payload.logoUrl = partial.logoUrl

  await setDoc(
    ref,
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

/**
 * Upload a logo file and persist the URL on the school doc.
 * @returns {Promise<string>} download URL
 */
export async function uploadLogo(schoolId, file) {
  if (!schoolId) throw new Error('Missing schoolId')
  if (!file) throw new Error('No file provided')

  const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
  const path = `school-logos/${schoolId}/logo.${ext}`
  const sref = storageRef(storage, path)

  await uploadBytes(sref, file)
  const url = await getDownloadURL(sref)

  await saveBranding(schoolId, { logoUrl: url })
  return url
}

/** Optional: remove logo file and clear url */
export async function deleteLogo(schoolId) {
  if (!schoolId) throw new Error('Missing schoolId')
  const ref = doc(db, 'schools', schoolId)
  const snap = await getDoc(ref)
  const url = snap.exists() ? snap.data().logoUrl || '' : ''
  if (!url) {
    // clear anyway
    await saveBranding(schoolId, { logoUrl: '' })
    return
  }

  // Try to delete the object if it’s in our bucket path
  try {
    // crude path guess (only safe if you used uploadLogo)
    const path = new URL(url).pathname
      .replace(/^\/v0\/b\/[^/]+\/o\//, '')
      .replace(/%2F/g, '/')
    await deleteObject(storageRef(storage, path))
  } catch {
    // best-effort; don’t throw on opaque URLs
  }

  await saveBranding(schoolId, { logoUrl: '' })
}
