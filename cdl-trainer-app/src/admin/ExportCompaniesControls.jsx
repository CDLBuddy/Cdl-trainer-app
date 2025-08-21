// src/admin/ExportCompaniesControls.jsx
import PropTypes from 'prop-types'
import React, { useCallback, useMemo, useState } from 'react'

import { useToast } from '@/components/useToast.js'

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
const todayTag = () => new Date().toISOString().slice(0, 10)

export default function ExportCompaniesControls({
  companies,
  defaultType = 'csv',
  className,
}) {
  const [type, setType] = useState(defaultType)
  const { showToast } = useToast()

  const headers = useMemo(() => ['Name', 'Contact', 'Address', 'Active'], [])

  // Normalize incoming rows (support .status or .active)
  const rowsFromCompanies = useCallback((list) => {
    const arr = Array.isArray(list) ? list : []
    return arr.map((c) => {
      const isActive = typeof c.active === 'boolean' ? c.active
        : (typeof c.status === 'boolean' ? c.status : true) // default true to match prior behavior
      return [
        c.name || '',
        c.contact || '',
        c.address || '',
        isActive ? 'Yes' : 'No',
      ]
    })
  }, [])

  const hasData = Array.isArray(companies) && companies.length > 0

  const exportCSV = useCallback(
    (list) => {
      try {
        if (!Array.isArray(list) || list.length === 0) {
          showToast('No companies to export.', 'warning')
          return
        }
        const csv = toCSV(headers, rowsFromCompanies(list))
        const fname = `companies-export-${todayTag()}.csv`
        downloadBlob(csv, fname, 'text/csv;charset=utf-8;')
        showToast('CSV export downloaded.', 'success')
      } catch {
        showToast('Failed to export CSV.', 'error')
      }
    },
    [headers, rowsFromCompanies, showToast]
  )

  const exportPDF = useCallback(
    async (list) => {
      try {
        if (!Array.isArray(list) || list.length === 0) {
          showToast('No companies to export.', 'warning')
          return
        }
        const jsPDF = await ensureJsPDF()
        const doc = new jsPDF({ unit: 'pt', compress: true })

        // Layout constants
        const margin = 36
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const startY = margin + 18
        const lineH = 18

        // Columns: Name, Contact, Address, Active
        // Flexible widths that fit letter size nicely
        const colWidths = [180, 160, pageW - margin * 2 - (180 + 160 + 70), 70]
        const colX = [
          margin,
          margin + colWidths[0],
          margin + colWidths[0] + colWidths[1],
          margin + colWidths[0] + colWidths[1] + colWidths[2],
        ]

        const drawHeader = (y) => {
          doc.setFontSize(12)
          headers.forEach((h, i) => {
            doc.text(h, colX[i], y)
          })
        }

        // Title
        doc.setFontSize(16)
        doc.text('Companies Export', margin, margin)
        doc.setFontSize(10)

        // Header row
        drawHeader(startY)

        let y = startY + lineH
        const rows = rowsFromCompanies(list)

        rows.forEach((row, _) => {
          // Add page if needed (reserve room for footer margin)
          if (y > pageH - margin) {
            doc.addPage()
            doc.setFontSize(16)
            doc.text('Companies Export (cont.)', margin, margin)
            doc.setFontSize(10)
            drawHeader(startY)
            y = startY + lineH
          }

          // Draw row
          row.forEach((cell, i) => {
            doc.text(String(cell), colX[i], y, {
              maxWidth: colWidths[i] - 8,
            })
          })
          y += lineH
        })

        doc.save(`companies-export-${todayTag()}.pdf`)
        showToast('PDF export generated.', 'success')
      } catch {
        showToast('Failed to export PDF.', 'error')
      }
    },
    [headers, rowsFromCompanies, showToast]
  )

  const handleDownload = useCallback(() => {
    if (type === 'csv') exportCSV(companies)
    else if (type === 'pdf') exportPDF(companies)
  }, [type, companies, exportCSV, exportPDF])

  return (
    <div className={className} style={{ minWidth: 280 }}>
      <label htmlFor="export-companies-type"><b>Export Companies:</b></label>
      <select
        id="export-companies-type"
        className="glass-select"
        style={{ marginLeft: 7 }}
        value={type}
        onChange={(e) => setType(e.target.value)}
        aria-label="Select companies export format"
      >
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
      </select>
      <button
        className="btn"
        style={{ marginLeft: 7 }}
        onClick={handleDownload}
        disabled={!hasData}
        aria-disabled={!hasData}
        title={!hasData ? 'No companies available' : 'Download export'}
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