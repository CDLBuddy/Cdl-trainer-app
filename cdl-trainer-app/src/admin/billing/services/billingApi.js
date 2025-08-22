// Path: src/admin/billing/services/billingApi.js
// ============================================================================
// Admin • Billing • API (services)
// - Pure service layer: Firestore I/O (future) + safe mock fallbacks (default)
// - Exposes stable functions consumed by billing hooks/components:
//     fetchEmployerInvoices({ schoolId, signal? })
//     markEmployerInvoicePaid({ invoiceId, schoolId?, signal? })
//     fetchIndividualPayments({ schoolId, signal? })
//     setPaymentReconciled({ paymentId, next, schoolId?, signal? })
// - Toggle `USE_BILLING_MOCKS` when you wire Firestore
// - Includes small in-memory cache + defensive mappers
// ============================================================================

import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'

import { ENV } from '@utils/env.js'
import { db } from '@utils/firebase.js'

// --------------------------------- Config -----------------------------------

/** Flip to false when you wire Firestore (or via VITE_BILLING_MOCKS) */
export const USE_BILLING_MOCKS =
  (ENV.VITE_BILLING_MOCKS ?? 'true') !== 'false'

// --------------------------------- Helpers ----------------------------------

/** Sleep helper (used by mocks to feel realistic) */
const wait = (ms = 260) => new Promise(r => setTimeout(r, ms))

/** Safe numeric coercion (no NaN) */
const toNum = (v, d = 0) => (Number.isFinite(+v) ? +v : d)

/** ISO date (or empty string) */
const toIso = v => {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10) // YYYY-MM-DD
}

/** Stable cache key */
const _key = (name, args) => `${name}:${JSON.stringify(args || {})}`
const _cache = new Map()
const _getCached = k => _cache.get(k)
const _setCached = (k, v, ttlMs = 20_000) => {
  _cache.set(k, v)
  if (ttlMs > 0) {
    const t = setTimeout(() => {
      if (_cache.get(k) === v) _cache.delete(k)
    }, ttlMs)
    // avoid keeping Node timers alive in tests
    t.unref?.()
  }
}

// --------------------------------- Shapes -----------------------------------
/** @typedef {'unpaid'|'partial'|'paid'} InvoiceStatus */
/** @typedef {'pending'|'partial'|'paid'|'waived'} PaymentStatus */

/**
 * @typedef EmployerInvoice
 * @prop {string} id
 * @prop {string} companyName
 * @prop {string=} poNumber
 * @prop {number} amountCents
 * @prop {string} issuedAt     // YYYY-MM-DD
 * @prop {string} dueAt        // YYYY-MM-DD
 * @prop {InvoiceStatus} status
 * @prop {string=} contactEmail
 */

/**
 * @typedef IndividualPayment
 * @prop {string} id
 * @prop {string} email
 * @prop {string=} name
 * @prop {string=} course
 * @prop {string=} cdlClass
 * @prop {PaymentStatus} paymentStatus
 * @prop {string=} paymentProofUrl
 * @prop {boolean} reconciled
 */

// ---------------------------- Firestore mappers ----------------------------

function mapInvoiceDoc(d) {
  const x = d?.data?.() ?? d?.data ?? {}
  return /** @type {EmployerInvoice} */ ({
    id: String(d.id),
    companyName: String(x.companyName || ''),
    poNumber: x.poNumber ? String(x.poNumber) : '',
    amountCents: toNum(x.amountCents, 0),
    issuedAt: toIso(x.issuedAt),
    dueAt: toIso(x.dueAt),
    status: /** @type {InvoiceStatus} */ (
      ['unpaid', 'partial', 'paid'].includes(x.status) ? x.status : 'unpaid'
    ),
    contactEmail: x.contactEmail ? String(x.contactEmail) : '',
  })
}

function mapPaymentDoc(d) {
  const x = d?.data?.() ?? d?.data ?? {}
  return /** @type {IndividualPayment} */ ({
    id: String(d.id),
    email: String(x.email || ''),
    name: x.name ? String(x.name) : '',
    course: x.course ? String(x.course) : '',
    cdlClass: x.cdlClass ? String(x.cdlClass) : '',
    paymentStatus: /** @type {PaymentStatus} */ (
      ['pending', 'partial', 'paid', 'waived'].includes(x.paymentStatus)
        ? x.paymentStatus
        : 'pending'
    ),
    paymentProofUrl: x.paymentProofUrl ? String(x.paymentProofUrl) : '',
    reconciled: Boolean(x.reconciled),
  })
}

// --------------------------------- Services --------------------------------

/**
 * Fetch employer invoices for a school.
 * @param {{schoolId:string, signal?:AbortSignal}} params
 * @returns {Promise<EmployerInvoice[]>}
 */
export async function fetchEmployerInvoices({ schoolId, _signal } = {}) {
  const ck = _key('billing:invoices', { schoolId })
  const hit = _getCached(ck)
  if (hit) return hit

  if (USE_BILLING_MOCKS || !schoolId) {
    await wait()
    const rows = mockEmployerInvoices()
    _setCached(ck, rows)
    return rows
  }

  // Firestore plan: pick your canonical path.
  const col = collection(db, 'employerInvoices')
  // AbortSignal is not used by Firestore Web SDK — we no-op on `signal`.
  const snap = await getDocs(query(col, where('schoolId', '==', schoolId)))
  const out = snap.docs.map(mapInvoiceDoc)
  out.sort((a, b) => String(b.dueAt).localeCompare(String(a.dueAt)))
  _setCached(ck, out)
  return out
}

/**
 * Mark an employer invoice as paid.
 * @param {{invoiceId:string, schoolId?:string, signal?:AbortSignal}} params
 * @returns {Promise<true>}
 */
export async function markEmployerInvoicePaid({ invoiceId /*, schoolId, signal*/ }) {
  if (USE_BILLING_MOCKS) return true

  const ref = doc(db, 'employerInvoices', String(invoiceId))
  await updateDoc(ref, {
    status: 'paid',
    updatedAt: new Date().toISOString(),
  })
  // Invalidate cache so next read refreshes
  _cache.delete(_key('billing:invoices', {})) // conservative
  return true
}

/**
 * Fetch individual payments for a school.
 * @param {{schoolId:string, signal?:AbortSignal}} params
 * @returns {Promise<IndividualPayment[]>}
 */
export async function fetchIndividualPayments({ schoolId, _signal } = {}) {
  const ck = _key('billing:payments', { schoolId })
  const hit = _getCached(ck)
  if (hit) return hit

  if (USE_BILLING_MOCKS || !schoolId) {
    await wait()
    const rows = mockIndividualPayments()
    _setCached(ck, rows)
    return rows
  }

  const col = collection(db, 'individualPayments')
  const snap = await getDocs(query(col, where('schoolId', '==', schoolId)))
  const out = snap.docs.map(mapPaymentDoc)
  out.sort(
    (a, b) =>
      String(a.paymentStatus).localeCompare(String(b.paymentStatus)) ||
      String(a.name).localeCompare(String(b.name))
  )
  _setCached(ck, out)
  return out
}

/**
 * Toggle (or set) reconciliation flag for a payment row.
 * @param {{paymentId:string, next?:boolean, schoolId?:string, signal?:AbortSignal}} params
 * @returns {Promise<true>}
 */
export async function setPaymentReconciled({ paymentId, next /*, schoolId, signal*/ }) {
  if (USE_BILLING_MOCKS) return true

  const ref = doc(db, 'individualPayments', String(paymentId))
  await updateDoc(ref, {
    reconciled: Boolean(next),
    updatedAt: new Date().toISOString(),
  })
  _cache.delete(_key('billing:payments', {})) // conservative
  return true
}

// ----------------------------------- Mocks ----------------------------------

/** @returns {EmployerInvoice[]} */
export function mockEmployerInvoices() {
  return [
    {
      id: 'inv_001',
      companyName: 'Acme Logistics',
      poNumber: 'PO-1042',
      amountCents: 320_000,
      issuedAt: '2025-07-01',
      dueAt: '2025-07-31',
      status: 'unpaid',
      contactEmail: 'ap@acmelogistics.com',
    },
    {
      id: 'inv_002',
      companyName: 'RoadRunner Freight',
      poNumber: 'PO-1045',
      amountCents: 185_000,
      issuedAt: '2025-07-10',
      dueAt: '2025-08-10',
      status: 'partial',
      contactEmail: 'billing@roadrunner.com',
    },
    {
      id: 'inv_003',
      companyName: 'Blue Sky Haulers',
      poNumber: 'PO-1048',
      amountCents: 257_500,
      issuedAt: '2025-06-15',
      dueAt: '2025-07-15',
      status: 'paid',
      contactEmail: 'ap@bluesky.com',
    },
  ]
}

/** @returns {IndividualPayment[]} */
export function mockIndividualPayments() {
  return [
    {
      id: 'p_001',
      email: 'sam@example.com',
      name: 'Sam Lopez',
      course: 'ELDT Class B',
      cdlClass: 'B',
      paymentStatus: 'paid',
      paymentProofUrl: 'https://example.com/receipt-sam.jpg',
      reconciled: true,
    },
    {
      id: 'p_002',
      email: 'alex@example.com',
      name: 'Alex Jordan',
      course: 'ELDT Class A',
      cdlClass: 'A',
      paymentStatus: 'partial',
      paymentProofUrl: '',
      reconciled: false,
    },
    {
      id: 'p_003',
      email: 'riley@example.com',
      name: 'Riley Chen',
      course: 'Passenger Bus',
      cdlClass: 'PASSENGER-BUS',
      paymentStatus: 'pending',
      paymentProofUrl: '',
      reconciled: false,
    },
    {
      id: 'p_004',
      email: 'morgan@example.com',
      name: 'Morgan Yu',
      course: 'ELDT Class A',
      cdlClass: 'A',
      paymentStatus: 'waived',
      paymentProofUrl: '',
      reconciled: true,
    },
  ]
}

// ----------------------------------- Export ---------------------------------

const billingApi = {
  USE_BILLING_MOCKS,
  fetchEmployerInvoices,
  markEmployerInvoicePaid,
  fetchIndividualPayments,
  setPaymentReconciled,
  mockEmployerInvoices,
  mockIndividualPayments,
}
export default billingApi
