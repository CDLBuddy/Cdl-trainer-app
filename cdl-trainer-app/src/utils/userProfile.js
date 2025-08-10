// src/utils/userProfile.js
// =====================================
// User profile utilities + Firestore sync (centralized)
// =====================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from './firebase'

/** Keys that count toward profile completion (keep in sync with UI) */
export const PROFILE_PROGRESS_KEYS = [
  'name',
  'dob',
  'profilePicUrl',
  'cdlClass',
  'endorsements', // array length > 0 counts as filled
  'restrictions', // array length > 0 counts as filled
  'experience',
  'cdlPermit',
  'permitPhotoUrl',
  'driverLicenseUrl',
  'medicalCardUrl',
  'vehicleQualified',
  'truckPlateUrl',
  ['emergencyName', 'emergencyPhone'], // both required for this check
  'waiverSigned',
]

/** Create a new blank user profile */
export function getBlankUserProfile({
  user = {},
  userRole = 'student',
  schoolIdVal = '',
}) {
  const safeDate = new Date().toISOString()
  return {
    // Basic info
    name: user.displayName || '',
    dob: '',
    profilePicUrl: '',

    // CDL & endorsements
    cdlClass: '',
    endorsements: [],
    restrictions: [],
    experience: '',

    // Assignments
    assignedCompany: '',
    assignedInstructor: '',

    // CDL Permit
    cdlPermit: '',
    permitPhotoUrl: '',
    permitExpiry: '',

    // Driver License
    driverLicenseUrl: '',
    licenseExpiry: '',

    // Medical Card
    medicalCardUrl: '',
    medCardExpiry: '',

    // Vehicle Qualification
    vehicleQualified: '',
    truckPlateUrl: '',
    trailerPlateUrl: '',

    // Emergency Contact
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',

    // Waiver
    waiverSigned: false,
    waiverSignature: '',

    // Course & Schedule
    course: '',
    schedulePref: '',
    scheduleNotes: '',

    // Payment
    paymentStatus: '',
    paymentProofUrl: '',

    // Accessibility / accommodations
    accommodation: '',
    studentNotes: '',

    // Progress tracking
    profileProgress: 0,
    profileUpdatedAt: null,
    lastUpdatedBy: '',

    // System data
    email: user.email || '',
    role: userRole,
    schoolId: schoolIdVal,
    createdAt: safeDate,
    uid: user.uid || '',
  }
}

/** Calculate completion using the canonical keys above */
export function calculateProfileCompletion(
  profile = {},
  keys = PROFILE_PROGRESS_KEYS
) {
  if (!profile || typeof profile !== 'object') return 0

  const total = keys.length
  let filled = 0

  for (const key of keys) {
    if (Array.isArray(key)) {
      // compound requirement: all must be truthy
      const allTrue = key.every(k => Boolean(profile[k]))
      if (allTrue) filled++
      continue
    }

    const value = profile[key]

    if (Array.isArray(value)) {
      if (value.length > 0) filled++
    } else if (typeof value === 'boolean') {
      if (value) filled++
    } else {
      if (value) filled++
    }
  }

  return Math.round((filled / total) * 100)
}

/** Return a new object with progress + timestamps applied */
export function updateProfileProgress(profile = {}, updatedBy = 'system') {
  const progress = calculateProfileCompletion(profile)
  return {
    ...profile,
    profileProgress: progress,
    profileUpdatedAt: serverTimestamp(),
    lastUpdatedBy: updatedBy,
  }
}

/** Create or merge-save a full profile, auto-updating progress */
export async function saveUserProfileToFirestore(
  profile = {},
  updatedBy = 'system'
) {
  const email = profile?.email
  if (!email) throw new Error('Cannot save profile without an email.')

  // Merge with existing (if any) before computing progress to avoid regressions
  const ref = doc(db, 'users', email)
  const snap = await getDoc(ref)
  const merged = { ...(snap.exists() ? snap.data() : {}), ...profile }
  const withProgress = updateProfileProgress(merged, updatedBy)

  try {
    await setDoc(ref, withProgress, { merge: true })
    return { success: true, data: withProgress }
  } catch (error) {
    console.error('Error saving user profile:', error)
    return { success: false, error }
  }
}

/**
 * Update a subset of fields for a user, safely:
 * - Fetch the current doc
 * - Merge current + fields
 * - Recompute progress
 * - updateDoc
 */
export async function updateUserProfileFields(
  email,
  fields = {},
  updatedBy = 'system'
) {
  if (!email) throw new Error('Email is required to update profile.')

  const ref = doc(db, 'users', email)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    // If doc is missing, treat as create with minimal data
    const init = updateProfileProgress({ email, ...fields }, updatedBy)
    await setDoc(ref, init, { merge: true })
    return { success: true, data: init }
  }

  const current = snap.data() || {}
  const merged = { ...current, ...fields, email }
  const withProgress = updateProfileProgress(merged, updatedBy)

  try {
    await updateDoc(ref, withProgress)
    return { success: true, data: withProgress }
  } catch (error) {
    console.error('Error updating profile fields:', error)
    return { success: false, error }
  }
}
