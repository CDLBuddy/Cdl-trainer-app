// Path: /src/admin/companies/services/companiesApi.js
// ============================================================================
// Admin • Companies • API (pure)
// - Firestore CRUD + export helpers (CSV / PDF)
// - No React; safe to tree-shake; SSR-friendly fallbacks
// - Defensive mappers + tiny utils for dates/CSV/PDF
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

/**
 * @typedef {{id:string,name:string,contact:string,address:string,createdAt:any,createdBy?:string,updatedAt:any,updatedBy?:string,status:boolean, schoolId?:string}} CompanyRow
 */

// ----------------------------------------------------------------------------
// Constants (shared across CSV & PDF)
// ----------------------------------------------------------------------------

const CSV_HEADERS = [
  'name',
  'contact',
  'address',
  'status',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
]
const PDF_HEADERS = [
  'Name',
  'Contact',
  'Address',
  'Status',
  'Created',
  'Created By',
  'Updated',
  'Updated By',
]
const FIRESTORE_BATCH_LIMIT = 500 // per Firestore rules
const EXPORT_DATE = () => new Date().toISOString().slice(0, 10)

// ----------------------------------------------------------------------------
// Internal helpers (not exported)
// ----------------------------------------------------------------------------

/** Timestamp/Date/ISO → Date | null (defensive) */
function toDate(v) {
  try {
    if (!v) return null
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
    if (typeof v?.toDate === 'function') {
      const d = v.toDate()
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/** Human-friendly date string for CSV/PDF display */
function toDateString(v) {
  const d = toDate(v)
  return d ? d.toLocaleDateString() : ''
}

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
    schoolId: c.schoolId || '',
  }
}

/** Escape a CSV field */
function escCsv(x) {
  return `"${String(x ?? '').replace(/"/g, '""')}"`
}

/** Subtle browser guard (tests/SSR-safe) */
function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** Chunk an array (for batched Firestore ops) */
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Lowercased “search” version of a name (for future indexing) */
function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
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
  const snap = await getDocs(
    query(collection(db, 'companies'), where('schoolId', '==', schoolId))
  )
  const rows = []
  snap.forEach(d => rows.push(mapCompanyDoc(d)))
  rows.sort((a, b) => a.name.localeCompare(b.name))
  return rows
}

/**
 * Add a company
 * @param {{ schoolId:string, userEmail:string, name:string, contact?:string, address?:string }} params
 */
export async function addCompany({
  schoolId,
  userEmail,
  name,
  contact,
  address,
}) {
  const nowIso = new Date().toISOString()
  const payload = {
    name: String(name || '').trim(),
    nameSearch: normalizeName(name), // helpful for future case-insensitive lookups
    contact: String(contact || '').trim(),
    address: String(address || '').trim(),
    status: true,
    schoolId,
    createdAt: nowIso,
    createdBy: userEmail,
    updatedAt: nowIso,
    updatedBy: userEmail,
  }
  return addDoc(collection(db, 'companies'), payload)
}

/**
 * Update a company (partial)
 * @param {string} id
 * @param {Partial<CompanyRow> & {updatedBy?:string}} patch
 */
export async function updateCompany(id, patch) {
  const next = {
    ...patch,
    ...(patch?.name != null ? { nameSearch: normalizeName(patch.name) } : null),
    updatedAt: new Date().toISOString(),
  }
  return updateDoc(doc(db, 'companies', id), next)
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
      group.forEach(id => batch.delete(doc(db, 'companies', id)))

      await batch.commit()
    }
    return
  } catch {
    // Fallback to sequential to be safe with quotas/limits
  }
  for (const id of ids) {
    await removeCompany(id)
  }
}

/**
 * Duplicate check within a school by name.
 * NOTE: Firestore is case-sensitive. We store `nameSearch` to emulate case-insensitive checks.
 */
export async function existsByNameInSchool(schoolId, name) {
  const norm = normalizeName(name)
  const qy = query(
    collection(db, 'companies'),
    where('nameSearch', '==', norm),
    where('schoolId', '==', schoolId)
  )
  const snap = await getDocs(qy)
  return !snap.empty
}

// ----------------------------------------------------------------------------
// Utilities: CSV / PDF / Template
// ----------------------------------------------------------------------------

/** Generate CSV text from rows (internal) */
function toCompaniesCsv(rows) {
  return [
    CSV_HEADERS.join(','),
    ...rows.map(c =>
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
}

/**
 * Export companies to CSV.
 * - In browser: triggers a download
 * - In SSR/tests: returns the CSV string
 */
export function exportCompaniesToCSV(rows, showToast = () => {}) {
  if (!rows?.length) return showToast('No companies to export.')
  const csv = toCompaniesCsv(rows)
  if (!isBrowser()) return csv

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `companies-export-${EXPORT_DATE()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export companies to PDF.
 * - Lightweight layout (keeps bundle small, no autotable dep)
 */
export async function exportCompaniesToPDF(rows, showToast = () => {}) {
  if (!rows?.length) return showToast('No companies to export.')
  const JsPdf = await getJsPdfCtor()
  const pdf = new JsPdf({ unit: 'pt', format: 'a4' })

  const MARGIN_X = 40
  const LINE_H = 16
  const PAGE_W = pdf.internal.pageSize.getWidth()
  const WRAP_W = PAGE_W - MARGIN_X * 2

  pdf.setFontSize(14)
  pdf.text('Companies List', MARGIN_X, 40)

  // header
  pdf.setFontSize(10)
  let y = 62
  pdf.text(PDF_HEADERS.join(' | '), MARGIN_X, y)
  y += LINE_H

  // rows (wrap address conservatively)
  pdf.setFontSize(9)
  rows.forEach(c => {
    const fields = [
      c.name || '',
      c.contact || '',
      c.address || '',
      c.status ? 'Active' : 'Inactive',
      toDateString(c.createdAt),
      c.createdBy || '',
      toDateString(c.updatedAt),
      c.updatedBy || '',
    ]
    // Wrap address to avoid runaway lines; join into one line string
    const addressWrapped = pdf
      .splitTextToSize(fields[2], WRAP_W * 0.45)
      .join(' ')
    const line = [
      fields[0],
      fields[1],
      addressWrapped,
      fields[3],
      fields[4],
      fields[5],
      fields[6],
      fields[7],
    ].join(' | ')

    // Add new page if needed
    if (y > pdf.internal.pageSize.getHeight() - 40) {
      pdf.addPage()
      y = 40
    }
    pdf.text(line, MARGIN_X, y)
    y += LINE_H
  })

  pdf.save(`companies-export-${EXPORT_DATE()}.pdf`)
}

/** Download a minimal CSV template (name,contact,address,status) */
export function downloadCompanyTemplateCSV() {
  const content = [CSV_HEADERS.slice(0, 4).join(','), ''].join('\r\n') // header + blank row
  if (!isBrowser()) return content

  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'company-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
