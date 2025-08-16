// src/superadmin/walkthroughs/SaWalkthroughApi.js
// -----------------------------------------------------------------------------
// Superadmin Walkthrough API (Firestore, modular v9)
// -----------------------------------------------------------------------------

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db, auth } from '@utils/firebase.js'

// === Config (adjust if your paths differ) ====================================
const SUBMISSIONS = (schoolId) =>
  collection(db, 'schools', schoolId, 'walkthrough_submissions')
const PUBLISHED = (schoolId) => collection(db, 'schools', schoolId, 'walkthroughs')

// Utility: tolerant Timestamp/number/ISO → Date
function toDate(x) {
  try {
    if (!x) return null
    if (typeof x === 'number') return new Date(x)
    if (typeof x === 'object' && typeof x.toDate === 'function') return x.toDate()
    return new Date(x)
  } catch {
    return null
  }
}

// Normalize Firestore doc → plain JS object
function mapSnap(snap) {
  if (!snap?.exists?.()) return null
  const data = snap.data()
  return { id: snap.id, ...data }
}

// Normalize QuerySnapshot
function mapQuery(qs) {
  const out = []
  qs.forEach((d) => {
    const row = mapSnap(d)
    if (row) out.push(row)
  })
  return out
}

// ============================================================================
//  List submissions with optional filters
//  opts: { status?: string, schoolId?: string, limit?: number }
// ============================================================================
export async function listSubmissions(opts = {}) {
  const { status, schoolId, limit: take = 200 } = opts || {}

  if (!schoolId) {
    // Fan-out not supported yet; add a top-level collection if needed.
    return []
  }

  const parts = []
  if (status) parts.push(where('status', '==', status))

  const qref = query(
    SUBMISSIONS(schoolId),
    ...parts,
    orderBy('updatedAt', 'desc'),
    limit(take)
  )

  const qs = await getDocs(qref)
  const rows = mapQuery(qs)

  return rows.map((r) => ({
    ...r,
    _displayDate: toDate(r.updatedAt) || toDate(r.submittedAt) || new Date(),
  }))
}

// ============================================================================
//  Fetch a single submission by ID (requires schoolId)
// ============================================================================
export async function getSubmission({ schoolId, submissionId }) {
  if (!schoolId) throw new Error('schoolId required')
  if (!submissionId) throw new Error('submissionId required')
  const ref = doc(db, 'schools', schoolId, 'walkthrough_submissions', submissionId)
  const snap = await getDoc(ref)
  return mapSnap(snap) // { id, ...data } or null
}

// ============================================================================
//  Approve + Publish
// ============================================================================
export async function approveAndPublish(submission) {
  if (!submission?.id) throw new Error('submission.id required')
  if (!submission?.schoolId) throw new Error('submission.schoolId required')

  const { schoolId, token } = submission
  const publishId = token || submission.id

  const latest = token ? await getCurrentPublishedForToken(schoolId, token) : null
  const nextVersion = Number(latest?.version ?? 0) + 1

  const batch = writeBatch(db)

  // 1) Upsert the published walkthrough
  const pubRef = doc(PUBLISHED(schoolId), publishId)
  batch.set(
    pubRef,
    {
      token: token || publishId,
      label: submission.label || 'Untitled Walkthrough',
      classCode: submission.classCode || 'A',
      script: Array.isArray(submission.script) ? submission.script : [],
      overlays: Array.isArray(submission.overlays) ? submission.overlays : [],
      version: nextVersion,
      sourceSubmissionId: submission.id,
      updatedAt: serverTimestamp(),
      updatedBy: auth?.currentUser?.uid || 'system',
      publishedAt: serverTimestamp(),
      publishedBy: auth?.currentUser?.uid || 'system',
    },
    { merge: true }
  )

  // 2) Mark submission as approved
  const subRef = doc(db, 'schools', schoolId, 'walkthrough_submissions', submission.id)
  batch.update(subRef, {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: auth?.currentUser?.uid || 'system',
  })

  await batch.commit()
}

// ============================================================================
//  Request changes  (wired to helper)
//  params: { schoolId: string, submissionId: string, note?: string }
// ============================================================================
export async function requestChanges({ schoolId, submissionId, note = '' }) {
  if (!schoolId) throw new Error('schoolId required')
  if (!submissionId) throw new Error('submissionId required')
  await _setSubmissionStatus({
    schoolId,
    submissionId,
    status: 'changes-requested',
    note,
  })
}

// ============================================================================
//  Reject (final)  (wired to helper)
//  params: { schoolId: string, submissionId: string }
// ============================================================================
export async function rejectSubmission({ schoolId, submissionId }) {
  if (!schoolId) throw new Error('schoolId required')
  if (!submissionId) throw new Error('submissionId required')
  await _setSubmissionStatus({
    schoolId,
    submissionId,
    status: 'rejected',
  })
}

// ============================================================================
//  Get current published for a token (latest by version, else updatedAt)
// ============================================================================
export async function getCurrentPublishedForToken(schoolId, token) {
  if (!schoolId) throw new Error('schoolId required')
  if (!token) throw new Error('token required')

  let qref = query(
    PUBLISHED(schoolId),
    where('token', '==', token),
    orderBy('version', 'desc'),
    limit(1)
  )

  let qs = await getDocs(qref)
  if (qs.empty) {
    qref = query(
      PUBLISHED(schoolId),
      where('token', '==', token),
      orderBy('updatedAt', 'desc'),
      limit(1)
    )
    qs = await getDocs(qref)
  }
  const rows = mapQuery(qs)
  return rows[0] || null
}

// ============================================================================
//  Helpers
// ============================================================================
function throwIf(cond, msg) {
  if (cond) throw new Error(msg)
}

// Optional: if you *do* know schoolId at call time for requestChanges/reject:
export async function _setSubmissionStatus({
  schoolId,
  submissionId,
  status,
  note,
}) {
  if (!schoolId) throw new Error('schoolId required')
  if (!submissionId) throw new Error('submissionId required')
  if (!status) throw new Error('status required')
  const ref = doc(db, 'schools', schoolId, 'walkthrough_submissions', submissionId)
  const patch = {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: auth?.currentUser?.uid || 'system',
  }
  if (note) patch.reviewNotes = note
  await updateDoc(ref, patch)
}