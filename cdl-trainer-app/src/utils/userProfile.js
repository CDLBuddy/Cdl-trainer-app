// src/utils/userProfile.js
// ======================================================================
// User profile utilities + Firestore sync (centralized)
// - Canonical progress keys
// - Create/get/update helpers (merge-safe)
// - Live subscription (optional)
// - Light normalization + write coalescing
// ======================================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'

import { db } from './firebase.js'

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

/** Optional: restrict which fields we accept on writes (defense-in-depth) */
const FIELD_WHITELIST = new Set([
  // basic
  'name', 'dob', 'profilePicUrl',
  // cdl
  'cdlClass', 'endorsements', 'restrictions', 'experience',
  // assignments
  'assignedCompany', 'assignedInstructor',
  // permit
  'cdlPermit', 'permitPhotoUrl', 'permitExpiry',
  // license
  'driverLicenseUrl', 'licenseExpiry',
  // medical
  'medicalCardUrl', 'medCardExpiry',
  // vehicle
  'vehicleQualified', 'truckPlateUrl', 'trailerPlateUrl',
  // emergency
  'emergencyName', 'emergencyPhone', 'emergencyRelation',
  // waiver
  'waiverSigned', 'waiverSignature',
  // course/schedule
  'course', 'schedulePref', 'scheduleNotes',
  // payment
  'paymentStatus', 'paymentProofUrl',
  // accessibility
  'accommodation', 'studentNotes',
  // system/meta
  'status', 'role', 'schoolId', 'email', 'uid',
  // progress meta (computed here but we include to allow merging)
  'profileProgress', 'profileUpdatedAt', 'lastUpdatedBy',
])

/* ──────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */

/** Return a shallow copy with all undefined values removed. */
function stripUndefined(obj = {}) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/** Light normalization to keep the doc shape consistent. */
function normalizeProfile(profile = {}) {
  const p = { ...profile }

  // Arrays we expect
  for (const key of ['endorsements', 'restrictions']) {
    if (!Array.isArray(p[key])) p[key] = p[key] ? [p[key]] : []
  }

  // Booleans we expect
  for (const key of ['waiverSigned']) {
    p[key] = !!p[key]
  }

  // Strings (trim common text fields)
  for (const key of [
    'name', 'assignedCompany', 'assignedInstructor',
    'emergencyName', 'emergencyRelation', 'course', 'schedulePref',
    'scheduleNotes', 'paymentStatus', 'accommodation', 'studentNotes',
  ]) {
    if (typeof p[key] === 'string') p[key] = p[key].trim()
  }

  // Status default
  if (!p.status) p.status = 'active'

  return stripUndefined(p)
}

/** Shallow compare; used to skip writes when nothing effectively changed. */
function shallowEqual(a, b) {
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    if (a[k] !== b[k]) return false
  }
  return true
}

/* ──────────────────────────────────────────────────────────────────────
   Blank composer
   ──────────────────────────────────────────────────────────────────── */

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
    status: 'active',
  }
}

/* ──────────────────────────────────────────────────────────────────────
   Progress
   ──────────────────────────────────────────────────────────────────── */

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
    } else if (value) {
      filled++
    }
  }

  return Math.round((filled / total) * 100)
}

/** Return a new object with progress + timestamps applied */
export function updateProfileProgress(profile = {}, updatedBy = 'system') {
  const normalized = normalizeProfile(profile)
  const progress = calculateProfileCompletion(normalized)
  return {
    ...normalized,
    profileProgress: progress,
    profileUpdatedAt: serverTimestamp(),
    lastUpdatedBy: updatedBy,
  }
}

/** Convenience alias for external callers */
export const withProgress = updateProfileProgress

/* ──────────────────────────────────────────────────────────────────────
   Reads
   ──────────────────────────────────────────────────────────────────── */

/** Get a single user profile (one-shot). */
export async function getUserProfile(email) {
  if (!email) return null
  const ref = doc(db, 'users', email)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

/**
 * Live profile subscription. Calls `cb(profile|null)` on changes.
 * Returns unsubscribe.
 */
export function subscribeUserProfile(email, cb) {
  if (!email || typeof cb !== 'function') return () => {}
  const ref = doc(db, 'users', email)
  return onSnapshot(
    ref,
    snap => cb(snap.exists() ? snap.data() : null),
    () => cb(null) // on error, surface null (optional)
  )
}

/* ──────────────────────────────────────────────────────────────────────
   Writes
   ──────────────────────────────────────────────────────────────────── */

/** Create or merge-save a full profile, auto-updating progress */
export async function saveUserProfileToFirestore(
  profile = {},
  updatedBy = 'system'
) {
  const email = profile?.email
  if (!email) throw new Error('Cannot save profile without an email.')

  const ref = doc(db, 'users', email)
  const snap = await getDoc(ref)

  // Merge with existing before computing progress to avoid regressions
  const current = snap.exists() ? snap.data() : {}
  const sanitizedIncoming = sanitizeFields(profile)
  const merged = { ...current, ...sanitizedIncoming }
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
 * - Fetch current
 * - Sanitize + merge
 * - Recompute progress
 * - Skip write if no effective change (saves quota)
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
  const current = snap.exists() ? snap.data() : {}

  // Only allow known fields + drop undefined
  const cleanFields = sanitizeFields(fields)

  // If nothing to update, short-circuit
  if (!Object.keys(cleanFields).length) {
    return { success: true, data: current, skipped: true }
  }

  // Merge then recompute progress
  const merged = { ...current, ...cleanFields, email }
  const withProgress = updateProfileProgress(merged, updatedBy)

  // Avoid write if it wouldn't change the document (shallow compare)
  const comparableCurrent = { ...current }
  delete comparableCurrent.profileUpdatedAt // timestamp will always differ
  const comparableNext = { ...withProgress }
  delete comparableNext.profileUpdatedAt

  if (shallowEqual(comparableCurrent, comparableNext)) {
    return { success: true, data: current, skipped: true }
  }

  try {
    await updateDoc(ref, withProgress)
    return { success: true, data: withProgress }
  } catch (error) {
    console.error('Error updating profile fields:', error)
    return { success: false, error }
  }
}

/* ──────────────────────────────────────────────────────────────────────
   Internal: field sanitization
   ──────────────────────────────────────────────────────────────────── */

/** Keep only whitelisted fields + strip undefined; normalize arrays/booleans. */
function sanitizeFields(fields = {}) {
  const out = {}
  for (const [k, vRaw] of Object.entries(fields)) {
    if (!FIELD_WHITELIST.has(k)) continue
    const v = vRaw === undefined ? undefined : vRaw

    if (v === undefined) continue

    // normalize common shapes on partial updates too
    if (k === 'endorsements' || k === 'restrictions') {
      out[k] = Array.isArray(v) ? v : v ? [v] : []
      continue
    }
    if (k === 'waiverSigned') {
      out[k] = !!v
      continue
    }

    if (typeof v === 'string') out[k] = v.trim()
    else out[k] = v
  }
  return out
}