// src/utils/invites.js
// ======================================================================
// Invite helpers (Firestore)
// - getInvite(id): fetch + normalize (handles expiresAt Timestamp|ms)
// - consumeInvite(id, opts): marks as consumed (idempotent by default)
// - isValidInvite(id): exists, not consumed, not expired
// - Helpers: isInviteExpired, getInvitePrefill, getInviteRequiredFields
// ======================================================================

import { db } from '@utils/firebase.js'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

/**
 * @typedef {{
 *   email?: string,
 *   name?: string,
 *   role?: 'student'|'instructor'|'admin'|'superadmin',
 *   schoolId?: string,
 *   requiredFields?: string[],
 *   consumed?: boolean,
 *   consumedAt?: any,
 *   expiresAt?: import('firebase/firestore').Timestamp | number | string | null,
 *   [k: string]: any
 * }} InviteData
 */

/** Convert Firestore Timestamp | number | ISO string → ms since epoch. */
function toMillis(v) {
  if (!v && v !== 0) return null
  // Firestore Timestamp
  if (typeof v === 'object' && v?.seconds != null) {
    return Number(v.seconds) * 1000
  }
  // number-like (assume ms if > 1e12-ish)
  if (typeof v === 'number') {
    return v > 1e12 ? v : v * 1000
  }
  // ISO date string
  if (typeof v === 'string') {
    const t = Date.parse(v)
    return Number.isFinite(t) ? t : null
  }
  return null
}

/** Normalize Invite snapshot data into a consistent shape. */
function normalizeInviteData(raw) {
  /** @type {InviteData} */
  const d = { ...(raw || {}) }
  // ensure arrays are arrays
  if (!Array.isArray(d.requiredFields)) d.requiredFields = []
  // parse expiresAt
  const ms = toMillis(d.expiresAt)
  d.expiresAt = ms ?? null
  return d
}

/**
 * Fetch an invite by id.
 * @param {string} id
 * @returns {Promise<{exists: boolean, id: string, ref: import('firebase/firestore').DocumentReference, data: InviteData | null}>}
 */
export async function getInvite(id) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Invalid invite id.')
    // @ts-ignore
    err.code = 'INVALID_INVITE_ID'
    throw err
  }

  const ref = doc(db, 'invites', id)
  const snap = await getDoc(ref)
  const data = snap.exists() ? normalizeInviteData(snap.data()) : null

  return { exists: snap.exists(), id, ref, data }
}

/**
 * Mark an invite as consumed (idempotent by default).
 * Throws with .code = 'INVITE_NOT_FOUND' when invite is missing.
 * If already consumed and opts.idempotent === true (default), returns the existing state instead of throwing.
 *
 * @param {string} id
 * @param {{ idempotent?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, id: string, consumed: boolean, invite?: InviteData | null }>}
 */
export async function consumeInvite(id, opts = {}) {
  const { idempotent = true } = opts
  if (!id || typeof id !== 'string') {
    const err = new Error('Invalid invite id.')
    // @ts-ignore
    err.code = 'INVALID_INVITE_ID'
    throw err
  }

  const ref = doc(db, 'invites', id)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    const err = new Error('Invite not found.')
    // @ts-ignore
    err.code = 'INVITE_NOT_FOUND'
    throw err
  }

  const invite = normalizeInviteData(snap.data())

  // Already consumed
  if (invite.consumed) {
    if (idempotent) {
      return { ok: true, id, consumed: true, invite }
    }
    const err = new Error('Invite already consumed.')
    // @ts-ignore
    err.code = 'INVITE_ALREADY_CONSUMED'
    // @ts-ignore
    err.invite = invite
    throw err
  }

  // Mark consumed
  await updateDoc(ref, { consumed: true, consumedAt: serverTimestamp() })
  return { ok: true, id, consumed: true, invite: { ...invite, consumed: true } }
}

/**
 * Check if an invite is expired (based on normalized data).
 * @param {InviteData | null | undefined} inv
 * @param {number} [nowMs]
 */
export function isInviteExpired(inv, nowMs = Date.now()) {
  if (!inv) return true
  const exp = inv.expiresAt == null ? null : Number(inv.expiresAt)
  return exp != null && Number.isFinite(exp) && nowMs > exp
}

/**
 * Convenience check for a valid, unconsumed, unexpired invite.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function isValidInvite(id) {
  try {
    const { exists, data } = await getInvite(id)
    if (!exists || !data) return false
    if (data.consumed) return false
    if (isInviteExpired(data)) return false
    return true
  } catch {
    return false
  }
}

/**
 * Extract common prefill fields from an invite.
 * @param {InviteData | null | undefined} inv
 * @returns {{ email?: string, name?: string, schoolId?: string }}
 */
export function getInvitePrefill(inv) {
  if (!inv) return {}
  const { email, name, schoolId } = inv
  return {
    email: email ? String(email).toLowerCase() : undefined,
    name:  name  ? String(name) : undefined,
    schoolId: schoolId || undefined,
  }
}

/**
 * Extract requiredFields array from an invite (normalized to string[]).
 * @param {InviteData | null | undefined} inv
 * @returns {string[]}
 */
export function getInviteRequiredFields(inv) {
  if (!inv) return []
  return Array.isArray(inv.requiredFields) ? inv.requiredFields : []
}