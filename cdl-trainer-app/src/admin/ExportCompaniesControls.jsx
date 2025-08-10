import PropTypes from 'prop-types'
import React, { useCallback, useMemo, useState } from 'react'

import { showToast } from '@utils/ui-helpers.js'

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

export default function ExportCompaniesControls({
  companies,
  defaultType = 'csv',
  className,
}) {
  const [type, setType] = useState(defaultType)

  const headers = useMemo(() => ['Name', 'Contact', 'Address', 'Active'], [])

  const rowsFromCompanies = useCallback(
    list =>
      (Array.isArray(list) ? list : []).map(c => [
        c.name || '',
        c.contact || '',
        c.address || '',
        c.active ? 'Yes' : 'No',
      ]),
    []
  )

  const exportCSV = useCallback(
    list => {
      if (!Array.isArray(list) || list.length === 0) {
        showToast('No companies to export.')
        return
      }
      const csv = toCSV(headers, rowsFromCompanies(list))
      downloadBlob(csv, 'cdl-companies-export.csv', 'text/csv;charset=utf-8;')
    },
    [headers, rowsFromCompanies]
  )

  const exportPDF = useCallback(
    async list => {
      if (!Array.isArray(list) || list.length === 0) {
        showToast('No companies to export.')
        return
      }
      const jsPDF = await ensureJsPDF()
      const doc = new jsPDF({ unit: 'pt', compress: true })

      doc.setFontSize(16)
      doc.text('CDL Company Export', 32, 32)
      doc.setFontSize(10)

      const colW = 180,
        marginX = 32,
        startY = 56,
        lineH = 18

      headers.forEach((h, i) => doc.text(h, marginX + i * colW, startY))

      let y = startY + lineH
      const pageH = doc.internal.pageSize.getHeight()

      ;(Array.isArray(list) ? list : []).forEach(c => {
        const row = [
          c.name || '',
          c.contact || '',
          c.address || '',
          c.active ? 'Yes' : 'No',
        ]
        row.forEach((cell, i) =>
          doc.text(String(cell), marginX + i * colW, y, { maxWidth: colW - 10 })
        )
        y += lineH
        if (y > pageH - 48) {
          doc.addPage()
          doc.setFontSize(10)
          y = 48
        }
      })

      doc.save('cdl-companies-export.pdf')
    },
    [headers]
  )

  const handleDownload = useCallback(() => {
    if (type === 'csv') exportCSV(companies)
    else if (type === 'pdf') exportPDF(companies)
  }, [type, companies, exportCSV, exportPDF])

  return (
    <div className={className} style={{ minWidth: 280 }}>
      <label htmlFor="export-companies-type">
        <b>Export Companies:</b>
      </label>
      <select
        id="export-companies-type"
        className="glass-select"
        style={{ marginLeft: 7 }}
        value={type}
        onChange={e => setType(e.target.value)}
      >
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
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

ExportCompaniesControls.propTypes = {
  companies: PropTypes.array,
  defaultType: PropTypes.oneOf(['csv', 'pdf']),
  className: PropTypes.string,
}

ExportCompaniesControls.defaultProps = {
  companies: [],
  defaultType: 'csv',
  className: '',
}
