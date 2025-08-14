import PropTypes from 'prop-types'
import React, { useCallback, useMemo, useState } from 'react'

import { useToast } from '@/components/ToastContext.js'

let _jsPDF = null
async function ensureJsPDF() {
  if (_jsPDF) return _jsPDF
  const mod = await import('jspdf')
  _jsPDF = mod.jsPDF
  return _jsPDF
}

function csvEscape(v) {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function toCSV(headers, rows) {
  const head = headers.map(csvEscape).join(',')
  const body = rows.map(r => r.map(csvEscape).join(',')).join('\r\n')
  return `${head}\r\n${body}`
}
function downloadBlob(content, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 800)
}

export default function ExportUsersControls({
  users,
  defaultType = 'csv',
  className,
}) {
  const [type, setType] = useState(defaultType)
  const { showToast } = useToast()

  const headers = useMemo(
    () => [
      'Name',
      'Email',
      'Role',
      'Assigned Instructor',
      'Company',
      'Profile Progress',
      'Permit Expiry',
      'MedCard Expiry',
      'Payment Status',
      'Compliance',
    ],
    []
  )

  const rowsFromUsers = useCallback(
    list =>
      (Array.isArray(list) ? list : []).map(u => [
        u.name || '',
        u.email || '',
        u.role || '',
        u.assignedInstructor || '',
        u.assignedCompany || '',
        u.profileProgress ?? '',
        u.permitExpiry || '',
        u.medCardExpiry || '',
        u.paymentStatus || '',
        u.compliance || '',
      ]),
    []
  )

  const exportCSV = useCallback(
    list => {
      if (!Array.isArray(list) || list.length === 0) {
        showToast('No users to export.')
        return
      }
      const csv = toCSV(headers, rowsFromUsers(list))
      downloadBlob(csv, 'cdl-users-export.csv', 'text/csv;charset=utf-8;')
    },
    [headers, rowsFromUsers, showToast]
  )

  const exportExpiringCSV = useCallback(
    (list, days = 30) => {
      if (!Array.isArray(list) || list.length === 0) {
        showToast('No users to check.')
        return
      }
      const now = Date.now()
      const soon = now + days * 24 * 3600 * 1000
      const filtered = list.filter(u => {
        if (!u.permitExpiry) return false
        const t = new Date(u.permitExpiry).getTime()
        return Number.isFinite(t) && t >= now && t <= soon
      })
      if (!filtered.length) {
        showToast('No permits expiring in the selected window.')
        return
      }
      exportCSV(filtered)
    },
    [exportCSV, showToast]
  )

  const exportPDF = useCallback(async list => {
    if (!Array.isArray(list) || list.length === 0) {
      showToast('No users to export.')
      return
    }
    const jsPDF = await ensureJsPDF()
    const doc = new jsPDF({ unit: 'pt', compress: true })

    const headerLine = [
      'Name',
      'Email',
      'Role',
      'Instructor',
      'Company',
      'Profile %',
      'Permit Exp.',
      'Med Exp.',
      'Payment',
      'Compliance',
    ]
    const rows = (Array.isArray(list) ? list : []).map(u => [
      u.name || '',
      u.email || '',
      u.role || '',
      u.assignedInstructor || '',
      u.assignedCompany || '',
      `${u.profileProgress ?? 0}%`,
      u.permitExpiry || '',
      u.medCardExpiry || '',
      u.paymentStatus || '',
      u.compliance || '',
    ])

    const marginX = 32,
      startY = 56,
      lineH = 18,
      colW = 160

    doc.setFontSize(16)
    doc.text('CDL User Export', marginX, 32)
    doc.setFontSize(10)

    headerLine.forEach((h, idx) => {
      const x = marginX + (idx % 4) * colW
      const y = startY + Math.floor(idx / 4) * lineH
      doc.text(h, x, y)
    })

    let y = startY + lineH * 2
    const pageH = doc.internal.pageSize.getHeight()

    rows.forEach(row => {
      row.forEach((cell, idx) => {
        const col = idx % 4
        const line = Math.floor(idx / 4)
        const x = marginX + col * colW
        const yy = y + line * lineH
        doc.text(String(cell), x, yy, { maxWidth: colW - 10 })
      })
      y += lineH * 3
      if (y > pageH - 48) {
        doc.addPage()
        doc.setFontSize(10)
        y = 48
      }
    })

    doc.save('cdl-users-export.pdf')
  }, [showToast])

  const handleDownload = useCallback(() => {
    if (type === 'csv') exportCSV(users)
    else if (type === 'pdf') exportPDF(users)
    else if (type === 'expiring') exportExpiringCSV(users, 30)
  }, [type, users, exportCSV, exportPDF, exportExpiringCSV])

  return (
    <div className={className} style={{ minWidth: 280 }}>
      <label htmlFor="export-users-type">
        <b>Export Users:</b>
      </label>
      <select
        id="export-users-type"
        className="glass-select"
        style={{ marginLeft: 7 }}
        value={type}
        onChange={e => setType(e.target.value)}
      >
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
        <option value="expiring">Expiring Permits (CSV)</option>
      </select>
      <button
        className="btn"
        style={{ marginLeft: 7 }}
        onClick={handleDownload}
      >
        Download
      </button>
    </div>
  )
}

ExportUsersControls.propTypes = {
  users: PropTypes.array,
  defaultType: PropTypes.oneOf(['csv', 'pdf', 'expiring']),
  className: PropTypes.string,
}

ExportUsersControls.defaultProps = {
  users: [],
  defaultType: 'csv',
  className: '',
}
