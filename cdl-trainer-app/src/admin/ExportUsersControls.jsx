// src/admin/ExportUsersControls.jsx
import PropTypes from 'prop-types'
import React, { useCallback, useMemo, useState } from 'react'

import { useToast } from '@/components/ToastContext.js'

// --- Lazy load jsPDF --------------------------------------------------------
let _jsPDF = null
async function ensureJsPDF() {
  if (_jsPDF) return _jsPDF
  const mod = await import('jspdf')
  _jsPDF = mod.jsPDF
  return _jsPDF
}

// --- CSV helpers ------------------------------------------------------------
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
function safeArr(list) {
  return Array.isArray(list) ? list : []
}

// --- Component --------------------------------------------------------------
export default function ExportUsersControls({
  users,
  defaultType = 'csv',
  className,
  expiringWindowDays = 30,
  filenameBase = 'cdl-users-export',
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
      safeArr(list).map(u => [
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
      const arr = safeArr(list)
      if (!arr.length) {
        showToast('No users to export.')
        return
      }
      const csv = '\ufeff' + toCSV(headers, rowsFromUsers(arr)) // BOM for Excel
      const stamp = new Date().toISOString().slice(0, 10)
      downloadBlob(csv, `${filenameBase}-${stamp}.csv`, 'text/csv;charset=utf-8;')
    },
    [headers, rowsFromUsers, showToast, filenameBase]
  )

  const exportExpiringCSV = useCallback(
    (list, days = expiringWindowDays) => {
      const arr = safeArr(list)
      if (!arr.length) {
        showToast('No users to check.')
        return
      }
      const now = Date.now()
      const soon = now + days * 24 * 3600 * 1000
      const filtered = arr.filter(u => {
        if (!u.permitExpiry) return false
        const t = new Date(u.permitExpiry).getTime()
        return Number.isFinite(t) && t >= now && t <= soon
      })
      if (!filtered.length) {
        showToast('No permits expiring in the selected window.')
        return
      }
      const stamp = new Date().toISOString().slice(0, 10)
      const csv = '\ufeff' + toCSV(headers, rowsFromUsers(filtered))
      downloadBlob(
        csv,
        `${filenameBase}-expiring-${stamp}.csv`,
        'text/csv;charset=utf-8;'
      )
    },
    [expiringWindowDays, rowsFromUsers, showToast, headers, filenameBase]
  )

  const exportPDF = useCallback(
    async list => {
      const arr = safeArr(list)
      if (!arr.length) {
        showToast('No users to export.')
        return
      }
      try {
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
        const rows = arr.map(u => [
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

        const drawHeader = () =>
          headerLine.forEach((h, idx) => {
            const x = marginX + (idx % 4) * colW
            const y = startY + Math.floor(idx / 4) * lineH
            doc.text(h, x, y)
          })
        drawHeader()

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
            drawHeader()
            y = 48
          }
        })

        const stamp = new Date().toISOString().slice(0, 10)
        doc.save(`${filenameBase}-${stamp}.pdf`)
      } catch (err) {
        console.error('PDF export failed', err)
        showToast('Failed to generate PDF.')
      }
    },
    [showToast, filenameBase]
  )

  const handleDownload = useCallback(() => {
    if (type === 'csv') exportCSV(users)
    else if (type === 'pdf') exportPDF(users)
    else if (type === 'expiring') exportExpiringCSV(users)
  }, [type, users, exportCSV, exportPDF, exportExpiringCSV])

  const disabled = !safeArr(users).length

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
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled ? 'No users to export' : 'Download export'}
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
  expiringWindowDays: PropTypes.number,
  filenameBase: PropTypes.string,
}

ExportUsersControls.defaultProps = {
  users: [],
  defaultType: 'csv',
  className: '',
  expiringWindowDays: 30,
  filenameBase: 'cdl-users-export',
}