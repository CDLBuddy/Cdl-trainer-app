//src/admin/reports/hooks/useChecklistPdf.js
// Lazy jsPDF just for the checklist
import { useCallback } from 'react'

const LINES = [
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

let _jsPDF = null
async function ensureJsPDF() {
  if (_jsPDF) return _jsPDF
  const mod = await import('jspdf')
  _jsPDF = mod.jsPDF
  return _jsPDF
}

export default function useChecklistPdf() {
  return useCallback(async () => {
    const jsPDF = await ensureJsPDF()
    const doc = new jsPDF({ unit: 'pt', compress: true })
    doc.setFontSize(16)
    doc.text('DOT/ELDT Compliance Checklist (Indiana)', 32, 32)
    doc.setFontSize(11)
    let y = 56
    LINES.forEach(line => {
      doc.text('\u2610  ' + line, 32, y)
      y += 20
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage(); y = 40
      }
    })
    doc.save('IN_DOT_ELDT_Checklist.pdf')
  }, [])
}

export const DOT_CHECKLIST = LINES