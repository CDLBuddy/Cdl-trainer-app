// Path: src/admin/companies/add-student/services/saveStudent.js
// ============================================================================
// ADD-STUDENT • service: saveStudent
// - Validates locally in the hook (email OR phone)
// - Upserts roster:  students/{studentId}
// - Mirrors ELDT:     eldtProgress/{studentId} (classType for reports/cert-builder)
// - If email exists:  updates legacy user profile via @user-profile/firestore
// - Returns { ok, studentId?, error? }
// ============================================================================

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  limit,
} from 'firebase/firestore'

import { db } from '@utils/firebase.js'
import { updateUserProfileFields } from '@user-profile/firestore' // ⬅️ new alias

// -------------------------- tiny helpers --------------------------
const S = (x) => (x == null ? '' : String(x).trim())
const SL = (x) => S(x).toLowerCase()
const SU = (x) => S(x).toUpperCase()
const digits = (x) => S(x).replace(/\D+/g, '')
const nonEmpty = (v) => (Array.isArray(v) ? v.filter(Boolean) : v)

function normalizeBilling(input) {
  const mode = S(input || 'employer').toLowerCase()
  return { mode: mode === 'individual' ? 'individual' : 'employer' }
}

function getSchoolId() {
  return window.schoolId || localStorage.getItem('schoolId') || ''
}

// ------------------------------ main ------------------------------
/**
 * @param {object} opts
 * @param {{
 *   email?: string,
 *   phone?: string,
 *   name?: string,
 *   course?: string,
 *   cdlClass?: 'A'|'B'|'C'|string,
 *   billing?: 'employer'|'individual'|string,
 *   assignedInstructor?: string,
 *   assignedInstructorId?: string,
 * }} opts.form
 * @param {string[]} [opts.overlays=[]] derived by caller
 * @param {string}   [opts.companyId='']
 * @param {string}   [opts.actor='admin@system']
 */
export default async function saveStudent({
  form,
  overlays = [],
  companyId = '',
  actor = 'admin@system',
}) {
  const schoolId = getSchoolId()

  // Normalize contact + core fields
  const email = SL(form?.email || '')
  const phoneRaw = digits(form?.phone || '')
  const hasContact = !!email || !!phoneRaw
  const fullName = S(form?.name || form?.fullName || '')
  const classRaw = SU(form?.cdlClass || 'A')
  const cdlClass = ['A', 'B', 'C'].includes(classRaw) ? classRaw : 'A'
  const billing = normalizeBilling(form?.billing)
  const assignedInstructorId = S(form?.assignedInstructorId || '')
  const assignedInstructor = S(form?.assignedInstructor || '')

  const safeOverlays = Array.from(
    new Set(nonEmpty(overlays).map(S).filter(Boolean))
  )

  if (!hasContact) {
    return { ok: false, error: 'Please provide an email or phone number.' }
  }

  // --- Upsert into /students (prefer email, fallback to phone) ---
  const studentsCol = collection(db, 'students')

  let existing = null
  try {
    const filters = [where('schoolId', '==', schoolId)]
    if (companyId) filters.push(where('companyId', '==', companyId))
    if (email) filters.push(where('email', '==', email))
    else filters.push(where('phone', '==', phoneRaw))

    const snap = await getDocs(query(studentsCol, ...filters, limit(1)))
    if (!snap.empty) existing = snap.docs[0]
  } catch {
    // tolerate read errors; we'll create a new doc
  }

  const studentRef = existing ? doc(db, 'students', existing.id) : doc(studentsCol)
  const studentId = studentRef.id
  const now = serverTimestamp()

  const studentPayload = {
    schoolId,
    companyId: companyId || '',
    fullName,
    email: email || null,
    phone: phoneRaw || null,
    course: S(form?.course || ''),
    cdlClass,
    overlays: safeOverlays,
    // store as both a queryable string mode and an object snapshot
    billingMode: billing.mode,
    billing,
    assignedInstructor,
    assignedInstructorId,
    status: 'active',
    updatedAt: now,
    ...(existing ? {} : { createdAt: now }),
  }

  try {
    await setDoc(studentRef, studentPayload, { merge: true })

    // Mirror into /eldtProgress for reports/cert-builder
    await setDoc(
      doc(db, 'eldtProgress', studentId),
      {
        schoolId,
        studentId,
        classType: cdlClass, // 'A' | 'B' | 'C'
        endorsement: '',
        theory: { completed: false },
        btw: { completed: false },
        updatedAt: now,
        ...(existing ? {} : { createdAt: now }),
      },
      { merge: true }
    )

    // If we have an email, keep legacy user profile in sync
    if (email) {
      await updateUserProfileFields(
        email,
        {
          name: fullName,
          role: 'student',
          status: 'active',
          cdlClass,
          overlays: safeOverlays,
          assignedCompany: companyId || '',
          assignedInstructor, // display string for student profile
          // if you want to persist the id too, add it to the lib whitelist and uncomment:
          // assignedInstructorId,
          billing, // { mode }
        },
        actor
      )
    }

    return { ok: true, studentId }
  } catch (e) {
    console.error('[saveStudent] failed:', e)
    return {
      ok: false,
      error: 'Failed to save student. Please check your connection and try again.',
    }
  }
}