// Path: src/admin/communications/services/commsApi.js
// ============================================================================
// Communications API (client)
// - Queues announcement messages into Firestore for a Cloud Function to fan-out
// - Lightweight, Firebase-first; easy to swap to a callable later
// - Validates payload, normalizes channels, segment, and schedule times
// - Includes small helpers for listing/fetching templates & messages
// ============================================================================

import { getAuth } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'

/** Resolve DB from your initialized Firebase app (already bootstrapped app-wide). */
const db = getFirestore()

/** Channel whitelist the UI/server both understand. */
const CHANNELS = /** @type {const} */ (['inapp', 'email', 'sms'])

/** Runtime feature flags (UI can still show channels conditionally). */
const FLAGS = {
  email: (import.meta.env?.VITE_COMMS_EMAIL ?? '1') !== '0',
  sms: (import.meta.env?.VITE_COMMS_SMS ?? '0') === '1',
}

/** Small helpers */
const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
const toTimestamp = v => {
  if (!v) return null
  try {
    if (v instanceof Date) return Timestamp.fromDate(v)
    if (typeof v === 'number') return Timestamp.fromMillis(v)
    // Allow ISO strings
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d)
  } catch {
    return null
  }
}

/**
 * @typedef {{ type: 'query'|'list', query?: Record<string, any>, uids?: string[] }} Segment
 * @typedef {{
 *   role?: 'admin'|'instructor',
 *   schoolId?: string|null,
 *   companyId?: string|null,
 *   channels?: ('inapp'|'email'|'sms')[],
 *   subject?: string,
 *   bodyHtml?: string|null,
 *   bodyText?: string|null,
 *   templateId?: string|null,
 *   variables?: Record<string, any>,
 *   segment?: Segment,
 *   scheduleAt?: Date|string|number|null
 * }} QueuePayload
 */

/** Normalize & filter channels against allowlist + flags. */
function normalizeChannels(channels) {
  const list = Array.isArray(channels) && channels.length ? channels : ['inapp']
  const filtered = list
    .map(String)
    .map(c => c.toLowerCase())
    .filter(c => CHANNELS.includes(c))
    .filter(c => (c === 'email' ? FLAGS.email : c === 'sms' ? FLAGS.sms : true))

  return filtered.length ? filtered : ['inapp']
}

/** Make sure we always have a safe, minimal segment. */
function normalizeSegment(seg) {
  const s = seg && typeof seg === 'object' ? seg : {}
  const type = s.type === 'list' ? 'list' : 'query'
  if (type === 'list') {
    const uids = Array.isArray(s.uids) ? s.uids.filter(Boolean) : []
    if (uids.length) return { type, uids }
    // Fall back if list is empty
  }
  return {
    type: 'query',
    query:
      s.query && typeof s.query === 'object'
        ? s.query
        : { kind: 'students:all' },
  }
}

/** Quick client-side payload validation (UI should validate too). */
function validateDraft(draft) {
  const channels = normalizeChannels(draft.channels)
  const needsSubject = channels.includes('email')
  const hasBody = !!(draft.bodyHtml || draft.bodyText || draft.templateId)
  if (needsSubject && !(draft.subject && draft.subject.trim())) {
    throw new Error('Subject is required when sending email.')
  }
  if (!hasBody) {
    throw new Error('Message body or template is required.')
  }
}

/**
 * Queue a message for delivery.
 * Returns the new message id.
 * @param {QueuePayload} payload
 */
export async function queueMessage(payload) {
  const auth = getAuth()
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const draft = { ...payload }
  draft.channels = normalizeChannels(draft.channels)
  draft.segment = normalizeSegment(draft.segment)
  validateDraft(draft)

  const message = {
    createdAt: serverTimestamp(),
    createdBy: {
      uid: user.uid,
      displayName: user.displayName || user.email || 'Unknown',
    },
    role: draft.role === 'instructor' ? 'instructor' : 'admin',
    schoolId: draft.schoolId ?? null,
    companyId: draft.companyId ?? null,

    channels: draft.channels,
    subject: draft.subject || '',
    bodyHtml: draft.bodyHtml || null,
    bodyText: draft.bodyText || null,

    templateId: draft.templateId || null,
    variables: draft.variables || {},

    segment: draft.segment,

    scheduleAt: toTimestamp(draft.scheduleAt),
    status: draft.scheduleAt ? 'scheduled' : 'queued',
    counts: { targeted: 0, sent: 0, failed: 0 },
  }

  const ref = await addDoc(collection(db, 'communications/messages'), message)
  return { id: ref.id }
}

/**
 * List recent messages.
 * @param {{ take?: number, createdByUid?: string, role?: 'admin'|'instructor' }} [opts]
 */
export async function listMessages(opts = {}) {
  const take = Math.max(1, Math.min(500, Number(opts.take ?? 50)))
  const parts = [orderBy('createdAt', 'desc'), limit(take)]
  if (opts.createdByUid)
    parts.unshift(where('createdBy.uid', '==', String(opts.createdByUid)))
  if (opts.role) parts.unshift(where('role', '==', opts.role))
  const qs = query(collection(db, 'communications/messages'), ...parts)
  const snap = await getDocs(qs)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Fetch a single message (for detail drawers, etc.). */
export async function getMessage(id) {
  const ref = doc(db, 'communications/messages', String(id))
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * List all templates (ordered by name).
 * @param {{ take?: number }} [opts]
 */
export async function listTemplates(opts = {}) {
  const take = Math.max(1, Math.min(500, Number(opts.take ?? 200)))
  const qs = query(
    collection(db, 'communications/templates'),
    orderBy('name'),
    limit(take)
  )
  const snap = await getDocs(qs)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Create or update a template.
 * @param {{
 *   id?: string,
 *   name: string,
 *   channels?: ('inapp'|'email'|'sms')[],
 *   subjectTpl?: string,
 *   bodyHtmlTpl?: string,
 *   variables?: string[]
 * }} tpl
 */
export async function upsertTemplate(tpl) {
  if (!tpl?.name) throw new Error('Template name is required')
  const id = tpl.id || genId()
  const payload = {
    name: tpl.name,
    channels: normalizeChannels(tpl.channels || ['inapp']),
    subjectTpl: tpl.subjectTpl || '',
    bodyHtmlTpl: tpl.bodyHtmlTpl || '',
    variables: Array.isArray(tpl.variables) ? tpl.variables : [],
    updatedAt: serverTimestamp(),
    // keep createdAt if present; otherwise set on first write
  }
  await setDoc(doc(db, 'communications/templates', id), payload, {
    merge: true,
  })
  return { id }
}

/** Optionally allow deleting templates (admin-only UI). */
export async function deleteTemplate(id) {
  const ref = doc(db, 'communications/templates', String(id))
  // soft-delete recommendation: set `deletedAt` instead of hard delete
  await setDoc(ref, { deletedAt: serverTimestamp() }, { merge: true })
  return { id }
}
