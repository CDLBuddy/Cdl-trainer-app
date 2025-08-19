// Path: /src/admin/companies/services/companiesApi.js
// ============================================================================
// Admin • Companies • API (pure)
// - Firestore CRUD + export helpers
// - No React; safe to tree-shake
// ============================================================================

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@utils/firebase.js'

/** @typedef {{id:string,name:string,contact:string,address:string,createdAt:any,createdBy?:string,updatedAt:any,updatedBy?:string,status:boolean}} CompanyRow */

// ----------------------------------------------------------------------------
// Constants (shared across CSV & PDF)
// ----------------------------------------------------------------------------

const CSV_HEADERS = ['name','contact','address','status','createdAt','createdBy','updatedAt','updatedBy']
const PDF_HEADERS = ['Name','Contact','Address','Status','Created','Created By','Updated','Updated By']
const FIRESTORE_BATCH_LIMIT = 500 // per Firestore rules

// ----------------------------------------------------------------------------
// Internal helpers (not exported)
// ----------------------------------------------------------------------------

/** Normalize a Firestore document → CompanyRow */
function mapCompanyDoc(d) {
  const c = d.data() || {}
  return {
    id: d.id,
    name: String(c.name || ''),
    contact: String(c.contact || ''),
    address: String(c.address || ''),
    createdAt: c.createdAt || '',
    createdBy: c.createdBy || '',
    updatedAt: c.updatedAt || c.createdAt || '',
    updatedBy: c.updatedBy || c.createdBy || '',
    status: c.status === false ? false : true,
  }
}

/** Human-friendly date string for CSV/PDF display */
function toDateString(v) {
  try {
    const d = typeof v === 'string' ? new Date(v) : v?.toDate?.() || new Date(v)
    return Number.isNaN(d?.getTime?.()) ? '' : d.toLocaleDateString()
  } catch {
    return ''
  }
}

/** Escape a CSV field */
function escCsv(x) {
  return `"${String(x ?? '').replace(/"/g, '""')}"`
}

/** Subtle browser guard (helps tests/SSR even if you don't use SSR here) */
function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** Chunk an array (for batched Firestore ops) */
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// jspdf ctor cache (keeps bundle slim until needed)
let _JSPDF = null
async function getJsPdfCtor() {
  if (_JSPDF) return _JSPDF
  const mod = await import('jspdf')
  _JSPDF = mod.jsPDF
  return _JSPDF
}

// ----------------------------------------------------------------------------
// Queries / Commands
// ----------------------------------------------------------------------------

/** Fetch companies for a school (sorted by name) */
export async function listCompaniesBySchool(schoolId) {
  if (!schoolId) return []
  const snap = await getDocs(query(collection(db, 'companies'), where('schoolId', '==', schoolId)))
  const rows = []
  snap.forEach((d) => rows.push(mapCompanyDoc(d)))
  rows.sort((a, b) => a.name.localeCompare(b.name))
  return rows
}

export async function addCompany({ schoolId, userEmail, name, contact, address }) {
  const now = new Date().toISOString()
  return addDoc(collection(db, 'companies'), {
    name,
    contact,
    address,
    status: true,
    schoolId,
    createdAt: now,
    createdBy: userEmail,
    updatedAt: now,
    updatedBy: userEmail,
  })
}

export async function updateCompany(id, patch) {
  return updateDoc(doc(db, 'companies', id), {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

export async function removeCompany(id) {
  return deleteDoc(doc(db, 'companies', id))
}

export async function removeCompaniesBulk(ids = []) {
  if (!ids.length) return
  // Try batched deletes (chunked for Firestore limits)
  try {
    for (const group of chunk(ids, FIRESTORE_BATCH_LIMIT)) {
      const batch = writeBatch(db)
      group.forEach((id) => batch.delete(doc(db, 'companies', id)))
      // eslint-disable-next-line no-await-in-loop
      await batch.commit()
    }
    return
  } catch {
    // Fallback to sequential to be safe with quotas/limits
  }
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    await removeCompany(id)
  }
}

/** Duplicate check within a school by name */
export async function existsByNameInSchool(schoolId, name) {
  const qy = query(
    collection(db, 'companies'),
    where('name', '==', name),
    where('schoolId', '==', schoolId)
  )
  const snap = await getDocs(qy)
  return !snap.empty
}

// ----------------------------------------------------------------------------
// Utilities: CSV / PDF / Template
// ----------------------------------------------------------------------------

export function exportCompaniesToCSV(rows, showToast = () => {}) {
  if (!rows?.length) return showToast('No companies to export.')

  const csv = [
    CSV_HEADERS.join(','),
    ...rows.map((c) =>
      [
        escCsv(c.name),
        escCsv(c.contact),
        escCsv(c.address),
        escCsv(c.status ? 'Active' : 'Inactive'),
        escCsv(toDateString(c.createdAt)),
        escCsv(c.createdBy || ''),
        escCsv(toDateString(c.updatedAt)),
        escCsv(c.updatedBy || ''),
      ].join(',')
    ),
  ].join('\r\n')

  if (!isBrowser()) return csv // makes it easier to test if needed

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `companies-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportCompaniesToPDF(rows, showToast = () => {}) {
  if (!rows?.length) return showToast('No companies to export.')
  const JsPdf = await getJsPdfCtor()
  const pdf = new JsPdf()

  pdf.setFontSize(14)
  pdf.text('Companies List', 10, 16)

  // header
  let y = 25
  pdf.setFontSize(10)
  pdf.text(PDF_HEADERS.join(' | '), 10, y)
  y += 7

  // rows (with conservative text wrapping for the Address column)
  rows.forEach((c) => {
    const line = [
      c.name,
      c.contact,
      // wrap address a bit so it doesn't run off the page
      ...(Array.isArray(pdf.splitTextToSize?.(c.address || '', 90))
        ? [pdf.splitTextToSize(c.address || '', 90).join(' ')]
        : [c.address || '']),
      c.status ? 'Active' : 'Inactive',
      toDateString(c.createdAt),
      c.createdBy || '',
      toDateString(c.updatedAt),
      c.updatedBy || '',
    ].join(' | ')

    pdf.text(line, 10, y)
    y += 6
    if (y > 280) { pdf.addPage(); y = 15 }
  })

  pdf.save(`companies-export-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function downloadCompanyTemplateCSV() {
  const content = [CSV_HEADERS.slice(0, 4).join(','), ''].join('\r\n') // name,contact,address,status + newline
  if (!isBrowser()) return content

  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'company-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}