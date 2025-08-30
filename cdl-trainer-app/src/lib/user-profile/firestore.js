// Path: src/lib/user-profile/firestore.js
// ======================================================================
// User Profile • Firestore helpers
// - Read / create / update with progress recompute
// - Defensive field whitelist + sanitizer (exported)
// - Normalizes email; coalesces writes when nothing changed
// - Compatible with Student Profile + Admin flows
// ======================================================================

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore'

import { db } from '@utils/firebase.js'

import { isEmail, normalizeEmail, shallowEqual } from './helpers.js'
import { updateProfileProgress } from './progress.js'
// NOTE: we define & export sanitizeFields below in this file (no external import)

/** Whitelisted fields allowed to be written (defense-in-depth). */
export const FIELD_WHITELIST = new Set([
  // basic
  'name',
  'dob',
  'profilePicUrl',
  // CDL / overlays
  'cdlClass',
  'overlays',
  'endorsements',
  'restrictions',
  'experience',
  // assignments + org
  'assignedCompany',
  'assignedInstructor',
  'assignedInstructorId',
  'companyId',
  'schoolId',
  // contact (optional for legacy profile)
  'email',
  'phone',
  // permit
  'cdlPermit',
  'permitPhotoUrl',
  'permitExpiry',
  // license
  'driverLicenseUrl',
  'licenseExpiry',
  // medical
  'medicalCardUrl',
  'medCardExpiry',
  // vehicle
  'vehicleQualified',
  'truckPlateUrl',
  'trailerPlateUrl',
  // emergency
  'emergencyName',
  'emergencyPhone',
  'emergencyRelation',
  // waiver
  'waiverSigned',
  'waiverSignature',
  'waiverSignatureDate',
  // course / schedule
  'course',
  'schedulePref',
  'scheduleNotes',
  // payment
  'paymentStatus',
  'paymentProofUrl',
  // verification + billing
  'verified',
  'billing',
  // accessibility + notes
  'accommodation',
  'studentNotes',
  // system/meta
  'status',
  'role',
  'uid',
  'createdAt',
  'profileProgress',
  'profileUpdatedAt',
  'lastUpdatedBy',
])

/**
 * Sanitize a partial profile payload against FIELD_WHITELIST.
 * - Trims strings
 * - Coerces arrays (deduped, truthy)
 * - Coerces booleans
 * - Ensures `billing` is an object { mode }
 * - Allows `verified` to be boolean true or an object
 */
export function sanitizeFields(fields = {}) {
  const out = {}
  for (const [k, raw] of Object.entries(fields)) {
    if (!FIELD_WHITELIST.has(k)) continue
    if (raw === undefined) continue

    // arrays
    if (k === 'overlays' || k === 'endorsements' || k === 'restrictions') {
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
      out[k] = Array.from(new Set(arr.filter(Boolean)))
      continue
    }

    // simple booleans
    if (k === 'waiverSigned') {
      out[k] = !!raw
      continue
    }

    // billing snapshot
    if (k === 'billing') {
      out[k] =
        typeof raw === 'object' && raw !== null
          ? raw
          : { mode: String(raw || '').trim() || '—' }
      continue
    }

    // verified can be true or an object map
    if (k === 'verified') {
      if (raw === true || (raw && typeof raw === 'object')) {
        out[k] = raw
      }
      continue
    }

    // phone: keep only trimmed string (UI handles formatting)
    if (k === 'phone' && typeof raw === 'string') {
      out[k] = raw.trim()
      continue
    }

    // default: trim strings
    out[k] = typeof raw === 'string' ? raw.trim() : raw
  }
  return out
}

/* ─────────────────────────────── Reads ─────────────────────────────── */

/** Get a single user profile (one-shot) by email (normalized id). */
export async function getUserProfile(email) {
  if (!isEmail(email)) return null
  const id = normalizeEmail(email)
  const ref = doc(db, 'users', id)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

/* ───────────────────────── Subscriptions (legacy API) ───────────────── */

/**
 * Subscribe to a user's profile document.
 * Accepts an email string (preferred). Returns an unsubscribe fn.
 */
export function subscribeUserProfile(email, callback, onError) {
  if (!isEmail(email)) return () => {}
  const id = normalizeEmail(email)
  const ref = doc(db, 'users', id)
  return onSnapshot(ref, (snap) => callback?.(snap), onError)
}

/**
 * Same as subscribeUserProfile but passes plain data (with id) to the callback.
 */
export function onUserProfileSnapshot(email, callback, onError) {
  return subscribeUserProfile(
    email,
    (snap) => {
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null
      callback?.(data)
    },
    onError
  )
}

/* ─────────────────────────────── Writes ────────────────────────────── */

/**
 * Create/merge a full profile and recompute progress.
 * @returns {Promise<{success:true,data:any}|{success:false,error:any}>}
 */
export async function saveUserProfileToFirestore(
  profile = {},
  updatedBy = 'system'
) {
  const email = normalizeEmail(profile?.email)
  if (!isEmail(email))
    throw new Error('Cannot save profile without a valid email.')

  const ref = doc(db, 'users', email)
  const snap = await getDoc(ref)
  const current = snap.exists() ? snap.data() : {}

  const incoming = sanitizeFields(profile)
  if (!current.createdAt && !incoming.createdAt) {
    incoming.createdAt = serverTimestamp()
  }

  const merged = { ...current, ...incoming, email }
  const next = updateProfileProgress(merged, updatedBy)

  try {
    await setDoc(ref, next, { merge: true })
    return { success: true, data: next }
  } catch (error) {
    console.error('[user-profile/save] error:', error)
    return { success: false, error }
  }
}

/**
 * Partial update with progress recompute + write coalescing.
 * @returns {Promise<{success:true,data:any,skipped?:boolean,created?:boolean}|{success:false,error:any}>}
 */
export async function updateUserProfileFields(
  email,
  fields = {},
  updatedBy = 'system'
) {
  const id = normalizeEmail(email)
  if (!isEmail(id)) throw new Error('Email is required to update profile.')

  const ref = doc(db, 'users', id)
  const snap = await getDoc(ref)
  const exists = snap.exists()
  const current = exists ? snap.data() : {}

  const clean = sanitizeFields(fields)
  if (!Object.keys(clean).length) {
    return { success: true, data: current, skipped: true }
  }

  if (!exists && !clean.createdAt) {
    clean.createdAt = serverTimestamp()
  }

  const merged = { ...current, ...clean, email: id }
  const next = updateProfileProgress(merged, updatedBy)

  // Shallow equality check (ignore server-timestamp churn)
  const c0 = { ...current }
  delete c0.profileUpdatedAt
  const n0 = { ...next }
  delete n0.profileUpdatedAt
  if (shallowEqual(c0, n0)) {
    return { success: true, data: current, skipped: true }
  }

  try {
    if (exists) {
      await updateDoc(ref, next)
    } else {
      await setDoc(ref, next, { merge: true })
    }
    return { success: true, data: next, created: !exists }
  } catch (error) {
    console.error('[user-profile/update] error:', error)
    return { success: false, error }
  }
}

/**
 * Legacy-compatible whole-profile update entry point.
 * Accepts an email and a partial/whole profile; normalizes and merges.
 * (Alias to saveUserProfileToFirestore.)
 */
export async function updateUserProfile(email, data = {}, updatedBy = 'system') {
  if (!isEmail(email)) throw new Error('updateUserProfile: invalid email')
  return saveUserProfileToFirestore({ ...data, email }, updatedBy)
}