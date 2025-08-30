// Path: src/lib/scheduling/firestore.js
// ======================================================================
// Scheduling • Firestore
// - Admin can see all events for a school
// - Instructors only see their own events
// - Realtime subscribe
// - Persists: title, start, end, allDay, location, notes,
//             instructorId/instructorName, studentId/studentName,
//             status ('confirmed'|'tentative'|'cancelled'), color
// ======================================================================

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@utils/firebase.js'

// Stored under: /schools/{schoolId}/events
const COLL = 'events'
const col = schoolId => collection(db, 'schools', schoolId, COLL)
const ref = (schoolId, id) => doc(db, 'schools', schoolId, COLL, id)

/** Allowed statuses */
const STATUS = new Set(['confirmed', 'tentative', 'cancelled'])

/** Clamp value to string and trim */
const s = v => (v == null ? '' : String(v).trim())

/** Normalize boolean-ish */
const b = v => !!v

/** Local helpers for date coercion (store as ISO UTC) */
function toISO(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(+d) ? '' : d.toISOString()
}

/**
 * Build a safe, normalized event payload.
 * - Whitelists fields
 * - Trims strings
 * - Enforces status enum
 * - Coerces dates to ISO
 * - Ensures end >= start
 * - Honors `allDay` (use whole-day bounds if dates were day-only upstream)
 */
function sanitize(input = {}) {
  const out = {}

  // Basic strings
  out.title = s(input.title) || '(Untitled)'
  out.location = s(input.location)
  out.notes = s(input.notes)

  // IDs & display names
  out.instructorId = s(input.instructorId)
  out.instructorName = s(input.instructorName)
  out.studentId = s(input.studentId)
  out.studentName = s(input.studentName)

  // All-day & status
  out.allDay = b(input.allDay)
  out.status = STATUS.has(s(input.status)) ? s(input.status) : 'confirmed'

  // Color (optional; any CSS color string/hex)
  out.color = s(input.color) || undefined

  // Dates
  let startISO = toISO(input.start)
  let endISO = toISO(input.end || input.start)

  // Guard: if either invalid, fallback to now/ +1h (or all-day today)
  if (!startISO || !endISO) {
    const now = new Date()
    if (out.allDay) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      startISO = dayStart.toISOString()
      endISO = dayEnd.toISOString()
    } else {
      const end = new Date(now.getTime() + 60 * 60 * 1000)
      startISO = now.toISOString()
      endISO = end.toISOString()
    }
  }

  // Ensure end >= start
  if (new Date(endISO).getTime() < new Date(startISO).getTime()) {
    endISO = startISO
  }

  out.start = startISO
  out.end = endISO

  return out
}

/* ─────────────────────────── Subscriptions ─────────────────────────── */

export function subscribeSchoolEvents(schoolId, cb) {
  // Order by start for stable UI
  const q = query(col(schoolId), orderBy('start', 'asc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export function subscribeInstructorEvents(schoolId, instructorId, cb) {
  // NOTE: Firestore may require a composite index: where(instructorId) + orderBy(start)
  const q = query(
    col(schoolId),
    where('instructorId', '==', instructorId),
    orderBy('start', 'asc')
  )
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

/* ────────────────────────────── Writes ─────────────────────────────── */

export async function createEvent(schoolId, data) {
  const core = sanitize(data)
  const payload = {
    ...core,
    schoolId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  }
  const docRef = await addDoc(col(schoolId), payload)
  return { id: docRef.id, ...payload }
}

export async function updateEvent(schoolId, id, patch) {
  const core = sanitize(patch)
  const clean = {
    ...core,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  }
  await updateDoc(ref(schoolId, id), clean)
}

export async function upsertEvent(schoolId, evt) {
  return evt?.id
    ? updateEvent(schoolId, evt.id, evt).then(() => evt.id)
    : createEvent(schoolId, evt).then(r => r.id)
}

export async function deleteEventById(schoolId, id) {
  await deleteDoc(ref(schoolId, id))
}

/* ────────────────────────────── Notes ────────────────────────────────
  - Indexing: If Firestore prompts for an index on instructorId + start,
    follow the console link to create it (once).
  - Server time: createdAt/updatedAt use both client millis and serverTimestamp.
  - Storage shape is intentionally flat for easy querying and export.
────────────────────────────────────────────────────────────────────── */