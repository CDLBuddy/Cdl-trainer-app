//src/admin/companies/company-detail/utils/exportCsv.js
import {
  getBTWReadiness,
  getEnrollmentReadiness,
} from '@student/profile/schema/calculators.js'

import { pct } from './format.js'

export function exportRosterCsv(companyId, rows) {
  if (!companyId) return
  const headers = [
    'Name',
    'Email',
    'Course',
    'Class',
    'Billing Mode',
    'Instructor',
    'Enroll %',
    'BTW %',
  ]
  const lines = rows.map(r => [
    r.name,
    r.email,
    r.course,
    r.cdlClass,
    r.billing?.mode || '—',
    r.assignedInstructor || '—',
    pct(getEnrollmentReadiness(r.profile)),
    pct(getBTWReadiness(r.profile)),
  ])
  const csv = [headers, ...lines]
    .map(cols =>
      cols.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `company-${companyId}-roster.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
