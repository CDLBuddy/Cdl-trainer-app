// src/utils/invites.js
// ======================================================================
// Invite helpers (Firestore)
// - getInvite(id): fetch + normalize
// - consumeInvite(id): marks as consumed with guards
// ======================================================================

import { db } from '@utils/firebase.js'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

/**
 * Fetch an invite by id.
 * @param {string} id
 * @returns {Promise<{exists: boolean, id: string, ref: import('firebase/firestore').DocumentReference, data: any | null}>}
 */
export async function getInvite(id) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Invalid invite id.')
    err.code = 'INVALID_INVITE_ID'
    throw err
  }

  const ref = doc(db, 'invites', id)
  const snap = await getDoc(ref)
  return {
    exists: snap.exists(),
    id,
    ref,
    data: snap.exists() ? snap.data() : null,
  }
}

/**
 * Mark an invite as consumed (idempotent guard).
 * Throws with .code = 'INVITE_NOT_FOUND' or 'INVITE_ALREADY_CONSUMED' when appropriate.
 * @param {string} id
 * @returns {Promise<{ok: true, id: string}>}
 */
export async function consumeInvite(id) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Invalid invite id.')
    err.code = 'INVALID_INVITE_ID'
    throw err
  }

  const ref = doc(db, 'invites', id)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    const err = new Error('Invite not found.')
    err.code = 'INVITE_NOT_FOUND'
    throw err
  }

  const invite = snap.data() || {}

  if (invite.consumed) {
    const err = new Error('Invite already consumed.')
    err.code = 'INVITE_ALREADY_CONSUMED'
    err.invite = invite
    throw err
  }

  await updateDoc(ref, {
    consumed: true,
    consumedAt: serverTimestamp(),
  })

  return { ok: true, id }
}

/**
 * Convenience check for a valid, unconsumed invite.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function isValidInvite(id) {
  try {
    const { exists, data } = await getInvite(id)
    return !!(exists && data && !data.consumed)
  } catch {
    return false
  }
}