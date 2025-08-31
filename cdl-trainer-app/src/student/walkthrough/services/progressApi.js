//src/student/walkthrough/services/progressApi.js
// progressApi.js
// StudentId-first progress service with legacy {email} fallback/mirroring.
// - readProgress({email, schoolId})
// - writeProgress({email, schoolId, patch})
// Both functions:
//   * resolve studentId by querying /students on (schoolId,email)
//   * read/write preferred /eldtProgress/{studentId}
//   * also read/write /eldtProgress/{email} for legacy continuity

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '@utils/firebase.js'

const S  = (x) => (x == null ? '' : String(x).trim())
const SL = (x) => S(x).toLowerCase()

async function resolveStudentId({ email, schoolId }) {
  const em = SL(email)
  const sid = S(schoolId)
  if (!em || !sid) return null
  try {
    const q = query(
      collection(db, 'students'),
      where('schoolId', '==', sid),
      where('email', '==', em),
      limit(1)
    )
    const snap = await getDocs(q)
    if (!snap.empty) return snap.docs[0].id || null
  } catch {
    // tolerate lookup failures
  }
  return null
}

function mergeDrills(a = {}, b = {}) {
  // prefer truthy flags from either source
  return {
    fill:   !!(a.fill   || b.fill),
    order:  !!(a.order  || b.order),
    type:   !!(a.type   || b.type),
    visual: !!(a.visual || b.visual),
  }
}

async function safeGetDoc(ref) {
  try {
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

async function safeSet(ref, data) {
  try {
    await setDoc(ref, data, { merge: true })
    return true
  } catch {
    return false
  }
}

async function safeUpdate(ref, data) {
  try {
    await updateDoc(ref, data)
    return true
  } catch {
    // if doc didn’t exist, set instead
    try {
      await setDoc(ref, data, { merge: true })
      return true
    } catch {
      return false
    }
  }
}

/** Read merged progress (studentId preferred, email fallback). */
export async function readProgress({ email, schoolId }) {
  const em = SL(email)
  if (!em) return {}

  const studentId = await resolveStudentId({ email: em, schoolId })
  const emailRef   = doc(db, 'eldtProgress', em)
  const idRef      = studentId ? doc(db, 'eldtProgress', studentId) : null

  const [emailDoc, idDoc] = await Promise.all([
    safeGetDoc(emailRef),
    idRef ? safeGetDoc(idRef) : Promise.resolve(null),
  ])

  // merge drill flags (truthy wins)
  const drills = mergeDrills(emailDoc?.drills, idDoc?.drills)
  return { ...(idDoc || emailDoc || {}), drills }
}

/** Write a patch to both ids when possible (id first, then email). */
export async function writeProgress({ email, schoolId, patch }) {
  const em = SL(email)
  if (!em) return { ok: false }

  const now = serverTimestamp()
  const payload = { ...(patch || {}), updatedAt: now }

  const studentId = await resolveStudentId({ email: em, schoolId })
  const writes = []

  if (studentId) {
    const idRef = doc(db, 'eldtProgress', studentId)
    writes.push(safeUpdate(idRef, payload))
  }

  // Always mirror to email too (preserves any legacy consumers)
  const emailRef = doc(db, 'eldtProgress', em)
  writes.push(safeUpdate(emailRef, payload))

  const results = await Promise.all(writes)
  const ok = results.some(Boolean)

  // If everything failed, try to at least create one doc
  if (!ok) {
    if (studentId) {
      await safeSet(doc(db, 'eldtProgress', studentId), { createdAt: now })
    } else {
      await safeSet(doc(db, 'eldtProgress', em), { createdAt: now })
    }
    // Best-effort second attempt
    const retry = []
    if (studentId) retry.push(safeUpdate(doc(db, 'eldtProgress', studentId), payload))
    retry.push(safeUpdate(doc(db, 'eldtProgress', em), payload))
    await Promise.all(retry)
  }

  return { ok: true, studentId: studentId || null }
}

export default {
  readProgress,
  writeProgress,
}