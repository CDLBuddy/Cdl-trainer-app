// Path: src/lib/user-profile/lists.js
// ======================================================================
/* Lists & subscriptions used across Admin + Student flows
   - Instructors (for dropdowns/datalists)
   - Students by company (one-shot + realtime)
   - Clean, stable shapes; email normalized; sorted by name
   - Safe clamps on limits; graceful errors; optional onError callback
   - Extra helpers to produce {value,label} option arrays
*/
// ======================================================================

import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'

import { db } from '@utils/firebase.js'

/* ----------------------------- tiny utils ----------------------------- */

const norm = s => (s == null ? '' : String(s).trim())
const normEmail = e => norm(e).toLowerCase()
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const byNameThenEmail = (a, b) => {
  const an = norm(a.name).toLocaleLowerCase()
  const bn = norm(b.name).toLocaleLowerCase()
  if (an && bn && an !== bn) return an < bn ? -1 : 1
  const ae = normEmail(a.email)
  const be = normEmail(b.email)
  return ae < be ? -1 : ae > be ? 1 : 0
}

/* Normalize user -> instructor object */
function mapDocToInstructor(d) {
  const u = d.data() || {}
  return {
    id: d.id,
    email: normEmail(u.email || d.id),
    name: norm(u.name || ''),
    uid: norm(u.uid || ''),
    status: norm(u.status || 'active'),
    schoolId: norm(u.schoolId || ''),
    role: norm(u.role || ''),
  }
}

/* Normalize user -> student object (subset we care about in lists) */
function mapDocToStudent(d) {
  const u = d.data() || {}
  return {
    id: d.id,
    email: normEmail(u.email || d.id),
    name: norm(u.name || ''),
    uid: norm(u.uid || ''),
    status: norm(u.status || 'active'),
    schoolId: norm(u.schoolId || ''),
    role: norm(u.role || ''),
    companyId: norm(u.companyId || ''),
    course: norm(u.course || ''),
    cdlClass: norm(u.cdlClass || ''),
    billing:
      typeof u.billing === 'object' && u.billing !== null
        ? u.billing
        : { mode: norm(u.billing || '') },
    assignedInstructor: norm(u.assignedInstructor || ''),
    assignedInstructorId: norm(u.assignedInstructorId || ''),
  }
}

/* ------------------------------ Instructors ------------------------------ */
/**
 * Fetch a flat list of instructors for a school (for dropdowns/datalists).
 * Sorted by name (then email). Returns an array of canonical instructor objects.
 *
 * @param {{ schoolId?: string, activeOnly?: boolean, max?: number, onError?: (err:any)=>void }} [opts]
 * @returns {Promise<Array<{id:string,email:string,name:string,uid:string,status:string,schoolId:string,role:string}>>}
 */
export async function listInstructors(opts = {}) {
  const { schoolId, activeOnly = true, max = 100, onError } = opts
  try {
    const col = collection(db, 'users')
    const clauses = [where('role', '==', 'instructor')]
    if (schoolId) clauses.push(where('schoolId', '==', schoolId))
    if (activeOnly) clauses.push(where('status', '==', 'active'))

    // orderBy is optional; Firestore may require an index. We still sort client-side.
    const q = query(col, ...clauses, limit(clamp(max, 1, 500)))
    const snap = await getDocs(q)

    const list = snap.docs.map(mapDocToInstructor).sort(byNameThenEmail)

    // Deduplicate by email (defense-in-depth if multi-doc anomalies exist)
    const seen = new Set()
    const deduped = list.filter(x =>
      seen.has(x.email) ? false : (seen.add(x.email), true)
    )

    return deduped
  } catch (err) {
    console.error('[listInstructors] error:', err)
    onError?.(err)
    return []
  }
}

/** Convenience: map instructors to { value, label } (id by default). */
export function instructorsToOptions(
  instructors,
  { valueKey = 'id', labelKey = 'name' } = {}
) {
  return (Array.isArray(instructors) ? instructors : []).map(i => ({
    value: i?.[valueKey] || i?.id || i?.email || '',
    label: norm(i?.[labelKey] || i?.name || i?.email || '(unnamed)'),
    // you can attach metadata if your select component supports it:
    meta: { email: i.email, uid: i.uid, status: i.status },
  }))
}

/* --------------------------- Students by company -------------------------- */
/**
 * One-shot list of students under a company.
 * Sorted by name (then email). Returns normalized student objects.
 *
 * @param {string} companyId
 * @param {{ schoolId?: string, activeOnly?: boolean, max?: number, onError?: (err:any)=>void }} [opts]
 * @returns {Promise<Array<ReturnType<typeof mapDocToStudent>>>}
 */
export async function listStudentsByCompany(companyId, opts = {}) {
  const { schoolId, activeOnly = true, max = 250, onError } = opts
  if (!companyId) return []
  try {
    const col = collection(db, 'users')
    const clauses = [
      where('role', '==', 'student'),
      where('companyId', '==', companyId),
    ]
    if (schoolId) clauses.push(where('schoolId', '==', schoolId))
    if (activeOnly) clauses.push(where('status', '==', 'active'))

    // orderBy('name') would be nice, but keep it optional to avoid index requirements.
    const q = query(col, ...clauses, limit(clamp(max, 1, 1000)))
    const snap = await getDocs(q)
    return snap.docs.map(mapDocToStudent).sort(byNameThenEmail)
  } catch (err) {
    console.error('[listStudentsByCompany] error:', err)
    onError?.(err)
    return []
  }
}

/**
 * Realtime subscription: students under a company.
 * Calls `cb(list)` on every change. Returns unsubscribe.
 *
 * @param {string} companyId
 * @param {(students: ReturnType<typeof mapDocToStudent>[]) => void} cb
 * @param {{ schoolId?: string, activeOnly?: boolean, max?: number, onError?: (err:any)=>void }} [opts]
 * @returns {() => void}
 */
export function subscribeStudentsByCompany(companyId, cb, opts = {}) {
  const { schoolId, activeOnly = true, max = 500, onError } = opts
  if (!companyId || typeof cb !== 'function') return () => {}
  try {
    const col = collection(db, 'users')
    const clauses = [
      where('role', '==', 'student'),
      where('companyId', '==', companyId),
    ]
    if (schoolId) clauses.push(where('schoolId', '==', schoolId))
    if (activeOnly) clauses.push(where('status', '==', 'active'))

    const q = query(col, ...clauses, limit(clamp(max, 1, 1000)))
    return onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(mapDocToStudent).sort(byNameThenEmail)
        cb(list)
      },
      err => {
        console.error('[subscribeStudentsByCompany] error:', err)
        onError?.(err)
      }
    )
  } catch (err) {
    console.error('[subscribeStudentsByCompany] init error:', err)
    onError?.(err)
    return () => {}
  }
}

/* ------------------------------- Extras ---------------------------------- */
/** Convenience: students -> { value, label } options (value=email by default). */
export function studentsToOptions(
  students,
  { valueKey = 'email', labelKey = 'name' } = {}
) {
  return (Array.isArray(students) ? students : []).map(s => ({
    value: s?.[valueKey] || s?.email || s?.id || '',
    label: norm(s?.[labelKey] || s?.name || s?.email || '(unnamed)'),
    meta: { companyId: s.companyId, cdlClass: s.cdlClass, status: s.status },
  }))
}
