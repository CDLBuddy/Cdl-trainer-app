// src/communications/services/inboxApi.js
// ======================================================================
// Communications • Inbox (Firestore helpers)
// Shape (fan-out subcollection, typically populated by a Cloud Function):
//   users/{uid}/inbox/{messageId} {
//     subject: string,
//     bodyHtml?: string,
//     bodyText?: string,
//     channels: string[],
//     status: 'queued'|'sent'|'read'|...,
//     createdAt: Timestamp,
//     scheduleAt?: Timestamp,
//     readAt?: Timestamp,        // null/absent = unread
//     messageRef?: DocumentReference('communications/messages/{id}')
//   }
//
// Notes:
// - All functions are idempotent and SSR-safe (no window assumptions).
// - `listInAppForUser` matches the hook API (role/scope accepted, ignored here).
// - Mark-read utilities are batched for fewer roundtrips.
// ======================================================================

import { getAuth } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const db = getFirestore()

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

/** Resolve a UID (or throw) from auth when not provided */
function requireUid(uid) {
  const resolved = uid || getAuth()?.currentUser?.uid
  if (!resolved) throw new Error('Not authenticated')
  return resolved
}

/** Subcollection ref: users/{uid}/inbox */
export function inboxCol(uid) {
  const id = requireUid(uid)
  return collection(db, 'users', id, 'inbox')
}

/** Pick the best timestamp for “when”; used for sorting/formatting */
export function coalesceWhen(m) {
  // prefer scheduled publish time if present, else createdAt
  return m?.scheduleAt || m?.createdAt || null
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to a user's inbox (newest first).
 * @param {{ uid?: string, take?: number }} params
 * @param {(rows: any[]) => void} onNext
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeInbox(
  { uid, take = 50 } = {},
  onNext,
  onError = () => {}
) {
  const q = query(inboxCol(uid), orderBy('createdAt', 'desc'), limit(take))
  return onSnapshot(
    q,
    snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      onNext(rows)
    },
    onError
  )
}

/**
 * Subscribe to unread count for a user (live bell badge).
 * @param {{ uid?: string }} params
 * @param {(count: number) => void} onNext
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeUnreadCount({ uid } = {}, onNext, onError = () => {}) {
  const q = query(inboxCol(uid), where('readAt', '==', null))
  return onSnapshot(q, snap => onNext(snap.size), onError)
}

/**
 * One-off fetch for inbox items (SSR/fallback).
 * @param {{ uid?: string, take?: number }} params
 * @returns {Promise<any[]>}
 */
export async function fetchInbox({ uid, take = 50 } = {}) {
  const q = query(inboxCol(uid), orderBy('createdAt', 'desc'), limit(take))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Hook-friendly API used by useInbox():
 * Accepts role/schoolId/companyId (ignored here since the data is fanned-out per user).
 * @param {{ uid?: string, role?: string, schoolId?: string|null, companyId?: string|null, take?: number }} params
 * @returns {Promise<any[]>}
 */
export async function listInAppForUser({
  uid,
  /* role, schoolId, companyId, */ take = 50,
} = {}) {
  // Role/scope can be used later if you switch to a shared collection with filters.
  return fetchInbox({ uid, take })
}

/**
 * Optional: dereference the canonical message doc (if you need more details).
 * @param {import('firebase/firestore').DocumentReference | null | undefined} messageRef
 * @returns {Promise<any|null>}
 */
export async function fetchCanonicalMessage(messageRef) {
  if (!messageRef) return null
  const snap = await getDoc(messageRef)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * One-off unread count (non-live).
 * @param {{ uid?: string }} params
 * @returns {Promise<number>}
 */
export async function getUnreadCount({ uid } = {}) {
  const q = query(inboxCol(uid), where('readAt', '==', null))
  const snap = await getDocs(q)
  return snap.size
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Mark a single message as read.
 * @param {{ uid?: string, id: string }} params
 */
export async function markAsRead({ uid, id }) {
  const ref = doc(inboxCol(uid), id)
  await updateDoc(ref, { readAt: serverTimestamp(), status: 'read' })
}

/**
 * Mark multiple message IDs as read (batched).
 * @param {{ uid?: string, ids: string[] }} params
 * @returns {Promise<number>} number of messages updated
 */
export async function markManyAsRead({ uid, ids = [] }) {
  if (!ids.length) return 0
  const batch = writeBatch(db)
  ids.forEach(id => {
    const ref = doc(inboxCol(uid), id)
    batch.update(ref, { readAt: serverTimestamp(), status: 'read' })
  })
  await batch.commit()
  return ids.length
}

/**
 * Mark all unread as read (batched).
 * @param {{ uid?: string }} params
 * @returns {Promise<number>} number of messages updated
 */
export async function markAllAsRead({ uid } = {}) {
  const q = query(inboxCol(uid), where('readAt', '==', null))
  const snap = await getDocs(q)
  if (snap.empty) return 0
  const batch = writeBatch(db)
  snap.forEach(d =>
    batch.update(d.ref, { readAt: serverTimestamp(), status: 'read' })
  )
  await batch.commit()
  return snap.size
}
