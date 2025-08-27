// src/admin/reports/hooks/useChecklistPdf.js
// ======================================================================
// useChecklistPdf
// - Lazy-loads jsPDF to keep the route light
// - Builds a clean, paginated PDF checklist (letter size)
// - Accepts per-call overrides (title, items, school/provider, fileName, etc.)
// - Falls back to a .txt download if jsPDF isn't available
// ======================================================================

import { useCallback } from 'react'

/** Default Indiana-focused checklist (you can override per-call) */
export const DOT_CHECKLIST = [
  'School/provider registered in FMCSA TPR',
  'Instructor qualifications (certificates, resumes) on file',
  'Student records: progress, completion status, exam attempts',
  'Copy of CDL permit & medical card for each student',
  'Training curriculum/lesson records retained',
  'Range & behind-the-wheel hours tracked for each student',
  'Assessment & skills test records (including scores)',
  'Student completion reported to TPR (export available)',
  'All records retained for at least 3 years (FMCSA & Indiana BMV)',
]

// --- lazy loader ----------------------------------------------------------
let _jsPDF
async function ensureJsPDF() {
  if (_jsPDF) return _jsPDF
  const mod = await import(/* @vite-ignore */ 'jspdf')
  const ctor = mod?.jsPDF || mod?.default?.jsPDF || mod?.default
  if (!ctor) throw new Error('jsPDF not found in module')
  _jsPDF = ctor
  return _jsPDF
}

// --- tiny helpers ---------------------------------------------------------
function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function downloadBlob(name, mime, content) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * useChecklistPdf(defaults?) -> (overrides?) => Promise<void>
 *
 * Defaults & overrides support:
 * - title: string
 * - jurisdiction: string
 * - items: string[]
 * - schoolName: string
 * - providerName: string
 * - fileName: string
 * - footerNote: string
 */
export default function useChecklistPdf(defaults = {}) {
  return useCallback(
    async (overrides = {}) => {
      const opts = {
        title: 'DOT/ELDT Compliance Checklist',
        jurisdiction: 'Indiana',
        items: DOT_CHECKLIST,
        schoolName: '',
        providerName: '',
        fileName: `ELDT_Checklist_${(overrides.jurisdiction || defaults.jurisdiction || 'Indiana').replace(/\s+/g, '')}_${todayISO()}.pdf`,
        footerNote:
          'Retain signed copy for at least 3 years per FMCSA/State requirements.',
        ...defaults,
        ...overrides,
      }

      const list = Array.isArray(opts.items) ? opts.items.filter(Boolean) : []

      // Try PDF; if it fails, fall back to TXT
      try {
        const jsPDF = await ensureJsPDF()
        const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })

        // Metadata
        doc.setProperties({
          title: `${opts.title}${opts.jurisdiction ? ` (${opts.jurisdiction})` : ''}`,
          subject: 'ELDT compliance checklist',
          author: opts.providerName || opts.schoolName || '',
          keywords: 'FMCSA, ELDT, TPR, compliance, checklist',
          creator: 'cdl-trainer-app',
        })

        // Layout constants
        const M = 40 // margin
        const W = doc.internal.pageSize.getWidth()
        const H = doc.internal.pageSize.getHeight()
        const lineGap = 18
        const checkboxSize = 12
        const colGap = 10
        const contentWidth = W - M * 2 - checkboxSize - colGap

        let y = M + 22

        // Header
        doc.setFontSize(16)
        doc.text(`${opts.title}${opts.jurisdiction ? ` (${opts.jurisdiction})` : ''}`, M, M)
        doc.setFontSize(10)
        const sub = [
          opts.schoolName && `School: ${opts.schoolName}`,
          opts.providerName && `Provider: ${opts.providerName}`,
          `Generated: ${new Date().toLocaleString()}`,
        ]
          .filter(Boolean)
          .join('   •   ')
        if (sub) doc.text(sub, M, M + 14)

        // Divider
        doc.setDrawColor(200)
        doc.line(M, M + 20, W - M, M + 20)

        // Body
        doc.setFontSize(11)
        y = M + 46

        const addPageIfNeeded = (needed = 0) => {
          if (y + needed <= H - M) return
          // Footer (page number)
          const pageNum = String(doc.internal.getNumberOfPages())
          doc.setFontSize(9)
          doc.setTextColor(130)
          doc.text(`Page ${pageNum}`, W - M, H - 12, { align: 'right' })

          doc.addPage()
          // reset y & header rule on new page
          y = M
          doc.setDrawColor(200)
          doc.line(M, y, W - M, y)
          y += 16
          doc.setTextColor(0)
          doc.setFontSize(11)
        }

        list.forEach((raw) => {
          const line = String(raw)
          const wrapped = doc.splitTextToSize(line, contentWidth)
          // height needed for this item block
          const needed = Math.max(checkboxSize, wrapped.length * 14) + 6
          addPageIfNeeded(needed)

          // Checkbox box
          doc.setDrawColor(180)
          doc.rect(M, y - checkboxSize + 10, checkboxSize, checkboxSize) // cosmetic offset to align with text baseline

          // Text
          doc.setTextColor(0)
          doc.text(wrapped, M + checkboxSize + colGap, y)
          y += needed
        })

        // Footer on last page
        doc.setFontSize(9)
        doc.setTextColor(120)
        if (opts.footerNote) {
          addPageIfNeeded(14)
          doc.text(opts.footerNote, M, H - M + 4) // a tad above bottom margin
        }
        const lastPageNum = String(doc.internal.getNumberOfPages())
        doc.text(`Page ${lastPageNum}`, W - M, H - 12, { align: 'right' })

        // Save
        doc.save(opts.fileName || 'ELDT_Checklist.pdf')
      } catch (err) {
        // Fallback: text file so the user still gets an export
        const txt =
          `${opts.title}${opts.jurisdiction ? ` (${opts.jurisdiction})` : ''}\n` +
          (opts.schoolName ? `School: ${opts.schoolName}\n` : '') +
          (opts.providerName ? `Provider: ${opts.providerName}\n` : '') +
          `Generated: ${new Date().toLocaleString()}\n\n` +
          list.map((l) => `[ ] ${l}`).join('\n') +
          (opts.footerNote ? `\n\n${opts.footerNote}` : '')
        const name = (opts.fileName || 'ELDT_Checklist.txt').replace(/\.pdf$/i, '.txt')
        downloadBlob(name, 'text/plain;charset=utf-8', txt)
        // Optional noise-free console note for devs
        if (process?.env?.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[useChecklistPdf] jsPDF unavailable, fell back to .txt export:', err)
        }
      }
    },
    [defaults]
  )
}