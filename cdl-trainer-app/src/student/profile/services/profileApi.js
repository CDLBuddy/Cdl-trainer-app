// src/student/profile/services/profileApi.js
// -----------------------------------------------------------------------------
// Student Profile API (pure; no React)
// - Centralizes all reads/writes for student profile + ELDT progress
// - Uses the same collections we standardized for Admin/Reports
// - Shapes are defensive and stable for UI/hooks
// -----------------------------------------------------------------------------

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/utils/firebase.js'

/** ISO date (YYYY-MM-DD) without TZ drift */
const toISODate = x => {
  if (!x) return ''
  const s = String(x).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(x)
  if (!Number.isFinite(d.valueOf())) return ''
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const S = v => (v == null ? '' : String(v).trim())

// --------------------------- normalizers (stable) ----------------------------

/** @returns {{id:string, schoolId:string, companyId?:string, fullName:string, firstName?:string, lastName?:string, dob?:string, licenseNumber?:string, licenseState?:string, clpNumber?:string, clpState?:string, clpIssued?:string, email?:string, status:string}} */
function normalizeStudent(id, raw = {}) {
  const first = S(raw.firstName || raw.first_name)
  const last = S(raw.lastName || raw.last_name)
  const full = S(raw.fullName || raw.name || `${first} ${last}`.trim())
  return {
    id,
    schoolId: S(raw.schoolId),
    companyId: S(raw.companyId || ''),
    fullName: full || `${first} ${last}`.trim(),
    firstName: first || undefined,
    lastName: last || undefined,
    dob: toISODate(raw.dob || raw.dateOfBirth || raw.birthDate),
    licenseNumber: S(raw.licenseNumber || ''),
    licenseState: S(raw.licenseState || ''),
    clpNumber: S(raw.clpNumber || raw.clp || ''),
    clpState: S(raw.clpState || ''),
    clpIssued: toISODate(raw.clpIssued || ''),
    email: S(raw.email || ''),
    status: S(raw.status || 'active'),
    updatedAt: raw.updatedAt || null,
    createdAt: raw.createdAt || null,
  }
}

/** @returns {{ classType:'A'|'B'|'C', endorsement?:string, theory:{completed:boolean, completedAt?:string, scorePct?:number}, btw:{completed:boolean, completedAt?:string, rangeHours?:number, publicRoadHours?:number} }} */
function normalizeProgress(id, raw = {}) {
  return {
    id,
    classType: S(raw.classType || 'A')
      .replace(/^class\s*/i, '')
      .toUpperCase(),
    endorsement: S(raw.endorsement || '').toUpperCase() || undefined,
    theory: {
      completed: !!raw.theory?.completed,
      completedAt: toISODate(raw.theory?.completedAt),
      scorePct: Number.isFinite(+raw.theory?.scorePct)
        ? +raw.theory.scorePct
        : undefined,
    },
    btw: {
      completed: !!raw.btw?.completed,
      completedAt: toISODate(raw.btw?.completedAt),
      rangeHours: Number.isFinite(+raw.btw?.rangeHours)
        ? +raw.btw.rangeHours
        : 0,
      publicRoadHours: Number.isFinite(+raw.btw?.publicRoadHours)
        ? +raw.btw.publicRoadHours
        : 0,
    },
    updatedAt: raw.updatedAt || null,
    createdAt: raw.createdAt || null,
  }
}

/** @returns {{ schoolId:string, tprId:string, tin?:string, name?:string, contactName?:string, contactEmail?:string, contactPhone?:string, address?:{street?:string,city?:string,state?:string,zip?:string} }} */
function normalizeProviderProfile(schoolId, raw = {}) {
  return {
    schoolId,
    tprId: S(raw.tprId || ''),
    tin: S(raw.tin || ''),
    name: S(raw.name || raw.providerName || ''),
    contactName: S(raw.contactName || ''),
    contactEmail: S(raw.contactEmail || ''),
    contactPhone: S(raw.contactPhone || ''),
    address: raw.address || undefined,
    updatedAt: raw.updatedAt || null,
    createdAt: raw.createdAt || null,
  }
}

// ------------------------------- reads --------------------------------------

/** Get student document from /students/{studentId} (defensive if missing). */
export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, 'students', studentId))
  const data = snap.exists() ? snap.data() : {}
  return normalizeStudent(studentId, data)
}

/** Merge `users/{uid}` into student shape for convenience (email, name). */
export async function getStudentWithUserFallback(studentId, uid = studentId) {
  const [stuSnap, userSnap] = await Promise.all([
    getDoc(doc(db, 'students', studentId)),
    getDoc(doc(db, 'users', uid)),
  ])
  const base = stuSnap.exists() ? stuSnap.data() : {}
  const usr = userSnap.exists() ? userSnap.data() : {}
  const merged = {
    ...base,
    email: base.email || usr.email || '',
    fullName: base.fullName || usr.name || '',
    schoolId: base.schoolId || usr.schoolId || '',
  }
  return normalizeStudent(studentId, merged)
}

/** Live subscription to /students/{id} (returns unsubscribe). */
export function watchStudent(studentId, cb) {
  return onSnapshot(doc(db, 'students', studentId), snap => {
    cb(normalizeStudent(studentId, snap.exists() ? snap.data() : {}))
  })
}

/** Get ELDT progress from /eldtProgress/{studentId} */
export async function getProgress(studentId) {
  const snap = await getDoc(doc(db, 'eldtProgress', studentId))
  const data = snap.exists() ? snap.data() : {}
  return normalizeProgress(studentId, data)
}

/** Live subscription to /eldtProgress/{id} (returns unsubscribe). */
export function watchProgress(studentId, cb) {
  return onSnapshot(doc(db, 'eldtProgress', studentId), snap => {
    cb(normalizeProgress(studentId, snap.exists() ? snap.data() : {}))
  })
}

/** Load provider profile for a school from /providerProfiles/{schoolId} */
export async function getProviderProfile(schoolId) {
  if (!schoolId) return normalizeProviderProfile('', {})
  const snap = await getDoc(doc(db, 'providerProfiles', schoolId))
  const data = snap.exists() ? snap.data() : {}
  return normalizeProviderProfile(schoolId, data)
}

// ------------------------------- writes -------------------------------------

/** Upsert /students/{studentId} (partial allowed). */
export async function saveStudent(studentId, partial) {
  const ref = doc(db, 'students', studentId)
  await setDoc(
    ref,
    {
      ...partial,
      updatedAt: serverTimestamp(),
      createdAt: partial?.createdAt ?? serverTimestamp(),
    },
    { merge: true }
  )
}

/** Upsert /eldtProgress/{studentId} (partial allowed). */
export async function saveProgress(studentId, partial) {
  const ref = doc(db, 'eldtProgress', studentId)
  await setDoc(
    ref,
    {
      ...partial,
      updatedAt: serverTimestamp(),
      createdAt: partial?.createdAt ?? serverTimestamp(),
    },
    { merge: true }
  )
}

/** Update a few user fields in /users/{uid} (friendly to missing doc). */
export async function patchUser(uid, partial) {
  const ref = doc(db, 'users', uid)
  try {
    await updateDoc(ref, { ...partial, updatedAt: serverTimestamp() })
  } catch {
    // If missing, create minimal doc:
    await setDoc(
      ref,
      {
        ...partial,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }
}

// ------------------------------- helpers ------------------------------------

/**
 * Compose the *canonical* cert-builder input from student + progress + provider.
 * This lets Student UI, Admin Reports, and workers all share the same mapping.
 */
export async function getCanonicalCertInput(studentId) {
  const stu = await getStudentWithUserFallback(studentId)
  const prog = await getProgress(studentId)
  const provider = await getProviderProfile(stu.schoolId)

  return {
    student: {
      id: stu.id,
      firstName: stu.firstName,
      lastName: stu.lastName,
      fullName: stu.fullName,
      dob: stu.dob,
      licenseNumber: stu.licenseNumber,
      licenseState: stu.licenseState,
      clpNumber: stu.clpNumber,
      clpState: stu.clpState,
      clpIssued: stu.clpIssued,
      email: stu.email,
      assignedCompany: stu.companyId || '',
    },
    training: {
      classType: prog.classType,
      endorsement: prog.endorsement || '',
      theory: prog.theory,
      btw: prog.btw,
      completionDate: prog.theory?.completedAt || prog.btw?.completedAt || '',
    },
    provider,
    schoolId: stu.schoolId,
  }
}

export default {
  getStudent,
  getStudentWithUserFallback,
  watchStudent,
  getProgress,
  watchProgress,
  getProviderProfile,
  saveStudent,
  saveProgress,
  patchUser,
  getCanonicalCertInput,
}
