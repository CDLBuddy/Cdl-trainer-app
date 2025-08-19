// Path: src/admin/dashboard/utils/exports.js
// ======================================================================
// ADMIN • Dashboard Utils — CSV & PDF Exports
// - Same signatures as before (backward compatible)
// - Safer filenames, robust CSV escaping, lazy jsPDF loading
// - Small UX touches (toasts, cleanup, guard rails)
// ======================================================================

// ---------------------------- CSV -------------------------------------

/** Escape a CSV cell (quotes, nulls) */
function escCsv(x) {
  return `"${String(x ?? '').replace(/"/g, '""')}"`
}

/** Best-effort filename sanitizer (keeps date suffix readable) */
function safeFilename(name) {
  return String(name || 'export')
    .replace(/[\\/:*?"<>|]+/g, '-') // illegal on most OSes
    .replace(/\s+/g, '-')
    .toLowerCase()
}

/** Trigger a download from a Blob, with safe cleanup */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  try { a.click() } finally {
    a.remove()
    // Let the browser finish with the Blob first
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

/**
 * CSV (escapes quotes, UTF-8)
 * @param {Array<Object>} list
 * @param {string} [filename='users']
 * @param {(msg: string, type?: string) => void} [showToast]
 */
export function exportUsersToCSV(list, filename = 'users', showToast = () => {}) {
  if (!list?.length) return showToast('No users to export.', 'error')

  const headers = [
    'name','email','role','assignedCompany','assignedInstructor',
    'profileProgress','permitExpiry','medCardExpiry','paymentStatus',
  ]

  // BOM helps Excel/open-office recognize UTF-8 reliably
  const BOM = '\uFEFF'

  const lines = [
    headers.join(','),
    ...list.map(u => headers.map(h => escCsv(u?.[h])).join(',')),
  ]
  const csv = BOM + lines.join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const fname = `${safeFilename(filename)}-export-${new Date().toISOString().slice(0,10)}.csv`
  downloadBlob(blob, fname)
  showToast('CSV export downloaded.', 'success')
}

// ---------------------------- PDF -------------------------------------

let _JsPDF = null
async function getJsPdf() {
  if (_JsPDF) return _JsPDF
  const mod = await import('jspdf')
  _JsPDF = mod.jsPDF
  return _JsPDF
}

/**
 * PDF (lazy-load jsPDF)
 * @param {Array<Object>} list
 * @param {(msg: string, type?: string) => void} [showToast]
 */
export async function exportUsersToPDF(list, showToast = () => {}) {
  if (!list?.length) return showToast('No users to export.', 'error')

  const JsPDF = await getJsPdf()
  const doc = new JsPDF()

  // Header
  doc.setFontSize(14)
  doc.text('Users List', 10, 16)

  const headers = [
    'Name','Email','Role','Company','Instructor',
    'Profile %','Permit Exp.','MedCard Exp.','Payment',
  ]

  // Column header row
  let y = 25
  doc.setFontSize(10)
  doc.text(headers.join(' | '), 10, y)
  y += 7

  // Small helper for clamping %
  const pct = (v) => {
    const n = Number(v)
    const q = Number.isFinite(n) ? Math.round(Math.max(0, Math.min(100, n))) : 0
    return `${q}%`
  }

  // Rows
  for (const u of list) {
    const row = [
      u.name || '',
      u.email || '',
      u.role || '',
      u.assignedCompany || '',
      u.assignedInstructor || '',
      pct(u.profileProgress),
      u.permitExpiry || '',
      u.medCardExpiry || '',
      u.paymentStatus || '',
    ].join(' | ')

    // Simple page break handling
    if (y > 280) { doc.addPage(); y = 15 }
    doc.text(row, 10, y)
    y += 6
  }

  const fname = `users-export-${new Date().toISOString().slice(0,10)}.pdf`
  doc.save(fname)
  showToast('PDF export generated.', 'success')
}